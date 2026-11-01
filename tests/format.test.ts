import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMinutes } from "../src/domain/format.ts";

/** La durée d'une séance se lit en heures dès qu'elle atteint une heure. */

test("sous l'heure, la durée reste en minutes", () => {
  assert.equal(formatMinutes(5), "5 min");
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatMinutes(55), "55 min");
});

test("une heure pile s'écrit sans minutes", () => {
  assert.equal(formatMinutes(60), "1 h");
  assert.equal(formatMinutes(120), "2 h");
  assert.equal(formatMinutes(240), "4 h");
});

test("au-delà, les minutes suivent l'heure sur deux chiffres", () => {
  assert.equal(formatMinutes(90), "1 h 30");
  assert.equal(formatMinutes(125), "2 h 05");
  assert.equal(formatMinutes(235), "3 h 55");
});

test("une valeur non entière ou négative ne produit pas d'affichage absurde", () => {
  assert.equal(formatMinutes(89.6), "1 h 30");
  assert.equal(formatMinutes(-10), "0 min");
});
