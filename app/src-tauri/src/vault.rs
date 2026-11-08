//! The open vault: its index, writes, and the file watcher.

use crate::config::{self, EffectiveConfig};
use crate::error::{AppError, Result};
use crate::fsx::{check_id, write_text_atomic};
use crate::index::{Index, Item};
use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode, DebounceEventResult, Debouncer};
use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

pub const GITIGNORE: &str = "# Created by Grimoire\n.grimoire/local/\n*/sandbox/main\n*/sandbox/*.class\n*/sandbox/*.o\n.DS_Store\n";
pub const GITATTRIBUTES_LFS: &str = "*.pdf filter=lfs diff=lfs merge=lfs -text\n";
const INDEX_TEMPLATE: &str = "# Grimoire\n";

pub struct Vault {
    pub root: PathBuf,
    pub index: Index,
    _watcher: Option<Debouncer<notify_debouncer_mini::notify::RecommendedWatcher>>,
}

#[derive(Default)]
pub struct VaultCell {
    pub vault: Mutex<Option<Vault>>,
    /// Hash of the last content Grimoire wrote per path, to ignore our own writes.
    pub written: Arc<Mutex<HashMap<PathBuf, u64>>>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndexSnapshot {
    pub items: Vec<Item>,
    pub conflicted: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSnapshot {
    pub root: String,
    pub name: String,
    pub index: IndexSnapshot,
    pub config: EffectiveConfig,
    pub state: Value,
}

fn hash(text: &[u8]) -> u64 {
    let mut h = std::collections::hash_map::DefaultHasher::new();
    text.hash(&mut h);
    h.finish()
}

fn folders(root: &Path) -> HashSet<String> {
    std::fs::read_dir(root)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .filter(|e| e.path().is_dir())
                .filter_map(|e| e.file_name().to_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

pub fn read_index(root: &Path) -> Result<Index> {
    let text = std::fs::read_to_string(root.join("INDEX.md")).unwrap_or_default();
    Ok(Index::parse(&text, &folders(root)))
}

impl Vault {
    pub fn snapshot(&self) -> IndexSnapshot {
        IndexSnapshot { items: self.index.items(), conflicted: self.index.conflicted }
    }

    pub fn item_dir(&self, id: &str) -> Result<PathBuf> {
        check_id(id)?;
        Ok(self.root.join(id))
    }
}

impl VaultCell {
    pub fn with<T>(&self, f: impl FnOnce(&mut Vault) -> Result<T>) -> Result<T> {
        let mut guard = self.vault.lock().unwrap();
        let v = guard.as_mut().ok_or_else(|| AppError::NoVault("No vault is open".into()))?;
        f(v)
    }

    pub fn root(&self) -> Result<PathBuf> {
        self.with(|v| Ok(v.root.clone()))
    }

    /// Writes a text file inside the vault and remembers its hash.
    pub fn write(&self, path: &Path, text: &str) -> Result<()> {
        write_text_atomic(path, text)?;
        let on_disk = std::fs::read(path)?;
        self.written.lock().unwrap().insert(path.to_path_buf(), hash(&on_disk));
        Ok(())
    }

    /// Serialises and writes INDEX.md. Refuses while the file has conflict markers.
    pub fn save_index(&self, v: &Vault) -> Result<()> {
        if v.index.conflicted {
            return Err(AppError::Conflict(
                "INDEX.md has merge conflict markers. Resolve them, then try again.".into(),
            ));
        }
        self.write(&v.root.join("INDEX.md"), &v.index.serialize())
    }

    pub fn open(&self, app: &AppHandle, root: PathBuf, create: bool, lfs: bool) -> Result<VaultSnapshot> {
        let root = root.canonicalize().map_err(|_| AppError::NotFound(format!("{} doesn't exist", root.display())))?;
        if !root.is_dir() {
            return Err(AppError::InvalidPath(format!("{} is not a folder", root.display())));
        }
        let index_path = root.join("INDEX.md");
        if !index_path.exists() {
            if !create {
                return Err(AppError::NotFound(format!(
                    "{} has no INDEX.md. Create a vault there instead?",
                    root.display()
                )));
            }
            self.write(&index_path, INDEX_TEMPLATE)?;
        }
        let gdir = root.join(".grimoire");
        std::fs::create_dir_all(gdir.join("local"))?;
        if !gdir.join("config.json").exists() {
            self.write(&gdir.join("config.json"), &serde_json::to_string_pretty(&config::default_config_json())?)?;
        }
        self.write(&gdir.join("config.schema.json"), &serde_json::to_string_pretty(&config::schema_json())?)?;
        if !root.join(".gitignore").exists() {
            self.write(&root.join(".gitignore"), GITIGNORE)?;
        }
        if lfs && !root.join(".gitattributes").exists() {
            self.write(&root.join(".gitattributes"), GITATTRIBUTES_LFS)?;
        }

        let index = read_index(&root)?;
        let watcher = start_watcher(app.clone(), root.clone(), self.written.clone()).ok();
        let snapshot = {
            let v = Vault { root: root.clone(), index, _watcher: watcher };
            let s = v.snapshot();
            *self.vault.lock().unwrap() = Some(v);
            s
        };
        crate::recent::push(app, &root);
        let scope = app.asset_protocol_scope();
        let _ = scope.allow_directory(&root, true);

        Ok(VaultSnapshot {
            name: root.file_name().and_then(|n| n.to_str()).unwrap_or("vault").to_string(),
            root: root.display().to_string(),
            index: snapshot,
            config: config::load(&root),
            state: config::state_get(&root),
        })
    }
}

fn start_watcher(
    app: AppHandle,
    root: PathBuf,
    written: Arc<Mutex<HashMap<PathBuf, u64>>>,
) -> notify_debouncer_mini::notify::Result<Debouncer<notify_debouncer_mini::notify::RecommendedWatcher>> {
    let r = root.clone();
    let mut debouncer = new_debouncer(Duration::from_millis(200), move |res: DebounceEventResult| {
        let Ok(events) = res else { return };
        let mut index_changed = false;
        let mut config_changed = false;
        let mut notes: HashSet<String> = HashSet::new();
        for ev in events {
            let Ok(rel) = ev.path.strip_prefix(&r) else { continue };
            let rel_s = rel.to_string_lossy();
            if rel_s.starts_with(".git/") || rel_s.starts_with(".grimoire/local") || rel_s.ends_with(".grimoire-tmp") {
                continue;
            }
            // Ignore our own writes.
            if let Ok(bytes) = std::fs::read(&ev.path) {
                if written.lock().unwrap().get(&ev.path) == Some(&hash(&bytes)) {
                    continue;
                }
            }
            if rel_s == "INDEX.md" {
                index_changed = true;
            } else if rel_s == ".grimoire/config.json" {
                config_changed = true;
            } else if let Some(id) = rel_s.strip_suffix("/NOTES.md") {
                notes.insert(id.to_string());
            }
        }
        if index_changed {
            let cell = app.state::<VaultCell>();
            let snap = cell.with(|v| {
                v.index = read_index(&v.root)?;
                Ok(v.snapshot())
            });
            if let Ok(s) = snap {
                let _ = app.emit_to("main", "index://changed", s);
            }
        }
        if config_changed {
            let _ = app.emit_to("main", "config://changed", config::load(&r));
        }
        for id in notes {
            let _ = app.emit_to("main", "notes://changed", serde_json::json!({ "id": id }));
        }
    })?;
    debouncer.watcher().watch(&root, RecursiveMode::Recursive)?;
    Ok(debouncer)
}

pub fn notes_header(item: &Item) -> String {
    if item.source.starts_with("http") {
        format!("# {}\n\n<{}>\n", item.title, item.source)
    } else {
        let file = Path::new(&item.source).file_name().and_then(|f| f.to_str()).unwrap_or("document.pdf");
        format!("# {}\n\n[{}]({})\n", item.title, file, file)
    }
}
