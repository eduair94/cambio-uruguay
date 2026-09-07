#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_DIR"
exec 9>"${RENTALS_LOCK_FILE:-/tmp/cambio-uruguay-rentals-sync.lock}"
flock -w 60 -E 75 9
export RENTAL_GARAGE_LOCKED=1
exec node -r ts-node/register/transpile-only scripts/oneoff/backfill_rental_garages.ts "$@"
