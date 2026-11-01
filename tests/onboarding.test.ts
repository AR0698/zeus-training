import assert from "node:assert/strict";
import { test } from "node:test";
import { completeOnboarding, isOnboarded, markOnboarded } from "../src/domain/onboarding.ts";
import { createInitialState, SEED_PROGRAMS } from "../src/domain/seed.ts";
import type { AppState } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);

test("une installation neuve ne contient le programme de personne", () => {
  const state = createInitialState(NOW);
  assert.deepEqual(state.programs, []);
  assert.equal(state.history.length, 0);
  assert.equal(state.onboardedAt, null);
  assert.equal(isOnboarded(state), false);
});

test("choisir la page blanche n'ajoute aucune séance", () => {
  const state = completeOnboarding(createInitialState(NOW), {
    now: NOW,
    starter: "blank",
    displayName: "  Alex  ",
  });
  assert.deepEqual(state.programs, []);
  assert.equal(state.onboardedAt, NOW);
  assert.equal(state.settings.displayName, "Alex");
});

test("choisir les exemples charge une copie modifiable", () => {
  const state = completeOnboarding(createInitialState(NOW), {
    now: NOW,
    starter: "examples",
    displayName: "",
  });
  assert.equal(state.programs.length, SEED_PROGRAMS.length);
  assert.notEqual(state.programs[0], SEED_PROGRAMS[0], "les exemples sont clonés, pas partagés");

  const renamed = reducer(state, {
    type: "program/update",
    programId: "upper-a",
    patch: { name: "Ma séance" },
  });
  assert.equal(renamed.programs[0]?.name, "Ma séance");
  assert.equal(SEED_PROGRAMS[0]?.name, "Haut du corps A", "la source reste intacte");
});

test("choisir le poids du corps charge la transition sans matériel", () => {
  const state = completeOnboarding(createInitialState(NOW), {
    now: NOW,
    starter: "bodyweight",
    displayName: "",
  });
  assert.deepEqual(
    state.programs.map((program) => program.id),
    ["bw-transition-1", "bw-transition-2", "bw-transition-3", "bw-transition-4"],
  );
  assert.equal(state.onboardedAt, NOW);
});

test("l'accueil ne se repose pas au rechargement", () => {
  const state = reducer(createInitialState(NOW), {
    type: "onboarding/finish",
    choice: { now: NOW, starter: "examples", displayName: "Alex" },
  });
  const parsed = parseAppState(JSON.parse(JSON.stringify(state)), NOW + 86_400_000);
  assert.equal(parsed.state.onboardedAt, NOW);
});

test("une sauvegarde v1 existante ne repasse pas par l'accueil", () => {
  // Le cas de la personne qui utilise déjà l'app : son enregistrement n'a pas
  // de champ `onboardedAt`, et lui présenter l'écran de bienvenue serait absurde.
  const legacy = {
    version: 1,
    createdAt: NOW - 1_000_000,
    programs: [{ id: "upper-a", name: "Haut du corps A", exercises: [{ id: "chest-press" }] }],
    history: [{ id: "h1", date: NOW - 500_000 }],
    settings: {},
  };
  const parsed = parseAppState(legacy, NOW);
  assert.equal(parsed.state.onboardedAt, NOW - 1_000_000);
  assert.equal(isOnboarded(parsed.state), true);
});

test("une sauvegarde vide, elle, redemande le choix", () => {
  const parsed = parseAppState({ version: 1, programs: [], history: [] }, NOW);
  assert.equal(parsed.state.onboardedAt, null);
});

test("importer une sauvegarde vaut réponse à l'accueil", () => {
  const imported: AppState = { ...createInitialState(NOW), onboardedAt: null };
  assert.equal(markOnboarded(imported, NOW).onboardedAt, NOW);
  // Et n'écrase pas une date déjà posée.
  const already: AppState = { ...imported, onboardedAt: 1 };
  assert.equal(markOnboarded(already, NOW).onboardedAt, 1);
});

test("réinitialiser ramène à l'état d'une installation neuve", () => {
  const state = completeOnboarding(createInitialState(NOW), {
    now: NOW,
    starter: "examples",
    displayName: "Alex",
  });
  const reset = reducer(state, { type: "state/reset", now: NOW + 10 });
  assert.deepEqual(reset.programs, []);
  assert.equal(reset.onboardedAt, null);
});
