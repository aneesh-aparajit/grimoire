"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { observeReplay } from "./replay";

type Run = {
  id: number;
  time: string;
  state: "running" | "pass" | "fail";
  secs?: number;
  out?: string;
  started: boolean;
};
type Fix = "bad" | "writing" | "typed" | "fixed";

const pad = (n: number) => String(n).padStart(2, "0");
const now = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const TRACEBACK = `Traceback (most recent call last):
  File "main.py", line 5, in <module>
NameError: name 'd' is not defined`;
const OUTPUT = "[0.35 0.22 0.22 0.22]";
const CANCELLED = Symbol("cancelled");
const BURST: [number, number][] = [[-22, -16], [20, -18], [26, 6], [-26, 8], [0, -24]];

/**
 * E-03: the sandbox. On every visit it resets and casts: R-01 fails and is
 * struck through in red, the typo is rewritten in ink, and R-02 passes.
 * Casting again while it is fixed just passes. Old runs are never erased,
 * only scrolled off after four. Leaving the section cancels a cast mid-flight.
 */
export function Sandbox() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [fix, setFix] = useState<Fix>("bad");
  const [busy, setBusy] = useState(false);
  const [castOnce, setCastOnce] = useState(false);
  const n = useRef(0);
  const gen = useRef(0);
  const busyRef = useRef(false);
  const fixedRef = useRef(false);
  const reduceRef = useRef(false);
  const moduleRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    gen.current += 1;
    n.current = 0;
    busyRef.current = false;
    fixedRef.current = false;
    setBusy(false);
    setRuns([]);
    setFix("bad");
    setCastOnce(false);
  }, []);

  const cast = useCallback(async () => {
    if (busyRef.current) return;
    const g = gen.current;
    // Resolves after `ms`, or throws if a reset happened meanwhile.
    const wait = (ms: number) =>
      new Promise<void>((res, rej) =>
        setTimeout(() => (g === gen.current ? res() : rej(CANCELLED)), reduceRef.current ? 0 : ms),
      );
    const update = (id: number, patch: Partial<Run>) =>
      setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const start = async () => {
      n.current += 1;
      const id = n.current;
      setRuns((rs) => [...rs, { id, time: now(), state: "running" as const, started: false }].slice(-4));
      await wait(60);
      update(id, { started: true });
      return id;
    };
    const secs = () => 0.24 + Math.random() * 0.1;

    busyRef.current = true;
    setBusy(true);
    try {
      let id = await start();
      await wait(520);
      if (!fixedRef.current) {
        update(id, { state: "fail", secs: secs(), out: TRACEBACK });
        await wait(900);
        setFix("writing");
        await wait(380);
        setFix("typed");
        await wait(420);
        setFix("fixed");
        fixedRef.current = true;
        await wait(380);
        id = await start();
        await wait(560);
      }
      update(id, { state: "pass", secs: secs(), out: OUTPUT });
      setCastOnce(true);
      busyRef.current = false;
      setBusy(false);
    } catch (e) {
      if (e !== CANCELLED) throw e;
    }
  }, []);

  useEffect(() => {
    reduceRef.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = moduleRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const stop = observeReplay(
      el,
      () => {
        reset();
        t = setTimeout(cast, reduceRef.current ? 0 : 500);
      },
      () => {
        clearTimeout(t);
        reset();
      },
      { threshold: 0.3 },
    );
    const onKey = (e: KeyboardEvent) => {
      const section = document.getElementById("cast");
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && section?.contains(document.activeElement)) {
        e.preventDefault();
        cast();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      stop();
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [cast, reset]);

  const fixClass = { bad: "fix bad", writing: "fix writing", typed: "fix writing", fixed: "fix fixed" }[fix];

  return (
    <div className="module" ref={moduleRef}>
      <div className="mhead">
        <span className="label">Sandbox</span>
        <span className="mono">
          attention/sandbox/<b>main.py</b>
        </span>
        <span className="right">
          <button className="btn btn-pen cast-btn" type="button" onClick={cast} disabled={busy}>
            {castOnce ? "Cast again" : "Cast"} <kbd>⌘↵</kbd>
          </button>
        </span>
      </div>
      <pre className="code" aria-label="main.py">
        <span className="kw">import</span> numpy <span className="kw">as</span> np{"\n\n"}
        <span className="cm"># one query attending over four keys</span>
        {"\n"}q = k = np.eye(<span className="num">4</span>){"\n"}w = np.exp(q @ k.T / np.sqrt(
        <span className={fixClass}>{fix === "bad" ? "d" : fix === "writing" ? "" : "4"}</span>)){"\n"}
        print((w / w.sum(<span className="num">1</span>, keepdims=<span className="kw">True</span>)).round(
        <span className="num">2</span>)[<span className="num">0</span>])
      </pre>
      <div className="log" aria-live="polite">
        {runs.length === 0 ? (
          <p className="empty">No runs yet.</p>
        ) : (
          runs.map((r) => <RunRow key={r.id} run={r} reduce={reduceRef.current} />)
        )}
      </div>
    </div>
  );
}

function RunRow({ run, reduce }: { run: Run; reduce: boolean }) {
  const cls = ["runrow", run.state === "running" && "running", run.state === "fail" && "failed"].filter(Boolean).join(" ");
  const width = run.secs ? (run.secs / 10) * 100 : run.started ? 3 : 0;
  return (
    <div className={cls}>
      <div className="top">
        <span className="label">R-{pad(run.id)}</span>
        <span className="meta mono">{run.time} · main.py</span>
        <span className="stamp-wrap">
          <span className={`stamp ${run.state === "running" ? "run" : run.state}`}>
            {run.state === "running" ? "Running" : run.state === "pass" ? "Exit 0" : "Exit 1"}
          </span>
          {run.state === "pass" &&
            !reduce &&
            BURST.map(([dx, dy], i) => (
              <span
                key={i}
                className="burst"
                style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${i * 40}ms` } as CSSProperties}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                  <use href="#star" />
                </svg>
              </span>
            ))}
        </span>
        <span className="dur mono">{run.secs ? `${run.secs.toFixed(2)}s` : "…"}</span>
      </div>
      <div className="bar">
        <i style={{ width: `${width}%` }} />
      </div>
      {run.out && <div className={run.state === "fail" ? "out err" : "out"}>{run.out}</div>}
    </div>
  );
}
