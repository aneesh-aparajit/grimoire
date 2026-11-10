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

/**
 * An absolute path to `rel` (a vault-relative path with `/` separators)
 * inside the vault at `root`, using the separator `root` uses, so Windows
 * paths come out as `C:\vault\item\NOTES.md`.
 */
export function vaultFile(root: string, rel: string): string {
  const sep = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  return `${root.replace(/[\\/]+$/, "")}${sep}${rel.split("/").join(sep)}`;
}
