import { ArrowLeft, FileText, Globe, PanelLeft, PanelRight, PlaySquare, TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import type { ContentKind } from "../mock/types";
import { ContentPane } from "./ContentPane";
import { NotesModule } from "./NotesModule";
import { SandboxModule } from "./SandboxModule";
import { Splitter } from "./Splitter";
import { useStudy } from "./store";

const KIND: Record<ContentKind, { icon: typeof Globe; label: string }> = {
  article: { icon: Globe, label: "Article" },
  video: { icon: PlaySquare, label: "Video" },
  pdf: { icon: FileText, label: "PDF" },
};

export function StudyView() {
  const fixture = useStudy((s) => s.fixture);
  const split = useStudy((s) => s.split);
  const setSplit = useStudy((s) => s.setSplit);
  const contentCollapsed = useStudy((s) => s.contentCollapsed);
  const notebookCollapsed = useStudy((s) => s.notebookCollapsed);
  const toggleContent = useStudy((s) => s.toggleContent);
  const toggleNotebook = useStudy((s) => s.toggleNotebook);
  const notice = useStudy((s) => s.notice);
  const dismissNotice = useStudy((s) => s.dismissNotice);
  const sandboxOpen = useStudy((s) => s.sandboxOpen);

  const { item } = fixture;
  const Kind = KIND[item.kind];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const s = useStudy.getState();
      if (mod && e.key === "Enter") {
        e.preventDefault();
        s.run();
      } else if (mod && e.key === ".") {
        e.preventDefault();
        s.stop();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        s.saveSnippet();
      } else if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        s.togglePreview();
      } else if (e.key === "Escape" && !e.defaultPrevented) {
        const inEditor = (e.target as HTMLElement | null)?.closest?.(".cm-editor");
        if (inEditor) (document.activeElement as HTMLElement | null)?.blur();
        else goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goBack = () => {
    // The reading list is M1. Until then, say where Esc will go.
    useStudy.setState({ notice: "Back to the reading list. (The list view arrives in M1.)" });
  };

  const openExternal = () => {
    window.open(item.source.startsWith("http") ? item.source : "about:blank", "_blank", "noopener");
  };

  const showContent = !contentCollapsed;
  const showNotebook = !notebookCollapsed;

  return (
    <div className="study">
      <header className="band">
        <button type="button" className="btn" onClick={goBack} title="Back to reading list (Esc)">
          <ArrowLeft />
          <span className="hide-narrow">Reading list</span>
        </button>
        <span className="band-divider" />
        <div className="band-item">
          <span className="band-kind" title={Kind.label}>
            <Kind.icon aria-label={Kind.label} />
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
          {item.done && <span className="stamp">Done</span>}
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

      {fixture.indexConflict ? (
        <div className="banner" role="alert">
          <TriangleAlert />
          <p>
            <code>INDEX.md</code> has merge conflict markers from <code>git pull</code>. Grimoire won't write to it until
            they're resolved, so tag and title edits are paused. Notes and the sandbox still save.
          </p>
          <button type="button" className="btn btn-outline">
            Open INDEX.md
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
            <ContentPane fixture={fixture} onOpenExternal={openExternal} />
          </section>
        ) : (
          <div className="rail">
            <button type="button" className="btn btn-icon" aria-label="Show source pane" onClick={toggleContent}>
              <Kind.icon />
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
            <NotesModule />
            <SandboxModule style={sandboxOpen ? { flex: "0 0 46%" } : undefined} />
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

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" className="btn btn-icon" aria-label="Dismiss" onClick={dismissNotice}>
            <X />
          </button>
        </div>
      )}
    </div>
  );
}
