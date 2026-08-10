import { useCallback, useEffect, useRef, useState } from "react";

export type RestTimer = {
  /** Remaining seconds, or null when no rest is running. */
  remaining: number | null;
  total: number;
  start: (seconds: number) => void;
  add: (seconds: number) => void;
  stop: () => void;
};

/** The countdown stays visible for a moment once it reaches zero. */
const LINGER_MS = 4000;

/**
 * The rest countdown between two sets.
 *
 * The source of truth is an absolute end timestamp, not a decrementing counter,
 * so the timer survives the tab being backgrounded, the screen locking and
 * timer throttling without drifting. The displayed value is seeded
 * synchronously when the rest starts, so the first frame is already correct.
 */
export function useRestTimer(onFinish: () => void): RestTimer {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (endsAt === null) return;

    let finished = false;
    let lingerId: number | null = null;

    const tick = () => {
      if (finished) return;
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      if (left > 0) {
        setRemaining(left);
        return;
      }
      finished = true;
      setRemaining(0);
      finishRef.current();
      lingerId = window.setTimeout(() => {
        setEndsAt(null);
        setRemaining(null);
      }, LINGER_MS);
    };

    const id = window.setInterval(tick, 250);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      if (lingerId !== null) window.clearTimeout(lingerId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endsAt]);

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setTotal(seconds);
    setRemaining(seconds);
    setEndsAt(Date.now() + seconds * 1000);
  }, []);

  const add = useCallback((seconds: number) => {
    setEndsAt((current) =>
      current === null ? current : Math.max(Date.now() + 1000, current + seconds * 1000),
    );
    setTotal((current) => Math.max(0, current + seconds));
    setRemaining((current) => (current === null ? current : Math.max(1, current + seconds)));
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(null);
  }, []);

  return { remaining, total, start, add, stop };
}
