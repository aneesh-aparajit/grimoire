//! The open vault: its index, writes, and the file watcher.

use crate::config::{self, EffectiveConfig};
use crate::error::{AppError, Result};
use crate::fsx::{check_id, write_text_atomic};
use crate::index::{Index, Item, LinkStyle};
use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode, DebounceEventResult, Debouncer};
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

pub const GITIGNORE: &str = "# Created by Grimoire\n.grimoire/local/\n*/sandbox/main\n*/sandbox/*.class\n*/sandbox/*.o\n*/sandbox/*/main\n*/sandbox/*/*.class\n*/sandbox/*/*.o\n.DS_Store\n";
pub const GITATTRIBUTES_LFS: &str = "*.pdf filter=lfs diff=lfs merge=lfs -text\n";
const INDEX_TEMPLATE: &str = "# Grimoire\n";

pub struct Vault {
    pub root: PathBuf,
    pub index: Index,
    /// Each playlist folder's own INDEX.md, keyed by folder name.
    pub playlists: BTreeMap<String, Index>,
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
    pub playlists: Vec<PlaylistInfo>,
    pub conflicted: bool,
}

/// A playlist line in the root index, with progress over its videos.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistInfo {
    pub id: String,
    pub title: String,
    pub source: String,
    pub tags: Vec<String>,
    pub done: bool,
    pub count: usize,
    pub done_count: usize,
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

/// Note file stems in a playlist folder (`01-intro.md` → `01-intro`).
fn note_stems(dir: &Path) -> HashSet<String> {
    std::fs::read_dir(dir)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .filter_map(|e| e.file_name().to_str()?.strip_suffix(".md").map(str::to_string))
                .filter(|s| s != "INDEX")
                .collect()
        })
        .unwrap_or_default()
}

pub fn read_playlist(root: &Path, id: &str) -> Index {
    let dir = root.join(id);
    let text = std::fs::read_to_string(dir.join("INDEX.md")).unwrap_or_default();
    Index::parse_playlist(&text, &note_stems(&dir))
}

pub fn read_index(root: &Path) -> Result<(Index, BTreeMap<String, Index>)> {
    let text = std::fs::read_to_string(root.join("INDEX.md")).unwrap_or_default();
    let index = Index::parse(&text, &folders(root));
    let playlists = index
        .items()
        .into_iter()
        .filter(|i| i.style == LinkStyle::Playlist && check_id(&i.id).is_ok())
        .map(|i| {
            let pl = read_playlist(root, &i.id);
            (i.id, pl)
        })
        .collect();
    Ok((index, playlists))
}

/// A playlist's video as the UI sees it: id `<playlist>/<video>`.
fn video(dir: &str, mut v: Item) -> Item {
    v.id = format!("{dir}/{}", v.id);
    v.playlist = Some(dir.to_string());
    v
}

impl Vault {
    pub fn snapshot(&self) -> IndexSnapshot {
        let mut items = Vec::new();
        let mut playlists = Vec::new();
        for item in self.index.items() {
            if item.style != LinkStyle::Playlist {
                items.push(item);
                continue;
            }
            let videos = self.playlists.get(&item.id).map(|p| p.items()).unwrap_or_default();
            playlists.push(PlaylistInfo {
                count: videos.len(),
                done_count: videos.iter().filter(|v| v.done).count(),
                id: item.id.clone(),
                title: item.title.clone(),
                source: item.source.clone(),
                tags: item.tags.clone(),
                done: item.done,
            });
            items.extend(videos.into_iter().map(|v| video(&item.id, v)));
        }
        IndexSnapshot { items, playlists, conflicted: self.conflicted() }
    }

    pub fn conflicted(&self) -> bool {
        self.index.conflicted || self.playlists.values().any(|p| p.conflicted)
    }

    /// Looks up an item by its UI id (`slug` or `playlist/video`).
    pub fn get(&self, id: &str) -> Option<Item> {
        match id.split_once('/') {
            Some((d, s)) => self.playlists.get(d)?.get(s).cloned().map(|v| video(d, v)),
            None => self.index.get(id).cloned(),
        }
    }

