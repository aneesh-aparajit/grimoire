---
version: 1
slug: "app-src-study-studyview-tsx"
primary_target: "app/src/study/StudyView.tsx"
related_targets: ["app/src/list/ListView.tsx"]
---

# Study view

Scope: the desktop app in `app/`: reading list, study view (content left, NOTES.md + sandbox right), dialogs and vault picker. Mode: Operate.

Task: hours-long study of one item. Writing notes dominates; the sandbox opens occasionally for a snippet, and its output is pasted back into notes. States in scope: article, PDF and video items; page refused to load; toolchain missing; run timed out; INDEX.md merge-conflict banner; either pane collapsed.

Constraints: React + TypeScript with CodeMirror 6, Tauri webview, mock vault for the browser. Light and dark from the system. No telemetry, no invented vault data shown as real.

## Direction contract

THESIS: grimoire is a quiet instrument: a calm device for long study, in the tradition of Braun product graphics. Panes are panels set into a warm-grey body, controls are soft physical keys, and state is shown by small status lights. Refuses the default IDE split of tabs, chrome bars and an accent colour sprayed everywhere.

OWN-WORLD: Warm-grey body (#e9e9e6 light, #1d1e20 dark) with lighter inset panels on an 8px radius; keys with a 1px edge and a 1px bottom shadow; one orange (#c4520f) reserved for the single primary action of each view; green, red and amber only as status lights and their labels. Figtree for all UI and notes; JetBrains Mono only for code, output, paths and measurements. Small uppercase labels name panels. No numbering systems, no stamps, no cloth band.

STORY: The learner sees the source and their notes side by side in a calm frame, knows what is saved and what ran from a glance at the lights, and is never shown more chrome than the moment needs.

FIRST VIEWPORT: Body-coloured top band: back key, item title, source domain, tags, Done key and pane toggles. Below, two inset panels with a 10px gutter: source left (~52%), notebook right with NOTES.md dominant and the sandbox docked beneath, collapsed to its head by default. Signature move: the orange Run key and the status lights (saved, running blink, exit 0 green, failure red with the output struck through).

FORM: Quiet Instrument (Braun product graphics), shown as the pick in a minimal-steered round 3; seed key 2dc2f830 (reroll 2).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
