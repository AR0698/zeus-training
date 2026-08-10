import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * A ticking clock, opt-in.
 *
 * Components never call `Date.now()` while rendering — that makes a render
 * impure. They subscribe to this external store instead, so React controls when
 * the value changes, and the interval only runs while it is actually needed.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  // Reading the clock is exactly this hook's job; the value is then owned by
  // useSyncExternalStore, which is what keeps renders consistent.
  // eslint-disable-next-line react-hooks/purity
  const value = useRef(Date.now());

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!active) return () => undefined;

      const tick = () => {
        value.current = Date.now();
        notify();
      };

      tick();
      const id = window.setInterval(tick, intervalMs);
      // Coming back from the lock screen must resync immediately, because
      // background tabs get their timers throttled.
      const onVisible = () => {
        if (document.visibilityState === "visible") tick();
      };
      document.addEventListener("visibilitychange", onVisible);

      return () => {
        window.clearInterval(id);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
    [active, intervalMs],
  );

  const getSnapshot = useCallback(() => value.current, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
