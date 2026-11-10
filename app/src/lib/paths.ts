import type { Item } from "../ipc/schemas";

/** Where an item's notes live, relative to the vault. */
export function notesPath(item: Pick<Item, "id" | "playlist">): string {
  return item.playlist ? `${item.id}.md` : `${item.id}/NOTES.md`;
}

/** Where an item's saved snippets live, relative to the vault. */
export function sandboxPath(item: Pick<Item, "id" | "playlist">): string {
  if (!item.playlist) return `${item.id}/sandbox/`;
  const [dir, video] = item.id.split("/");
  return `${dir}/sandbox/${video}/`;
}

/** The YouTube playlist id in a link, if it has one. */
export function playlistId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (!["youtube.com", "music.youtube.com", "youtu.be"].includes(host)) return null;
    const list = u.searchParams.get("list");
    return list && /^[A-Za-z0-9_-]+$/.test(list) ? list : null;
  } catch {
    return null;
  }
}
