import { useEffect } from "react";

/**
 * Keeps the screen on during a session.
 *
 * Without this the phone locks between two sets and the whole "glance at the
 * next target" interaction becomes unlock → find app → scroll. The lock is
 * released as soon as the session ends, and re-acquired when the tab comes
 * back to the foreground (browsers drop it on blur).
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if (cancelled || document.visibilityState !== "visible") return;
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Denied (low battery, unsupported) — the app stays fully usable.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);
}
