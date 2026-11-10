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

/// The `list=` id of a YouTube playlist link.
pub fn youtube_playlist_id(source: &str) -> Option<String> {
    let u = url::Url::parse(source).ok()?;
    let host = u.host_str()?.trim_start_matches("www.").trim_start_matches("m.");
    if !matches!(host, "youtube.com" | "music.youtube.com" | "youtu.be") {
        return None;
    }
    u.query_pairs()
        .find(|(k, _)| k == "list")
        .map(|(_, v)| v.into_owned())
        .filter(|v| !v.is_empty() && v.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'))
}

#[derive(Debug, Clone)]
pub struct PlaylistVideo {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone)]
pub struct PlaylistData {
    pub title: Option<String>,
    pub videos: Vec<PlaylistVideo>,
}

/// The first JSON value after `marker` in a page.
fn json_after(html: &str, marker: &str) -> Option<serde_json::Value> {
    let at = html.find(marker)? + marker.len();
    let start = at + html[at..].find('{')?;
    serde_json::Deserializer::from_str(&html[start..]).into_iter::<serde_json::Value>().next()?.ok()
}

fn text_of(v: &serde_json::Value) -> Option<String> {
    if let Some(t) = v.get("simpleText").and_then(|t| t.as_str()) {
        return Some(t.to_string());
    }
    let runs = v.get("runs")?.as_array()?;
    Some(runs.iter().filter_map(|r| r.get("text")?.as_str()).collect::<String>())
}

fn find_key<'a>(v: &'a serde_json::Value, key: &str) -> Option<&'a serde_json::Value> {
    match v {
        serde_json::Value::Object(m) => m.get(key).or_else(|| m.values().find_map(|x| find_key(x, key))),
        serde_json::Value::Array(a) => a.iter().find_map(|x| find_key(x, key)),
        _ => None,
    }
}

/// The first `continuationCommand.token` under `v`, however deeply nested.
fn continuation_token(v: &serde_json::Value) -> Option<String> {
    match v {
        serde_json::Value::Object(m) => {
            if let Some(t) = m.get("continuationCommand").and_then(|c| c.get("token")).and_then(|t| t.as_str()) {
                return Some(t.to_string());
            }
            m.values().find_map(continuation_token)
        }
        serde_json::Value::Array(a) => a.iter().find_map(continuation_token),
        _ => None,
    }
}

/// One playlist entry, in either of the shapes YouTube has served.
fn video_entry(m: &serde_json::Map<String, serde_json::Value>) -> Option<PlaylistVideo> {
    let (id, title) = if let Some(r) = m.get("playlistVideoRenderer") {
        (r.get("videoId")?.as_str()?.to_string(), text_of(r.get("title")?)?)
    } else {
        let r = m.get("lockupViewModel")?;
        if r.get("contentType")?.as_str()? != "LOCKUP_CONTENT_TYPE_VIDEO" {
            return None;
        }
        let title = r.pointer("/metadata/lockupMetadataViewModel/title/content")?.as_str()?;
        (r.get("contentId")?.as_str()?.to_string(), title.to_string())
    };
    let title = title.trim().to_string();
    let hidden = title.is_empty() || title == "[Private video]" || title == "[Deleted video]";
    (!hidden).then_some(PlaylistVideo { id, title })
}

/// Walks YouTube's page data for playlist entries. The next page's token is
/// the `continuationItemRenderer` that sits in the same list as the videos.
fn collect_videos(v: &serde_json::Value, videos: &mut Vec<PlaylistVideo>, next: &mut Option<String>) {
    match v {
        serde_json::Value::Array(a) => {
            let mut direct = false;
            let mut cont = None;
            for x in a {
                if let Some(m) = x.as_object() {
                    if m.contains_key("playlistVideoRenderer") || m.contains_key("lockupViewModel") {
                        direct = true;
                        videos.extend(video_entry(m));
                        continue;
                    }
                    if let Some(r) = m.get("continuationItemRenderer").or_else(|| m.get("continuationItemViewModel")) {
                        cont = continuation_token(r);
                        continue;
                    }
                }
                collect_videos(x, videos, next);
            }
            if direct && cont.is_some() {
                *next = cont;
            }
        }
        serde_json::Value::Object(m) => {
            for x in m.values() {
                collect_videos(x, videos, next);
            }
        }
        _ => {}
    }
}

