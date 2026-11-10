import type { Item, Playlist } from "../ipc/schemas";

/** Where a video was left, per machine (`state.json`). `at` is when. */
export type VideoPosition = { t: number; d: number | null; at: number };

/** Positions this close to the end count as finished, so they start over. */
const END_SLACK_S = 20;

export function videosOf(playlist: Pick<Playlist, "id">, items: Item[]): Item[] {
  return items.filter((i) => i.playlist === playlist.id);
}

/** The video to pick up a playlist from: the one last opened if it isn't
 * done or watched to the end, else the next one not done after it, else the
 * first not done. */
export function resumeVideo(
  videos: Item[],
  lastId: string | undefined,
  positions: Record<string, VideoPosition> = {},
): Item | undefined {
  const at = lastId ? videos.findIndex((v) => v.id === lastId) : -1;
  const last = at >= 0 ? videos[at] : undefined;
  if (last && !last.done && !nearEnd(positions[last.id])) return last;
  const after = at >= 0 ? videos.slice(at + 1).find((v) => !v.done) : undefined;
  return after ?? videos.find((v) => !v.done) ?? last ?? videos[0];
}

function nearEnd(pos: VideoPosition | undefined): boolean {
  return !!pos?.d && pos.t > pos.d - END_SLACK_S;
}

/** Seconds to resume a video at, if it was left partway through. */
export function resumeAt(pos: VideoPosition | undefined): number | undefined {
  if (!pos || pos.t < 5) return undefined;
  if (nearEnd(pos)) return undefined;
  return Math.floor(pos.t);
}

/** 754 → "12:34", 4380 → "1:13:00". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
