# Grimoire — Architecture

| | |
|---|---|
| **Status** | Draft v0.1 |
| **Last updated** | 2026-11-08 |
| **Related** | [PRD](./PRD.md) |

**Targets:** macOS 13 Ventura+ (universal binary), Windows 10/11 (x64) and Linux (x64, WebKitGTK 4.1). §11 covers what differs per platform.

This document describes how Grimoire is built: the runtime, the code layout under `app/`, the on-disk data model, and how each major feature (vault I/O, content rendering, editor, sandbox) works.

---

## 1. Principles

1. **The filesystem is the database.** No SQLite, no IndexedDB, no hidden state in the vault. Anything Grimoire knows about a vault it can re-derive by reading files.
2. **Rust owns I/O, the webview owns UI.** All filesystem access, process spawning and network fetches go through Tauri commands. The frontend never touches the disk directly.
3. **Round-trip safety.** Grimoire must be able to read a file a human edited and write it back without losing anything it didn't understand.
4. **Small surface.** Few dependencies, few concepts, one window.

## 2. High-level view

```
┌──────────────────────────── Tauri window ───────────────────────────────┐
│                                                                          │
│  ┌──────────── child webview ───────────┐ ┌──── main webview (UI) ────┐ │
│  │  item URL (article / video embed)    │ │  React 19 + TypeScript     │ │
│  │  - native browser engine             │ │  - Reading list            │ │
│  │  - own cookie store                  │ │  - PDF viewer (pdf.js)     │ │
│  │  - no access to Tauri IPC            │ │  - Notes editor (CM6)      │ │
│  └──────────────────────────────────────┘ │  - Sandbox editor (CM6)    │ │
│        (shown for web items only)         │  - Zod at every boundary   │ │
│                                           └─────────────┬──────────────┘ │
│                                                         │ invoke / events│
│  ┌──────────────────────────── Rust core (src-tauri) ───┴──────────────┐ │
│  │  vault::   open / create / watch / atomic write                     │ │
│  │  config::  .grimoire/ load, layer, validate, write                  │ │
│  │  index::   parse + serialize INDEX.md (lossless)                    │ │
│  │  notes::   read / write NOTES.md                                    │ │
│  │  content:: source classification, title fetch, PDF import/cache,    │ │
│  │            child-webview control                                    │ │
│  │  sandbox:: toolchain detection, run, stream, kill, save             │ │
│  └─────────────────────────────┬───────────────────────────────────────┘ │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────────┐
              ▼                  ▼                      ▼
        Vault folder        Local toolchains      App config dir
   (INDEX.md, item/…,     (python3, node, go,    (recent vaults only)
    .grimoire/)            rustc, cc, java)
        → git remote
```

## 3. Technology choices

| Layer | Choice | Why |
|---|---|---|
The frontend deliberately uses the current generation of the React ecosystem. Exact versions are pinned in `app/package.json` at scaffold time (latest stable of each); the majors below are the floor.

**Runtime and backend**

| Layer | Choice | Why |
|---|---|---|
| Desktop runtime | **Tauri 2** | Small binaries, system webview (WKWebView on macOS), Rust backend, multi-webview, capability-based permissions. |
| Backend | **Rust** (stable, edition 2024) | Comes with Tauri; good fit for file I/O and process management. |
| Typed IPC | **tauri-specta** | Generates TypeScript bindings for every command and event from the Rust signatures, so the two sides can't drift. |
| File watching | `notify` + `notify-debouncer-full` | FSEvents on macOS; portable API for later platforms. |
| macOS integration | Tauri `Menu` API, `tauri-plugin-opener`, `tauri-plugin-dialog`, `tauri-plugin-updater` | Native menu bar, Reveal in Finder / open in browser, file pickers, signed auto-updates. |
| Process spawning | `tokio::process` | Async spawn, streamed stdout/stderr, kill on timeout. |
| HTTP | `reqwest` (rustls) | Title fetch and remote-PDF download. |
| Serialization | `serde`, `serde_json` | Config, state and IPC payloads. |

