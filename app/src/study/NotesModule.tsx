import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { CodeMirror } from "./editor/CodeMirror";
import { entries, lintMarkdown, notesLint } from "./editor/notesExtensions";
import { notesTheme, syntax } from "./editor/theme";
import { useApp } from "../app/store";
import { useStudy } from "./store";

const BASE = [markdown({ base: markdownLanguage, codeLanguages: languages }), entries, syntax, notesTheme];
const WRAP_LINT = [...BASE, EditorView.lineWrapping, notesLint];
const WRAP = [...BASE, EditorView.lineWrapping];
const LINT = [...BASE, notesLint];

const SAVE_LABEL = { saved: "Saved", saving: "Saving…", dirty: "Edited", error: "Not saved" } as const;

export function NotesModule() {
  const id = useStudy((s) => s.item?.id ?? "");
  const loading = useStudy((s) => s.loading);
  const diskConflict = useStudy((s) => s.diskConflict);
  const resolveConflict = useStudy((s) => s.resolveConflict);
  const lintOn = useApp((s) => s.config?.config.lint.enabled ?? true);
  const notes = useStudy((s) => s.notes);
  const setNotes = useStudy((s) => s.setNotes);
  const saveState = useStudy((s) => s.saveState);
  const preview = useStudy((s) => s.preview);
  const togglePreview = useStudy((s) => s.togglePreview);
  const wrap = useApp((s) => s.config?.config.editor.lineWrap ?? true);
  const hints = lintOn ? lintMarkdown(notes).length : 0;

  return (
    <section className="notes" aria-label="Notes">
      <div className="head">
        <span className="head-file" title={`${id}/NOTES.md`}>
          {id}/<b>NOTES.md</b>
        </span>
        <span className="spacer" />
        {hints > 0 && !preview && (
          <span className="lint-count" title="Lint hints never block saving">
            {hints} {hints === 1 ? "hint" : "hints"}
          </span>
        )}
        <span className="save-state" data-state={saveState} aria-live="polite">
          {SAVE_LABEL[saveState]}
        </span>
        <div className="seg" role="group" aria-label="Notes view">
          <button type="button" aria-pressed={!preview} onClick={() => preview && togglePreview()}>
            Source
          </button>
          <button type="button" aria-pressed={preview} onClick={() => !preview && togglePreview()} title="⌘P">
            Preview
          </button>
        </div>
      </div>
      {diskConflict !== null && (
        <div className="banner" role="alert">
          <p>NOTES.md changed on disk while you were editing.</p>
          <button type="button" className="btn btn-outline" onClick={() => resolveConflict(false)}>
            Load disk version
          </button>
          <button type="button" className="btn btn-outline" onClick={() => resolveConflict(true)}>
            Keep mine
          </button>
        </div>
      )}
      {loading ? (
        <div className="editor-host" />
      ) : preview ? (
        <div className="preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {notes}
          </ReactMarkdown>
        </div>
      ) : (
        <CodeMirror
          key={`${id}-${wrap}-${lintOn}`}
          className="editor-host"
          label="NOTES.md"
          value={notes}
          onChange={setNotes}
          extensions={wrap ? (lintOn ? WRAP_LINT : WRAP) : lintOn ? LINT : BASE}
        />
      )}
    </section>
  );
}
