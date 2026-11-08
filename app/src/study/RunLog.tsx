import { ChevronRight, CornerDownLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { LANGUAGES, type Run } from "../mock/types";
import { TIMEOUT_MS, useStudy } from "./store";

const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function seconds(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function Stamp({ run }: { run: Run }) {
  switch (run.status) {
    case "running":
      return <span className="stamp stamp-live">Running</span>;
    case "ok":
      return <span className="stamp stamp-pass">Exit 0</span>;
    case "error":
      return <span className="stamp stamp-fail">Exit {run.exitCode}</span>;
    case "timeout":
      return <span className="stamp stamp-fail">Timed out</span>;
    case "stopped":
      return <span className="stamp stamp-caution">Stopped</span>;
  }
}

function useElapsed(run: Run) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (run.status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [run.status]);
  return run.status === "running" ? Math.min(TIMEOUT_MS, now - run.startedAt) : run.durationMs;
}

function RunEntry({ run, open, onToggle }: { run: Run; open: boolean; onToggle: () => void }) {
  const insertRun = useStudy((s) => s.insertRun);
  const elapsed = useElapsed(run);
  const failed = run.status === "error" || run.status === "timeout";
  const lang = LANGUAGES.find((l) => l.id === run.language);
  const outId = `run-${run.n}-out`;

  return (
    <li className="run" data-open={open} data-failed={failed} data-status={run.status}>
      <button type="button" className="run-head" aria-expanded={open} aria-controls={outId} onClick={onToggle}>
        <span className="run-no">R-{String(run.n).padStart(2, "0")}</span>
        <span className="run-meta">
          <span>{clock.format(run.startedAt)}</span>
          <span>{lang?.file}</span>
        </span>
        <span>
          <Stamp run={run} />
        </span>
        <span className="run-dur">{seconds(elapsed)}</span>
        <ChevronRight className="run-chev" aria-hidden="true" />
      </button>
      <div
        className="run-scale"
        role="img"
        aria-label={`${seconds(elapsed)} of the ${TIMEOUT_MS / 1000} s timeout`}
        title={`${seconds(elapsed)} of the ${TIMEOUT_MS / 1000} s timeout`}
      >
        <i style={{ transform: `scaleX(${Math.max(0.004, elapsed / TIMEOUT_MS)})` }} />
      </div>
      {open && (
        <>
          <pre className="run-out" id={outId} aria-live={run.status === "running" ? "polite" : undefined}>
            {run.output.length === 0 ? (
              <span className="none">{run.status === "running" ? "Waiting for output…" : "No output."}</span>
            ) : (
              run.output.map((l, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: output lines are append-only.
                <span key={i} className={l.stream === "stderr" ? "err" : undefined}>
                  {l.text}
                  {"\n"}
                </span>
              ))
            )}
            {run.status === "timeout" && (
              <span className="err">Killed after {TIMEOUT_MS / 1000} s. Change the limit in vault settings.{"\n"}</span>
            )}
          </pre>
          {run.status !== "running" && (
            <div className="run-actions">
              <button type="button" className="btn" onClick={() => insertRun(run.n)}>
                <CornerDownLeft />
                Insert code and output into notes
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export function RunLog({ style }: { style?: React.CSSProperties }) {
  const runs = useStudy((s) => s.runs);
  const missing = useStudy((s) => {
    const lang = LANGUAGES.find((l) => l.id === s.language);
    return s.fixture.toolchains[s.language] ? null : lang;
  });
  const [closed, setClosed] = useState<Set<number>>(new Set());
  const [opened, setOpened] = useState<Set<number>>(new Set());
  // Runs loaded from earlier sessions start folded so failures stay in view;
  // a run started now opens on its own.
  const [mountedAt] = useState(Date.now);
  const last = runs.at(-1);
  const latest = last && last.startedAt >= mountedAt ? last.n : undefined;

  const isOpen = (n: number) => (n === latest ? !closed.has(n) : opened.has(n));
  const toggle = (n: number) => {
    if (n === latest) {
      const next = new Set(closed);
      next.has(n) ? next.delete(n) : next.add(n);
      setClosed(next);
    } else {
      const next = new Set(opened);
      next.has(n) ? next.delete(n) : next.add(n);
      setOpened(next);
    }
  };

  return (
    <section className="runlog" id="run-log" style={style} aria-label="Run log">
      {runs.length === 0 ? (
        <p className="runlog-empty">
          {missing ? (
            <>No runs yet. {missing.label} can't run until <code className="mono">{missing.bin}</code> is installed; switch language to run something else.</>
          ) : (
            <>No runs yet. Press <span className="kbd">⌘↵</span> to run the snippet. Each run is logged here with its time, exit code and output.</>
          )}
        </p>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {[...runs].reverse().map((r) => (
            <RunEntry key={r.n} run={r} open={isOpen(r.n)} onToggle={() => toggle(r.n)} />
          ))}
        </ol>
      )}
    </section>
  );
}
