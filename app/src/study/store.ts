import { create } from "zustand";
import { useApp } from "../app/store";
import { STARTERS } from "../mock/runner";
import { backend } from "../ipc";
import { errorMessage, type Item, type Language, LANGUAGES, type Run } from "../ipc/schemas";

type SaveState = "saved" | "saving" | "dirty" | "error";

type StudyState = {
  item: Item | null;
  loading: boolean;
  notes: string;
  saveState: SaveState;
  /** NOTES.md changed on disk while there were unsaved edits. */
  diskConflict: string | null;
  preview: boolean;
  contentCollapsed: boolean;
  notebookCollapsed: boolean;
  split: number;
  sandboxOpen: boolean;
  sandboxSplit: number;
  language: Language;
  snippets: Partial<Record<Language, string>>;
  savedSnippets: string[];
  runs: Run[];
  runId: number | null;
  stdin: string;
  /** When this item was opened; runs started after it open themselves in the log. */
  openedAt: number;

  open: (item: Item) => Promise<void>;
  close: () => void;
  setNotes: (text: string) => void;
  flush: () => Promise<void>;
  resolveConflict: (keepMine: boolean) => void;
  togglePreview: () => void;
  toggleContent: () => void;
  toggleNotebook: () => void;
  setSplit: (r: number) => void;
  setSandboxSplit: (r: number) => void;
  setSandboxOpen: (open: boolean) => void;
  setLanguage: (l: Language) => Promise<void>;
  setSnippet: (code: string) => void;
  setStdin: (s: string) => void;
  loadSnippet: (file: string) => Promise<void>;
  run: () => Promise<void>;
  stop: () => void;
  saveSnippet: () => Promise<void>;
  insertRun: (n?: number) => void;
  insertText: (text: string) => void;
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let subscriptions: (() => void)[] = [];

export const getTimeoutMs = () => useApp.getState().config?.config.sandbox.timeoutMs ?? 10_000;
const notify = (t: string, tone?: "info" | "error") => useApp.getState().notify(t, tone);

function starter(language: Language): string {
  const tc = useApp.getState().toolchains.find((t) => t.language === language);
  return tc?.template || STARTERS[language];
}

export const useStudy = create<StudyState>((set, get) => {
  const writeNow = async () => {
    const { item, notes } = get();
    if (!item) return;
    set({ saveState: "saving" });
    try {
      await backend.notesWrite(item.id, notes);
      if (get().notes === notes && get().item?.id === item.id) set({ saveState: "saved" });
    } catch (e) {
      set({ saveState: "error" });
      notify(`Couldn't save NOTES.md: ${errorMessage(e)}`, "error");
    }
  };

  const finishRun = (patch: Partial<Run>) => {
    const { runs, item } = get();
    const last = runs.at(-1);
    if (!last || last.status !== "running") return;
    const done = { ...last, ...patch };
    set({ runs: [...runs.slice(0, -1), done], runId: null });
    if (item) void backend.runsAppend(item.id, done);
  };

  return {
    item: null,
    loading: false,
    notes: "",
    saveState: "saved",
    diskConflict: null,
    preview: false,
    contentCollapsed: false,
    notebookCollapsed: false,
    split: 0.54,
    sandboxOpen: false,
    sandboxSplit: 0.5,
    language: "python",
    snippets: {},
    savedSnippets: [],
    runs: [],
    runId: null,
    stdin: "",
    openedAt: Date.now(),

    open: async (item) => {
      get().close();
      const cfg = useApp.getState().config?.config;
      const narrow = window.matchMedia("(max-width: 760px)").matches;
      set({
        item,
        loading: true,
        notes: "",
        saveState: "saved",
        diskConflict: null,
        preview: false,
        runs: [],
        runId: null,
        snippets: {},
        savedSnippets: [],
        stdin: "",
        openedAt: Date.now(),
        split: cfg?.layout.splitRatio ?? 0.54,
        sandboxOpen: !narrow && (cfg?.layout.sandboxOpen ?? false),
        language: cfg?.sandbox.defaultLanguage ?? "python",
      });

      subscriptions.push(
        backend.on("notes://changed", async ({ id }) => {
          if (id !== get().item?.id) return;
          const text = await backend.notesRead(id);
          if (text === get().notes) return;
          if (get().saveState === "saved") set({ notes: text });
          else set({ diskConflict: text });
        }),
        backend.on("sandbox://output", (e) => {
          if (e.runId !== get().runId) return;
          const runs = get().runs;
          const last = runs.at(-1);
          if (!last) return;
          const lines = e.chunk
            .replace(/\n$/, "")
            .split("\n")
            .map((text) => ({ stream: e.stream, text }));
          set({ runs: [...runs.slice(0, -1), { ...last, output: [...last.output, ...lines] }] });
        }),
        backend.on("sandbox://exit", (e) => {
          if (e.runId !== get().runId) return;
          const status =
            e.reason === "timeout" ? "timeout" : e.reason === "stopped" ? "stopped" : e.code === 0 ? "ok" : "error";
          const started = get().runs.at(-1)?.startedAt ?? Date.now();
          finishRun({
            status,
            exitCode: e.code,
            durationMs: e.reason === "stopped" ? Date.now() - started : e.durationMs,
            truncated: e.truncated,
          });
        }),
      );

      try {
        const [notes, runs, saved] = await Promise.all([
          backend.notesRead(item.id),
          backend.runsGet(item.id),
          backend.sandboxList(item.id),
        ]);
        const lastLang = runs.at(-1)?.language;
        const savedLang = LANGUAGES.find((l) => saved.includes(l.file))?.id;
        const language = lastLang ?? savedLang ?? get().language;
        const file = LANGUAGES.find((l) => l.id === language)?.file;
        const code = file && saved.includes(file) ? await backend.sandboxLoad(item.id, file) : undefined;
        if (get().item?.id !== item.id) return;
        set({
          notes,
          runs,
          savedSnippets: saved,
          language,
          snippets: { [language]: code ?? runs.at(-1)?.code ?? starter(language) },
          loading: false,
        });
      } catch (e) {
        set({ loading: false });
        notify(errorMessage(e), "error");
      }
    },

    close: () => {
      if (get().saveState === "dirty") {
        clearTimeout(saveTimer);
        void writeNow();
      }
      const { runId } = get();
      if (runId !== null) void backend.sandboxStop(runId);
      for (const off of subscriptions) off();
      subscriptions = [];
    },

    setNotes: (text) => {
      if (text === get().notes) return;
      set({ notes: text, saveState: "dirty" });
      clearTimeout(saveTimer);
      const ms = useApp.getState().config?.config.editor.autosaveMs ?? 750;
      saveTimer = setTimeout(() => void writeNow(), ms);
    },

    flush: async () => {
      clearTimeout(saveTimer);
      if (get().saveState === "dirty") await writeNow();
    },

    resolveConflict: (keepMine) => {
      const disk = get().diskConflict;
      if (disk === null) return;
      if (keepMine) {
        set({ diskConflict: null });
        void writeNow();
      } else {
        clearTimeout(saveTimer);
        set({ notes: disk, diskConflict: null, saveState: "saved" });
      }
    },

    togglePreview: () => set((s) => ({ preview: !s.preview })),
    toggleContent: () => set((s) => ({ contentCollapsed: !s.contentCollapsed, notebookCollapsed: false })),
    toggleNotebook: () => set((s) => ({ notebookCollapsed: !s.notebookCollapsed, contentCollapsed: false })),
    setSplit: (r) => set({ split: Math.min(0.78, Math.max(0.24, r)) }),
    setSandboxSplit: (r) => set({ sandboxSplit: Math.min(0.8, Math.max(0.2, r)) }),
    setSandboxOpen: (open) => set({ sandboxOpen: open }),

    setLanguage: async (language) => {
      const { item, savedSnippets, snippets } = get();
      if (snippets[language] !== undefined) {
        set({ language });
        return;
      }
      const file = LANGUAGES.find((l) => l.id === language)?.file;
      const code =
        item && file && savedSnippets.includes(file) ? await backend.sandboxLoad(item.id, file) : starter(language);
      set({ language, snippets: { ...get().snippets, [language]: code } });
    },

    setSnippet: (code) => set((s) => ({ snippets: { ...s.snippets, [s.language]: code } })),
    setStdin: (stdin) => set({ stdin }),

    loadSnippet: async (file) => {
      const { item } = get();
      const lang = LANGUAGES.find((l) => l.file === file)?.id;
      if (!item || !lang) return;
      const code = await backend.sandboxLoad(item.id, file);
      set((s) => ({ language: lang, snippets: { ...s.snippets, [lang]: code } }));
    },

    run: async () => {
      const s = get();
      if (!s.item) return;
      const tc = useApp.getState().toolchains.find((t) => t.language === s.language);
      if (tc && !tc.path) return;
      if (s.runId !== null) await backend.sandboxStop(s.runId);
      const code = s.snippets[s.language] ?? "";
      const run: Run = {
        n: (s.runs.at(-1)?.n ?? 0) + 1,
        language: s.language,
        startedAt: Date.now(),
        durationMs: 0,
        status: "running",
        exitCode: null,
        output: [],
        code,
      };
      set({ runs: [...get().runs.filter((r) => r.status !== "running"), run], sandboxOpen: true, runId: -1 });
      try {
        const runId = await backend.sandboxRun(s.language, code, s.stdin || undefined);
        set({ runId });
      } catch (e) {
        finishRun({ status: "error", exitCode: null, output: [{ stream: "stderr", text: errorMessage(e) }] });
      }
    },

    stop: () => {
      const { runId } = get();
      if (runId !== null && runId >= 0) void backend.sandboxStop(runId);
    },

    saveSnippet: async () => {
      const s = get();
      if (!s.item) return;
      try {
        const path = await backend.sandboxSave(s.item.id, s.language, s.snippets[s.language] ?? "");
        const file = path.split("/").pop() ?? "";
        set({ savedSnippets: s.savedSnippets.includes(file) ? s.savedSnippets : [...s.savedSnippets, file].sort() });
        notify(`Saved ${path}`);
      } catch (e) {
        notify(errorMessage(e), "error");
      }
    },

    insertRun: (n) => {
      const s = get();
      const run = n ? s.runs.find((r) => r.n === n) : undefined;
      const language = run?.language ?? s.language;
      const code = (run?.code ?? s.snippets[language] ?? "").trimEnd();
      let block = `\`\`\`${language}\n${code}\n\`\`\`\n`;
      if (run && run.output.length > 0) {
        block += `\n\`\`\`text\n${run.output.map((l) => l.text).join("\n")}\n\`\`\`\n`;
      }
      get().insertText(block);
      notify(run ? `Inserted run ${run.n} into NOTES.md` : "Inserted snippet into NOTES.md");
    },

    insertText: (text) => {
      const s = get();
      get().setNotes(`${s.notes.trimEnd()}\n\n${text}`);
    },
  };
});
