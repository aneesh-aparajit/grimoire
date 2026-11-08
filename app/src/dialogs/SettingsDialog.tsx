import { RotateCw } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/store";
import { Modal } from "../components/Modal";
import { type Language, LANGUAGES } from "../ipc/schemas";

/** Writes to .grimoire/config.json (follows the vault through git) or, for
 * toolchain paths, .grimoire/local/settings.json (this machine only). */
export function SettingsDialog() {
  const config = useApp((s) => s.config);
  const toolchains = useApp((s) => s.toolchains);
  const setConfig = useApp((s) => s.setConfig);
  const setDialog = useApp((s) => s.setDialog);
  const refresh = useApp((s) => s.refreshToolchains);
  const vault = useApp((s) => s.vault);
  const [tab, setTab] = useState<"vault" | "toolchains">("vault");
  if (!config) return null;
  const c = config.config;
  const close = () => setDialog(null);
  const num = (path: string, min: number, max: number) => (e: React.FocusEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v >= min && v <= max) void setConfig("vault", path, v);
    else e.target.value = String(e.target.defaultValue);
  };

  return (
    <Modal title="Settings" onClose={close} width="36rem">
      <div className="seg seg-wide" role="tablist" aria-label="Settings section">
        <button type="button" role="tab" aria-selected={tab === "vault"} aria-pressed={tab === "vault"} onClick={() => setTab("vault")}>
          This vault
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "toolchains"}
          aria-pressed={tab === "toolchains"}
          onClick={() => setTab("toolchains")}
        >
          Toolchains on this machine
        </button>
      </div>

      {tab === "vault" ? (
        <div className="form">
          <p className="hint">
            Saved in <code>.grimoire/config.json</code>, so they follow {vault?.name} to every machine through git.
          </p>
          {config.issues.length > 0 && (
            <div className="form-error" role="alert">
              Ignored invalid values: {config.issues.join("; ")}
            </div>
          )}
          <div className="settings-grid">
            <label htmlFor="s-theme">Theme</label>
            <select id="s-theme" className="select" value={c.theme} onChange={(e) => void setConfig("vault", "theme", e.target.value)}>
              <option value="system">Match the system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>

            <label htmlFor="s-font">Notes text size</label>
            <span className="inline">
              <input id="s-font" type="number" min={8} max={32} defaultValue={c.editor.fontSize} onBlur={num("editor.fontSize", 8, 32)} />
              px
            </span>

            <label htmlFor="s-wrap">Wrap long lines</label>
            <input id="s-wrap" type="checkbox" checked={c.editor.lineWrap} onChange={(e) => void setConfig("vault", "editor.lineWrap", e.target.checked)} />

            <label htmlFor="s-lint">Markdown hints</label>
            <input id="s-lint" type="checkbox" checked={c.lint.enabled} onChange={(e) => void setConfig("vault", "lint.enabled", e.target.checked)} />

            <label htmlFor="s-autosave">Autosave after</label>
            <span className="inline">
              <input id="s-autosave" type="number" min={100} max={10000} step={50} defaultValue={c.editor.autosaveMs} onBlur={num("editor.autosaveMs", 100, 10000)} />
              ms
            </span>

            <label htmlFor="s-sandbox">Sandbox open by default</label>
            <input id="s-sandbox" type="checkbox" checked={c.layout.sandboxOpen} onChange={(e) => void setConfig("vault", "layout.sandboxOpen", e.target.checked)} />

            <label htmlFor="s-lang">Default language</label>
            <select
              id="s-lang"
              className="select"
              value={c.sandbox.defaultLanguage}
              onChange={(e) => void setConfig("vault", "sandbox.defaultLanguage", e.target.value as Language)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>

            <label htmlFor="s-timeout">Run timeout</label>
            <span className="inline">
              <input
                id="s-timeout"
                type="number"
                min={1}
                max={300}
                defaultValue={c.sandbox.timeoutMs / 1000}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 1 && v <= 300) void setConfig("vault", "sandbox.timeoutMs", Math.round(v * 1000));
                }}
              />
              s
            </span>

            <label htmlFor="s-zoom">PDF zoom</label>
            <select id="s-zoom" className="select" value={c.pdf.defaultZoom} onChange={(e) => void setConfig("vault", "pdf.defaultZoom", e.target.value)}>
              <option value="page-width">Fit width</option>
              <option value="page-fit">Fit page</option>
              <option value="100%">100%</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="form">
          <p className="hint">
            Saved in <code>.grimoire/local/settings.json</code>, which git ignores. Leave a path empty to use the one on
            your PATH.
          </p>
          <table className="toolchains">
            <thead>
              <tr>
                <th scope="col">Language</th>
                <th scope="col">Found</th>
                <th scope="col">Override path</th>
              </tr>
            </thead>
            <tbody>
              {LANGUAGES.map((l) => {
                const t = toolchains.find((x) => x.language === l.id);
                const override = (config.toolchains[l.id] as string | undefined) ?? "";
                return (
                  <tr key={l.id}>
                    <th scope="row">{l.label}</th>
                    <td>
                      {t?.path ? (
                        <span className="mono" title={t.path}>
                          {t.version ?? t.path}
                        </span>
                      ) : (
                        <span className="stamp stamp-caution">{l.bin} not found</span>
                      )}
                    </td>
                    <td>
                      <input
                        aria-label={`${l.label} path`}
                        className="mono"
                        placeholder={l.bin}
                        defaultValue={override}
                        spellCheck={false}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== override) void setConfig("local", `toolchains.${l.id}`, v || null);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className="btn btn-outline" onClick={() => void refresh()}>
            <RotateCw /> Detect again
          </button>
        </div>
      )}
    </Modal>
  );
}
