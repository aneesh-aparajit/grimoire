import Link from "next/link";
import { Entry, Path } from "@/components/Entry";
import { FileBar } from "@/components/FileBar";
import { IndexList } from "@/components/IndexList";
import { Sandbox } from "@/components/Sandbox";
import { GitHubIcon, Twinkle } from "@/components/Sprite";
import { StudyDesk } from "@/components/StudyDesk";

const REPO = "https://github.com/aneesh-aparajit/grimoire";

function GitHubButton({ outline = false }: { outline?: boolean }) {
  return (
    <a className={outline ? "btn btn-outline" : "btn btn-pen"} href={REPO}>
      <GitHubIcon />
      View on GitHub
      <Twinkle />
    </a>
  );
}

export default function Home() {
  return (
    <>
      <header className="band">
        <a className="wordmark" href="/" aria-label="grimoire, home">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <use href="#feather" x="0" y="0" width="20" height="24" />
            <use href="#star" x="15" y="14" width="8" height="8" style={{ color: "var(--spark)" }} />
          </svg>
          grimoire
        </a>
        <nav aria-label="Sections">
          {[
            ["gather", "Gather"],
            ["study", "Study"],
            ["cast", "Cast"],
            ["keep", "Keep"],
          ].map(([id, label]) => (
            <a key={id} className="sec" href={`#${id}`}>
              {label}
            </a>
          ))}
          <span className="sep" aria-hidden="true" />
          <Link href="/install">Install</Link>
          <a href={REPO}>
            <GitHubIcon size={15} />
            GitHub
          </a>
        </nav>
      </header>

      <FileBar />

      <main className="page" id="top">
        <section className="entry hero" aria-labelledby="title">
          <div className="body">
            <h1 className="title" id="title">
              <span className="ink">
                <span className="md" aria-hidden="true">
                  #
                </span>
                grimoire
              </span>
              <span className="quill" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <use href="#feather" width="20" height="24" />
                </svg>
              </span>
              <svg className="spark" aria-hidden="true">
                <use href="#star" />
              </svg>
            </h1>
            <p className="lede">
              A book of study for what you find on the internet. Read the source, write it down,{" "}
              <strong>cast the code</strong>, all in one window.
            </p>
            <div className="acts">
              <Link className="btn btn-pen" href="/install">
                Install for macOS
              </Link>
              <GitHubButton outline />
              <span className="facts">macOS 13+ · plain files · no account</span>
            </div>
          </div>
        </section>

        <Entry
          id="gather"
          title="Gather your sources"
        >
          <p>
            Blogs, talks and papers go into one reading list, by URL or as a PDF from disk. The list is{" "}
            <Path>INDEX.md</Path>, a Markdown task list with <Path>#tags</Path>. Search it, filter it, tick things off.
          </p>
          <div className="module">
            <div className="mhead mono">
              <span>
                my-vault/<b>INDEX.md</b>
              </span>
              <span className="right hide-sm">click a box</span>
            </div>
            <IndexList />
          </div>
        </Entry>

        <Entry
          id="study"
          title="Study beside the source"
        >
          <p>
            Open an item and the article, video or PDF sits on the left, your notes on the right. Sites that refuse to
            be framed still load, and PDFs get an outline, search and resume-where-you-left-off.
          </p>
          <StudyDesk />
        </Entry>

        <Entry
          id="cast"
          title="Cast the code"
        >
          <p>
            Every item has a sandbox. Try the snippet you just read, watch the output stream in, and paste it back into
            your notes. Runs are numbered and timed. The ones that fail are struck through, never erased. Code runs as
            you, with the toolchains on your machine: it is not a security boundary, so only cast code you trust.
          </p>
          <Sandbox />
          <div className="langs" aria-label="Languages">
            {[
              ["Python", "python3"],
              ["Rust", "rustc"],
              ["Go", "go"],
              ["C", "cc"],
              ["Java", "java"],
              ["JavaScript", "node"],
            ].map(([lang, bin]) => (
              <span key={lang}>
                {lang}
                <span className="mono">{bin}</span>
              </span>
            ))}
          </div>
        </Entry>

        <Entry
          id="keep"
          title="Keep the book"
        >
          <p>
            There is no database and no account. Your vault is a folder: readable on GitHub, editable in any editor,
            synced with git. Clone it on another machine and it opens as it was.
          </p>
          <div className="module">
            <div className="mhead mono">
              <span>
                <b>my-vault/</b>
              </span>
            </div>
            <pre className="tree" aria-label="Vault folder">
              <span className="d">my-vault/</span>
              {"\n├── INDEX.md                   "}
              <span className="c"># the reading list</span>
              {"\n├── .grimoire/\n│   ├── config.json            "}
              <span className="c"># preferences, committed</span>
              {"\n│   └── local/                 "}
              <span className="c"># this machine only</span>
              {"\n├── "}
              <span className="d">attention-is-all-you-need/</span>
              {"\n│   ├── NOTES.md\n│   └── sandbox/main.py\n└── "}
              <span className="d">crafting-interpreters/</span>
              {"\n    ├── NOTES.md\n    └── crafting-interpreters.pdf"}
            </pre>
            <pre className="shell" aria-label="Sync with git">
              <span className="p">$ </span>
              {'git add . && git commit -m "notes on attention"\n'}
              <span className="p">$ </span>
              {"git push"}
            </pre>
          </div>
        </Entry>

        <section className="entry close" aria-labelledby="h-close">
          <div className="body">
            <h2 id="h-close">Open the book.</h2>
            <p>
              grimoire is in early design. v1 targets macOS 13+, with Linux and Windows after. Read{" "}
              <a href={`${REPO}/blob/master/docs/PRD.md`}>the plan</a>, follow along, or lend a hand.
            </p>
            <div className="acts">
              <Link className="btn btn-pen" href="/install">
                Install grimoire
              </Link>
              <GitHubButton outline />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="in">
          <span className="mono">grimoire.aneesh-aparajit.in</span>
          <span>Local-first. Plain files. No account.</span>
          <span className="right">
            <a href={REPO}>GitHub</a>
            <a href={`${REPO}#readme`}>README</a>
          </span>
        </div>
      </footer>
    </>
  );
}
