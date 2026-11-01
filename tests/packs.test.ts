import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogEntry, catalogTemplate } from "../src/domain/catalog/index.ts";
import { addPack, hasPack, PACKS, packPrograms } from "../src/domain/packs.ts";
import { createInitialState, examplePrograms } from "../src/domain/seed.ts";
import { createSession } from "../src/domain/session.ts";
import type { AppState } from "../src/domain/types.ts";
import { reducer } from "../src/state/reducer.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 10, 2, 8, 0, 0);

function installed(): AppState {
  return { ...createInitialState(NOW), onboardedAt: NOW };
}

test("chaque paquet compte quatre séances entièrement résolues depuis le catalogue", () => {
  for (const pack of PACKS) {
    assert.equal(pack.programs.length, 4, pack.id);
    for (const program of pack.programs) {
      assert.ok(program.exercises.length >= 5, `${program.id} a perdu des exercices`);
      for (const exercise of program.exercises) {
        assert.ok(catalogTemplate(exercise.id), `${exercise.id} absent du catalogue`);
      }
    }
  }
});

test("un identifiant n'apparaît qu'une fois par séance et par paquet", () => {
  const programIds = PACKS.flatMap((pack) => pack.programs.map((program) => program.id));
  assert.equal(new Set(programIds).size, programIds.length);
  for (const pack of PACKS) {
    for (const program of pack.programs) {
      const ids = program.exercises.map((exercise) => exercise.id);
      assert.equal(new Set(ids).size, ids.length, `${program.id} répète un exercice`);
    }
  }
});

test("les séries, charges et fourchettes de chaque exercice sont cohérentes", () => {
  for (const pack of PACKS) {
    for (const program of pack.programs) {
      for (const exercise of program.exercises) {
        const where = `${program.id}/${exercise.id}`;
        assert.equal(exercise.targetWeights.length, exercise.sets, where);
        assert.equal(exercise.lastWeights.length, exercise.sets, where);
        assert.ok(exercise.repMax >= exercise.repMin, where);
        assert.ok(exercise.restSeconds > 0, where);
        if (exercise.unit === "sec") {
          // Le chrono doit démarrer dans la fourchette, pas au-dessus.
          for (const seconds of exercise.targetWeights) {
            assert.ok(seconds >= exercise.repMin && seconds <= exercise.repMax, where);
          }
        } else {
          // Poids du corps : aucune charge, donc aucun kilo à afficher ni à régler.
          assert.equal(exercise.unit, "reps", `${where} : devrait compter des répétitions`);
          assert.deepEqual(exercise.targetWeights, exercise.targetWeights.map(() => 0), where);
        }
      }
    }
  }
});

test("le paquet principal tire au moins autant qu'il pousse", () => {
  // C'est la lacune n°1 du programme d'origine : 6 séries de tirage pour 12 de poussée.
  const main = PACKS.find((pack) => pack.id === "bodyweight")!;
  const pulling = new Set(["band-assisted-pull-up", "chin-up", "inverted-row", "band-face-pull"]);
  const pushing = new Set(["push-up", "diamond-push-up", "pike-push-up", "decline-push-up"]);
  let pull = 0;
  let push = 0;
  for (const exercise of main.programs.flatMap((program) => program.exercises)) {
    if (pulling.has(exercise.id)) pull += exercise.sets;
    if (pushing.has(exercise.id)) push += exercise.sets;
  }
  assert.ok(pull >= 18, `seulement ${pull} séries de tirage`);
  assert.ok(pull >= push, `${pull} séries de tirage contre ${push} de poussée`);
});

test("le paquet de transition ne demande aucun matériel d'achat", () => {
  const transition = packPrograms("bodyweight-transition");
  const ids = transition.flatMap((program) => program.exercises.map((exercise) => exercise.id));
  for (const forbidden of ["pull-up", "chin-up", "band-assisted-pull-up", "band-face-pull", "hanging-leg-raise"]) {
    assert.ok(!ids.includes(forbidden), `${forbidden} suppose une barre ou un élastique`);
  }
});

