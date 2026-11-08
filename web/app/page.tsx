import type { CSSProperties, ReactNode } from "react";
import { FileBar } from "@/components/FileBar";
import { IndexList } from "@/components/IndexList";
import { Sandbox } from "@/components/Sandbox";
import { GitHubIcon, Twinkle } from "@/components/Sprite";
import { StudyDesk } from "@/components/StudyDesk";

const REPO = "https://github.com/aneesh-aparajit/grimoire";

const ARROWS = {
  upLeft: { w: 70, h: 34, d: "M66 30C48 32 22 26 8 6M8 6l1 11M8 6l10 4", len: 110 },
  downLeft: { w: 56, h: 40, d: "M50 4C30 2 10 14 6 36M6 36l-3-10M6 36l8-6", len: 100 },
  swoop: { w: 60, h: 36, d: "M54 4C40 4 16 10 6 32M6 32l-1-10M6 32l9-5", len: 100 },
};

/** A margin note in the pen, with a hand-drawn arrow that draws on when its entry is seen. */
function Note({ arrow, children }: { arrow: keyof typeof ARROWS; children: ReactNode }) {
  const a = ARROWS[arrow];
  return (
    <aside className="aside">
      <p className="note">
        <svg width={a.w} height={a.h} viewBox={`0 0 ${a.w} ${a.h}`} aria-hidden="true">
          <path style={{ "--len": a.len } as CSSProperties} d={a.d} />
        </svg>
        {children}
      </p>
    </aside>
  );
}

function Entry({
  id,
  num,
  title,
  children,
  note,
}: {
  id: string;
  num: string;
  title: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="entry" id={id} data-title={title} aria-labelledby={`h-${id}`}>
      <span className="num label" aria-hidden="true">
        {num}
      </span>
      <div className="body">
        <h2 id={`h-${id}`}>
          <span className="md" aria-hidden="true">
            ##
          </span>
          {title}
        </h2>
        {children}
      </div>
      {note}
    </section>
  );
}

function GitHubButton() {
  return (
    <a className="btn btn-pen" href={REPO}>
      <GitHubIcon />
      View on GitHub
      <Twinkle />
    </a>
  );
}

const Path = ({ children }: { children: ReactNode }) => <span className="path">{children}</span>;

export default function Home() {
  return (
    <>
      <header className="band">
        <a className="wordmark" href="#top" aria-label="grimoire, back to top">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <use href="#feather" x="0" y="0" width="20" height="24" />
            <use href="#star" x="15" y="14" width="8" height="8" style={{ color: "var(--spark)" }} />
          </svg>
          grimoire
        </a>
        <nav aria-label="Sections">
          {[
            ["gather", "E-01", "Gather"],
            ["study", "E-02", "Study"],
            ["cast", "E-03", "Cast"],
            ["keep", "E-04", "Keep"],
          ].map(([id, num, label]) => (
            <a key={id} className="sec" href={`#${id}`}>
              <span className="num">{num}</span>
              {label}
            </a>
          ))}
          <span className="sep" aria-hidden="true" />
          <a href={REPO}>
            <GitHubIcon size={15} />
            GitHub
          </a>
        </nav>
      </header>

      <FileBar />

      <main className="page" id="top">
        <section className="entry hero" aria-labelledby="title">
          <span className="num label">E-00</span>
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
              <GitHubButton />
              <span className="facts">macOS 13+ · plain files · no account</span>
            </div>
          </div>
          <Note arrow="upLeft">Every page in it is a plain file you could open in vim.</Note>
        </section>

        <Entry
          id="gather"
          num="E-01"
          title="Gather your sources"
          note={<Note arrow="downLeft">Edit it by hand. grimoire keeps any line it doesn&apos;t recognise.</Note>}
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
          num="E-02"
          title="Study beside the source"
          note={<Note arrow="swoop">Drag the split. In the app, either side folds away.</Note>}
        >
          <p>
            Open an item and the article, video or PDF sits on the left, your notes on the right. Sites that refuse to
            be framed still load, and PDFs get an outline, search and resume-where-you-left-off.
          </p>
          <StudyDesk />
        </Entry>

        <Entry
          id="cast"
          num="E-03"
          title="Cast the code"
          note={
            <Note arrow="downLeft">
              It uses the toolchains already on your machine and runs as you. It is not a security boundary, so only
              cast code you trust.
            </Note>
          }
        >
          <p>
            Every item has a sandbox. Try the snippet you just read, watch the output stream in, and paste it back into
            your notes. Runs are numbered and timed. The ones that fail are struck through, never erased.
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
          num="E-04"
          title="Keep the book"
          note={<Note arrow="swoop">No telemetry. Nothing leaves your machine except the pages you open.</Note>}
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
          <span className="num label" aria-hidden="true">
            E-05
          </span>
          <div className="body">
            <h2 id="h-close">Open the book.</h2>
            <p>
              grimoire is in early design. v1 targets macOS 13+, with Linux and Windows after. Read{" "}
              <a href={`${REPO}/blob/master/docs/PRD.md`}>the plan</a>, follow along, or lend a hand.
            </p>
            <div className="acts">
              <GitHubButton />
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
