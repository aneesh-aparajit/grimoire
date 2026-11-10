//! Runs snippets with the user's own toolchains, in a temp dir, with a
//! timeout and an output cap. This is a convenience, not a security
//! boundary: code runs as the user.

use crate::error::{AppError, Result};
use crate::platform::{kill_tree, no_window, passthrough_env, user_path, which, EXE_NAME};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Runtime};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;

pub struct LangSpec {
    pub id: &'static str,
    pub label: &'static str,
    pub file_name: &'static str,
    pub binaries: &'static [&'static str],
    pub version_arg: &'static str,
    /// `{bin}` is the resolved binary, `{exe}` the compiled program
    /// (`main`, or `main.exe` on Windows). A step starting with `./` runs a
    /// file from the run directory.
    pub steps: &'static [&'static [&'static str]],
    pub template: &'static str,
}

pub const LANGS: &[LangSpec] = &[
    LangSpec {
        id: "python",
        label: "Python",
        file_name: "main.py",
        // On Windows `python3` is often the Microsoft Store stub, and the
        // python.org installer provides `python` and the `py` launcher.
        binaries: if cfg!(windows) { &["python", "py", "python3"] } else { &["python3", "python"] },
        version_arg: "--version",
        steps: &[&["{bin}", "main.py"]],
        template: "print(\"hello from python\")\n",
    },
    LangSpec {
        id: "javascript",
        label: "JavaScript",
        file_name: "main.js",
        binaries: &["node"],
        version_arg: "--version",
        steps: &[&["{bin}", "main.js"]],
        template: "console.log(\"hello from node\");\n",
    },
    LangSpec {
        id: "go",
        label: "Go",
        file_name: "main.go",
        binaries: &["go"],
        version_arg: "version",
        steps: &[&["{bin}", "run", "main.go"]],
        template: "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"hello from go\")\n}\n",
    },
    LangSpec {
        id: "rust",
        label: "Rust",
        file_name: "main.rs",
        binaries: &["rustc"],
        version_arg: "--version",
        steps: &[&["{bin}", "-O", "main.rs", "-o", "{exe}"], &["./{exe}"]],
        template: "fn main() {\n    println!(\"hello from rust\");\n}\n",
    },
    LangSpec {
        id: "c",
        label: "C",
        file_name: "main.c",
        binaries: &["cc", "clang", "gcc"],
        version_arg: "--version",
        steps: &[&["{bin}", "-O2", "main.c", "-o", "{exe}"], &["./{exe}"]],
        template: "#include <stdio.h>\n\nint main(void) {\n    printf(\"hello from c\\n\");\n    return 0;\n}\n",
    },
    LangSpec {
        id: "java",
        label: "Java",
        file_name: "Main.java",
        binaries: &["java"],
        version_arg: "--version",
        steps: &[&["{bin}", "Main.java"]],
        template: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"hello from java\");\n    }\n}\n",
    },
];

pub fn spec(id: &str) -> Result<&'static LangSpec> {
    LANGS.iter().find(|l| l.id == id).ok_or_else(|| AppError::NotFound(format!("unknown language {id}")))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Toolchain {
    pub language: String,
    pub label: String,
    pub file_name: String,
    pub binary: String,
    pub path: Option<String>,
    pub version: Option<String>,
    pub template: String,
}

fn resolve(spec: &LangSpec, overrides: &Map<String, Value>) -> Option<String> {
    if let Some(p) = overrides.get(spec.id).and_then(Value::as_str).filter(|s| !s.is_empty()) {
        return which(p).map(|p| p.display().to_string());
    }
    spec.binaries.iter().find_map(|b| which(b)).map(|p| p.display().to_string())
}

pub async fn detect(overrides: &Map<String, Value>) -> Vec<Toolchain> {
    let mut out = Vec::new();
    for s in LANGS {
        let path = resolve(s, overrides);
        let mut version = None;
        if let Some(p) = &path {
            let mut cmd = tokio::process::Command::new(p);
            let fut = no_window(&mut cmd)
                .arg(s.version_arg)
                .env("PATH", user_path())
                .stdin(Stdio::null())
                .output();
            if let Ok(Ok(o)) = tokio::time::timeout(Duration::from_secs(2), fut).await {
                let text = if o.stdout.is_empty() { o.stderr } else { o.stdout };
                version = String::from_utf8_lossy(&text).lines().next().map(|l| l.trim().to_string());
            }
        }
        out.push(Toolchain {
            language: s.id.into(),
            label: s.label.into(),
            file_name: s.file_name.into(),
            binary: s.binaries[0].into(),
            path,
            version,
            template: s.template.into(),
        });
    }
    out
}

/* ---------- runs ---------- */

