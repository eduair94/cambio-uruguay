#!/usr/bin/env bash
# Linux/pm2 entrypoint shared by the full and hourly used-car jobs. Keep the lock's
# descriptor open across exec: the kernel releases it when Node exits or crashes.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTOS_LOCK="${AUTOS_LOCK_FILE:-/tmp/cambio-uruguay-autos.lock}"
FULL_LOCK_WAIT_SECONDS="${AUTOS_FULL_LOCK_WAIT_SECONDS:-3600}"
FAST="${AUTOS_FAST:-0}"
for argument in "$@"; do
  if [[ "$argument" == "--fast" ]]; then FAST=1; fi
done
cd "$REPO_DIR"

acquire_lock() {
  if [[ "$FAST" == "1" ]]; then
    flock -n -E 75 9
  else
    # The hourly job starts five minutes before the daily sweep, and its own harvest
    # plus detail reads can run long. Waiting here prevents a slow hourly refresh from
    # silently canceling the entire day's sweep.
    flock -w "$FULL_LOCK_WAIT_SECONDS" -E 75 9
  fi
}

exec 9>"$AUTOS_LOCK"
if acquire_lock; then
  exec node dist/sync_autos.js "$@"
else
  status=$?
  if [[ "$status" -eq 75 ]]; then
    if [[ "$FAST" == "1" ]]; then
      echo "[autos] otra sincronización está en curso; se saltea esta ejecución horaria."
      exit 0
    fi
    echo "[autos] el barrido completo agotó la espera de ${FULL_LOCK_WAIT_SECONDS}s por el bloqueo; no se ejecutó." >&2
    exit 75
  fi
  echo "[autos] no se pudo adquirir el bloqueo ($AUTOS_LOCK); no se ejecuta la sincronización." >&2
  exit "$status"
fi
