import { ArrowLeft, ArrowRight, ExternalLink, RotateCw, TriangleAlert } from "lucide-react";
import { backend } from "../ipc";
import type { Item } from "../ipc/schemas";
import { PdfViewer } from "./PdfViewer";
import { WebPane } from "./WebPane";

function splitUrl(url: string) {
  try {
    const u = new URL(url);
    return { host: u.host, rest: u.pathname + u.search };
  } catch {
    return { host: "", rest: url };
  }
}

export function ContentPane({ item, hidden }: { item: Item; hidden: boolean }) {
  if (item.kind === "pdf") {
    return backend.mock ? <MockPdf item={item} /> : <PdfViewer item={item} />;
  }
  const { host, rest } = splitUrl(item.source);
  const open = () => void backend.openExternal(item.source);
  const mockFails = backend.mock && item.id === "go-memory-model";

  return (
    <>
      <div className="head" role="toolbar" aria-label="Page navigation">
        <button type="button" className="btn btn-icon" aria-label="Back" title="Back" onClick={() => void backend.contentNav("back")}>
          <ArrowLeft />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Forward"
          title="Forward"
          onClick={() => void backend.contentNav("forward")}
        >
          <ArrowRight />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Reload"
          title="Reload"
          onClick={() => void backend.contentNav("reload")}
        >
          <RotateCw />
        </button>
        <div className="url" title={item.source}>
          <b>{host}</b>
          {rest}
        </div>
        {backend.mock && !mockFails && (
          <span className="demo-tag" title="The desktop app shows the live site in a native webview">
            Demo page
          </span>
        )}
        <button type="button" className="btn" onClick={open}>
          <ExternalLink />
          <span className="btn-label">Open in browser</span>
        </button>
      </div>
      {!backend.mock ? (
        <WebPane item={item} hidden={hidden} />
      ) : (
        <div className="content-view">
          {mockFails ? (
            <div className="load-failed" role="alert">
              <TriangleAlert width={20} height={20} color="var(--caution)" />
              <h2>{item.origin} didn't load</h2>
              <p>
                The page refused the connection or took longer than 15 seconds. Your notes are unaffected. Try again, or
                read it in your browser and keep writing here.
              </p>
              <div className="row">
                <button type="button" className="btn btn-outline">
                  <RotateCw />
                  Try again
                </button>
                <button type="button" className="btn btn-outline" onClick={open}>
                  <ExternalLink />
                  Open in browser
                </button>
              </div>
            </div>
          ) : item.kind === "youtube" || item.kind === "vimeo" ? (
            <MockVideo title={item.title} />
          ) : (
            <MockArticle />
          )}
        </div>
      )}
    </>
  );
}

/* ---------- browser-only stand-ins (the desktop app renders the real thing) ---------- */

function MockArticle() {
  return (
    <article className="site">
      <nav className="site-nav" aria-label="Site">
        <span>Asynchronous Programming in Rust</span>
        <span>›</span>
        <span>3. async/.await</span>
      </nav>
      <h1>async/.await</h1>
      <p>
        <code>async</code> and <code>.await</code> let you write code that waits on other work without blocking a
        thread. An <code>async</code> block or function doesn't run when it is created. It produces a value
        implementing <code>Future</code>, and that future only makes progress when an executor polls it.
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
        Inside an <code>async fn</code>, <code>.await</code> waits for another future to finish. Unlike a blocking
        call, it hands control back to the executor while it waits, so other tasks can run on the same thread.
      </p>
      <h2>async lifetimes</h2>
      <p>
        An <code>async fn</code> that takes references returns a future bound by those references' lifetimes. The
        future must be awaited while the borrowed values are still alive. A common fix is to move the values into an{" "}
        <code>async move</code> block, so the future owns them.
      </p>
    </article>
  );
}

function MockVideo({ title }: { title: string }) {
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

function MockPdf({ item }: { item: Item }) {
  return (
    <>
      <div className="head" role="toolbar" aria-label="PDF">
        <span className="head-file">
          <b>{item.source.split("/").pop()}</b>
        </span>
        <span className="spacer" />
        <span className="demo-tag">Demo page · pdf.js renders the real file in the app</span>
      </div>
      <div className="pdf">
        <div className="pdf-scroll">
          <div className="pdf-page">
            <h3>3.2.1 Scaled Dot-Product Attention</h3>
            <p>
              The input consists of queries and keys of dimension d<sub>k</sub>, and values of dimension d<sub>v</sub>.
              Dot products of the query with all keys are computed, each is divided by √d<sub>k</sub>, and a softmax
              gives the weights on the values.
            </p>
            <p className="eq">
              Attention(Q, K, V) = softmax(QK<sup>T</sup> / √d<sub>k</sub>) V
            </p>
            <p>
              For large values of d<sub>k</sub>, the dot products grow large in magnitude, pushing the softmax into
              regions with extremely small gradients. Scaling by 1/√d<sub>k</sub> counteracts this.
            </p>
            <p className="folio">4</p>
          </div>
        </div>
      </div>
    </>
  );
}
