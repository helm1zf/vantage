#!/usr/bin/env bash
# Runs the Rust steps of CI (clippy -D warnings, cargo test) on Linux in Docker, as CI does.
# Why: check_all.sh only tests the OS you are on, so code written for macOS or Windows can fail on Linux (dead code, missing cfg).
# Needs Docker (on a Mac: `brew install docker colima && colima start`). The first run downloads the image and builds; later runs are cached.
set -u
cd "$(dirname "$0")/.."
# A leftover Docker Desktop credential helper in ~/.docker/config.json breaks pulls with Colima; use a clean config and the Colima socket.
export DOCKER_CONFIG="$(mktemp -d)"; trap 'rm -rf "$DOCKER_CONFIG"' EXIT
[ -S "$HOME/.colima/default/docker.sock" ] && export DOCKER_HOST="unix://$HOME/.colima/default/docker.sock"
command -v docker >/dev/null || { echo "FAIL  docker not installed"; exit 1; }
docker info >/dev/null 2>&1 || { echo "FAIL  docker is not running (colima start)"; exit 1; }
docker run --rm -v "$PWD":/src -w /src/src-tauri \
  -v vantage_cargo:/usr/local/cargo/registry -v vantage_target:/cache \
  -e CARGO_TARGET_DIR=/cache/target rust:1-bookworm bash -c '
    set -e
    apt-get update -qq >/dev/null
    apt-get install -y -qq libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev librsvg2-dev libayatana-appindicator3-dev >/dev/null
    rustup component add clippy >/dev/null 2>&1
    cargo clippy --all-targets -- -D warnings
    cargo test'
rc=$?
[ $rc -eq 0 ] && echo "PASS  linux rust (clippy + tests)" || echo "FAIL  linux rust (exit $rc)"
exit $rc
