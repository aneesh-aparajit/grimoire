// An in-memory vault so the UI runs in a plain browser (design work, demos,
// Playwright). Everything here is synthetic.
import { FIXTURES } from "../mock/fixtures";
import { planRun } from "../mock/runner";
import type { Backend, Events } from "./backend";
import type { EffectiveConfig, IndexSnapshot, Item, Language, Playlist, Run, Toolchain } from "./schemas";
import { LANGUAGES } from "./schemas";

type Listener = (p: unknown) => void;
const listeners = new Map<string, Set<Listener>>();
function emit<K extends keyof Events>(event: K, payload: Events[K]) {
  for (const l of listeners.get(event) ?? []) l(payload);
}

const params = new URLSearchParams(location.search);
const conflicted = params.get("conflict") === "1";
const empty = params.get("empty") === "1";

const kindOf = (k: string): Item["kind"] => (k === "video" ? "youtube" : (k as Item["kind"]));

const items: Item[] = empty
  ? []
  : [
      ...FIXTURES.map((f) => ({ ...f.item, kind: kindOf(f.item.kind), linked: true })),
      {
        id: "crafting-interpreters",
        title: "Crafting Interpreters",
        source: "https://craftinginterpreters.com/contents.html",
        kind: "article" as const,
        origin: "craftinginterpreters.com",
        tags: ["compilers", "books"],
        done: false,
        linked: true,
      },
      {
        id: "raft-paper",
        title: "In Search of an Understandable Consensus Algorithm (Raft)",
        source: "https://raft.github.io/raft.pdf",
        kind: "pdf" as const,
        origin: "raft.github.io",
        tags: ["distributed-systems", "papers"],
        done: true,
        linked: true,
      },
    ];

type MockPlaylist = Omit<Playlist, "done" | "count" | "doneCount">;
const playlists: MockPlaylist[] = [];

function video(dir: string, n: number, width: number, title: string, done = false): Item {
  return {
    id: `${dir}/${String(n).padStart(width, "0")}-${slug(title)}`,
    title,
    source: `https://www.youtube.com/watch?v=demo${dir.length}${n}`,
    kind: "youtube",
    origin: "youtube.com",
    tags: [],
    done,
    linked: true,
    playlist: dir,
  };
}

if (!empty) {
  playlists.push({
    id: "distributed-systems",
    title: "MIT 6.824 Distributed Systems (Spring 2020)",
    source: "https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB",
    tags: ["distributed-systems"],
  });
  ["Lecture 1: Introduction", "Lecture 2: RPC and Threads", "Lecture 3: GFS", "Lecture 4: Primary-Backup Replication", "Lecture 5: Go, Threads, and Raft"].forEach(
    (t, i) => items.push(video("distributed-systems", i + 1, 2, t, i < 2)),
  );
}

const notes = new Map<string, string>(FIXTURES.map((f) => [f.item.id, f.notes]));
for (const i of items) if (i.playlist) notes.set(i.id, `# ${i.title}\n\n<${i.source}>\n`);
notes.set("crafting-interpreters", "# Crafting Interpreters\n\n<https://craftinginterpreters.com/contents.html>\n");
notes.set(
  "raft-paper",
  "# Raft\n\n<https://raft.github.io/raft.pdf>\n\n## Leader election\n\n- Randomised timeouts avoid split votes.\n\n## Log replication\n\n- Commit once a majority has the entry.\n",
);
const runs = new Map<string, Run[]>(FIXTURES.map((f) => [f.item.id, f.runs as Run[]]));
const saved = new Map<string, Map<string, string>>(
  FIXTURES.map((f) => [
    f.item.id,
    new Map(
      f.savedSnippets.map((file) => {
        const lang = LANGUAGES.find((l) => l.file === file)?.id;
        return [file, (lang && f.snippets[lang]) || ""];
      }),
    ),
  ]),
);

const config: EffectiveConfig = {
  config: {
    theme: "system",
    editor: { fontSize: 15, lineWrap: true, autosaveMs: 750 },
    lint: { enabled: true, rules: {} },
    layout: { splitRatio: 0.54, sandboxOpen: false },
    sandbox: { timeoutMs: 10000, maxOutputBytes: 1048576, defaultLanguage: "python" },
    pdf: { defaultZoom: "page-width" },
  },
  toolchains: {},
  issues: [],
};

