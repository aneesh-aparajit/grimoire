import { syntaxTree } from "@codemirror/language";
import { type Diagnostic, linter } from "@codemirror/lint";
import { type EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

/* ---------- entries: each `##` heading gets breathing room; fenced code gets a well ---------- */

type Structure = { entries: Map<number, number>; fences: { from: number; to: number }[] };
// Keyed by syntax tree, not document: an incomplete parse must not be cached as final.
const cache = new WeakMap<object, Structure>();

function structure(state: EditorState): Structure {
  const tree = syntaxTree(state);
  const hit = cache.get(tree);
  if (hit) return hit;
  const entries = new Map<number, number>();
  const fences: { from: number; to: number }[] = [];
  let n = 0;
  tree.iterate({
    enter(node) {
      if (node.name === "ATXHeading2") {
        n += 1;
        entries.set(state.doc.lineAt(node.from).from, n);
      } else if (node.name === "FencedCode") {
        fences.push({ from: node.from, to: node.to });
        return false;
      }
      return undefined;
    },
  });
  const s = { entries, fences };
  cache.set(tree, s);
  return s;
}

function buildLines(view: EditorView): DecorationSet {
  const { entries, fences } = structure(view.state);
  const builder = new RangeSetBuilder<Decoration>();
  const marks: { at: number; cls: string }[] = [];
  for (const from of entries.keys()) marks.push({ at: from, cls: "cm-entry" });
  for (const f of fences) {
    const first = view.state.doc.lineAt(f.from).number;
    const last = view.state.doc.lineAt(f.to).number;
    for (let ln = first; ln <= last; ln++) {
      const line = view.state.doc.line(ln);
      let cls = "cm-fence";
      if (ln === first) cls += " cm-fence-first";
      if (ln === last) cls += " cm-fence-last";
      marks.push({ at: line.from, cls });
    }
  }
  marks.sort((a, b) => a.at - b.at);
  for (const m of marks) builder.add(m.at, m.at, Decoration.line({ class: m.cls }));
  return builder.finish();
}

const entryLines = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildLines(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) {
        this.decorations = buildLines(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export const entries = [entryLines];

/* ---------- lint hints (stand-in for markdownlint until the IPC layer lands) ---------- */

export function lintMarkdown(text: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const lines = text.split("\n");
  let pos = 0;
  let inFence = false;
  let lastLevel = 0;
  let blanks = 0;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence) {
      const trailing = /[ \t]+$/.exec(line);
      if (trailing && line.trim() !== "" && trailing[0].length !== 2) {
        out.push({
          from: pos + trailing.index,
          to: pos + line.length,
          severity: "warning",
          markClass: "cm-trailing",
          message: "Trailing spaces (MD009). Two spaces mean a line break; other amounts are usually accidental.",
        });
      }
      const h = /^(#{1,6})\s/.exec(line);
      if (h) {
        const level = h[1]?.length ?? 1;
        if (lastLevel && level > lastLevel + 1) {
          out.push({
            from: pos,
            to: pos + line.length,
            severity: "warning",
            message: `Heading jumps from level ${lastLevel} to ${level} (MD001). Use level ${lastLevel + 1} here.`,
          });
        }
        lastLevel = level;
      }
      blanks = line.trim() === "" ? blanks + 1 : 0;
      if (blanks === 2) {
        out.push({ from: pos, to: pos, severity: "info", message: "Multiple blank lines (MD012)." });
      }
    }
    pos += line.length + 1;
  }
  return out;
}

export const notesLint = linter((view) => lintMarkdown(view.state.doc.toString()), { delay: 400 });
