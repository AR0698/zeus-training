import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogTemplate } from "../src/domain/catalog/index.ts";
import { formatLoad, unitLabel } from "../src/domain/format.ts";
import { decideProgression } from "../src/domain/progression.ts";
import { createSession, sessionVolume } from "../src/domain/session.ts";
import { createInitialState } from "../src/domain/seed.ts";
import type { Program, SessionExercise } from "../src/domain/types.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 10, 2, 8, 0, 0);

/** Une séance de pompes inclinées : `reps` par série, effort ressenti au choix. */
function pushUps(reps: number[], effort: SessionExercise["effort"] = "good"): SessionExercise {
  const program: Program = {
    id: "p",
    name: "Test",
    focus: "",
    accent: "acid",
    warmup: "",
    estimatedMinutes: 30,
    exercises: [catalogTemplate("incline-push-up")!],
  };
  const { session } = createSession({ program, now: NOW, id: "s", lastSessionDate: null });
  const entry = session.exercises[0]!;
  return {
    ...entry,
    effort,
    sets: entry.sets.map((set, index) => ({ ...set, reps: reps[index] ?? 0, done: true })),
  };
}

test("les mouvements au poids du corps comptent des répétitions, pas des kilos", () => {
  for (const id of ["push-up", "inverted-row", "bodyweight-squat", "band-face-pull", "towel-row"]) {
    assert.equal(catalogTemplate(id)?.unit, "reps", id);
  }
  // Un mouvement chargé garde ses kilos, un gainage ses secondes.
  assert.equal(catalogTemplate("bench-press")?.unit, "kg");
  assert.equal(catalogTemplate("plank")?.unit, "sec");
});

test("aucun kilo n'est affiché pour le poids du corps", () => {
  assert.equal(unitLabel("reps"), "");
  assert.equal(formatLoad(0, "reps"), "poids du corps");
  assert.ok(!formatLoad(0, "reps").includes("kg"));
});

test("sans charge, le haut de la fourchette annonce une variante plus difficile", () => {
  const decision = decideProgression(pushUps([20, 20, 20]));
  assert.equal(decision.action, "hold");
  assert.match(decision.reason, /variante plus difficile/);
  assert.deepEqual(decision.nextWeights, [0, 0, 0], "aucun kilo ne s'ajoute");
});

test("sans charge, une série sous la fourchette ne déclenche aucun allègement", () => {
  const decision = decideProgression(pushUps([20, 20, 3]));
  assert.equal(decision.action, "hold");
  assert.deepEqual(decision.nextWeights, [0, 0, 0]);
});

test("le poids du corps ne compte ni tonnage ni kilos de volume", () => {
  const entry = pushUps([20, 20, 20]);
  const { session } = createSession({
    program: {
      id: "p",
      name: "T",
      focus: "",
      accent: "acid",
      warmup: "",
      estimatedMinutes: 30,
      exercises: [catalogTemplate("incline-push-up")!],
    },
    now: NOW,
    id: "s",
    lastSessionDate: null,
  });
  assert.equal(sessionVolume({ ...session, exercises: [entry] }), 0);
});

test("un ancien programme enregistré en kilos à 0 kg passe au poids du corps", () => {
  const stored = {
    ...createInitialState(NOW),
    onboardedAt: NOW,
    programs: [
      {
        id: "p",
        name: "Ancien",
        focus: "",
        accent: "acid",
        warmup: "",
        estimatedMinutes: 30,
        exercises: [
          { ...catalogTemplate("push-up")!, unit: "kg" },
          { ...catalogTemplate("bench-press")!, unit: "kg" },
          // Un sac à dos lesté saisi à la main garde ses kilos.
          { ...catalogTemplate("dips")!, unit: "kg", targetWeights: [5, 5, 5], lastWeights: [5, 5, 5] },
        ],
      },
    ],
  };
  const { state } = parseAppState(JSON.parse(JSON.stringify(stored)), NOW);
  const [pushUp, bench, dips] = state.programs[0]!.exercises;
  assert.equal(pushUp!.unit, "reps");
  assert.equal(bench!.unit, "kg");
  assert.equal(dips!.unit, "kg");
  assert.deepEqual(dips!.targetWeights, [5, 5, 5]);
});
