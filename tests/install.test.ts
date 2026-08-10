import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectPlatform,
  installReason,
  installSteps,
  platformLabel,
  type Platform,
} from "../src/domain/install.ts";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD_PRE_13 =
  "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1";
const IPADOS =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

test("un iPhone et un iPad ancien sont reconnus par leur nom", () => {
  assert.equal(detectPlatform(IPHONE), "ios");
  assert.equal(detectPlatform(IPAD_PRE_13), "ios");
});

test("un iPad moderne se fait passer pour un Mac : le tactile le trahit", () => {
  // iPadOS >= 13 envoie la chaîne d'un Mac de bureau. Sans `maxTouchPoints`,
  // on lui servirait les consignes de la barre d'adresse, qui n'existe pas.
  assert.equal(detectPlatform(IPADOS, 5), "ios");
  assert.equal(detectPlatform(MAC, 0), "desktop");
});

test("un Mac à écran tactile externe ne bascule pas en iOS pour un seul point", () => {
  assert.equal(detectPlatform(MAC, 1), "desktop");
});

test("Android et les ordinateurs tombent sur leurs propres consignes", () => {
  assert.equal(detectPlatform(ANDROID), "android");
  assert.equal(detectPlatform(WINDOWS), "desktop");
});

test("une chaîne vide ne fait pas planter la détection", () => {
  assert.equal(detectPlatform(""), "desktop");
});

test("chaque plateforme a des étapes numérotables et lisibles", () => {
  const platforms: Platform[] = ["ios", "android", "desktop"];
  for (const platform of platforms) {
    const steps = installSteps(platform);
    assert.ok(steps.length >= 2, `${platform} : au moins deux étapes`);
    for (const step of steps) {
      assert.ok(step.action.length > 0, `${platform} : une action jamais vide`);
    }
    assert.ok(platformLabel(platform).length > 0);
    assert.ok(installReason(platform).length > 0);
  }
});

test("la raison d'installer sur iPhone parle de la perte de données, pas de confort", () => {
  // C'est l'argument vérifiable : Safari purge le stockage d'un site non
  // installé. Le remplacer par « meilleure expérience » ferait sauter l'étape.
  assert.match(installReason("ios"), /effacées/);
});

test("les étapes ne sont pas partagées entre plateformes", () => {
  assert.notDeepEqual(installSteps("ios"), installSteps("android"));
  assert.notDeepEqual(installSteps("android"), installSteps("desktop"));
});
