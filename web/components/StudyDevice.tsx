"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* The hero's study view, built from markup rather than a screenshot (there is no release to shoot yet).
   All content is synthetic. Visitors can switch the source kind, flip the notes between Markdown source
   and the rendered preview, and replay the sandbox run. */

type Kind = "article" | "video" | "pdf";

type Sample = {
  label: string;
  title: string;
  source: ReactNode;
  /** NOTES.md as written. */
  markdown: string;
  /** The same notes, rendered. */
  preview: ReactNode;
  code: string;
  output: string[];
  time: string;
};

const SAMPLES: Record<Kind, Sample> = {
  article: {
    label: "Article",
    title: "Attention Is All You Need",
    source: (
      <div className="pane src">
        <h3>Attention Is All You Need</h3>
        <p>
          The dominant sequence transduction models are based on complex recurrent or convolutional neural networks
          that include an encoder and a decoder. The best performing models also connect the encoder and decoder
          through an attention mechanism.
        </p>
        <p>
          We propose a new simple network architecture, the Transformer, based solely on attention mechanisms,
          dispensing with recurrence and convolutions entirely.
        </p>
      </div>
    ),
    markdown:
      "# Attention, read slowly\n\n## Scaled dot-product\nDivide by `√d_k` so softmax doesn't\nsaturate when d_k is large.\n\n## Why multi-head\nEach head attends in its own subspace,\nthen the outputs are concatenated.",
    preview: (
      <>
        <h3>Attention, read slowly</h3>
        <h4>Scaled dot-product</h4>
        <p>
          Divide by √d<sub>k</sub> so softmax doesn&apos;t saturate when d<sub>k</sub> is large.
        </p>
        <h4>Why multi-head</h4>
        <p>Each head attends in its own subspace, then the outputs are concatenated.</p>
      </>
    ),
    code: "softmax(q @ k.T / sqrt(d))",
    output: ["[[0.62 0.38]", " [0.29 0.71]]"],
    time: "0.22 s",
  },
  video: {
    label: "Video",
    title: "Lecture 4: Ownership and borrowing",
    source: (
      <div className="pane src vid">
        <div className="frame">
          <span className="play" />
          <span className="tc mono">18:42 / 54:10</span>
        </div>
        <h3>Lecture 4: Ownership and borrowing</h3>
        <p className="meta">A university systems course · an example video</p>
      </div>
    ),
    markdown:
      "# Ownership, lecture 4\n\n## 18:42 moves\nAssigning a String moves it; the old\nbinding can't be used after.\n\n## Borrowing\nMany `&T` or one `&mut T`, never both.",
    preview: (
      <>
        <h3>Ownership, lecture 4</h3>
        <h4>18:42 moves</h4>
        <p>Assigning a String moves it; the old binding can&apos;t be used after.</p>
        <h4>Borrowing</h4>
        <p>
          Many <code>&amp;T</code> or one <code>&amp;mut T</code>, never both.
        </p>
      </>
    ),
    code: 'let s = String::from("hi"); let t = &s;',
    output: ["hi hi"],
    time: "0.41 s",
  },
  pdf: {
    label: "PDF",
    title: "Crafting Interpreters",
    source: (
      <div className="pane src pdf">
        <div className="page">
          <span className="pg mono">p. 47</span>
          <h3>Scanning</h3>
          <p>
            The first step in any compiler or interpreter is scanning. The scanner takes in raw source code as a
            series of characters and groups it into a series of chunks we call tokens.
          </p>
          <p>
            <mark>These are the meaningful &ldquo;words&rdquo; and &ldquo;punctuation&rdquo; that make up the
            language&apos;s grammar.</mark>
          </p>
        </div>
      </div>
    ),
    markdown:
      "# Scanning\n\n> These are the meaningful \"words\" and\n> \"punctuation\" … (p. 47)\n\n## Lexemes\nA lexeme is the raw substring;\na token is the lexeme plus its type.",
    preview: (
      <>
        <h3>Scanning</h3>
        <blockquote>
          These are the meaningful &ldquo;words&rdquo; and &ldquo;punctuation&rdquo; … (p. 47)
        </blockquote>
        <h4>Lexemes</h4>
        <p>A lexeme is the raw substring; a token is the lexeme plus its type.</p>
      </>
    ),
    code: 'scan("var x = 1;")',
    output: ["VAR IDENT EQUAL NUMBER SEMI"],
    time: "0.18 s",
  },
};

const KINDS: Kind[] = ["article", "video", "pdf"];
const STEP_MS = 260;

export function StudyDevice() {
  const [kind, setKind] = useState<Kind>("article");
  const [preview, setPreview] = useState(true);
  // How many output lines are visible; output.length + 1 means the run has finished.
  const [shown, setShown] = useState(Infinity);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const s = SAMPLES[kind];
  const done = shown > s.output.length;

  useEffect(() => () => stop(), []);

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  function choose(k: Kind) {
    stop();
    setKind(k);
    setShown(Infinity);
  }

  function run() {
    stop();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(Infinity);
      return;
    }
    setShown(0);
    timer.current = setInterval(() => {
      setShown((n) => {
        if (n >= s.output.length) stop();
        return n + 1;
      });
    }, STEP_MS);
  }

  return (
    <figure className="device" aria-label={`The study view: a ${s.label.toLowerCase()} on the left, notes and a run on the right. Example content.`}>
      <div className="bar">
        <span>{s.title}</span>
        <span className="r" role="group" aria-label="Notes view">
          <button type="button" className={`key sm${preview ? "" : " on"}`} aria-pressed={!preview} onClick={() => setPreview(false)}>
            Source
          </button>
          <button type="button" className={`key sm${preview ? " on" : ""}`} aria-pressed={preview} onClick={() => setPreview(true)}>
            Preview
          </button>
        </span>
      </div>
      <div className="panes">
        <div aria-hidden="true" className="srcwrap" key={kind}>
          {s.source}
        </div>
        <div className="pane notes">
          {preview ? <div className="md" key={`${kind}-md`}>{s.preview}</div> : <pre className="raw" key={`${kind}-raw`}>{s.markdown}</pre>}
          <div className="run">
            <span className="code">{s.code}</span>
            {s.output.slice(0, shown).map((line, i) => (
              <span key={i} className="out">
                {line}
              </span>
            ))}
            <span className="foot">
              {done ? (
                <>
                  <i className="lamp" />
                  exit 0 · {s.time}
                </>
              ) : (
                <>
                  <i className="lamp amber" />
                  running…
                </>
              )}
              <button type="button" className="key sm rerun" onClick={run} disabled={!done}>
                Run again
              </button>
            </span>
          </div>
        </div>
      </div>
      <figcaption className="kinds">
        <span className="label">Open</span>
        <span role="group" aria-label="Example source">
          {KINDS.map((k) => (
            <button key={k} type="button" className={`key sm${k === kind ? " on" : ""}`} aria-pressed={k === kind} onClick={() => choose(k)}>
              {SAMPLES[k].label}
            </button>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
