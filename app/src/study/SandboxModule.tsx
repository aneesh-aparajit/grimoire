import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import type { Extension } from "@codemirror/state";
import { lineNumbers } from "@codemirror/view";
import { ChevronDown, ChevronUp, CornerDownLeft, Play, Save, Square, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/store";
import { type Language, LANGUAGES } from "../ipc/schemas";
import { CodeMirror } from "./editor/CodeMirror";
import { codeTheme, syntax } from "./editor/theme";
import { RunLog } from "./RunLog";
import { Splitter } from "./Splitter";
import { sandboxPath } from "../lib/paths";
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

export function SandboxModule({ style }: { style?: React.CSSProperties }) {
  const dir = useStudy((s) => (s.item ? sandboxPath(s.item) : ""));
  const open = useStudy((s) => s.sandboxOpen);
  const setOpen = useStudy((s) => s.setSandboxOpen);
  const language = useStudy((s) => s.language);
  const setLanguage = useStudy((s) => s.setLanguage);
  const code = useStudy((s) => s.snippets[s.language] ?? "");
  const setSnippet = useStudy((s) => s.setSnippet);
  const stdin = useStudy((s) => s.stdin);
  const setStdin = useStudy((s) => s.setStdin);
  const saved = useStudy((s) => s.savedSnippets);
  const loadSnippet = useStudy((s) => s.loadSnippet);
  const runs = useStudy((s) => s.runs);
  const run = useStudy((s) => s.run);
  const stop = useStudy((s) => s.stop);
  const saveSnippet = useStudy((s) => s.saveSnippet);
  const insertRun = useStudy((s) => s.insertRun);
  const split = useStudy((s) => s.sandboxSplit);
  const setSplit = useStudy((s) => s.setSandboxSplit);
  const toolchains = useApp((s) => s.toolchains);
  const [showStdin, setShowStdin] = useState(false);

  const lang = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0];
  const tc = toolchains.find((t) => t.language === language);
  const available = !tc || Boolean(tc.path);
  const last = runs.at(-1);
  const running = last?.status === "running";
  const isSaved = lang ? saved.includes(lang.file) : false;

  const keys = [
    { key: "Mod-Enter", run: () => (void run(), true) },
    { key: "Mod-.", run: () => (stop(), true) },
    { key: "Mod-s", run: () => (void saveSnippet(), true), preventDefault: true },
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
          onChange={(e) => void setLanguage(e.target.value as Language)}
        >
          {LANGUAGES.map((l) => {
            const t = toolchains.find((x) => x.language === l.id);
            return (
              <option key={l.id} value={l.id}>
                {l.label}
                {t && !t.path ? " (not found)" : ""}
              </option>
            );
          })}
        </select>
        {open ? (
          saved.length > 0 ? (
            <select
              className="select head-file-select"
              aria-label="Saved snippets"
              value={isSaved ? lang?.file : ""}
              onChange={(e) => e.target.value && void loadSnippet(e.target.value)}
              title={dir}
            >
              {!isSaved && <option value="">{lang?.file} · unsaved</option>}
              {saved.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          ) : (
            <span className="head-file">
              <b>{lang?.file}</b> · unsaved
            </span>
          )
        ) : (
          last && (
            <span className="last-run">
              <span className="mono">
                {last.status === "ok" ? "exit 0" : last.status === "error" ? `exit ${last.exitCode ?? "?"}` : last.status}
              </span>
            </span>
          )
        )}
        <span className="spacer" />
        {open && (
          <>
            <button
              type="button"
              className="btn hide-narrow"
              aria-pressed={showStdin}
              onClick={() => setShowStdin(!showStdin)}
              title="Text fed to the program's standard input"
            >
              stdin
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => insertRun()}
              title="Insert the snippet into NOTES.md"
              aria-label="Insert into notes"
            >
              <CornerDownLeft />
              <span className="btn-label">Insert into notes</span>
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void saveSnippet()}
              title={`Save to ${dir}${lang?.file} (⌘S)`}
              aria-label="Save snippet"
            >
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
            onClick={() => void run()}
            disabled={!available}
            title={available ? "Run (⌘↵)" : `${lang?.bin} not found`}
          >
            <Play />
            Run <span className="kbd">⌘↵</span>
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
        <div className="sandbox-body">
          {!available && lang && (
            <div className="missing" role="status">
              <TriangleAlert />
              <p>
                <code>{lang.bin}</code> isn't on your PATH, so {lang.label} snippets can't run. Install {lang.install}, or
                set its path in Settings → Toolchains. The other languages still work.
              </p>
            </div>
          )}
          {showStdin && (
            <textarea
              className="stdin"
              aria-label="Standard input"
              placeholder="Input passed to the program on stdin"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={3}
            />
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
            label="Resize editor and output"
            controls="run-log"
          />
          <RunLog style={{ flex: `${1 - split} 1 0` }} />
        </div>
      )}
    </section>
  );
}
