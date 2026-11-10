import type { z } from "zod";
import type {
  EffectiveConfig,
  ExitEventSchema,
  IndexSnapshot,
  Item,
  Language,
  NotesSummary,
  OutputEventSchema,
  Playlist,
  Run,
  Toolchain,
  VaultSnapshot,
} from "./schemas";

export type Bounds = { x: number; y: number; width: number; height: number };

export type AddInput = { url?: string; filePath?: string; title?: string; tags: string[] };
export type PlaylistInput = { url: string; title?: string; tags: string[] };
export type Patch = { title?: string; source?: string; tags?: string[]; done?: boolean };

export type Events = {
  "index://changed": IndexSnapshot;
  "notes://changed": { id: string };
  "config://changed": EffectiveConfig;
  "sandbox://output": z.infer<typeof OutputEventSchema>;
  "sandbox://exit": z.infer<typeof ExitEventSchema>;
  "content://load": { state: "started" | "finished"; url: string };
  "drop://pdf": { paths: string[] };
};

/** Everything the UI needs from the Rust core. Implemented over Tauri IPC,
 * and by an in-memory mock so the UI runs in a plain browser. */
export interface Backend {
  readonly mock: boolean;
  vaultRecent(): Promise<string[]>;
  vaultOpen(path: string): Promise<VaultSnapshot>;
  vaultCreate(path: string, lfs: boolean): Promise<VaultSnapshot>;
  vaultClose(): Promise<void>;
  pickFolder(title: string): Promise<string | null>;
  pickPdf(): Promise<string | null>;

  itemAdd(input: AddInput): Promise<Item>;
  /** One folder for the playlist, a numbered notes file per video. */
  playlistAdd(input: PlaylistInput): Promise<Playlist>;
  itemUpdate(id: string, patch: Patch): Promise<Item>;
  itemDelete(id: string, deleteFolder: boolean): Promise<void>;
  itemEnsure(id: string): Promise<Item>;

  notesRead(id: string): Promise<string>;
  notesWrite(id: string, content: string): Promise<void>;
  notesSummary(id: string): Promise<NotesSummary>;

  configSet(scope: "vault" | "local", path: string, value: unknown): Promise<EffectiveConfig>;
  statePatch(patch: Record<string, unknown>): Promise<void>;
  runsGet(id: string): Promise<Run[]>;
  runsAppend(id: string, run: Run): Promise<void>;

  toolchains(): Promise<Toolchain[]>;
  sandboxRun(language: Language, code: string, stdin?: string): Promise<number>;
  sandboxStop(runId: number): Promise<void>;
  sandboxSave(id: string, language: Language, code: string): Promise<string>;
  sandboxList(id: string): Promise<string[]>;
  sandboxLoad(id: string, fileName: string): Promise<string>;

  contentShow(source: string, bounds: Bounds): Promise<void>;
  contentBounds(bounds: Bounds): Promise<void>;
  contentHide(): Promise<void>;
  contentNav(action: "back" | "forward" | "reload"): Promise<void>;
  pdfOpen(id: string): Promise<string>;
  pdfMakeLocal(id: string): Promise<Item>;

  openExternal(url: string): Promise<void>;
  revealPath(path: string): Promise<void>;
  on<K extends keyof Events>(event: K, cb: (payload: Events[K]) => void): () => void;
}
