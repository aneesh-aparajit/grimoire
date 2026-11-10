mod config;
mod content;
mod error;
mod fsx;
mod index;
mod platform;
mod recent;
mod sandbox;
mod vault;

use content::{Bounds, ContentKind};
use error::{AppError, Result};
use fsx::{check_file_name, check_id};
use index::{origin_of, serialize_item, slug, unique_slug, Index, Item, LinkStyle};
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, State, WebviewBuilder, WebviewUrl};
use vault::{notes_header, IndexSnapshot, PlaylistInfo, VaultCell, VaultSnapshot};

/* ---------- vault ---------- */

#[tauri::command]
fn vault_recent(app: AppHandle) -> Vec<String> {
    recent::list(&app)
}

#[tauri::command]
fn vault_open(app: AppHandle, cell: State<VaultCell>, path: String) -> Result<VaultSnapshot> {
    cell.open(&app, PathBuf::from(path), false, false)
}

#[tauri::command]
fn vault_create(app: AppHandle, cell: State<VaultCell>, path: String, lfs: bool) -> Result<VaultSnapshot> {
    let p = PathBuf::from(&path);
    std::fs::create_dir_all(&p)?;
    cell.open(&app, p, true, lfs)
}

#[tauri::command]
fn vault_close(app: AppHandle, cell: State<VaultCell>) -> Result<()> {
    *cell.vault.lock().unwrap() = None;
    content::webview_hide(&app)
}

/* ---------- index ---------- */

/// The watcher ignores Grimoire's own writes, so commands that change
/// INDEX.md tell the UI themselves.
fn emit_index(app: &AppHandle, cell: &VaultCell) {
    if let Ok(snap) = cell.with(|v| Ok(v.snapshot())) {
        let _ = app.emit_to("main", "index://changed", snap);
    }
}

#[tauri::command]
fn index_get(cell: State<VaultCell>) -> Result<IndexSnapshot> {
    cell.with(|v| Ok(v.snapshot()))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddInput {
    url: Option<String>,
    file_path: Option<String>,
    title: Option<String>,
    tags: Vec<String>,
}

fn clean_tags(tags: Vec<String>) -> Result<Vec<String>> {
    let mut out: Vec<String> = Vec::new();
    for t in tags {
        let t = t.trim().trim_start_matches('#').to_lowercase();
        if t.is_empty() {
            continue;
        }
        let ok = t.chars().next().is_some_and(|c| c.is_ascii_alphanumeric())
            && t.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '/'));
        if !ok {
            return Err(AppError::Parse(format!("#{t} isn't a valid tag: use a–z, 0–9, - _ /")));
        }
        if !out.contains(&t) {
            out.push(t);
        }
    }
    Ok(out)
}

