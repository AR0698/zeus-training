import assert from "node:assert/strict";
import { test } from "node:test";
import { chosenHomePack, findPack, packOf, packPrograms } from "../src/domain/packs.ts";
import { programPlace, programsAt, upNext } from "../src/domain/place.ts";
import { SEED_PROGRAMS, createInitialState } from "../src/domain/seed.ts";
import type { AppState, Program } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 10, 1, 10, 0, 0);
const HOME = packPrograms("bodyweight-transition");
const CIRCUIT_PROGRAM = packPrograms("bodyweight").find((program) => program.id === "bw-main-1")!;

function withPrograms(programs: Program[]): AppState {
  return { ...createInitialState(NOW), onboardedAt: NOW, programs };
}

function start(program: Program): AppState {
  return reducer(withPrograms([program]), { type: "session/start", program, now: NOW, id: "s1" });
}

function validateCurrent(state: AppState): AppState {
  const entry = state.session!.exercises[state.session!.currentIndex]!;
  const setIndex = entry.sets.findIndex((set) => !set.done);
  return reducer(state, { type: "session/toggleSet", exerciseId: entry.exerciseId, setIndex, now: NOW });
}

test("les séances des paquets se font à la maison, les autres en salle", () => {
  assert.equal(HOME.every((program) => programPlace(program) === "home"), true);
  assert.equal(SEED_PROGRAMS.every((program) => programPlace(program) === "gym"), true);
});

test("chaque onglet ne montre que ses séances, dans l'ordre de la liste", () => {
  const programs = [SEED_PROGRAMS[0]!, HOME[0]!, SEED_PROGRAMS[1]!, HOME[1]!];
  assert.deepEqual(programsAt(programs, "gym").map((p) => p.id), [SEED_PROGRAMS[0]!.id, SEED_PROGRAMS[1]!.id]);
  assert.deepEqual(programsAt(programs, "home").map((p) => p.id), [HOME[0]!.id, HOME[1]!.id]);
});

test("une séance créée depuis l'onglet Maison est une séance maison", () => {
  const state = reducer(withPrograms([]), { type: "program/create", id: "p1", place: "home" });
  assert.equal(programPlace(state.programs[0]!), "home");
  const gym = reducer(withPrograms([]), { type: "program/create", id: "p2" });
  assert.equal(programPlace(gym.programs[0]!), "gym");
});

test("la séance garde le lieu du programme", () => {
  assert.equal(start(HOME[0]!).session!.place, "home");
  assert.equal(start(SEED_PROGRAMS[0]!).session!.place, undefined);
});

test("le lieu survit à un aller-retour par le stockage", () => {
  const state = start(HOME[0]!);
  const { state: reloaded, issues } = parseAppState(JSON.parse(JSON.stringify(state)), NOW);
  assert.deepEqual(issues, []);
  assert.equal(programPlace(reloaded.programs[0]!), "home");
  assert.equal(reloaded.session!.place, "home");
});

test("un paquet ajouté avant les lieux passe à la maison à la lecture", () => {
  const raw = JSON.parse(JSON.stringify(start(HOME[0]!)));
  delete raw.programs[0].place;
  delete raw.session.place;
  const { state } = parseAppState(raw, NOW);
  assert.equal(programPlace(state.programs[0]!), "home");
  assert.equal(state.session!.place, "home");
});

test("une sauvegarde d'avant les lieux garde ses séances en salle", () => {
  const raw = JSON.parse(JSON.stringify(start(SEED_PROGRAMS[0]!)));
  assert.equal("place" in raw.programs[0], false);
  const { state, issues } = parseAppState(raw, NOW);
  assert.deepEqual(issues, []);
  assert.equal(programPlace(state.programs[0]!), "gym");
  assert.equal(state.session!.place, undefined);
});

test("un lieu illisible vaut la salle", () => {
  const raw = JSON.parse(JSON.stringify(start(SEED_PROGRAMS[0]!)));
  raw.programs[0].place = "plage";
  const { state } = parseAppState(raw, NOW);
  assert.equal(programPlace(state.programs[0]!), "gym");
});

