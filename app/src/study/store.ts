import { create } from "zustand";
import { FIXTURES } from "../mock/fixtures";
import { planRun, STARTERS } from "../mock/runner";
import { type Fixture, type Language, LANGUAGES, type Run } from "../mock/types";

export const TIMEOUT_MS = 10_000;
const AUTOSAVE_MS = 750;

type SaveState = "saved" | "saving" | "dirty";

type StudyState = {
  fixture: Fixture;
  notes: string;
  saveState: SaveState;
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
  pdfPage: number;
  notice: string | null;

  loadFixture: (id: string) => void;
  setNotes: (text: string) => void;
  togglePreview: () => void;
  toggleContent: () => void;
  toggleNotebook: () => void;
  setSplit: (r: number) => void;
  setSandboxSplit: (r: number) => void;
  setSandboxOpen: (open: boolean) => void;
  setLanguage: (l: Language) => void;
  setSnippet: (code: string) => void;
  run: () => void;
  stop: () => void;
  saveSnippet: () => void;
  insertRun: (n?: number) => void;
  setPdfPage: (p: number) => void;
  dismissNotice: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let runTimers: ReturnType<typeof setTimeout>[] = [];
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

function fromFixture(f: Fixture) {
  return {
    fixture: f,
    notes: f.notes,
    saveState: "saved" as SaveState,
    preview: false,
    sandboxOpen: f.sandboxOpen && !(typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches),
    language: f.language,
    snippets: { ...f.snippets },
    savedSnippets: [...f.savedSnippets],
    runs: f.runs.map((r) => ({ ...r, output: [...r.output] })),
    pdfPage: f.pdf?.page ?? 1,
    notice: null,
  };
}

function fenceLang(l: Language) {
  return l === "c" ? "c" : l;
}

export const useStudy = create<StudyState>((set, get) => {
  const notify = (notice: string) => {
    clearTimeout(noticeTimer);
    set({ notice });
    noticeTimer = setTimeout(() => set({ notice: null }), 4000);
  };

  const finish = (patch: Partial<Run>) => {
    runTimers.forEach(clearTimeout);
    runTimers = [];
    set((s) => {
      const runs = [...s.runs];
      const last = runs.at(-1);
      if (!last || last.status !== "running") return {};
      runs[runs.length - 1] = {
        ...last,
        durationMs: Date.now() - last.startedAt,
        ...patch,
      };
      return { runs };
    });
  };

  return {
    ...fromFixture(FIXTURES[0] as Fixture),
    contentCollapsed: false,
    notebookCollapsed: false,
    split: 0.54,
    sandboxSplit: 0.5,

    loadFixture: (id) => {
      const f = FIXTURES.find((x) => x.id === id);
      if (!f) return;
      runTimers.forEach(clearTimeout);
      runTimers = [];
      set(fromFixture(f));
    },

    setNotes: (text) => {
      set({ notes: text, saveState: "dirty" });
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        set({ saveState: "saving" });
        // note_write is an atomic temp-file + rename on the Rust side.
        setTimeout(() => set({ saveState: "saved" }), 180);
      }, AUTOSAVE_MS);
    },

    togglePreview: () => set((s) => ({ preview: !s.preview })),
    toggleContent: () =>
      set((s) => ({ contentCollapsed: !s.contentCollapsed, notebookCollapsed: false })),
    toggleNotebook: () =>
      set((s) => ({ notebookCollapsed: !s.notebookCollapsed, contentCollapsed: false })),
    setSplit: (r) => set({ split: Math.min(0.78, Math.max(0.24, r)) }),
    setSandboxSplit: (r) => set({ sandboxSplit: Math.min(0.8, Math.max(0.2, r)) }),
    setSandboxOpen: (open) => set({ sandboxOpen: open }),

    setLanguage: (language) =>
      set((s) => ({
        language,
        snippets: { ...s.snippets, [language]: s.snippets[language] ?? STARTERS[language] },
      })),

    setSnippet: (code) => set((s) => ({ snippets: { ...s.snippets, [s.language]: code } })),

    run: () => {
      const s = get();
      if (s.runs.at(-1)?.status === "running") return;
      if (!s.fixture.toolchains[s.language]) return;
      const code = s.snippets[s.language] ?? "";
      const plan = planRun(s.language, code);
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
      set({ runs: [...s.runs, run], sandboxOpen: true });

      for (const { at, line } of plan.lines) {
        runTimers.push(
          setTimeout(() => {
            set((st) => {
              const runs = [...st.runs];
              const last = runs.at(-1);
              if (!last || last.status !== "running") return {};
              runs[runs.length - 1] = { ...last, output: [...last.output, line] };
              return { runs };
            });
          }, at),
        );
      }
      const end = plan.exitAfterMs ?? TIMEOUT_MS;
      runTimers.push(
        setTimeout(() => {
          if (plan.exitAfterMs === null) {
            finish({ status: "timeout", exitCode: null, durationMs: TIMEOUT_MS });
          } else {
            finish({
              status: plan.exitCode === 0 ? "ok" : "error",
              exitCode: plan.exitCode,
              durationMs: plan.exitAfterMs,
            });
          }
        }, end),
      );
    },

    stop: () => finish({ status: "stopped", exitCode: null }),

    saveSnippet: () => {
      const s = get();
      const file = LANGUAGES.find((l) => l.id === s.language)?.file ?? "main.txt";
      set({ savedSnippets: s.savedSnippets.includes(file) ? s.savedSnippets : [...s.savedSnippets, file] });
      notify(`Saved ${s.fixture.item.id}/sandbox/${file}`);
    },

    insertRun: (n) => {
      const s = get();
      const run = n ? s.runs.find((r) => r.n === n) : undefined;
      const language = run?.language ?? s.language;
      const code = (run?.code ?? s.snippets[language] ?? "").trimEnd();
      let block = `\n\`\`\`${fenceLang(language)}\n${code}\n\`\`\`\n`;
      if (run && run.output.length > 0) {
        block += `\n\`\`\`text\n${run.output.map((l) => l.text).join("\n")}\n\`\`\`\n`;
      }
      get().setNotes(`${s.notes.trimEnd()}\n${block}`);
      notify(run ? `Inserted run ${run.n} into NOTES.md` : "Inserted snippet into NOTES.md");
    },

    setPdfPage: (p) => {
      const max = get().fixture.pdf?.pages ?? 1;
      set({ pdfPage: Math.min(max, Math.max(1, p)) });
    },

    dismissNotice: () => set({ notice: null }),
  };
});
