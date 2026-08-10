import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EXERCISE_LIBRARY,
  makeCustomExercise,
  makeEmptyProgram,
  patchExercise,
  resizeExercise,
  searchLibrary,
  slugify,
  uniqueExerciseId,
} from "../src/domain/library.ts";
import { createInitialState } from "../src/domain/seed.ts";
import type { AppState, ExerciseTemplate } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);
const base = () => createInitialState(NOW);
const first = (state: AppState) => state.programs[0]!;

test("every library entry is internally consistent", () => {
  for (const exercise of EXERCISE_LIBRARY) {
    assert.equal(exercise.targetWeights.length, exercise.sets, exercise.id);
    assert.equal(exercise.lastWeights.length, exercise.sets, exercise.id);
    assert.ok(exercise.repMax >= exercise.repMin, exercise.id);
    assert.ok(exercise.name.length > 0, exercise.id);
  }
  const ids = EXERCISE_LIBRARY.map((exercise) => exercise.id);
  assert.equal(new Set(ids).size, ids.length, "les identifiants du catalogue sont uniques");
});

test("library search ignores case and accents", () => {
  assert.ok(searchLibrary("developpe").some((item) => item.id === "incline-db-press"));
  assert.ok(searchLibrary("ÉLÉVATIONS").some((item) => item.id === "lateral-raise"));
  assert.equal(searchLibrary("").length, EXERCISE_LIBRARY.length);
  assert.equal(searchLibrary("zzzz").length, 0);
});

test("slugify produces a usable id fragment", () => {
  assert.equal(slugify("Développé incliné haltères"), "developpe-incline-halteres");
  assert.equal(slugify("!!!"), "exercice");
});

test("adding the same movement twice keeps the two logs separate", () => {
  const program = first(base());
  const taken = program.exercises[0]!.id;
  assert.equal(uniqueExerciseId(program, taken), `${taken}-2`);
  assert.equal(uniqueExerciseId(program, "mouvement-inedit"), "mouvement-inedit");
});

test("changing the set count keeps the load arrays aligned", () => {
  const source = EXERCISE_LIBRARY.find((exercise) => exercise.id === "chest-press")!;
  const bigger = resizeExercise(source, 5);
  assert.equal(bigger.targetWeights.length, 5);
  assert.equal(bigger.targetWeights.at(-1), source.targetWeights.at(-1), "la série ajoutée reprend la dernière charge");

  const smaller = resizeExercise(source, 1);
  assert.equal(smaller.targetWeights.length, 1);
  assert.equal(smaller.lastWeights.length, 1);

  // Bornes : jamais zéro série, jamais une liste absurde.
  assert.equal(resizeExercise(source, 0).sets, 1);
  assert.equal(resizeExercise(source, 99).sets, 12);
});

test("patchExercise repairs the invariants an editor could break", () => {
  const source = EXERCISE_LIBRARY[0]!;

  const inverted = patchExercise(source, { repMin: 12, repMax: 5 });
  assert.equal(inverted.repMax, 12, "repMax ne peut pas passer sous repMin");

  const unnamed = patchExercise(source, { name: "   " });
  assert.equal(unnamed.name, source.name, "un nom vide ne remplace pas l'ancien");

  const renamed = patchExercise(source, { name: "Mon mouvement", shortName: "  " });
  assert.equal(renamed.shortName, "Mon mouvement", "le nom court retombe sur le nom complet");

  const withAlternatives = patchExercise(source, { alternatives: [" Pompes ", "", "Dips"] });
  assert.deepEqual(withAlternatives.alternatives, ["Pompes", "Dips"]);

  const longRest = patchExercise(source, { restSeconds: 9999 });
  assert.equal(longRest.restSeconds, 600);

  const resized = patchExercise(source, { sets: 6 });
  assert.equal(resized.targetWeights.length, 6);
});

test("un exercice peut être ajouté, déplacé et retiré", () => {
  let state = base();
  const programId = first(state).id;
  const template = EXERCISE_LIBRARY.find((exercise) => exercise.id === "face-pull")!;

  state = reducer(state, { type: "program/addExercise", programId, exercise: template });
  assert.equal(first(state).exercises.at(-1)?.id, "face-pull");

  const originalOrder = first(state).exercises.map((exercise) => exercise.id);
  state = reducer(state, { type: "program/moveExercise", programId, exerciseId: "face-pull", direction: -1 });
  const moved = first(state).exercises.map((exercise) => exercise.id);
  assert.equal(moved.at(-1), originalOrder.at(-2));
  assert.equal(moved.at(-2), "face-pull");

  // Un déplacement au-delà du bord ne fait rien plutôt que de casser l'ordre.
  state = reducer(state, { type: "program/moveExercise", programId, exerciseId: originalOrder[0]!, direction: -1 });
  assert.equal(first(state).exercises[0]?.id, originalOrder[0]);

  state = reducer(state, { type: "program/removeExercise", programId, exerciseId: "face-pull" });
  assert.equal(
    first(state).exercises.some((exercise) => exercise.id === "face-pull"),
    false,
  );
});

