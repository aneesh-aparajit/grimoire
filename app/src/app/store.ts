import { create } from "zustand";
import { backend } from "../ipc";
import type { EffectiveConfig, Item, Toolchain, VaultSnapshot } from "../ipc/schemas";
import { errorMessage } from "../ipc/schemas";

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
};

export type Notice = { text: string; tone?: "info" | "error" };

type AppState = {
  phase: "boot" | "picker" | "ready";
  recent: string[];
  vault: { root: string; name: string } | null;
  items: Item[];
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
  openItem: (id: string) => Promise<void>;
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
    const last = typeof snap.state.lastOpenItem === "string" ? snap.state.lastOpenItem : null;
    set({
      phase: "ready",
      vault: { root: snap.root, name: snap.name },
      items: snap.index.items,
      conflicted: snap.index.conflicted,
      config: snap.config,
      vaultState: snap.state as VaultState,
      route: { view: "list" },
      selectedId: last && snap.index.items.some((i) => i.id === last) ? last : (snap.index.items[0]?.id ?? null),
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
      backend.on("index://changed", (s) => set({ items: s.items, conflicted: s.conflicted }));
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
      set({ phase: "picker", vault: null, items: [], recent, route: { view: "list" } });
    },

    openItem: async (id) => {
      try {
        await backend.itemEnsure(id);
        set({ route: { view: "item", id }, selectedId: id, dialog: null });
        void backend.statePatch({ lastOpenItem: id });
      } catch (e) {
        get().notify(errorMessage(e), "error");
      }
    },

    back: () => {
      void backend.contentHide();
      set({ route: { view: "list" } });
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