test("« Ensuite » annonce l'exercice suivant du tour, puis le premier au tour suivant", () => {
  let state = start(CIRCUIT_PROGRAM);
  const ids = state.session!.exercises.map((entry) => entry.exerciseId);
  assert.equal(upNext(state.session!)?.exerciseId, ids[1]);
  for (let step = 0; step < 4; step += 1) state = validateCurrent(state);
  assert.equal(state.session!.currentIndex, 4);
  assert.equal(upNext(state.session!)?.exerciseId, ids[0]);
});

test("au dernier tour, « Ensuite » annonce la première série classique", () => {
  let state = start(CIRCUIT_PROGRAM);
  for (let step = 0; step < 14; step += 1) state = validateCurrent(state);
  assert.equal(upNext(state.session!)?.exerciseId, "band-face-pull");
});

test("hors circuit, « Ensuite » annonce l'exercice suivant à faire, et rien à la fin", () => {
  let state = start(packPrograms("bodyweight").find((program) => program.id === "bw-main-2")!);
  for (let step = 0; step < 15; step += 1) state = validateCurrent(state);
  const session = state.session!;
  assert.equal(session.exercises[session.currentIndex]!.exerciseId, "wall-sit");
  assert.equal(upNext(session)?.exerciseId, "plank");
  const last = { ...session, currentIndex: session.exercises.length - 1 };
  assert.equal(upNext(last), null);
});

test("deux programmes à la maison : Sport hôtel sans accessoire, Sport maison avec", () => {
  assert.equal(findPack("bodyweight-transition")?.name, "Sport hôtel");
  assert.equal(findPack("bodyweight")?.name, "Sport maison");
  const names = [...packPrograms("bodyweight-transition"), ...packPrograms("bodyweight")].map((p) => p.name);
  assert.deepEqual(names, [
    "Haut du corps",
    "Jambes",
    "Dos et abdos",
    "Full body",
    "Haut du corps",
    "Jambes",
    "Dos et abdos",
    "Full body",
  ]);
});

test("une séance sait de quel programme maison elle vient", () => {
  assert.equal(packOf("bw-transition-2"), "bodyweight-transition");
  assert.equal(packOf("bw-main-4"), "bodyweight");
  assert.equal(packOf(SEED_PROGRAMS[0]!.id), null);
});

test("l'onglet Maison ouvre sur le programme déjà choisi, sinon sur aucun", () => {
  assert.equal(chosenHomePack(withPrograms([])), null);
  assert.equal(chosenHomePack(withPrograms([...SEED_PROGRAMS])), null);
  assert.equal(chosenHomePack(withPrograms([SEED_PROGRAMS[0]!, ...packPrograms("bodyweight")])), "bodyweight");
});

test("les séances d'un paquet ajouté avant le renommage prennent leur nouveau nom", () => {
  const raw = JSON.parse(JSON.stringify(withPrograms([...packPrograms("bodyweight-transition"), ...packPrograms("bodyweight")])));
  raw.programs[0].name = "Transition · Haut du corps";
  raw.programs[4].name = "Poids du corps · Haut du corps";
  raw.programs[1].name = "Mes jambes du mardi";
  const { state } = parseAppState(raw, NOW);
  assert.equal(state.programs[0]!.name, "Haut du corps");
  assert.equal(state.programs[4]!.name, "Haut du corps");
  // Un nom choisi par la personne ne bouge pas.
  assert.equal(state.programs[1]!.name, "Mes jambes du mardi");
});

test("à l'ouverture, l'onglet Maison reprend le programme de la dernière séance faite", () => {
  const both = withPrograms([...packPrograms("bodyweight-transition"), ...packPrograms("bodyweight")]);
  assert.equal(chosenHomePack(both), "bodyweight-transition");
  assert.equal(chosenHomePack({ ...both, lastCompletedProgramId: "bw-main-2" }), "bodyweight");
});
