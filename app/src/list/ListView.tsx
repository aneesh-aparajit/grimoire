import { Command, FolderOpen, ListVideo, Plus, Search, Settings, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useApp } from "../app/store";
import { KindIcon } from "../components/KindIcon";
import { backend } from "../ipc";
import type { Item } from "../ipc/schemas";
import { clock, resumeAt, resumeVideo, videosOf } from "../lib/playlist";
import { matches, matchesPlaylist, parseQuery, tagCounts, toggleTag } from "../lib/search";
import { Peek } from "./Peek";
import { PlaylistPeek } from "./PlaylistPeek";
import { kbd } from "../lib/keys";
import { vaultFile } from "../lib/paths";

export function ListView() {
  const vault = useApp((s) => s.vault);
  const items = useApp((s) => s.items);
  const playlists = useApp((s) => s.playlists);
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

  const vaultState = useApp((s) => s.vaultState);
  const q = parseQuery(query);
  const filtering = query.trim().length > 0;
  const playlistOf = new Map(playlists.map((p) => [p.id, p]));
  const visible = items.filter((i) => matches(i, q, i.playlist ? playlistOf.get(i.playlist) : undefined));
  const loose = visible.filter((i) => !i.playlist);
  const pending = loose.filter((i) => !i.done);
  const done = loose.filter((i) => i.done);
  // A playlist is one row however many videos it has. A search by words also
  // lists the videos it found, under their playlist's row.
  const rows = playlists
    .map((p) => {
      const videos = videosOf(p, items);
      const hits = q.words.length > 0 ? visible.filter((i) => i.playlist === p.id) : [];
      const shown = matchesPlaylist(p, q) || visible.some((i) => i.playlist === p.id);
      const next = resumeVideo(videos, vaultState.playlistLast?.[p.id], vaultState.videoPositions);
      return { playlist: p, videos, hits, shown, next };
    })
    .filter((r) => r.shown);
  const openRows = rows.filter((r) => !r.playlist.done);
  const doneRows = rows.filter((r) => r.playlist.done);
  const withHits = (rs: typeof rows) => rs.flatMap((r) => [r.playlist.id, ...r.hits.map((h) => h.id)]);
  const ordered = [...pending.map((i) => i.id), ...withHits(openRows), ...done.map((i) => i.id), ...withHits(doneRows)];
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const selectedRow = rows.find((r) => r.playlist.id === selectedId) ?? null;
  const tags = tagCounts([...items.filter((i) => !i.playlist), ...playlists]);
  const shownCount = loose.length + rows.length;
  const totalCount = items.filter((i) => !i.playlist).length + playlists.length;

  // Keep a visible selection.
  useEffect(() => {
    if (!ordered.includes(selectedId ?? "")) select(ordered[0] ?? null);
  }, [query, items.length, playlists.length]);

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
      const ids = ordered;
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

  const row = (item: Item) => (
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

  const playlistRow = ({ playlist: p, hits, next }: (typeof rows)[number]) => {
    const pos = next ? vaultState.videoPositions?.[next.id] : undefined;
    const at = resumeAt(pos);
    const started = !!vaultState.playlistLast?.[p.id] || p.doneCount > 0;
    return (
      <li key={`pl:${p.id}`}>
        <div
          className="row row-playlist"
          data-id={p.id}
          aria-selected={p.id === selectedId}
          role="option"
          tabIndex={-1}
          onClick={() => select(p.id)}
          onDoubleClick={() => void openItem(p.id)}
          onKeyDown={() => {}}
        >
          <Progress done={p.doneCount} total={p.count} />
          <span className="row-kind">
            <ListVideo />
          </span>
          <span className="row-main">
            <span className="row-title">{p.title}</span>
            <span className="row-meta">
              <span className="row-count">
                {p.doneCount}/{p.count}
              </span>
              {p.done ? (
                <span>All watched</span>
              ) : (
                next && (
                  <span className="row-next" title={next.title}>
                    {started ? "Continue" : "Start"}: {next.title}
                    {at !== undefined && <span className="row-time"> · {clock(at)}</span>}
                  </span>
                )
              )}
              {p.tags.length > 0 && <span className="row-tags">{p.tags.map((t) => `#${t}`).join(" ")}</span>}
            </span>
          </span>
        </div>
        {hits.length > 0 && <ol className="row-hits">{hits.map((i) => row(i))}</ol>}
      </li>
    );
  };

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
          <span className="kbd hide-narrow">{kbd("F")}</span>
        </label>
        <div className="band-tools">
          <span
            className="vault-state hide-narrow"
            title={conflicted ? "INDEX.md has merge conflict markers" : "The list matches INDEX.md and updates when it changes on disk"}
          >
            <span className={conflicted ? "lamp amber" : "lamp"} aria-hidden="true" />
            {conflicted ? "Conflict" : "In sync"}
          </span>
          <button
            type="button"
            className="btn btn-icon hide-narrow"
            aria-label="Command palette"
            title={`Command palette (${kbd("K")})`}
            onClick={() => setDialog({ kind: "palette" })}
          >
            <Command />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Settings"
            title={`Settings (${kbd(",")})`}
            onClick={() => setDialog({ kind: "settings" })}
          >
            <Settings />
          </button>
          <button type="button" className="btn btn-add" onClick={() => setDialog({ kind: "add" })} title={`Add (${kbd("N")})`}>
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
            onClick={() => void backend.revealPath(vaultFile(vault?.root ?? "", "INDEX.md"))}
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

          {items.length === 0 && playlists.length === 0 ? (
            <div className="empty">
              <h2>Your reading list is empty</h2>
              <p>
                Add a blog post, a paper, a talk, a PDF or a whole YouTube playlist. It goes into <code>INDEX.md</code>{" "}
                as one line, and gets its own folder with a <code>NOTES.md</code> for your notes and a{" "}
                <code>sandbox/</code> for code. A playlist's folder gets a notes file per video.
              </p>
              <p>You can also drag a PDF onto this window, or edit INDEX.md by hand; Grimoire picks up the change.</p>
              <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: "add" })}>
                <Plus />
                Add the first item
              </button>
            </div>
          ) : shownCount === 0 ? (
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
              {pending.length + openRows.length > 0 && (
                <>
                  <h2 className="section-head">
                    <span className="label">To study</span>{" "}
                    <span className="count">{pending.length + openRows.length}</span>
                  </h2>
                  <ol>
                    {pending.map((i) => row(i))}
                    {openRows.map(playlistRow)}
                  </ol>
                </>
              )}
              {done.length + doneRows.length > 0 && (
                <>
                  <h2 className="section-head">
                    <span className="label">Done</span> <span className="count">{done.length + doneRows.length}</span>
                  </h2>
                  <ol>
                    {done.map((i) => row(i))}
                    {doneRows.map(playlistRow)}
                  </ol>
                </>
              )}
              {filtering && (
                <p className="list-foot">
                  Showing {shownCount} of {totalCount}
                </p>
              )}
            </div>
          )}
        </section>
        {selectedRow ? <PlaylistPeek row={selectedRow} /> : <Peek item={selected} />}
      </main>
    </div>
  );
}

/** A playlist's share of videos done, as a ring in the done lamp's place. */
function Progress({ done, total }: { done: number; total: number }) {
  const r = 6.5;
  const c = 2 * Math.PI * r;
  const f = total > 0 ? done / total : 0;
  return (
    <span className="progress" title={`${done} of ${total} videos done`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r={r} className="progress-track" />
        <circle
          cx="8"
          cy="8"
          r={r}
          className={f >= 1 ? "progress-fill full" : "progress-fill"}
          strokeDasharray={`${f * c} ${c}`}
          transform="rotate(-90 8 8)"
        />
      </svg>
    </span>
  );
}
