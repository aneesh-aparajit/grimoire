//! `<app_config_dir>/recent.json`: the only file outside the vault, because
//! the app must know which vault to open before it can read one.

use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

fn file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("recent.json"))
}

pub fn list(app: &AppHandle) -> Vec<String> {
    let Some(f) = file(app) else { return Vec::new() };
    std::fs::read_to_string(f)
        .ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        .and_then(|v| v.get("vaults").cloned())
        .and_then(|v| serde_json::from_value::<Vec<String>>(v).ok())
        .unwrap_or_default()
        .into_iter()
        .filter(|p| Path::new(p).join("INDEX.md").exists())
        .collect()
}

pub fn push(app: &AppHandle, root: &Path) {
    let Some(f) = file(app) else { return };
    let r = root.display().to_string();
    let mut v = list(app);
    v.retain(|p| p != &r);
    v.insert(0, r);
    v.truncate(10);
    let _ = crate::fsx::write_text_atomic(&f, &serde_json::json!({ "vaults": v }).to_string());
}
