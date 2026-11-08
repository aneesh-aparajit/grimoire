import { CornerDownLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../app/store";
import { LANGUAGES, type Run } from "../ipc/schemas";
import { getTimeoutMs, useStudy } from "./store";

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
  return run.status === "running" ? Math.min(getTimeoutMs(), now - run.startedAt) : run.durationMs;
}

/** Output of the most recent run started in this session. */
function Output({ run }: { run: Run }) {
  const insertRun = useStudy((s) => s.insertRun);
  const elapsed = useElapsed(run);
  const failed = run.status === "error" || run.status === "timeout";
  const lang = LANGUAGES.find((l) => l.id === run.language);

  return (
    <div className="run" data-open="true" data-failed={failed} data-status={run.status}>
      <div className="run-head">
        <span className="run-meta">
          <span>{lang?.file}</span>
        </span>
        <span>
          <Stamp run={run} />
        </span>
        <span className="run-dur">{seconds(elapsed)}</span>
        {run.status !== "running" ? (
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => insertRun(run.n)}
            title="Insert code and output into notes"
            aria-label="Insert code and output into notes"
          >
            <CornerDownLeft />
          </button>
        ) : (
          <span />
        )}
      </div>
      <div
        className="run-scale"
        role="img"
        aria-label={`${seconds(elapsed)} of the ${getTimeoutMs() / 1000} s timeout`}
        title={`${seconds(elapsed)} of the ${getTimeoutMs() / 1000} s timeout`}
      >
        <i style={{ transform: `scaleX(${Math.max(0.004, elapsed / getTimeoutMs())})` }} />
      </div>
      <pre className="run-out" aria-live={run.status === "running" ? "polite" : undefined}>
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
          <span className="err">Killed after {getTimeoutMs() / 1000} s. Change the limit in Settings.{"\n"}</span>
        )}
        {run.truncated && <span className="err">Output was cut off at the size limit.{"\n"}</span>}
      </pre>
    </div>
  );
}

export function RunLog({ style }: { style?: React.CSSProperties }) {
  const last = useStudy((s) => s.runs.at(-1));
  const openedAt = useStudy((s) => s.openedAt);
  const language = useStudy((s) => s.language);
  const toolchain = useApp((s) => s.toolchains.find((t) => t.language === language));
  const missing = toolchain && !toolchain.path ? LANGUAGES.find((l) => l.id === language) : null;
  // Only the run started in this session is shown; earlier runs aren't kept on screen.
  const current = last && last.startedAt >= openedAt ? last : undefined;

  return (
    <section className="runlog" id="run-log" style={style} aria-label="Output">
      {current ? (
        <Output run={current} />
      ) : (
        <p className="runlog-empty">
          {missing ? (
            <>{missing.label} can't run until <code className="mono">{missing.bin}</code> is installed; switch language to run something else.</>
          ) : (
            <>Press <span className="kbd">⌘↵</span> to run the snippet. Its output shows here.</>
          )}
        </p>
      )}
    </section>
  );
}
