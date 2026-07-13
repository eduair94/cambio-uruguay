#!/usr/bin/env bash
#
# Zero-downtime deploy for the cambio-uruguay root Express backend (pm2 cluster,
# 2 instances of currency-server) plus the other root-scoped pm2 jobs.
#
# Why this exists: until now the backend deployed BY HAND on the VPS (ssh in,
# git pull, npm install, npm run build, pm2 restart) — a stale `dist/` has
# silently broken scrapers in production before (memory/backend-deploy-dist.md).
# This mirrors app/scripts/deploy.sh's zero-downtime shape:
#   1. its own flock so two backend deploys can never race EACH OTHER,
#   2. discard the tracked churn `npm install` leaves behind, then ff-only pull
#      (same fix app/scripts/deploy.sh applies for app/package-lock.json — see
#      the note on that step below for why it's currently a defensive no-op
#      here rather than a proven bug),
#   3. build into a STAGING dir (dist_staging) so the live dist/ keeps serving
#      requests, untouched, while tsc compiles,
#   4. sanity-check the staging build has real entry points before touching
#      anything live — a failed build must NEVER take the API down,
#   5. atomically swap dist_staging into dist,
#   6. `pm2 reload` currency-server (rolling, now that it's cluster mode — see
#      ecosystem.config.js) so instances cycle one at a time and the API never
#      502s,
#   7. start any OTHER root-scoped pm2 app declared in ecosystem.config.js that
#      isn't registered yet (currency-aduana is brand new and has never been
#      started on the server) — apps already running are left exactly as they
#      are; the mcp/ and bots/ apps (own cwd, own build) are out of scope,
#   8. `pm2 save` so the process list survives a reboot.
#
# IMPORTANT — the build happens HERE, on the server, not in CI. `npm run build`
# (tsc -p tsconfig.production.json) needs sheet_key.json — gitignored Google
# Sheets credentials that exist only on the VPS. Putting that credential in a
# GitHub secret so CI could build instead would be worse than building here.
#
# Race note: this script's flock only serializes backend deploys against EACH
# OTHER (e.g. two pushes to main close together). It does NOT by itself stop
# this script and app/scripts/deploy.sh from touching the same git tree at the
# same time — they intentionally hold DIFFERENT lock files (see LOCK below), so
# flock alone cannot provide that mutual exclusion. That guarantee instead comes
# from .github/workflows/deploy.yml sequencing the two deploy jobs (backend
# deploy `needs` the app deploy job) so their SSH sessions never overlap.
#
# Usage (on the server): cd /root/cambio-uruguay && bash scripts/deploy-backend.sh
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # repo root
PM2_NAME="currency-server"
# Root-scoped pm2 apps only (no `cwd` override to ./mcp or ./bots in
# ecosystem.config.js — those are a separate deploy surface, out of scope here).
# currency-server is handled separately below (reload, not a plain start-if-missing).
OTHER_APPS=(currency-sync currency-aduana currency-sheet)
STAGING="$REPO_DIR/dist_staging"
PREV="$REPO_DIR/dist_prev"
LOCK="/tmp/cambio-uruguay-backend-deploy.lock"

log() { printf '\n\033[1;36m[deploy-backend]\033[0m %s\n' "$*"; }

# 1. Serialize backend deploys — fail fast if one is already running. Deliberately
# a DIFFERENT lock file from app/scripts/deploy.sh's (/tmp/cambio-uruguay-deploy.lock)
# — see the race note above for how app-vs-backend ordering is actually guaranteed.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[deploy-backend] another backend deploy holds the lock ($LOCK); aborting." >&2
  exit 1
fi

cd "$REPO_DIR"

log "Pulling latest main…"
# `npm install` (below, on prior deploys) can regenerate package-lock.json. At
# the repo root that file is fully gitignored (unlike app/package-lock.json,
# which is deliberately un-ignored and committed), so this is a defensive no-op
# today, not a proven bug here — kept for symmetry with app/scripts/deploy.sh
# and so the script stays correct if a root lockfile is ever committed later.
git -C "$REPO_DIR" checkout -- package-lock.json 2>/dev/null || true
git -C "$REPO_DIR" pull --ff-only origin main

log "Installing deps (no-audit)…"
npm install --no-audit --no-fund

log "Building into staging dir ($STAGING) — live dist/ keeps serving…"
rm -rf "$STAGING"
npx tsc -p tsconfig.production.json --outDir "$STAGING"

# Sanity: the staging build must have real entry points before we swap. A
# failed/partial build must never take the live API down.
if [ ! -f "$STAGING/index.js" ] || [ ! -f "$STAGING/sync.js" ]; then
  echo "[deploy-backend] staging build incomplete ($STAGING/index.js or $STAGING/sync.js missing); aborting, live dist/ untouched." >&2
  exit 1
fi

log "Swapping staging build into dist/…"
rm -rf "$PREV"
[ -d "$REPO_DIR/dist" ] && mv "$REPO_DIR/dist" "$PREV"
mv "$STAGING" "$REPO_DIR/dist"

log "Reloading $PM2_NAME (rolling, cluster mode)…"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  # `pm2 reload ecosystem.config.js --only …` — NOT a bare `pm2 reload <name>` —
  # so pm2 re-reads this file's app definition. This matters on the FIRST run
  # after this change: currency-server is moving from fork/1-instance to
  # cluster/2-instances (see ecosystem.config.js), and a bare `pm2 reload
  # currency-server` reloads using pm2's already-stored process config, which
  # would silently keep the old fork/1-instance topology forever. Every reload
  # after that first transition is a true zero-downtime rolling cycle.
  pm2 reload ecosystem.config.js --only "$PM2_NAME" --update-env
else
  log "  $PM2_NAME not registered yet — starting for the first time…"
  pm2 start ecosystem.config.js --only "$PM2_NAME"
fi

log "Ensuring other backend pm2 apps are registered…"
# These are cron-restart / one-shot jobs (currency-sync, currency-sheet already
# run today; currency-aduana never has), not long-running request handlers, so
# they don't need a rolling reload — only "start it if pm2 doesn't know about it
# yet". Apps already running pick up the fresh dist/ on their own next
# cron/restart cycle, exactly as before this script existed.
for app in "${OTHER_APPS[@]}"; do
  if pm2 describe "$app" >/dev/null 2>&1; then
    log "  $app: already registered, leaving as-is."
  else
    log "  $app: not registered — starting for the first time…"
    pm2 start ecosystem.config.js --only "$app"
  fi
done

log "Persisting pm2 process list (survives a reboot)…"
pm2 save

log "Cleaning previous build…"
rm -rf "$PREV"

log "Deploy complete: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
