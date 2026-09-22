#!/usr/bin/env bash
# Holds the rentals flock (the same one run-rentals.sh takes) around the Marketplace barrio
# backfill, so it never interleaves with a harvest that is rewriting the same rows.
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_DIR"
exec 9>"${RENTALS_LOCK_FILE:-/tmp/cambio-uruguay-rentals-sync.lock}"
flock -w 600 -E 75 9
export RENTAL_FB_BARRIOS_LOCKED=1
exec node -r ts-node/register/transpile-only scripts/oneoff/backfill_rental_fb_neighborhoods.ts "$@"
