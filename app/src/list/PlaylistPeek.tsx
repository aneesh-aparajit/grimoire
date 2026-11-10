import { ArrowRight, ExternalLink, FolderOpen, ListVideo, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useApp } from "../app/store";
import { backend } from "../ipc";
import type { Item, Playlist } from "../ipc/schemas";
import { clock, resumeAt } from "../lib/playlist";
import { relativeTime } from "../lib/search";
import { FILE_MANAGER } from "../lib/keys";
import { vaultFile } from "../lib/paths";

type Row = { playlist: Playlist; videos: Item[]; next: Item | undefined };

/** The selected playlist: where to pick it up, and every video in it. The
 * list keeps a playlist to one row; this is where its videos are browsed. */
export function PlaylistPeek({ row: { playlist: p, videos, next } }: { row: Row }) {
  const openItem = useApp((s) => s.openItem);
  const toggleDone = useApp((s) => s.toggleDone);
  const setDialog = useApp((s) => s.setDialog);
  const root = useApp((s) => s.vault?.root ?? "");
  const positions = useApp((s) => s.vaultState.videoPositions);
  const lastId = useApp((s) => s.vaultState.playlistLast?.[p.id]);
  const list = useRef<HTMLOListElement>(null);

  const at = next ? resumeAt(positions?.[next.id]) : undefined;
  const started = !!lastId || p.doneCount > 0;
  const lastSeen = lastId ? positions?.[lastId]?.at : undefined;

  // Bring the video to resume into view in a long list.
  useEffect(() => {
    list.current?.querySelector<HTMLElement>("[data-next]")?.scrollIntoView({ block: "center" });
  }, [p.id]);

  return (
    <aside className="peek" aria-label="Selected playlist">
      <div className="peek-head">
        <div className="peek-kind">
          <ListVideo />
          <span>YouTube playlist</span>
          <span aria-hidden="true">·</span>
          <span>
            {p.count} video{p.count === 1 ? "" : "s"}
          </span>
          {p.done && <span className="stamp stamp-pass">Done</span>}
        </div>
        <h2 className="peek-title">{p.title}</h2>
        <p className="peek-source mono" title={p.source}>
          {p.source}
        </p>
        {p.tags.length > 0 && <p className="peek-tags">{p.tags.map((t) => `#${t}`).join("  ")}</p>}
        <div className="peek-actions">
          <button
            type="button"
            className="btn btn-on"
            disabled={!next}
            onClick={() => void openItem(p.id)}
            title={next ? `Open ${next.title}` : undefined}
          >
            {p.done ? "Open" : started ? "Continue" : "Start"} <ArrowRight />
            <span className="kbd">↵</span>
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Open in browser"
            title="Open the playlist in the browser"
            onClick={() => void backend.openExternal(p.source)}
          >
            <ExternalLink />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Show folder"
            title={`Show ${p.id}/ in ${FILE_MANAGER}`}
            onClick={() => void backend.revealPath(vaultFile(root, `${p.id}/INDEX.md`))}
          >
            <FolderOpen />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Edit"
            title="Edit title and tags"
            onClick={() => setDialog({ kind: "edit", id: p.id })}
          >
            <Pencil />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Delete"
            title="Remove the playlist"
            onClick={() => setDialog({ kind: "delete", id: p.id })}
          >
            <Trash2 />
          </button>
        </div>
      </div>

      <dl className="peek-spec" aria-label="Progress">
        <dt>Up next</dt>
        <dd title={next?.title}>
          {next ? (
            <span className="peek-next">
              {next.title}
              {at !== undefined && <span className="mono"> · from {clock(at)}</span>}
            </span>
          ) : (
            "Nothing left"
          )}
        </dd>
        <dt>Watched</dt>
        <dd>
          <span className="meter" aria-hidden="true">
            <span style={{ width: `${p.count ? (p.doneCount / p.count) * 100 : 0}%` }} />
          </span>
          {p.doneCount} of {p.count}
          {lastSeen ? ` · last ${relativeTime(lastSeen)}` : ""}
        </dd>
        <dt>Folder</dt>
        <dd className="mono">{p.id}/</dd>
      </dl>

      <section className="peek-block" aria-label="Videos">
        <h3 className="peek-label">
          <span className="label">Videos</span>
        </h3>
        <ol className="videos" ref={list}>
          {videos.map((v, n) => {
            const t = resumeAt(positions?.[v.id]);
            const isNext = v.id === next?.id;
            return (
              <li key={v.id} data-next={isNext || undefined} className={isNext ? "is-next" : undefined}>
                <input
                  type="checkbox"
                  className="check"
                  checked={v.done}
                  aria-label={v.done ? `Mark ${v.title} as not done` : `Mark ${v.title} as done`}
                  onChange={() => void toggleDone(v.id)}
                />
                <button type="button" className="video-open" onClick={() => void openItem(v.id)} title={`Open ${v.title}`}>
                  <span className="video-n mono">{n + 1}</span>
                  <span className="video-title">{v.title}</span>
                  {t !== undefined && !v.done && <span className="video-at mono">{clock(t)}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </aside>
  );
}