**Frontend**

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict, `noUncheckedIndexedAccess`) | |
| UI library | **React 19** + **React Compiler** | Compiler handles memoisation, so no `useMemo`/`useCallback` noise. |
| Build | **Vite 7+** | Tauri's default; instant HMR. |
| Package manager | **pnpm** | Fast, strict dependency resolution. |
| Routing | **TanStack Router** | Type-safe routes and search params (`/item/$id?pane=pdf&page=12`); search params themselves validated with Zod. |
| Server state | **TanStack Query 5** | Caches IPC reads (`index`, `notes`, `config`, `toolchains`); watcher events invalidate queries. |
| Client state | **Zustand 5** | Small, local UI state only: sandbox run, split sizes, dirty flags. |
| Validation | **Zod 4** | One schema per data shape: IPC responses and event payloads, `.grimoire/*.json`, form input, route search params. Types come from `z.infer`. |
| Forms | **TanStack Form** | Add / edit item dialog, settings screen. Uses Zod schemas directly (Standard Schema). |
| Styling | **Tailwind CSS 4** | CSS-first config with design tokens as CSS variables; light/dark via `prefers-color-scheme` + vault theme. |
| Components | **shadcn/ui** (on Radix primitives) | Copied-in, unstyled-by-default accessible primitives: dialog, command palette, popover, tooltip, resizable panels. |
| Icons | **lucide-react** | |
| Editor | **CodeMirror 6** | Modular, fast. Used for both notes and sandbox. |
| Markdown highlighting | `@codemirror/lang-markdown` + `@codemirror/language-data` | Highlights Markdown and fenced code blocks by language. |
| Markdown lint | **markdownlint** (via `@codemirror/lint`) | The standard Markdown linter, run in a debounced lint source. Rule set configurable in `.grimoire/config.json`. |
| Markdown preview | **react-markdown** + `remark-gfm` + `rehype-sanitize` + `rehype-highlight` | GFM tables/task lists; sanitised because notes can contain raw HTML. |
| PDF | **pdf.js** (`pdfjs-dist`) | Viewer we control (page events, selection → notes); text layer for selection and search; outline API; portable to other platforms later. |
| Sandbox languages | `@codemirror/lang-{python,rust,java,go,cpp,javascript}` | One package per language; C uses the cpp grammar. |
| Lint / format | **Biome 2** | One fast tool for lint + format; replaces ESLint + Prettier. |
| Unit tests | **Vitest** | |
| E2E | **Playwright** against the Vite dev server with `@tauri-apps/api/mocks` | `tauri-driver` has no macOS support (WKWebView has no WebDriver), so UI flows are tested in a browser with IPC mocked, and Rust is tested directly. |

## 4. Repository layout

```
grimoire/
├── README.md
├── docs/
│   ├── PRD.md
│   └── ARCHITECTURE.md
└── app/                          # everything for the desktop app
    ├── package.json
    ├── pnpm-lock.yaml
    ├── vite.config.ts
    ├── tsconfig.json
    ├── biome.json
    ├── components.json           # shadcn/ui config
    ├── index.html
    ├── src/                      # frontend (main webview)
    │   ├── main.tsx              # QueryClient, RouterProvider
    │   ├── routes/               # TanStack Router file-based routes
    │   │   ├── __root.tsx
    │   │   ├── index.tsx         # vault picker / redirect
    │   │   ├── list.tsx          # reading list (?q=…&tags=…)
    │   │   └── item.$id.tsx      # study view (?page=…)
    │   ├── ipc/
    │   │   ├── bindings.ts       # generated by tauri-specta (do not edit)
    │   │   ├── client.ts         # wraps bindings, parses results with Zod
    │   │   └── events.ts         # typed, Zod-validated event listeners
    │   ├── schemas/              # Zod schemas: single source of truth for shapes
    │   │   ├── item.ts
    │   │   ├── config.ts         # .grimoire/config.json + local/settings.json
    │   │   ├── state.ts          # .grimoire/local/state.json
    │   │   ├── sandbox.ts
    │   │   └── search.ts         # route search params
    │   ├── queries/              # TanStack Query hooks + keys
    │   │   ├── index.ts
    │   │   ├── notes.ts
    │   │   ├── config.ts
    │   │   └── toolchains.ts
    │   ├── stores/               # zustand (UI-only state)
    │   │   ├── sandbox.ts
    │   │   └── layout.ts
    │   ├── features/
    │   │   ├── list/             # ItemList, TagBar, SearchBox, AddItemDialog
    │   │   ├── study/            # StudyLayout, ContentPane
    │   │   ├── web/              # WebPane (positions the child webview)
    │   │   ├── pdf/              # PdfViewer, Outline, PdfSearch, text-layer copy
    │   │   ├── notes/            # NotesEditor, Preview
    │   │   ├── sandbox/          # SandboxPanel, OutputConsole, LanguagePicker
    │   │   └── settings/         # SettingsDialog (TanStack Form + Zod)
    │   ├── editor/               # CodeMirror setup, themes, lint source
    │   │   ├── markdown.ts
    │   │   ├── lint.ts
    │   │   └── languages.ts
    │   ├── components/ui/        # shadcn/ui primitives
    │   ├── lib/
    │   │   └── search.ts         # query parsing + filtering
    │   └── styles/
    │       └── app.css           # Tailwind 4 entry + theme tokens
    └── src-tauri/                # Rust backend
        ├── Cargo.toml
        ├── tauri.conf.json
        ├── capabilities/
        │   └── default.json      # IPC permissions (main webview only)
        └── src/
            ├── main.rs
            ├── lib.rs            # builder, plugin + command registration
            ├── error.rs
            ├── recent.rs         # recent-vaults list (~/Library/Application Support)
            ├── menu.rs           # native macOS menu bar
            ├── platform/
            │   └── macos.rs      # login-shell PATH, Dock drop, Finder reveal
            ├── config/
            │   ├── mod.rs        # load + layer defaults/config/local
            │   ├── model.rs      # serde structs with defaults
            │   └── state.rs      # .grimoire/local/state.json
            ├── vault/
            │   ├── mod.rs        # open/create, path safety
            │   ├── fs.rs         # atomic writes
            │   └── watch.rs
            ├── index/
            │   ├── mod.rs
            │   ├── parse.rs
            │   ├── serialize.rs
            │   └── slug.rs
            ├── notes.rs
            ├── content/
            │   ├── mod.rs        # URL classification
            │   ├── title.rs
            │   ├── pdf.rs        # import local PDF, download + cache remote PDF
            │   └── webview.rs    # child webview lifecycle
            └── sandbox/
                ├── mod.rs
                ├── languages.rs  # per-language spec table
                ├── toolchain.rs  # detection
                └── runner.rs     # spawn, stream, timeout, kill
```

