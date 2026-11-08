# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Desktop app (macOS, Linux, Windows) built with Tauri v2. The UI is a web UI in the system webview, not a native design language, so it is recorded as `web`. No mobile app.

## Stack

Decided in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Tauri v2 (Rust backend), React 18 + TypeScript + Vite, Zustand, CodeMirror 6 for notes and sandbox. No UI kit. The app lives in `app/`, which is not yet scaffolded.

## Users

Developers and self-learners who regularly read technical blogs and papers, and watch talks and tutorials. They want to take notes and try code while they study. They are comfortable with git and prefer to own their data as plain files.

Grimoire is a public product for this audience, not only the author's personal tool. People who have never seen it should be able to understand it, set it up and trust it, so first run, error states and docs matter.

## Product Purpose

Grimoire is a minimal, local-first desktop app for studying what you find on the internet. You collect blogs, videos and PDFs into a reading list. Opening an item gives you the content on the left, and a Markdown notebook with a runnable code sandbox on the right.

It exists because learning from online material is scattered: links pile up in bookmarks and read-later services that lock data in, notes live apart from what they describe, trying a snippet means leaving to set up a scratch project, and sync depends on a vendor's cloud.

Success (from the PRD): people use it as their only reading list for weeks; a vault cloned on a second machine opens with no manual fixes; hand-editing `INDEX.md` never loses data; the sandbox gets used in a meaningful share of studied items.

## Positioning

Read, write and run in one window, with the filesystem as the database. Every item is a folder of plain Markdown and source files, the reading list is a Markdown task list (`INDEX.md`), and git is the sync. The vault stays useful without Grimoire: on GitHub, in a terminal, in another editor. The sandbox runs code with toolchains already on the user's machine.

## Operating Context

- Long study sessions: reading an article, paper, PDF or video while writing notes and running small snippets beside it.
- The vault is a git repo the user manages with their own git tooling, often across several machines. Files can change under the app (`git pull`, edits in vim) and must be picked up live.
- Content renders in a native child webview (so sites that refuse iframes still load), a YouTube or video embed, or a built-in PDF viewer. "Open in browser" is always available.
- Keyboard-heavy use: `Esc` back to the list, `⌘/Ctrl+Enter` to run.

## Capabilities and Constraints

- **Vault:** create or open a folder; remembers the last vault; vault preferences in `.grimoire/config.json` (committed), per-machine state in `.grimoire/local/` (git-ignored).
- **Reading list:** add by URL (title fetched if left empty) or PDF from disk; pending items first; type icon (article, video, PDF), domain, tags; done/not done; edit and delete with confirmation; text search plus `#tag` filters; tag list with counts.
- **Study view:** resizable split, either pane collapsible; PDF viewer with zoom, page jump, outline, search, copy, and per-machine resume position.
- **Notes:** CodeMirror Markdown source with light highlighting, fenced-code highlighting, non-blocking lint hints, autosave, optional rendered preview. No WYSIWYG.
- **Sandbox:** Python, Rust, Java, Go, C, JavaScript; starter templates; streamed stdout/stderr, exit code, run time; timeout and manual stop; clear missing-toolchain messages; save to `sandbox/`; insert snippet (and output) into notes.
- **Constraints:** round-trip safety (unknown lines in `INDEX.md` preserved verbatim); atomic writes; deterministic, minimal git diffs; no telemetry; works offline except remote content; cold start under 1 s for 1,000 items; keystroke-to-render under 16 ms; installer under 20 MB.
- **Out of scope for v1:** accounts, cloud sync, collaboration, IDE features, built-in git UI, annotating inside rendered content, mobile.
- **Safety truth:** the sandbox is not a security boundary. Code runs as the user. The UI must never imply isolation.

## Brand Commitments

- Name: **grimoire**, written lowercase in the README and app title.
- The grimoire idea (a book of spells, a personal book of study) is part of the product's identity and voice, not just a name. Copy and naming may lean into it.
- That identity sits alongside the PRD's commitment to a minimal, quiet product with few concepts. The metaphor must not obscure plain meaning: file names, formats, commands and errors stay literal and exact.

## Evidence on Hand

- [README.md](README.md), [docs/PRD.md](docs/PRD.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), including ASCII UX sketches of the reading list and study view (PRD §10).
- No logo, screenshots, users, testimonials, benchmarks or release yet. Status is early design. Future work must not invent any of these.

## Product Principles

1. **Files are the truth.** Anything shown in the app can be traced to a readable file in the vault; never hide state or rewrite what a person wrote.
2. **One place per thing you're learning.** Content, notes and code for an item stay together, in one window and one folder.
3. **Quiet tools, long sessions.** The interface gets out of the way of reading and writing; the content and the user's notes are the focus.
4. **Honest about the machine.** Say plainly what runs locally, what touches the network, and what the sandbox does not protect against.
5. **Legible to strangers.** A first-time user should understand vaults, `INDEX.md` and the sandbox without reading the docs first.

## Accessibility & Inclusion

- Fully keyboard-navigable.
- Respects system light/dark mode and font scaling.
- WCAG AA contrast as the floor.
- Comfort over hours of reading and writing is a priority: respect reduced-motion, avoid harsh contrast and needless motion in the study view.
