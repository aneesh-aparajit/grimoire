import { Command, FolderOpen, Plus, Search, Settings, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useApp } from "../app/store";
import { KindIcon } from "../components/KindIcon";
import { backend } from "../ipc";
import type { Item } from "../ipc/schemas";
import { matches, parseQuery, tagCounts, toggleTag } from "../lib/search";
import { Peek } from "./Peek";

export function ListView() {
  const vault = useApp((s) => s.vault);
  const items = useApp((s) => s.items);
  const conflicted = useApp((s) => s.conflicted);
  const query = useApp((s) => s.query);
  const setQuery = useApp((s) => s.setQuery);
  const selectedId = useApp((s) => s.selectedId);
  const select = useApp((s) => s.select);
  const openItem = useApp((s) => s.openItem);
  const toggleDone = useApp((s) => s.toggleDone);
  const setDialog = useApp((s) => s.setDialog);
  const search = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const q = parseQuery(query);
  const visible = items.filter((i) => matches(i, q));
  const pending = visible.filter((i) => !i.done);
  const done = visible.filter((i) => i.done);
  const ordered = [...pending, ...done];
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const tags = tagCounts(items);
  const filtering = query.trim().length > 0;

  // Keep a visible selection.
  useEffect(() => {
    if (!ordered.some((i) => i.id === selectedId)) select(ordered[0]?.id ?? null);
  }, [query, items.length]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId ?? "")}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useApp.getState().dialog) return;
      const mod = e.metaKey || e.ctrlKey;
      const inField = (e.target as HTMLElement)?.closest?.("input, textarea, select");
      if ((mod && e.key.toLowerCase() === "f") || (!inField && e.key === "/")) {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setDialog({ kind: "add" });
        return;
      }
      const ids = ordered.map((i) => i.id);
      const at = ids.indexOf(useApp.getState().selectedId ?? "");
      if (e.key === "ArrowDown" || (!inField && e.key === "j")) {
        e.preventDefault();
        select(ids[Math.min(ids.length - 1, at + 1)] ?? null);
      } else if (e.key === "ArrowUp" || (!inField && e.key === "k")) {
        e.preventDefault();
        select(ids[Math.max(0, at - 1)] ?? null);
      } else if (e.key === "Enter" && !e.isComposing) {
        const id = useApp.getState().selectedId;
        if (id && (!inField || (e.target as HTMLElement) === search.current)) {
          e.preventDefault();
          void openItem(id);
        }
      } else if (!inField && e.key === "x") {
        const id = useApp.getState().selectedId;
        if (id) void toggleDone(id);
      } else if (!inField && (e.key === "Backspace" || e.key === "Delete") && mod) {
        const id = useApp.getState().selectedId;
        if (id) setDialog({ kind: "delete", id });
      } else if (e.key === "Escape" && (e.target as HTMLElement) === search.current) {
        if (query) setQuery("");
        else search.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Drop a PDF anywhere on the list to add it.
  useEffect(() => backend.on("drop://pdf", ({ paths }) => setDialog({ kind: "add", filePath: paths[0] })), []);

  const row = (item: Item, n: number) => (
    <li key={item.id}>
      <div
        className="row"
        data-id={item.id}
        aria-selected={item.id === selectedId}
        role="option"
        tabIndex={-1}
        onClick={() => select(item.id)}
        onDoubleClick={() => void openItem(item.id)}
        onKeyDown={() => {}}
      >
        <input
          type="checkbox"
          className="check"
          checked={item.done}
          aria-label={item.done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
          onChange={() => void toggleDone(item.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="row-no">{String(n).padStart(2, "0")}</span>
        <span className="row-kind">
          <KindIcon kind={item.kind} />
        </span>
        <span className="row-main">
          <span className="row-title">{item.title}</span>
          <span className="row-meta">
            <span>{item.origin}</span>
            {item.tags.length > 0 && <span className="row-tags">{item.tags.map((t) => `#${t}`).join(" ")}</span>}
          </span>
        </span>
      </div>
    </li>
  );

  return (
    <div className="listview">
      <header className="band">
        <span className="wordmark">grimoire</span>
        <button
          type="button"
          className="vault-name"
          title={`${vault?.root} · switch vault`}
          onClick={() => void useApp.getState().closeVault()}
        >
          <FolderOpen />
          <span>{vault?.name}</span>
        </button>
        <span className="band-divider" />
        <label className="band-search">
          <Search />
          <input
            ref={search}
            type="search"
            aria-label="Search the reading list"
            placeholder="Search, or filter with #tag and is:done"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
          {query && (
            <button type="button" className="clear" aria-label="Clear search" onClick={() => setQuery("")}>
              <X />
            </button>
          )}
          <span className="kbd hide-narrow">⌘F</span>
        </label>
        <div className="band-tools">
          <button
            type="button"
            className="btn btn-icon hide-narrow"
            aria-label="Command palette"
            title="Command palette (⌘K)"
            onClick={() => setDialog({ kind: "palette" })}
          >
            <Command />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Settings"
            title="Settings (⌘,)"
            onClick={() => setDialog({ kind: "settings" })}
          >
            <Settings />
          </button>
          <button type="button" className="btn btn-add" onClick={() => setDialog({ kind: "add" })} title="Add (⌘N)">
            <Plus />
            Add
          </button>
        </div>
      </header>

      {conflicted ? (
        <div className="banner" role="alert">
          <TriangleAlert />
          <p>
            <code>INDEX.md</code> has merge conflict markers. The list is read-only until you resolve them; Grimoire won't
            overwrite the file.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void backend.revealPath(`${vault?.root}/INDEX.md`)}
          >
            Show INDEX.md
          </button>
        </div>
      ) : (
        <div />
      )}

      <main className="list-work">
        <section className="list-pane" aria-label="Reading list">
          {tags.length > 0 && (
            <div className="tagbar" role="group" aria-label="Filter by tag">
              {tags.map(([t, n]) => (
                <button
                  type="button"
                  key={t}
                  className="tag"
                  aria-pressed={q.tags.includes(t)}
                  onClick={() => setQuery(toggleTag(query, t))}
                >
                  #{t} <span>{n}</span>
                </button>
              ))}
            </div>
          )}

          {items.length === 0 ? (
            <div className="empty">
              <h2>Your reading list is empty</h2>
              <p>
                Add a blog post, a paper, a talk or a PDF. It goes into <code>INDEX.md</code> as one line, and gets its
                own folder with a <code>NOTES.md</code> for your notes and a <code>sandbox/</code> for code.
              </p>
              <p>You can also drag a PDF onto this window, or edit INDEX.md by hand; Grimoire picks up the change.</p>
              <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: "add" })}>
                <Plus />
                Add the first item
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="empty">
              <h2>Nothing matches</h2>
              <p>
                No items match <code>{query.trim()}</code>. Tags combine, so every tag you pick must be on the item.
              </p>
              <button type="button" className="btn btn-outline" onClick={() => setQuery("")}>
                Clear the search
              </button>
            </div>
          ) : (
            <div className="rows" ref={listRef} role="listbox" aria-label="Items" aria-activedescendant={selectedId ?? undefined}>
              {pending.length > 0 && (
                <>
                  <h2 className="section-head">
                    <span className="label">To study</span> <span className="count">{pending.length}</span>
                  </h2>
                  <ol>{pending.map((i, n) => row(i, n + 1))}</ol>
                </>
              )}
              {done.length > 0 && (
                <>
                  <h2 className="section-head">
                    <span className="label">Done</span> <span className="count">{done.length}</span>
                  </h2>
                  <ol>{done.map((i, n) => row(i, pending.length + n + 1))}</ol>
                </>
              )}
              {filtering && (
                <p className="list-foot">
                  Showing {visible.length} of {items.length}
                </p>
              )}
            </div>
          )}
        </section>
        <Peek item={selected} />
      </main>
    </div>
  );
}