test("modifier un exercice passe par les mêmes réparations que le domaine", () => {
  let state = base();
  const programId = first(state).id;
  const exerciseId = first(state).exercises[0]!.id;

  state = reducer(state, {
    type: "program/updateExercise",
    programId,
    exerciseId,
    patch: { sets: 5, name: "Presse pectorale", unit: "kg" },
  });

  const exercise = first(state).exercises[0]!;
  assert.equal(exercise.name, "Presse pectorale");
  assert.equal(exercise.sets, 5);
  assert.equal(exercise.targetWeights.length, 5);
  assert.equal(exercise.lastWeights.length, 5);
});

test("une séance se crée, se duplique, se déplace et se supprime", () => {
  let state = base();
  const initialCount = state.programs.length;

  state = reducer(state, { type: "program/create", id: "p-new" });
  assert.equal(state.programs.length, initialCount + 1);
  assert.deepEqual(state.programs.at(-1)?.exercises, []);

  state = reducer(state, { type: "program/duplicate", programId: "upper-a", id: "p-copy" });
  const copy = state.programs.find((program) => program.id === "p-copy")!;
  assert.match(copy.name, /copie/);
  assert.equal(copy.exercises.length, 7);
  assert.equal(state.programs.indexOf(copy), 1, "la copie se range juste après l'original");

  state = reducer(state, { type: "program/move", programId: "p-copy", direction: -1 });
  assert.equal(state.programs[0]?.id, "p-copy");

  state = reducer(state, { type: "program/move", programId: "p-copy", direction: -1 });
  assert.equal(state.programs[0]?.id, "p-copy", "on ne sort pas de la liste");

  state = reducer(state, { type: "program/delete", programId: "p-copy" });
  assert.equal(
    state.programs.some((program) => program.id === "p-copy"),
    false,
  );
});

test("supprimer la séance en tête de rotation remet la rotation à zéro", () => {
  let state: AppState = { ...base(), lastCompletedProgramId: "upper-a" };
  state = reducer(state, { type: "program/delete", programId: "upper-a" });
  assert.equal(state.lastCompletedProgramId, null);

  let other: AppState = { ...base(), lastCompletedProgramId: "upper-a" };
  other = reducer(other, { type: "program/delete", programId: "lower-a" });
  assert.equal(other.lastCompletedProgramId, "upper-a");
});

test("renommer une séance refuse le vide mais accepte tout le reste", () => {
  let state = base();
  state = reducer(state, { type: "program/update", programId: "upper-a", patch: { name: "   " } });
  assert.equal(first(state).name, "Séance sans titre");

  state = reducer(state, {
    type: "program/update",
    programId: "upper-a",
    patch: { name: "Push", focus: "Pecs et épaules", estimatedMinutes: 1000 },
  });
  assert.equal(first(state).name, "Push");
  assert.equal(first(state).focus, "Pecs et épaules");
  assert.equal(first(state).estimatedMinutes, 240);
});

test("un programme entièrement personnel survit à un aller-retour sur disque", () => {
  let state = base();
  state = reducer(state, { type: "program/create", id: "p-perso" });
  const custom: ExerciseTemplate = {
    ...makeCustomExercise("perso-1"),
    name: "Rowing élastique",
    shortName: "Rowing élastique",
    sets: 4,
    targetWeights: [0, 0, 0, 0],
    lastWeights: [0, 0, 0, 0],
  };
  state = reducer(state, { type: "program/addExercise", programId: "p-perso", exercise: custom });
  state = reducer(state, { type: "program/update", programId: "p-perso", patch: { name: "Ma séance" } });

  const parsed = parseAppState(JSON.parse(JSON.stringify(state)), NOW);
  const restored = parsed.state.programs.find((program) => program.id === "p-perso");
  assert.ok(restored, "le programme personnel est conservé");
  assert.equal(restored.name, "Ma séance");
  assert.equal(restored.exercises[0]?.name, "Rowing élastique");
  assert.equal(restored.exercises[0]?.sets, 4);
});

test("une séance vide en cours de construction n'est pas écrasée par les valeurs par défaut", () => {
  const state = reducer(base(), { type: "program/create", id: "p-vide" });
  const parsed = parseAppState(JSON.parse(JSON.stringify(state)), NOW);
  const restored = parsed.state.programs.find((program) => program.id === "p-vide");
  assert.ok(restored);
  assert.deepEqual(restored.exercises, []);
});

test("supprimer toutes les séances ne les fait pas réapparaître au rechargement", () => {
  let state = base();
  for (const program of [...state.programs]) {
    state = reducer(state, { type: "program/delete", programId: program.id });
  }
  assert.equal(state.programs.length, 0);

  const parsed = parseAppState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(parsed.state.programs.length, 0, "un choix délibéré n'est pas annulé au rechargement");
});

test("makeEmptyProgram produit une séance démarrable une fois remplie", () => {
  const program = makeEmptyProgram("p1", "sky");
  assert.equal(program.exercises.length, 0);
  assert.equal(program.accent, "sky");
  assert.ok(program.estimatedMinutes >= 5);
});