fn str_after(html: &str, key: &str) -> Option<String> {
    let re = regex::Regex::new(&format!(r#""{key}"\s*:\s*"([^"]+)""#)).ok()?;
    Some(re.captures(html)?.get(1)?.as_str().to_string())
}

/// Reads a public YouTube playlist's title and videos from its web page,
/// following continuations past the first hundred.
pub async fn fetch_playlist(list: &str) -> Result<PlaylistData> {
    let c = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15")
        .timeout(Duration::from_secs(20))
        .build()?;
    let page = format!("https://www.youtube.com/playlist?list={list}&hl=en");
    let html = c
        .get(&page)
        .header(reqwest::header::ACCEPT_LANGUAGE, "en-US,en;q=0.9")
        .header(reqwest::header::COOKIE, "CONSENT=YES+1; SOCS=CAI")
        .send()
        .await?
        .error_for_status()?
        .text()
        .await?;
    let data = json_after(&html, "ytInitialData")
        .ok_or_else(|| AppError::Parse("YouTube didn't return the playlist. Is it public?".into()))?;
    let title = data
        .pointer("/metadata/playlistMetadataRenderer/title")
        .and_then(|t| t.as_str())
        .map(str::to_string)
        .or_else(|| data.pointer("/header/playlistHeaderRenderer/title").and_then(text_of))
        .or_else(|| find_key(&data, "pageHeaderRenderer").and_then(|h| h.get("pageTitle")?.as_str().map(str::to_string)));

    let mut videos = Vec::new();
    let mut next = None;
    if let Some(contents) = data.get("contents") {
        collect_videos(contents, &mut videos, &mut next);
    }

    let key = str_after(&html, "INNERTUBE_API_KEY");
    let version = str_after(&html, "INNERTUBE_CLIENT_VERSION").unwrap_or_else(|| "2.20240101.00.00".into());
    let mut pages = 0;
    while let (Some(token), Some(key)) = (next.take(), key.as_deref()) {
        pages += 1;
        if pages > 50 {
            break;
        }
        let body = serde_json::json!({
            "context": { "client": { "clientName": "WEB", "clientVersion": version, "hl": "en" } },
            "continuation": token,
        });
        let resp = c
            .post(format!("https://www.youtube.com/youtubei/v1/browse?key={key}&prettyPrint=false"))
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .body(body.to_string())
            .send()
            .await?
            .error_for_status()?
            .text()
            .await?;
        let Ok(more) = serde_json::from_str::<serde_json::Value>(&resp) else { break };
        let before = videos.len();
        if let Some(actions) = more.get("onResponseReceivedActions") {
            collect_videos(actions, &mut videos, &mut next);
        }
        if videos.len() == before {
            break;
        }
    }
    Ok(PlaylistData { title: title.map(|t| t.trim().to_string()).filter(|t| !t.is_empty()), videos })
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
/// [`EMBED_BASE_URL`] without the trailing slash, as the player's `origin`.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
const EMBED_ORIGIN: &str = "https://app.grimoire.desktop";

/// A page that fills the webview with the player, so the player is loaded as
/// an iframe and receives the wrapper's origin as its Referer.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn embed_page(player_url: &str) -> String {
    let src = with_js_api(player_url);
    let src = src
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;");
    format!(
        r#"<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{{margin:0;height:100%;background:#000;overflow:hidden}}iframe{{display:block;width:100%;height:100%;border:0}}</style></head><body><iframe id="p" src="{src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><script>{TRACKER}</script></body></html>"#
    )
}

/// Asks the player for its state over the iframe API's postMessage channel
/// and keeps the latest in `window.__grimoireVideo`, which the app reads back
/// with `webview_video_time`.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
const TRACKER: &str = r#"(function(){var f=document.getElementById("p"),v={t:null,d:null,s:null};window.__grimoireVideo=v;function hi(){try{f.contentWindow.postMessage(JSON.stringify({event:"listening",id:1,channel:"widget"}),"*")}catch(e){}}f.addEventListener("load",function(){hi();var n=0,i=setInterval(function(){if(v.t!==null||++n>20)clearInterval(i);else hi()},500)});addEventListener("message",function(e){if(!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname))return;var m;try{m=typeof e.data==="string"?JSON.parse(e.data):e.data}catch(x){return}var info=m&&m.info;if(!info)return;if(typeof info.currentTime==="number")v.t=info.currentTime;if(typeof info.duration==="number"&&info.duration>0)v.d=info.duration;if(typeof info.playerState==="number")v.s=info.playerState})})();"#;

/// Adds the iframe API parameters so the player reports its time to the
/// wrapper page.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn with_js_api(player_url: &str) -> String {
    let sep = if player_url.contains('?') { '&' } else { '?' };
    let origin = EMBED_ORIGIN;
    format!("{player_url}{sep}enablejsapi=1&origin={origin}")
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

fn target(source: &str, start: Option<u32>) -> Target {
    match youtube_id(source) {
        #[cfg(target_os = "macos")]
        Some(_) => Target::Embed(with_start(&render_url(source), start)),
        // Without a way to set the Referer, the watch page is the one that plays.
        #[cfg(not(target_os = "macos"))]
        Some(id) => Target::Url(match start {
            Some(t) => format!("https://www.youtube.com/watch?v={id}&t={t}s"),
            None => format!("https://www.youtube.com/watch?v={id}"),
        }),
        None => Target::Url(render_url(source)),
    }
}

/// The embed URL starting `start` seconds in, replacing any `start=` it had.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn with_start(embed: &str, start: Option<u32>) -> String {
    let Some(t) = start.filter(|t| *t > 0) else { return embed.to_string() };
    let Ok(mut u) = url::Url::parse(embed) else { return embed.to_string() };
    let rest: Vec<(String, String)> =
        u.query_pairs().filter(|(k, _)| k != "start").map(|(k, v)| (k.into_owned(), v.into_owned())).collect();
    u.query_pairs_mut().clear().extend_pairs(rest).append_pair("start", &t.to_string());
    u.to_string()
}

/// Shows `source` in the content webview, creating it on first use. One
/// webview is reused across items so its cookie store persists.
pub fn webview_show(app: &AppHandle, source: &str, start: Option<u32>, b: Bounds) -> Result<()> {
    let target = target(source, start);
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

/// Where the embedded video player is, as `{ t, d, s }` (seconds, duration,
/// player state), or `None` when no video is showing or it hasn't reported.
pub async fn webview_video_time(app: &AppHandle) -> Option<serde_json::Value> {
    let wv = app.get_webview(CONTENT_LABEL)?;
    let (tx, rx) = tokio::sync::oneshot::channel::<String>();
    let tx = std::sync::Mutex::new(Some(tx));
    wv.eval_with_callback("JSON.stringify(window.__grimoireVideo || null)", move |out| {
        if let Some(tx) = tx.lock().ok().and_then(|mut t| t.take()) {
            let _ = tx.send(out);
        }
    })
    .ok()?;
    let out = tokio::time::timeout(Duration::from_millis(1500), rx).await.ok()?.ok()?;
    // The result is JSON-encoded once by the webview and once by our stringify.
    let inner: serde_json::Value = serde_json::from_str(&out).ok()?;
    let v: serde_json::Value = match inner {
        serde_json::Value::String(s) => serde_json::from_str(&s).ok()?,
        other => other,
    };
    v.get("t")?.as_f64()?;
    Some(v)
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
    fn playlist_ids() {
        assert_eq!(youtube_playlist_id("https://www.youtube.com/playlist?list=PLabc_-1").as_deref(), Some("PLabc_-1"));
        assert_eq!(youtube_playlist_id("https://www.youtube.com/watch?v=x&list=PLq").as_deref(), Some("PLq"));
        assert_eq!(youtube_playlist_id("https://www.youtube.com/watch?v=x"), None);
        assert_eq!(youtube_playlist_id("https://example.com/?list=PLq"), None);
    }

    #[test]
    fn collects_playlist_entries() {
        let html = r#"<script>var ytInitialData = {"metadata":{"playlistMetadataRenderer":{"title":"Distributed Systems"}},"contents":[{"section":[{"playlistVideoRenderer":{"videoId":"a1","title":{"runs":[{"text":"Lecture 1: "},{"text":"Introduction"}]}}},{"playlistVideoRenderer":{"videoId":"zz","title":{"simpleText":"[Private video]"}}},{"playlistVideoRenderer":{"videoId":"b2","title":{"simpleText":"Lecture 2"}}},{"lockupViewModel":{"contentId":"c3","contentType":"LOCKUP_CONTENT_TYPE_VIDEO","metadata":{"lockupMetadataViewModel":{"title":{"content":"Lecture 3"}}}}},{"continuationItemViewModel":{"continuationCommand":{"innertubeCommand":{"continuationCommand":{"token":"TOK"}}}}}]},{"continuationItemRenderer":{"continuationEndpoint":{"continuationCommand":{"token":"SHELF"}}}}],"panels":[{"continuationItemRenderer":{"continuationEndpoint":{"continuationCommand":{"token":"COMMENTS"}}}}]};</script>"#;
        let data = json_after(html, "ytInitialData").unwrap();
        let mut videos = Vec::new();
        let mut next = None;
        collect_videos(&data, &mut videos, &mut next);
        assert_eq!(videos.iter().map(|v| v.title.as_str()).collect::<Vec<_>>(), ["Lecture 1: Introduction", "Lecture 2", "Lecture 3"]);
        assert_eq!(next.as_deref(), Some("TOK"));
    }

    /// Hits the network: `cargo test -- --ignored fetches_a_real_playlist`.
    #[tokio::test]
    #[ignore]
    async fn fetches_a_real_playlist() {
        let data = fetch_playlist(&std::env::var("PL").unwrap_or("PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB".into())).await.unwrap();
        eprintln!("{:?} {}", data.title, data.videos.len());
        assert!(data.videos.len() > 5);
    }

    #[test]
    fn embed_page_escapes_the_player_url() {
        let page = embed_page("https://www.youtube-nocookie.com/embed/abc?start=1&x=\"<");
        assert!(page.contains(
            r#"src="https://www.youtube-nocookie.com/embed/abc?start=1&amp;x=&quot;&lt;&amp;enablejsapi=1&amp;origin=https://app.grimoire.desktop""#
        ));
    }

    #[test]
    fn with_start_replaces_the_start_offset() {
        assert_eq!(
            with_start("https://www.youtube-nocookie.com/embed/abc?start=42", Some(90)),
            "https://www.youtube-nocookie.com/embed/abc?start=90"
        );
        assert_eq!(with_start("https://www.youtube-nocookie.com/embed/abc", Some(5)), "https://www.youtube-nocookie.com/embed/abc?start=5");
        assert_eq!(with_start("https://www.youtube-nocookie.com/embed/abc", Some(0)), "https://www.youtube-nocookie.com/embed/abc");
    }
}