test("addPack ajoute les séances à la suite des siennes", () => {
  const mine = { ...installed(), programs: examplePrograms() };
  const next = addPack(mine, "bodyweight-transition");
  assert.equal(next.programs.length, 8);
  assert.deepEqual(
    next.programs.slice(0, 4).map((program) => program.id),
    mine.programs.map((program) => program.id),
  );
  assert.ok(hasPack(next, "bodyweight-transition"));
  assert.ok(!hasPack(next, "bodyweight"));
});

test("addPack est idempotent et ne réécrit jamais une séance modifiée", () => {
  let state = reducer(installed(), { type: "program/addPack", packId: "bodyweight" });
  state = reducer(state, {
    type: "program/update",
    programId: "bw-main-1",
    patch: { name: "Mon haut du corps" },
  });
  const again = reducer(state, { type: "program/addPack", packId: "bodyweight" });
  assert.equal(again.programs.length, 4);
  assert.equal(again.programs[0]!.name, "Mon haut du corps");
});

test("les séances ajoutées ne partagent pas leurs objets avec le paquet", () => {
  const state = addPack(installed(), "bodyweight-transition");
  state.programs[0]!.exercises[0]!.targetWeights[0] = 99;
  assert.equal(packPrograms("bodyweight-transition")[0]!.exercises[0]!.targetWeights[0], 0);
});

test("une séance de paquet démarre, se valide et survit à un aller-retour disque", () => {
  let state = addPack(installed(), "bodyweight");
  const program = state.programs[0]!;
  const { session } = createSession({ program, now: NOW, id: "s1", lastSessionDate: null });
  assert.equal(session.exercises.length, program.exercises.length);

  state = reducer(state, { type: "session/start", program, now: NOW, id: "s1" });
  const first = state.session!.exercises[0]!;
  state = reducer(state, { type: "session/toggleSet", exerciseId: first.exerciseId, setIndex: 0, now: NOW });
  assert.equal(state.session!.exercises[0]!.sets[0]!.done, true);

  const parsed = parseAppState(JSON.parse(JSON.stringify(state)), NOW);
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.state.programs.length, 4);
});

test("chaque mouvement des paquets a une démonstration à regarder", () => {
  // Le but des paquets : quelqu'un qui n'a jamais fait le geste doit pouvoir le voir.
  for (const pack of PACKS) {
    for (const program of pack.programs) {
      for (const exercise of program.exercises) {
        assert.ok(exercise.videoUrl.startsWith("https://"), `${exercise.id} n'a pas de démonstration`);
      }
    }
  }
});

test("Sport hôtel n'emploie aucun accessoire, ni dans ses fiches ni dans ses consignes", () => {
  // Le sol et un mur, rien d'autre : ni table, ni chaise, ni serviette.
  const interdits = /barre|banc|élastique|elastique|haltère|halter|sangle|anneau|trx|lest|sac à dos|bouteille|kettlebell|poulie|machine|\btable|chaise|serviette|glisse|slider|canapé/i;
  const ids = packPrograms("bodyweight-transition").flatMap((program) => program.exercises.map((e) => e.id));
  for (const forbidden of ["inverted-row", "towel-row", "slider-leg-curl", "bodyweight-bulgarian-split-squat"]) {
    assert.ok(!ids.includes(forbidden), `${forbidden} demande une table, une serviette ou une chaise`);
  }
  for (const program of packPrograms("bodyweight-transition")) {
    assert.doesNotMatch(program.warmup, interdits, `${program.id} : échauffement`);
    for (const exercise of program.exercises) {
      const where = `${program.id}/${exercise.id}`;
      assert.equal(catalogEntry(exercise.id)?.equipment, "poids-du-corps", `${where} : matériel du catalogue`);
      assert.doesNotMatch(exercise.cue, interdits, `${where} : consigne`);
      assert.doesNotMatch(exercise.tip, interdits, `${where} : conseil`);
    }
  }
});
