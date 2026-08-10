import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { APP_VERSION, FEEDBACK_EMAIL } from "../src/config.ts";
import {
  buildFeedbackEmail,
  buildShareMessage,
  feedbackMailto,
} from "../src/domain/feedback.ts";

test("le message part à l'adresse de retour, avec un sujet qui dit de quoi il s'agit", () => {
  const idea = buildFeedbackEmail({ kind: "idea", message: "Un mode superset" });
  assert.equal(idea.to, FEEDBACK_EMAIL);
  assert.match(idea.subject, /Idée de fonctionnalité/);

  const bug = buildFeedbackEmail({ kind: "bug", message: "Le chrono dérive" });
  assert.match(bug.subject, /Bug/);
});

test("le corps contient le message, la signature et le contexte technique", () => {
  const email = buildFeedbackEmail({
    kind: "other",
    message: "  Merci pour l'app  ",
    from: " Camille ",
    context: "iPhone Safari",
  });
  assert.match(email.body, /^Merci pour l'app/);
  assert.match(email.body, /— Camille/);
  assert.match(email.body, /Contexte : iPhone Safari/);
  assert.match(email.body, /tu peux les supprimer/);
});

test("sans prénom ni contexte, rien n'est inventé", () => {
  const email = buildFeedbackEmail({ kind: "idea", message: "Salut" });
  assert.ok(!email.body.includes("—\n"));
  assert.ok(!email.body.includes("Contexte"));
});

test("le lien mailto encode les caractères qui tronqueraient le message", () => {
  // Un « & » ou un « # » non encodé coupe le corps du message sans erreur.
  const href = feedbackMailto({
    kind: "idea",
    message: "Séries & répétitions #1 : à revoir ?",
  });
  assert.ok(href.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=`));
  assert.ok(!href.slice(href.indexOf("body=")).includes("&"), "aucun & brut dans le corps");
  assert.ok(href.includes("%23"), "le dièse est encodé");

  const body = decodeURIComponent(new URL(href).searchParams.get("body") ?? "");
  assert.match(body, /Séries & répétitions #1 : à revoir \?/);
});

test("la version citée dans les messages est celle du paquet", () => {
  // Elle sert à trier les retours : une version fausse est pire qu'absente.
  const pkg: unknown = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const version = (pkg as { version: string }).version;
  assert.equal(APP_VERSION, version);
});

test("le message de partage porte le lien et la promesse de confidentialité", () => {
  const message = buildShareMessage("https://exemple.test/zeus/");
  assert.ok(message.includes("https://exemple.test/zeus/"));
  assert.match(message, /reste sur le téléphone/);
});
