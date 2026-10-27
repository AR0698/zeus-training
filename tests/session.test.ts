import assert from "node:assert/strict";
import { test } from "node:test";
import { SEED_PROGRAMS } from "../src/domain/seed.ts";
import {
  createSession,
  finishSession,
  isSessionStale,
  sessionProgress,
  sessionVolume,
} from "../src/domain/session.ts";
import { sessionsThisWeek, volumeTrend, weeklyStreak } from "../src/domain/stats.ts";
import type { HistoryEntry, Session } from "../src/domain/types.ts";

const PROGRAM = SEED_PROGRAMS[0]!;
const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);

function freshSession(): Session {
  return createSession({ program: PROGRAM, now: NOW, id: "s1", lastSessionDate: null }).session;
}

test("a new session mirrors the program targets", () => {
  const session = freshSession();
  assert.equal(session.exercises.length, PROGRAM.exercises.length);
  const first = session.exercises[0]!;
  assert.deepEqual(
    first.sets.map((set) => set.weight),
    PROGRAM.exercises[0]!.targetWeights,
  );
  assert.equal(first.sets.every((set) => !set.done), true);
});

test("a session started after a long break opens 10 % lighter", () => {
  const { session, layoff } = createSession({
    program: PROGRAM,
    now: NOW,
    id: "s2",
    lastSessionDate: NOW - 30 * 86_400_000,
  });
  assert.equal(layoff.applied, true);
  const target = PROGRAM.exercises[0]!.targetWeights[0]!;
  assert.equal(session.exercises[0]!.sets[0]!.weight, Math.round(target * 0.9 * 2) / 2);
});

test("progress counts sets, not just exercises", () => {
  const session = freshSession();
  const withOneSet: Session = {
    ...session,
    exercises: session.exercises.map((entry, index) =>
      index === 0
        ? { ...entry, sets: entry.sets.map((set, i) => (i === 0 ? { ...set, done: true } : set)) }
        : entry,
    ),
  };
  const progress = sessionProgress(withOneSet);
  assert.equal(progress.doneSets, 1);
  assert.equal(progress.doneExercises, 0);
  assert.ok(progress.ratio > 0 && progress.ratio < 0.1);
});

test("volume ignores time-based work", () => {
  const lower = SEED_PROGRAMS[1]!;
  const { session } = createSession({ program: lower, now: NOW, id: "s3", lastSessionDate: null });
  const done: Session = {
    ...session,
    exercises: session.exercises.map((entry) => ({
      ...entry,
      sets: entry.sets.map((set) => ({ ...set, done: true })),
    })),
  };
  const expected = done.exercises
    .filter((entry) => entry.unit === "kg")
    .flatMap((entry) => entry.sets)
    .reduce((total, set) => total + set.weight * set.reps, 0);
  assert.equal(sessionVolume(done), Math.round(expected));
});

test("finishing records personal records only against a previous best", () => {
  const session = freshSession();
  const done: Session = {
    ...session,
    exercises: session.exercises.map((entry) => ({
      ...entry,
      status: "done",
      sets: entry.sets.map((set) => ({ ...set, done: true })),
    })),
  };

  const first = finishSession(done, {}, NOW + 3_600_000);
  assert.equal(first.complete, true);
  assert.equal(first.entry.personalRecords.length, 0, "the first session sets the baseline");
  assert.ok(first.records["chest-press"]);

  const heavier: Session = {
    ...done,
    exercises: done.exercises.map((entry) =>
      entry.exerciseId === "chest-press"
        ? { ...entry, sets: entry.sets.map((set) => ({ ...set, weight: set.weight + 10 })) }
        : entry,
    ),
  };
  const second = finishSession(heavier, first.records, NOW + 7_200_000);
  assert.deepEqual(second.entry.personalRecords, ["Chest Press"]);
});

test("a partial session is still saved, with an explicit note", () => {
  const session = freshSession();
  const partial: Session = {
    ...session,
    exercises: session.exercises.map((entry, index) =>
      index === 0
        ? { ...entry, status: "done", sets: entry.sets.map((set) => ({ ...set, done: true })) }
        : entry,
    ),
  };
  const { entry, complete } = finishSession(partial, {}, NOW + 1_800_000);
  assert.equal(complete, false);
  assert.equal(entry.completedExercises, 1);
  assert.match(entry.note, /à reprendre/);
});

test("a session left open overnight is flagged as stale", () => {
  const session = freshSession();
  assert.equal(isSessionStale(session, NOW + 60_000), false);
  assert.equal(isSessionStale(session, NOW + 6 * 3_600_000), true);
});

function historyAt(dates: number[]): HistoryEntry[] {
  return dates.map((date, index) => ({
    id: `h${index}`,
    date,
    programId: "upper-a",
    programName: "Haut du corps A",
    durationMinutes: 55,
    completedExercises: 6,
    totalExercises: 6,
    completedSets: 18,
    volume: 5000 + index * 100,
    note: "",
    personalRecords: [],
    exerciseNotes: [],
  }));
}

test("weekly counters use local ISO weeks", () => {
  const monday = new Date(2026, 7, 10, 9, 0, 0).getTime(); // 10 Aug 2026 is a Monday
  const sunday = monday + 6 * 86_400_000;
  const lastWeek = monday - 3 * 86_400_000;
  const history = historyAt([sunday, monday, lastWeek]);

  assert.equal(sessionsThisWeek(history, sunday), 2);
  assert.equal(weeklyStreak(history, sunday), 2);
  assert.equal(weeklyStreak([], sunday), 0);
});

test("the volume trend stays silent until it has enough sessions", () => {
  const base = Date.UTC(2026, 7, 1);
  const few = historyAt([base, base - 86_400_000]);
  assert.equal(volumeTrend(few).direction, "unknown");

  const many = Array.from({ length: 8 }, (_, index) => ({
    ...historyAt([base - index * 86_400_000])[0]!,
    id: `h${index}`,
    volume: index < 4 ? 6000 : 5000,
  }));
  const trend = volumeTrend(many);
  assert.equal(trend.direction, "up");
  assert.equal(trend.changePercent, 20);
});
