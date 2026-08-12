import { useEffect, type RefObject } from "react";

/**
 * Publishes the measured height of the fixed bottom bar as `--bottom-chrome`.
 *
 * Two things have to clear that bar without owning it: the toast, which floats
 * above it, and the scrolling body, which has to reach past it. Both used to
 * carry their own constant, and the session footer is the one bar whose height
 * changes at runtime — the rest timer adds some 60 px to it. Every constant was
 * therefore wrong in one state or the other: the toast covered the running
 * timer, and the last row of the list stayed tucked under the footer.
 *
 * Measuring the element itself leaves no second copy of the number to forget.
 */
export function useBottomChrome(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const root = document.documentElement;
    const publish = (height: number) => {
      root.style.setProperty("--bottom-chrome", `${Math.round(height)}px`);
    };

    publish(element.getBoundingClientRect().height);

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      // The border box, not the content box: the footer pads itself by the
      // bottom safe-area inset, and that padding is part of what must be cleared.
      const box = entry.borderBoxSize?.[0];
      publish(box ? box.blockSize : entry.target.getBoundingClientRect().height);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      // Back to the tab bar height for the rest of the app.
      root.style.removeProperty("--bottom-chrome");
    };
  }, [ref]);
}
