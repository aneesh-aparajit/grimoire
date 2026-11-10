/** Whether the app is running on macOS, where shortcuts use ⌘ instead of Ctrl. */
export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * A shortcut label in the platform's style: `kbd("K")` is "⌘K" on macOS and
 * "Ctrl+K" on Windows and Linux. `↵` reads "Enter" off the Mac.
 */
export function kbd(key: string, { shift = false } = {}): string {
  if (IS_MAC) return `${shift ? "⇧" : ""}⌘${key}`;
  return `Ctrl+${shift ? "Shift+" : ""}${key === "↵" ? "Enter" : key}`;
}

/** What the system file manager is called, for "Show in …" labels. */
export const FILE_MANAGER = IS_MAC ? "Finder" : typeof navigator !== "undefined" && /Windows/.test(navigator.userAgent) ? "Explorer" : "the file manager";
