import assert from "node:assert/strict";
import { test } from "node:test";
import { REPLACEMENT_NAME_MAX, cleanReplacementName, keptTemplate } from "../src/domain/replacement.ts";
import { createInitialState, examplePrograms, SEED_PROGRAMS } from "../src/domain/seed.ts";
import type { AppState } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";

const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);
const CUSTOM = "Presse Hammer salle 2";

function started(): AppState {
  const state: AppState = { ...createInitialState(NOW), onboardedAt: NOW, programs: examplePrograms() };
  return reducer(state, { type: "session/start", program: SEED_PROGRAMS[0]!, now: NOW, id: "s1" });
}

function validateAll(state: AppState, exerciseId: string): AppState {
  const entry = state.session!.exercises.find((item) => item.exerciseId === exerciseId)!;
  return entry.sets.reduce(
    (next, _set, setIndex) =>
      reducer(next, { type: "session/toggleSet", exerciseId, setIndex, now: NOW }),
    state,
  );
}

test("a free name is trimmed, collapsed and capped", () => {
  assert.equal(cleanReplacementName(`  Presse   Hammer  `), "Presse Hammer");
  assert.equal(cleanReplacementName("   "), null);
  assert.equal(cleanReplacementName("x".repeat(200))!.length, REPLACEMENT_NAME_MAX);
});

test("a custom machine replaces the movement and keeps the target of the original", () => {
  let state = started();
  const original = state.session!.exercises[0]!;
  state = reducer(state, { type: "session/toggleSet", exerciseId: original.exerciseId, setIndex: 0, now: NOW });
  state = reducer(state, { type: "session/replace", exerciseId: original.exerciseId, alternative: `  ${CUSTOM} ` });

  const entry = state.session!.exercises[0]!;
  assert.equal(entry.replacedBy, CUSTOM);
  assert.equal(entry.group, original.group);
  assert.equal(entry.unit, original.unit);
  assert.equal(entry.repMin, original.repMin);
  assert.equal(entry.repMax, original.repMax);
  assert.equal(entry.sets[0]!.done, true);
});

test("an empty name changes nothing", () => {
  const state = started();
  const id = state.session!.exercises[0]!.exerciseId;
  assert.equal(reducer(state, { type: "session/replace", exerciseId: id, alternative: "  " }), state);
});

test("going back to the original clears the substitution", () => {
  let state = started();
  const entry = state.session!.exercises[0]!;
  state = reducer(state, { type: "session/replace", exerciseId: entry.exerciseId, alternative: CUSTOM });
  state = reducer(state, { type: "session/replace", exerciseId: entry.exerciseId, alternative: entry.name });
  assert.equal(state.session!.exercises[0]!.replacedBy, null);
});

test("a one-off replacement leaves the program untouched, loads and records included", () => {
  let state = started();
  const id = state.session!.exercises[0]!.exerciseId;
  const before = state.programs[0]!.exercises[0]!;
  state = reducer(state, { type: "session/replace", exerciseId: id, alternative: CUSTOM });
  state = reducer(state, { type: "session/setValue", exerciseId: id, setIndex: 0, field: "weight", value: 200 });
  state = validateAll(state, id);
  state = reducer(state, { type: "session/finish", now: NOW + 3_600_000 });

  assert.deepEqual(state.programs[0]!.exercises[0], before);
  assert.equal(state.records[id], undefined);
  assert.equal(state.history.length, 1);
  assert.ok(state.history[0]!.volume > 0, "le travail fait compte quand même dans le volume");
});

test("keeping a replacement swaps the program exercise in place, under a new id", () => {
  let state = started();
  const original = state.programs[0]!.exercises[0]!;
  state = reducer(state, { type: "session/keepReplacement", exerciseId: original.id, alternative: CUSTOM });

  const kept = state.programs[0]!.exercises[0]!;
  assert.notEqual(kept.id, original.id);
  assert.equal(kept.name, CUSTOM);
  assert.equal(kept.group, original.group);
  assert.equal(kept.unit, original.unit);
  assert.equal(kept.sets, original.sets);
  assert.equal(kept.repMin, original.repMin);
  assert.equal(kept.repMax, original.repMax);
  assert.equal(kept.alternatives[0], original.name, "l'ancienne machine devient le premier repli");
  assert.equal(state.programs[0]!.exercises.length, examplePrograms()[0]!.exercises.length);

  const entry = state.session!.exercises[0]!;
  assert.equal(entry.exerciseId, kept.id);
  assert.equal(entry.name, CUSTOM);
  assert.equal(entry.replacedBy, null);
});

test("the next session starts directly on the kept machine", () => {
  let state = started();
  const id = state.session!.exercises[0]!.exerciseId;
  state = reducer(state, { type: "session/keepReplacement", exerciseId: id, alternative: CUSTOM });
  state = reducer(state, { type: "session/abandon" });
  state = reducer(state, { type: "session/start", program: state.programs[0]!, now: NOW, id: "s2" });
  assert.equal(state.session!.exercises[0]!.name, CUSTOM);
});

test("a kept machine starts its own progression and record book", () => {
  let state = started();
  const oldId = state.session!.exercises[0]!.exerciseId;
  state = { ...state, records: { [oldId]: { weight: 90, reps: 12, date: NOW } } };
  state = reducer(state, { type: "session/keepReplacement", exerciseId: oldId, alternative: CUSTOM });
  const newId = state.session!.exercises[0]!.exerciseId;
  const sets = state.session!.exercises[0]!.sets.length;
  for (let setIndex = 0; setIndex < sets; setIndex += 1) {
    state = reducer(state, { type: "session/setValue", exerciseId: newId, setIndex, field: "weight", value: 40 });
  }
  state = validateAll(state, newId);
  assert.ok(
    state.session!.exercises[0]!.sets.every((set) => !set.pr),
    "40 kg sur une autre machine ne se compare pas aux 90 kg de l'ancienne",
  );
  state = reducer(state, { type: "session/finish", now: NOW + 3_600_000 });

  const kept = state.programs[0]!.exercises[0]!;
  assert.ok(kept.targetWeights.every((weight) => weight >= 40 && weight < 90));
  assert.deepEqual(state.records[oldId], { weight: 90, reps: 12, date: NOW });
  assert.equal(state.records[newId]!.weight, 40);
});

test("a kept catalog movement brings its own technique notes", () => {
  const program = examplePrograms()[0]!;
  const original = program.exercises[0]!;
  const entry = started().session!.exercises[0]!;
  const kept = keptTemplate(program, original, entry, "Pompes");
  assert.equal(kept.name, "Pompes");
  assert.ok(kept.cue.length > 0);
  assert.notEqual(kept.cue, original.cue);
  assert.equal(kept.group, original.group);
});

test("keeping without a matching program falls back to a one-off replacement", () => {
  let state = started();
  const id = state.session!.exercises[0]!.exerciseId;
  state = { ...state, programs: [] };
  state = reducer(state, { type: "session/keepReplacement", exerciseId: id, alternative: CUSTOM });
  assert.equal(state.session!.exercises[0]!.replacedBy, CUSTOM);
  assert.equal(state.session!.exercises[0]!.exerciseId, id);
});
