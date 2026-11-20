#!/usr/bin/env bash
# Synchronize deploy sources while the caller holds the repository's deploy lock.
# Fetch only the requested branch, then merge its exact commit without allowing
# Git's optional maintenance or an inherited autostash setting onto this path.
set -euo pipefail

REPO_DIR="${1:-}"
if [ "$#" -ne 1 ] || [[ "$REPO_DIR" != /* ]] || [ ! -d "$REPO_DIR" ]; then
  printf '[deploy:source] expected one absolute repository directory.\n' >&2
  exit 2
fi

# Milliseconds from a monotonic clock. The wall clock can step backwards while a
# phase runs (NTP on a CI runner printed "Fast-forward merge: -860 ms"), so the
# phase time comes from /proc/uptime and only falls back to `date` without it.
monotonic_ms() {
  local uptime _
  if read -r uptime _ </proc/uptime 2>/dev/null && [[ "$uptime" =~ ^([0-9]+)\.([0-9]{2})$ ]]; then
    printf '%d\n' "$((10#${BASH_REMATCH[1]} * 1000 + 10#${BASH_REMATCH[2]} * 10))"
  else
    date +%s%3N
  fi
}

run_step() {
  local label="$1" started finished status elapsed
  shift
  started="$(monotonic_ms)"
  # Remote URLs can contain credentials. Keep Git's raw diagnostics out of CI
  # logs; the phase and exit code identify what needs attention on the host.
  if "$@" >/dev/null 2>&1; then
    status=0
  else
    status=$?
  fi
  finished="$(monotonic_ms)"
  elapsed=$((finished - started))
  if [ "$elapsed" -lt 0 ]; then
    elapsed=0
  fi
  printf '[deploy:source] %s: %d ms (exit %d).\n' \
    "$label" "$elapsed" "$status"
  if [ "$status" -ne 0 ]; then
    printf '[deploy:source] %s failed; source synchronization stopped.\n' "$label" >&2
  fi
  return "$status"
}

restore_lockfile() {
  local tracked
  tracked="$(git -C "$REPO_DIR" ls-files -- app/package-lock.json)" || return
  # npm install can dirty this tracked lockfile. Preserve the prior deploy's
  # index-based checkout, and leave every other local file untouched. A checkout
  # failure is fatal; only a lockfile absent from the index needs no cleanup.
  if [ -n "$tracked" ]; then
    git -C "$REPO_DIR" checkout -- app/package-lock.json
  fi
}

TARGET_COMMIT=""
resolve_fetched_commit() {
  TARGET_COMMIT="$(git -C "$REPO_DIR" rev-parse --verify 'FETCH_HEAD^{commit}')"
}

run_step 'Lockfile cleanup' restore_lockfile
run_step 'Fetch main' git -C "$REPO_DIR" -c maintenance.auto=false -c gc.auto=0 \
  fetch --no-tags origin main
run_step 'Resolve fetched commit' resolve_fetched_commit
run_step 'Fast-forward merge' git -C "$REPO_DIR" \
  -c maintenance.auto=false -c gc.auto=0 -c merge.autoStash=false \
  merge --ff-only "$TARGET_COMMIT"
