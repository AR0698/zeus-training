import assert from "node:assert/strict";
import { test } from "node:test";
import { EXERCISE_CATALOG } from "../src/domain/catalog/index.ts";
import { sourceFor } from "../src/domain/source.ts";

/**
 * Les liens de démonstration, vérifiés sur leur forme.
 *
 * Ces tests ne tapent pas le réseau : une suite qui dépend d'un site tiers
 * échoue le jour où le wifi tombe, pas le jour où le lien casse. Ils gardent la
 * forme — hôte connu, pas de chemin bricolé — et la liveness se revérifie à la
 * main quand on touche au catalogue.
 *
 * Le piège qu'ils attrapent : un slug MuscleWiki recopié de travers, ou un lien
 * ajouté vers un domaine qu'on n'a pas choisi. 17 des 41 liens explicites
 * pointaient sur des 404 avant qu'on les reprenne un par un.
 */

const HOTES = new Set(["musclewiki.com", "www.youtube.com", "youtube.com"]);

const AVEC_SOURCE = EXERCISE_CATALOG.filter(({ template }) => template.videoUrl !== "");

test("tout lien est une URL https sur un hôte choisi", () => {
  for (const { template } of AVEC_SOURCE) {
    let url: URL;
    try {
      url = new URL(template.videoUrl);
    } catch {
      assert.fail(`${template.id} : URL illisible — ${template.videoUrl}`);
    }
    assert.equal(url.protocol, "https:", `${template.id} : lien non chiffré`);
    assert.ok(HOTES.has(url.hostname), `${template.id} : hôte inattendu — ${url.hostname}`);
  }
});

test("un lien MuscleWiki pointe sur une fiche, jamais sur une liste", () => {
  // `/exercise/<slug>` est la fiche ; `/exercises/<muscle>` est la catégorie.
  // La confusion d'une lettre mène à une page qui ne montre pas le mouvement.
  for (const { template } of AVEC_SOURCE) {
    const url = new URL(template.videoUrl);
    if (url.hostname !== "musclewiki.com") continue;
    const [segment, slug, ...reste] = url.pathname.split("/").filter(Boolean);
    assert.equal(segment, "exercise", `${template.id} : chemin inattendu — ${url.pathname}`);
    assert.ok(slug, `${template.id} : slug manquant`);
    assert.equal(reste.length, 0, `${template.id} : chemin trop profond — ${url.pathname}`);
  }
});

test("aucune source n'est une page de résultats de recherche", () => {
  // Le catalogue en générait une pour tout mouvement sans fiche. Une liste de
  // résultats n'est pas une démonstration : mieux vaut ne rien afficher et
  // laisser l'utilisateur renseigner la sienne.
  for (const { template } of AVEC_SOURCE) {
    const url = new URL(template.videoUrl);
    assert.ok(!url.pathname.includes("results"), `${template.id} : renvoie sur une recherche`);
    assert.equal(url.search, "", `${template.id} : la source porte une requête — ${url.search}`);
  }
});

test("chaque source du catalogue se résout en vidéo ou en article", () => {
  // Le parsing qui alimente la fiche technique. Une source que `sourceFor`
  // rejette n'afficherait rien du tout, en silence.
  for (const { template } of AVEC_SOURCE) {
    assert.ok(sourceFor(template.videoUrl), `${template.id} : source illisible`);
  }
});
