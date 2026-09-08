#!/usr/bin/env bash
# Keep immutable assets used by cached HTML and already-open tabs available.
# Run after Nuxt has finished writing assets; never rewrite them after linking.
set -euo pipefail

PREVIOUS="${1:?previous output directory required}"
STAGING="${2:?staging output directory required}"
COMPATIBILITY="${3:-}"
[ -d "$STAGING/public" ] || { echo 'Missing staging public directory' >&2; exit 1; }
STAGING="$(cd "$STAGING" && pwd -P)"
STAGING_ASSETS="$STAGING/public/_nuxt"
PREVIOUS_ASSETS="$PREVIOUS/public/_nuxt"

if [ -d "$PREVIOUS" ]; then
  PREVIOUS="$(cd "$PREVIOUS" && pwd -P)"
  PREVIOUS_ASSETS="$PREVIOUS/public/_nuxt"
  case "$STAGING/" in
    "$PREVIOUS/"*) echo 'Previous and staging output directories overlap' >&2; exit 1 ;;
  esac
  case "$PREVIOUS/" in
    "$STAGING/"*) echo 'Previous and staging output directories overlap' >&2; exit 1 ;;
  esac
fi

# Nuxt produces regular files. Do not carry a symlink that could point into an
# output generation removed after the reload, or follow one while copying.
for directory in "$PREVIOUS/public" "$STAGING/public"; do
  if [ -L "$directory" ]; then
    echo "Symlinks are not supported in client asset directories: $directory" >&2
    exit 1
  fi
done
for directory in "$PREVIOUS_ASSETS" "$STAGING_ASSETS" "$COMPATIBILITY"; do
  [ -n "$directory" ] || continue
  if [ -L "$directory" ] || { [ -d "$directory" ] && [ -n "$(find "$directory" -type l -print -quit)" ]; }; then
    echo "Symlinks are not supported in client asset directories: $directory" >&2
    exit 1
  fi
done

mkdir -p "$STAGING_ASSETS"
if [ -n "$COMPATIBILITY" ] && [ -d "$COMPATIBILITY" ]; then
  # Compatibility files have the same precedence as in deploy.sh. Unlink a
  # collision first, so rerunning this helper cannot overwrite a shared inode.
  cp -a --remove-destination "$COMPATIBILITY/." "$STAGING_ASSETS/"
fi
[ -d "$PREVIOUS_ASSETS" ] || exit 0

COPY_SKIP=--no-clobber
FILTER_EXISTING=0
if cp --update=none --help >/dev/null 2>&1; then
  COPY_SKIP=--update=none
else
  # Only 9.2 changed -n's status without providing --update=none. Keep earlier
  # GNU versions on the fast bulk-copy path instead of stat'ing each file in Bash.
  case "$(LC_ALL=C cp --version)" in
    "cp (GNU coreutils) 9.2"|"cp (GNU coreutils) 9.2"$'\n'*) FILTER_EXISTING=1 ;;
  esac
fi

eligible_files() {
  if [ "$FILTER_EXISTING" = 0 ]; then
    find . -type f ! -mtime +2 -print0
  else
    # Coreutils 9.2 returns failure for -n collisions but predates --update=none.
    # Exclude collisions before cp, including
    # any links created before a partial failure; no child process per file.
    find . -type f ! -mtime +2 -print0 |
      while IFS= read -r -d '' file; do
        if [ ! -e "$STAGING_ASSETS/$file" ] && [ ! -L "$STAGING_ASSETS/$file" ]; then
          printf '%s\0' "$file"
        fi
      done
  fi
}

carry() {
  (
    cd "$PREVIOUS_ASSETS"
    # Preserve the existing -mtime +2 rule: it means at least three whole days.
    # Filter before carrying so old compatibility-file timestamps are retained.
    # Batch copies in GNU cp instead of starting a process for every asset.
    eligible_files |
      xargs -0 -r cp -a "$COPY_SKIP" --parents "$@" -t "$STAGING_ASSETS"
  )
}

# Both generations normally share a filesystem. Hardlinks avoid copying every
# retained byte; unlinking an expired/previous generation leaves the other intact.
# A different filesystem or unsupported hardlinks falls back to ordinary copies.
# The skip option preserves fresh/compatibility files and successful partial links.
if ! carry --link 2>/dev/null; then
  echo '[deploy] Client asset hardlinks unavailable; copying missing assets.'
  carry
fi
