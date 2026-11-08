import { ArrowRight, ExternalLink, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../app/store";
import { KindIcon, kindLabel } from "../components/KindIcon";
import { backend } from "../ipc";
import type { Item, NotesSummary } from "../ipc/schemas";
import { relativeTime } from "../lib/search";

export function Peek({ item }: { item: Item | null }) {
  const [summary, setSummary] = useState<NotesSummary | null>(null);
  const openItem = useApp((s) => s.openItem);
  const toggleDone = useApp((s) => s.toggleDone);
  const setDialog = useApp((s) => s.setDialog);
  const root = useApp((s) => s.vault?.root ?? "");

  useEffect(() => {
    setSummary(null);
    if (!item) return;
    let live = true;
    const t = setTimeout(async () => {
      const s = await backend.notesSummary(item.id).catch(() => null);
      if (live) setSummary(s);
    }, 60);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [item?.id]);

  if (!item) {
    return (
      <aside className="peek peek-empty" aria-label="Selected item">
        <p>Select an item to see its notebook.</p>
      </aside>
    );
  }

  const isUrl = item.source.startsWith("http");

  return (
    <aside className="peek" aria-label="Selected item">
      <div className="peek-head">
        <div className="peek-kind">
          <KindIcon kind={item.kind} />
          <span>{kindLabel(item.kind)}</span>
          <span aria-hidden="true">·</span>
          <span>{item.origin}</span>
          {item.done && <span className="stamp stamp-pass">Done</span>}
        </div>
        <h2 className="peek-title">{item.title}</h2>
        <p className="peek-source mono" title={item.source}>
          {item.source}
        </p>
        {item.tags.length > 0 && <p className="peek-tags">{item.tags.map((t) => `#${t}`).join("  ")}</p>}
        <div className="peek-actions">
          <button type="button" className="btn btn-primary" onClick={() => void openItem(item.id)}>
            Open <ArrowRight />
            <span className="kbd">↵</span>
          </button>
          <button type="button" className="btn btn-outline" onClick={() => void toggleDone(item.id)}>
            {item.done ? "Mark not done" : "Mark done"}
          </button>
          <span className="spacer" />
          {isUrl && (
            <button
              type="button"
              className="btn btn-icon"
              aria-label="Open in browser"
              title="Open in browser"
              onClick={() => void backend.openExternal(item.source)}
            >
              <ExternalLink />
            </button>
          )}
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Show folder"
            title={`Show ${item.id}/ in Finder`}
            onClick={() => void backend.revealPath(`${root}/${item.id}/NOTES.md`)}
          >
            <FolderOpen />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Edit"
            title="Edit title, source and tags"
            onClick={() => setDialog({ kind: "edit", id: item.id })}
          >
            <Pencil />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Delete"
            title="Remove from the list"
            onClick={() => setDialog({ kind: "delete", id: item.id })}
          >
            <Trash2 />
          </button>
        </div>
      </div>

      <section className="peek-block" aria-label="Notebook entries">
        <h3 className="peek-label">
          <span className="label">Entries</span>
          {summary && (
            <span className="peek-aside">
              {summary.words} words{summary.modified ? ` · edited ${relativeTime(summary.modified)}` : ""}
            </span>
          )}
        </h3>
        {!summary ? (
          <p className="peek-quiet">…</p>
        ) : summary.entries.length === 0 ? (
          <p className="peek-quiet">
            No entries yet. Each <code>##</code> heading in NOTES.md becomes a numbered entry.
          </p>
        ) : (
          <ol className="entries">
            {summary.entries.map((e, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: headings can repeat.
              <li key={i}>
                <span className="entry-no">E-{String(i + 1).padStart(2, "0")}</span>
                <span>{e}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {summary && summary.snippets.length > 0 && (
        <section className="peek-block" aria-label="Saved snippets">
          <h3 className="peek-label">
            <span className="label">Sandbox</span>
            <span className="peek-aside mono">sandbox/{summary.snippets.join(", ")}</span>
          </h3>
        </section>
      )}
    </aside>
  );
}
