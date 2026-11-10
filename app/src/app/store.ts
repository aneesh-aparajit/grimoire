import { create } from "zustand";
import { backend } from "../ipc";
import type { EffectiveConfig, Item, Playlist, Toolchain, VaultSnapshot } from "../ipc/schemas";
import { errorMessage } from "../ipc/schemas";
import { resumeVideo, type VideoPosition, videosOf } from "../lib/playlist";

export type Route = { view: "list" } | { view: "item"; id: string };
export type Dialog =
  | { kind: "add"; filePath?: string }
  | { kind: "edit"; id: string }
  | { kind: "delete"; id: string }
  | { kind: "settings" }
  | { kind: "palette" }
  | null;

export type VaultState = {
  lastOpenItem?: string;
  pdfPositions?: Record<string, { page: number; zoom: number }>;
  /** Per playlist, the video opened last. */
  playlistLast?: Record<string, string>;
  /** Per video, where playback was left. */
  videoPositions?: Record<string, VideoPosition>;
};

export type Notice = { text: string; tone?: "info" | "error" };

type AppState = {
  phase: "boot" | "picker" | "ready";
  recent: string[];
  vault: { root: string; name: string } | null;
  items: Item[];
  playlists: Playlist[];
  conflicted: boolean;
  config: EffectiveConfig | null;
  vaultState: VaultState;
  toolchains: Toolchain[];
  route: Route;
  query: string;
  selectedId: string | null;
  dialog: Dialog;
  notice: Notice | null;
  busy: string | null;

  boot: () => Promise<void>;
  openVault: (path: string) => Promise<void>;
  createVault: (path: string, lfs: boolean) => Promise<void>;
  closeVault: () => Promise<void>;
  /** Opens an item; a playlist's id opens the video to pick it up from. */
  openItem: (id: string) => Promise<void>;
  saveVideoPosition: (id: string, pos: VideoPosition) => void;
  back: () => void;
  setQuery: (q: string) => void;
  select: (id: string | null) => void;
  toggleDone: (id: string) => Promise<void>;
  setDialog: (d: Dialog) => void;
  notify: (text: string, tone?: Notice["tone"]) => void;
  refreshToolchains: () => Promise<void>;
  setConfig: (scope: "vault" | "local", path: string, value: unknown) => Promise<void>;
};

let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let booted = false;

export function applyConfig(c: EffectiveConfig | null) {
  const root = document.documentElement;
  const theme = new URLSearchParams(location.search).get("theme") ?? c?.config.theme ?? "system";
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  else delete root.dataset.theme;
  if (c) root.style.setProperty("--notes-size", `${c.config.editor.fontSize}px`);
}

