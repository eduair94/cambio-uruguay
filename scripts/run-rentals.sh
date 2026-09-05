#!/usr/bin/env bash
# Linux/pm2 entrypoint shared by the full and hourly rental jobs. Keep the lock's
# descriptor open across exec: the kernel releases it when Node exits or crashes.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RENTAL_LOCK="${RENTALS_LOCK_FILE:-/tmp/cambio-uruguay-rentals-sync.lock}"
FULL_LOCK_WAIT_SECONDS="${RENTALS_FULL_LOCK_WAIT_SECONDS:-3600}"
FAST="${RENTALS_FAST:-0}"
for argument in "$@"; do
  if [[ "$argument" == "--fast" ]]; then FAST=1; fi
done
cd "$REPO_DIR"

acquire_lock() {
  if [[ "$FAST" == "1" ]]; then
    flock -n -E 75 9
  else
    # The hourly job starts five minutes before the daily sweep. Waiting here
    # prevents a slow hourly refresh from silently canceling the entire day's sweep.
    flock -w "$FULL_LOCK_WAIT_SECONDS" -E 75 9
  fi
}

exec 9>"$RENTAL_LOCK"
if acquire_lock; then
  exec node dist/sync_rentals.js "$@"
else
  status=$?
  if [[ "$status" -eq 75 ]]; then
    if [[ "$FAST" == "1" ]]; then
      echo "[rentals] otra sincronización está en curso; se saltea esta ejecución horaria."
      exit 0
    fi
    echo "[rentals] el barrido completo agotó la espera de ${FULL_LOCK_WAIT_SECONDS}s por el bloqueo; no se ejecutó." >&2
    exit 75
  fi
  echo "[rentals] no se pudo adquirir el bloqueo ($RENTAL_LOCK); no se ejecuta la sincronización." >&2
  exit "$status"
fi
