import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BACKUP_INTERVAL_DAYS,
  BACKUP_SNOOZE_DAYS,
  daysSinceBackup,
  shouldPromptBackup,
} from "../src/domain/reminder.ts";
import { createInitialState, examplePrograms } from "../src/domain/seed.ts";
import type { AppState, HistoryEntry } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";

const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);
const DAY = 86_400_000;
const days = (count: number) => count * DAY;

function session(date: number): HistoryEntry {
  return {
    id: `h-${date}`,
    date,
    programId: "upper-a",
    programName: "Haut du corps A",
    durationMinutes: 55,
    completedExercises: 6,
    totalExercises: 6,
    completedSets: 18,
    volume: 4200,
    note: "",
    personalRecords: [],
  };
}

/** Une personne installée depuis `age` jours, avec une séance enregistrée. */
function installed(age: number): AppState {
  return {
    ...createInitialState(NOW - days(age)),
    onboardedAt: NOW - days(age),
    programs: examplePrograms(),
    history: [session(NOW - days(age) + 1)],
  };
}

test("rien à perdre, pas de rappel", () => {
  const fresh: AppState = { ...createInitialState(NOW - days(200)), onboardedAt: NOW - days(200) };
  assert.equal(shouldPromptBackup(fresh, NOW), false);
});

test("pas de rappel avant que l'accueil soit passé", () => {
  const state: AppState = { ...installed(200), onboardedAt: null };
  assert.equal(shouldPromptBackup(state, NOW), false);
});

test("le premier rappel arrive un mois après l'installation", () => {
  const state = installed(BACKUP_INTERVAL_DAYS);
  assert.equal(shouldPromptBackup(state, NOW - days(1)), false);
  assert.equal(shouldPromptBackup(state, NOW), true);
});

test("un export remet le compteur à un mois", () => {
  const due = installed(60);
  assert.equal(shouldPromptBackup(due, NOW), true);

  const exported = reducer(due, { type: "backup/exported", now: NOW });
  assert.equal(exported.lastBackupAt, NOW);
  assert.equal(shouldPromptBackup(exported, NOW), false);
  assert.equal(shouldPromptBackup(exported, NOW + days(BACKUP_INTERVAL_DAYS - 1)), false);
  assert.equal(shouldPromptBackup(exported, NOW + days(BACKUP_INTERVAL_DAYS)), true);
});

test("« plus tard » reporte d'une semaine, pas d'un mois", () => {
  const due = installed(60);
  const snoozed = reducer(due, { type: "backup/snooze", now: NOW });
  assert.equal(shouldPromptBackup(snoozed, NOW), false);
  assert.equal(shouldPromptBackup(snoozed, NOW + days(BACKUP_SNOOZE_DAYS - 1)), false);
  assert.equal(shouldPromptBackup(snoozed, NOW + days(BACKUP_SNOOZE_DAYS)), true);
});

test("un export après un report efface le report", () => {
  // Sinon le rappel reviendrait au bout des sept jours restants, alors que la
  // sauvegarde vient d'être faite.
  const snoozed = reducer(installed(60), { type: "backup/snooze", now: NOW });
  const exported = reducer(snoozed, { type: "backup/exported", now: NOW + days(1) });
  assert.equal(exported.backupPromptedAt, null);
  assert.equal(shouldPromptBackup(exported, NOW + days(BACKUP_SNOOZE_DAYS + 2)), false);
});

test("l'âge de la sauvegarde s'affiche honnêtement", () => {
  const state = installed(60);
  assert.equal(daysSinceBackup(state, NOW), null, "jamais sauvegardé se dit, ne s'invente pas");

  const exported = reducer(state, { type: "backup/exported", now: NOW - days(3) });
  assert.equal(daysSinceBackup(exported, NOW), 3);
  assert.equal(daysSinceBackup(exported, NOW - days(4)), 0, "jamais de nombre négatif");
});

test("un programme composé sans aucune séance vaut déjà la peine d'être sauvegardé", () => {
  const state: AppState = {
    ...createInitialState(NOW - days(40)),
    onboardedAt: NOW - days(40),
    programs: examplePrograms(),
  };
  assert.equal(shouldPromptBackup(state, NOW), true);
});
