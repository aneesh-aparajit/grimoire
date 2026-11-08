import { FolderOpen, FolderPlus } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/store";
import { backend } from "../ipc";

export function VaultPicker() {
  const recent = useApp((s) => s.recent);
  const openVault = useApp((s) => s.openVault);
  const createVault = useApp((s) => s.createVault);
  const busy = useApp((s) => s.busy);
  const [lfs, setLfs] = useState(false);

  return (
    <div className="picker">
      <header className="band">
        <span className="wordmark">grimoire</span>
      </header>
      <main className="picker-main">
        <h1>Open a vault</h1>
        <p className="prose">
          A vault is a plain folder: <code>INDEX.md</code> is your reading list, and every item gets a folder with its{" "}
          <code>NOTES.md</code> and sandbox code. Put it in git to carry it between machines.
        </p>

        {recent.length > 0 && (
          <section aria-label="Recent vaults">
            <h2 className="label">Recent</h2>
            <ul className="recent">
              {recent.map((r) => (
                <li key={r}>
                  <button type="button" onClick={() => void openVault(r)} disabled={Boolean(busy)}>
                    <FolderOpen />
                    <span className="recent-name">{r.split("/").pop()}</span>
                    <span className="mono recent-path">{r}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="picker-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={Boolean(busy)}
            onClick={async () => {
              const p = await backend.pickFolder("Open a vault (a folder with INDEX.md)");
              if (p) await openVault(p);
            }}
          >
            <FolderOpen /> Open a folder…
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={Boolean(busy)}
            onClick={async () => {
              const p = await backend.pickFolder("Choose an empty folder for the new vault");
              if (p) await createVault(p, lfs);
            }}
          >
            <FolderPlus /> Create a vault…
          </button>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={lfs} onChange={(e) => setLfs(e.target.checked)} />
          <span>
            Store PDFs with Git LFS (writes a <code>.gitattributes</code> in the new vault)
          </span>
        </label>
        {busy && <p className="hint">{busy}</p>}
      </main>
    </div>
  );
}
