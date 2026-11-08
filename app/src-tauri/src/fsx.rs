//! Filesystem helpers: atomic writes and path safety.

use crate::error::{AppError, Result};
use std::io::Write;
use std::path::{Component, Path, PathBuf};

/// Write via a temp file in the same directory, fsync, then rename, so a
/// crash never leaves a half-written file. Line endings are normalised to
/// `\n` and a trailing newline is enforced for text files.
pub fn write_text_atomic(path: &Path, text: &str) -> Result<()> {
    let mut body = text.replace("\r\n", "\n");
    if !body.ends_with('\n') {
        body.push('\n');
    }
    write_bytes_atomic(path, body.as_bytes())
}

pub fn write_bytes_atomic(path: &Path, bytes: &[u8]) -> Result<()> {
    let dir = path.parent().ok_or_else(|| AppError::InvalidPath(path.display().to_string()))?;
    std::fs::create_dir_all(dir)?;
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("file");
    let tmp = dir.join(format!(".{name}.grimoire-tmp"));
    {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    std::fs::rename(&tmp, path)?;
    Ok(())
}

/// Join a frontend-supplied relative path onto the vault root, refusing
/// anything that could escape it.
pub fn safe_join(root: &Path, rel: &str) -> Result<PathBuf> {
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err(AppError::InvalidPath(format!("{rel} is not relative to the vault")));
    }
    for c in rel_path.components() {
        match c {
            Component::Normal(_) | Component::CurDir => {}
            _ => return Err(AppError::InvalidPath(format!("{rel} leaves the vault"))),
        }
    }
    Ok(root.join(rel_path))
}

/// An item id is a single slug segment.
pub fn check_id(id: &str) -> Result<()> {
    let ok = !id.is_empty()
        && id.len() <= 80
        && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_')
        && !id.starts_with('.');
    if ok {
        Ok(())
    } else {
        Err(AppError::InvalidPath(format!("{id} is not a valid item id")))
    }
}

/// A plain file name inside an item folder.
pub fn check_file_name(name: &str) -> Result<()> {
    let ok = !name.is_empty()
        && !name.starts_with('.')
        && !name.contains('/')
        && !name.contains('\\')
        && name != "..";
    if ok {
        Ok(())
    } else {
        Err(AppError::InvalidPath(format!("{name} is not a valid file name")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_escapes() {
        let root = Path::new("/v");
        assert!(safe_join(root, "../etc/passwd").is_err());
        assert!(safe_join(root, "/etc/passwd").is_err());
        assert!(safe_join(root, "a/../../b").is_err());
        assert_eq!(safe_join(root, "a/NOTES.md").unwrap(), PathBuf::from("/v/a/NOTES.md"));
    }

    #[test]
    fn atomic_write_normalises() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("x.md");
        write_text_atomic(&p, "a\r\nb").unwrap();
        assert_eq!(std::fs::read_to_string(&p).unwrap(), "a\nb\n");
    }
}
