import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { z } from "zod";
import type { Backend, Events } from "./backend";
import {
  EffectiveConfigSchema,
  ExitEventSchema,
  IndexSnapshotSchema,
  ItemSchema,
  NotesSummarySchema,
  OutputEventSchema,
  PlaylistSchema,
  RunSchema,
  ToolchainSchema,
  VaultSnapshotSchema,
} from "./schemas";

class IpcContractError extends Error {}

async function call<T>(cmd: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  const raw = await invoke(cmd, args);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`IPC contract broken for ${cmd}`, parsed.error);
    throw new IpcContractError(`Unexpected response from ${cmd}`);
  }
  return parsed.data;
}

const Void = z.unknown().transform(() => undefined);

const EVENT_SCHEMAS: { [K in keyof Events]?: z.ZodType<Events[K]> } = {
  "index://changed": IndexSnapshotSchema,
  "config://changed": EffectiveConfigSchema,
  "sandbox://output": OutputEventSchema,
  "sandbox://exit": ExitEventSchema,
};

export const tauriBackend: Backend = {
  mock: false,
  vaultRecent: () => call("vault_recent", {}, z.array(z.string())),
  vaultOpen: (path) => call("vault_open", { path }, VaultSnapshotSchema),
  vaultCreate: (path, lfs) => call("vault_create", { path, lfs }, VaultSnapshotSchema),
  vaultClose: () => call("vault_close", {}, Void),
  pickFolder: async (title) => {
    const r = await open({ directory: true, multiple: false, title });
    return typeof r === "string" ? r : null;
  },
  pickPdf: async () => {
    const r = await open({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    return typeof r === "string" ? r : null;
  },

  itemAdd: (input) => call("item_add", { input }, ItemSchema),
  playlistAdd: (input) => call("playlist_add", { input }, PlaylistSchema),
  itemUpdate: (id, patch) => call("item_update", { id, patch }, ItemSchema),
  itemDelete: (id, deleteFolder) => call("item_delete", { id, deleteFolder }, Void),
  itemEnsure: (id) => call("item_ensure", { id }, ItemSchema),

  notesRead: (id) => call("notes_read", { id }, z.string()),
  notesWrite: (id, content) => call("notes_write", { id, content }, Void),
  notesSummary: (id) => call("notes_summary", { id }, NotesSummarySchema),

  configSet: (scope, path, value) => call("config_set", { scope, path, value }, EffectiveConfigSchema),
  statePatch: (patch) => call("state_patch", { patch }, Void),
  runsGet: (id) => call("runs_get", { id }, z.array(RunSchema).catch([])),
  runsAppend: (id, run) => call("runs_append", { id, run }, Void),

  toolchains: () => call("toolchains_list", {}, z.array(ToolchainSchema)),
  sandboxRun: (language, code, stdin) => call("sandbox_run", { language, code, stdin }, z.number()),
  sandboxStop: (runId) => call("sandbox_stop", { runId }, Void),
  sandboxSave: (id, language, code) => call("sandbox_save", { id, language, code }, z.string()),
  sandboxList: (id) => call("sandbox_list", { id }, z.array(z.string())),
  sandboxLoad: (id, fileName) => call("sandbox_load", { id, fileName }, z.string()),

  contentShow: (source, bounds) => call("content_show", { source, bounds }, Void),
  contentBounds: (bounds) => call("content_bounds", { bounds }, Void),
  contentHide: () => call("content_hide", {}, Void),
  contentNav: (action) => call("content_nav", { action }, Void),
  pdfOpen: async (id) => convertFileSrc(await call("pdf_open", { id }, z.string())),
  pdfMakeLocal: (id) => call("pdf_make_local", { id }, ItemSchema),

  openExternal: (url) => openUrl(url),
  revealPath: (path) => revealItemInDir(path),

  on(event, cb) {
    let off: (() => void) | undefined;
    let cancelled = false;
    if (event === "drop://pdf") {
      void getCurrentWebview()
        .onDragDropEvent((e) => {
          if (e.payload.type === "drop") {
            const paths = e.payload.paths.filter((p) => p.toLowerCase().endsWith(".pdf"));
            if (paths.length) (cb as (p: Events["drop://pdf"]) => void)({ paths });
          }
        })
        .then((u) => (cancelled ? u() : (off = u)));
    } else {
      const schema = EVENT_SCHEMAS[event];
      void listen(event, (e) => {
        if (!schema) return cb(e.payload as Events[typeof event]);
        const parsed = schema.safeParse(e.payload);
        if (parsed.success) cb(parsed.data as Events[typeof event]);
        else console.warn(`dropped malformed ${event}`, parsed.error);
      }).then((u) => (cancelled ? u() : (off = u)));
    }
    return () => {
      cancelled = true;
      off?.();
    };
  },
};