## 5. Data model

### 5.1 In-memory types

Rust structs are the wire format; TypeScript types are generated from them by tauri-specta, and matching Zod schemas in `src/schemas/` validate data at runtime (see §7.6).

```rust
pub struct Item {
    pub id: String,          // folder slug, e.g. "attention-is-all-you-need"
    pub title: String,
    pub source: Source,      // what the link in INDEX.md points to
    pub tags: Vec<String>,   // lowercase, without '#'
    pub done: bool,
    pub kind: ContentKind,   // derived from source, not stored
    pub has_folder: bool,    // whether <slug>/ exists
}

pub enum Source {
    Url(String),             // "https://…"
    LocalFile(String),       // vault-relative, e.g. "crafting-interpreters/book.pdf"
}

pub enum ContentKind { Article, YouTube, Vimeo, Pdf }

pub struct Index {
    pub lines: Vec<Line>,    // the whole file, in order
}

pub enum Line {
    Item(Item, ItemLineMeta),  // meta keeps original spacing/ordering details
    Raw(String),               // anything not recognised, preserved verbatim
}
```

`Index` keeps **every line** of `INDEX.md`. Operations mutate the `Item` entries in place and re-serialize; `Raw` lines are written back untouched. This is what makes hand edits safe.

### 5.2 `INDEX.md` grammar

```
item_line  := "- [" state "] " link (ws tag)* (ws "·" ws notes_link)? ws?
state      := " " | "x" | "X"
link       := "[" title "](" source ")"
source     := http_url | slug "/" file_name ".pdf"
tag        := "#" [a-z0-9][a-z0-9_/-]*
notes_link := "[notes](" slug "/NOTES.md)"
```

Parsing is line-based with a small hand-written parser (no regex soup, no full Markdown AST — a CommonMark parser would normalise and lose formatting). A line that doesn't match `item_line` becomes `Line::Raw`.

Identity: if the line has a `notes_link`, its slug is the id. If not (hand-added line), the id is assigned lazily — when the item is first opened Grimoire creates the folder and rewrites that single line to append the link.

If the file contains git conflict markers (`<<<<<<<`), the vault is opened **read-only** with a banner asking the user to resolve the conflict; Grimoire never writes over a conflicted index.

### 5.3 Slugs

`slug(title)`: Unicode → ASCII transliteration (`deunicode`), lowercase, non-alphanumerics → `-`, collapse repeats, trim, max 60 chars. Reserved names (`sandbox`, `.git`, Windows device names like `con`, `nul`) get a suffix. Collisions get `-2`, `-3`, …. Slugs are assigned once and never change.

### 5.4 The `.grimoire/` folder

```
.grimoire/
├── config.json           # committed — vault preferences
├── config.schema.json    # committed — generated JSON Schema (editor autocompletion)
└── local/                # git-ignored — this machine only
    ├── settings.json     # overrides: toolchain paths + any config.json key
    ├── state.json        # UI state
    └── cache/            # remote PDFs, fetched titles (disposable)
```

`config.json`:

```json
{
  "$schema": "./config.schema.json",
  "version": 1,
  "theme": "system",
  "editor": { "fontSize": 14, "lineWrap": true, "autosaveMs": 750 },
  "lint": { "enabled": true, "rules": { "MD013": false, "MD033": false } },
  "layout": { "splitRatio": 0.55, "sandboxOpen": true },
  "sandbox": { "timeoutMs": 10000, "maxOutputBytes": 1048576, "defaultLanguage": "python" },
  "pdf": { "defaultZoom": "page-width" }
}
```

`local/settings.json` (same shape as `config.json`, every key optional, plus machine-only keys):

```json
{
  "toolchains": { "python": "/opt/homebrew/bin/python3", "java": "/usr/lib/jvm/jdk-21/bin/java" },
  "editor": { "fontSize": 16 }
}
```

`local/state.json`:

```json
{
  "lastOpenItem": "attention-is-all-you-need",
  "pdfPositions": { "crafting-interpreters": { "page": 112, "zoom": 1.25 } },
  "splitSizes": [55, 45]
}
```