#[derive(Default)]
pub struct Runner {
    next: AtomicU64,
    /// run id → pid of the current step (its process group on Unix)
    active: Mutex<HashMap<u64, Option<i32>>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OutputEvent {
    run_id: u64,
    stream: &'static str,
    chunk: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExitEvent {
    run_id: u64,
    code: Option<i32>,
    duration_ms: u64,
    /// "exit" | "timeout" | "stopped" | "spawn-failed"
    reason: &'static str,
    truncated: bool,
}

impl Runner {
    pub async fn stop(&self, run_id: u64) {
        let mut active = self.active.lock().await;
        if let Some(Some(pg)) = active.get(&run_id) {
            kill_tree(*pg);
        }
        active.remove(&run_id);
    }

    pub async fn stop_all(&self) {
        let ids: Vec<u64> = self.active.lock().await.keys().copied().collect();
        for id in ids {
            self.stop(id).await;
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn start<R: Runtime>(
        self: Arc<Self>,
        app: AppHandle<R>,
        language: String,
        code: String,
        stdin: Option<String>,
        overrides: Map<String, Value>,
        timeout_ms: u64,
        max_output: u64,
    ) -> Result<u64> {
        let s = spec(&language)?;
        let bin = resolve(s, &overrides).ok_or_else(|| {
            AppError::ToolchainMissing(format!("{} not found on PATH", s.binaries[0]))
        })?;
        // One run at a time.
        self.stop_all().await;
        let run_id = self.next.fetch_add(1, Ordering::SeqCst) + 1;
        self.active.lock().await.insert(run_id, None);

        let dir = tempfile::Builder::new().prefix("grimoire-run-").tempdir()?;
        std::fs::write(dir.path().join(s.file_name), code)?;

        let me = self.clone();
        tauri::async_runtime::spawn(async move {
            let started = Instant::now();
            let deadline = started + Duration::from_millis(timeout_ms);
            let mut written: u64 = 0;
            let mut truncated = false;
            let mut result = ExitEvent { run_id, code: None, duration_ms: 0, reason: "exit", truncated: false };

            for (i, step) in s.steps.iter().enumerate() {
                if !me.active.lock().await.contains_key(&run_id) {
                    result.reason = "stopped";
                    break;
                }
                let args: Vec<String> =
                    step.iter().map(|a| a.replace("{bin}", &bin).replace("{exe}", EXE_NAME)).collect();
                let program = if args[0].starts_with("./") {
                    dir.path().join(&args[0][2..]).display().to_string()
                } else {
                    args[0].clone()
                };
                let mut cmd = tokio::process::Command::new(&program);
                cmd.args(&args[1..])
                    .current_dir(dir.path())
                    .env_clear()
                    .envs(passthrough_env())
                    .env("PATH", user_path())
                    .env("LANG", "en_US.UTF-8")
                    .env("TMPDIR", dir.path())
                    .env("TEMP", dir.path())
                    .env("TMP", dir.path())
                    .env("PYTHONIOENCODING", "utf-8")
                    .env("GOCACHE", dir.path().join(".gocache"))
                    .env("PYTHONUNBUFFERED", "1")
                    .stdin(if stdin.is_some() && i + 1 == s.steps.len() { Stdio::piped() } else { Stdio::null() })
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .kill_on_drop(true);
                #[cfg(unix)]
                cmd.process_group(0);
                no_window(&mut cmd);
                let mut child = match cmd.spawn() {
                    Ok(c) => c,
                    Err(e) => {
                        let _ = app.emit("sandbox://output", OutputEvent {
                            run_id,
                            stream: "stderr",
                            chunk: format!("couldn't start {program}: {e}\n"),
                        });
                        result.reason = "spawn-failed";
                        break;
                    }
                };
                let pgid = child.id().map(|p| p as i32);
                if let Some(a) = me.active.lock().await.get_mut(&run_id) {
                    *a = pgid;
                }
                if let (Some(input), Some(mut w)) = (stdin.clone(), child.stdin.take()) {
                    tokio::spawn(async move {
                        let _ = w.write_all(input.as_bytes()).await;
                    });
                }
                let (tx, mut rx) = tokio::sync::mpsc::channel::<(&'static str, String)>(256);
                for (name, pipe) in [
                    ("stdout", child.stdout.take().map(|p| Box::new(p) as Box<dyn tokio::io::AsyncRead + Unpin + Send>)),
                    ("stderr", child.stderr.take().map(|p| Box::new(p) as Box<dyn tokio::io::AsyncRead + Unpin + Send>)),
                ] {
                    if let Some(p) = pipe {
                        let tx = tx.clone();
                        tokio::spawn(async move {
                            let mut lines = BufReader::new(p).lines();
                            while let Ok(Some(l)) = lines.next_line().await {
                                if tx.send((name, l)).await.is_err() {
                                    break;
                                }
                            }
                        });
                    }
                }
                drop(tx);

                // Coalesce output every ~30 ms.
                let mut buf: Vec<(&'static str, String)> = Vec::new();
                let mut tick = tokio::time::interval(Duration::from_millis(30));
                let flush = |buf: &mut Vec<(&'static str, String)>| {
                    let mut current: Option<(&'static str, String)> = None;
                    for (stream, line) in buf.drain(..) {
                        match &mut current {
                            Some((s, text)) if *s == stream => {
                                text.push_str(&line);
                                text.push('\n');
                            }
                            _ => {
                                if let Some((s, text)) = current.take() {
                                    let _ = app.emit("sandbox://output", OutputEvent { run_id, stream: s, chunk: text });
                                }
                                current = Some((stream, format!("{line}\n")));
                            }
                        }
                    }
                    if let Some((s, text)) = current {
                        let _ = app.emit("sandbox://output", OutputEvent { run_id, stream: s, chunk: text });
                    }
                };
                let mut closed = false;
                let status = loop {
                    tokio::select! {
                        msg = rx.recv(), if !closed => match msg {
                            Some((stream, line)) => {
                                if truncated { continue; }
                                written += line.len() as u64 + 1;
                                if written > max_output {
                                    truncated = true;
                                    buf.push(("stderr", format!("[output truncated at {} KiB]", max_output / 1024)));
                                    if let Some(pg) = pgid { kill_tree(pg); }
                                } else {
                                    buf.push((stream, line));
                                }
                            }
                            None => closed = true,
                        },
                        _ = tick.tick() => {
                            if !buf.is_empty() { flush(&mut buf); }
                            if !me.active.lock().await.contains_key(&run_id) {
                                if let Some(pg) = pgid { kill_tree(pg); }
                                let _ = child.wait().await;
                                break None;
                            }
                            if Instant::now() >= deadline {
                                if let Some(pg) = pgid { kill_tree(pg); }
                                let _ = child.wait().await;
                                result.reason = "timeout";
                                break None;
                            }
                        },
                        st = child.wait(), if closed => break st.ok(),
                    }
                };
                // Drain whatever arrived after exit.
                while let Ok(m) = rx.try_recv() {
                    if !truncated {
                        buf.push(m);
                    }
                }
                flush(&mut buf);
                match status {
                    None => {
                        if result.reason != "timeout" {
                            result.reason = "stopped";
                        }
                        break;
                    }
                    Some(st) => {
                        if !me.active.lock().await.contains_key(&run_id) {
                            result.reason = "stopped";
                            break;
                        }
                        result.code = st.code();
                        if !st.success() {
                            break;
                        }
                    }
                }
            }
            result.duration_ms = started.elapsed().as_millis() as u64;
            result.truncated = truncated;
            me.active.lock().await.remove(&run_id);
            let _ = app.emit("sandbox://exit", result);
            drop(dir);
        });
        Ok(run_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex as StdMutex;
    use tauri::Listener;

    fn has(lang: &str) -> bool {
        resolve(spec(lang).unwrap(), &Map::new()).is_some()
    }

    async fn run_and_collect(code: &str, lang: &str, timeout_ms: u64, stop_after: Option<u64>) -> (String, serde_json::Value) {
        let app = tauri::test::mock_app();
        let handle = app.handle().clone();
        let out = Arc::new(StdMutex::new(String::new()));
        let exit = Arc::new(StdMutex::new(None::<serde_json::Value>));
        let o = out.clone();
        handle.listen_any("sandbox://output", move |e| {
            let v: serde_json::Value = serde_json::from_str(e.payload()).unwrap();
            o.lock().unwrap().push_str(v["chunk"].as_str().unwrap());
        });
        let x = exit.clone();
        handle.listen_any("sandbox://exit", move |e| {
            *x.lock().unwrap() = Some(serde_json::from_str(e.payload()).unwrap());
        });
        let runner = Arc::new(Runner::default());
        let id = runner
            .clone()
            .start(handle, lang.into(), code.into(), None, Map::new(), timeout_ms, 1 << 20)
            .await
            .unwrap();
        if let Some(ms) = stop_after {
            tokio::time::sleep(Duration::from_millis(ms)).await;
            runner.stop(id).await;
        }
        for _ in 0..200 {
            if exit.lock().unwrap().is_some() {
                break;
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        let o = out.lock().unwrap().clone();
        let e = exit.lock().unwrap().clone().expect("no exit event");
        (o, e)
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn runs_python_and_reports_exit() {
        if !has("python") {
            return;
        }
        let (out, exit) = run_and_collect("print('hi')\nimport sys; print('oops', file=sys.stderr); sys.exit(3)\n", "python", 10_000, None).await;
        assert!(out.contains("hi\n"), "{out}");
        assert!(out.contains("oops"), "{out}");
        assert_eq!(exit["code"], 3);
        assert_eq!(exit["reason"], "exit");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn times_out_and_kills() {
        if !has("python") {
            return;
        }
        let (_, exit) = run_and_collect("import time\nwhile True: time.sleep(0.1)\n", "python", 1_000, None).await;
        assert_eq!(exit["reason"], "timeout");
        assert!(exit["durationMs"].as_u64().unwrap() < 3_000);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn stop_ends_the_run() {
        if !has("python") {
            return;
        }
        let (_, exit) = run_and_collect("import time\nwhile True: time.sleep(0.1)\n", "python", 30_000, Some(400)).await;
        assert_eq!(exit["reason"], "stopped");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn compiles_and_runs_c() {
        if !has("c") {
            return;
        }
        let (out, exit) = run_and_collect("#include <stdio.h>\nint main(void){printf(\"c ok\\n\");return 0;}\n", "c", 20_000, None).await;
        assert!(out.contains("c ok"), "{out}");
        assert_eq!(exit["code"], 0);
    }
}
