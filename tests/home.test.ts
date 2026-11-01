import assert from "node:assert/strict";
import { test } from "node:test";
import { chosenHomePack, findPack, packOf, packPrograms } from "../src/domain/packs.ts";
import { manualRestSeconds } from "../src/domain/circuit.ts";
import { programPlace, programsAt, upNext } from "../src/domain/place.ts";
import { nextProgram } from "../src/domain/progression.ts";
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

test("une séance Sport hôtel déjà enregistrée perd ses exercices à table ou serviette", () => {
  const fresh = packPrograms("bodyweight-transition")[0]!;
  const legacy = {
    ...fresh,
    exercises: [
      fresh.exercises[0]!,
      { ...fresh.exercises[1]!, id: "inverted-row", name: "Rowing inversé" },
      ...fresh.exercises.slice(2, 4),
      { ...fresh.exercises[4]!, id: "towel-row", name: "Rowing serviette" },
    ],
  };
  const raw = JSON.parse(JSON.stringify(withPrograms([legacy])));
  const { state } = parseAppState(raw, NOW);
  const ids = state.programs[0]!.exercises.map((exercise) => exercise.id);
  assert.deepEqual(ids, fresh.exercises.map((exercise) => exercise.id));
  assert.equal(ids.includes("inverted-row") || ids.includes("towel-row"), false);
});

test("Aujourd'hui fait tourner les séances du même lieu que la dernière faite", () => {
  const [gymA, gymB] = [SEED_PROGRAMS[0]!, SEED_PROGRAMS[1]!];
  const [homeA, homeB] = [HOME[0]!, HOME[1]!];
  const programs = [gymA, homeA, gymB, homeB];
  assert.equal(nextProgram(programs, null)?.id, gymA.id);
  assert.equal(nextProgram(programs, gymA.id)?.id, gymB.id);
  assert.equal(nextProgram(programs, gymB.id)?.id, gymA.id);
  assert.equal(nextProgram(programs, homeA.id)?.id, homeB.id);
  assert.equal(nextProgram(programs, homeB.id)?.id, homeA.id);
});

test("en circuit, le bouton Repos propose le repos entre les tours", () => {
  const session = start(CIRCUIT_PROGRAM).session!;
  assert.equal(manualRestSeconds(session, 0, 90), 60);
  // Le face pull, en séries classiques, garde son propre repos.
  const facePull = session.exercises[5]!;
  assert.equal(manualRestSeconds(session, 5, 90), facePull.restSeconds);
});

test("le tour se règle depuis l'éditeur, borné aux exercices de la séance", () => {
  let state = withPrograms([SEED_PROGRAMS[0]!]);
  const id = SEED_PROGRAMS[0]!.id;
  state = reducer(state, { type: "program/setCircuit", programId: id, circuit: { size: 99, restSeconds: 70 } });
  assert.deepEqual(state.programs[0]!.circuit, { size: SEED_PROGRAMS[0]!.exercises.length, restSeconds: 70 });
  state = reducer(state, { type: "program/setCircuit", programId: id, circuit: null });
  assert.equal("circuit" in state.programs[0]!, false);
  state = reducer(state, { type: "program/setCircuit", programId: id, circuit: { size: 1, restSeconds: 60 } });
  assert.equal("circuit" in state.programs[0]!, false);
});

test("la fin de séance ne prétend plus recalculer les charges", () => {
  let state = start(SEED_PROGRAMS[0]!);
  for (const entry of state.session!.exercises) {
    for (let setIndex = 0; setIndex < entry.sets.length; setIndex += 1) {
      state = reducer(state, { type: "session/toggleSet", exerciseId: entry.exerciseId, setIndex, now: NOW });
    }
  }
  state = reducer(state, { type: "session/finish", now: NOW + 3_600_000 });
  assert.equal(state.history[0]!.note, "Séance complète — charges gardées pour la prochaine fois.");
});

test("Dos et abdos garde ses cinq exercices quand le rowing à table disparaît", () => {
  const fresh = packPrograms("bodyweight-transition")[2]!;
  const legacy = {
    ...fresh,
    exercises: [{ ...fresh.exercises[4]!, id: "inverted-row" }, ...fresh.exercises.slice(0, 4)],
  };
  const { state } = parseAppState(JSON.parse(JSON.stringify(withPrograms([legacy]))), NOW);
  const ids = state.programs[0]!.exercises.map((exercise) => exercise.id);
  assert.deepEqual([...ids].sort(), fresh.exercises.map((exercise) => exercise.id).sort());
});
