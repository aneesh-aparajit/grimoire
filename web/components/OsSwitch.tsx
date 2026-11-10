"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Os = "macos" | "windows";

const LABEL: Record<Os, string> = { macos: "macOS", windows: "Windows" };

/** The visitor's system, guessed from the user agent. Anything that isn't Windows gets the macOS guide. */
function detect(): Os {
  return /Windows/i.test(navigator.userAgent) ? "windows" : "macos";
}

/**
 * Which guide a `#hash` asks for: `#windows` or `#macos` directly, or the
 * guide that holds the element with that id.
 */
function fromHash(): Os | null {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id === "windows" || id === "macos") return id;
  const owner = id ? document.getElementById(id)?.closest<HTMLElement>("[data-for]")?.dataset.for : undefined;
  return owner === "windows" || owner === "macos" ? owner : null;
}

// Runs as soon as the guide is parsed, before hydration, so a Windows visitor
// never sees the macOS guide flash past.
const PICK_EARLY = `(function(){try{var s=document.currentScript.parentElement,h=decodeURIComponent(location.hash.slice(1)),e=h&&document.getElementById(h),o=h==="windows"||h==="macos"?h:e&&e.closest("[data-for]")?e.closest("[data-for]").dataset.for:null;s.dataset.os=o||(/Windows/i.test(navigator.userAgent)?"windows":"macos")}catch(_){}})()`;

const OsContext = createContext<{ os: Os; pick: (os: Os) => void }>({ os: "macos", pick: () => {} });

/**
 * Shows the parts of the install guide for one system. Children marked
 * `data-for="macos"` or `data-for="windows"` show only for that system;
 * everything else shows for both.
 */
export function OsScope({ children }: { children: ReactNode }) {
  const [os, setOs] = useState<Os>("macos");

  useEffect(() => {
    const sync = () => {
      const want = fromHash();
      if (want) setOs(want);
      return want;
    };
    if (!sync()) setOs(detect());
    // A link to a section of the other guide switches to it, then scrolls there.
    const onHash = () => {
      if (sync()) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const pick = (next: Os) => {
    setOs(next);
    history.replaceState(null, "", `#${next}`);
  };

  return (
    <div className="os" data-os={os} suppressHydrationWarning>
      <OsContext.Provider value={{ os, pick }}>{children}</OsContext.Provider>
      <script dangerouslySetInnerHTML={{ __html: PICK_EARLY }} />
    </div>
  );
}

/** Two keys that pick which system's guide to show. */
export function OsSwitch() {
  const { os, pick } = useContext(OsContext);
  return (
    <div className="osswitch" role="group" aria-label="Show the guide for">
      <span className="osswitch-label">Show the guide for</span>
      {(Object.keys(LABEL) as Os[]).map((o) => (
        <button
          key={o}
          type="button"
          className={`key sm${os === o ? " on" : ""}`}
          aria-pressed={os === o}
          onClick={() => pick(o)}
        >
          {LABEL[o]}
        </button>
      ))}
    </div>
  );
}

/** The primary install key, naming the visitor's system and linking to its guide. */
export function InstallKey({ className = "key go" }: { className?: string }) {
  const [os, setOs] = useState<Os>("macos");
  useEffect(() => setOs(detect()), []);
  return (
    <Link className={className} href={`/install#${os}`}>
      Install for {LABEL[os]}
    </Link>
  );
}
