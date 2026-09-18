#!/usr/bin/env bash
# La lectura de fichas corre cada hora y puede pasarse de la hora (lecturas + tanda de visión). Si la
# anterior sigue viva, esta se saltea: dos procesos leyendo Mercado Libre a la vez es exactamente lo
# que el presupuesto por corrida existe para evitar.
set -euo pipefail
cd "$(dirname "$0")/.."
LOCK="${AUTOS_DETAIL_LOCK:-/tmp/cambio-autos-detail.lock}"
exec 9>"$LOCK"
if flock -n 9; then
  exec node dist/sync_autos_detail.js "$@"
fi
echo "[autos-detail] otra lectura de fichas sigue en curso; se saltea esta ejecución."
exit 0
