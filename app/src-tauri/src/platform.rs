//! GUI apps on macOS don't inherit the shell's PATH. Resolve the user's
//! login-shell PATH once and use it for toolchain detection and runs.

use std::sync::OnceLock;

static PATH: OnceLock<String> = OnceLock::new();

pub fn user_path() -> &'static str {
    PATH.get_or_init(|| {
        let current = std::env::var("PATH").unwrap_or_default();
        #[cfg(unix)]
        {
            let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
            let out = std::process::Command::new(&shell)
                .args(["-ilc", "printf '__GRIMOIRE_PATH__%s' \"$PATH\""])
                .stdin(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .output();
            if let Ok(out) = out {
                let text = String::from_utf8_lossy(&out.stdout);
                if let Some(p) = text.rsplit("__GRIMOIRE_PATH__").next() {
                    let p = p.trim();
                    if !p.is_empty() {
                        let extra = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
                        let mut parts: Vec<&str> = p.split(':').collect();
                        for e in extra {
                            if !parts.contains(&e) {
                                parts.push(e);
                            }
                        }
                        return parts.join(":");
                    }
                }
            }
        }
        current
    })
}

/// `which` against the resolved PATH.
pub fn which(bin: &str) -> Option<std::path::PathBuf> {
    if bin.contains('/') {
        let p = std::path::PathBuf::from(bin);
        return p.is_file().then_some(p);
    }
    let sep = if cfg!(windows) { ';' } else { ':' };
    for dir in user_path().split(sep) {
        let p = std::path::Path::new(dir).join(bin);
        if p.is_file() {
            return Some(p);
        }
        #[cfg(windows)]
        {
            let exe = p.with_extension("exe");
            if exe.is_file() {
                return Some(exe);
            }
        }
    }
    None
}
