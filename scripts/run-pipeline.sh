#!/usr/bin/env bash
# Called by systemd newsroom-pipeline.service
# Also safe to run manually for a one-off pipeline run
set -euo pipefail

REPO_DIR="$HOME/ai-newsroom"

cd "$REPO_DIR/agent"

# Pull latest code (non-destructive: skips if branch diverged)
git pull --ff-only 2>&1 || echo "[run-pipeline] git pull skipped (not fast-forwardable)"

echo "[run-pipeline] Starting pipeline at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
node src/pipeline.js
echo "[run-pipeline] Done at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
