//! `.grimoire/config.json` (committed), `.grimoire/local/settings.json` and
//! `.grimoire/local/state.json` (per machine, git-ignored).
//!
//! Files are kept as raw JSON so unknown keys survive a rewrite. Invalid
//! values fall back to defaults with an issue string; the file itself is never
//! rewritten while it is invalid.

use crate::error::{AppError, Result};
use crate::fsx::write_text_atomic;
use serde::Serialize;
use serde_json::{json, Map, Value};
use std::path::Path;

pub const LANGUAGES: &[&str] = &["python", "javascript", "go", "rust", "c", "java"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub theme: String,
    pub editor: EditorConfig,
    pub lint: LintConfig,
    pub layout: LayoutConfig,
    pub sandbox: SandboxConfig,
    pub pdf: PdfConfig,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorConfig {
    pub font_size: u32,
    pub line_wrap: bool,
    pub autosave_ms: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LintConfig {
    pub enabled: bool,
    pub rules: Map<String, Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutConfig {
    pub split_ratio: f64,
    pub sandbox_open: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxConfig {
    pub timeout_ms: u64,
    pub max_output_bytes: u64,
    pub default_language: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfConfig {
    pub default_zoom: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectiveConfig {
    pub config: Config,
    pub toolchains: Map<String, Value>,
    /// `path: message` for every value that was ignored.
    pub issues: Vec<String>,
}

pub fn default_config_json() -> Value {
    json!({
        "$schema": "./config.schema.json",
        "version": 1,
        "theme": "system",
        "editor": { "fontSize": 15, "lineWrap": true, "autosaveMs": 750 },
        "lint": { "enabled": true, "rules": { "MD013": false, "MD033": false } },
        "layout": { "splitRatio": 0.54, "sandboxOpen": false },
        "sandbox": { "timeoutMs": 10000, "maxOutputBytes": 1048576, "defaultLanguage": "python" },
        "pdf": { "defaultZoom": "page-width" }
    })
}

fn merge(base: &mut Value, over: &Value) {
    match (base, over) {
        (Value::Object(b), Value::Object(o)) => {
            for (k, v) in o {
                merge(b.entry(k.clone()).or_insert(Value::Null), v);
            }
        }
        (b, o) => *b = o.clone(),
    }
}

fn at<'a>(v: &'a Value, path: &str) -> Option<&'a Value> {
    path.split('.').try_fold(v, |cur, k| cur.get(k))
}

struct Reader<'a> {
    merged: &'a Value,
    defaults: Value,
    issues: Vec<String>,
}

impl Reader<'_> {
    fn num(&mut self, path: &str, min: f64, max: f64) -> f64 {
        let d = at(&self.defaults, path).and_then(Value::as_f64).unwrap_or(min);
        match at(self.merged, path) {
            None | Some(Value::Null) => d,
            Some(v) => match v.as_f64() {
                Some(n) if (min..=max).contains(&n) => n,
                _ => {
                    self.issues.push(format!("{path}: expected a number from {min} to {max}, got {v}"));
                    d
                }
            },
        }
    }
    fn bool(&mut self, path: &str) -> bool {
        let d = at(&self.defaults, path).and_then(Value::as_bool).unwrap_or(false);
        match at(self.merged, path) {
            None | Some(Value::Null) => d,
            Some(Value::Bool(b)) => *b,
            Some(v) => {
                self.issues.push(format!("{path}: expected true or false, got {v}"));
                d
            }
        }
    }
    fn one_of(&mut self, path: &str, allowed: &[&str]) -> String {
        let d = at(&self.defaults, path).and_then(Value::as_str).unwrap_or("").to_string();
        match at(self.merged, path) {
            None | Some(Value::Null) => d,
            Some(Value::String(s)) if allowed.contains(&s.as_str()) => s.clone(),
            Some(v) => {
                self.issues.push(format!("{path}: expected one of {}, got {v}", allowed.join(", ")));
                d
            }
        }
    }
}

pub fn read_json(path: &Path, issues: &mut Vec<String>, label: &str) -> Value {
    match std::fs::read_to_string(path) {
        Ok(text) => match serde_json::from_str::<Value>(&text) {
            Ok(v @ Value::Object(_)) => v,
            Ok(_) => {
                issues.push(format!("{label}: expected a JSON object"));
                Value::Object(Map::new())
            }
            Err(e) => {
                issues.push(format!("{label}: {e}"));
                Value::Object(Map::new())
            }
        },
        Err(_) => Value::Object(Map::new()),
    }
}

pub fn load(root: &Path) -> EffectiveConfig {
    let mut issues = Vec::new();
    let vault = read_json(&root.join(".grimoire/config.json"), &mut issues, "config.json");
    let local = read_json(&root.join(".grimoire/local/settings.json"), &mut issues, "local/settings.json");
    let defaults = default_config_json();
    let mut merged = defaults.clone();
    merge(&mut merged, &vault);
    merge(&mut merged, &local);

    let mut r = Reader { merged: &merged, defaults, issues };
    let config = Config {
        theme: r.one_of("theme", &["system", "light", "dark"]),
        editor: EditorConfig {
            font_size: r.num("editor.fontSize", 8.0, 32.0) as u32,
            line_wrap: r.bool("editor.lineWrap"),
            autosave_ms: r.num("editor.autosaveMs", 100.0, 10_000.0) as u32,
        },
        lint: LintConfig {
            enabled: r.bool("lint.enabled"),
            rules: at(&merged, "lint.rules").and_then(Value::as_object).cloned().unwrap_or_default(),
        },
        layout: LayoutConfig {
            split_ratio: r.num("layout.splitRatio", 0.2, 0.8),
            sandbox_open: r.bool("layout.sandboxOpen"),
        },
        sandbox: SandboxConfig {
            timeout_ms: r.num("sandbox.timeoutMs", 1_000.0, 300_000.0) as u64,
            max_output_bytes: r.num("sandbox.maxOutputBytes", 1_024.0, 1e9) as u64,
            default_language: r.one_of("sandbox.defaultLanguage", LANGUAGES),
        },
        pdf: PdfConfig { default_zoom: r.one_of("pdf.defaultZoom", &["page-width", "page-fit", "100%"]) },
    };
    let toolchains = local.get("toolchains").and_then(Value::as_object).cloned().unwrap_or_default();
    EffectiveConfig { config, toolchains, issues: r.issues }
}

/// Sets `path` (dotted) in config.json (`scope = "vault"`) or
/// local/settings.json (`scope = "local"`). `null` removes the key.
pub fn set(root: &Path, scope: &str, path: &str, value: Value) -> Result<()> {
    let file = match scope {
        "vault" => root.join(".grimoire/config.json"),
        "local" => root.join(".grimoire/local/settings.json"),
        _ => return Err(AppError::InvalidConfig(format!("unknown scope {scope}"))),
    };
    let mut doc = if file.exists() {
        let text = std::fs::read_to_string(&file)?;
        serde_json::from_str::<Value>(&text).map_err(|e| {
            AppError::InvalidConfig(format!(
                "{} isn't valid JSON ({e}). Fix it by hand; Grimoire won't overwrite it.",
                file.display()
            ))
        })?
    } else {
        json!({})
    };
    let keys: Vec<&str> = path.split('.').collect();
    let mut cur = &mut doc;
    for k in &keys[..keys.len() - 1] {
        if !cur.get(*k).is_some_and(Value::is_object) {
            cur[*k] = json!({});
        }
        cur = cur.get_mut(*k).unwrap();
    }
    let last = keys[keys.len() - 1];
    if value.is_null() {
        if let Some(o) = cur.as_object_mut() {
            o.remove(last);
        }
    } else {
        cur[last] = value;
    }
    write_text_atomic(&file, &serde_json::to_string_pretty(&doc)?)
}

pub fn schema_json() -> Value {
    json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Grimoire vault config",
        "type": "object",
        "properties": {
            "version": { "const": 1 },
            "theme": { "enum": ["system", "light", "dark"] },
            "editor": { "type": "object", "properties": {
                "fontSize": { "type": "integer", "minimum": 8, "maximum": 32 },
                "lineWrap": { "type": "boolean" },
                "autosaveMs": { "type": "integer", "minimum": 100, "maximum": 10000 } } },
            "lint": { "type": "object", "properties": {
                "enabled": { "type": "boolean" },
                "rules": { "type": "object", "additionalProperties": { "type": "boolean" } } } },
            "layout": { "type": "object", "properties": {
                "splitRatio": { "type": "number", "minimum": 0.2, "maximum": 0.8 },
                "sandboxOpen": { "type": "boolean" } } },
            "sandbox": { "type": "object", "properties": {
                "timeoutMs": { "type": "integer", "minimum": 1000, "maximum": 300000 },
                "maxOutputBytes": { "type": "integer", "minimum": 1024 },
                "defaultLanguage": { "enum": LANGUAGES } } },
            "pdf": { "type": "object", "properties": {
                "defaultZoom": { "enum": ["page-width", "page-fit", "100%"] } } }
        }
    })
}

