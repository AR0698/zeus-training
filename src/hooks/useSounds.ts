import { useEffect, useMemo, useRef } from "react";
import {
  createSoundPlayer,
  restCue,
  type AudioContextLike,
  type Cue,
} from "../domain/sound.ts";

export type Sounds = {
  /** Plays a cue when sounds are on. */
  play: (cue: Cue) => void;
  /** Plays a cue regardless of the setting — the sample heard when turning sounds on. */
  preview: (cue: Cue) => void;
};

const GESTURES = ["pointerdown", "touchend", "keydown"] as const;

/** The first unlock resumes asynchronously; the preview waits that long once. */
const PREVIEW_RETRY_MS = 80;

function createContext(): AudioContextLike | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/**
 * Synthesized beeps, alongside the vibrations rather than instead of them:
 * iOS Safari has no vibration at all, so there the beep is the only signal a
 * rest is over without looking.
 *
 * iOS only lets audio start inside a user gesture. While sounds are on, every
 * tap quietly (re)unlocks the context, so it is ready by the time a rest ends.
 */
export function useSounds(enabled: boolean): Sounds {
  const player = useMemo(() => createSoundPlayer(createContext), []);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) return;
    const unlock = () => player.unlock();
    for (const type of GESTURES) {
      document.addEventListener(type, unlock, { capture: true, passive: true });
    }
    return () => {
      for (const type of GESTURES) document.removeEventListener(type, unlock, { capture: true });
    };
  }, [enabled, player]);

  return useMemo(
    () => ({
      play: (cue) => {
        if (enabledRef.current) player.play(cue);
      },
      preview: (cue) => {
        player.unlock();
        if (!player.play(cue)) window.setTimeout(() => player.play(cue), PREVIEW_RETRY_MS);
      },
    }),
    [player],
  );
}

/** Beeps 3, 2, 1 and at zero as the rest countdown runs. */
export function useRestCues(remaining: number | null, sounds: Sounds): void {
  const previous = useRef(remaining);

  useEffect(() => {
    const cue = restCue(previous.current, remaining);
    previous.current = remaining;
    if (cue !== null) sounds.play(cue);
  }, [remaining, sounds]);
}