export const useApp = create<AppState>((set, get) => {
  const loaded = (snap: VaultSnapshot) => {
    applyConfig(snap.config);
    const lastOpen = typeof snap.state.lastOpenItem === "string" ? snap.state.lastOpenItem : null;
    // The list shows a playlist as one row, so select that rather than a video.
    const lastItem = snap.index.items.find((i) => i.id === lastOpen);
    const last = lastItem?.playlist ?? lastOpen;
    const listed = (id: string) =>
      snap.index.playlists.some((p) => p.id === id) || snap.index.items.some((i) => i.id === id && !i.playlist);
    set({
      phase: "ready",
      vault: { root: snap.root, name: snap.name },
      items: snap.index.items,
      playlists: snap.index.playlists,
      conflicted: snap.index.conflicted,
      config: snap.config,
      vaultState: snap.state as VaultState,
      route: { view: "list" },
      selectedId: last && listed(last) ? last : (snap.index.items.find((i) => !i.playlist)?.id ?? snap.index.playlists[0]?.id ?? null),
      query: "",
      dialog: null,
    });
    if (snap.config.issues.length) {
      get().notify(`Some settings were ignored: ${snap.config.issues.join("; ")}`, "error");
    }
    void get().refreshToolchains();
  };

  return {
    phase: "boot",
    recent: [],
    vault: null,
    items: [],
    playlists: [],
    conflicted: false,
    config: null,
    vaultState: {},
    toolchains: [],
    route: { view: "list" },
    query: "",
    selectedId: null,
    dialog: null,
    notice: null,
    busy: null,

    boot: async () => {
      if (booted) return;
      booted = true;
      backend.on("index://changed", (s) => set({ items: s.items, playlists: s.playlists, conflicted: s.conflicted }));
      backend.on("config://changed", (c) => {
        applyConfig(c);
        set({ config: c });
      });
      const recent = await backend.vaultRecent().catch(() => []);
      set({ recent });
      const first = recent[0];
      if (first) {
        try {
          loaded(await backend.vaultOpen(first));
          return;
        } catch {
          /* fall through to the picker */
        }
      }
      set({ phase: "picker" });
    },

    openVault: async (path) => {
      set({ busy: "Opening vault…" });
      try {
        loaded(await backend.vaultOpen(path));
      } catch (e) {
        get().notify(errorMessage(e), "error");
      } finally {
        set({ busy: null });
      }
    },

    createVault: async (path, lfs) => {
      set({ busy: "Creating vault…" });
      try {
        loaded(await backend.vaultCreate(path, lfs));
      } catch (e) {
        get().notify(errorMessage(e), "error");
      } finally {
        set({ busy: null });
      }
    },

    closeVault: async () => {
      await backend.vaultClose();
      const recent = await backend.vaultRecent().catch(() => []);
      set({ phase: "picker", vault: null, items: [], playlists: [], recent, route: { view: "list" } });
    },

    openItem: async (target) => {
      const { items, playlists, vaultState } = get();
      const playlist = playlists.find((p) => p.id === target);
      const id = playlist ? resumeVideo(videosOf(playlist, items), vaultState.playlistLast?.[playlist.id], vaultState.videoPositions)?.id : target;
      if (!id) {
        get().notify("This playlist has no videos.", "error");
        return;
      }
      try {
        await backend.itemEnsure(id);
        const list = items.find((i) => i.id === id)?.playlist;
        const patch: VaultState = { lastOpenItem: id };
        if (list) patch.playlistLast = { [list]: id };
        set({
          route: { view: "item", id },
          selectedId: id,
          dialog: null,
          vaultState: list
            ? { ...get().vaultState, lastOpenItem: id, playlistLast: { ...get().vaultState.playlistLast, [list]: id } }
            : { ...get().vaultState, lastOpenItem: id },
        });
        void backend.statePatch(patch);
      } catch (e) {
        get().notify(errorMessage(e), "error");
      }
    },

    saveVideoPosition: (id, pos) => {
      const prev = get().vaultState.videoPositions?.[id];
      if (prev && Math.abs(prev.t - pos.t) < 1 && prev.d === pos.d) return;
      set({ vaultState: { ...get().vaultState, videoPositions: { ...get().vaultState.videoPositions, [id]: pos } } });
      void backend.statePatch({ videoPositions: { [id]: pos } });
    },

    back: () => {
      void backend.contentHide();
      // Back on the list, a playlist's video is shown by its playlist's row.
      const { selectedId, items } = get();
      const list = items.find((i) => i.id === selectedId)?.playlist;
      set({ route: { view: "list" }, ...(list ? { selectedId: list } : {}) });
    },

    setQuery: (query) => set({ query }),
    select: (selectedId) => set({ selectedId }),

    toggleDone: async (id) => {
      const item = get().items.find((i) => i.id === id);
      if (!item) return;
      // Optimistic; the index event (or the error) settles it.
      set({ items: get().items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) });
      try {
        await backend.itemUpdate(id, { done: !item.done });
      } catch (e) {
        set({ items: get().items.map((i) => (i.id === id ? { ...i, done: item.done } : i)) });
        get().notify(errorMessage(e), "error");
      }
    },

    setDialog: (dialog) => set({ dialog }),

    notify: (text, tone = "info") => {
      clearTimeout(noticeTimer);
      set({ notice: { text, tone } });
      noticeTimer = setTimeout(() => set({ notice: null }), tone === "error" ? 8000 : 3500);
    },

    refreshToolchains: async () => {
      try {
        set({ toolchains: await backend.toolchains() });
      } catch {
        /* keep the last known list */
      }
    },

    setConfig: async (scope, path, value) => {
      try {
        const c = await backend.configSet(scope, path, value);
        applyConfig(c);
        set({ config: c });
        if (path.startsWith("toolchains")) void get().refreshToolchains();
      } catch (e) {
        get().notify(errorMessage(e), "error");
      }
    },
  };
});
