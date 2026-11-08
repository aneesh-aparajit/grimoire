export type ContentKind = "article" | "video" | "pdf";

export type Language = "python" | "javascript" | "go" | "rust" | "c" | "java";

export const LANGUAGES: { id: Language; label: string; file: string; bin: string }[] = [
  { id: "python", label: "Python", file: "main.py", bin: "python3" },
  { id: "javascript", label: "JavaScript", file: "main.js", bin: "node" },
  { id: "go", label: "Go", file: "main.go", bin: "go" },
  { id: "rust", label: "Rust", file: "main.rs", bin: "rustc" },
  { id: "c", label: "C", file: "main.c", bin: "cc" },
  { id: "java", label: "Java", file: "Main.java", bin: "java" },
];

export type Item = {
  id: string;
  title: string;
  source: string;
  kind: ContentKind;
  /** Host for URLs, "local PDF" for files in the item folder. */
  origin: string;
  tags: string[];
  done: boolean;
};

export type RunStatus = "running" | "ok" | "error" | "timeout" | "stopped";

export type OutputLine = { stream: "stdout" | "stderr"; text: string };

export type Run = {
  n: number;
  language: Language;
  startedAt: number;
  durationMs: number;
  status: RunStatus;
  exitCode: number | null;
  output: OutputLine[];
  truncated?: boolean;
  /** The snippet as it was when this run started. */
  code?: string;
};

export type PdfOutlineEntry = { title: string; page: number; depth: number };

export type Fixture = {
  id: string;
  label: string;
  item: Item;
  notes: string;
  /** Article/video only: whether the child webview managed to load the page. */
  contentLoads: boolean;
  /** Toolchains found on PATH. */
  toolchains: Record<Language, boolean>;
  indexConflict: boolean;
  sandboxOpen: boolean;
  language: Language;
  snippets: Partial<Record<Language, string>>;
  savedSnippets: string[];
  runs: Run[];
  pdf?: { pages: number; page: number; outline: PdfOutlineEntry[] };
};
