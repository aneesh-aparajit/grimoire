"use client";

import { useEffect, useState } from "react";
import { observeReplay } from "./replay";

/**
 * The sticky NOTES.md file bar. It also owns the page-wide scroll effects:
 * entries replay their reveals (`.seen`) on every visit, and the crumb follows the
 * entry in the middle of the screen.
 */
export function FileBar() {
  const [saved, setSaved] = useState(true);
  const [crumb, setCrumb] = useState<{ num: string; title: string } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("js");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t: ReturnType<typeof setTimeout> | undefined;

    const entries = [...document.querySelectorAll<HTMLElement>(".entry")];
    const stops = entries.map((el) =>
      observeReplay(
        el,
        () => {
          el.classList.add("seen");
          if (el.classList.contains("hero") && !reduce) {
            clearTimeout(t);
            setSaved(false);
            t = setTimeout(() => setSaved(true), 1900);
          }
        },
        () => el.classList.remove("seen"),
        { rootMargin: el.classList.contains("hero") ? "0px" : "0px 0px -20% 0px" },
      ),
    );
    const where = new IntersectionObserver(
      (list) => {
        for (const e of list) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const num = el.querySelector(".num")?.textContent ?? "";
          setCrumb(el.dataset.title ? { num, title: el.dataset.title } : null);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const e of entries) where.observe(e);
    return () => {
      clearTimeout(t);
      for (const stop of stops) stop();
      where.disconnect();
    };
  }, []);

  return (
    <div className="filebar" aria-hidden="true">
      <div className="in mono">
        <span>
          ~/grimoire/<b>NOTES.md</b>
        </span>
        <span className="crumb">
          {crumb && (
            <>
              › <span>{crumb.num}</span> {crumb.title}
            </>
          )}
        </span>
        <span className="state">
          <span className={saved ? "dot" : "dot dirty"} />
          <span>{saved ? "Saved" : "Writing"}</span>
        </span>
      </div>
    </div>
  );
}
