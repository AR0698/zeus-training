import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState, examplePrograms, SEED_PROGRAMS } from "../src/domain/seed.ts";
import { NOTE_MAX_LENGTH, finishSession, lastExerciseNote } from "../src/domain/session.ts";
import type { AppState, HistoryEntry } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);
const DAY = 86_400_000;

function started(): AppState {
  const state = { ...createInitialState(NOW), onboardedAt: NOW, programs: examplePrograms() };
  return reducer(state, { type: "session/start", program: SEED_PROGRAMS[0]!, now: NOW, id: "s1" });
}

function historyEntry(date: number, notes: HistoryEntry["exerciseNotes"]): HistoryEntry {
  return {
    id: `h-${date}`,
    date,
    programId: "upper-a",
    programName: "Haut du corps A",
    durationMinutes: 50,
    completedExercises: 6,
    totalExercises: 6,
    completedSets: 18,
    volume: 5000,
    note: "Séance complète — cibles recalculées.",
    exerciseNotes: notes,
    personalRecords: [],
  };
}

test("a new session starts every exercise with an empty note", () => {
  const state = started();
  assert.equal(state.session!.exercises.every((entry) => entry.note === ""), true);
});

test("typing a note updates only that exercise, capped in length", () => {
  const state = started();
  const [first, second] = state.session!.exercises;
  const next = reducer(state, {
    type: "session/setNote",
    exerciseId: first!.exerciseId,
    note: "x".repeat(NOTE_MAX_LENGTH + 50),
  });
  assert.equal(next.session!.exercises[0]!.note.length, NOTE_MAX_LENGTH);
  assert.equal(next.session!.exercises[1], second);
});

test("finishing a session keeps the typed notes, trimmed, and drops blank ones", () => {
  let state = started();
  const [first, second, third] = state.session!.exercises;
  state = reducer(state, { type: "session/setNote", exerciseId: first!.exerciseId, note: "  siège cran 4 " });
  state = reducer(state, { type: "session/setNote", exerciseId: second!.exerciseId, note: "   " });
  state = reducer(state, { type: "session/replace", exerciseId: third!.exerciseId, alternative: "Pompes" });
  state = reducer(state, { type: "session/setNote", exerciseId: third!.exerciseId, note: "douleur épaule" });

  const { entry } = finishSession(state.session!, {}, NOW + 3_600_000);
  assert.deepEqual(entry.exerciseNotes, [
    { exerciseId: first!.exerciseId, name: first!.shortName, note: "siège cran 4" },
    { exerciseId: third!.exerciseId, name: "Pompes", note: "douleur épaule" },
  ]);
  // La ligne générée ne mélange pas les notes de l'utilisateur.
  assert.doesNotMatch(entry.note, /siège/);
});

test("the note recalled is the most recent one left on that exercise", () => {
  const history = [
    historyEntry(NOW - DAY, [{ exerciseId: "leg-press", name: "Presse", note: "pieds hauts" }]),
    historyEntry(NOW - 3 * DAY, [{ exerciseId: "chest-press", name: "Chest Press", note: "siège cran 4" }]),
    historyEntry(NOW - 7 * DAY, [{ exerciseId: "chest-press", name: "Chest Press", note: "siège cran 3" }]),
  ];
  assert.deepEqual(lastExerciseNote(history, "chest-press"), { note: "siège cran 4", date: NOW - 3 * DAY });
  assert.equal(lastExerciseNote(history, "row"), null);
  assert.equal(lastExerciseNote([], "chest-press"), null);
});

test("history saved before notes existed loads with no exercise notes", () => {
  const legacy = JSON.parse(JSON.stringify(started())) as Record<string, unknown>;
  const oldEntry = { ...historyEntry(NOW - DAY, []) } as Partial<HistoryEntry>;
  delete oldEntry.exerciseNotes;
  const session = legacy.session as { exercises: Record<string, unknown>[] };
  for (const exercise of session.exercises) delete exercise.note;

  const { state, issues } = parseAppState({ ...legacy, history: [oldEntry] }, NOW);
  assert.deepEqual(issues, []);
  assert.deepEqual(state.history[0]!.exerciseNotes, []);
  assert.equal(state.session!.exercises.every((entry) => entry.note === ""), true);
});

test("damaged notes are dropped one by one, never the whole entry", () => {
  const raw = {
    ...JSON.parse(JSON.stringify(started())),
    history: [
      {
        ...historyEntry(NOW - DAY, []),
        exerciseNotes: [
          { exerciseId: "chest-press", name: "Chest Press", note: "siège cran 4" },
          { exerciseId: "", note: "sans exercice" },
          { exerciseId: "row", note: 42 },
          { exerciseId: "leg-press", note: "  " },
          "n'importe quoi",
          { exerciseId: "dips", note: "y".repeat(NOTE_MAX_LENGTH + 10) },
        ],
      },
    ],
  };
  const { state } = parseAppState(raw, NOW);
  const notes = state.history[0]!.exerciseNotes;
  assert.deepEqual(
    notes.map((item) => item.exerciseId),
    ["chest-press", "dips"],
  );
  assert.equal(notes[1]!.name, "dips");
  assert.equal(notes[1]!.note.length, NOTE_MAX_LENGTH);
});

test("a note typed in a running session survives a round trip through storage", () => {
  let state = started();
  const first = state.session!.exercises[0]!;
  state = reducer(state, { type: "session/setNote", exerciseId: first.exerciseId, note: "siège cran " });
  const { state: reloaded } = parseAppState(JSON.parse(JSON.stringify(state)), NOW);
  // Pas de trim pendant la saisie : l'espace final est celui qu'on vient de taper.
  assert.equal(reloaded.session!.exercises[0]!.note, "siège cran ");
});
