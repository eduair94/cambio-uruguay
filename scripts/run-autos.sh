#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
exec 9>"/tmp/cambio-uruguay-autos.lock"
if ! flock -n 9; then
  echo '[autos] another used-car run is in progress; skipping this run.'
  exit 0
fi
exec node dist/sync_autos.js "$@"
