import { useEffect } from "react";
import type { ThemePreference } from "../domain/types.ts";

const DARK_SURFACE = "#0a0a09";
const LIGHT_SURFACE = "#f2f2ec";

/**
 * Resolves the theme preference against the OS setting and writes it to the
 * root element, where every token in `tokens.css` picks it up.
 *
 * The browser chrome colour follows, so the status bar of the installed app
 * matches the header instead of flashing white at launch.
 */
export function useTheme(preference: ThemePreference): void {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const resolved = preference === "auto" ? (media.matches ? "dark" : "light") : preference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute("content", resolved === "dark" ? DARK_SURFACE : LIGHT_SURFACE);
    };

    apply();
    if (preference !== "auto") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);
}
