"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Os = "macos" | "windows" | "linux";

const OSES: Os[] = ["macos", "windows", "linux"];
const isOs = (v: unknown): v is Os => OSES.includes(v as Os);

const LABEL: Record<Os, string> = { macos: "macOS", windows: "Windows", linux: "Linux" };

/** The visitor's system, guessed from the user agent. Anything else (phones included) gets the macOS guide. */
function detect(): Os {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Linux|X11|CrOS/i.test(ua) && !/Android/i.test(ua)) return "linux";
  return "macos";
}

/**
 * Which guide a `#hash` asks for: `#macos`, `#windows` or `#linux` directly, or the
 * guide that holds the element with that id.
 */
function fromHash(): Os | null {
  const id = decodeURIComponent(location.hash.slice(1));
  if (isOs(id)) return id;
  const owner = id ? document.getElementById(id)?.closest<HTMLElement>("[data-for]")?.dataset.for : undefined;
  return isOs(owner) ? owner : null;
}

// Runs as soon as the guide is parsed, before hydration, so a Windows visitor
// never sees the macOS guide flash past.
const PICK_EARLY = `(function(){try{var s=document.currentScript.parentElement,h=decodeURIComponent(location.hash.slice(1)),e=h&&document.getElementById(h),k=["macos","windows","linux"],u=navigator.userAgent,o=k.indexOf(h)>=0?h:e&&e.closest("[data-for]")?e.closest("[data-for]").dataset.for:null;s.dataset.os=k.indexOf(o)>=0?o:/Windows/i.test(u)?"windows":/Linux|X11|CrOS/i.test(u)&&!/Android/i.test(u)?"linux":"macos"}catch(_){}})()`;

const OsContext = createContext<{ os: Os; pick: (os: Os) => void }>({ os: "macos", pick: () => {} });

/**
 * Shows the parts of the install guide for one system. Children marked
 * `data-for="macos"`, `"windows"` or `"linux"` show only for that system;
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

/** Keys that pick which system's guide to show. */
export function OsSwitch() {
  const { os, pick } = useContext(OsContext);
  return (
    <div className="osswitch" role="group" aria-label="Show the guide for">
      <span className="osswitch-label">Show the guide for</span>
      {OSES.map((o) => (
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
