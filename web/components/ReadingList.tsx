"use client";

import { useState } from "react";

/* The reading list as the app shows it, beside the INDEX.md it is read from. All content is synthetic.
   Ticking an item rewrites its line in the source; a playlist is one row that resumes where you stopped. */

type Kind = "article" | "video" | "pdf" | "playlist";
type Video = { title: string; done: boolean; at?: string };
type Item = {
  id: string;
  title: string;
  url: string;
  domain: string;
  kind: Kind;
  tags: string[];
  done: boolean;
  link: string;
  videos?: Video[];
};

const START: Item[] = [
  {
    id: "attention",
    title: "Attention Is All You Need",
    url: "https://arxiv.org/abs/1706.03762",
    domain: "arxiv.org",
    kind: "article",
    tags: ["ml", "papers"],
    done: false,
    link: "attention-is-all-you-need/NOTES.md",
  },
  {
    id: "dist",
    title: "Distributed systems, the lectures",
    url: "https://www.youtube.com/playlist?list=…",
    domain: "youtube.com",
    kind: "playlist",
    tags: ["systems"],
    done: false,
    link: "distributed-systems/INDEX.md",
    videos: [
      { title: "Lecture 1: Introduction", done: true },
      { title: "Lecture 2: RPC and threads", done: true },
      { title: "Lecture 3: Primary-backup replication", done: false, at: "12:34" },
      { title: "Lecture 4: Consensus", done: false },
      { title: "Lecture 5: Fault tolerance", done: false },
      { title: "Lecture 6: Linearizability", done: false },
    ],
  },
  {
    id: "interp",
    title: "Crafting Interpreters",
    url: "crafting-interpreters/crafting-interpreters.pdf",
    domain: "local PDF",
    kind: "pdf",
    tags: ["compilers", "books"],
    done: false,
    link: "crafting-interpreters/NOTES.md",
  },
  {
    id: "async",
    title: "Async Rust, chapter 3",
    url: "https://rust-lang.github.io/async-book/03_async_await/01_chapter.html",
    domain: "rust-lang.github.io",
    kind: "article",
    tags: ["rust", "async"],
    done: true,
    link: "rust-async-book-ch-3/NOTES.md",
  },
];

const RING = 2 * Math.PI * 7;

function isDone(it: Item) {
  return it.videos ? it.videos.every((v) => v.done) : it.done;
}

function line(it: Item) {
  const label = it.kind === "playlist" ? "playlist" : "notes";
  return `- [${isDone(it) ? "x" : " "}] [${it.title}](${it.url}) ${it.tags.map((t) => `#${t}`).join(" ")} · [${label}](${it.link})`;
}

function KindIcon({ kind }: { kind: Kind }) {
  return (
    <svg className="kind" viewBox="0 0 16 16" aria-hidden="true">
      {kind === "article" && <path d="M3 3.5h10M3 6.5h10M3 9.5h10M3 12.5h6" />}
      {kind === "video" && <path d="M5.5 3.5v9l7-4.5z" />}
      {kind === "pdf" && <path d="M4 2.5h5.5l3 3v8H4zM9.5 2.5v3h3" />}
      {kind === "playlist" && <path d="M2.5 4h8M2.5 8h8M2.5 12h5M11 9.5v5l3.5-2.5z" />}
    </svg>
  );
}

