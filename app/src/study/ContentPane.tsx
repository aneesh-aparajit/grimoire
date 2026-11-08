import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ListTree,
  Minus,
  Plus,
  RotateCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import type { Fixture } from "../mock/types";
import { useStudy } from "./store";

function splitUrl(url: string) {
  try {
    const u = new URL(url);
    return { host: u.host, rest: u.pathname + u.search };
  } catch {
    return { host: "", rest: url };
  }
}

export function ContentPane({ fixture, onOpenExternal }: { fixture: Fixture; onOpenExternal: () => void }) {
  const { item } = fixture;
  if (item.kind === "pdf" && fixture.pdf) return <PdfViewer fixture={fixture} />;

  const { host, rest } = splitUrl(item.source);
  return (
    <>
      <div className="head" role="toolbar" aria-label="Page navigation">
        <button type="button" className="btn btn-icon" aria-label="Back" title="Back" disabled>
          <ArrowLeft />
        </button>
        <button type="button" className="btn btn-icon" aria-label="Forward" title="Forward" disabled>
          <ArrowRight />
        </button>
        <button type="button" className="btn btn-icon" aria-label="Reload" title="Reload">
          <RotateCw />
        </button>
        <div className="url" title={item.source}>
          <b>{host}</b>
          {rest}
        </div>
        {fixture.contentLoads && (
          <span className="demo-tag hide-narrow" title="The app shows the live site in a native webview">
            Demo page
          </span>
        )}
        <button type="button" className="btn" onClick={onOpenExternal}>
          <ExternalLink />
          Open in browser
        </button>
      </div>
      <div className="content-view">
        {!fixture.contentLoads ? (
          <div className="load-failed" role="alert">
            <TriangleAlert width={20} height={20} color="var(--caution)" />
            <h2>{host} didn't load</h2>
            <p>
              The page refused the connection or took longer than 15 seconds. Your notes are unaffected. Try
              again, or read it in your browser and keep writing here.
            </p>
            <div className="row">
              <button type="button" className="btn btn-outline">
                <RotateCw />
                Try again
              </button>
              <button type="button" className="btn btn-outline" onClick={onOpenExternal}>
                <ExternalLink />
                Open in browser
              </button>
            </div>
          </div>
        ) : item.kind === "video" ? (
          <VideoEmbed title={item.title} />
        ) : (
          <ArticlePage />
        )}
      </div>
    </>
  );
}

/* Synthetic stand-in for the child webview. Original text, not the book. */
function ArticlePage() {
  return (
    <article className="site">
      <nav className="site-nav" aria-label="Site">
        <span>Asynchronous Programming in Rust</span>
        <span>›</span>
        <span>3. async/.await</span>
      </nav>
      <h1>async/.await</h1>
      <p>
        <code>async</code> and <code>.await</code> let you write code that waits on other work without
        blocking a thread. An <code>async</code> block or function doesn't run when it is created. It produces
        a value implementing <code>Future</code>, and that future only makes progress when an executor polls
        it.
      </p>
      <pre>
        <code>{`async fn learn_song() -> Song { /* ... */ }
async fn sing_song(song: Song) { /* ... */ }

async fn learn_and_sing() {
    let song = learn_song().await;
    sing_song(song).await;
}`}</code>
      </pre>
      <p>
        Inside an <code>async fn</code>, <code>.await</code> waits for another future to finish. Unlike a
        blocking call, it hands control back to the executor while it waits, so other tasks can run on the
        same thread.
      </p>
      <h2>async lifetimes</h2>
      <p>
        An <code>async fn</code> that takes references returns a future bound by those references' lifetimes.
        The future must be awaited while the borrowed values are still alive. A common fix is to move the
        values into an <code>async move</code> block, so the future owns them.
      </p>
      <h2>async move</h2>
      <p>
        <code>async move</code> blocks take ownership of the variables they reference, the same way{" "}
        <code>move</code> closures do. The future can then outlive the scope that created it, at the cost of
        no longer sharing those variables with other code.
      </p>
    </article>
  );
}

