import { ExternalLink, RotateCw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { backend } from "../ipc";
import type { Item } from "../ipc/schemas";

const LOAD_TIMEOUT_MS = 15_000;

/** Positions the native child webview over this element. Framing headers
 * don't apply to it, so sites that refuse iframes still load. */
export function WebPane({ item, hidden }: { item: Item; hidden: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const rect = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: Math.max(1, r.width), height: Math.max(1, r.height) };
    };
    setState("loading");
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        setState("failed");
        void backend.contentHide();
      }
    }, LOAD_TIMEOUT_MS);
    const off = backend.on("content://load", (e) => {
      if (e.state === "finished") {
        settled = true;
        clearTimeout(timer);
        setState("ready");
      }
    });
    void backend.contentShow(item.source, rect()).catch(() => setState("failed"));
    const ro = new ResizeObserver(() => void backend.contentBounds(rect()));
    ro.observe(el);
    const onResize = () => void backend.contentBounds(rect());
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      off();
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      void backend.contentHide();
    };
  }, [item.source, attempt]);

  // Dialogs and collapsed panes must not sit under the native webview.
  useEffect(() => {
    if (hidden) void backend.contentHide();
    else if (host.current && state !== "failed") {
      const r = host.current.getBoundingClientRect();
      void backend.contentShow(item.source, { x: r.left, y: r.top, width: r.width, height: r.height });
    }
  }, [hidden]);

  return (
    <div ref={host} className="content-view webpane" data-state={state}>
      {state === "loading" && <p className="pdf-status">Loading {item.origin}…</p>}
      {state === "failed" && (
        <div className="load-failed" role="alert">
          <TriangleAlert width={20} height={20} color="var(--caution)" />
          <h2>{item.origin} didn't load</h2>
          <p>
            The page refused the connection or took longer than {LOAD_TIMEOUT_MS / 1000} seconds. Your notes are
            unaffected. Try again, or read it in your browser and keep writing here.
          </p>
          <div className="row">
            <button type="button" className="btn btn-outline" onClick={() => setAttempt(attempt + 1)}>
              <RotateCw />
              Try again
            </button>
            <button type="button" className="btn btn-outline" onClick={() => void backend.openExternal(item.source)}>
              <ExternalLink />
              Open in browser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
