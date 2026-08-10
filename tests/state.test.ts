import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState, examplePrograms, SEED_PROGRAMS } from "../src/domain/seed.ts";
import { createSession } from "../src/domain/session.ts";
import type { AppState } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";
import { CURRENT_VERSION, parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 7, 10, 10, 0, 0);

/** L'état d'une personne installée : accueil passé, séances d'exemple chargées. */
function installed(): AppState {
  return { ...createInitialState(NOW), onboardedAt: NOW, programs: examplePrograms() };
}

function started(): AppState {
  const state = installed();
  return reducer(state, {
    type: "session/start",
    program: SEED_PROGRAMS[0]!,
    now: NOW,
    id: "s1",
  });
}

test("validating every set of an exercise marks it done and moves focus on", () => {
  let state = started();
  const first = state.session!.exercises[0]!;
  for (let index = 0; index < first.sets.length; index += 1) {
    state = reducer(state, {
      type: "session/toggleSet",
      exerciseId: first.exerciseId,
      setIndex: index,
      now: NOW,
    });
  }
  assert.equal(state.session!.exercises[0]!.status, "done");
  assert.equal(state.session!.currentIndex, 1);
});

test("un-validating a set reopens the exercise", () => {
  let state = started();
  const first = state.session!.exercises[0]!;
  for (let index = 0; index < first.sets.length; index += 1) {
    state = reducer(state, { type: "session/toggleSet", exerciseId: first.exerciseId, setIndex: index, now: NOW });
  }
  state = reducer(state, { type: "session/toggleSet", exerciseId: first.exerciseId, setIndex: 0, now: NOW });
  assert.equal(state.session!.exercises[0]!.status, "pending");
});

test("adjusting a load never goes negative and stays on the half kilo", () => {
  let state = started();
  const id = state.session!.exercises[0]!.exerciseId;
  state = reducer(state, { type: "session/adjust", exerciseId: id, setIndex: 0, field: "weight", delta: -1000 });
  assert.equal(state.session!.exercises[0]!.sets[0]!.weight, 0);

  state = reducer(state, { type: "session/setValue", exerciseId: id, setIndex: 0, field: "weight", value: 22.3 });
  assert.equal(state.session!.exercises[0]!.sets[0]!.weight, 22.5);
});

test("skipping focuses the next pending exercise and keeps the log", () => {
  let state = started();
  const id = state.session!.exercises[0]!.exerciseId;
  state = reducer(state, { type: "session/skip", exerciseId: id });
  assert.equal(state.session!.exercises[0]!.status, "skipped");
  assert.equal(state.session!.currentIndex, 1);

  state = reducer(state, { type: "session/resume", exerciseId: id });
  assert.equal(state.session!.exercises[0]!.status, "pending");
});

test("replacing a movement keeps the sets already logged", () => {
  let state = started();
  const id = state.session!.exercises[0]!.exerciseId;
  state = reducer(state, { type: "session/toggleSet", exerciseId: id, setIndex: 0, now: NOW });
  state = reducer(state, { type: "session/replace", exerciseId: id, alternative: "Pompes" });
  assert.equal(state.session!.exercises[0]!.replacedBy, "Pompes");
  assert.equal(state.session!.exercises[0]!.sets[0]!.done, true);
});

test("only a complete session advances the Upper/Lower rotation", () => {
  let state = started();
  const partial = reducer(state, { type: "session/finish", now: NOW + 3_600_000 });
  assert.equal(partial.lastCompletedProgramId, null);
  assert.equal(partial.history.length, 1);
  assert.equal(partial.session, null);

  state = started();
  for (const entry of state.session!.exercises) {
    for (let index = 0; index < entry.sets.length; index += 1) {
      state = reducer(state, { type: "session/toggleSet", exerciseId: entry.exerciseId, setIndex: index, now: NOW });
    }
  }
  const complete = reducer(state, { type: "session/finish", now: NOW + 3_600_000 });
  assert.equal(complete.lastCompletedProgramId, "upper-a");
});

test("editing a program target is clamped and rounded", () => {
  const state = installed();
  const next = reducer(state, {
    type: "program/setTarget",
    programId: "upper-a",
    exerciseId: "chest-press",
    setIndex: 0,
    value: -12,
  });
  assert.equal(next.programs[0]!.exercises[0]!.targetWeights[0], 0);
});

