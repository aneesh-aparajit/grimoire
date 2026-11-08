"use client";

import { useState } from "react";

/** A shell block of one or more commands, each with a `$` prompt, and a copy button for all of them. */
export function Shell({ commands, label }: { commands: string[]; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(commands.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the text is still selectable.
    }
  }

  return (
    <div className="shell-wrap">
      <pre className="shell" aria-label={label}>
        {commands.map((c, i) => (
          <span key={c}>
            <span className="p">$ </span>
            {c}
            {i < commands.length - 1 ? "\n" : ""}
          </span>
        ))}
      </pre>
      <button type="button" className="copy mono" onClick={copy} aria-label={`Copy: ${label}`}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
