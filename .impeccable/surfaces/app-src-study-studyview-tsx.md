---
version: 1
slug: "app-src-study-studyview-tsx"
primary_target: "app/src/study/StudyView.tsx"
related_targets: []
---

# Study view

Scope: the study view in `app/` (content left, NOTES.md + sandbox right). Mode: Operate.

Task: hours-long study of one item. Writing notes dominates; the sandbox opens occasionally for a snippet, and its output is pasted back into notes. States in scope: article, PDF and video items; page refused to load; toolchain missing; run timed out; INDEX.md merge-conflict banner; either pane collapsed.

Constraints: real React + TypeScript frontend with CodeMirror 6 and mock vault data, runnable in a browser; Tauri wiring is M0 work. Light and dark from the system. No telemetry, no invented vault data shown as real.

## Direction contract

THESIS: Study as experiment. Each item is a bound lab notebook: notes are numbered entries, every sandbox run is a logged, timed entry, and mistakes are struck through in red, never erased. Refuses the default dark neutral IDE split with tabs and one purple accent.

OWN-WORLD: Cool paper ground (never cream), notebook-cloth navy for the shell band, ink-blue for the user's own writing, correction red only for failure, sage for rules and quiet structure. Archivo for UI with its condensed width as the printed-form label voice; JetBrains Mono only for code, output and measurements. Hairline ruled modules with small tab heads; no cards, no shadows on panes.

STORY: The learner sees the source and their notebook together, knows where every entry and run lives, and trusts that nothing they wrote or ran is lost.

FIRST VIEWPORT: Cloth header band: back to reading list, item title, source domain, type, tags, pane toggles. Below, paper work band: content pane left (~52%) with its own nav/URL/open-in-browser row; notebook right: NOTES.md module dominant with the entry margin (E-numbers per `##` heading) and autosave state, sandbox module docked under it, collapsed to its head by default, opening to editor plus run log. Signature move: the entry margin and the run log — runs numbered, timestamped, duration drawn to scale, failed runs struck with a single red rule and stamped with their exit.

FORM: Engineer's lab notebook, my ranked #1 (shown as the pick); seed key 07b4eb0f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
