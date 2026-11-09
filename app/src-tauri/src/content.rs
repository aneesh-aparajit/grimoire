//! What an item points at: URL classification, title fetching, PDFs, and the
//! child webview that shows web content.

use crate::error::{AppError, Result};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl};

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ContentKind {
    Article,
    Youtube,
    Vimeo,
    Pdf,
}

pub fn classify(source: &str) -> ContentKind {
    let lower = source.to_lowercase();
    if !lower.starts_with("http") {
        return ContentKind::Pdf;
    }
    if youtube_id(source).is_some() {
        return ContentKind::Youtube;
    }
    if vimeo_id(source).is_some() {
        return ContentKind::Vimeo;
    }
    let path = url::Url::parse(source).map(|u| u.path().to_lowercase()).unwrap_or_default();
    if path.ends_with(".pdf") || (lower.contains("arxiv.org/pdf/")) {
        return ContentKind::Pdf;
    }
    ContentKind::Article
}

pub fn youtube_id(source: &str) -> Option<String> {
    let u = url::Url::parse(source).ok()?;
    let host = u.host_str()?.trim_start_matches("www.").trim_start_matches("m.");
    match host {
        "youtube.com" | "music.youtube.com" => {
            if u.path() == "/watch" {
                u.query_pairs().find(|(k, _)| k == "v").map(|(_, v)| v.into_owned())
            } else {
                u.path().strip_prefix("/shorts/").or_else(|| u.path().strip_prefix("/embed/")).map(str::to_string)
            }
        }
        "youtu.be" => Some(u.path().trim_start_matches('/').to_string()).filter(|s| !s.is_empty()),
        _ => None,
    }
}

fn vimeo_id(source: &str) -> Option<String> {
    let u = url::Url::parse(source).ok()?;
    if u.host_str()?.trim_start_matches("www.") != "vimeo.com" {
        return None;
    }
    let seg = u.path().trim_start_matches('/');
    seg.chars().all(|c| c.is_ascii_digit()).then(|| seg.to_string()).filter(|s| !s.is_empty())
}

/// The URL the content webview should load.
pub fn render_url(source: &str) -> String {
    if let Some(id) = youtube_id(source) {
        let start = url::Url::parse(source)
            .ok()
            .and_then(|u| u.query_pairs().find(|(k, _)| k == "t").map(|(_, v)| v.trim_end_matches('s').to_string()));
        return match start {
            Some(t) => format!("https://www.youtube-nocookie.com/embed/{id}?start={t}"),
            None => format!("https://www.youtube-nocookie.com/embed/{id}"),
        };
    }
    if let Some(id) = vimeo_id(source) {
        return format!("https://player.vimeo.com/video/{id}");
    }
    source.to_string()
}

fn client() -> Result<reqwest::Client> {
    Ok(reqwest::Client::builder()
        .user_agent("grimoire/1.0 (desktop study app)")
        .timeout(Duration::from_secs(3))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()?)
}

fn decode_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&#x27;", "'")
        .replace("&nbsp;", " ")
}

/// Best effort with a 3 s timeout; falls back to host + path.
pub async fn fetch_title(source: &str) -> String {
    let fallback = || {
        url::Url::parse(source)
            .map(|u| format!("{}{}", u.host_str().unwrap_or(""), u.path().trim_end_matches('/')))
            .unwrap_or_else(|_| source.to_string())
    };
    let Ok(c) = client() else { return fallback() };
    let Ok(resp) = c.get(source).send().await else { return fallback() };
    let is_pdf = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.contains("application/pdf"));
    if is_pdf {
        return fallback();
    }
    let Ok(body) = resp.text().await else { return fallback() };
    let head = &body[..body.len().min(200_000)];
    let re_og = regex::Regex::new(r#"(?is)<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)"#).unwrap();
    let re_title = regex::Regex::new(r"(?is)<title[^>]*>(.*?)</title>").unwrap();
    let found = re_og
        .captures(head)
        .or_else(|| re_title.captures(head))
        .and_then(|c| c.get(1))
        .map(|m| decode_entities(m.as_str().split_whitespace().collect::<Vec<_>>().join(" ").trim()));
    found.filter(|t| !t.is_empty()).unwrap_or_else(fallback)
}

