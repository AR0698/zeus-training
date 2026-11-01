import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CUES,
  PEAK_GAIN,
  createSoundPlayer,
  restCue,
  scheduleTones,
  type AudioContextLike,
} from "../src/domain/sound.ts";
import { DEFAULT_SETTINGS } from "../src/domain/seed.ts";
import { parseAppState } from "../src/state/schema.ts";

const NOW = Date.UTC(2026, 9, 27, 10, 0, 0);

type Call = { node: string; method: string; args: unknown[] };

function fakeContext(initialState = "suspended") {
  const calls: Call[] = [];
  const param = (node: string) => ({
    setValueAtTime: (...args: unknown[]) => calls.push({ node, method: "set", args }),
    linearRampToValueAtTime: (...args: unknown[]) => calls.push({ node, method: "ramp", args }),
  });
  const context = {
    state: initialState,
    currentTime: 10,
    destination: "speakers",
    resumes: 0,
    resume() {
      this.resumes += 1;
      this.state = "running";
      return Promise.resolve();
    },
    createOscillator: () => ({
      type: "square" as OscillatorType,
      frequency: param("frequency"),
      connect: (...args: unknown[]) => calls.push({ node: "oscillator", method: "connect", args }),
      start: (...args: unknown[]) => calls.push({ node: "oscillator", method: "start", args }),
      stop: (...args: unknown[]) => calls.push({ node: "oscillator", method: "stop", args }),
    }),
    createGain: () => ({
      gain: param("gain"),
      connect: (...args: unknown[]) => calls.push({ node: "gain", method: "connect", args }),
    }),
  };
  return { context, calls };
}

test("the rest beeps 3, 2, 1, then signals the end", () => {
  assert.equal(restCue(5, 4), null);
  assert.equal(restCue(4, 3), "tick");
  assert.equal(restCue(3, 2), "tick");
  assert.equal(restCue(2, 1), "tick");
  assert.equal(restCue(1, 0), "end");
});

test("a reading that does not go down never beeps", () => {
  assert.equal(restCue(3, 3), null, "same second read twice");
  assert.equal(restCue(2, 32), null, "+30 s during the countdown");
  assert.equal(restCue(0, 0), null, "lingering at zero");
});

test("starting, stopping or skipping the rest stays silent", () => {
  assert.equal(restCue(null, 3), null, "a 3 s rest just started");
  assert.equal(restCue(2, null), null, "rest skipped");
  assert.equal(restCue(0, null), null, "linger over");
});

test("a rest that jumps straight to zero in the background still signals the end once", () => {
  assert.equal(restCue(45, 0), "end");
  assert.equal(restCue(45, 2), "tick");
});

test("each tone is a sine with a soft attack and release, starting from the current time", () => {
  const { context, calls } = fakeContext("running");
  scheduleTones(context, CUES.end);

  const starts = calls.filter((call) => call.method === "start").map((call) => call.args[0]);
  const stops = calls.filter((call) => call.method === "stop").map((call) => call.args[0]);
  assert.deepEqual(starts, CUES.end.map((tone) => 10 + tone.at));
  assert.deepEqual(stops, CUES.end.map((tone) => 10 + tone.at + tone.duration));

  const peaks = calls.filter((call) => call.node === "gain" && call.args[0] === PEAK_GAIN);
  assert.equal(peaks.length, CUES.end.length * 2);
  const lastGain = calls.filter((call) => call.node === "gain" && call.method === "ramp").at(-1);
  assert.equal(lastGain?.args[0], 0, "every note fades to silence");
  assert.ok(calls.some((call) => call.method === "connect" && call.args[0] === "speakers"));
});

test("nothing plays before the first gesture unlocks the audio", () => {
  const { context, calls } = fakeContext();
  let created = 0;
  const player = createSoundPlayer(() => {
    created += 1;
    return context;
  });

  assert.equal(player.play("end"), false);
  assert.equal(created, 0, "no AudioContext for someone who never touched the screen");

  player.unlock();
  player.unlock();
  assert.equal(created, 1);
  assert.equal(context.resumes, 1, "an already running context is not resumed again");
  assert.equal(player.play("end"), true);
  assert.equal(calls.filter((call) => call.method === "start").length, CUES.end.length);
});

test("a context suspended again (background, phone call) is resumed instead of playing", () => {
  const { context } = fakeContext("running");
  const player = createSoundPlayer(() => context);
  player.unlock();
  context.state = "interrupted";

  assert.equal(player.play("tick"), false);
  assert.equal(context.resumes, 1);
  assert.equal(player.play("tick"), true);
});

test("without Web Audio, nothing breaks", () => {
  const missing = createSoundPlayer(() => null);
  missing.unlock();
  assert.equal(missing.play("end"), false);

  let attempts = 0;
  const throwing = createSoundPlayer(() => {
    attempts += 1;
    throw new Error("AudioContext is not a constructor");
  });
  assert.doesNotThrow(() => throwing.unlock());
  assert.doesNotThrow(() => throwing.unlock());
  assert.equal(attempts, 1, "a missing API is not probed on every tap");
  assert.equal(throwing.play("tick"), false);
});

test("a context that fails while playing does not throw", () => {
  const { context } = fakeContext("running");
  const broken: AudioContextLike = {
    ...context,
    state: "running",
    createOscillator: () => {
      throw new Error("closed");
    },
  };
  const player = createSoundPlayer(() => broken);
  player.unlock();
  assert.equal(player.play("end"), false);
});

test("sounds are off by default and older saves without the setting stay silent", () => {
  assert.equal(DEFAULT_SETTINGS.sounds, false);
  const old = parseAppState({ version: 2, programs: [], history: [], settings: { vibration: true } }, NOW);
  assert.equal(old.state.settings.sounds, false);
  assert.equal(old.state.settings.vibration, true);
});

test("the sounds setting survives a round trip and rejects garbage", () => {
  const on = parseAppState({ version: 2, programs: [], history: [], settings: { sounds: true } }, NOW);
  assert.equal(on.state.settings.sounds, true);
  const reread = parseAppState(JSON.parse(JSON.stringify(on.state)), NOW);
  assert.equal(reread.state.settings.sounds, true);
  const garbage = parseAppState({ version: 2, programs: [], history: [], settings: { sounds: "oui" } }, NOW);
  assert.equal(garbage.state.settings.sounds, false);
});