const snapshot = (): IndexSnapshot => ({
  items: items.map((i) => ({ ...i })),
  playlists: playlists.map((p) => {
    const vids = items.filter((i) => i.playlist === p.id);
    const doneCount = vids.filter((v) => v.done).length;
    return { ...p, count: vids.length, doneCount, done: vids.length > 0 && doneCount === vids.length };
  }),
  conflicted,
});
const wait = <T>(v: T, ms = 60) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const fail = (kind: string, message: string) => Promise.reject({ kind, message });

let runSeq = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>[]>();

function slug(t: string) {
  return (
    t
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

export const mockBackend: Backend = {
  mock: true,
  vaultRecent: () => wait(params.get("picker") === "1" ? [] : ["~/notes/vault"]),
  vaultOpen: (path) =>
    wait({ root: path, name: path.split("/").pop() || "vault", index: snapshot(), config, state: {} }),
  vaultCreate: (path) => mockBackend.vaultOpen(path),
  vaultClose: () => wait(undefined),
  pickFolder: () => wait("~/notes/vault"),
  pickPdf: () => wait("/Users/you/Downloads/the-rust-book.pdf"),

  itemAdd: async (input) => {
    if (conflicted) return fail("Conflict", "INDEX.md has merge conflict markers. Resolve them first.");
    const source = input.url ?? `local/${input.filePath?.split("/").pop()}`;
    let host = "local PDF";
    if (input.url) {
      try {
        host = new URL(input.url).host.replace(/^www\./, "");
      } catch {
        return fail("Parse", `${input.url} isn't a URL`);
      }
    }
    const title = input.title?.trim() || (input.url ? host : (input.filePath?.split("/").pop() ?? "Document"));
    let id = slug(title);
    for (let n = 2; items.some((i) => i.id === id); n++) id = `${slug(title)}-${n}`;
    const isPdf = !input.url || /\.pdf$|arxiv\.org\/pdf\//i.test(source);
    const isVideo = /youtube\.com|youtu\.be/.test(source);
    const item: Item = {
      id,
      title,
      source: input.url ? source : `${id}/${input.filePath?.split("/").pop()}`,
      kind: isPdf ? "pdf" : isVideo ? "youtube" : "article",
      origin: host,
      tags: input.tags,
      done: false,
      linked: true,
    };
    items.push(item);
    notes.set(id, `# ${title}\n\n<${item.source}>\n`);
    emit("index://changed", snapshot());
    return wait(item, input.title ? 80 : 700);
  },
  playlistAdd: async (input) => {
    if (conflicted) return fail("Conflict", "INDEX.md has merge conflict markers. Resolve them first.");
    const list = new URL(input.url).searchParams.get("list");
    if (!list) return fail("Parse", "That link isn't a YouTube playlist");
    const title = input.title?.trim() || "Demo playlist";
    let id = slug(title);
    for (let n = 2; items.some((i) => i.id === id) || playlists.some((p) => p.id === id); n++) id = `${slug(title)}-${n}`;
    playlists.push({ id, title, source: `https://www.youtube.com/playlist?list=${list}`, tags: input.tags });
    for (let n = 1; n <= 8; n++) {
      const v = video(id, n, 2, `Part ${n}`);
      items.push(v);
      notes.set(v.id, `# ${v.title}\n\n<${v.source}>\n`);
    }
    emit("index://changed", snapshot());
    const made = snapshot().playlists.find((p) => p.id === id);
    return made ? wait(made, 900) : fail("NotFound", id);
  },
  itemUpdate: async (id, patch) => {
    if (conflicted) return fail("Conflict", "INDEX.md has merge conflict markers. Resolve them first.");
    const pl = playlists.find((p) => p.id === id);
    if (pl) {
      Object.assign(pl, Object.fromEntries(Object.entries(patch).filter(([k, v]) => v !== undefined && k !== "done")));
      emit("index://changed", snapshot());
      return wait({ ...pl, done: false, kind: "youtube" as const, origin: "youtube.com", linked: true, playlist: null });
    }
    const it = items.find((i) => i.id === id);
    if (!it) return fail("NotFound", `No item ${id}`);
    Object.assign(it, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    emit("index://changed", snapshot());
    return wait({ ...it });
  },
  itemDelete: async (id) => {
    const p = playlists.findIndex((x) => x.id === id);
    if (p >= 0) {
      playlists.splice(p, 1);
      for (let k = items.length - 1; k >= 0; k--) if (items[k]?.playlist === id) items.splice(k, 1);
    }
    const i = items.findIndex((x) => x.id === id);
    if (i >= 0) items.splice(i, 1);
    emit("index://changed", snapshot());
    return wait(undefined);
  },
  itemEnsure: async (id) => {
    const it = items.find((i) => i.id === id);
    return it ? wait({ ...it }) : fail("NotFound", `No item ${id}`);
  },

  notesRead: (id) => wait(notes.get(id) ?? ""),
  notesWrite: (id, content) => {
    notes.set(id, content);
    return wait(undefined, 120);
  },
  notesSummary: (id) => {
    const text = notes.get(id) ?? "";
    let fence = false;
    const entries: string[] = [];
    for (const line of text.split("\n")) {
      if (/^\s*(```|~~~)/.test(line)) fence = !fence;
      else if (!fence && line.startsWith("## ")) entries.push(line.slice(3).trim());
    }
    return wait({
      entries,
      words: text.split(/\s+/).filter(Boolean).length,
      snippets: [...(saved.get(id)?.keys() ?? [])],
      modified: Date.now() - 1000 * 60 * 60 * (id.length % 30),
    });
  },

  configSet: async (_scope, path, value) => {
    const keys = path.split(".");
    let cur = config.config as unknown as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
    cur[keys.at(-1) as string] = value;
    return wait(structuredClone(config));
  },
  statePatch: () => wait(undefined),
  runsGet: (id) => wait(structuredClone(runs.get(id) ?? [])),
  runsAppend: async (id, run) => {
    runs.set(id, [...(runs.get(id) ?? []), run].slice(-30));
  },

  toolchains: () =>
    wait(
      LANGUAGES.map(
        (l): Toolchain => ({
          language: l.id,
          label: l.label,
          fileName: l.file,
          binary: l.bin,
          path: l.id === "go" && params.get("nogo") !== "0" ? null : `/usr/local/bin/${l.bin}`,
          version: l.id === "go" ? null : `${l.bin} (demo)`,
          template: "",
        }),
      ),
    ),
  sandboxRun: async (language: Language, code: string) => {
    const runId = ++runSeq;
    const plan = planRun(language, code);
    const ts: ReturnType<typeof setTimeout>[] = [];
    for (const { at, line } of plan.lines) {
      ts.push(setTimeout(() => emit("sandbox://output", { runId, stream: line.stream, chunk: `${line.text}\n` }), at));
    }
    const end = plan.exitAfterMs ?? config.config.sandbox.timeoutMs;
    ts.push(
      setTimeout(() => {
        emit("sandbox://exit", {
          runId,
          code: plan.exitAfterMs === null ? null : plan.exitCode,
          durationMs: end,
          reason: plan.exitAfterMs === null ? "timeout" : "exit",
          truncated: false,
        });
        timers.delete(runId);
      }, end),
    );
    timers.set(runId, ts);
    return runId;
  },
  sandboxStop: async (runId) => {
    for (const t of timers.get(runId) ?? []) clearTimeout(t);
    timers.delete(runId);
    emit("sandbox://exit", { runId, code: null, durationMs: 0, reason: "stopped", truncated: false });
  },
  sandboxSave: async (id, language, code) => {
    const file = LANGUAGES.find((l) => l.id === language)?.file ?? "main.txt";
    const m = saved.get(id) ?? new Map();
    m.set(file, code);
    saved.set(id, m);
    return wait(`${id}/sandbox/${file}`);
  },
  sandboxList: (id) => wait([...(saved.get(id)?.keys() ?? [])]),
  sandboxLoad: (id, file) => wait(saved.get(id)?.get(file) ?? ""),

  contentShow: () => wait(undefined),
  contentBounds: () => wait(undefined),
  contentHide: () => wait(undefined),
  contentNav: () => wait(undefined),
  pdfOpen: () => fail("NotAPdf", "PDF rendering needs the desktop app"),
  pdfMakeLocal: async (id) => {
    const it = items.find((i) => i.id === id);
    if (!it) return fail("NotFound", id);
    it.source = `${id}/${it.source.split("/").pop()}`;
    it.origin = "local PDF";
    emit("index://changed", snapshot());
    return { ...it };
  },

  openExternal: async (url) => {
    window.open(url, "_blank", "noopener");
  },
  revealPath: () => wait(undefined),
  on(event, cb) {
    const set = listeners.get(event) ?? new Set();
    set.add(cb as Listener);
    listeners.set(event, set);
    return () => set.delete(cb as Listener);
  },
};