/* ---------- local/state.json ---------- */

pub fn state_get(root: &Path) -> Value {
    let mut ignore = Vec::new();
    read_json(&root.join(".grimoire/local/state.json"), &mut ignore, "state.json")
}

pub fn state_patch(root: &Path, patch: Value) -> Result<()> {
    let mut state = state_get(root);
    merge(&mut state, &patch);
    write_text_atomic(&root.join(".grimoire/local/state.json"), &serde_json::to_string_pretty(&state)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invalid_values_fall_back_and_report() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join(".grimoire/local")).unwrap();
        std::fs::write(dir.path().join(".grimoire/config.json"), r#"{"editor":{"fontSize":"big"},"custom":1}"#).unwrap();
        std::fs::write(dir.path().join(".grimoire/local/settings.json"), r#"{"sandbox":{"timeoutMs":5000}}"#).unwrap();
        let c = load(dir.path());
        assert_eq!(c.config.editor.font_size, 15);
        assert_eq!(c.config.sandbox.timeout_ms, 5000);
        assert_eq!(c.issues.len(), 1);
        set(dir.path(), "vault", "theme", json!("dark")).unwrap();
        let raw = std::fs::read_to_string(dir.path().join(".grimoire/config.json")).unwrap();
        assert!(raw.contains("\"custom\": 1"));
    }
}
