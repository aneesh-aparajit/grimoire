# grimoire

A minimal, local-first desktop app for studying what you find on the internet.

Collect blogs, videos and PDFs into a reading list. Open one, and you get the content on the left and a Markdown notebook with a runnable code sandbox on the right. There's no database and no account: everything is plain files in a folder you can push to git and pick up on any machine.

Website: [grimoire.aneesh-aparajit.in](https://grimoire.aneesh-aparajit.in), with an interactive preview of the study view and the reading list.

> **Status:** early design. Runs on **macOS 13+** (Apple silicon and Intel) and **Windows 10/11** (x64); Linux comes later. See the [PRD](docs/PRD.md) and [architecture](docs/ARCHITECTURE.md).

## Features (v1)

- **Reading list** stored in `INDEX.md` as a Markdown task list, with `#tags`, search and tag filters.
- **Study view**: the article, video or PDF on the left, notes on the right, with a resizable split.
- **YouTube playlists** added from one link: a single row in the reading list with a progress ring that resumes at the lecture and the second you stopped, plus previous/next buttons in the study view.
- **PDFs** from a URL or from disk (local files are copied into the item's folder). Built-in viewer with outline, search, text selection, "copy as quote" into notes, and resume-where-you-left-off.
- **Markdown notes** with light syntax highlighting, inline lint hints, autosave and an optional rendered preview.
- **Code sandbox** for Python, Rust, Java, Go, C and JavaScript, using the toolchains already on your machine. Run snippets, see streamed output, and save them into the item's folder.
- **Files only.** The vault is a normal folder: readable on GitHub, editable in any editor, synced with git. Even preferences live in the vault, in `.grimoire/`.

## How a vault looks

```
my-vault/
├── INDEX.md                      # the reading list
├── .grimoire/
│   ├── config.json               # vault preferences (committed)
│   └── local/                    # this machine only (git-ignored)
├── attention-is-all-you-need/
│   ├── NOTES.md
│   └── sandbox/
│       ├── main.py
│       └── main.rs
├── crafting-interpreters/
│   ├── NOTES.md
│   └── crafting-interpreters.pdf # a local PDF
└── rust-async-book-ch-3/
    └── NOTES.md
```

`INDEX.md` is plain Markdown, one item per line:

```markdown
# Grimoire

- [ ] [Attention Is All You Need](https://arxiv.org/abs/1706.03762) #ml #papers · [notes](attention-is-all-you-need/NOTES.md)
- [x] [Async Rust, chapter 3](https://rust-lang.github.io/async-book/03_async_await/01_chapter.html) #rust #async · [notes](rust-async-book-ch-3/NOTES.md)
- [ ] [Crafting Interpreters](crafting-interpreters/crafting-interpreters.pdf) #compilers #books · [notes](crafting-interpreters/NOTES.md)
```

You can edit it by hand; Grimoire keeps anything it doesn't recognise. Each item's folder is named after its title when you add it.

### Playlists

Paste a YouTube playlist link and the whole playlist is added. It gets one line in `INDEX.md` and its own folder, with an `INDEX.md` of its own and one numbered notes file per video:

```
my-vault/
├── INDEX.md                      # - [ ] [MIT 6.824](https://www.youtube.com/playlist?list=…) · [playlist](distributed-systems/INDEX.md)
└── distributed-systems/
    ├── INDEX.md                  # - [ ] [Lecture 1: Introduction](https://www.youtube.com/watch?v=…) · [notes](01-lecture-1-introduction.md)
    ├── 01-lecture-1-introduction.md
    ├── 02-lecture-2-rpc-and-threads.md
    └── sandbox/01-lecture-1-introduction/main.go
```

In the reading list the playlist is one row, with a progress ring and the lecture to pick up from ("Continue: Lecture 3 · 12:34"). Opening it resumes the lecture you last opened, or the next one not done; the side panel lists every video. Video positions are kept per machine in `.grimoire/local/state.json`. The playlist is marked done once every video in it is.

## Preferences

Every vault's preferences live in `.grimoire/config.json`: theme, editor, lint rules, layout, sandbox limits. They're committed, so they follow the vault to every machine. Grimoire also writes a JSON Schema next to the file, so you get autocompletion and validation if you edit it by hand.

Things that differ per machine go in `.grimoire/local/`, which is git-ignored: toolchain paths, overrides such as a bigger font on a laptop, the last open item, and PDF reading positions.

## Syncing across machines

The vault is just a folder, so use git:

```bash
cd ~/my-vault && git init && git add . && git commit -m "start vault"
```

On another machine, clone it and open the folder from Grimoire. The only thing Grimoire keeps outside the vault is the list of recently opened vaults.

If you keep large PDFs in your vault, consider [Git LFS](https://git-lfs.com/). Grimoire can set up a `.gitattributes` for it when you create a vault.

## Sandbox toolchains

The sandbox runs code with the compilers and interpreters installed on your machine:

| Language | Needs |
|---|---|
| Python | `python3` (on Windows: `python` or the `py` launcher) |
| JavaScript | `node` |
| Go | `go` |
| Rust | `rustc` (on Windows, with the MSVC Build Tools) |
| C | `cc`, `clang` or `gcc` |
| Java | JDK 11+ (`java`) |

Missing toolchains are reported in the app; the other languages keep working. Paths can be overridden per machine in `.grimoire/local/settings.json`.

> The sandbox is **not** a security boundary. Code runs as you, with your permissions. It runs in a temporary directory with a timeout and an output limit to prevent accidents, but only run code you trust.

## Development

The desktop app lives in [`app/`](app/).

| | |
|---|---|
| Runtime | [Tauri 2](https://v2.tauri.app/) with a Rust backend, typed IPC via tauri-specta |
| UI | React 19 (with the React Compiler), TypeScript, Vite |
| Routing / data | TanStack Router, TanStack Query, Zustand |
| Validation | Zod 4: IPC payloads, `.grimoire/` files, forms, route params |
| Styling | Tailwind CSS 4, shadcn/ui, lucide icons |
| Editors | CodeMirror 6, markdownlint |
| PDF | pdf.js |
| Tooling | pnpm, Biome, Vitest, Playwright |

Prerequisites (macOS): Xcode Command Line Tools (`xcode-select --install`), Rust (stable) with both Mac targets, Node.js 22+ and pnpm.

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

```bash
cd app
```

```bash
pnpm install
```

```bash
pnpm tauri dev
```

To build a universal `.dmg`:

```bash
pnpm tauri build --target universal-apple-darwin
```

Release builds are signed and notarised in CI; local builds are unsigned, so you may need to right-click → Open the first time.

### Windows

Prerequisites (Windows 10/11): the Visual Studio C++ Build Tools, Rust (stable, MSVC), Node.js 22+, pnpm and Git. WebView2 ships with Windows 10 and 11. With winget, in PowerShell:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

```powershell
winget install --id Rustlang.Rustup
```

```powershell
winget install --id OpenJS.NodeJS.LTS
```

```powershell
winget install --id Git.Git
```

```powershell
npm install --global pnpm
```

Open a new terminal so the new `PATH` applies, then from the clone:

```powershell
cd app; pnpm install; pnpm tauri dev
```

To build the installer and install it for the current user (no admin rights needed):

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force; .\scripts\install.ps1 -Build -Open
```

The installer (`grimoire_<version>_x64-setup.exe`) ends up in `app\src-tauri\target\release\bundle\nsis`. Local builds are unsigned, so SmartScreen may warn the first time you run one: choose **More info → Run anyway**.

After changing Rust command signatures or the config schema, regenerate the TypeScript bindings and `config.schema.json`:

```bash
pnpm gen
```

### Website

The landing page and install guide live in [`web/`](web/): Next.js 16 and React 19, with plain CSS and no other dependencies. The demos on it are built from markup with synthetic content, not screenshots.

```bash
pnpm --dir web install
```

```bash
pnpm --dir web dev
```

It follows the system light or dark theme until you pick one with the toggle in the header, and respects reduced motion.

## Repository layout

```
grimoire/
├── README.md
├── docs/
│   ├── PRD.md             # what we're building and why
│   └── ARCHITECTURE.md    # how it's built
├── app/                   # the Tauri desktop app
│   ├── src/               # frontend (React 19 + TypeScript)
│   └── src-tauri/         # backend (Rust)
└── web/                   # the website (Next.js)
```

## Roadmap

| Milestone | Scope |
|---|---|
| M0 | App skeleton, open/create vault, `.grimoire/` config |
| M1 | Reading list: `INDEX.md`, URLs and local PDFs, tags, search, file watching |
| M2 | Study view: web pane, PDF viewer, Markdown editor |
| M3 | Sandbox: six languages, streamed output, save to item |
| M4 | Polish, menu bar, signed + notarised macOS `.dmg` (v1.0) |
| M5 | Windows 10/11 installer |
| Later | Linux |

Details are in the [PRD](docs/PRD.md#11-milestones).