**Layering.** Effective config = built-in defaults ← `config.json` ← `local/settings.json`, deep-merged per key. The frontend only ever sees the effective config plus, for the settings screen, which layer each value came from. The settings screen writes to `config.json` by default; a per-field "only on this machine" toggle writes to `local/settings.json` instead.

**Validation.**
- Rust deserialises each file with `serde` (`#[serde(default)]` everywhere) and keeps the original `serde_json::Value` so unknown keys survive a rewrite.
- Invalid values are not fatal: the bad key falls back to its default, and the error (`editor.fontSize: expected number ≥ 8, got "big"`) is returned alongside the config. The file is not rewritten until the user fixes it or saves from the settings screen.
- The frontend parses every config/state payload with the Zod schema in `src/schemas/config.ts`. That Zod schema is also the source of `config.schema.json` (via `z.toJSONSchema`, written by a build script), so hand-editing in VS Code gets the same rules the app enforces.

**Outside the vault.** Only `<app_config_dir>/recent.json` (`{ "vaults": ["/path", …] }`) lives outside the vault, because the app must know which vault to open before it can read one.

**Git.** `vault_create` writes a `.gitignore` containing `.grimoire/local/` and `.DS_Store`, so machine-specific files never cause diffs or conflicts.

## 6. Backend modules

### 6.1 `vault`

- `vault_open(path)` / `vault_create(path)`: validates the folder, creates `INDEX.md`, `.grimoire/config.json` (defaults), `.grimoire/config.schema.json` and a `.gitignore` if missing, loads config, starts the watcher, adds the vault to `recent.json`, and returns the parsed index plus effective config. `vault_create` can also write a `.gitattributes` routing `*.pdf` through Git LFS.
- **Path safety:** every path coming from the frontend is an item id or a relative filename; it's joined onto the vault root and canonicalised, and rejected if it escapes the root.
- **Atomic writes:** write to `<file>.grimoire-tmp` in the same directory → `fsync` → `rename`. Line endings normalised to `\n`, trailing newline enforced.
- **Watcher:** `notify` with a 200 ms debounce on the vault root (ignoring `.grimoire/local/` and `.git/`). On change to `INDEX.md` → re-parse and emit `index://changed`. On change to an open `NOTES.md` → emit `notes://changed { id }`. On change to `.grimoire/config.json` (e.g. after `git pull`) → reload and emit `config://changed`. Self-writes are suppressed by recording the content hash of each write and ignoring events whose file hash matches.

### 6.2 `index`

Commands: `index_get`, `item_add { source, title?, tags }`, `item_update { id, patch }`, `item_toggle { id }`, `item_delete { id, deleteFolder }`.

`source` on `item_add` is either `{ url }` or `{ filePath }` (an absolute path from the file picker / drag-and-drop).

`item_add`:
1. URL source: normalise; classify `ContentKind` (a `HEAD` request settles ambiguous URLs that might be PDFs). File source: verify it is a PDF by magic bytes (`%PDF-`).
2. If no title: web page → `content::fetch_title` (3 s timeout; falls back to host + path); PDF → the document's `/Title` metadata, else the file name.
3. Generate slug, create `<slug>/NOTES.md` with a header.
4. File source: copy the PDF into `<slug>/<sanitised-file-name>.pdf` (warn above 20 MB); the item's source becomes that vault-relative path.
5. Append the line after the last item (or under the first heading), serialize, atomic write.

All mutations are serialised through a single `Mutex<VaultState>` so concurrent commands can't interleave writes.

### 6.3 `notes`

`note_read { id }` → string. `note_write { id, content }` → atomic write. The frontend debounces writes (750 ms after last keystroke, and on blur / view change). If the watcher reports an external change while the editor has unsaved edits, the UI shows "file changed on disk — reload / keep mine".

### 6.4 `content`

`classify(url)`:

| Pattern | Kind | Render as |
|---|---|---|
| `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID` | YouTube | `https://www.youtube-nocookie.com/embed/ID?start=…` |
| `vimeo.com/ID` | Vimeo | `https://player.vimeo.com/video/ID` |
| local `*.pdf` path, URL ending in `.pdf`, `arxiv.org/pdf/…`, or `Content-Type: application/pdf` | Pdf | in-app PDF viewer (below) |
| anything else | Article | the URL directly |

**Rendering strategy.** An `<iframe>` in the main webview is *not* used for articles, because many sites send `X-Frame-Options: DENY` or CSP `frame-ancestors` and would render blank. Instead Grimoire uses a **Tauri child webview** (`Window::add_child`, Tauri v2 multi-webview) that is a real top-level browsing context, so framing headers don't apply.

- The frontend's `ContentPane` reports its bounding rect (via `ResizeObserver`) and calls `content_webview_set_bounds`; the Rust side positions the child webview over that area. Hidden when not in the study view.
- One child webview is reused across items (`content_webview_navigate { url }`), keeping a persistent cookie store so logging into a site once works.
- The child webview gets **no IPC capabilities** — `capabilities/default.json` grants commands only to the `main` webview label, so untrusted pages can't call into Rust.
- Back / forward / reload / open-in-browser are commands on the child webview; "open in browser" uses `tauri-plugin-opener`.
- Embeds (YouTube/Vimeo) load their embed URL in the same child webview, so there's one rendering path for the web.

