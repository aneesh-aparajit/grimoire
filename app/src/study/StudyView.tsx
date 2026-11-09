import { ArrowLeft, Pencil, PanelLeft, PanelRight, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useApp } from "../app/store";
import { KindIcon } from "../components/KindIcon";
import { backend } from "../ipc";
import { ContentPane } from "./ContentPane";
import { NotesModule } from "./NotesModule";
import { SandboxModule } from "./SandboxModule";
import { Splitter } from "./Splitter";
import { useStudy } from "./store";

export function StudyView({ id }: { id: string }) {
  const item = useApp((s) => s.items.find((i) => i.id === id));
  const conflicted = useApp((s) => s.conflicted);
  const dialog = useApp((s) => s.dialog);
  const back = useApp((s) => s.back);
  const toggleDone = useApp((s) => s.toggleDone);
  const setDialog = useApp((s) => s.setDialog);
  const vaultRoot = useApp((s) => s.vault?.root ?? "");
  const open = useStudy((s) => s.open);
  const close = useStudy((s) => s.close);
  const flush = useStudy((s) => s.flush);
  const loadedId = useStudy((s) => s.item?.id);
  const split = useStudy((s) => s.split);
  const setSplit = useStudy((s) => s.setSplit);
  const contentCollapsed = useStudy((s) => s.contentCollapsed);
  const notebookCollapsed = useStudy((s) => s.notebookCollapsed);
  const toggleContent = useStudy((s) => s.toggleContent);
  const toggleNotebook = useStudy((s) => s.toggleNotebook);
  const sandboxOpen = useStudy((s) => s.sandboxOpen);
  const notebookSplit = useStudy((s) => s.notebookSplit);
  const setNotebookSplit = useStudy((s) => s.setNotebookSplit);

  // Load once per item; edits to the item (title, tags) don't reload notes.
  useEffect(() => {
    const it = useApp.getState().items.find((i) => i.id === id);
    if (it) void open(it);
    return () => close();
  }, [id]);

  useEffect(() => {
    if (item && loadedId === item.id) useStudy.setState({ item });
  }, [item]);

  const goBack = async () => {
    await flush();
    back();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useApp.getState().dialog) return;
      const mod = e.metaKey || e.ctrlKey;
      const s = useStudy.getState();
      if (mod && e.key === "Enter") {
        e.preventDefault();
        void s.run();
      } else if (mod && e.key === ".") {
        e.preventDefault();
        s.stop();
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void s.saveSnippet();
      } else if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        s.togglePreview();
      } else if (e.key === "Escape" && !e.defaultPrevented) {
        const target = e.target as HTMLElement | null;
        if (target?.closest?.(".cm-editor, input, textarea, select")) target.blur();
        else void goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!item) {
    return (
      <div className="study">
        <header className="band">
          <button type="button" className="btn" onClick={back}>
            <ArrowLeft />
            Reading list
          </button>
        </header>
        <div />
        <p className="empty-note">This item is no longer in INDEX.md. It may have been removed on another machine.</p>
      </div>
    );
  }

  const showContent = !contentCollapsed;
  const showNotebook = !notebookCollapsed;

  return (
    <div className="study">
      <header className="band">
        <button type="button" className="btn" onClick={() => void goBack()} title="Back to reading list (Esc)">
          <ArrowLeft />
          <span className="hide-narrow">Reading list</span>
        </button>
        <span className="band-divider" />
        <div className="band-item">
          <span className="band-kind">
            <KindIcon kind={item.kind} />
          </span>
          <h1 className="band-title" title={item.title}>
            {item.title}
          </h1>
          <span className="band-meta">
            <span className="origin">{item.origin}</span>
            <span>{item.tags.map((t) => `#${t}`).join(" ")}</span>
          </span>
        </div>
        <div className="band-tools">
          <button
            type="button"
            className="btn done-toggle"
            aria-pressed={item.done}
            onClick={() => void toggleDone(item.id)}
            title={item.done ? "Mark as not done" : "Mark as done"}
          >
            {item.done ? <span className="stamp stamp-pass">Done</span> : <span className="hide-narrow">Mark done</span>}
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Edit title, source and tags"
            title="Edit title, source and tags"
            onClick={() => setDialog({ kind: "edit", id: item.id })}
          >
            <Pencil />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Show source pane"
            aria-pressed={showContent}
            title={showContent ? "Hide the source and give notes the window" : "Show the source"}
            onClick={toggleContent}
          >
            <PanelLeft />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Show notebook pane"
            aria-pressed={showNotebook}
            title={showNotebook ? "Hide the notebook and read full width" : "Show the notebook"}
            onClick={toggleNotebook}
          >
            <PanelRight />
          </button>
        </div>
      </header>

      {conflicted ? (
        <div className="banner" role="alert">
          <TriangleAlert />
          <p>
            <code>INDEX.md</code> has merge conflict markers. Grimoire won't write to it until they're resolved, so tag
            and title edits are paused. Notes and the sandbox still save.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void backend.revealPath(`${vaultRoot}/INDEX.md`)}
          >
            Show INDEX.md
          </button>
        </div>
      ) : (
        <div />
      )}

      <main className="work">
        {showContent ? (
          <section
            id="content-pane"
            className="pane"
            aria-label="Source"
            style={showNotebook ? { width: `${split * 100}%` } : { flex: 1 }}
          >
            <ContentPane item={item} hidden={dialog !== null} />
          </section>
        ) : (
          <div className="rail">
            <button type="button" className="btn btn-icon" aria-label="Show source pane" onClick={toggleContent}>
              <KindIcon kind={item.kind} />
            </button>
            <span className="label rail-label">Source</span>
          </div>
        )}

        {showContent && showNotebook && (
          <Splitter
            orientation="vertical"
            value={split}
            onChange={setSplit}
            label="Resize source and notebook"
            controls="content-pane"
          />
        )}

        {showNotebook ? (
          <section className="pane notebook" aria-label="Notebook" style={{ flex: 1 }}>
            <NotesModule style={sandboxOpen ? { flex: `${notebookSplit} 1 0` } : undefined} />
            {sandboxOpen && (
              <Splitter
                orientation="horizontal"
                value={notebookSplit}
                onChange={setNotebookSplit}
                label="Resize notes and sandbox"
                controls="notes-module"
              />
            )}
            <SandboxModule style={sandboxOpen ? { flex: `${1 - notebookSplit} 1 0` } : undefined} />
          </section>
        ) : (
          <div className="rail right">
            <button type="button" className="btn btn-icon" aria-label="Show notebook pane" onClick={toggleNotebook}>
              <PanelRight />
            </button>
            <span className="label rail-label">Notebook</span>
          </div>
        )}
      </main>
    </div>
  );
}
