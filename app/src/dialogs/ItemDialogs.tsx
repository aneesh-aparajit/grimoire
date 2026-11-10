import { FileText, Link2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/store";
import { Modal } from "../components/Modal";
import { backend } from "../ipc";
import { errorMessage } from "../ipc/schemas";
import { notesPath, playlistId, sandboxPath } from "../lib/paths";

const TAG_RE = /^[a-z0-9][a-z0-9_/-]*$/;

function parseTags(text: string): { tags: string[]; bad: string[] } {
  const tags: string[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/[\s,]+/)) {
    const t = raw.replace(/^#/, "").toLowerCase();
    if (!t) continue;
    if (TAG_RE.test(t)) {
      if (!tags.includes(t)) tags.push(t);
    } else bad.push(raw);
  }
  return { tags, bad };
}

function isUrl(s: string) {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function AddItemDialog({ filePath: initialFile }: { filePath?: string }) {
  const setDialog = useApp((s) => s.setDialog);
  const select = useApp((s) => s.select);
  const notify = useApp((s) => s.notify);
  const items = useApp((s) => s.items);
  const known = [...new Set(items.flatMap((i) => i.tags))].sort();
  const [mode, setMode] = useState<"url" | "pdf">(initialFile ? "pdf" : "url");
  const [url, setUrl] = useState("");
  const [filePath, setFilePath] = useState(initialFile ?? "");
  const [title, setTitle] = useState("");
  const [tagText, setTagText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [wholeList, setWholeList] = useState(false);

  const { tags, bad } = parseTags(tagText);
  // A /playlist link is always a playlist; a video link with &list= can be either.
  const list = mode === "url" && isUrl(url) ? playlistId(url) : null;
  const listOnly = list !== null && !/[?&]v=/.test(url) && !/youtu\.be\/[^/?]/.test(url);
  const asPlaylist = list !== null && (listOnly || wholeList);
  const urlError = touched && mode === "url" && url && !isUrl(url) ? "Enter a full link starting with https://" : null;
  const ready = !busy && bad.length === 0 && (mode === "url" ? isUrl(url) : Boolean(filePath)) && title.length <= 200;
  const close = () => setDialog(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      if (asPlaylist) {
        const p = await backend.playlistAdd({ url: url.trim(), title: title || undefined, tags });
        const first = useApp.getState().items.find((i) => i.playlist === p.id);
        if (first) select(first.id);
        notify(`Added ${p.title} · ${p.count} ${p.count === 1 ? "video" : "videos"} in ${p.id}/`);
        close();
        return;
      }
      const item = await backend.itemAdd(
        mode === "url" ? { url: url.trim(), title: title || undefined, tags } : { filePath, title: title || undefined, tags },
      );
      // The index event normally delivers this; don't depend on it.
      useApp.setState((s) => (s.items.some((i) => i.id === item.id) ? {} : { items: [...s.items, item] }));
      select(item.id);
      notify(`Added ${item.title}`);
      close();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Add to the reading list"
      onClose={close}
      footer={
        <>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-outline" onClick={close}>
            Cancel
          </button>
          <button type="submit" form="add-form" className="btn btn-primary" disabled={!ready}>
            {busy
              ? asPlaylist
                ? "Fetching playlist…"
                : mode === "url" && !title
                  ? "Fetching title…"
                  : "Adding…"
              : asPlaylist
                ? "Add playlist"
                : "Add"}
          </button>
        </>
      }
    >
      <form id="add-form" onSubmit={submit} className="form">
        <div className="seg seg-wide" role="tablist" aria-label="Source">
          <button type="button" role="tab" aria-selected={mode === "url"} aria-pressed={mode === "url"} onClick={() => setMode("url")}>
            <Link2 /> Link
          </button>
          <button type="button" role="tab" aria-selected={mode === "pdf"} aria-pressed={mode === "pdf"} onClick={() => setMode("pdf")}>
            <FileText /> PDF from disk
          </button>
        </div>

        {mode === "url" ? (
          <label className="field">
            <span className="label">Link</span>
            <input
              // biome-ignore lint/a11y/noAutofocus: the dialog exists to take this input.
              autoFocus
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={Boolean(urlError)}
              spellCheck={false}
            />
            <span className={urlError ? "hint hint-error" : "hint"}>
              {urlError ??
                (asPlaylist
                  ? "A YouTube playlist: it gets its own folder with an INDEX.md, and a numbered notes file per video."
                  : "Articles, YouTube and Vimeo videos and playlists, and PDF links all work.")}
            </span>
          </label>
        ) : null}
        {mode === "url" && list !== null && !listOnly ? (
          <label className="check-row">
            <input type="checkbox" checked={wholeList} onChange={(e) => setWholeList(e.target.checked)} />
            <span>This video is part of a playlist. Add the whole playlist instead.</span>
          </label>
        ) : null}
        {mode === "url" ? null : (
          <div className="field">
            <span className="label">PDF</span>
            <div className="file-pick">
              <span className="mono">{filePath ? filePath.split("/").pop() : "No file chosen"}</span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  const p = await backend.pickPdf();
                  if (p) setFilePath(p);
                }}
              >
                Choose…
              </button>
            </div>
            <span className="hint">
              Copied into the item's folder so it travels with the vault. Large PDFs bloat git; consider Git LFS.
            </span>
          </div>
        )}

        <label className="field">
          <span className="label">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              asPlaylist
                ? "Leave empty to use the playlist's title"
                : mode === "url"
                  ? "Leave empty to use the page's title"
                  : "Leave empty to use the PDF's title"
            }
            maxLength={200}
          />
        </label>

        <label className="field">
          <span className="label">Tags</span>
          <input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="#rust #async"
            list="known-tags"
            aria-invalid={bad.length > 0}
            spellCheck={false}
          />
          <datalist id="known-tags">
            {known.map((t) => (
              <option key={t} value={`#${t}`} />
            ))}
          </datalist>
          <span className={bad.length ? "hint hint-error" : "hint"}>
            {bad.length
              ? `${bad.join(", ")}: tags use a–z, 0–9 and - _ / only`
              : "Separate with spaces. Tags are stored lowercase."}
          </span>
        </label>
      </form>
    </Modal>
  );
}