**PDFs** are rendered in the **main webview** with pdf.js, not in the child webview. WKWebView can display PDFs itself, but it exposes no page or selection events, and owning the viewer lets the notes side talk to it (copy-as-quote with page number, resume position). It also means the viewer works unchanged when other platforms are added.

- *Bytes:* `pdf_open { id }` resolves the item's source to a file on disk — the vault-relative file for local PDFs, or `.grimoire/local/cache/pdf/<sha256(url)>.pdf` for remote ones (downloaded on first open by Rust, which sidesteps CORS; re-validated with `ETag`/`If-Modified-Since`). It returns that path, which the frontend loads through Tauri's asset protocol (`convertFileSrc`). The asset-protocol scope is limited to the open vault's directory.
- *Viewer:* pdf.js `PDFViewer` with the text layer enabled (selection, search), the outline API for the table of contents, and virtualised page rendering so 1,000-page books stay smooth. The pdf.js worker is bundled locally by Vite.
- *Position:* page + zoom are written (debounced) to `.grimoire/local/state.json` via `state_patch`.
- *Copy as quote:* the selection text plus `pageNumber` is turned into `> text\n>\n> — p. 42` and inserted at the notes cursor.
- *Convert to local:* `pdf_make_local { id }` moves the cached file into `<slug>/` and rewrites the item's source in `INDEX.md`.

### 6.5 `sandbox`

**Language table** (`languages.rs`), the single place that knows about languages:

```rust
pub struct LangSpec {
    pub id: &'static str,            // "python"
    pub file_name: &'static str,     // "main.py"
    pub binaries: &'static [&'static str], // probed on PATH, in order
    pub version_arg: &'static str,   // "--version"
    pub steps: &'static [Step],      // compile? then run
    pub template: &'static str,
}
```

| id | file | steps |
|---|---|---|
| `python` | `main.py` | `python3 main.py` |
| `javascript` | `main.js` | `node main.js` |
| `go` | `main.go` | `go run main.go` |
| `rust` | `main.rs` | `rustc -O main.rs -o main` → `./main` |
| `c` | `main.c` | `cc -O2 main.c -o main` → `./main` |
| `java` | `Main.java` | `java Main.java` (JEP 330 single-file launch) |

Adding a language = one table entry + one CodeMirror language package.

**Toolchain detection** (`toolchain_list`): at startup and on demand, for each language resolve the binary (`toolchains.<lang>` in `.grimoire/local/settings.json` → `which` on `PATH`), run `--version` with a 2 s timeout, cache the result. On macOS, GUI apps don't inherit the shell `PATH`, so the app resolves the user's login-shell `PATH` once at startup (`$SHELL -lc 'echo $PATH'`) and uses it for detection and runs.

**Run lifecycle** (`sandbox_run { lang, code, stdin? } → runId`):

```
frontend                    runner (tokio task)                      OS
   │ sandbox_run ──────────▶ create temp dir (tempfile::TempDir)
   │◀── runId                write main.<ext>
   │                         for each step:
   │                           spawn (cwd=temp, env=clean+PATH) ───▶ process
   │◀── sandbox://output ◀──── read stdout/stderr lines ◀──────────┘
   │     {runId, stream, chunk}
   │                           enforce timeout / output cap → kill
   │◀── sandbox://exit ◀────── {runId, step, code, durationMs, reason}
   │                         drop temp dir
   │ sandbox_stop {runId} ──▶ kill process group
```

- Each step is spawned in its own **process group** (`process_group(0)`), and stop/timeout sends `SIGTERM` then `SIGKILL` to the whole group (`killpg`) so children die too.
- Timeout and output cap come from the effective `sandbox` config and apply to the whole run (compile + execute).
- Output chunks are coalesced every ~30 ms to avoid flooding IPC.
- Only one run per study view at a time; starting a new run stops the previous one.
- **Not a security sandbox.** Code runs as the user with full filesystem and network access. The temp dir, clean env, timeout and output cap prevent accidents, not attacks. Container/WASI isolation is listed as future work.

**Saving** (`sandbox_save { id, lang, code, fileName? }`): writes to `<vault>/<id>/sandbox/<fileName or default>`. `sandbox_list { id }` lists saved files; `sandbox_load` reads one. Because runs happen in a temp dir, no build artefacts end up in the vault; the generated `.gitignore` additionally ignores `sandbox/main`, `*.class`, `*.o` in case the user compiles manually.

### 6.6 Errors

All commands return `Result<T, AppError>`; `AppError` serialises to `{ kind, message, details? }` (kinds: `NotFound`, `InvalidPath`, `Conflict`, `Io`, `ToolchainMissing`, `Network`, `Parse`, `InvalidConfig`, `NotAPdf`). The frontend parses errors with a Zod discriminated union and maps kinds to friendly messages.

