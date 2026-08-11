import assert from "node:assert/strict";
import { test } from "node:test";
import { EXERCISE_CATALOG, catalogTemplate } from "../src/domain/catalog/index.ts";
import {
  EQUIPMENT_LABELS,
  EXERCISE_LIBRARY,
  searchLibrary,
  suggestAlternatives,
} from "../src/domain/library.ts";
import { SEED_PROGRAMS } from "../src/domain/seed.ts";

test("chaque fiche du catalogue est cohérente avec elle-même", () => {
  for (const { template } of EXERCISE_CATALOG) {
    assert.equal(template.targetWeights.length, template.sets, template.id);
    assert.equal(template.lastWeights.length, template.sets, template.id);
    assert.ok(template.repMax >= template.repMin, template.id);
    assert.ok(template.name.length > 0, template.id);
    assert.ok(template.restSeconds > 0, template.id);
    assert.ok(template.cue.length > 0, `${template.id} : consigne manquante`);
    assert.ok(template.tip.length > 0, `${template.id} : conseil manquant`);
    // La source est facultative : un mouvement sans démonstration vérifiée
    // n'en affiche aucune et invite à renseigner la sienne. Mais si elle est
    // là, elle est en https — voir tests/links.test.ts.
    assert.ok(
      template.videoUrl === "" || template.videoUrl.startsWith("https://"),
      `${template.id} : source ni vide ni https`,
    );
  }
});

test("chaque mouvement propose au moins trois remplacements", () => {
  // C'est la promesse de l'écran « machine occupée » : jamais une liste vide.
  for (const { template } of EXERCISE_CATALOG) {
    assert.ok(
      template.alternatives.length >= 3,
      `${template.id} n'a que ${template.alternatives.length} équivalent(s)`,
    );
    assert.ok(
      !template.alternatives.includes(template.name),
      `${template.id} se propose lui-même en remplacement`,
    );
  }
});

test("les identifiants du catalogue sont uniques", () => {
  const ids = EXERCISE_LIBRARY.map((exercise) => exercise.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("le catalogue est nettement plus fourni qu'avant", () => {
  assert.ok(EXERCISE_LIBRARY.length >= 100, `seulement ${EXERCISE_LIBRARY.length} mouvements`);
});

test("les séances d'exemple sont entièrement résolues depuis le catalogue", () => {
  // Une séance d'exemple qui perd un exercice le perdrait en silence :
  // `fromCatalog` ignore les identifiants inconnus pour ne pas casser le boot.
  const counts = SEED_PROGRAMS.map((program) => program.exercises.length);
  assert.deepEqual(counts, [7, 5, 6, 5]);
  for (const program of SEED_PROGRAMS) {
    for (const exercise of program.exercises) {
      assert.ok(catalogTemplate(exercise.id), `${exercise.id} absent du catalogue`);
    }
  }
});

test("les séances d'exemple ne partagent pas leurs objets avec le catalogue", () => {
  // `catalogTemplate` clone : modifier un programme ne doit pas modifier la
  // fiche que verra la personne suivante dans le sélecteur.
  const seeded = SEED_PROGRAMS[0]!.exercises[0]!;
  const fromCatalog = catalogTemplate(seeded.id)!;
  assert.notEqual(seeded.targetWeights, fromCatalog.targetWeights);
});

test("la recherche ignore la casse et les accents", () => {
  assert.ok(searchLibrary("developpe").some((item) => item.id === "incline-db-press"));
  assert.ok(searchLibrary("ÉLÉVATIONS").some((item) => item.id === "lateral-raise"));
  assert.equal(searchLibrary("").length, EXERCISE_LIBRARY.length);
  assert.equal(searchLibrary("zzzz").length, 0);
});

test("la recherche trouve par muscle, par matériel et par mots multiples", () => {
  assert.ok(searchLibrary("pecs").some((item) => item.id === "chest-press"));
  assert.ok(searchLibrary("ischios").some((item) => item.id === "leg-curl"));
  assert.ok(searchLibrary("elastique").some((item) => item.id === "band-row"));
  // Deux mots : les deux doivent être présents, dans n'importe quel ordre.
  assert.ok(searchLibrary("mollets assis").some((item) => item.id === "seated-calf-raise"));
  assert.ok(searchLibrary("assis mollets").some((item) => item.id === "seated-calf-raise"));
  assert.ok(
    searchLibrary("developpe incline").length < searchLibrary("developpe").length,
    "ajouter un mot restreint le résultat",
  );
  // Les mots-clés de contexte sont indexés comme le reste.
  assert.ok(searchLibrary("maison").length > 5);
});

test("le filtre matériel restreint sans vider le catalogue", () => {
  for (const equipment of ["machine", "halteres", "poids-du-corps", "elastique"] as const) {
    const found = searchLibrary("", { equipment });
    assert.ok(found.length > 0, `aucun mouvement en ${EQUIPMENT_LABELS[equipment]}`);
    assert.ok(found.length < EXERCISE_LIBRARY.length);
  }
});

test("le filtre matériel et la recherche se combinent", () => {
  const withMachine = searchLibrary("presse", { equipment: "machine" });
  assert.ok(withMachine.some((item) => item.id === "leg-press"));
  assert.equal(searchLibrary("presse", { equipment: "elastique" }).length, 0);
});

test("un exercice sur mesure sans équivalent reçoit quand même des propositions", () => {
  const custom = { name: "Mon mouvement à moi", group: "lower" as const, alternatives: [] };
  const suggestions = suggestAlternatives(custom, 5);
  assert.equal(suggestions.length, 5);
  assert.ok(!suggestions.includes(custom.name));
});

test("les équivalents choisis passent avant les propositions du catalogue", () => {
  const chestPress = catalogTemplate("chest-press")!;
  const suggestions = suggestAlternatives(chestPress, 6);
  assert.deepEqual(suggestions.slice(0, 3), chestPress.alternatives);
  assert.equal(new Set(suggestions).size, suggestions.length, "aucun doublon");
  assert.ok(!suggestions.includes(chestPress.name));
});