#[tauri::command]
async fn item_add(app: AppHandle, cell: State<'_, VaultCell>, input: AddInput) -> Result<Item> {
    let tags = clean_tags(input.tags)?;
    let root = cell.root()?;
    let given = input.title.map(|t| t.trim().to_string()).filter(|t| !t.is_empty());

    let (source, title, pdf_from) = if let Some(url) = input.url {
        let url = url.trim().to_string();
        let parsed = url::Url::parse(&url).map_err(|_| AppError::Parse(format!("{url} isn't a URL")))?;
        if !matches!(parsed.scheme(), "http" | "https") {
            return Err(AppError::Parse("Only http and https links can be added".into()));
        }
        let title = match given {
            Some(t) => t,
            None => content::fetch_title(&url).await,
        };
        (url, title, None)
    } else if let Some(fp) = input.file_path {
        let p = PathBuf::from(&fp);
        if !content::is_pdf_file(&p) {
            return Err(AppError::NotAPdf(format!("{} isn't a PDF", p.display())));
        }
        let title = given
            .or_else(|| content::pdf_title(&p))
            .unwrap_or_else(|| p.file_stem().and_then(|s| s.to_str()).unwrap_or("Document").to_string());
        (String::new(), title, Some(p))
    } else {
        return Err(AppError::Parse("Give a URL or a PDF".into()));
    };

    let title: String = title.chars().take(200).collect();
    let out = cell.with(|v| {
        if v.conflicted() {
            return Err(AppError::Conflict("INDEX.md has merge conflict markers. Resolve them first.".into()));
        }
        let mut taken = v.index.ids();
        taken.extend(std::fs::read_dir(&v.root)?.filter_map(|e| e.ok()?.file_name().into_string().ok()));
        let id = unique_slug(&title, &taken);
        let dir = v.root.join(&id);
        std::fs::create_dir_all(&dir)?;
        let source = match &pdf_from {
            Some(p) => {
                let name = content::sanitize_file_name(p.file_name().and_then(|n| n.to_str()).unwrap_or("document.pdf"));
                std::fs::copy(p, dir.join(&name))?;
                format!("{id}/{name}")
            }
            None => source.clone(),
        };
        let item = Item {
            kind: content::classify(&source),
            origin: origin_of(&source),
            id: id.clone(),
            title: title.clone(),
            source,
            tags: tags.clone(),
            done: false,
            linked: true,
            playlist: None,
            style: LinkStyle::Folder,
        };
        cell.write(&dir.join("NOTES.md"), &notes_header(&item))?;
        v.index.append(item.clone());
        cell.save_index(v)?;
        let _ = &root;
        Ok(item)
    });
    if out.is_ok() {
        emit_index(&app, &cell);
    }
    out
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PlaylistInput {
    url: String,
    title: Option<String>,
    tags: Vec<String>,
}

/// Adds a YouTube playlist: one folder for the playlist with its own
/// INDEX.md, and a numbered notes file per video (`01-<title>.md`).
#[tauri::command]
async fn playlist_add(app: AppHandle, cell: State<'_, VaultCell>, input: PlaylistInput) -> Result<PlaylistInfo> {
    let tags = clean_tags(input.tags)?;
    let list = content::youtube_playlist_id(input.url.trim())
        .ok_or_else(|| AppError::Parse("That link isn't a YouTube playlist".into()))?;
    let data = content::fetch_playlist(&list).await?;
    if data.videos.is_empty() {
        return Err(AppError::Parse("Found no videos in that playlist. Is it public?".into()));
    }
    let given = input.title.map(|t| t.trim().to_string()).filter(|t| !t.is_empty());
    let title: String = given.or(data.title).unwrap_or_else(|| "YouTube playlist".into()).chars().take(200).collect();
    let source = format!("https://www.youtube.com/playlist?list={list}");

    let out = cell.with(|v| {
        if v.conflicted() {
            return Err(AppError::Conflict("INDEX.md has merge conflict markers. Resolve them first.".into()));
        }
        let mut taken = v.index.ids();
        taken.extend(std::fs::read_dir(&v.root)?.filter_map(|e| e.ok()?.file_name().into_string().ok()));
        let id = unique_slug(&title, &taken);
        let dir = v.root.join(&id);
        std::fs::create_dir_all(&dir)?;

        let width = data.videos.len().to_string().len().max(2);
        let mut text = format!("# {title}\n\n<{source}>\n\n");
        for (n, vid) in data.videos.iter().enumerate() {
            let stem = format!("{:0width$}-{}", n + 1, slug(&vid.title));
            let video_source = format!("https://www.youtube.com/watch?v={}", vid.id);
            let item = Item {
                kind: content::classify(&video_source),
                origin: origin_of(&video_source),
                id: stem.clone(),
                title: vid.title.chars().take(200).collect(),
                source: video_source,
                tags: Vec::new(),
                done: false,
                linked: true,
                playlist: None,
                style: LinkStyle::File,
            };
            let notes = dir.join(format!("{stem}.md"));
            if !notes.exists() {
                cell.write(&notes, &notes_header(&item))?;
            }
            text.push_str(&serialize_item(&item, &[]));
            text.push('\n');
        }
        v.playlists.insert(id.clone(), Index::parse_playlist(&text, &Default::default()));
        v.index.append(Item {
            kind: content::classify(&source),
            origin: origin_of(&source),
            id: id.clone(),
            title: title.clone(),
            source: source.clone(),
            tags: tags.clone(),
            done: false,
            linked: true,
            playlist: None,
            style: LinkStyle::Playlist,
        });
        cell.save_index(v)?;
        v.snapshot()
            .playlists
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::NotFound(format!("No playlist {id}")))
    });
    if out.is_ok() {
        emit_index(&app, &cell);
    }
    out
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Patch {
    title: Option<String>,
    source: Option<String>,
    tags: Option<Vec<String>>,
    done: Option<bool>,
}

#[tauri::command]
fn item_update(app: AppHandle, cell: State<VaultCell>, id: String, patch: Patch) -> Result<Item> {
    let tags = patch.tags.map(clean_tags).transpose()?;
    let out = cell.with(|v| {
        if v.conflicted() {
            return Err(AppError::Conflict("INDEX.md has merge conflict markers. Resolve them first.".into()));
        }
        let out = v.update(&id, |item| {
            if let Some(t) = patch.title.map(|t| t.trim().to_string()).filter(|t| !t.is_empty()) {
                item.title = t.chars().take(200).collect();
            }
            if let Some(s) = patch.source.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
                item.kind = content::classify(&s);
                item.origin = origin_of(&s);
                item.source = s;
            }
            if let Some(t) = tags {
                item.tags = t;
            }
            if let Some(d) = patch.done {
                item.done = d;
            }
        })?;
        cell.save_index(v)?;
        Ok(out)
    });
    if out.is_ok() {
        emit_index(&app, &cell);
    }
    out
}

