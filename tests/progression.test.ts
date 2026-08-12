import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DELOAD_FACTOR,
  applySessionToPrograms,
  decideProgression,
  layoffAdjustment,
  nextProgram,
  weightStep,
} from "../src/domain/progression.ts";
import { SEED_PROGRAMS } from "../src/domain/seed.ts";
import { createSession } from "../src/domain/session.ts";
import type { Program, Session, SessionExercise } from "../src/domain/types.ts";

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
    sets: [
      { weight: 30, reps: 15, done: true, pr: false },
      { weight: 35, reps: 15, done: true, pr: false },
    ],
    ...overrides,
  };
}

/** Une séance minimale portant un seul exercice, rattachée à un programme. */
function makeSession(program: Program, entry: SessionExercise): Session {
  return {
    id: "s1",
    programId: program.id,
    programName: program.name,
    accent: program.accent,
    startedAt: 0,
    currentIndex: 0,
    exercises: [entry],
  };
}

/** Toutes les séries bouclées en haut de fourchette : la progression monte. */
function makeTopOfRangeEntry(exerciseId: string, weights: number[], repMax: number): SessionExercise {
  return makeEntry({
    exerciseId,
    repMax,
    sets: weights.map((weight) => ({ weight, reps: repMax, done: true, pr: false })),
  });
}

test("weightStep uses gym-realistic increments", () => {
  assert.equal(weightStep("kg", "upper", 30), 2.5);
  assert.equal(weightStep("kg", "lower", 60), 5);
  assert.equal(weightStep("kg", "upper", 8), 1, "light dumbbells move by 1 kg");
  assert.equal(weightStep("sec", "core", 45), 5);
});

test("increases only when every set hits the top of the range", () => {
  const decision = decideProgression(makeEntry());
  assert.equal(decision.action, "increase");
  assert.deepEqual(decision.nextWeights, [32.5, 37.5]);
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

test("deloads when a completed set falls below the range", () => {
  const decision = decideProgression(
    makeEntry({ sets: [{ weight: 40, reps: 8, done: true, pr: false }] }),
  );
  assert.equal(decision.action, "deload");
  assert.deepEqual(decision.nextWeights, [40 * DELOAD_FACTOR]);
});

test("a skipped exercise never changes its target", () => {
  const decision = decideProgression(makeEntry({ status: "skipped" }));
  assert.equal(decision.action, "hold");
  assert.deepEqual(decision.nextWeights, [30, 35]);
});

test("a long layoff lightens the opening loads", () => {
  const now = Date.UTC(2026, 7, 10);
  const recent = layoffAdjustment(now - 5 * 86_400_000, now);
  assert.equal(recent.applied, false);
  assert.equal(recent.factor, 1);

  const long = layoffAdjustment(now - 40 * 86_400_000, now);
  assert.equal(long.applied, true);
  assert.equal(long.days, 40);
  assert.equal(long.factor, 0.9);
});

test("progression is written back by exercise id, not by position", () => {
  const program = SEED_PROGRAMS[0]!;
  const { session } = createSession({
    program,
    now: 0,
    id: "s1",
    lastSessionDate: null,
  });

  // Every set completed at the top of its range.
  const finished = {
    ...session,
    exercises: session.exercises.map((entry) => ({
      ...entry,
      status: "done" as const,
      sets: entry.sets.map((set) => ({ ...set, reps: entry.repMax, done: true })),
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
    const expected = original.targetWeights.map(
      (weight) => weight + weightStep(original.unit, original.group, weight),
    );
    assert.deepEqual(exercise.targetWeights, expected, exercise.id);
  }
});

test("une série ajoutée pendant la séance garde la cible déjà saisie", () => {
  const program = SEED_PROGRAMS[0]!;
  const source = program.exercises[0]!; // Chest Press : 3 séries, cibles 20 / 25 / 30.
  const session = makeSession(
    program,
    makeTopOfRangeEntry(source.id, source.targetWeights, source.repMax),
  );

  // Pendant la séance, l'éditeur est passé à 5 séries. Les deux dernières
  // n'ont pas été jouées : elles gardent la cible que l'éditeur a posée.
  const edited: Program = {
    ...program,
    exercises: [
      {
        ...source,
        sets: 5,
        targetWeights: [20, 25, 30, 32.5, 35],
        lastWeights: [20, 25, 30, 30, 30],
      },
    ],
  };

  const exercise = applySessionToPrograms([edited], session)[0]!.exercises[0]!;
  assert.equal(exercise.targetWeights.length, exercise.sets, "une charge par série déclarée");
  assert.equal(exercise.lastWeights.length, exercise.sets);
  assert.deepEqual(exercise.targetWeights, [22.5, 27.5, 32.5, 32.5, 35]);
  assert.deepEqual(exercise.lastWeights, [20, 25, 30, 30, 30]);
});

test("une série retirée pendant la séance ne laisse pas de charge orpheline", () => {
  const program = SEED_PROGRAMS[0]!;
  const source = program.exercises[0]!;
  const session = makeSession(
    program,
    makeTopOfRangeEntry(source.id, source.targetWeights, source.repMax),
  );

  const edited: Program = {
    ...program,
    exercises: [{ ...source, sets: 2, targetWeights: [20, 25], lastWeights: [20, 25] }],
  };

  const exercise = applySessionToPrograms([edited], session)[0]!.exercises[0]!;
  assert.equal(exercise.targetWeights.length, 2, "la troisième série n'existe plus");
  assert.deepEqual(exercise.targetWeights, [22.5, 27.5]);
  assert.deepEqual(exercise.lastWeights, [20, 25]);
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
