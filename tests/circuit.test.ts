import assert from "node:assert/strict";
import { test } from "node:test";
import { circuitPosition, circuitSummary, restAfterValidation } from "../src/domain/circuit.ts";
import { packPrograms } from "../src/domain/packs.ts";
import { SEED_PROGRAMS, createInitialState } from "../src/domain/seed.ts";
import { createSession } from "../src/domain/session.ts";
import type { AppState, Program, Session } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 10, 1, 10, 0, 0);
const REST = { autoRest: true, defaultRestSeconds: 90 };

/** Séance 1 du paquet principal : 5 exercices en 3 tours, puis le face pull en séries. */
const CIRCUIT_PROGRAM = packPrograms("bodyweight").find((program) => program.id === "bw-main-1")!;

function start(program: Program): AppState {
  const state = { ...createInitialState(NOW), onboardedAt: NOW, programs: [program] };
  return reducer(state, { type: "session/start", program, now: NOW, id: "s1" });
}

function validate(state: AppState, index: number): AppState {
  const entry = state.session!.exercises[index]!;
  const setIndex = entry.sets.findIndex((set) => !set.done);
  return reducer(state, { type: "session/toggleSet", exerciseId: entry.exerciseId, setIndex, now: NOW });
}

/** Valide la première série non faite de l'exercice qui a la mise au point. */
function validateCurrent(state: AppState): AppState {
  return validate(state, state.session!.currentIndex);
}

function rest(session: Session, index: number) {
  const entry = session.exercises[index]!;
  const setIndex = entry.sets.findIndex((set) => !set.done);
  return restAfterValidation(session, entry.exerciseId, setIndex, REST);
}

test("le programme décrit son circuit : 5 exercices en tours, repos entre les tours", () => {
  assert.deepEqual(CIRCUIT_PROGRAM.circuit, { size: 5, restSeconds: 60 });
  assert.equal(circuitSummary(CIRCUIT_PROGRAM), "3 tours · repos 60 s");
});

test("une séance sans circuit n'affiche aucun résumé de tours", () => {
  assert.equal(circuitSummary(SEED_PROGRAMS[0]!), null);
});

test("la séance garde une copie du circuit, bornée au nombre d'exercices", () => {
  const session = start(CIRCUIT_PROGRAM).session!;
  assert.deepEqual(session.circuit, { size: 5, restSeconds: 60 });

  const tooBig = { ...CIRCUIT_PROGRAM, circuit: { size: 40, restSeconds: 60 } };
  const clamped = createSession({ program: tooBig, now: NOW, id: "s2", lastSessionDate: null });
  assert.equal(clamped.session.circuit?.size, CIRCUIT_PROGRAM.exercises.length);
});

test("un circuit d'un seul exercice n'en est pas un", () => {
  const single = { ...CIRCUIT_PROGRAM, circuit: { size: 1, restSeconds: 60 } };
  const { session } = createSession({ program: single, now: NOW, id: "s3", lastSessionDate: null });
  assert.equal(session.circuit, undefined);
});

test("en circuit, chaque série validée passe à l'exercice suivant du tour", () => {
  let state = start(CIRCUIT_PROGRAM);
  const visited: number[] = [];
  for (let step = 0; step < 5; step += 1) {
    visited.push(state.session!.currentIndex);
    state = validateCurrent(state);
  }
  assert.deepEqual(visited, [0, 1, 2, 3, 4]);
  // Fin du tour 1 : retour au premier exercice pour le tour 2.
  assert.equal(state.session!.currentIndex, 0);
  assert.equal(state.session!.exercises[0]!.sets.filter((set) => set.done).length, 1);
});

test("après le dernier tour, la mise au point tombe sur les séries classiques", () => {
  let state = start(CIRCUIT_PROGRAM);
  for (let step = 0; step < 15; step += 1) state = validateCurrent(state);
  const session = state.session!;
  assert.equal(session.exercises.slice(0, 5).every((entry) => entry.status === "done"), true);
  assert.equal(session.currentIndex, 5);
  assert.equal(session.exercises[5]!.exerciseId, "band-face-pull");
});

test("un exercice passé est sauté dans les tours suivants", () => {
  let state = start(CIRCUIT_PROGRAM);
  const skipped = state.session!.exercises[2]!.exerciseId;
  state = reducer(state, { type: "session/skip", exerciseId: skipped });
  state = reducer(state, { type: "session/focus", exerciseId: state.session!.exercises[0]!.exerciseId });
  const visited: number[] = [];
  for (let step = 0; step < 5; step += 1) {
    visited.push(state.session!.currentIndex);
    state = validateCurrent(state);
  }
  assert.deepEqual(visited, [0, 1, 3, 4, 0]);
});

test("les séries classiques après le circuit gardent leur enchaînement habituel", () => {
  let state = start(CIRCUIT_PROGRAM);
  for (let step = 0; step < 15; step += 1) state = validateCurrent(state);
  state = validateCurrent(state);
  // Une série de face pull sur deux : la mise au point reste dessus.
  assert.equal(state.session!.currentIndex, 5);
});

test("pas de repos entre deux exercices d'un tour", () => {
  const session = start(CIRCUIT_PROGRAM).session!;
  assert.deepEqual(rest(session, 0), { kind: "stop" });
});

