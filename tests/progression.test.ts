import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applySessionToPrograms,
  decideProgression,
  layoffAdjustment,
  nextProgram,
  weightStep,
} from "../src/domain/progression.ts";
import { SEED_PROGRAMS } from "../src/domain/seed.ts";
import { createSession } from "../src/domain/session.ts";
import type { SessionExercise } from "../src/domain/types.ts";

function makeEntry(overrides: Partial<SessionExercise> = {}): SessionExercise {
  return {
    exerciseId: "chest-press",
    name: "Chest Press",
    shortName: "Chest Press",
    group: "upper",
    unit: "kg",
    repMin: 12,
    repMax: 15,
    cue: "",
    tip: "",
    videoUrl: "",
    alternatives: [],
    restSeconds: 90,
    effort: null,
    status: "done",
    replacedBy: null,
    note: "",
    sets: [
      { weight: 30, reps: 15, done: true, pr: false },
      { weight: 35, reps: 15, done: true, pr: false },
    ],
    ...overrides,
  };
}

test("weightStep uses gym-realistic increments", () => {
  assert.equal(weightStep("kg", "upper", 30), 2.5);
  assert.equal(weightStep("kg", "lower", 60), 5);
  assert.equal(weightStep("kg", "upper", 8), 1, "light dumbbells move by 1 kg");
  assert.equal(weightStep("sec", "core", 45), 5);
});

test("au haut de la fourchette, la charge reste celle de la séance : chaque machine se règle à part", () => {
  const decision = decideProgression(makeEntry());
  assert.equal(decision.action, "hold");
  assert.deepEqual(decision.nextWeights, [30, 35]);
  assert.match(decision.reason, /monte/);
});

test("holds when a set stops short of the top of the range", () => {
  const decision = decideProgression(
    makeEntry({ sets: [
      { weight: 30, reps: 15, done: true, pr: false },
      { weight: 35, reps: 13, done: true, pr: false },
    ] }),
  );
  assert.equal(decision.action, "hold");
  assert.deepEqual(decision.nextWeights, [30, 35]);
});

test("holds when the exercise felt hard, even at the top of the range", () => {
  const decision = decideProgression(makeEntry({ effort: "hard" }));
  assert.equal(decision.action, "hold");
});

test("holds when sets are left unvalidated", () => {
  const decision = decideProgression(
    makeEntry({
      status: "pending",
      sets: [
        { weight: 30, reps: 15, done: true, pr: false },
        { weight: 35, reps: 15, done: false, pr: false },
      ],
    }),
  );
  assert.equal(decision.action, "hold");
});

test("sous la fourchette, la charge n'est pas allégée d'office", () => {
  const decision = decideProgression(
    makeEntry({ sets: [{ weight: 40, reps: 8, done: true, pr: false }] }),
  );
  assert.equal(decision.action, "hold");
  assert.deepEqual(decision.nextWeights, [40]);
});

test("a skipped exercise never changes its target", () => {
  const decision = decideProgression(makeEntry({ status: "skipped" }));
  assert.equal(decision.action, "hold");
  assert.deepEqual(decision.nextWeights, [30, 35]);
});

test("a long layoff is detected, without touching the loads", () => {
  const now = Date.UTC(2026, 7, 10);
  const recent = layoffAdjustment(now - 5 * 86_400_000, now);
  assert.equal(recent.applied, false);

  const long = layoffAdjustment(now - 40 * 86_400_000, now);
  assert.equal(long.applied, true);
  assert.equal(long.days, 40);
});

test("progression is written back by exercise id, not by position", () => {
  const program = SEED_PROGRAMS[0]!;
  const { session } = createSession({
    program,
    now: 0,
    id: "s1",
    lastSessionDate: null,
  });

  // Every set completed at the top of its range, on loads set by hand 1 kg above
  // the target: those are what the next session must reopen with.
  const finished = {
    ...session,
    exercises: session.exercises.map((entry) => ({
      ...entry,
      status: "done" as const,
      sets: entry.sets.map((set) => ({
        ...set,
        weight: entry.unit === "kg" ? set.weight + 1 : set.weight,
        reps: entry.repMax,
        done: true,
      })),
    })),
  };

  // Reorder the program to prove index coupling would have broken this.
  const shuffled = {
    ...program,
    exercises: [...program.exercises].reverse(),
  };

  const [updated] = applySessionToPrograms([shuffled], finished);
  for (const exercise of updated!.exercises) {
    const original = program.exercises.find((item) => item.id === exercise.id)!;
    // Les kilos reprennent ceux de la séance ; seules les secondes s'allongent.
    const expected = original.targetWeights.map((weight) =>
      original.unit === "kg"
        ? weight + 1
        : original.unit === "sec"
          ? weight + weightStep(original.unit, original.group, weight)
          : weight,
    );
    assert.deepEqual(exercise.targetWeights, expected, exercise.id);
  }
});

test("the rotation walks the Upper/Lower cycle and wraps", () => {
  assert.equal(nextProgram(SEED_PROGRAMS, null)?.id, "upper-a");
  assert.equal(nextProgram(SEED_PROGRAMS, "upper-a")?.id, "lower-a");
  assert.equal(nextProgram(SEED_PROGRAMS, "lower-b")?.id, "upper-a");
  assert.equal(nextProgram(SEED_PROGRAMS, "inconnu")?.id, "upper-a");
});

test("an empty library yields no recommendation instead of throwing", () => {
  assert.equal(nextProgram([], null), null);
  assert.equal(nextProgram([], "upper-a"), null);
});
