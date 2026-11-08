import { X } from "lucide-react";
import { useEffect } from "react";
import { CommandPalette } from "../dialogs/CommandPalette";
import { AddItemDialog, DeleteItemDialog, EditItemDialog } from "../dialogs/ItemDialogs";
import { SettingsDialog } from "../dialogs/SettingsDialog";
import { ListView } from "../list/ListView";
import { StudyView } from "../study/StudyView";
import { VaultPicker } from "../vault/VaultPicker";
import { useApp } from "./store";

export function App() {
  const phase = useApp((s) => s.phase);
  const route = useApp((s) => s.route);
  const dialog = useApp((s) => s.dialog);
  const notice = useApp((s) => s.notice);

  useEffect(() => {
    void useApp.getState().boot();
    const onKey = (e: KeyboardEvent) => {
      const s = useApp.getState();
      if (s.phase !== "ready") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setDialog(s.dialog?.kind === "palette" ? null : { kind: "palette" });
      } else if (mod && e.key === ",") {
        e.preventDefault();
        s.setDialog({ kind: "settings" });
      } else if (mod && e.key.toLowerCase() === "n" && s.route.view === "item") {
        e.preventDefault();
        s.setDialog({ kind: "add" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (phase === "boot") return <div className="boot" aria-busy="true" />;

  return (
    <>
      {phase === "picker" ? <VaultPicker /> : route.view === "item" ? <StudyView id={route.id} /> : <ListView />}

      {dialog?.kind === "add" && <AddItemDialog filePath={dialog.filePath} />}
      {dialog?.kind === "edit" && <EditItemDialog id={dialog.id} />}
      {dialog?.kind === "delete" && <DeleteItemDialog id={dialog.id} />}
      {dialog?.kind === "settings" && <SettingsDialog />}
      {dialog?.kind === "palette" && <CommandPalette />}

      {notice && (
        <div className="notice" role={notice.tone === "error" ? "alert" : "status"} data-tone={notice.tone}>
          <span>{notice.text}</span>
          <button type="button" className="btn btn-icon" aria-label="Dismiss" onClick={() => useApp.setState({ notice: null })}>
            <X />
          </button>
        </div>
      )}
    </>
  );
}