#[tauri::command]
fn item_delete(app: AppHandle, cell: State<VaultCell>, id: String, delete_folder: bool) -> Result<()> {
    check_id(&id)?;
    let out = cell.with(|v| {
        if v.conflicted() {
            return Err(AppError::Conflict("INDEX.md has merge conflict markers. Resolve them first.".into()));
        }
        let notes = v.notes_path(&id)?;
        let sandbox = v.sandbox_dir(&id)?;
        let folder = if id.contains('/') { None } else { Some(v.item_dir(&id)?) };
        if !v.remove(&id) {
            return Err(AppError::NotFound(format!("No item {id}")));
        }
        cell.save_index(v)?;
        if delete_folder {
            match folder {
                Some(dir) if dir.is_dir() => std::fs::remove_dir_all(dir)?,
                Some(_) => {}
                None => {
                    if notes.is_file() {
                        std::fs::remove_file(notes)?;
                    }
                    if sandbox.is_dir() {
                        std::fs::remove_dir_all(sandbox)?;
                    }
                }
            }
        }
        Ok(())
    });
    if out.is_ok() {
        emit_index(&app, &cell);
    }
    out
}

/// Called when an item is opened: makes sure its folder, NOTES.md and the
/// notes link in INDEX.md exist (hand-added lines get them lazily).
#[tauri::command]
fn item_ensure(app: AppHandle, cell: State<VaultCell>, id: String) -> Result<Item> {
    let out = cell.with(|v| {
        let notes = v.notes_path(&id)?;
        let item = v.get(&id).ok_or_else(|| AppError::NotFound(format!("No item {id}")))?;
        if !notes.exists() {
            cell.write(&notes, &notes_header(&item))?;
        }
        if !item.linked && !v.conflicted() {
            v.update(&id, |i| i.linked = true)?;
            cell.save_index(v)?;
        }
        v.get(&id).ok_or_else(|| AppError::NotFound(format!("No item {id}")))
    });
    if out.is_ok() {
        emit_index(&app, &cell);
    }
    out
}

/* ---------- notes ---------- */

#[tauri::command]
fn notes_read(cell: State<VaultCell>, id: String) -> Result<String> {
    let path = cell.with(|v| v.notes_path(&id))?;
    Ok(std::fs::read_to_string(path).unwrap_or_default())
}

#[tauri::command]
fn notes_write(cell: State<VaultCell>, id: String, content: String) -> Result<()> {
    let path = cell.with(|v| v.notes_path(&id))?;
    cell.write(&path, &content)
}

/// What the reading list's peek shows: entry headings, saved snippets, size.
#[tauri::command]
fn notes_summary(cell: State<VaultCell>, id: String) -> Result<Value> {
    let (path, sandbox) = cell.with(|v| Ok((v.notes_path(&id)?, v.sandbox_dir(&id)?)))?;
    let text = std::fs::read_to_string(&path).unwrap_or_default();
    let mut in_fence = false;
    let mut entries = Vec::new();
    let mut words = 0;
    for line in text.lines() {
        if line.trim_start().starts_with("```") || line.trim_start().starts_with("~~~") {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }
        if let Some(h) = line.strip_prefix("## ") {
            entries.push(h.trim().to_string());
        }
        words += line.split_whitespace().count();
    }
    let snippets = sandbox_list_dir(&sandbox);
    let modified = std::fs::metadata(&path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64);
    Ok(json!({ "entries": entries, "words": words, "snippets": snippets, "modified": modified }))
}

/* ---------- config + state ---------- */

