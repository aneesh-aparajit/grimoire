"use client";

import { useState } from "react";

/** Copies `text` to the clipboard and says so for a moment. */
export function CopyButton({ text, label, className = "copy mono" }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the text is still selectable.
    }
  }

  return (
    <button type="button" className={`${className}${copied ? " copied" : ""}`} onClick={copy} aria-label={`Copy: ${label}`}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
