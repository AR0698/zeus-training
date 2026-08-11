import assert from "node:assert/strict";
import { test } from "node:test";
import { sourceFor } from "../src/domain/source.ts";

/**
 * Le champ source est saisi par l'utilisateur : c'est une entrée non fiable,
 * et ce qui en sort finit dans un `href` ou dans le `src` d'une iframe.
 */

const ID = "LSR0v3Q9dTg";

test("les quatre formes d'une adresse YouTube donnent la même vidéo", () => {
  const formes = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
  ];
  for (const forme of formes) {
    const source = sourceFor(forme);
    assert.equal(source?.kind, "video", forme);
    assert.ok(source.embedUrl.includes(ID), forme);
  }
});

test("le lecteur embarqué passe par le domaine sans cookie", () => {
  const source = sourceFor(`https://www.youtube.com/watch?v=${ID}`);
  assert.equal(source?.kind, "video");
  assert.ok(
    source.embedUrl.startsWith("https://www.youtube-nocookie.com/embed/"),
    `domaine inattendu — ${source.embedUrl}`,
  );
});

test("une adresse hors YouTube reste un article, ouvert ailleurs", () => {
  const source = sourceFor("https://musclewiki.com/exercise/barbell-bench-press");
  assert.equal(source?.kind, "article");
  assert.equal(source.host, "musclewiki.com");
});

test("tout ce qui n'est pas une https lisible est refusé", () => {
  // Le cas qui compte : `javascript:` collé dans le champ reste du code. Un
  // `href` le exécuterait au clic, dans l'origine de l'application.
  const refus = [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://musclewiki.com/exercise/barbell-bench-press",
    "  ",
    "",
    "pas une url",
    "//youtube.com/watch?v=" + ID,
  ];
  for (const entree of refus) {
    assert.equal(sourceFor(entree), null, `accepté à tort — ${entree}`);
  }
});

test("un identifiant de vidéo mal formé ne devient pas une iframe", () => {
  // Onze caractères, pas dix, pas douze : sinon l'iframe pointe dans le vide.
  const source = sourceFor("https://www.youtube.com/watch?v=trop-court");
  assert.notEqual(source?.kind, "video");
});

test("une page YouTube qui n'est pas une vidéo n'est pas lue sur place", () => {
  // Une recherche ou une chaîne n'a rien à jouer dans le lecteur ; elle reste
  // un lien sortant, ce qui est déjà le comportement le plus honnête.
  const recherche = sourceFor("https://www.youtube.com/results?search_query=squat");
  assert.equal(recherche?.kind, "article");
});
