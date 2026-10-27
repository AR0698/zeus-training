import assert from "node:assert/strict";
import { test } from "node:test";
import { decideProgression } from "../src/domain/progression.ts";
import { SEED_PROGRAMS, createInitialState, examplePrograms } from "../src/domain/seed.ts";
import { createSession, finishSession } from "../src/domain/session.ts";
import type { AppState, SessionExercise } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";

/**
 * Un exercice chronométré (gainage…) se mesure en secondes, portées par
 * `weight`. Le bug « gainage » recopiait la cible en secondes dans `reps`,
 * et l'écran affichait « Tours 45 » : la durée seule doit suffire.
 */

const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);
const LOWER = SEED_PROGRAMS.find((program) => program.exercises.some((e) => e.id === "plank"))!;

function plankOf(exercises: SessionExercise[]): SessionExercise {
  return exercises.find((entry) => entry.exerciseId === "plank")!;
}

function timedEntry(durations: number[]): SessionExercise {
  return {
    exerciseId: "plank",
    name: "Gainage planche",
    shortName: "Planche",
    group: "core",
    unit: "sec",
    repMin: 45,
    repMax: 60,
    cue: "",
    tip: "",
    videoUrl: "",
    alternatives: [],
    restSeconds: 15,
    effort: null,
    status: "done",
    replacedBy: null,
    sets: durations.map((weight) => ({ weight, reps: 0, done: true, pr: false })),
  };
}

test("une séance neuve ne recopie pas la cible en secondes dans les tours", () => {
  const { session } = createSession({ program: LOWER, now: NOW, id: "s1", lastSessionDate: null });
  const plank = plankOf(session.exercises);
  assert.deepEqual(plank.sets.map((set) => set.weight), [45, 45, 45]);
  assert.ok(plank.sets.every((set) => set.reps === 0), "aucune valeur en secondes dans reps");
});

test("une série ajoutée à un exercice chronométré reste sans tours", () => {
  let state: AppState = { ...createInitialState(NOW), onboardedAt: NOW, programs: examplePrograms() };
  state = reducer(state, { type: "session/start", program: LOWER, now: NOW, id: "s1" });
  state = reducer(state, { type: "session/addSet", exerciseId: "plank" });
  const plank = plankOf(state.session!.exercises);
  assert.equal(plank.sets.length, 4);
  assert.equal(plank.sets.at(-1)!.weight, 45);
  assert.equal(plank.sets.at(-1)!.reps, 0);
});

test("tenir le haut de la fourchette sur chaque série allonge la durée", () => {
  const decision = decideProgression(timedEntry([60, 60, 60]));
  assert.equal(decision.action, "increase");
  assert.deepEqual(decision.nextWeights, [65, 65, 65]);
  assert.doesNotMatch(decision.reason, /reps/);
});

test("une durée dans la fourchette maintient la cible", () => {
  const decision = decideProgression(timedEntry([45, 50, 60]));
  assert.equal(decision.action, "hold");
  assert.deepEqual(decision.nextWeights, [45, 50, 60]);
  assert.doesNotMatch(decision.reason, /reps/);
});

test("une durée sous la fourchette repart de ce qui a été tenu, sans retrancher 10 %", () => {
  const decision = decideProgression(timedEntry([45, 40, 30]));
  assert.equal(decision.action, "hold");
  assert.deepEqual(decision.nextWeights, [45, 40, 30]);
  assert.doesNotMatch(decision.reason, /reps/);
});

test("l'historique d'une séance de gainage ne compte ni tonnage ni record", () => {
  const { session } = createSession({ program: LOWER, now: NOW, id: "s1", lastSessionDate: null });
  const exercises = session.exercises.map((entry) =>
    entry.exerciseId === "plank"
      ? { ...entry, status: "done" as const, sets: entry.sets.map((set) => ({ ...set, done: true })) }
      : entry,
  );
  const { entry, records } = finishSession({ ...session, exercises }, {}, NOW);
  assert.equal(entry.volume, 0);
  assert.equal(entry.completedSets, 3);
  assert.equal(records.plank, undefined);
});
