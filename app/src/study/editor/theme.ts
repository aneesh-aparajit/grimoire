import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

const highlight = HighlightStyle.define([
  { tag: t.heading1, color: "var(--ink)", fontWeight: "600", fontSize: "1.75em", letterSpacing: "-0.015em" },
  { tag: t.heading2, color: "var(--ink)", fontWeight: "600", fontSize: "1.1em" },
  { tag: [t.heading3, t.heading4, t.heading5, t.heading6], color: "var(--ink)", fontWeight: "600" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "650" },
  { tag: t.strikethrough, textDecoration: "line-through", textDecorationColor: "var(--fail)", textDecorationThickness: "1.5px" },
  { tag: [t.link, t.url], color: "var(--ink-muted)", textDecoration: "underline", textUnderlineOffset: "3px" },
  { tag: t.monospace, fontFamily: "var(--font-mono)", fontSize: "0.86em" },
  { tag: [t.processingInstruction, t.contentSeparator], color: "var(--ink-faint)" },
  { tag: t.quote, color: "var(--ink-muted)" },
  // Code. Orange is the primary action and red is failure, so neither appears here.
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: "var(--ink)", fontWeight: "650" },
  { tag: [t.string, t.special(t.string), t.regexp, t.character], color: "var(--pass)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--ink-faint)", fontStyle: "italic" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--caution)" },
  { tag: [t.definition(t.variableName), t.function(t.definition(t.variableName))], color: "var(--ink)", fontWeight: "600" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--ink)", fontStyle: "italic" },
  { tag: [t.macroName, t.meta, t.attributeName], color: "var(--ink-muted)" },
]);

export const syntax = syntaxHighlighting(highlight);

const base = {
  "&": { height: "100%", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { lineHeight: "1.7" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--signal)", borderLeftWidth: "2px" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
    { backgroundColor: "color-mix(in oklab, var(--signal) 18%, transparent)" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--ink-faint)" },
  ".cm-tooltip": {
    border: "1px solid var(--rule-strong)",
    backgroundColor: "var(--panel)",
    color: "var(--ink)",
    borderRadius: "var(--radius-key)",
    boxShadow: "var(--lift)",
  },
  ".cm-diagnostic": { padding: "6px 10px", fontFamily: "var(--font-ui)", fontSize: "12.5px", borderLeft: "none" },
  ".cm-diagnostic-warning, .cm-diagnostic-info": { borderLeft: "none" },
  ".cm-lintRange-warning, .cm-lintRange-info": {
    backgroundImage: "none",
    textDecoration: "underline wavy color-mix(in oklab, var(--caution) 70%, transparent)",
    textDecorationThickness: "1px",
    textUnderlineOffset: "4px",
  },
  ".cm-lintRange-warning.cm-trailing, .cm-trailing": { backgroundColor: "var(--caution-soft)" },
};

export const notesTheme = EditorView.theme({
  ...base,
  ".cm-scroller": { fontFamily: "var(--font-ui)", fontSize: "var(--notes-size, var(--text-body))", lineHeight: "1.7" },
  ".cm-content": { color: "var(--ink)", padding: "1.75rem 2.25rem 6rem", maxWidth: "calc(68ch + 4.5rem)", caretColor: "var(--signal)" },
  ".cm-line": { padding: "0" },
  ".cm-entry": { paddingTop: "1rem !important" },
  ".cm-fence": {
    fontFamily: "var(--font-mono)",
    fontSize: "0.8125rem",
    lineHeight: "1.6",
    backgroundColor: "var(--well)",
    color: "var(--ink)",
    paddingLeft: "0.875rem !important",
    paddingRight: "0.875rem !important",
  },
  ".cm-fence-first": { paddingTop: "0.5rem !important", borderTopLeftRadius: "var(--radius-key)", borderTopRightRadius: "var(--radius-key)" },
  ".cm-fence-last": { paddingBottom: "0.5rem !important", borderBottomLeftRadius: "var(--radius-key)", borderBottomRightRadius: "var(--radius-key)" },
});

export const codeTheme = EditorView.theme({
  ...base,
  ".cm-scroller": { fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.6" },
  ".cm-content": { color: "var(--ink)", padding: "0.75rem 0" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", paddingLeft: "0.375rem" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 0.75rem 0 0.25rem", minWidth: "2.25rem", fontSize: "11.5px" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--ink) 4%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--ink-muted)" },
});
