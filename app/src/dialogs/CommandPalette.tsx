import { useState } from "react";
import { useApp } from "../app/store";
import { KindIcon } from "../components/KindIcon";
import { Modal } from "../components/Modal";
import { tagCounts } from "../lib/search";
import { kbd } from "../lib/keys";

type Entry = { key: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void };

function score(text: string, q: string): number {
  if (!q) return 1;
  const t = text.toLowerCase();
  const i = t.indexOf(q);
  if (i < 0) return 0;
  // Earlier and word-start matches rank higher.
  return 100 - i + (i === 0 || /[\s#/-]/.test(t[i - 1] ?? "") ? 50 : 0);
}

export function CommandPalette() {
  const items = useApp((s) => s.items);
  const setDialog = useApp((s) => s.setDialog);
  const openItem = useApp((s) => s.openItem);
  const setQuery = useApp((s) => s.setQuery);
  const back = useApp((s) => s.back);
  const closeVault = useApp((s) => s.closeVault);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const close = () => setDialog(null);

  const commands: Entry[] = [
    { key: "add", label: "Add to the reading list", hint: kbd("N"), run: () => setDialog({ kind: "add" }) },
    { key: "settings", label: "Settings", hint: kbd(","), run: () => setDialog({ kind: "settings" }) },
    { key: "list", label: "Go to the reading list", hint: "Esc", run: () => (back(), close()) },
    { key: "vault", label: "Switch vault…", run: () => (close(), void closeVault()) },
  ];
  const itemEntries: Entry[] = items.map((i) => ({
    key: `item:${i.id}`,
    label: i.title,
    hint: i.origin,
    icon: <KindIcon kind={i.kind} />,
    run: () => void openItem(i.id),
  }));
  const tagEntries: Entry[] = tagCounts(items).map(([t, n]) => ({
    key: `tag:${t}`,
    label: `#${t}`,
    hint: `${n} item${n === 1 ? "" : "s"}`,
    run: () => {
      back();
      setQuery(`#${t} `);
      close();
    },
  }));

  const needle = q.trim().toLowerCase();
  const results = [...commands, ...tagEntries, ...itemEntries]
    .map((e) => ({ e, s: score(`${e.label} ${e.hint ?? ""}`, needle) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 12)
    .map((r) => r.e);
  const current = Math.min(active, Math.max(0, results.length - 1));

  return (
    <Modal title="Command palette" onClose={close} width="34rem" className="palette" bare>
      <input
        // biome-ignore lint/a11y/noAutofocus: the palette exists to take this input.
        autoFocus
        className="palette-input"
        placeholder="Open an item, jump to a tag, or run a command"
        aria-label="Command"
        aria-controls="palette-results"
        aria-activedescendant={results[current]?.key}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(Math.min(results.length - 1, current + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(0, current - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            results[current]?.run();
          }
        }}
      />
      <ul className="palette-list" id="palette-results" role="listbox" aria-label="Results">
        {results.length === 0 && <li className="palette-empty">No matches</li>}
        {results.map((r, i) => (
          <li
            key={r.key}
            id={r.key}
            role="option"
            aria-selected={i === current}
            onMouseEnter={() => setActive(i)}
            onClick={r.run}
            onKeyDown={() => {}}
          >
            <span className="palette-icon">{r.icon}</span>
            <span className="palette-label">{r.label}</span>
            {r.hint && <span className="palette-hint">{r.hint}</span>}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