## 7. Frontend

### 7.1 Routes

TanStack Router, file-based, with Zod-validated search params:

| Route | View | Search params |
|---|---|---|
| `/` | Vault picker, or redirect to `/list` if a recent vault opens | – |
| `/list` | Reading list: search box, tag bar, item list, add dialog | `q`, `tags[]`, `state` |
| `/item/$id` | Study view: content pane (web or PDF) left; notes, sandbox, output right | `page` (PDF deep link), `preview` |

Putting search and filters in the URL makes "back" from an item restore the exact list view for free.

### 7.2 State

| Kind | Where | Examples |
|---|---|---|
| Data owned by Rust (files) | **TanStack Query** | `['index']`, `['note', id]`, `['config']`, `['toolchains']`, `['pdf', id]` |
| URL state | **TanStack Router** search params | query, tag filters, PDF page |
| Ephemeral UI state | **Zustand** | sandbox run (`runId`, output buffer, status), panel sizes in flight, note dirty flag |

- Mutations (`item_add`, `item_toggle`, …) use `useMutation` with optimistic updates on `['index']`.
- Watcher events map straight to `queryClient.invalidateQueries` (`index://changed` → `['index']`, `config://changed` → `['config']`, `notes://changed` → `['note', id]`, unless the note is dirty, in which case the conflict prompt is shown).
- `staleTime: Infinity` for vault data — it only changes when Rust says so.

### 7.3 Search

Done entirely in the frontend over the in-memory item list:
- Tokenise query → `#tag` tokens, `is:done|todo`, remaining text.
- Filter by tags (AND) and state, then case-insensitive substring match of text on `title + url + tags`.
- Tag bar counts are computed from the current result set.

Linear scan is well under 50 ms at 5,000 items. Notes full-text search (v1.1) will be a Rust command that greps `*/NOTES.md` on demand rather than maintaining an index.

### 7.4 Editor setup

- **Notes:** CodeMirror 6 with `markdown({ codeLanguages: languages })`, line wrapping, a muted highlight style (headings bold, code monospace tint, links underlined, list markers dimmed), and a lint extension running `markdownlint` 500 ms after edits with the rule set from `config.lint`. Diagnostics are warnings only. Font size, wrap and autosave delay come from the effective config and are applied through CodeMirror `Compartment`s, so changing them never remounts the editor.
- **Preview:** `react-markdown` with `remark-gfm`, `rehype-sanitize` and `rehype-highlight`. Relative links/images resolve against the item folder via the asset protocol.
- **Sandbox:** separate CodeMirror instance; language extension swapped via a `Compartment` when the user changes language. `⌘↩` runs, `⌘S` saves to the item's `sandbox/`.
- **Insert into notes:** builds a fenced block (` ```rust … ``` `) plus optional `<details>` with output, inserted at the notes cursor.

### 7.5 Keyboard map (initial)

| Key | Action |
|---|---|
| `⌘N` | Add item |
| `⌘F` / `/` | Focus search |
| `Enter` | Open selected item |
| `Esc` | Back to reading list |
| `⌘↩` | Run sandbox |
| `⌘.` | Stop run |
| `⌘S` | Save snippet to `sandbox/` |
| `⌘P` | Toggle notes preview |
| `⌘K` | Command palette (open item, jump to tag, settings) |
| `⇧⌘C` | (PDF) copy selection into notes as a quote |
| `⌘,` | Vault settings |

### 7.6 Validation with Zod

Zod is the runtime gate wherever data crosses into the frontend or comes from a human:

| Boundary | Schema | On failure |
|---|---|---|
| IPC command results | `schemas/item.ts`, `schemas/sandbox.ts`, … | Throw a typed `IpcContractError` (a bug — logged and surfaced). |
| IPC events | `schemas/events.ts` | Drop the event, log. |
| `.grimoire/config.json`, `local/settings.json`, `local/state.json` | `schemas/config.ts`, `schemas/state.ts` | Use defaults for failing keys; show a banner listing `path: message` issues. |
| Add / edit item form | `ItemInputSchema` (URL or PDF path, title ≤ 200 chars, tags match `^[a-z0-9][a-z0-9_/-]*$`) | Inline field errors via TanStack Form. |
| Settings form | `ConfigSchema` | Inline field errors. |
| Route search params | `schemas/search.ts` | Fall back to defaults (bad `?page=abc` → page 1). |

Types are never hand-written for these shapes: `type Config = z.infer<typeof ConfigSchema>`. tauri-specta's generated types describe what Rust *sends*; the Zod schemas describe what the UI *accepts*. A contract test (§10) keeps them aligned.

```ts
// schemas/config.ts (excerpt)
export const ConfigSchema = z.object({
  version: z.literal(1),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  editor: z.object({
    fontSize: z.number().int().min(8).max(32).default(14),
    lineWrap: z.boolean().default(true),
    autosaveMs: z.number().int().min(100).max(10_000).default(750),
  }).prefault({}),
  sandbox: z.object({
    timeoutMs: z.number().int().min(1_000).max(300_000).default(10_000),
    maxOutputBytes: z.number().int().min(1_024).default(1_048_576),
    defaultLanguage: LanguageSchema.default("python"),
  }).prefault({}),
  // …
}).loose(); // keep unknown keys
```

