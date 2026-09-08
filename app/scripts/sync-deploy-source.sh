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

run_step() {
  local label="$1" started finished status
  shift
  started="$(date +%s%3N)"
  # Remote URLs can contain credentials. Keep Git's raw diagnostics out of CI
  # logs; the phase and exit code identify what needs attention on the host.
  if "$@" >/dev/null 2>&1; then
    status=0
  else
    status=$?
  fi
  finished="$(date +%s%3N)"
  printf '[deploy:source] %s: %d ms (exit %d).\n' \
    "$label" "$((finished - started))" "$status"
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
