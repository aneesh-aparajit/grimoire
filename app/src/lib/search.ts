import type { Item, Playlist } from "../ipc/schemas";

export type Query = { tags: string[]; words: string[]; state: "all" | "done" | "pending" };

/** `#rust #async tokio is:pending` → tags AND, words AND, optional state. */
export function parseQuery(q: string): Query {
  const out: Query = { tags: [], words: [], state: "all" };
  for (const raw of q.trim().split(/\s+/)) {
    const t = raw.toLowerCase();
    if (!t) continue;
    if (t.startsWith("#") && t.length > 1) out.tags.push(t.slice(1));
    else if (t === "is:done") out.state = "done";
    else if (t === "is:pending" || t === "is:todo") out.state = "pending";
    else out.words.push(t);
  }
  return out;
}

/** A playlist's videos also match on the playlist's title and tags. */
export function matches(item: Item, q: Query, playlist?: Playlist): boolean {
  if (q.state === "done" && !item.done) return false;
  if (q.state === "pending" && item.done) return false;
  const tags = playlist ? [...item.tags, ...playlist.tags] : item.tags;
  if (!q.tags.every((t) => tags.includes(t))) return false;
  const hay = `${item.title} ${item.origin} ${item.source} ${tags.join(" ")} ${playlist?.title ?? ""}`.toLowerCase();
  return q.words.every((w) => hay.includes(w));
}

export function toggleTag(query: string, tag: string): string {
  const parts = query.trim().split(/\s+/).filter(Boolean);
  const token = `#${tag}`;
  const has = parts.some((p) => p.toLowerCase() === token);
  return (has ? parts.filter((p) => p.toLowerCase() !== token) : [...parts, token]).join(" ") + (has ? "" : " ");
}

export function tagCounts(items: { tags: string[] }[]): [string, number][] {
  const m = new Map<string, number>();
  for (const i of items) for (const t of i.tags) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function relativeTime(ms: number | null | undefined): string {
  if (!ms) return "";
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
