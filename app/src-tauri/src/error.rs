use serde::Serialize;

/// Every command returns `Result<T, AppError>`. It serialises to
/// `{ kind, message }`, which the frontend parses with Zod.
#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    InvalidPath(String),
    #[error("{0}")]
    Conflict(String),
    #[error("{0}")]
    Io(String),
    #[error("{0}")]
    ToolchainMissing(String),
    #[error("{0}")]
    Network(String),
    #[error("{0}")]
    Parse(String),
    #[error("{0}")]
    InvalidConfig(String),
    #[error("{0}")]
    NotAPdf(String),
    #[error("{0}")]
    NoVault(String),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Parse(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Network(e.to_string())
    }
}

impl From<tauri::Error> for AppError {
    fn from(e: tauri::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