#[tauri::command]
fn config_get(cell: State<VaultCell>) -> Result<config::EffectiveConfig> {
    Ok(config::load(&cell.root()?))
}

#[tauri::command]
fn config_set(cell: State<VaultCell>, scope: String, path: String, value: Value) -> Result<config::EffectiveConfig> {
    let root = cell.root()?;
    config::set(&root, &scope, &path, value)?;
    // Remember the hash so the watcher doesn't echo our own write.
    if scope == "vault" {
        let p = root.join(".grimoire/config.json");
        if let Ok(t) = std::fs::read_to_string(&p) {
            cell.write(&p, &t)?;
        }
    }
    Ok(config::load(&root))
}

#[tauri::command]
fn state_patch(cell: State<VaultCell>, patch: Value) -> Result<()> {
    config::state_patch(&cell.root()?, patch)
}

/// Per-machine run history for an item (`.grimoire/local/runs/<id>.json`).
#[tauri::command]
fn runs_get(cell: State<VaultCell>, id: String) -> Result<Value> {
    check_id(&id)?;
    let p = cell.root()?.join(".grimoire/local/runs").join(format!("{id}.json"));
    Ok(std::fs::read_to_string(p).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or(json!([])))
}

#[tauri::command]
fn runs_append(cell: State<VaultCell>, id: String, run: Value) -> Result<()> {
    check_id(&id)?;
    let p = cell.root()?.join(".grimoire/local/runs").join(format!("{id}.json"));
    let mut runs: Vec<Value> = std::fs::read_to_string(&p).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default();
    runs.push(run);
    let keep = runs.len().saturating_sub(30);
    runs.drain(..keep);
    fsx::write_text_atomic(&p, &serde_json::to_string(&runs)?)
}

/* ---------- sandbox ---------- */

#[tauri::command]
async fn toolchains_list(cell: State<'_, VaultCell>) -> Result<Vec<sandbox::Toolchain>> {
    let overrides = cell.root().map(|r| config::load(&r).toolchains).unwrap_or_default();
    Ok(sandbox::detect(&overrides).await)
}

#[tauri::command]
async fn sandbox_run(
    app: AppHandle,
    cell: State<'_, VaultCell>,
    runner: State<'_, Arc<sandbox::Runner>>,
    language: String,
    code: String,
    stdin: Option<String>,
) -> Result<u64> {
    let eff = config::load(&cell.root()?);
    runner
        .inner()
        .clone()
        .start(app, language, code, stdin, eff.toolchains, eff.config.sandbox.timeout_ms, eff.config.sandbox.max_output_bytes)
        .await
}

#[tauri::command]
async fn sandbox_stop(runner: State<'_, Arc<sandbox::Runner>>, run_id: u64) -> Result<()> {
    runner.stop(run_id).await;
    Ok(())
}

fn sandbox_list_dir(sandbox: &std::path::Path) -> Vec<String> {
    let mut v: Vec<String> = std::fs::read_dir(sandbox)
        .map(|rd| rd.filter_map(|e| e.ok()).filter(|e| e.path().is_file()).filter_map(|e| e.file_name().into_string().ok()).collect())
        .unwrap_or_default();
    v.sort();
    v
}

#[tauri::command]
fn sandbox_save(cell: State<VaultCell>, id: String, language: String, code: String, file_name: Option<String>) -> Result<String> {
    let spec = sandbox::spec(&language)?;
    let name = file_name.unwrap_or_else(|| spec.file_name.to_string());
    check_file_name(&name)?;
    let (root, dir) = cell.with(|v| Ok((v.root.clone(), v.sandbox_dir(&id)?)))?;
    let path = dir.join(&name);
    cell.write(&path, &code)?;
    Ok(path.strip_prefix(&root).unwrap_or(&path).display().to_string())
}

#[tauri::command]
fn sandbox_list(cell: State<VaultCell>, id: String) -> Result<Vec<String>> {
    let dir = cell.with(|v| v.sandbox_dir(&id))?;
    Ok(sandbox_list_dir(&dir))
}

#[tauri::command]
fn sandbox_load(cell: State<VaultCell>, id: String, file_name: String) -> Result<String> {
    check_file_name(&file_name)?;
    let dir = cell.with(|v| v.sandbox_dir(&id))?;
    Ok(std::fs::read_to_string(dir.join(file_name))?)
}

/* ---------- content ---------- */

#[tauri::command]
fn content_show(app: AppHandle, source: String, bounds: Bounds) -> Result<()> {
    content::webview_show(&app, &source, bounds)
}