## 8. IPC surface

| Command | Args | Returns |
|---|---|---|
| `vault_open` / `vault_create` | `path` | `{ items, config, configIssues }` |
| `recent_vaults` | – | `string[]` |
| `config_get` | – | `{ effective, layers, issues }` |
| `config_set` | `layer: "vault" \| "local", patch` | `{ effective, issues }` |
| `state_get` / `state_patch` | – / `patch` | `State` / – |
| `index_get` | – | `Item[]` |
| `item_add` | `source: { url } \| { filePath }, title?, tags[]` | `Item` |
| `item_update` | `id, { title?, url?, tags? }` | `Item` |
| `item_toggle` | `id` | `Item` |
| `item_delete` | `id, deleteFolder` | – |
| `note_read` / `note_write` | `id` / `id, content` | `string` / – |
| `pdf_open` | `id` | `{ path, title?, pageCount? }` |
| `pdf_make_local` | `id` | `Item` |
| `content_webview_navigate` | `url` | – |
| `content_webview_set_bounds` | `x, y, w, h` | – |
| `content_webview_hide` / `_back` / `_forward` / `_reload` | – | – |
| `toolchain_list` | `refresh?` | `Toolchain[]` |
| `sandbox_run` | `lang, code, stdin?` | `runId` |
| `sandbox_stop` | `runId` | – |
| `sandbox_save` / `sandbox_list` / `sandbox_load` | `id, …` | – / `string[]` / `string` |

Bindings for all of these are generated into `src/ipc/bindings.ts` by tauri-specta on `pnpm tauri dev`.

| Event | Payload |
|---|---|
| `index://changed` | `Item[]` |
| `notes://changed` | `{ id }` |
| `config://changed` | `{ effective, issues }` |
| `sandbox://output` | `{ runId, stream: "stdout" \| "stderr", chunk }` |
| `sandbox://exit` | `{ runId, code, durationMs, reason: "exit" \| "timeout" \| "killed" \| "output-cap" \| "missing-toolchain" }` |

## 9. Security

- **IPC isolation:** only the `main` webview has command permissions; the child content webview has none.
- **CSP** for the main webview: `default-src 'self'; img-src 'self' asset: https: data: blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self' ipc: asset:`. No remote scripts in the app UI; the pdf.js worker is bundled.
- **Path confinement:** all vault paths are resolved relative to the vault root and canonicalised; `..` and absolute paths are rejected. The only absolute path accepted from the UI is `item_add`'s `filePath`, which is read once (and checked to be a PDF) and copied into the vault.
- **Asset protocol** is scoped at runtime to the open vault directory, so the UI can load PDFs and note images but nothing else on disk.
- **PDFs** are rendered by pdf.js with scripting disabled (`isEvalSupported: false`, no JavaScript actions).
- **Preview sanitisation:** rendered Markdown passes through DOMPurify.
- **Code execution** is explicitly unsandboxed (see §6.5) and documented as such in the UI the first time the sandbox is used.

## 10. Testing

