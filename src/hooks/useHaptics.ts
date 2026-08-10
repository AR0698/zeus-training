import { useMemo } from "react";

export type Haptics = {
  tap: () => void;
  confirm: () => void;
  celebrate: () => void;
  alert: () => void;
};

/**
 * Short vibration patterns used as *confirmation*, never as decoration.
 *
 * A validated set has to be felt through a pocket, in a noisy room, without
 * looking. Silently unsupported on iOS Safari, which is fine — the visual
 * feedback never depends on it.
 */
export function useHaptics(enabled: boolean): Haptics {
  return useMemo(() => {
    const buzz = (pattern: number | number[]) => {
      if (!enabled) return;
      try {
        navigator.vibrate?.(pattern);
      } catch {
        // ignore
      }
    };
    return {
      tap: () => buzz(12),
      confirm: () => buzz(24),
      celebrate: () => buzz([18, 60, 18, 60, 42]),
      alert: () => buzz([40, 90, 40]),
    };
  }, [enabled]);
}
