"use client";

import { useEffect } from "react";

/** Fades `[data-reveal]` elements up as they scroll into view. Without JS (or with reduced motion) nothing is hidden. */
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    // Anything already on screen stays shown, so the first paint never blinks.
    for (const el of els) if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
    document.documentElement.classList.add("motion");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const el of els) if (!el.classList.contains("in")) io.observe(el);
    return () => io.disconnect();
  }, []);
  return null;
}