| Layer | Approach |
|---|---|
| `index` parser/serializer | Golden-file tests: hand-written `INDEX.md` fixtures (comments, headings, odd spacing, missing notes links, conflict markers) must round-trip byte-for-byte when no item changes, and produce a one-line diff when one item changes. Property test: `serialize(parse(x)) == x`. |
| Slugs | Unit tests for Unicode, collisions, reserved names, length. |
| Sandbox | Integration tests per language (skipped when the toolchain isn't installed): hello world, stderr, non-zero exit, timeout, output cap, process-tree kill. |
| Vault I/O | Temp-dir tests for atomic writes, path escape rejection, watcher self-write suppression. |
| Config | Rust: layering, defaults for bad keys, unknown-key preservation. Vitest: Zod schemas accept every fixture in `fixtures/config/valid/` and reject every one in `invalid/` with the expected issue paths. |
| IPC contract | Rust tests serialise sample DTOs to `fixtures/ipc/*.json`; Vitest parses each with its Zod schema. A failing parse means Rust and the schemas have drifted. |
| PDF | Fixtures: a small text PDF, one with an outline, an encrypted one, a non-PDF renamed `.pdf`. Import, magic-byte check, title extraction, cache path. |
| Frontend | Vitest for `lib/search.ts`, schemas and query hooks. Playwright smoke tests (add item, open, type note, run Python) against the Vite dev server with IPC mocked via `@tauri-apps/api/mocks`. |
| Native shell | A short manual checklist per release on a real Mac (web pane positioning, PDF open, menu shortcuts, sandbox run, notarised install), since WKWebView can't be driven by WebDriver. |
| Static checks | `biome check`, `tsc --noEmit`, `cargo clippy -- -D warnings`, `cargo fmt --check` in CI. |

## 11. Build and distribution (macOS)

- `app/` is a standard Tauri 2 project using pnpm: `pnpm tauri dev` / `pnpm tauri build`. `pnpm gen` regenerates IPC bindings and `config.schema.json`.
- **Target:** `universal-apple-darwin` (Apple silicon + Intel), `bundle.macOS.minimumSystemVersion = "13.0"`. Output: `Grimoire.app` in a `.dmg`.
- **Signing and notarisation:** Developer ID Application certificate + `notarytool` (Tauri's built-in support via `APPLE_*` env vars), set up in CI from M0. Hardened runtime on; no App Sandbox entitlement, because the code sandbox must spawn user toolchains.
- **Updates:** `tauri-plugin-updater` with signed update manifests published to GitHub Releases.
- **CI:** GitHub Actions on `macos-latest` runs tests on every push, and builds, signs and notarises the `.dmg` on tags.
- **Webview:** WKWebView only. The multi-webview API requires Tauri's `unstable` feature at time of writing; if it proves unreliable, the fallback is a borderless child window docked over the left pane.
- **Mac-native shell:**
  - `titleBarStyle: "Overlay"` with inset traffic lights; the toolbar doubles as the drag region.
  - Native menu bar built with Tauri's `Menu` API: App, File (New Item, Open Vault…, Reveal in Finder), Edit (standard roles, required for ⌘C/⌘V/⌘Z inside webviews), View, Window, Help. Shortcuts in §7.5 are menu accelerators, so they show in the menus.
  - Appearance follows the system unless `.grimoire/config.json` sets `theme`; the accent colour comes from the system.
  - Dropping a PDF or a URL onto the Dock icon or window adds an item.
  - `PATH` is resolved from the login shell at startup (see §6.5), since apps launched from Finder get a minimal `PATH`.

**Windows (10/11, x64).** Built from the same code; the differences live in `src-tauri/src/platform.rs`:

- **Webview:** WebView2 (preinstalled on Windows 10 and 11; the installer downloads it if missing).
- **Bundle:** an NSIS `-setup.exe` (per-user install, no admin rights) and an `.msi`, built on `windows-latest` by `release-win.yaml`. Unsigned for now, so SmartScreen warns on first run. `scripts/install.ps1` builds from a clone or installs a downloaded installer silently.
- **Sandbox:** no process groups, so stop and timeout end the run with `taskkill /T /F`; every child gets `CREATE_NO_WINDOW` so no console flashes up; compiled programs are `main.exe`; Python is looked up as `python`, then `py`, then `python3` (often the Store stub); runs keep the handful of variables Windows programs need to start (`SystemRoot`, `USERPROFILE`, `APPDATA`, …).
- **Paths:** the vault root is canonicalised without the `\\?\` prefix, and paths the watcher and sandbox report back are joined with `/` so they match item ids.
- **Video:** WebView2 can't load an HTML string under an https base URL, so YouTube plays on its watch page (with `&t=` to resume) and the position is read from the page's `<video>` element instead of the embed's iframe API.
- **UI:** shortcut labels read `Ctrl+…` instead of `⌘…`, and "Show in Finder" becomes "Show in Explorer". Handlers already accept Ctrl or ⌘.

**Linux (x64).** Shares the Unix code paths with macOS (login-shell `PATH`, process groups for the sandbox):

- **Webview:** WebKitGTK 4.1. Its DMA-BUF renderer leaves the window blank on many NVIDIA and some Wayland setups, so the app sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` at startup unless the user set it. Video needs the GStreamer good, bad and libav plugins: the `.deb`/`.rpm` depend on them and the AppImage bundles them.
- **Video:** like Windows, YouTube plays on its watch page and the position is read from its `<video>` element.
- **`PATH`:** apps started from a desktop launcher get a minimal `PATH`, so the login shell is asked (falling back to `/bin/sh`), with `~/.cargo/bin`, `~/.local/bin`, `/usr/local/go/bin` and `/snap/bin` added.
- **Bundle:** `.deb`, `.rpm` and AppImage from `release-linux.yaml` on `ubuntu-22.04` (the oldest WebKitGTK 4.1 base, so the binary runs on newer distributions too). From source, `make install-app` installs the binary into `~/.local/bin` with a `.desktop` entry and icon, which avoids root, distribution-specific packages and the FUSE an AppImage needs.

**Releases.** `release-mac.yaml`, `release-win.yaml` and `release-linux.yaml` run on each `v*` tag and upload to one draft release. Each finds the draft for the tag, or creates it, after a short per-platform stagger so they don't create one each.

## 12. Future work

- Full-text search over notes.
- Container (Docker/Podman) or WASI-based isolated execution; more languages via the spec table.
- Highlights / clipping from the web pane into notes, and PDF annotations saved as sidecar files.
- EPUB support through the same in-app viewer approach as PDFs.
- Multiple notes files per item and image paste into `<item>/assets/`.
- Optional built-in "commit & push" button for the vault.
