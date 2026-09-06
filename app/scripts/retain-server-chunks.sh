#!/usr/bin/env bash
# Keep the previous worker's lazy imports available during a rolling reload.
# Record the fresh generation BEFORE retention so old generations cannot pile up.
set -euo pipefail

PREVIOUS="${1:?previous output directory required}"
STAGING="${2:?staging output directory required}"
[ -d "$STAGING/server/chunks" ] || { echo 'Missing staging server chunks' >&2; exit 1; }

find "$STAGING/server/chunks" -type f -printf '%P\n' | LC_ALL=C sort > "$STAGING/server/chunks.manifest"
[ -d "$PREVIOUS/server/chunks" ] || exit 0

if [ -f "$PREVIOUS/server/chunks.manifest" ]; then
  manifest="$PREVIOUS/server/chunks.manifest"
else
  # First deployment of this guard: the old output has no retained generation.
  manifest="$STAGING/server/previous-chunks.manifest"
  find "$PREVIOUS/server/chunks" -type f -printf '%P\n' | LC_ALL=C sort > "$manifest"
fi

# --skip-old-files is essential: un-hashed runtime filenames also live in chunks/.
# The new runtime wins every collision; only missing lazy chunks are carried over.
tar -C "$PREVIOUS/server/chunks" -cf - -T "$manifest" |
  tar -C "$STAGING/server/chunks" --skip-old-files -xf -
