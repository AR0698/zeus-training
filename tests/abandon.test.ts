import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState, examplePrograms, SEED_PROGRAMS } from "../src/domain/seed.ts";
import type { AppState } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);

function installed(): AppState {
  return { ...createInitialState(NOW), onboardedAt: NOW, programs: examplePrograms() };
}

/** Une séance démarrée, avec une première série déjà validée. */
function inProgress(): AppState {
  const state = reducer(installed(), {
    type: "session/start",
    program: SEED_PROGRAMS[0]!,
    now: NOW,
    id: "s1",
  });
  const first = state.session!.exercises[0]!;
  return reducer(state, {
    type: "session/toggleSet",
    exerciseId: first.exerciseId,
    setIndex: 0,
    now: NOW,
  });
}

test("abandonner met la séance de côté au lieu de l'effacer", () => {
  const before = inProgress();
  const after = reducer(before, { type: "session/abandon" });
  assert.equal(after.session, null);
  assert.deepEqual(after.abandonedSession, before.session);
  assert.equal(after.history.length, 0, "rien n'est enregistré dans l'historique");
});

test("une séance abandonnée se reprend telle quelle, séries validées comprises", () => {
  const before = inProgress();
  const restored = reducer(reducer(before, { type: "session/abandon" }), {
    type: "session/restoreAbandoned",
  });
  assert.deepEqual(restored.session, before.session);
  assert.equal(restored.session!.exercises[0]!.sets[0]!.done, true);
  assert.equal(restored.abandonedSession, null);
});

test("démarrer une nouvelle séance efface la séance abandonnée", () => {
  const abandoned = reducer(inProgress(), { type: "session/abandon" });
  const next = reducer(abandoned, {
    type: "session/start",
    program: SEED_PROGRAMS[1]!,
    now: NOW + 60_000,
    id: "s2",
  });
  assert.equal(next.abandonedSession, null);
  assert.equal(next.session!.id, "s2");
});

test("reprendre ne remplace jamais une séance en cours", () => {
  const abandoned = reducer(inProgress(), { type: "session/abandon" });
  // Une séance en cours à côté d'une abandonnée ne naît pas du reducer ; on la
  // fabrique pour vérifier la garde.
  const running: AppState = { ...abandoned, session: { ...abandoned.abandonedSession!, id: "s9" } };
  assert.equal(reducer(running, { type: "session/restoreAbandoned" }), running);
});

test("abandonner sans séance en cours garde la précédente séance abandonnée", () => {
  const abandoned = reducer(inProgress(), { type: "session/abandon" });
  assert.equal(reducer(abandoned, { type: "session/abandon" }), abandoned);
});

test("reprendre sans séance abandonnée ne fait rien", () => {
  const state = installed();
  assert.equal(reducer(state, { type: "session/restoreAbandoned" }), state);
});

test("oublier la séance abandonnée la retire", () => {
  const abandoned = reducer(inProgress(), { type: "session/abandon" });
  assert.equal(reducer(abandoned, { type: "session/discardAbandoned" }).abandonedSession, null);
});

test("la séance abandonnée survit à un aller-retour par le stockage", () => {
  const abandoned = reducer(inProgress(), { type: "session/abandon" });
  const parsed = parseAppState(JSON.parse(JSON.stringify(abandoned)), NOW);
  assert.deepEqual(parsed.state.abandonedSession, abandoned.abandonedSession);
  assert.deepEqual(parsed.issues, []);
});

test("des données v2, sans le champ, se lisent sans séance abandonnée ni message", () => {
  const v2 = Object.fromEntries(
    Object.entries({ ...inProgress(), version: 2 }).filter(([key]) => key !== "abandonedSession"),
  );
  const parsed = parseAppState(JSON.parse(JSON.stringify(v2)), NOW);
  assert.equal(parsed.state.abandonedSession, null);
  assert.equal(parsed.state.session?.id, "s1", "la séance en cours est intacte");
  assert.deepEqual(parsed.issues, []);
});

test("une séance abandonnée illisible est écartée avec un message, sans toucher au reste", () => {
  const parsed = parseAppState(
    { ...installed(), abandonedSession: { exercises: "cassé" } },
    NOW,
  );
  assert.equal(parsed.state.abandonedSession, null);
  assert.equal(parsed.state.programs.length, SEED_PROGRAMS.length);
  assert.ok(parsed.issues.some((issue) => issue.includes("abandonnée")));
});
