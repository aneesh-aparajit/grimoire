# Grimoire — Product Requirements Document

| | |
|---|---|
| **Status** | Draft v0.1 |
| **Owner** | Aneesh Aparajit |
| **Last updated** | 2026-11-08 |
| **Platform** | macOS first (13 Ventura+, Apple silicon and Intel) via Tauri. Linux and Windows later. |

---

## 1. Summary

Grimoire is a minimal, local-first desktop app for **studying things you find on the internet**. You collect blogs, videos and PDFs (papers, books, slides — from a URL or from disk) into a reading list. Opening an item gives you a split screen: the content on the left, and a Markdown notebook with a runnable code sandbox on the right.

There is no database and no account. Everything — the reading list, the notes, the sandbox code — lives as plain files in one folder (a *vault*) that you can commit to git and pick up on any machine.

## 2. Problem

Learning from online material today is scattered across tools:

- Links pile up in browser bookmarks, chat messages and "read later" services that lock your data in.
- Notes live in a separate app, disconnected from the thing they're about.
- Trying out a code snippet means opening an editor, creating a scratch project, and switching windows — so it usually doesn't happen.
- Sync depends on a vendor's cloud.

## 3. Goals

1. **One place per thing you're learning.** Every reading-list item has its own folder with its notes and code.
2. **Read, write and run side by side.** Content, notes and a code sandbox in one window, no context switching.
3. **Files are the database.** All state is human-readable Markdown and source files. The vault is useful even without Grimoire (on GitHub, in a terminal, in another editor).
4. **Git is the sync.** Moving to a new machine = `git clone` + open folder.
5. **Minimal.** Fast to start, quiet UI, few concepts.

## 4. Non-goals (v1)

- Cloud sync, accounts, collaboration or sharing.
- Rich-text / WYSIWYG editing. Notes are Markdown source with light highlighting.
- Full IDE features (LSP, debugger, multi-file projects, package managers).
- Secure sandboxing of executed code. The sandbox runs *your* code with *your* toolchains; it is a convenience, not an isolation boundary.
- Mobile apps.
- Linux and Windows builds. The code avoids needless macOS lock-in (see ARCHITECTURE §11), but v1 is built, tested and shipped for macOS only.
- Mac App Store distribution (the sandbox needs to spawn arbitrary toolchains, which the App Store sandbox forbids). v1 ships as a signed, notarised `.dmg`.
- Built-in git UI (use your normal git tooling).
- Annotating or highlighting inside the rendered web page, video or PDF.

## 5. Target user

A developer / self-learner who:

- Regularly reads technical blogs, papers and watches talks or tutorials.
- Wants to take notes and try code while doing so.
- Is comfortable with git and prefers owning their data as files.

## 6. Core concepts

| Concept | Meaning |
|---|---|
| **Vault** | A folder on disk that Grimoire opens. Contains `INDEX.md` and one folder per item. Usually a git repo. |
| **Item** | One entry in the reading list: a source (a web URL or a PDF), a title, tags and a done/not-done state. |
| **Source** | What an item points to: an article URL, a video URL, a remote PDF URL, or a local PDF stored inside the item's folder. |
| **Index** | `INDEX.md` at the vault root. The reading list, written as a Markdown task list. Source of truth for item metadata. |
| **Vault config** | The `.grimoire/` folder at the vault root. Holds the vault's preferences (committed, shared across machines) and a git-ignored `local/` folder for per-machine state. |
| **Note** | `NOTES.md` inside an item's folder. Free-form Markdown. |
| **Sandbox** | A scratch code editor attached to an item. Can run code in Python, Rust, Java, Go, C and JavaScript, and save snippets to the item's `sandbox/` folder. |
| **Tag** | A short label (`#rust`, `#distributed-systems`) attached to an item, used for filtering. |

## 7. User stories