/// Is this a PDF by magic bytes?
pub fn is_pdf_file(path: &Path) -> bool {
    use std::io::Read;
    let mut buf = [0u8; 5];
    std::fs::File::open(path).and_then(|mut f| f.read_exact(&mut buf)).is_ok() && &buf == b"%PDF-"
}

/// The `/Title` from a PDF's info dictionary, if it is plainly present.
pub fn pdf_title(path: &Path) -> Option<String> {
    let bytes = std::fs::read(path).ok()?;
    let window = &bytes[..bytes.len().min(4_000_000)];
    let text = String::from_utf8_lossy(window);
    let re = regex::Regex::new(r"/Title\s*\(((?:[^()\\]|\\.){1,300})\)").ok()?;
    let raw = re.captures(&text)?.get(1)?.as_str().replace("\\(", "(").replace("\\)", ")");
    let t = raw.trim();
    (!t.is_empty() && t.chars().all(|c| !c.is_control())).then(|| t.to_string())
}

pub fn sanitize_file_name(name: &str) -> String {
    let stem = Path::new(name).file_stem().and_then(|s| s.to_str()).unwrap_or("document");
    let mut s = crate::index::slug(stem);
    if s == "item" {
        s = "document".into();
    }
    format!("{s}.pdf")
}

pub fn pdf_cache_path(root: &Path, url: &str) -> PathBuf {
    let hash = format!("{:x}", Sha256::digest(url.as_bytes()));
    root.join(".grimoire/local/cache/pdf").join(format!("{hash}.pdf"))
}

/// Downloads a remote PDF into the per-machine cache (once).
pub async fn ensure_remote_pdf(root: &Path, url: &str) -> Result<PathBuf> {
    let path = pdf_cache_path(root, url);
    if path.exists() {
        return Ok(path);
    }
    let c = reqwest::Client::builder()
        .user_agent("grimoire/1.0 (desktop study app)")
        .timeout(Duration::from_secs(120))
        .build()?;
    let resp = c.get(url).send().await?.error_for_status()?;
    let bytes = resp.bytes().await?;
    if !bytes.starts_with(b"%PDF-") {
        return Err(AppError::NotAPdf(format!("{url} didn't return a PDF")));
    }
    crate::fsx::write_bytes_atomic(&path, &bytes)?;
    Ok(path)
}

/* ---------- child webview ---------- */

pub const CONTENT_LABEL: &str = "content";

#[derive(Debug, Clone, Copy, serde::Deserialize)]
pub struct Bounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// The origin the video wrapper page loads under. YouTube's embedded player
/// refuses to play (error 153, "video player configuration error") without a
/// Referer, and a top-level load of the embed URL sends none. Native apps are
/// told to identify themselves with an https URL built from the app id.
#[cfg(target_os = "macos")]
const EMBED_BASE_URL: &str = "https://app.grimoire.desktop/";

/// A page that fills the webview with the player, so the player is loaded as
/// an iframe and receives the wrapper's origin as its Referer.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn embed_page(player_url: &str) -> String {
    let src = player_url
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;");
    format!(
        r#"<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{{margin:0;height:100%;background:#000;overflow:hidden}}iframe{{display:block;width:100%;height:100%;border:0}}</style></head><body><iframe src="{src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>"#
    )
}

#[cfg(target_os = "macos")]
fn load_embed(wv: &tauri::Webview, player_url: &str) -> Result<()> {
    let html = embed_page(player_url);
    wv.with_webview(move |pw| {
        use objc2_foundation::{NSString, NSURL};
        use objc2_web_kit::WKWebView;
        // SAFETY: on macOS the platform webview is a live WKWebView, and
        // `with_webview` runs this closure on the main thread.
        unsafe {
            let view: &WKWebView = &*pw.inner().cast::<WKWebView>();
            let base = NSURL::URLWithString(&NSString::from_str(EMBED_BASE_URL));
            view.loadHTMLString_baseURL(&NSString::from_str(&html), base.as_deref());
        }
    })?;
    Ok(())
}

/// Where the webview should go for `source`.
enum Target {
    Url(String),
    /// A YouTube player URL, shown through the wrapper page.
    #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
    Embed(String),
}

