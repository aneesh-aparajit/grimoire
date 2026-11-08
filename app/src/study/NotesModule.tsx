import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { CodeMirror } from "./editor/CodeMirror";
import { entries, lintMarkdown, notesLint } from "./editor/notesExtensions";
import { notesTheme, syntax } from "./editor/theme";
import { useStudy } from "./store";

const NOTES_EXTENSIONS = [
  markdown({ codeLanguages: languages }),
  EditorView.lineWrapping,
  entries,
  notesLint,
  syntax,
  notesTheme,
];

const SAVE_LABEL = { saved: "Saved", saving: "Saving…", dirty: "Edited" } as const;

export function NotesModule() {
  const id = useStudy((s) => s.fixture.item.id);
  const notes = useStudy((s) => s.notes);
  const setNotes = useStudy((s) => s.setNotes);
  const saveState = useStudy((s) => s.saveState);
  const preview = useStudy((s) => s.preview);
  const togglePreview = useStudy((s) => s.togglePreview);
  const hints = lintMarkdown(notes).length;

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
      {preview ? (
        <div className="preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {notes}
          </ReactMarkdown>
        </div>
      ) : (
        <CodeMirror
          key={id}
          className="editor-host"
          label="NOTES.md"
          value={notes}
          onChange={setNotes}
          extensions={NOTES_EXTENSIONS}
        />
      )}
    </section>
  );
}
