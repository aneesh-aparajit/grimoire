import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import type { Extension } from "@codemirror/state";
import { lineNumbers } from "@codemirror/view";
import { ChevronDown, ChevronUp, CornerDownLeft, Play, Save, Square, TriangleAlert } from "lucide-react";
import { useRef } from "react";
import { type Language, LANGUAGES } from "../mock/types";
import { CodeMirror } from "./editor/CodeMirror";
import { codeTheme, syntax } from "./editor/theme";
import { RunLog } from "./RunLog";
import { Splitter } from "./Splitter";
import { useStudy } from "./store";

const LANG_EXT: Record<Language, Extension> = {
  python: python(),
  javascript: javascript(),
  go: go(),
  rust: rust(),
  c: cpp(),
  java: java(),
};

const CODE_EXTENSIONS = [lineNumbers(), syntax, codeTheme];

const INSTALL: Record<Language, string> = {
  python: "Python 3",
  javascript: "Node.js",
  go: "Go",
  rust: "Rust",
  c: "clang or gcc",
  java: "a JDK (11 or newer)",
};

export function SandboxModule({ style }: { style?: React.CSSProperties }) {
  const open = useStudy((s) => s.sandboxOpen);
  const setOpen = useStudy((s) => s.setSandboxOpen);
  const language = useStudy((s) => s.language);
  const setLanguage = useStudy((s) => s.setLanguage);
  const code = useStudy((s) => s.snippets[s.language] ?? "");
  const setSnippet = useStudy((s) => s.setSnippet);
  const toolchains = useStudy((s) => s.fixture.toolchains);
  const saved = useStudy((s) => s.savedSnippets);
  const runs = useStudy((s) => s.runs);
  const run = useStudy((s) => s.run);
  const stop = useStudy((s) => s.stop);
  const saveSnippet = useStudy((s) => s.saveSnippet);
  const insertRun = useStudy((s) => s.insertRun);
  const split = useStudy((s) => s.sandboxSplit);
  const setSplit = useStudy((s) => s.setSandboxSplit);
  const body = useRef<HTMLDivElement>(null);

  const lang = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0];
  const running = runs.at(-1)?.status === "running";
  const available = toolchains[language];
  const last = runs.at(-1);
  const isSaved = lang ? saved.includes(lang.file) : false;

  const keys = [
    { key: "Mod-Enter", run: () => (run(), true) },
    { key: "Mod-.", run: () => (stop(), true) },
    { key: "Mod-s", run: () => (saveSnippet(), true), preventDefault: true },
  ];

  return (
    <section className="sandbox" data-open={open} style={open ? style : undefined} aria-label="Sandbox">
      <div className="head">
        <span className="label" style={{ color: "var(--ink)" }}>
          Sandbox
        </span>
        <select
          className="select"
          aria-label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
              {toolchains[l.id] ? "" : " (not found)"}
            </option>
          ))}
        </select>
        {open ? (
          <span className="head-file" title={isSaved ? "Saved in sandbox/" : "Not saved yet"}>
            {isSaved ? "sandbox/" : ""}
            <b>{lang?.file}</b>
            {isSaved ? "" : " · unsaved"}
          </span>
        ) : (
          last && (
            <span className="last-run">
              <span className="mono">R-{String(last.n).padStart(2, "0")}</span>
              <span className="mono">
                {last.status === "ok" ? "exit 0" : last.status === "error" ? `exit ${last.exitCode}` : last.status}
              </span>
            </span>
          )
        )}
        <span className="spacer" />
        {open && (
          <>
            <button type="button" className="btn" onClick={() => insertRun()} title="Insert the snippet into NOTES.md" aria-label="Insert into notes">
              <CornerDownLeft />
              <span className="btn-label">Insert</span>
            </button>
            <button type="button" className="btn" onClick={saveSnippet} title={`Save to sandbox/${lang?.file} (⌘S)`} aria-label="Save snippet">
              <Save />
              <span className="btn-label">Save</span>
            </button>
          </>
        )}
        {running ? (
          <button type="button" className="btn btn-danger" onClick={stop} title="Stop (⌘.)">
            <Square />
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={run}
            disabled={!available}
            title={available ? "Run (⌘↵)" : `${lang?.bin} not found`}
          >
            <Play />
            Run <span className="kbd btn-label">⌘↵</span>
          </button>
        )}
        <button
          type="button"
          className="btn btn-icon"
          aria-expanded={open}
          aria-label={open ? "Collapse sandbox" : "Expand sandbox"}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown /> : <ChevronUp />}
        </button>
      </div>
      {open && (
        <div className="sandbox-body" ref={body}>
          {!available && lang && (
            <div className="missing" role="status">
              <TriangleAlert />
              <p>
                <code>{lang.bin}</code> isn't on your PATH, so {lang.label} snippets can't run. Install {INSTALL[language]}, or set
                its path in Settings → Toolchains. The other languages still work.
              </p>
            </div>
          )}
          <CodeMirror
            className="code-host"
            label={`Sandbox, ${lang?.label}`}
            value={code}
            onChange={setSnippet}
            extensions={CODE_EXTENSIONS}
            dynamic={LANG_EXT[language]}
            keys={keys}
            style={{ flex: `${split} 1 0` }}
          />
          <Splitter
            orientation="horizontal"
            value={split}
            onChange={setSplit}
            label="Resize editor and run log"
            controls="run-log"
          />
          <RunLog style={{ flex: `${1 - split} 1 0` }} />
        </div>
      )}
    </section>
  );
}
