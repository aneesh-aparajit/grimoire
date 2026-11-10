//! Finding the user's toolchains and starting processes the same way on
//! macOS and Windows.
//!
//! GUI apps on macOS don't inherit the shell's PATH, so on Unix the user's
//! login-shell PATH is resolved once and used for toolchain detection and
//! runs. On Windows, apps started from Explorer get the user's PATH already.

use std::path::{Path, PathBuf};
use std::sync::OnceLock;

static PATH: OnceLock<String> = OnceLock::new();

/// The separator between PATH entries.
pub const PATH_SEP: char = if cfg!(windows) { ';' } else { ':' };

/// What a compiled sandbox program is called.
pub const EXE_NAME: &str = if cfg!(windows) { "main.exe" } else { "main" };

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

/// Whether `bin` names a file by path rather than a command to look up.
fn is_path(bin: &str) -> bool {
    bin.contains('/') || (cfg!(windows) && (bin.contains('\\') || Path::new(bin).is_absolute()))
}

/// The file `p` names, trying `.exe` (and other runnable extensions) on Windows.
fn runnable(p: PathBuf) -> Option<PathBuf> {
    if p.is_file() {
        return Some(p);
    }
    #[cfg(windows)]
    {
        if p.extension().is_none() {
            for ext in ["exe", "cmd", "bat"] {
                let e = p.with_extension(ext);
                if e.is_file() {
                    return Some(e);
                }
            }
        }
    }
    None
}

/// `which` against the resolved PATH.
pub fn which(bin: &str) -> Option<PathBuf> {
    if is_path(bin) {
        return runnable(PathBuf::from(bin));
    }
    user_path()
        .split(PATH_SEP)
        .filter(|d| !d.is_empty())
        .find_map(|dir| runnable(Path::new(dir).join(bin)))
}

/// Keeps a child process from opening a console window of its own. A GUI
/// app on Windows has no console, so every console program it starts would
/// otherwise flash one up.
#[cfg(windows)]
pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn no_window(cmd: &mut tokio::process::Command) -> &mut tokio::process::Command {
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

/// Ends the process `pid` and everything it started.
#[cfg(unix)]
pub fn kill_tree(pid: i32) {
    // Sandbox steps run as the leader of their own process group, so the
    // pid is also the group id.
    unsafe {
        libc::killpg(pid, libc::SIGTERM);
    }
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(300));
        unsafe {
            libc::killpg(pid, libc::SIGKILL);
        }
    });
}

/// Ends the process `pid` and everything it started.
#[cfg(windows)]
pub fn kill_tree(pid: i32) {
    use std::os::windows::process::CommandExt;
    // Windows has no process groups to signal; taskkill /T walks the tree.
    // Off the async runtime, since it waits for taskkill to finish.
    std::thread::spawn(move || {
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .status();
    });
}

#[cfg(not(any(unix, windows)))]
pub fn kill_tree(_pid: i32) {}

/// Variables a program needs from the parent environment to start at all.
/// Runs otherwise get a clean environment.
pub fn passthrough_env() -> Vec<(String, String)> {
    let keys: &[&str] = if cfg!(windows) {
        &[
            "SystemRoot",
            "SystemDrive",
            "windir",
            "ComSpec",
            "PATHEXT",
            "USERPROFILE",
            "HOMEDRIVE",
            "HOMEPATH",
            "APPDATA",
            "LOCALAPPDATA",
            "ProgramData",
            "ProgramFiles",
            "ProgramFiles(x86)",
            "ProgramW6432",
            "CommonProgramFiles",
            "NUMBER_OF_PROCESSORS",
            "PROCESSOR_ARCHITECTURE",
            "OS",
            "JAVA_HOME",
            "RUSTUP_HOME",
            "CARGO_HOME",
        ]
    } else {
        &["HOME", "USER", "JAVA_HOME", "RUSTUP_HOME", "CARGO_HOME"]
    };
    keys.iter().filter_map(|k| std::env::var(k).ok().map(|v| (k.to_string(), v))).collect()
}

/// `path` with `/` between components on every platform, for paths shown in
/// the UI or compared against vault-relative ids.
pub fn slash_path(path: &Path) -> String {
    path.components().map(|c| c.as_os_str().to_string_lossy()).collect::<Vec<_>>().join("/")
}

/// `canonicalize`, without the `\\?\` prefix Windows adds. The prefixed
/// form confuses the webview's asset URLs and looks odd in the UI.
pub fn canonicalize(path: &Path) -> std::io::Result<PathBuf> {
    let c = path.canonicalize()?;
    #[cfg(windows)]
    {
        let s = c.to_string_lossy();
        if let Some(rest) = s.strip_prefix(r"\\?\UNC\") {
            return Ok(PathBuf::from(format!(r"\\{rest}")));
        }
        if let Some(rest) = s.strip_prefix(r"\\?\") {
            // Only drive paths short enough to work without the prefix.
            if rest.len() < 260 && rest.as_bytes().get(1) == Some(&b':') {
                return Ok(PathBuf::from(rest));
            }
        }
    }
    Ok(c)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slash_path_joins_with_slashes() {
        let p = Path::new("a").join("b").join("NOTES.md");
        assert_eq!(slash_path(&p), "a/b/NOTES.md");
    }

    #[test]
    fn canonicalize_resolves() {
        let d = tempfile::tempdir().unwrap();
        let c = canonicalize(d.path()).unwrap();
        assert!(c.is_absolute());
        assert!(!c.to_string_lossy().starts_with(r"\\?\"));
    }
}
