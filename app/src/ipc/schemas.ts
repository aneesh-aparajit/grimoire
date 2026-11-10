import { z } from "zod";

export const LanguageSchema = z.enum(["python", "javascript", "go", "rust", "c", "java"]);
export type Language = z.infer<typeof LanguageSchema>;

export const KindSchema = z.enum(["article", "youtube", "vimeo", "pdf"]);
export type Kind = z.infer<typeof KindSchema>;

export const ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  tags: z.array(z.string()),
  done: z.boolean(),
  kind: KindSchema,
  origin: z.string(),
  linked: z.boolean(),
  /** For a video inside a playlist: the playlist's folder. Its id is `<playlist>/<video>`. */
  playlist: z.string().nullable().optional(),
});
export type Item = z.infer<typeof ItemSchema>;

export const PlaylistSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  tags: z.array(z.string()),
  done: z.boolean(),
  count: z.number(),
  doneCount: z.number(),
});
export type Playlist = z.infer<typeof PlaylistSchema>;

export const IndexSnapshotSchema = z.object({
  items: z.array(ItemSchema),
  playlists: z.array(PlaylistSchema).default([]),
  conflicted: z.boolean(),
});
export type IndexSnapshot = z.infer<typeof IndexSnapshotSchema>;

export const ConfigSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  editor: z.object({ fontSize: z.number(), lineWrap: z.boolean(), autosaveMs: z.number() }),
  lint: z.object({ enabled: z.boolean(), rules: z.record(z.string(), z.unknown()) }),
  layout: z.object({ splitRatio: z.number(), sandboxOpen: z.boolean() }),
  sandbox: z.object({ timeoutMs: z.number(), maxOutputBytes: z.number(), defaultLanguage: LanguageSchema }),
  pdf: z.object({ defaultZoom: z.string() }),
});
export type Config = z.infer<typeof ConfigSchema>;

export const EffectiveConfigSchema = z.object({
  config: ConfigSchema,
  toolchains: z.record(z.string(), z.unknown()),
  issues: z.array(z.string()),
});
export type EffectiveConfig = z.infer<typeof EffectiveConfigSchema>;

export const VaultSnapshotSchema = z.object({
  root: z.string(),
  name: z.string(),
  index: IndexSnapshotSchema,
  config: EffectiveConfigSchema,
  state: z.record(z.string(), z.unknown()),
});
export type VaultSnapshot = z.infer<typeof VaultSnapshotSchema>;

export const ToolchainSchema = z.object({
  language: LanguageSchema,
  label: z.string(),
  fileName: z.string(),
  binary: z.string(),
  path: z.string().nullable(),
  version: z.string().nullable(),
  template: z.string(),
});
export type Toolchain = z.infer<typeof ToolchainSchema>;

export const NotesSummarySchema = z.object({
  entries: z.array(z.string()),
  words: z.number(),
  snippets: z.array(z.string()),
  modified: z.number().nullable(),
});
export type NotesSummary = z.infer<typeof NotesSummarySchema>;

export const RunStatusSchema = z.enum(["running", "ok", "error", "timeout", "stopped"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const OutputLineSchema = z.object({ stream: z.enum(["stdout", "stderr"]), text: z.string() });
export type OutputLine = z.infer<typeof OutputLineSchema>;

export const RunSchema = z.object({
  n: z.number(),
  language: LanguageSchema,
  startedAt: z.number(),
  durationMs: z.number(),
  status: RunStatusSchema,
  exitCode: z.number().nullable(),
  output: z.array(OutputLineSchema),
  truncated: z.boolean().optional(),
  code: z.string().optional(),
});
export type Run = z.infer<typeof RunSchema>;

export const AppErrorSchema = z.object({
  kind: z.enum([
    "NotFound",
    "InvalidPath",
    "Conflict",
    "Io",
    "ToolchainMissing",
    "Network",
    "Parse",
    "InvalidConfig",
    "NotAPdf",
    "NoVault",
  ]),
  message: z.string(),
});
export type AppError = z.infer<typeof AppErrorSchema>;

export const OutputEventSchema = z.object({
  runId: z.number(),
  stream: z.enum(["stdout", "stderr"]),
  chunk: z.string(),
});
export const ExitEventSchema = z.object({
  runId: z.number(),
  code: z.number().nullable(),
  durationMs: z.number(),
  reason: z.enum(["exit", "timeout", "stopped", "spawn-failed"]),
  truncated: z.boolean(),
});

export const LANGUAGES: { id: Language; label: string; file: string; bin: string; install: string }[] = [
  { id: "python", label: "Python", file: "main.py", bin: "python3", install: "Python 3" },
  { id: "javascript", label: "JavaScript", file: "main.js", bin: "node", install: "Node.js" },
  { id: "go", label: "Go", file: "main.go", bin: "go", install: "Go" },
  { id: "rust", label: "Rust", file: "main.rs", bin: "rustc", install: "Rust" },
  { id: "c", label: "C", file: "main.c", bin: "cc", install: "clang or gcc" },
  { id: "java", label: "Java", file: "Main.java", bin: "java", install: "a JDK (11 or newer)" },
];

/** Friendly text for an error from any IPC call. */
export function errorMessage(e: unknown): string {
  const parsed = AppErrorSchema.safeParse(e);
  if (parsed.success) return parsed.data.message;
  if (e instanceof Error) return e.message;
  return String(e);
}
