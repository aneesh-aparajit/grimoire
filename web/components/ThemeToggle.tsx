"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** Switches between light and dark. Follows the system until clicked, then remembers the choice. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setTheme(set === "light" || set === "dark" ? set : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  function flip() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.dataset.theme = next;
    setTimeout(() => root.classList.remove("theme-switching"), 320);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage can be blocked; the switch still applies for this visit.
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button type="button" className="theme" onClick={flip} aria-label={label} title={label}>
      {theme === "dark" ? (
        <svg viewBox="0 0 16 16" key="sun" aria-hidden="true">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" key="moon" aria-hidden="true">
          <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
        </svg>
      )}
    </button>
  );
}