### Vault
- **V1.** As a user, I can create a new vault in an empty folder, or open an existing folder as a vault.
- **V2.** As a user, Grimoire remembers the last vault I opened and reopens it on launch.
- **V3.** As a user, if I edit files outside Grimoire (e.g. `git pull`, editing in vim), Grimoire picks up the changes without a restart.
- **V4.** As a user, my preferences for a vault (theme, editor, sandbox, layout) live in the vault's `.grimoire/` folder, so they follow the vault to every machine through git.
- **V5.** As a user, machine-specific things (toolchain paths, last open item, PDF page positions) never cause git diffs.

### Reading list
- **L1.** As a user, I can add an item by pasting a URL, with an optional title and tags. If I leave the title empty, Grimoire tries to fetch the page title (or the PDF's embedded title).
- **L1a.** As a user, I can add a PDF from disk (file picker or drag-and-drop onto the list). It is copied into the new item's folder, and its title defaults to the PDF's metadata title or file name.
- **L2.** As a user, I see my reading list with pending items first, each showing title, domain (or "local PDF"), tags and an icon for its type (article, video, PDF).
- **L3.** As a user, I can mark an item done / not done.
- **L4.** As a user, I can edit an item's title, URL and tags, and delete an item (with confirmation; deleting the folder is a separate, explicit choice).
- **L5.** As a user, I can search the list by text and filter by one or more tags (e.g. typing `#rust #async` shows items tagged with both).
- **L6.** As a user, I can see all tags in use, with counts, and click one to filter.

### Study view
- **S1.** As a user, clicking an item opens the study view: content on the left, notes on the right.
- **S2.** As a user, articles render as a live web page; YouTube (and other supported video hosts) render as an embedded player; PDFs render in a built-in PDF viewer.
- **S2a.** As a user, in the PDF viewer I can scroll pages, zoom, jump to a page, use the outline (table of contents) if the PDF has one, search text, and select/copy text into my notes.
- **S2b.** As a user, a PDF reopens at the page I left off on (per machine).
- **S3.** As a user, I can drag the divider to resize the two panes, and collapse either one.
- **S4.** As a user, I can open the URL in my system browser if the page doesn't render well inside the app.
- **S5.** As a user, I can go back to the reading list with one click or `Esc`.

### Notes
- **N1.** As a user, I write Markdown in a plain-text editor with light syntax highlighting (headings, emphasis, code, links, lists).
- **N2.** As a user, fenced code blocks get syntax highlighting for the language named in the fence.
- **N3.** As a user, I see inline lint hints for common Markdown issues (e.g. broken heading hierarchy, trailing spaces), and they never block me.
- **N4.** As a user, notes autosave shortly after I stop typing; I never need to press save.
- **N5.** As a user, I can toggle a rendered preview of my notes.

### Sandbox
- **X1.** As a user, I can open a sandbox panel below (or tabbed with) the notes editor.
- **X2.** As a user, I choose a language — Python, Rust, Java, Go, C or JavaScript — and get a starter template.
- **X3.** As a user, I press **Run** (`⌘↩`) and see stdout, stderr, exit code and run time.
- **X4.** As a user, a runaway program is killed after a timeout, and I can stop it manually.
- **X5.** As a user, I am told clearly if a toolchain is missing (e.g. "`go` not found on PATH") rather than seeing a cryptic error.
- **X6.** As a user, I can **Save to note**, which writes the current snippet to the item's `sandbox/` folder (e.g. `sandbox/main.rs`). Saved snippets are listed and can be reopened.
- **X7.** As a user, I can insert the current snippet (and optionally its output) into my notes as a fenced code block.

## 8. Functional requirements

### 8.1 Vault layout

```
my-vault/
├── INDEX.md                    # the reading list (source of truth for items)
├── .gitignore                  # created by Grimoire; ignores .grimoire/local/ and build artefacts
├── .grimoire/
│   ├── config.json             # vault preferences (committed)
│   └── local/                  # per-machine, git-ignored
│       ├── settings.json       # toolchain path overrides
│       └── state.json          # last open item, PDF page positions, window layout
├── attention-is-all-you-need/
│   ├── NOTES.md
│   └── sandbox/
│       ├── main.py
│       └── main.rs
├── crafting-interpreters/
│   ├── NOTES.md
│   └── crafting-interpreters.pdf   # local PDF copied in on add
└── rust-async-book-ch-3/
    └── NOTES.md
```

- Each item's folder name is a **slug** derived from its title at creation time (lowercase, ASCII, hyphen-separated, de-duplicated with a numeric suffix). It does not change when the title is later edited.
- `NOTES.md` is created when the item is added, so the folder is tracked by git.
- `sandbox/` is created only when the first snippet is saved.

### 8.2 `INDEX.md` format

`INDEX.md` must be readable and editable by hand, and render sensibly on GitHub.

```markdown
# Grimoire

- [ ] [Attention Is All You Need](https://arxiv.org/abs/1706.03762) #ml #papers · [notes](attention-is-all-you-need/NOTES.md)
- [ ] [Async Rust, chapter 3](https://rust-lang.github.io/async-book/03_async_await/01_chapter.html) #rust #async · [notes](rust-async-book-ch-3/NOTES.md)
- [x] [Designing Data-Intensive Applications talk](https://www.youtube.com/watch?v=xxxx) #distributed-systems · [notes](ddia-talk/NOTES.md)
- [ ] [Crafting Interpreters](crafting-interpreters/crafting-interpreters.pdf) #compilers #books · [notes](crafting-interpreters/NOTES.md)
```

Rules:
- One item per line: checkbox, Markdown link (title + source), zero or more `#tags`, and a relative `[notes](<slug>/NOTES.md)` link.
- The source is either an absolute `http(s)` URL or a vault-relative path to a PDF inside the item's own folder. Relative links render and open correctly on GitHub too.
- The notes link is the item's stable identity (it ties the line to its folder).
- Tags match `#[a-z0-9][a-z0-9-_/]*`, case-insensitive, stored lowercase.
- Lines Grimoire doesn't understand (headings, prose, blank lines) are **preserved verbatim** on write.
- Item order in the file is preserved; new items are appended under the first heading.
- An item line with no notes link (e.g. added by hand) is valid; Grimoire creates its folder and adds the link the first time it's opened.

### 8.3 `NOTES.md` format

Plain Markdown. On creation Grimoire writes:

````markdown
# Attention Is All You Need

<https://arxiv.org/abs/1706.03762>

````

After that the file belongs to the user; Grimoire never rewrites it except through the editor.

### 8.4 Content rendering

- **Articles:** rendered in an embedded browser view pointed at the URL.
- **Videos:** URLs from YouTube are converted to their embed form and played in an embedded player. Vimeo is a stretch goal for v1.
- **PDFs** are first-class items, from either source:
  - *Remote* — a URL that serves a PDF (detected by `.pdf` extension, known hosts like `arxiv.org/pdf/…`, or a `Content-Type: application/pdf` response). Downloaded on open and cached per machine; it is **not** committed to the vault.
  - *Local* — a file picked from disk, copied into `<slug>/<file-name>.pdf` and committed with the vault.
  - Both render in Grimoire's own PDF viewer (so the notes side can talk to it, and it keeps working when other platforms are added): continuous scroll, zoom/fit-width, page jump, outline sidebar, text search and text selection.
  - "Copy selection as quote" inserts the selected text into the notes as a `>` blockquote with a page reference (`— p. 42`).
  - The last-read page is remembered per machine in `.grimoire/local/state.json`.
  - A "convert to local" action downloads a remote PDF into the item folder and rewrites the item's source, for papers you want to keep.
- Navigation inside the web pane is allowed (following links), with back/forward and "reset to item URL".

### 8.5 Sandbox execution

| Language | File | Run command (v1) | Toolchain |
|---|---|---|---|
| Python | `main.py` | `python3 main.py` | Python 3 |
| JavaScript | `main.js` | `node main.js` | Node.js |
| Go | `main.go` | `go run main.go` | Go |
| Rust | `main.rs` | `rustc main.rs -o main && ./main` | rustc |
| C | `main.c` | `cc main.c -o main && ./main` | cc / clang / gcc |
| Java | `Main.java` | `java Main.java` (single-file source launch) | JDK 11+ |

- Uses the toolchains installed on the user's machine, discovered on `PATH` (with a per-language override path in settings).
- Each run happens in a fresh temporary directory; compiled artefacts never touch the vault.
- Default timeout 10 s (configurable); output is capped (default 1 MiB) and truncated with a notice.
- Output is streamed live, not shown only at the end.
- No interactive stdin in v1; an optional "stdin" text box feeds input up front.

### 8.6 Search

- Free text matches title, URL and tags.
- `#tag` tokens in the query are AND-ed tag filters.
- `is:done` / `is:todo` filter by state.
- Results update as you type (< 50 ms for 5,000 items).
- Full-text search over `NOTES.md` is a v1.1 goal.

### 8.7 Preferences and the `.grimoire/` folder

All of a vault's preferences live inside the vault, in `.grimoire/`:

| File | Committed? | Contents |
|---|---|---|
| `.grimoire/config.json` | Yes | Vault preferences: theme, editor font size / line wrap, enabled lint rules, default split ratio, sandbox timeout / output cap / default language, autosave delay. |
| `.grimoire/local/settings.json` | No (git-ignored) | Per-machine overrides: toolchain paths, and any `config.json` key the user wants different on this machine. |
| `.grimoire/local/state.json` | No (git-ignored) | UI state: last open item, PDF page positions, pane sizes. |
| `.grimoire/local/cache/` | No (git-ignored) | Downloaded remote PDFs, fetched titles. Safe to delete. |

- Effective preferences = built-in defaults ← `config.json` ← `local/settings.json`.
- Files are validated on load. An invalid file never crashes the app or gets overwritten: Grimoire falls back to defaults for the bad keys and shows which key is wrong and why.
- Unknown keys are preserved on write, so a newer Grimoire version's settings survive being opened by an older one.
- A JSON Schema is written to `.grimoire/config.schema.json` so editing `config.json` by hand gets autocompletion and validation in editors like VS Code.
- The only thing stored outside the vault is the list of recent vaults (in `~/Library/Application Support/<bundle-id>/`), because the app needs it before any vault is open.

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Cold start to interactive reading list < 1 s for a 1,000-item vault. Keystroke-to-render latency in the editor < 16 ms. |
| **Durability** | Writes are atomic (write temp file → rename). A crash never leaves a half-written `INDEX.md` or `NOTES.md`. |
| **Git friendliness** | Deterministic, minimal diffs: stable ordering, `\n` line endings, trailing newline, no timestamps rewritten on unrelated edits. |
| **Platform** | macOS 13+, native universal binary (Apple silicon + Intel). Feels like a Mac app: standard menu bar (incl. Edit menu so ⌘C/⌘V/⌘Z work everywhere), ⌘ shortcuts, inset traffic-light title bar, "Reveal in Finder", follows system appearance and accent colour. |
| **Vault portability** | Even though the app is macOS-only, the *vault* must stay portable: paths are always relative, folder names are filesystem-safe on macOS, Linux and Windows, and nothing macOS-specific (no `.DS_Store` reliance, no extended attributes) is required. The generated `.gitignore` ignores `.DS_Store`. |
| **Footprint** | Installer < 20 MB; idle memory < 200 MB with one study view open. |
| **Offline** | Everything except fetching remote content works offline. |
| **Privacy** | No telemetry. The app makes network requests only to load the item's URL and (optionally) fetch its title. |
| **Accessibility** | Fully keyboard-navigable; respects system light/dark mode and font scaling. |

## 10. UX sketch

**Reading list**

```
┌──────────────────────────────────────────────────────────────┐
│ grimoire · ~/notes/vault                         [+ Add]  ⚙  │
├──────────────────────────────────────────────────────────────┤
│ 🔍 search…  #rust                                            │
│ #rust 4  #ml 3  #papers 2  #distributed-systems 1            │
├──────────────────────────────────────────────────────────────┤
│ ☐ ▶ Async Rust, chapter 3          rust-lang.github.io  #rust│
│ ☐ 📄 Attention Is All You Need      arxiv.org       #ml #pap…│
│ ☑ ▶ DDIA talk                       youtube.com     #dist…   │
└──────────────────────────────────────────────────────────────┘
```

**Study view**

```
┌───────────────────────────────┬──────────────────────────────┐
│ ← back   arxiv.org/abs/1706…  │ NOTES.md          [preview]  │
│ ◀ ▶ ⟳  ↗ open in browser       │ # Attention Is All You Need  │
│                               │                              │
│                               │ - self-attention is …        │
│      (web page / video)       │                              │
│                               ├──────────────────────────────┤
│                               │ sandbox  [python ▾] ▶ Run 💾 │
│                               │ import numpy as np           │
│                               │ …                            │
│                               ├──────────────────────────────┤
│                               │ stdout ▸ [[0.1 0.9] …]  0.12s│
└───────────────────────────────┴──────────────────────────────┘
```

## 11. Milestones

| Milestone | Scope |
|---|---|
| **M0 — Skeleton** | Tauri app in `app/`, open/create vault, `.grimoire/` config load/validate/save. |
| **M1 — Reading list** | Parse/write `INDEX.md`, add / edit / toggle / delete items (URLs and local PDFs), tags, search. File watching. |
| **M2 — Study view** | Split pane, embedded web view + YouTube embed, PDF viewer, Markdown editor with highlighting, lint and autosave. |
| **M3 — Sandbox** | Six languages, toolchain detection, streamed output, timeout/stop, save to `sandbox/`, insert into notes. |
| **M4 — Polish (v1.0)** | Keyboard shortcuts, menu bar, preview, themes, error states, signed + notarised universal `.dmg` for macOS, auto-update. |
| **v1.1** | Full-text notes search, Vimeo/PDF improvements, per-item reading progress, quick-add from clipboard / Share extension. |
| **Later** | Linux and Windows builds. |

## 12. Success criteria

- I use Grimoire as my only reading list for 4 consecutive weeks.
- A vault cloned on a second machine opens with zero manual fixes.
- Hand-editing `INDEX.md` and then opening Grimoire never loses data.
- I run code from the sandbox in at least a third of the items I study.

## 13. Risks and open questions

| Risk / question | Notes / mitigation |
|---|---|
| Many sites refuse to be framed (`X-Frame-Options`, CSP `frame-ancestors`). | Render articles in a **native child webview**, not an `<iframe>`; framing headers don't apply. Always offer "open in browser". See ARCHITECTURE §5. |
| Sites requiring login (Medium, paywalls). | Child webview keeps a persistent cookie store, so logging in once inside the app works. |
| Running arbitrary code. | Clearly documented as unsandboxed; timeout + output cap + temp dir limit accidental damage. Container-based isolation is a future option. |
| Merge conflicts in `INDEX.md` from editing on two machines. | One-item-per-line format keeps conflicts small and hand-resolvable. Parser tolerates conflict markers by showing a banner instead of overwriting. |
| Title fetching may be slow or fail. | Best-effort with a short timeout; fall back to the URL. |
| Should notes support multiple files per item? | Out of scope for v1; the folder structure allows it later. |
| Tauri's multi-webview API (used for the web pane) is still behind the `unstable` feature. | Only WKWebView matters for v1, so it's one platform to validate. Fallback: a borderless child `NSWindow` docked over the left pane. |
| Gatekeeper blocks unsigned apps. | Sign with a Developer ID certificate and notarise in CI from M0, so every build is installable. |
| Local PDFs bloat the git repo. | Warn when adding a PDF over 20 MB. `vault_create` offers to write a `.gitattributes` that routes `*.pdf` through Git LFS. Remote PDFs are cached outside git by default. |
| Preference files edited by hand can be invalid. | Validated on load with per-key errors and fallbacks; never overwritten while invalid. |