test("repos du circuit après le dernier exercice du tour", () => {
  let state = start(CIRCUIT_PROGRAM);
  for (let step = 0; step < 4; step += 1) state = validateCurrent(state);
  assert.equal(state.session!.currentIndex, 4);
  assert.deepEqual(rest(state.session!, 4), { kind: "start", seconds: 60 });
});

test("aucun repos après le dernier tour", () => {
  let state = start(CIRCUIT_PROGRAM);
  for (let step = 0; step < 14; step += 1) state = validateCurrent(state);
  assert.equal(state.session!.currentIndex, 4);
  assert.deepEqual(rest(state.session!, 4), { kind: "stop" });
});

test("repos automatique coupé : rien ne démarre, même en fin de tour", () => {
  let state = start(CIRCUIT_PROGRAM);
  for (let step = 0; step < 4; step += 1) state = validateCurrent(state);
  const entry = state.session!.exercises[4]!;
  const decision = restAfterValidation(state.session!, entry.exerciseId, 0, { ...REST, autoRest: false });
  assert.deepEqual(decision, { kind: "none" });
});

test("hors circuit, le repos suit l'exercice et s'arrête après la dernière série", () => {
  const session = start(SEED_PROGRAMS[0]!).session!;
  const first = session.exercises[0]!;
  const expected = first.restSeconds > 0 ? first.restSeconds : REST.defaultRestSeconds;
  assert.deepEqual(rest(session, 0), { kind: "start", seconds: expected });
  const last = first.sets.length - 1;
  assert.deepEqual(restAfterValidation(session, first.exerciseId, last, REST), { kind: "stop" });
  assert.deepEqual(
    restAfterValidation(session, first.exerciseId, 0, { ...REST, autoRest: false }),
    { kind: "none" },
  );
});

test("annuler une série ne touche pas au repos", () => {
  const state = validate(start(CIRCUIT_PROGRAM), 0);
  const entry = state.session!.exercises[0]!;
  assert.deepEqual(restAfterValidation(state.session!, entry.exerciseId, 0, REST), { kind: "none" });
});

test("la carte annonce le tour et la place dans le tour", () => {
  let state = start(CIRCUIT_PROGRAM);
  assert.deepEqual(circuitPosition(state.session!, 0), { round: 1, rounds: 3, step: 1, steps: 5 });
  for (let step = 0; step < 7; step += 1) state = validateCurrent(state);
  assert.deepEqual(circuitPosition(state.session!, state.session!.currentIndex), {
    round: 2,
    rounds: 3,
    step: 3,
    steps: 5,
  });
  assert.equal(circuitPosition(state.session!, 5), null);
});

test("une séance en circuit reprend au même endroit après rechargement", () => {
  let state = start(CIRCUIT_PROGRAM);
  for (let step = 0; step < 7; step += 1) state = validateCurrent(state);
  const { state: reloaded, issues } = parseAppState(JSON.parse(JSON.stringify(state)), NOW);
  assert.deepEqual(issues, []);
  assert.deepEqual(reloaded.session, state.session);
  assert.deepEqual(reloaded.programs, state.programs);
  // Et l'enchaînement continue comme avant le rechargement.
  const next = validateCurrent(reloaded);
  assert.equal(next.session!.currentIndex, 3);
});

test("un circuit illisible ou trop court est ignoré à la lecture", () => {
  const raw = JSON.parse(JSON.stringify(start(CIRCUIT_PROGRAM)));
  raw.programs[0].circuit = { size: "cinq", restSeconds: 60 };
  raw.session.circuit = { size: 1, restSeconds: 60 };
  const { state: parsed } = parseAppState(raw, NOW);
  assert.equal(parsed.programs[0]!.circuit, undefined);
  assert.equal(parsed.session!.circuit, undefined);
});

test("une sauvegarde d'avant les circuits se lit sans rien changer", () => {
  const raw = JSON.parse(JSON.stringify(start(SEED_PROGRAMS[0]!)));
  assert.equal("circuit" in raw.programs[0], false);
  assert.equal("circuit" in raw.session, false);
  const { state: parsed, issues } = parseAppState(raw, NOW);
  assert.deepEqual(issues, []);
  assert.equal(parsed.programs[0]!.circuit, undefined);
  assert.equal(parsed.session!.circuit, undefined);
  // Exercice par exercice, comme avant.
  const next = validate(parsed, 0);
  assert.equal(next.session!.currentIndex, 0);
});

test("chaque séance des paquets a son circuit, et ses exercices ont 3 tours", () => {
  const expected: Record<string, [number, number]> = {
    "bw-transition-1": [5, 60],
    "bw-transition-2": [5, 75],
    "bw-transition-3": [5, 60],
    "bw-transition-4": [5, 75],
    "bw-main-1": [5, 60],
    "bw-main-2": [5, 75],
    "bw-main-3": [5, 60],
    "bw-main-4": [6, 75],
  };
  const programs = [...packPrograms("bodyweight-transition"), ...packPrograms("bodyweight")];
  for (const program of programs) {
    const [size, restSeconds] = expected[program.id]!;
    assert.deepEqual(program.circuit, { size, restSeconds }, program.id);
    for (const exercise of program.exercises.slice(0, size)) {
      assert.equal(exercise.sets, 3, `${program.id} · ${exercise.id}`);
    }
  }
});
