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

# Reinstall only when the dependency set actually changed.
#
# Most deploys are a page or a copy change and touch no dependency, but every
# one of them paid a full `npm install`. It is also what kept regenerating
# app/package-lock.json and leaving the server tree dirty — the churn the
# checkout above exists to undo.
#
# The stamp holds the hash of the two files that define the dependency set. The
# `node_modules` test is the safety catch: a missing or wiped tree reinstalls
# regardless of what the stamp says. Anything unexpected (no sha256sum, no
# stamp) falls through to installing, so the failure mode is "slow", never
# "builds against the wrong dependencies".
DEPS_STAMP="$APP_DIR/.deps-stamp"
DEPS_HASH=""
if command -v sha256sum >/dev/null 2>&1; then
  DEPS_HASH="$(cat package.json package-lock.json 2>/dev/null | sha256sum | cut -d' ' -f1)"
fi

if [ -n "$DEPS_HASH" ] && [ -d node_modules ] && [ -f "$DEPS_STAMP" ] &&
  [ "$(cat "$DEPS_STAMP")" = "$DEPS_HASH" ]; then
  log "Deps unchanged — skipping npm install."
else
  log "Installing deps (no-audit)…"
  npm install --no-audit --no-fund
  # An `if`, not `[ … ] && …`: under `set -e` a trailing `&&` that short-circuits
  # returns 1 and would abort the deploy on the machines with no sha256sum.
  if [ -n "$DEPS_HASH" ]; then
    printf '%s' "$DEPS_HASH" >"$DEPS_STAMP"
  fi
fi

log "Building into staging dir ($STAGING) — live .output keeps serving…"
rm -rf "$STAGING" "$APP_DIR/.nuxt"
# 8192 heap: 4096 OOM'd after firebase-auth landed (see memory/deploy notes).
NODE_OPTIONS="--max-old-space-size=8192" NITRO_OUTPUT_DIR="$STAGING" npx nuxt build

# Sanity: the staging build must have a server entry before we swap.
if [ ! -f "$STAGING/server/index.mjs" ]; then
  echo "[deploy] staging build incomplete ($STAGING/server/index.mjs missing); aborting, live site untouched." >&2
  exit 1
fi

# Cached HTML and already-open tabs can reference the previous generation's
# hashed chunks for up to an hour. Carry those immutable files into the fresh
# output before the swap so a rolling reload never strands an old client.
if [ -d "$APP_DIR/.output/public/_nuxt" ]; then
  log "Carrying previous Nuxt assets into the fresh build..."
  mkdir -p "$STAGING/public/_nuxt"
  cp -a -n "$APP_DIR/.output/public/_nuxt/." "$STAGING/public/_nuxt/"
  # Bound retained generations while leaving a wide margin over the 1h CDN TTL.
  #
  # This prune is close to a no-op and that is DELIBERATE — do not "fix" it
  # without reading this. Two things were measured on the server (2026-08-18):
  #
  #   1. `-mtime` counts whole 24h periods, so `+2` means "older than THREE
  #      days", not two. It matched 4 files out of 14.205. Lowering it to `+1`
  #      (older than two days) matched the same 4. Age in days is simply the
  #      wrong unit here.
  #   2. The tree is big because of deploy FREQUENCY, not age: ~14k files and
  #      407 MB, of which 13.411 were under a day old. Every deploy adds a
  #      generation of chunks and `cp -a -n` keeps their original mtimes.
  #
  # So bounding this meaningfully needs hours (`-mmin +360` would drop 11.362
  # files). That was left alone on purpose: `/root` has 130 GB free at 71% use,
  # so the 407 MB buys nothing, while a shorter window raises the chance of
  # 404ing a lazy chunk for a tab that was open or a laptop that was suspended.
  # The `rm -rf` this was blamed for turned out to be I/O contention with the
  # other pm2 jobs, not tree size, and it is off the critical path now anyway.
  find "$STAGING/public/_nuxt" -type f -mtime +2 -delete
fi

# Nuxt reserves /_nuxt for generated files, so copy compatibility assets after
# the build as well. These recover specific clients stranded by older deploys.
if [ -d "$APP_DIR/public/_nuxt" ]; then
  mkdir -p "$STAGING/public/_nuxt"
  cp -a "$APP_DIR/public/_nuxt/." "$STAGING/public/_nuxt/"
fi

log "Swapping staging build into .output…"
rm -rf "$PREV"
[ -d "$APP_DIR/.output" ] && mv "$APP_DIR/.output" "$PREV"
mv "$STAGING" "$APP_DIR/.output"

log "Rolling reload (pm2 reload, zero-downtime)…"
pm2 reload "$PM2_NAME" --update-env

# Delete the old tree DETACHED. By this line the swap and the rolling reload
# have already happened: the site is live on the new build and nothing below
# affects it. Measured on run 32086895800, this `rm -rf` was 1m35s of a 7m29s
# deploy job — CI sat blocked on a directory removal after the deploy was
# effectively done.
#
# Renamed to a unique path FIRST, then removed in the background: `$PREV` is a
# fixed path, so if the next deploy started while a background rm still held it,
# that deploy's `mv .output "$PREV"` would land inside a directory being
# deleted. Renaming frees the name synchronously and makes the race impossible.
#
# `setsid` detaches from the SSH session's process group so the removal survives
# the connection closing; without it the rm dies with the session and leaves the
# trash behind. The `|| nohup` fallback covers a box with no setsid, and the
# sweep of older `.output-trash-*` catches anything a reboot interrupted.
log "Cleaning previous build (detached)…"
if [ -d "$PREV" ]; then
  TRASH="$APP_DIR/.output-trash-$$"
  mv "$PREV" "$TRASH"
fi
if ls -d "$APP_DIR"/.output-trash-* >/dev/null 2>&1; then
  { setsid rm -rf "$APP_DIR"/.output-trash-* >/dev/null 2>&1 </dev/null ||
    nohup rm -rf "$APP_DIR"/.output-trash-* >/dev/null 2>&1 </dev/null; } &
  disown 2>/dev/null || true
fi

log "Deploy complete: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
