#!/usr/bin/env bash
# Linux/pm2 entrypoint shared by the weekly full store-profile job and the nightly Reddit-only
# job. Both load APP DB `storeprofiles` once at start and write whole documents back — running
# at the same time lets whichever finishes first silently overwrite the other one's Reddit
# progress (Task 13 fix round 1, I1: a --reddit-only run can take up to ~4h on the full
# 900-call budget and still be going when the Sunday weekly job starts at 07:17 UTC). Keep the
# lock's descriptor open across exec: the kernel releases it when Node exits or crashes.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORES_LOCK="${STORES_LOCK_FILE:-/tmp/cambio-uruguay-store-profiles.lock}"
FULL_LOCK_WAIT_SECONDS="${STORES_FULL_LOCK_WAIT_SECONDS:-7200}"
REDDIT_ONLY=0
for argument in "$@"; do
  if [[ "$argument" == "--reddit-only" ]]; then REDDIT_ONLY=1; fi
done
cd "$REPO_DIR"

acquire_lock() {
  if [[ "$REDDIT_ONLY" == "1" ]]; then
    flock -n -E 75 9
  else
    # The weekly full run must not be silently canceled by an overlapping nightly Reddit-only
    # run: wait instead of skipping.
    flock -w "$FULL_LOCK_WAIT_SECONDS" -E 75 9
  fi
}

exec 9>"$STORES_LOCK"
if acquire_lock; then
  exec node dist/sync_store_profiles.js "$@"
else
  status=$?
  if [[ "$status" -eq 75 ]]; then
    if [[ "$REDDIT_ONLY" == "1" ]]; then
      echo "[tiendas] otra sincronización está en curso; se saltea la corrida de Reddit."
      exit 0
    fi
    echo "[tiendas] el barrido completo agotó la espera de ${FULL_LOCK_WAIT_SECONDS}s por el bloqueo; no se ejecutó." >&2
    exit 75
  fi
  echo "[tiendas] no se pudo adquirir el bloqueo ($STORES_LOCK); no se ejecuta la sincronización." >&2
  exit "$status"
fi
