#!/usr/bin/env bash
# Install Grimoire on macOS or Linux.
#
# Usage:
#   ./install.sh [options] [path/to/grimoire.dmg | path/to/grimoire]
#
# On Linux, installs a built grimoire binary for the current user: the binary
# into ~/.local/bin, plus a launcher entry and icon under ~/.local/share. No
# root needed. The binary is the one given as an argument, or the newest local
# build in app/src-tauri/target (`make build`).
#
# On macOS, where the DMG comes from, in order:
#   1. the path given as an argument
#   2. a .dmg next to this script, or the newest local build in app/src-tauri/target
#   3. the latest GitHub release (via `gh` if installed and signed in, else the public API)
#
# Options:
#   --dest DIR   install into DIR instead of /Applications (falls back to ~/Applications
#                automatically when /Applications is not writable); on Linux, instead
#                of ~/.local/bin
#   --open       launch Grimoire after installing
#   -h, --help   show this help
#
# Environment:
#   GRIMOIRE_REPO  GitHub repo to download releases from (default: aneesh-aparajit/grimoire)

set -euo pipefail

APP_NAME="grimoire"
REPO="${GRIMOIRE_REPO:-aneesh-aparajit/grimoire}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEST=""
OPEN_AFTER=0
DMG=""

info() { printf '\033[36m==>\033[0m %s\n' "$*" >&2; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

usage() { sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dest) [[ $# -ge 2 ]] || die "--dest needs a directory"; DEST="$2"; shift 2 ;;
    --open) OPEN_AFTER=1; shift ;;
    -h|--help) usage ;;
    -*) die "unknown option: $1 (see --help)" ;;
    *) DMG="$1"; shift ;;
  esac
done

install_linux() {
  local bin="$DMG"
  if [[ -z "$bin" ]]; then
    bin="$(ls -t "$SCRIPT_DIR"/../app/src-tauri/target/release/"$APP_NAME" \
                 "$SCRIPT_DIR"/../app/src-tauri/target/*/release/"$APP_NAME" \
                 2>/dev/null | head -1 || true)"
    [[ -n "$bin" ]] && info "Using local build: $bin"
  fi
  [[ -n "$bin" ]] || die "no local build found. Run \`make build\` first, or pass the path to a grimoire binary."
  [[ -f "$bin" && -x "$bin" ]] || die "not an executable: $bin"

  local dest="${DEST:-$HOME/.local/bin}"
  local data="${XDG_DATA_HOME:-$HOME/.local/share}"
  local icon_src="$SCRIPT_DIR/../app/src-tauri/icons/128x128.png"
  mkdir -p "$dest" "$data/applications" "$data/icons/hicolor/128x128/apps"

  if pgrep -x "$APP_NAME" >/dev/null 2>&1; then
    info "Quitting the running copy of Grimoire"
    pkill -x "$APP_NAME" || true
    sleep 1
  fi

  info "Installing to $dest/$APP_NAME"
  install -m 755 "$bin" "$dest/$APP_NAME.tmp"
  mv -f "$dest/$APP_NAME.tmp" "$dest/$APP_NAME"
  [[ -f "$icon_src" ]] && install -m 644 "$icon_src" "$data/icons/hicolor/128x128/apps/$APP_NAME.png"

  cat > "$data/applications/$APP_NAME.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=grimoire
Comment=Read, write and run side by side
Exec=$dest/$APP_NAME
Icon=$APP_NAME
Terminal=false
Categories=Education;Office;
StartupWMClass=$APP_NAME
DESKTOP
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$data/applications" >/dev/null 2>&1 || true
  command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t "$data/icons/hicolor" >/dev/null 2>&1 || true

  case ":$PATH:" in
    *":$dest:"*) ;;
    *) warn "$dest is not on your PATH; open grimoire from your app launcher, or add it to PATH." ;;
  esac
  info "Grimoire is installed: $dest/$APP_NAME"

  if [[ "$OPEN_AFTER" -eq 1 ]]; then
    nohup "$dest/$APP_NAME" >/dev/null 2>&1 &
  fi
}

case "$(uname -s)" in
  Darwin) ;;
  Linux) install_linux; exit 0 ;;
  *) die "Grimoire's installer supports macOS and Linux. On Windows, use scripts/install.ps1." ;;
esac

WORK_DIR="$(mktemp -d -t grimoire-install)"
MOUNT_POINT=""
cleanup() {
  if [[ -n "$MOUNT_POINT" ]]; then
    hdiutil detach "$MOUNT_POINT" -quiet >/dev/null 2>&1 || hdiutil detach "$MOUNT_POINT" -force -quiet >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

download_release() {
  info "Downloading the latest release from github.com/$REPO"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    gh release download --repo "$REPO" --pattern '*.dmg' --dir "$WORK_DIR" \
      || die "could not download a DMG from $REPO's latest release with gh."
  else
    local api url
    api="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")" \
      || die "no public release found for $REPO. Pass a DMG path, or install the GitHub CLI (gh) and sign in with access to the repo."
    url="$(printf '%s' "$api" | grep -o '"browser_download_url": *"[^"]*\.dmg"' | head -1 | sed 's/.*"\(https[^"]*\)"/\1/')"
    [[ -n "$url" ]] || die "the latest release of $REPO has no .dmg asset."
    curl -fL --progress-bar -o "$WORK_DIR/${url##*/}" "$url" || die "download failed: $url"
  fi
  ls -t "$WORK_DIR"/*.dmg 2>/dev/null | head -1
}

# 1-3. Find the DMG.
if [[ -z "$DMG" ]]; then
  DMG="$(ls -t "$SCRIPT_DIR"/*.dmg \
              "$SCRIPT_DIR"/../app/src-tauri/target/release/bundle/dmg/*.dmg \
              "$SCRIPT_DIR"/../app/src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg \
              2>/dev/null | head -1 || true)"
  [[ -n "$DMG" ]] && info "Using local build: $DMG"
fi
[[ -n "$DMG" ]] || DMG="$(download_release)"
[[ -f "$DMG" ]] || die "DMG not found: $DMG"

# Choose where to install.
if [[ -z "$DEST" ]]; then
  if [[ -w /Applications ]]; then
    DEST="/Applications"
  else
    DEST="$HOME/Applications"
    warn "/Applications is not writable; installing to $DEST instead."
  fi
fi
mkdir -p "$DEST"

# Mount the DMG and find the app inside.
info "Mounting $(basename "$DMG")"
MOUNT_POINT="$WORK_DIR/mnt"
mkdir -p "$MOUNT_POINT"
hdiutil attach "$DMG" -nobrowse -readonly -noautoopen -mountpoint "$MOUNT_POINT" -quiet \
  || { MOUNT_POINT=""; die "could not mount $DMG"; }

SRC_APP="$(find "$MOUNT_POINT" -maxdepth 1 -name '*.app' -print -quit)"
[[ -n "$SRC_APP" ]] || die "no .app found inside $DMG"
TARGET="$DEST/$(basename "$SRC_APP")"

# Quit a running copy so it can be replaced.
if pgrep -x "$APP_NAME" >/dev/null 2>&1; then
  info "Quitting the running copy of Grimoire"
  pkill -x "$APP_NAME" || true
  sleep 1
fi

info "Installing to $TARGET"
rm -rf "$TARGET"
ditto "$SRC_APP" "$TARGET"

# The app is ad-hoc signed (no Apple Developer ID), so Gatekeeper would block it.
# Removing the quarantine flag lets it open normally.
xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null || true

info "Grimoire is installed: $TARGET"

if [[ "$OPEN_AFTER" -eq 1 ]]; then
  open "$TARGET"
fi
