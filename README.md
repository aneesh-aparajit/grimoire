# grimoire

A minimal, local-first desktop app for studying what you find on the internet.

Collect blogs, videos and PDFs into a reading list. Open one, and you get the content on the left and a Markdown notebook with a runnable code sandbox on the right. There's no database and no account: everything is plain files in a folder you can push to git and pick up on any machine.

> **Status:** early design. v1 targets **macOS 13+** (Apple silicon and Intel); Linux and Windows come later. See the [PRD](docs/PRD.md) and [architecture](docs/ARCHITECTURE.md).

## Features (v1)

- **Reading list** stored in `INDEX.md` as a Markdown task list, with `#tags`, search and tag filters.
- **Study view**: the article, video or PDF on the left, notes on the right, with a resizable split.
- **PDFs** from a URL or from disk (local files are copied into the item's folder). Built-in viewer with outline, search, text selection, "copy as quote" into notes, and resume-where-you-left-off.
- **Markdown notes** with light syntax highlighting, inline lint hints and autosave.
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

The playlist is marked done once every video in it is.

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
| Python | `python3` |
| JavaScript | `node` |
| Go | `go` |
| Rust | `rustc` |
| C | `cc` (clang or gcc) |
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

After changing Rust command signatures or the config schema, regenerate the TypeScript bindings and `config.schema.json`:

```bash
pnpm gen
```

## Repository layout

```
grimoire/
├── README.md
├── docs/
│   ├── PRD.md             # what we're building and why
│   └── ARCHITECTURE.md    # how it's built
└── app/                   # the Tauri desktop app
    ├── src/               # frontend (React 19 + TypeScript)
    └── src-tauri/         # backend (Rust)
```

## Roadmap

| Milestone | Scope |
|---|---|
| M0 | App skeleton, open/create vault, `.grimoire/` config |
| M1 | Reading list: `INDEX.md`, URLs and local PDFs, tags, search, file watching |
| M2 | Study view: web pane, PDF viewer, Markdown editor |
| M3 | Sandbox: six languages, streamed output, save to item |
| M4 | Polish, menu bar, signed + notarised macOS `.dmg` (v1.0) |
| Later | Linux and Windows |

Details are in the [PRD](docs/PRD.md#11-milestones).