    /// Changes one item in place and returns it as the UI sees it. A
    /// playlist is marked done once every one of its videos is.
    pub fn update(&mut self, id: &str, f: impl FnOnce(&mut Item)) -> Result<Item> {
        let missing = || AppError::NotFound(format!("No item {id}"));
        match id.split_once('/') {
            Some((d, s)) => {
                let pl = self.playlists.get_mut(d).ok_or_else(missing)?;
                let it = pl.get_mut(s).ok_or_else(missing)?;
                f(it);
                let out = video(d, it.clone());
                self.sync_playlist_done(d);
                Ok(out)
            }
            None => {
                let it = self.index.get_mut(id).ok_or_else(missing)?;
                f(it);
                Ok(it.clone())
            }
        }
    }

    fn sync_playlist_done(&mut self, dir: &str) {
        let videos = self.playlists.get(dir).map(|p| p.items()).unwrap_or_default();
        let all = !videos.is_empty() && videos.iter().all(|v| v.done);
        if self.index.get(dir).is_some_and(|p| p.done != all) {
            if let Some(p) = self.index.get_mut(dir) {
                p.done = all;
            }
        }
    }

    /// Removes an item's line. Removing a playlist drops its videos too.
    pub fn remove(&mut self, id: &str) -> bool {
        match id.split_once('/') {
            Some((d, s)) => {
                let removed = self.playlists.get_mut(d).is_some_and(|p| p.remove(s));
                if removed {
                    self.sync_playlist_done(d);
                }
                removed
            }
            None => {
                self.playlists.remove(id);
                self.index.remove(id)
            }
        }
    }

    /// The folder of a top-level item or playlist.
    pub fn item_dir(&self, id: &str) -> Result<PathBuf> {
        check_id(id)?;
        if id.contains('/') {
            return Err(AppError::InvalidPath(format!("{id} is a video inside a playlist")));
        }
        Ok(self.root.join(id))
    }

    /// `<id>/NOTES.md`, or `<playlist>/<video>.md` for a playlist's video.
    pub fn notes_path(&self, id: &str) -> Result<PathBuf> {
        check_id(id)?;
        Ok(match id.split_once('/') {
            Some((d, s)) => self.root.join(d).join(format!("{s}.md")),
            None => self.root.join(id).join("NOTES.md"),
        })
    }

    /// `<id>/sandbox`, or `<playlist>/sandbox/<video>` for a playlist's video.
    pub fn sandbox_dir(&self, id: &str) -> Result<PathBuf> {
        check_id(id)?;
        Ok(match id.split_once('/') {
            Some((d, s)) => self.root.join(d).join("sandbox").join(s),
            None => self.root.join(id).join("sandbox"),
        })
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
        if v.conflicted() {
            return Err(AppError::Conflict(
                "A playlist's INDEX.md has merge conflict markers. Resolve them, then try again.".into(),
            ));
        }
        self.write(&v.root.join("INDEX.md"), &v.index.serialize())?;
        for (id, pl) in &v.playlists {
            let path = v.root.join(id).join("INDEX.md");
            let text = pl.serialize();
            if std::fs::read_to_string(&path).ok().as_deref() != Some(text.as_str()) {
                self.write(&path, &text)?;
            }
        }
        Ok(())
    }

