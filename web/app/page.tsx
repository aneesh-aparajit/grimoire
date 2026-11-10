import Link from "next/link";
import { Shell } from "@/components/Shell";
import { StudyDevice } from "@/components/StudyDevice";
import { ReadingList } from "@/components/ReadingList";
import { Reveal } from "@/components/Reveal";
import { REPO, SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { GitHubIcon } from "@/components/Sprite";

// What the sandbox looks for on PATH. The lamps show one example machine, not yours.
const TOOLCHAINS = [
  ["Python", "python3", true],
  ["Rust", "rustc", true],
  ["JavaScript", "node", true],
  ["C", "cc", true],
  ["Java", "java", true],
  ["Go", "go", false],
] as const;

// Sparks shed by the feather: where along the word (0–1), how far they rise, and their size.
const SPARKS = [
  [0.04, -0.9, 0.7], [0.12, -1.3, 0.5], [0.2, -0.7, 0.9], [0.29, -1.2, 0.6], [0.37, -0.8, 0.8],
  [0.46, -1.4, 0.5], [0.54, -0.9, 0.75], [0.63, -1.25, 0.6], [0.71, -0.75, 0.9], [0.8, -1.35, 0.55],
  [0.88, -0.95, 0.8], [0.96, -1.2, 0.65],
] as const;

// The smaller features, in a line each. Only what the app does today.
const FEATURES = [
  ["Playlists", "Paste a YouTube playlist and it becomes one row, a folder, and a notes file per video. It resumes at the lecture and second you left."],
  ["PDFs", "From a URL or from disk. Outline, search, copy as quote into your notes, and it reopens on the page you were reading."],
  ["Notes", "Markdown source with light highlighting, lint hints that never block, autosave, and a rendered preview when you want one."],
  ["Tags and search", "Write #tags on the line in INDEX.md. Filter by them, or search words across titles and playlist videos."],
  ["Keyboard first", "Esc goes back to the list. ⌘ Enter runs the snippet. Previous and next move through a playlist."],
  ["Preferences in the vault", ".grimoire/config.json is committed and follows you. Per-machine paths stay in .grimoire/local/."],
] as const;

export default function Home() {
  return (
    <div className="wrap">
      <Reveal />
      <SiteHeader />

      <main id="top">
        <header className="hero">
          <div>
            <p className="quill" aria-label="#grimoire">
              <span className="ink" aria-hidden="true">
                <span className="hash">#</span>grimoire
              </span>
              <span className="sparks" aria-hidden="true">
                {SPARKS.map(([x, y, s], i) => (
                  <i key={i} style={{ "--x": x, "--y": `${y * 1.8}rem`, "--s": s } as React.CSSProperties}>
                    ✦
                  </i>
                ))}
              </span>
              <svg className="pen" viewBox="270 150 540 680" aria-hidden="true">
                <use href="#feather" />
              </svg>
            </p>
            <h1>A quiet place to study.</h1>
            <p className="lede">
              The source on one side. Your notes and a code sandbox on the other. Everything saved as plain files in a
              folder you own.
            </p>
            <div className="acts">
              <Link className="key go" href="/install">
                Install for macOS
              </Link>
              <a className="key" href={REPO}>
                <GitHubIcon />
                GitHub
              </a>
            </div>
            <dl className="spec">
              <dt>Runs on</dt>
              <dd>macOS 13 or later</dd>
              <dt>Storage</dt>
              <dd>Markdown and source files</dd>
              <dt>Sync</dt>
              <dd>git, yours</dd>
              <dt>Account</dt>
              <dd>none</dd>
            </dl>
          </div>

          <StudyDevice />
        </header>

        <section className="block flip" aria-labelledby="h-list" data-reveal>
          <div>
            <h2 id="h-list">The reading list is one Markdown file.</h2>
            <p>
              <code>INDEX.md</code> is a task list under <code># Grimoire</code>. A tick is <code>[x]</code>, a tag is{" "}
              <code>#rust</code> on the line. Switch to Source to see what grimoire writes when you tick one off.
            </p>
            <p>
              A playlist is a single row with a progress ring. Open it to see every video, or just carry on from where you
              stopped.
            </p>
          </div>
          <ReadingList />
        </section>

        <section className="block" aria-labelledby="h-folder" data-reveal>
          <div>
            <h2 id="h-folder">Every item is a folder you could open in vim.</h2>
            <p>
              Each item gets a folder with its notes and the code you ran. A playlist gets one too, with its own{" "}
              <code>INDEX.md</code> and a numbered notes file per video.
            </p>
            <p>Edit any of it by hand. grimoire keeps every line it doesn&apos;t recognise.</p>
          </div>
          <div className="panel">
            <div className="phead">
              <span className="label">Vault</span>
              <span className="mono">my-vault/</span>
              <span className="r">
                <i className="lamp" />
                <span className="label">On disk</span>
              </span>
            </div>
            <pre className="tree" aria-label="A vault folder">
              {"my-vault/\n├── INDEX.md                  "}
              <span className="c"># the reading list</span>
              {"\n├── .grimoire/config.json     "}
              <span className="c"># preferences, committed</span>
              {"\n├── .grimoire/local/          "}
              <span className="c"># this machine only</span>
              {"\n├── attention-is-all-you-need/\n│   ├── NOTES.md\n│   └── sandbox/main.py\n├── distributed-systems/      "}
              <span className="c"># a playlist</span>
              {"\n│   ├── INDEX.md\n│   ├── 01-lecture-1-introduction.md\n│   └── 02-lecture-2-rpc-and-threads.md\n└── crafting-interpreters/\n    ├── NOTES.md\n    └── crafting-interpreters.pdf"}
            </pre>
          </div>
        </section>

        <section className="block flip" aria-labelledby="h-run" data-reveal>
          <div>
            <h2 id="h-run">Code runs on your machine, as you.</h2>
            <p>
              Each item has a sandbox for Python, Rust, Go, C, Java and JavaScript, using the toolchains you already
              have. Output streams in with the exit code and time, and goes back into your notes with one key.
            </p>
            <p>
              It isn&apos;t a security sandbox. Code runs with your permissions, so only run what you&apos;d run in a
              terminal.
            </p>
          </div>
          <div className="panel">
            <div className="phead">
              <span className="label">Toolchains</span>
              <span className="r">
                <span className="note">an example machine</span>
              </span>
            </div>
            <ul className="tools">
              {TOOLCHAINS.map(([lang, bin, found]) => (
                <li key={lang}>
                  <i className={found ? "lamp" : "lamp off"} aria-hidden="true" />
                  <span>{lang}</span>
                  <span className="mono">
                    {bin} · {found ? "found" : "not found, install to use"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="feats" aria-labelledby="h-feats" data-reveal>
          <h2 id="h-feats">Everything else on the desk.</h2>
          <ul>
            {FEATURES.map(([name, text]) => (
              <li key={name}>
                <h3>{name}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="block" aria-labelledby="h-git" data-reveal>
          <div>
            <h2 id="h-git">Sync is git. There&apos;s nothing to sign in to.</h2>
            <p>
              Commit and push the vault like any repo. Clone it on another machine and it opens as it was; pull, and the
              open list picks up the change.
            </p>
            <p>No telemetry. Nothing leaves your computer except the pages you open.</p>
          </div>
          <div className="panel">
            <div className="phead">
              <span className="label">Terminal</span>
              <span className="mono">my-vault/</span>
            </div>
            <Shell
              label="Sync a vault with git"
              commands={['git add . && git commit -m "notes on attention"', "git push"]}
            />
          </div>
        </section>

        <section className="close" aria-labelledby="h-close" data-reveal>
          <div>
            <h2 id="h-close">Start with one thing you meant to read.</h2>
            <p>
              grimoire is in early design. v1 targets macOS 13+, with Linux and Windows after. Read{" "}
              <a href={`${REPO}/blob/master/docs/PRD.md`}>the plan</a>, follow along, or lend a hand.
            </p>
          </div>
          <div className="acts">
            <Link className="key go" href="/install">
              Install grimoire
            </Link>
            <a className="key" href={REPO}>
              <GitHubIcon />
              GitHub
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
