# Grimoire build helpers for macOS and Linux. Run `make help` for the list of
# targets. On Windows, use scripts/install.ps1 instead.

APP_DIR    := app
TAURI_DIR  := $(APP_DIR)/src-tauri
BUNDLE_DIR := $(TAURI_DIR)/target/release/bundle
UNIVERSAL_BUNDLE_DIR := $(TAURI_DIR)/target/universal-apple-darwin/release/bundle

UNAME ?= $(shell uname -s)

# rustup installs cargo here; make sure it is on PATH even in non-login shells.
export PATH := $(HOME)/.cargo/bin:$(PATH)

# With CI=true, Tauri's DMG bundler skips the AppleScript that styles the Finder
# window, which would otherwise need Automation permission for Finder.
DMG_ENV := CI=true

.DEFAULT_GOAL := help
.PHONY: help install dev build build-universal bundle install-app open clean

help: ## Show available targets
	@awk -v os="$(UNAME)" ' \
		/^(else )?ifeq \(\$$\(UNAME\),/ { sub(/.*,/, ""); sub(/\).*/, ""); cur = $$0; next } \
		/^endif/ { cur = ""; next } \
		/^[a-zA-Z_-]+:.*## / && (cur == "" || cur == os) { split($$0, p, ":.*## "); printf "  \033[36m%-16s\033[0m %s\n", p[1], p[2] }' $(MAKEFILE_LIST)

install: ## Install frontend dependencies
	cd $(APP_DIR) && pnpm install --frozen-lockfile

dev: install ## Run the app in development mode
	cd $(APP_DIR) && pnpm tauri dev

ifeq ($(UNAME),Darwin)

build: install ## Build a DMG for this Mac's architecture
	cd $(APP_DIR) && $(DMG_ENV) pnpm tauri build --bundles dmg
	@echo "DMG:" && ls -1 $(BUNDLE_DIR)/dmg/*.dmg

build-universal: install ## Build a universal (arm64 + x86_64) DMG, like CI
	rustup target add aarch64-apple-darwin x86_64-apple-darwin
	cd $(APP_DIR) && $(DMG_ENV) pnpm tauri build --target universal-apple-darwin --bundles dmg
	@echo "DMG:" && ls -1 $(UNIVERSAL_BUNDLE_DIR)/dmg/*.dmg

install-app: build ## Build, then install the app into /Applications
	./scripts/install.sh "$$(ls -t $(BUNDLE_DIR)/dmg/*.dmg | head -1)"

open: ## Reveal the most recent DMG in Finder
	@open -R "$$(ls -t $(BUNDLE_DIR)/dmg/*.dmg $(UNIVERSAL_BUNDLE_DIR)/dmg/*.dmg 2>/dev/null | head -1)"

else ifeq ($(UNAME),Linux)

build: install ## Build the grimoire binary for this machine
	cd $(APP_DIR) && pnpm tauri build --no-bundle
	@echo "Binary:" && ls -1 $(TAURI_DIR)/target/release/grimoire

bundle: install ## Build .deb and AppImage packages, like CI
	cd $(APP_DIR) && pnpm tauri build --bundles deb,appimage
	@echo "Packages:" && ls -1 $(BUNDLE_DIR)/deb/*.deb $(BUNDLE_DIR)/appimage/*.AppImage

install-app: build ## Build, then install for this user into ~/.local
	./scripts/install.sh $(TAURI_DIR)/target/release/grimoire

open: ## Open the folder with the most recent build
	@xdg-open $(TAURI_DIR)/target/release >/dev/null 2>&1 &

endif

clean: ## Remove build outputs
	rm -rf $(APP_DIR)/dist
	cd $(TAURI_DIR) && cargo clean
