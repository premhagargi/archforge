"use client";

import { useEffect, useState } from "react";

/**
 * Thin terracotta progress bar that tracks how far the page is scrolled. Lives
 * along the bottom edge of the sticky nav. Updates are rAF-throttled.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        setProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5">
      <div
        className="scroll-progress h-full w-full"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
