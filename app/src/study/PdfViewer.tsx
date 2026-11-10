import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { EventBus, PDFFindController, PDFLinkService, PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css";
import { ChevronLeft, ChevronRight, ListTree, Minus, Plus, Quote, Search, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../app/store";
import { backend } from "../ipc";
import { errorMessage, type Item } from "../ipc/schemas";
import { useStudy } from "./store";
import { kbd } from "../lib/keys";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

type OutlineEntry = { title: string; page: number; depth: number };
type Ctx = { viewer: PDFViewer; doc: pdfjs.PDFDocumentProxy; bus: EventBus };

async function flattenOutline(doc: pdfjs.PDFDocumentProxy): Promise<OutlineEntry[]> {
  const out: OutlineEntry[] = [];
  const walk = async (nodes: Awaited<ReturnType<typeof doc.getOutline>>, depth: number) => {
    for (const n of nodes ?? []) {
      let page = 0;
      try {
        const dest = typeof n.dest === "string" ? await doc.getDestination(n.dest) : n.dest;
        const ref = dest?.[0];
        if (ref && typeof ref === "object") page = (await doc.getPageIndex(ref)) + 1;
        else if (typeof ref === "number") page = ref + 1;
      } catch {
        /* unresolvable entries keep page 0 */
      }
      out.push({ title: n.title, page, depth });
      if (n.items?.length && depth < 3) await walk(n.items, depth + 1);
    }
  };
  await walk(await doc.getOutline(), 0);
  return out;
}

export function PdfViewer({ item }: { item: Item }) {
  const container = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [outline, setOutline] = useState<OutlineEntry[]>([]);
  const [showOutline, setShowOutline] = useState(true);
  const [find, setFind] = useState<string | null>(null);
  const insertText = useStudy((s) => s.insertText);
  const notify = useApp((s) => s.notify);
  const defaultZoom = useApp((s) => s.config?.config.pdf.defaultZoom ?? "page-width");

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let cancelled = false;
    let doc: pdfjs.PDFDocumentProxy | null = null;
    let task: ReturnType<typeof pdfjs.getDocument> | null = null;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const bus = new EventBus();
    const linkService = new PDFLinkService({ eventBus: bus });
    const findController = new PDFFindController({ eventBus: bus, linkService });
    const viewer = new PDFViewer({ container: el, eventBus: bus, linkService, findController, textLayerMode: 1 });
    linkService.setViewer(viewer);

    bus.on("pagechanging", (e: { pageNumber: number }) => {
      setPage(e.pageNumber);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void backend.statePatch({ pdfPositions: { [item.id]: { page: e.pageNumber, zoom: viewer.currentScale } } });
      }, 600);
    });
    bus.on("scalechanging", (e: { scale: number }) => setScale(e.scale));

    (async () => {
      try {
        const url = await backend.pdfOpen(item.id);
        task = pdfjs.getDocument({ url });
        doc = await task.promise;
        if (cancelled) return;
        viewer.setDocument(doc);
        linkService.setDocument(doc);
        ctx.current = { viewer, doc, bus };
        setPages(doc.numPages);
        bus.on("pagesinit", () => {
          const saved = useApp.getState().vaultState.pdfPositions?.[item.id];
          viewer.currentScaleValue = saved?.zoom ? String(saved.zoom) : defaultZoom === "100%" ? "1" : defaultZoom;
          if (saved?.page) viewer.currentPageNumber = Math.min(saved.page, doc?.numPages ?? 1);
        });
        setOutline(await flattenOutline(doc));
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(errorMessage(e));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(saveTimer);
      ctx.current = null;
      void task?.destroy();
    };
  }, [item.id, defaultZoom]);

  const go = (p: number) => {
    const c = ctx.current;
    if (c) c.viewer.currentPageNumber = Math.min(c.doc.numPages, Math.max(1, p));
  };
  const zoom = (factor: number) => {
    const c = ctx.current;
    if (c) c.viewer.currentScale = Math.min(4, Math.max(0.3, c.viewer.currentScale * factor));
  };
  const search = (query: string, again = false) => {
    ctx.current?.bus.dispatch("find", {
      source: null,
      type: again ? "again" : "",
      query,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
      matchDiacritics: false,
    });
  };

  const copyQuote = () => {
    const text = window.getSelection()?.toString().trim();
    if (!text) {
      notify("Select some text in the PDF first.");
      return;
    }
    const quoted = text
      .split(/\n+/)
      .map((l) => `> ${l}`)
      .join("\n");
    insertText(`${quoted}\n>\n> — p. ${page}\n`);
    notify(`Quoted p. ${page} into NOTES.md`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyQuote();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = [...outline].reverse().find((o) => o.page > 0 && o.page <= page);
  const fileName = item.source.split("/").pop() ?? "document.pdf";

  return (
    <>
      <div className="head" role="toolbar" aria-label="PDF">
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Outline"
          title="Outline"
          aria-pressed={showOutline}
          disabled={outline.length === 0}
          onClick={() => setShowOutline(!showOutline)}
        >
          <ListTree />
        </button>
        <span className="head-file">
          <b>{fileName}</b>
        </span>
        <span className="spacer" />
        <button type="button" className="btn btn-icon" aria-label="Previous page" onClick={() => go(page - 1)}>
          <ChevronLeft />
        </button>
        <input
          className="pdf-pageno"
          aria-label="Page"
          inputMode="numeric"
          value={draft ?? String(page)}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            if (draft) go(Number(draft));
            setDraft(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <span className="pdf-total">/ {pages || "–"}</span>
        <button type="button" className="btn btn-icon" aria-label="Next page" onClick={() => go(page + 1)}>
          <ChevronRight />
        </button>
        <span className="tool-rule" />
        <button type="button" className="btn btn-icon" aria-label="Zoom out" onClick={() => zoom(1 / 1.15)}>
          <Minus />
        </button>
        <button
          type="button"
          className="zoom btn"
          title="Fit width"
          onClick={() => {
            if (ctx.current) ctx.current.viewer.currentScaleValue = "page-width";
          }}
        >
          {Math.round(scale * 100)}%
        </button>
        <button type="button" className="btn btn-icon" aria-label="Zoom in" onClick={() => zoom(1.15)}>
          <Plus />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Search in PDF"
          aria-pressed={find !== null}
          onClick={() => setFind(find === null ? "" : null)}
        >
          <Search />
        </button>
        <button type="button" className="btn" title={`Quote the selection into NOTES.md (${kbd("C", { shift: true })})`} onClick={copyQuote}>
          <Quote />
          <span className="btn-label">Quote</span>
        </button>
        {item.source.startsWith("http") && (
          <button
            type="button"
            className="btn hide-narrow"
            title="Download this PDF into the item folder and commit it with the vault"
            onClick={async () => {
              try {
                await backend.pdfMakeLocal(item.id);
                notify("Saved the PDF into the item folder.");
              } catch (e) {
                notify(errorMessage(e), "error");
              }
            }}
          >
            Keep a copy
          </button>
        )}
      </div>
      {find !== null && (
        <div className="findbar">
          <Search />
          <input
            // biome-ignore lint/a11y/noAutofocus: opening search is an explicit request to type.
            autoFocus
            aria-label="Search text"
            placeholder="Search this PDF"
            value={find}
            onChange={(e) => {
              setFind(e.target.value);
              search(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") search(find, true);
              if (e.key === "Escape") {
                e.preventDefault();
                setFind(null);
              }
            }}
          />
          <button type="button" className="btn btn-icon" aria-label="Close search" onClick={() => setFind(null)}>
            <X />
          </button>
        </div>
      )}
      <div className="pdf">
        {showOutline && outline.length > 0 && (
          <nav className="pdf-outline" aria-label="Outline">
            <span className="label">Outline</span>
            {outline.map((o, i) => (
              <button
                type="button"
                // biome-ignore lint/suspicious/noArrayIndexKey: outline titles can repeat.
                key={i}
                style={{ paddingLeft: `${0.875 + o.depth * 0.875}rem` }}
                aria-current={o === current}
                disabled={o.page === 0}
                onClick={() => go(o.page)}
              >
                <span>{o.title}</span>
                <span className="pg">{o.page || ""}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="pdf-stage">
          <div ref={container} className="pdf-scroll-abs">
            <div className="pdfViewer" />
          </div>
          {loading && <p className="pdf-status">Opening {fileName}…</p>}
          {error && (
            <div className="load-failed" role="alert">
              <TriangleAlert width={20} height={20} color="var(--caution)" />
              <h2>Couldn't open this PDF</h2>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
