#!/usr/bin/env bash
# La lectura de fichas de Facebook corre cada hora y comparte el Chrome del perfil con autos. Si la
# anterior sigue viva, esta se saltea: el presupuesto por corrida existe para no solaparse.
set -euo pipefail
cd "$(dirname "$0")/.."
LOCK="${RENTALS_DETAIL_LOCK:-/tmp/cambio-rentals-detail.lock}"
exec 9>"$LOCK"
if flock -n 9; then
  exec node dist/sync_rentals_detail.js "$@"
fi
echo "[rentals-detail] otra lectura de fichas sigue en curso; se saltea esta ejecución."
exit 0