function VideoEmbed({ title }: { title: string }) {
  return (
    <div className="video" style={{ height: "100%" }}>
      <div style={{ width: "100%", maxWidth: "56rem" }}>
        <div className="video-frame">
          <span className="vt">{title}</span>
          <button type="button" className="video-play" aria-label="Play video">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 4.5v15l12.5-7.5z" />
            </svg>
          </button>
          <span className="video-bar" />
        </div>
        <p className="video-note">Embedded via youtube-nocookie.com in the app.</p>
      </div>
    </div>
  );
}

function PdfViewer({ fixture }: { fixture: Fixture }) {
  const pdf = fixture.pdf;
  const page = useStudy((s) => s.pdfPage);
  const setPage = useStudy((s) => s.setPdfPage);
  const [outline, setOutline] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [draft, setDraft] = useState<string | null>(null);
  if (!pdf) return null;
  const current = [...pdf.outline].reverse().find((o) => o.page <= page);

  return (
    <>
      <div className="head" role="toolbar" aria-label="PDF">
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Outline"
          title="Outline"
          aria-pressed={outline}
          onClick={() => setOutline(!outline)}
        >
          <ListTree />
        </button>
        <span className="head-file">
          <b>1706.03762.pdf</b>
        </span>
        <span className="spacer" />
        <button type="button" className="btn btn-icon" aria-label="Previous page" onClick={() => setPage(page - 1)}>
          <ChevronLeft />
        </button>
        <input
          className="pdf-pageno"
          aria-label="Page"
          inputMode="numeric"
          value={draft ?? String(page)}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            if (draft) setPage(Number(draft));
            setDraft(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <span className="pdf-total">/ {pdf.pages}</span>
        <button type="button" className="btn btn-icon" aria-label="Next page" onClick={() => setPage(page + 1)}>
          <ChevronRight />
        </button>
        <span className="band-divider" style={{ background: "var(--rule)", margin: "0.5rem 0.125rem" }} />
        <button type="button" className="btn btn-icon" aria-label="Zoom out" onClick={() => setZoom(Math.max(50, zoom - 10))}>
          <Minus />
        </button>
        <span className="zoom" aria-live="polite">
          {zoom}%
        </span>
        <button type="button" className="btn btn-icon" aria-label="Zoom in" onClick={() => setZoom(Math.min(300, zoom + 10))}>
          <Plus />
        </button>
        <span className="demo-tag hide-narrow" title="pdf.js renders the real file in the app">
          Demo page
        </span>
        <button type="button" className="btn btn-icon" aria-label="Search in PDF" title="Search in PDF">
          <Search />
        </button>
      </div>
      <div className="pdf">
        {outline && (
          <nav className="pdf-outline" aria-label="Outline">
            <span className="label">Outline</span>
            {pdf.outline.map((o) => (
              <button
                type="button"
                key={o.title}
                style={{ paddingLeft: `${0.875 + o.depth * 0.875}rem` }}
                aria-current={o === current}
                onClick={() => setPage(o.page)}
              >
                <span>{o.title}</span>
                <span className="pg">{o.page}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="pdf-scroll">
          <div className="pdf-page" style={{ width: `min(100%, ${(40 * zoom) / 100}rem)` }}>
            <h3>3.2.1 Scaled Dot-Product Attention</h3>
            <p>
              The input consists of queries and keys of dimension d<sub>k</sub>, and values of dimension d
              <sub>v</sub>. Dot products of the query with all keys are computed, each is divided by √d
              <sub>k</sub>, and a softmax gives the weights on the values.
            </p>
            <p className="eq">Attention(Q, K, V) = softmax(QK<sup>T</sup> / √d<sub>k</sub>) V</p>
            <p>
              For large values of d<sub>k</sub>, the dot products grow large in magnitude, pushing the softmax
              into regions with extremely small gradients. Scaling by 1/√d<sub>k</sub> counteracts this.
            </p>
            <h3>3.2.2 Multi-Head Attention</h3>
            <p>
              Instead of one attention function over d<sub>model</sub>-dimensional keys, values and queries, the
              model projects them h times with different learned projections and attends in parallel, then
              concatenates and projects the results.
            </p>
            <p className="folio">{page}</p>
          </div>
        </div>
      </div>
    </>
  );
}