#[tauri::command]
fn content_bounds(app: AppHandle, bounds: Bounds) -> Result<()> {
    content::webview_bounds(&app, bounds)
}

#[tauri::command]
fn content_hide(app: AppHandle) -> Result<()> {
    content::webview_hide(&app)
}

#[tauri::command]
fn content_nav(app: AppHandle, action: String) -> Result<()> {
    let js = match action.as_str() {
        "back" => "history.back()",
        "forward" => "history.forward()",
        "reload" => "location.reload()",
        _ => return Err(AppError::Parse(format!("unknown action {action}"))),
    };
    content::webview_eval(&app, js)
}

#[tauri::command]
async fn title_fetch(url: String) -> String {
    content::fetch_title(&url).await
}

/// Resolves an item's PDF to a file on disk (downloading remote PDFs into the
/// per-machine cache) and returns its absolute path for the asset protocol.
#[tauri::command]
async fn pdf_open(cell: State<'_, VaultCell>, id: String) -> Result<String> {
    let (root, item) = cell.with(|v| {
        let item = v.get(&id).ok_or_else(|| AppError::NotFound(format!("No item {id}")))?;
        Ok((v.root.clone(), item))
    })?;
    if item.kind != ContentKind::Pdf {
        return Err(AppError::NotAPdf(format!("{} isn't a PDF item", item.title)));
    }
    let path = if item.source.starts_with("http") {
        content::ensure_remote_pdf(&root, &item.source).await?
    } else {
        let p = fsx::safe_join(&root, &item.source)?;
        if !p.exists() {
            return Err(AppError::NotFound(format!("{} is missing from the vault", item.source)));
        }
        p
    };
    Ok(path.display().to_string())
}

/// Moves a cached remote PDF into the item folder and points the item at it.
#[tauri::command]
async fn pdf_make_local(app: AppHandle, cell: State<'_, VaultCell>, id: String) -> Result<Item> {
    let (root, item) = cell.with(|v| Ok((v.root.clone(), v.get(&id).ok_or_else(|| AppError::NotFound(id.clone()))?)))?;
    if !item.source.starts_with("http") {
        return Ok(item);
    }
    let cached = content::ensure_remote_pdf(&root, &item.source).await?;
    let name = content::sanitize_file_name(
        url::Url::parse(&item.source).ok().and_then(|u| u.path_segments()?.next_back().map(str::to_string)).as_deref().unwrap_or("document.pdf"),
    );
    let out = cell.with(|v| {
        let dir = v.item_dir(&id)?;
        std::fs::create_dir_all(&dir)?;
        std::fs::copy(&cached, dir.join(&name))?;
        let out = v.update(&id, |it| {
            it.source = format!("{id}/{name}");
            it.origin = origin_of(&it.source);
        })?;
        cell.save_index(v)?;
        Ok(out)
    });
    if out.is_ok() {
        emit_index(&app, &cell);
    }
    out
}

#[tauri::command]
fn pdf_size(path: String) -> Result<u64> {
    Ok(std::fs::metadata(path)?.len())
}

/* ---------- app ---------- */

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(VaultCell::default())
        .manage(Arc::new(sandbox::Runner::default()))
        .setup(|app| {
            // Resolve the login-shell PATH off the main thread.
            std::thread::spawn(|| {
                platform::user_path();
            });
            let window = tauri::window::WindowBuilder::new(app, "main")
                .title("grimoire")
                .inner_size(1360.0, 860.0)
                .min_inner_size(720.0, 480.0)
                .build()?;
            let size = window.inner_size()?.to_logical::<f64>(window.scale_factor()?);
            window.add_child(
                WebviewBuilder::new("main", WebviewUrl::App("index.html".into())).auto_resize(),
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(size.width, size.height),
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            vault_recent,
            vault_open,
            vault_create,
            vault_close,
            index_get,
            item_add,
            playlist_add,
            item_update,
            item_delete,
            item_ensure,
            notes_read,
            notes_write,
            notes_summary,
            config_get,
            config_set,
            state_patch,
            runs_get,
            runs_append,
            toolchains_list,
            sandbox_run,
            sandbox_stop,
            sandbox_save,
            sandbox_list,
            sandbox_load,
            content_show,
            content_bounds,
            content_hide,
            content_nav,
            title_fetch,
            pdf_open,
            pdf_make_local,
            pdf_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running grimoire");
}