export function EditItemDialog({ id }: { id: string }) {
  const item = useApp((s) => s.items.find((i) => i.id === id));
  const setDialog = useApp((s) => s.setDialog);
  const notify = useApp((s) => s.notify);
  const [title, setTitle] = useState(item?.title ?? "");
  const [source, setSource] = useState(item?.source ?? "");
  const [tagText, setTagText] = useState(item?.tags.map((t) => `#${t}`).join(" ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!item) return null;
  const { tags, bad } = parseTags(tagText);
  const local = !item.source.startsWith("http");
  const ready = !busy && title.trim() && bad.length === 0 && (local || isUrl(source));
  const close = () => setDialog(null);

  return (
    <Modal
      title="Edit item"
      onClose={close}
      footer={
        <>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-outline" onClick={close}>
            Cancel
          </button>
          <button type="submit" form="edit-form" className="btn btn-primary" disabled={!ready}>
            Save
          </button>
        </>
      }
    >
      <form
        id="edit-form"
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ready) return;
          setBusy(true);
          try {
            const updated = await backend.itemUpdate(id, {
              title: title.trim(),
              source: local ? undefined : source.trim(),
              tags,
            });
            useApp.setState((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
            notify("Saved to INDEX.md");
            close();
          } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span className="label">Title</span>
          {/* biome-ignore lint/a11y/noAutofocus: the dialog exists to take this input. */}
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          <span className="hint">
            {item.playlist ? (
              <>
                The notes file stays <code>{notesPath(item)}</code> even if the title changes.
              </>
            ) : (
              <>
                The folder stays <code>{item.id}/</code> even if the title changes.
              </>
            )}
          </span>
        </label>
        <label className="field">
          <span className="label">Source</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} disabled={local} spellCheck={false} />
          {local && <span className="hint">A local PDF inside the item folder.</span>}
        </label>
        <label className="field">
          <span className="label">Tags</span>
          <input value={tagText} onChange={(e) => setTagText(e.target.value)} aria-invalid={bad.length > 0} spellCheck={false} />
          {bad.length > 0 && <span className="hint hint-error">{bad.join(", ")}: tags use a–z, 0–9 and - _ / only</span>}
        </label>
      </form>
    </Modal>
  );
}

export function DeleteItemDialog({ id }: { id: string }) {
  const item = useApp((s) => s.items.find((i) => i.id === id));
  const playlist = useApp((s) => s.playlists.find((p) => p.id === id));
  const setDialog = useApp((s) => s.setDialog);
  const notify = useApp((s) => s.notify);
  const back = useApp((s) => s.back);
  const route = useApp((s) => s.route);
  const [withFolder, setWithFolder] = useState(false);
  const [busy, setBusy] = useState(false);
  const target = playlist ?? item;
  if (!target) return null;
  const close = () => setDialog(null);
  const video = item?.playlist ? item : null;
  const indexFile = video ? `${video.playlist}/INDEX.md` : "INDEX.md";
  // What "also delete" removes, as the user sees it on disk.
  const files = video ? notesPath(video) : `${id}/`;

  return (
    <Modal
      title={`Remove “${target.title}”?`}
      onClose={close}
      width="28rem"
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn btn-outline" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className={withFolder ? "btn btn-destroy" : "btn btn-primary"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await backend.itemDelete(id, withFolder);
                useApp.setState((s) => ({
                  items: s.items.filter((i) => i.id !== id && i.playlist !== (playlist ? id : undefined)),
                  playlists: playlist ? s.playlists.filter((p) => p.id !== id) : s.playlists,
                }));
                if (route.view === "item" && (route.id === id || route.id.startsWith(`${id}/`))) back();
                notify(withFolder ? `Removed ${target.title} and deleted ${files}` : `Removed ${target.title} from ${indexFile}`);
                close();
              } catch (e) {
                notify(errorMessage(e), "error");
                setBusy(false);
              }
            }}
          >
            {withFolder ? (video ? "Remove and delete notes" : "Remove and delete folder") : "Remove from list"}
          </button>
        </>
      }
    >
      <p className="prose">
        {playlist ? (
          <>
            This removes the playlist's line from <code>INDEX.md</code>. The folder <code>{id}/</code>, with its{" "}
            <code>INDEX.md</code> and the notes for all {playlist.count} videos, stays on disk unless you also delete it
            below.
          </>
        ) : video ? (
          <>
            This removes its line from <code>{indexFile}</code>. Its notes in <code>{files}</code> and snippets in{" "}
            <code>{sandboxPath(video)}</code> stay on disk unless you also delete them below.
          </>
        ) : (
          <>
            This removes its line from <code>INDEX.md</code>. The folder <code>{id}/</code> with your notes and snippets
            stays on disk unless you also delete it below.
          </>
        )}
      </p>
      <label className="check-row">
        <input type="checkbox" checked={withFolder} onChange={(e) => setWithFolder(e.target.checked)} />
        <span>
          {playlist ? (
            <>
              Also delete <code>{id}/</code> (every video's notes and snippets).
            </>
          ) : video ? (
            <>
              Also delete <code>{files}</code> and <code>{sandboxPath(video)}</code>.
            </>
          ) : (
            <>
              Also delete <code>{id}/</code> (NOTES.md, sandbox/ and any PDF).
            </>
          )}{" "}
          If the vault is in git, you can still recover it from history.
        </span>
      </label>
    </Modal>
  );
}
