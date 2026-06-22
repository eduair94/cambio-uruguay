#!/usr/bin/env bash
#
# Zero-downtime deploy for the cambio-uruguay Nuxt app (pm2 cluster, 2 instances).
#
# Why this exists: the old `npm run build` ran `nuxt build` directly, which wipes
# `.output` at the start of the build while the live pm2 process is still serving
# from it -> every request 500s for the whole (~2 min) build. This script instead:
#   1. takes an flock so two deploys can never race the same `.output`,
#   2. builds into a STAGING dir (NITRO_OUTPUT_DIR) so the live `.output` keeps
#      serving untouched during the build,
#   3. atomically swaps the fresh build into place,
#   4. `pm2 reload` (rolling, not `restart`) so instances cycle one at a time.
#
# Usage (on the server):  cd /root/cambio-uruguay/app && bash scripts/deploy.sh
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # .../app
REPO_DIR="$(cd "$APP_DIR/.." && pwd)"
PM2_NAME="cambio-uruguay"
STAGING="$APP_DIR/.output-next"
PREV="$APP_DIR/.output-prev"
LOCK="/tmp/cambio-uruguay-deploy.lock"

log() { printf '\n\033[1;36m[deploy]\033[0m %s\n' "$*"; }

# 1. Serialize deploys — fail fast if one is already running.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[deploy] another deploy holds the lock ($LOCK); aborting." >&2
  exit 1
fi

cd "$APP_DIR"

log "Pulling latest main…"
# `npm install` (below, on prior deploys) can regenerate app/package-lock.json,
# leaving the server tree dirty so the next ff-only pull aborts with "local
# changes would be overwritten". Discard that tracked churn before pulling —
# the committed lock is the source of truth.
git -C "$REPO_DIR" checkout -- app/package-lock.json 2>/dev/null || true
git -C "$REPO_DIR" pull --ff-only origin main

log "Installing deps (no-audit)…"
npm install --no-audit --no-fund

log "Building into staging dir ($STAGING) — live .output keeps serving…"
rm -rf "$STAGING" "$APP_DIR/.nuxt"
# 8192 heap: 4096 OOM'd after firebase-auth landed (see memory/deploy notes).
NODE_OPTIONS="--max-old-space-size=8192" NITRO_OUTPUT_DIR="$STAGING" npx nuxt build

# Sanity: the staging build must have a server entry before we swap.
if [ ! -f "$STAGING/server/index.mjs" ]; then
  echo "[deploy] staging build incomplete ($STAGING/server/index.mjs missing); aborting, live site untouched." >&2
  exit 1
fi

log "Swapping staging build into .output…"
rm -rf "$PREV"
[ -d "$APP_DIR/.output" ] && mv "$APP_DIR/.output" "$PREV"
mv "$STAGING" "$APP_DIR/.output"

log "Rolling reload (pm2 reload, zero-downtime)…"
pm2 reload "$PM2_NAME" --update-env

log "Cleaning previous build…"
rm -rf "$PREV"

log "Deploy complete: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
