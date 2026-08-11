import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  catalogIdByName,
  catalogTemplate,
  EXERCISE_CATALOG,
  illustratedIds,
  illustrationFor,
} from "../src/domain/catalog/index.ts";

const IMAGES = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "exercises");

test("chaque illustration déclarée pointe sur deux fichiers présents", () => {
  // Le piège que ce test attrape : une image renommée ou oubliée au commit se
  // voit ici, pas en salle devant une vignette cassée.
  for (const id of illustratedIds()) {
    const illustration = illustrationFor(id);
    assert.ok(illustration, `${id} : illustration introuvable`);
    assert.equal(illustration.frames.length, 2, `${id} : il faut deux poses`);
    for (const frame of illustration.frames) {
      assert.ok(existsSync(join(IMAGES, frame)), `${id} : fichier manquant — ${frame}`);
    }
  }
});

test("aucun fichier d'illustration n'est orphelin", () => {
  // L'inverse : une image livrée que plus personne n'affiche alourdit le
  // bundle en silence.
  const declared = new Set(illustratedIds().flatMap((id) => illustrationFor(id)!.frames));
  for (const file of readdirSync(IMAGES)) {
    assert.ok(declared.has(file), `${file} n'est référencé par aucun exercice`);
  }
});

test("toute illustration correspond à un mouvement du catalogue", () => {
  for (const id of illustratedIds()) {
    assert.ok(catalogTemplate(id), `${id} est illustré mais absent du catalogue`);
  }
});

test("un mouvement sans illustration en renvoie aucune", () => {
  assert.equal(illustrationFor("plank"), null, "le gainage planche n'a pas de dessin");
  assert.equal(illustrationFor("ex-sur-mesure-abc123"), null, "un exercice créé à la main non plus");
});

test("les noms de fichiers se déduisent de l'identifiant", () => {
  const squat = illustrationFor("back-squat");
  assert.deepEqual(squat?.frames, ["back-squat-1.webp", "back-squat-2.webp"]);
  assert.equal(squat?.caveat, null, "le squat barre est une correspondance exacte");
});

test("un dessin seulement approchant porte sa réserve", () => {
  const pullover = illustrationFor("pullover");
  assert.ok(pullover?.caveat, "le pull-over est dessiné à l'haltère, la fiche doit le dire");
});

test("le remplacement en séance retrouve l'illustration par le nom", () => {
  // « Machine occupée » enregistre un nom, pas un identifiant : c'est ce
  // chemin-là qui permet à la fiche de montrer le bon dessin.
  assert.equal(catalogIdByName("Développé couché haltères"), "db-bench-press");
  assert.equal(catalogIdByName("developpe couche halteres"), "db-bench-press", "sans accents");
  assert.equal(catalogIdByName("Mouvement inventé"), null);
});

/**
 * Un équivalent est du texte libre — l'éditeur laisse saisir n'importe quel
 * nom. Mais un équivalent qui *devrait* désigner une fiche du catalogue et ne
 * la trouve pas, c'est une faute de frappe : le remplacement perd alors sa
 * consigne et son dessin. D'où la liste explicite des variantes assumées.
 */
const VARIANTES_LIBRES = new Set(["Pull-over haltère"]);

test("un équivalent qui nomme une fiche du catalogue la retrouve", () => {
  for (const { template } of EXERCISE_CATALOG) {
    for (const alternative of template.alternatives) {
      if (VARIANTES_LIBRES.has(alternative)) continue;
      assert.ok(
        catalogIdByName(alternative),
        `${template.id} propose « ${alternative} », introuvable au catalogue`,
      );
    }
  }
});