fn target(source: &str) -> Target {
    match youtube_id(source) {
        #[cfg(target_os = "macos")]
        Some(_) => Target::Embed(render_url(source)),
        // Without a way to set the Referer, the watch page is the one that plays.
        #[cfg(not(target_os = "macos"))]
        Some(id) => Target::Url(format!("https://www.youtube.com/watch?v={id}")),
        None => Target::Url(render_url(source)),
    }
}

/// Shows `source` in the content webview, creating it on first use. One
/// webview is reused across items so its cookie store persists.
pub fn webview_show(app: &AppHandle, source: &str, b: Bounds) -> Result<()> {
    let target = target(source);
    let url: url::Url = match &target {
        Target::Url(u) => u.as_str(),
        Target::Embed(_) => "about:blank",
    }
    .parse()
    .map_err(|_| AppError::InvalidPath(format!("{source} is not a URL")))?;
    let wv = if let Some(wv) = app.get_webview(CONTENT_LABEL) {
        if matches!(target, Target::Url(_)) {
            wv.navigate(url)?;
        }
        wv.set_position(LogicalPosition::new(b.x, b.y))?;
        wv.set_size(LogicalSize::new(b.width, b.height))?;
        wv.show()?;
        wv
    } else {
        let window = app
            .get_window("main")
            .ok_or_else(|| AppError::NotFound("main window".into()))?;
        let handle = app.clone();
        let builder = WebviewBuilder::new(CONTENT_LABEL, WebviewUrl::External(url)).on_page_load(move |wv, payload| {
            use tauri::Emitter;
            let state = match payload.event() {
                tauri::webview::PageLoadEvent::Started => "started",
                tauri::webview::PageLoadEvent::Finished => "finished",
            };
            let _ = handle.emit_to(
                "main",
                "content://load",
                serde_json::json!({ "state": state, "url": payload.url().as_str(), "label": wv.label() }),
            );
        });
        window.add_child(
            builder,
            LogicalPosition::new(b.x, b.y),
            LogicalSize::new(b.width, b.height),
        )?
    };
    #[cfg(target_os = "macos")]
    if let Target::Embed(player) = &target {
        load_embed(&wv, player)?;
    }
    #[cfg(not(target_os = "macos"))]
    let _ = wv;
    Ok(())
}

pub fn webview_bounds(app: &AppHandle, b: Bounds) -> Result<()> {
    if let Some(wv) = app.get_webview(CONTENT_LABEL) {
        wv.set_position(LogicalPosition::new(b.x, b.y))?;
        wv.set_size(LogicalSize::new(b.width, b.height))?;
    }
    Ok(())
}

pub fn webview_hide(app: &AppHandle) -> Result<()> {
    if let Some(wv) = app.get_webview(CONTENT_LABEL) {
        wv.hide()?;
    }
    Ok(())
}

pub fn webview_eval(app: &AppHandle, js: &str) -> Result<()> {
    if let Some(wv) = app.get_webview(CONTENT_LABEL) {
        wv.eval(js)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies() {
        assert_eq!(classify("https://www.youtube.com/watch?v=abc"), ContentKind::Youtube);
        assert_eq!(classify("https://youtu.be/abc"), ContentKind::Youtube);
        assert_eq!(classify("https://vimeo.com/123"), ContentKind::Vimeo);
        assert_eq!(classify("https://arxiv.org/pdf/1706.03762"), ContentKind::Pdf);
        assert_eq!(classify("https://x.dev/paper.PDF"), ContentKind::Pdf);
        assert_eq!(classify("book/book.pdf"), ContentKind::Pdf);
        assert_eq!(classify("https://go.dev/ref/mem"), ContentKind::Article);
        assert_eq!(render_url("https://youtu.be/abc?t=42"), "https://www.youtube-nocookie.com/embed/abc?start=42");
    }

    #[test]
    fn embed_page_escapes_the_player_url() {
        let page = embed_page("https://www.youtube-nocookie.com/embed/abc?start=1&x=\"<");
        assert!(page.contains(
            r#"src="https://www.youtube-nocookie.com/embed/abc?start=1&amp;x=&quot;&lt;""#
        ));
    }
}