export function ReadingList() {
  const [items, setItems] = useState(START);
  const [preview, setPreview] = useState(true);
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>("dist");

  const tags = Array.from(new Set(items.flatMap((i) => i.tags)));
  const shown = tag ? items.filter((i) => i.tags.includes(tag)) : items;
  const source = `# Grimoire\n\n${items.map(line).join("\n")}`;

  function toggle(id: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }
  function toggleVideo(id: string, n: number) {
    setItems((xs) =>
      xs.map((x) =>
        x.id === id && x.videos
          ? { ...x, videos: x.videos.map((v, i) => (i === n ? { ...v, done: !v.done, at: undefined } : v)) }
          : x,
      ),
    );
  }

  return (
    <div className="panel rl">
      <div className="phead">
        <span className="label">Reading list</span>
        <span className="mono">INDEX.md</span>
        <span className="r" role="group" aria-label="INDEX.md view">
          <button type="button" className={`key sm${preview ? "" : " on"}`} aria-pressed={!preview} onClick={() => setPreview(false)}>
            Source
          </button>
          <button type="button" className={`key sm${preview ? " on" : ""}`} aria-pressed={preview} onClick={() => setPreview(true)}>
            Preview
          </button>
        </span>
      </div>

      {preview ? (
        <div className="rl-body swap" key="preview">
          <h3 className="rl-title">
            <span className="hash" aria-hidden="true">
              #
            </span>{" "}
            Grimoire
          </h3>
          <ul className="rows">
            {shown.map((it) => {
              const done = isDone(it);
              if (!it.videos) {
                return (
                  <li key={it.id} className={done ? "row done" : "row"}>
                    <input type="checkbox" checked={done} onChange={() => toggle(it.id)} aria-label={`Done: ${it.title}`} />
                    <KindIcon kind={it.kind} />
                    <span className="t">{it.title}</span>
                    <span className="meta mono">
                      {it.domain}
                      {it.tags.map((t) => (
                        <span key={t} className="tag">
                          #{t}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              }
              const v = it.videos;
              const n = v.filter((x) => x.done).length;
              const next = v.findIndex((x) => !x.done);
              const expanded = open === it.id;
              return (
                <li key={it.id} className={`row pl${done ? " done" : ""}`}>
                  <svg className="ring" viewBox="0 0 18 18" style={{ "--p": n / v.length } as React.CSSProperties} aria-hidden="true">
                    <circle cx="9" cy="9" r="7" />
                    <circle className="fg" cx="9" cy="9" r="7" strokeDasharray={RING} />
                  </svg>
                  <KindIcon kind="playlist" />
                  <button type="button" className="t pl-toggle" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : it.id)}>
                    {it.title}
                  </button>
                  <span className="meta mono">
                    {n}/{v.length}
                    {it.tags.map((t) => (
                      <span key={t} className="tag">
                        #{t}
                      </span>
                    ))}
                  </span>
                  <span className="resume">
                    {next === -1 ? (
                      "Every lecture done"
                    ) : (
                      <>
                        Continue: {v[next].title.split(":")[0]}
                        {v[next].at ? ` · ${v[next].at}` : ""}
                      </>
                    )}
                  </span>
                  {expanded && (
                    <ol className="videos">
                      {v.map((x, i) => (
                        <li key={x.title} className={`${x.done ? "done" : ""}${i === next ? " next" : ""}`}>
                          <input type="checkbox" checked={x.done} onChange={() => toggleVideo(it.id, i)} aria-label={`Done: ${x.title}`} />
                          <span className="mono n">{String(i + 1).padStart(2, "0")}</span>
                          <span className="t">{x.title}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="chips" role="group" aria-label="Filter by tag">
            {tags.map((t) => (
              <button key={t} type="button" className={`chip mono${tag === t ? " on" : ""}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <pre className="rl-src swap" key="source" aria-label="INDEX.md source">
          {source.split("\n").map((l, i) => (
            <span key={i} className={l.startsWith("#") ? "h" : undefined}>
              {l.startsWith("- ") ? <SourceLine text={l} /> : l}
              {"\n"}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}

/** One task-list line with its checkbox and #tags picked out. */
function SourceLine({ text }: { text: string }) {
  const parts = text.split(/(\[[ x]\]|#[a-z]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[ x]\]$/.test(p) ? (
          <span key={i} className="box">
            {p}
          </span>
        ) : /^#[a-z]+$/.test(p) ? (
          <span key={i} className="tag">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}
