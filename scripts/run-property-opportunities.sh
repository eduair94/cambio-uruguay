#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
exec 9>"/tmp/cambio-uruguay-property-opportunities.lock"
if ! flock -n 9; then
  echo '[opportunities] another analysis is in progress; skipping this run.'
  exit 0
fi
exec node dist/sync_property_opportunities.js "$@"
