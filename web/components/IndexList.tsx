"use client";

import { useEffect, useRef, useState } from "react";
import { observeReplay } from "./replay";

type Item = { title: string; source: string; tags: string; done: boolean };

const initial: Item[] = [
  { title: "Attention Is All You Need", source: "arxiv.org/abs/1706.03762", tags: "#ml #papers", done: false },
  { title: "Async Rust, chapter 3", source: "rust-lang.github.io/async-book", tags: "#rust #async", done: true },
  { title: "Crafting Interpreters", source: "crafting-interpreters.pdf", tags: "#compilers #books", done: false },
];

/** E-01: an INDEX.md whose boxes you can tick. The first one ticks itself on every visit. */
export function IndexList() {
  const [items, setItems] = useState(initial);
  const [popped, setPopped] = useState<{ i: number; k: number } | null>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  const toggle = (i: number, to?: boolean) => {
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, done: to ?? !x.done } : x)));
    setPopped((p) => ({ i, k: (p?.k ?? 0) + 1 }));
  };

  useEffect(() => {
    const el = firstRef.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t: ReturnType<typeof setTimeout> | undefined;
    const stop = observeReplay(
      el,
      () => {
        setItems(initial);
        t = setTimeout(() => toggle(0, true), reduce ? 0 : 900);
      },
      () => clearTimeout(t),
      { threshold: 1 },
    );
    return () => {
      stop();
      clearTimeout(t);
    };
  }, []);

  return (
    <ul className="index" aria-label="Example INDEX.md">
      <li style={{ paddingBottom: 6 }}>
        <span className="t" style={{ color: "var(--ink)", fontWeight: 600 }}>
          # Grimoire
        </span>
      </li>
      {items.map((it, i) => (
        <li key={it.title} className={it.done ? "done" : undefined}>
          <button
            ref={i === 0 ? firstRef : undefined}
            type="button"
            className="tick"
            aria-pressed={it.done}
            aria-label={`Mark ${it.title} ${it.done ? "not done" : "done"}`}
            onClick={() => toggle(i)}
          >
            - [
            <span key={popped?.i === i ? popped.k : 0} className={popped?.i === i ? "x pop" : "x"}>
              {it.done ? "x" : " "}
            </span>
            ]
          </button>
          <span>
            <span className="t">[{it.title}]</span>
            <span className="m">
              ({it.source}) {it.tags}
            </span>
          </span>
        </li>
      ))}
      <li>
        <span className="keep">{"<!-- lines it doesn't recognise are kept verbatim -->"}</span>
      </li>
    </ul>
  );
}