test("parsing survives complete garbage", () => {
  for (const input of [null, 42, "nope", [], { random: true }]) {
    const parsed = parseAppState(input, NOW);
    assert.equal(parsed.state.version, CURRENT_VERSION);
    assert.equal(parsed.state.session, null);
    // Une entrée illisible n'est pas une raison de servir les séances de
    // quelqu'un d'autre : c'est l'écran de bienvenue qui posera la question.
    assert.deepEqual(parsed.state.programs, []);
    assert.equal(parsed.state.onboardedAt, null);
  }
});

test("des programmes présents mais illisibles sont remplacés par les exemples, avec un message", () => {
  const parsed = parseAppState({ version: 2, programs: "cassé", history: [] }, NOW);
  assert.equal(parsed.state.programs.length, SEED_PROGRAMS.length);
  assert.ok(parsed.issues.some((issue) => issue.includes("exemple")));
});

test("parsing repairs a partially corrupted state instead of throwing", () => {
  const parsed = parseAppState(
    {
      version: 1,
      programs: [{ id: "upper-a", exercises: [{ id: "chest-press", targetWeights: ["x", 40, null] }] }],
      history: [{ date: "pas une date" }, { id: "ok", date: NOW, volume: 100 }],
      settings: { theme: "neon", defaultRestSeconds: 99999 },
      records: { "chest-press": { weight: "lourd" } },
    },
    NOW,
  );

  const exercise = parsed.state.programs[0]!.exercises[0]!;
  assert.equal(exercise.targetWeights.length, exercise.sets);
  assert.ok(exercise.targetWeights.every((weight) => Number.isFinite(weight)));
  assert.equal(parsed.state.history.length, 1, "entries without a usable date are dropped");
  assert.equal(parsed.state.settings.theme, "auto");
  assert.equal(parsed.state.settings.defaultRestSeconds, 600);
  assert.equal(parsed.state.records["chest-press"]!.weight, 0);
});

test("a backup from the Cloudflare version is migrated", () => {
  const legacy = {
    lastProgramId: "upper-a",
    programs: [
      {
        id: "upper-a",
        name: "Haut du corps A",
        duration: 58,
        exercises: [
          {
            id: "chest-press",
            name: "Chest Press",
            shortName: "Chest Press",
            category: "upper",
            sets: 3,
            minReps: 12,
            maxReps: 15,
            suggestedWeights: [25, 35, 45],
            lastWeights: [25, 35, 45],
            mediaUrl: "https://example.test",
          },
        ],
      },
    ],
    history: [
      {
        id: "hist-1",
        date: "2026-08-04T18:30:00.000Z",
        programId: "upper-a",
        programName: "Haut du corps A",
        duration: 57,
        completed: 6,
        total: 6,
        volume: 6420,
        note: "Séance complète",
      },
    ],
    activeWorkout: null,
  };

  const parsed = parseAppState(legacy, NOW);
  assert.equal(parsed.fresh, false);
  assert.equal(parsed.state.lastCompletedProgramId, "upper-a");
  assert.deepEqual(parsed.state.programs[0]!.exercises[0]!.targetWeights, [25, 35, 45]);
  assert.equal(parsed.state.history.length, 1);
  assert.equal(parsed.state.history[0]!.durationMinutes, 57);
  assert.equal(parsed.state.history[0]!.date, Date.parse("2026-08-04T18:30:00.000Z"));
});

test("a session snapshot survives a round trip through storage", () => {
  const state = started();
  const parsed = parseAppState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(parsed.state.session?.exercises.length, state.session!.exercises.length);
  assert.equal(parsed.state.session?.programId, "upper-a");
});

test("createSession and the reducer agree on the exercise list", () => {
  const direct = createSession({ program: SEED_PROGRAMS[0]!, now: NOW, id: "x", lastSessionDate: null });
  const viaReducer = started();
  assert.deepEqual(
    viaReducer.session!.exercises.map((entry) => entry.exerciseId),
    direct.session.exercises.map((entry) => entry.exerciseId),
  );
});
