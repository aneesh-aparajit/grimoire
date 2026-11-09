import Link from "next/link";
import { Shell } from "@/components/Shell";
import { StudyDevice } from "@/components/StudyDevice";
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

export default function Home() {
  return (
    <div className="wrap">
      <SiteHeader />

      <main id="top">
        <header className="hero">
          <div>
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

        <section className="block" aria-labelledby="h-folder">
          <div>
            <h2 id="h-folder">Every item is a folder you could open in vim.</h2>
            <p>
              The reading list is <code>INDEX.md</code>, a Markdown task list. Each item gets a folder with its notes
              and the code you ran.
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
              {"\n├── attention-is-all-you-need/\n│   ├── NOTES.md\n│   └── sandbox/main.py\n└── crafting-interpreters/\n    ├── NOTES.md\n    └── crafting-interpreters.pdf"}
            </pre>
          </div>
        </section>

        <section className="block flip" aria-labelledby="h-run">
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

        <section className="block" aria-labelledby="h-git">
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

        <section className="close" aria-labelledby="h-close">
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