    pub fn open(&self, app: &AppHandle, root: PathBuf, create: bool, lfs: bool) -> Result<VaultSnapshot> {
        let root = crate::platform::canonicalize(&root).map_err(|_| AppError::NotFound(format!("{} doesn't exist", root.display())))?;
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

        let (index, playlists) = read_index(&root)?;
        let watcher = start_watcher(app.clone(), root.clone(), self.written.clone()).ok();
        let snapshot = {
            let v = Vault { root: root.clone(), index, playlists, _watcher: watcher };
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
            // Vault-relative, with `/` separators on every platform.
            let rel_s = crate::platform::slash_path(rel);
            if rel_s.starts_with(".git/") || rel_s.starts_with(".grimoire/local") || rel_s.ends_with(".grimoire-tmp") {
                continue;
            }
            // Ignore our own writes.
            if let Ok(bytes) = std::fs::read(&ev.path) {
                if written.lock().unwrap().get(&ev.path) == Some(&hash(&bytes)) {
                    continue;
                }
            }
            let depth = rel_s.matches('/').count();
            if rel_s == "INDEX.md" || (depth == 1 && rel_s.ends_with("/INDEX.md")) {
                index_changed = true;
            } else if rel_s == ".grimoire/config.json" {
                config_changed = true;
            } else if let Some(id) = rel_s.strip_suffix("/NOTES.md") {
                notes.insert(id.to_string());
            } else if let Some(id) = rel_s.strip_suffix(".md").filter(|_| depth == 1) {
                // A playlist video's notes file.
                notes.insert(id.to_string());
            }
        }
        if index_changed {
            let cell = app.state::<VaultCell>();
            let snap = cell.with(|v| {
                (v.index, v.playlists) = read_index(&v.root)?;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn playlists_live_in_their_own_folder() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        std::fs::write(
            root.join("INDEX.md"),
            "# Grimoire\n\n- [ ] [Distributed Systems](https://www.youtube.com/playlist?list=PLx) #ds · [playlist](distributed-systems/INDEX.md)\n",
        )
        .unwrap();
        std::fs::create_dir(root.join("distributed-systems")).unwrap();
        std::fs::write(
            root.join("distributed-systems/INDEX.md"),
            "# Distributed Systems\n\n<https://www.youtube.com/playlist?list=PLx>\n\n- [ ] [Lecture 1](https://www.youtube.com/watch?v=a) · [notes](01-lecture-1.md)\n- [ ] [Lecture 2](https://www.youtube.com/watch?v=b) · [notes](02-lecture-2.md)\n",
        )
        .unwrap();

        let (index, playlists) = read_index(root).unwrap();
        let mut v = Vault { root: root.to_path_buf(), index, playlists, _watcher: None };
        let snap = v.snapshot();
        assert_eq!(snap.items.iter().map(|i| i.id.as_str()).collect::<Vec<_>>(), ["distributed-systems/01-lecture-1", "distributed-systems/02-lecture-2"]);
        assert_eq!(snap.items[0].playlist.as_deref(), Some("distributed-systems"));
        assert_eq!((snap.playlists[0].count, snap.playlists[0].done_count), (2, 0));
        assert_eq!(v.notes_path("distributed-systems/01-lecture-1").unwrap(), root.join("distributed-systems/01-lecture-1.md"));
        assert_eq!(v.sandbox_dir("distributed-systems/01-lecture-1").unwrap(), root.join("distributed-systems/sandbox/01-lecture-1"));

        let cell = VaultCell::default();
        v.update("distributed-systems/01-lecture-1", |i| i.done = true).unwrap();
        assert!(!v.index.get("distributed-systems").unwrap().done);
        v.update("distributed-systems/02-lecture-2", |i| i.done = true).unwrap();
        assert!(v.index.get("distributed-systems").unwrap().done, "a playlist is done once every video is");
        cell.save_index(&v).unwrap();

        let rootmd = std::fs::read_to_string(root.join("INDEX.md")).unwrap();
        assert!(rootmd.contains("- [x] [Distributed Systems](https://www.youtube.com/playlist?list=PLx) #ds · [playlist](distributed-systems/INDEX.md)"));
        let inner = std::fs::read_to_string(root.join("distributed-systems/INDEX.md")).unwrap();
        assert!(inner.starts_with("# Distributed Systems\n\n<https://www.youtube.com/playlist?list=PLx>\n\n"));
        assert!(inner.contains("- [x] [Lecture 2](https://www.youtube.com/watch?v=b) · [notes](02-lecture-2.md)"));

        assert!(v.remove("distributed-systems"));
        assert!(v.snapshot().items.is_empty());
    }
}
