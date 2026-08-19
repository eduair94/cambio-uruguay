#!/usr/bin/env bash
#
# Zero-downtime deploy for the cambio-uruguay Nuxt app (pm2 cluster, 2 instances).
#
# Why this exists: the old `npm run build` ran `nuxt build` directly, which wipes
# `.output` at the start of the build while the live pm2 process is still serving
# from it -> every request 500s for the whole (~2 min) build. This script instead:
#   1. takes an flock so two deploys can never race the same `.output`,
#   2. builds into a STAGING dir (NITRO_OUTPUT_DIR) so the live `.output` keeps
#      serving untouched during the build,
#   3. atomically swaps the fresh build into place,
#   4. `pm2 reload` (rolling, not `restart`) so instances cycle one at a time,
#   5. verifies the app actually answers before calling the deploy good — the
#      reload's own exit code lies (see the comment at the reload step).
#
# Usage (on the server):  cd /root/cambio-uruguay/app && bash scripts/deploy.sh
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # .../app
REPO_DIR="$(cd "$APP_DIR/.." && pwd)"
PM2_NAME="cambio-uruguay"
# Puerto que sirve la app (app/ecosystem.config.cjs). Lo usa el health check del reload.
APP_PORT="${APP_PORT:-3311}"
STAGING="$APP_DIR/.output-next"
PREV="$APP_DIR/.output-prev"
LOCK="/tmp/cambio-uruguay-deploy.lock"

# Ruta absoluta y huella de ESTE archivo, tomadas antes de que el pull pueda cambiarlo.
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
SELF_SUM="$(sha256sum "$SELF" 2>/dev/null | cut -d' ' -f1 || true)"

# Marca interna del re-exec de mas abajo. No se setea a mano: evita el bucle y evita volver a pedir
# el flock, que ya esta tomado por el fd 9 que el exec hereda.
# Segunda pasada del re-exec de mas abajo. Va por ARGV y no por variable de entorno a proposito:
# una variable heredable que apaga el unico mutex del deploy es una forma silenciosa de correr dos
# deploys en paralelo si queda exportada en la shell de alguien.
REEXEC=0
if [ "${1:-}" = "--reexec" ]; then
  REEXEC=1
  shift
fi

log() { printf '
[1;36m[deploy][0m %s
' "$*"; }

# Espera a que la app conteste. Se exige mas de un 200 SEGUIDO porque el socket lo escucha el God
# daemon de pm2 y reparte round-robin: un solo 200 se contesta con una instancia arriba y la otra en
# crash-loop, o incluso con un worker huerfano sirviendo el build anterior.
wait_healthy() {
  local hits=0
  for _ in $(seq 1 40); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$APP_PORT/" || true)" = "200" ]; then
      hits=$((hits + 1))
      [ "$hits" -ge 3 ] && return 0
    else
      hits=0
    fi
    sleep 2
  done
  return 1
}

# 1. Serialize deploys — fail fast if one is already running.
#
# El lock se toma SIEMPRE, tambien en la segunda pasada. Medido en el box: un segundo `exec 9>`
# sobre el mismo archivo desde el mismo proceso NO se autobloquea, porque el dup2 cierra el fd 9
# anterior y suelta el lock antes de reabrirlo. Saltear esta seccion no evitaba ningun deadlock y
# dejaba el mutex apagable desde afuera.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[deploy] another deploy holds the lock ($LOCK); aborting." >&2
  exit 1
fi

cd "$APP_DIR"

if [ "$REEXEC" != "1" ]; then
  log "Pulling latest main…"
  # `npm install` (below, on prior deploys) can regenerate app/package-lock.json,
  # leaving the server tree dirty so the next ff-only pull aborts with "local
  # changes would be overwritten". Discard that tracked churn before pulling —
  # the committed lock is the source of truth.
  git -C "$REPO_DIR" checkout -- app/package-lock.json 2>/dev/null || true
  git -C "$REPO_DIR" pull --ff-only origin main
fi

# Este script se actualiza a si mismo, y sin esto el arreglo llega siempre un deploy tarde.
#
# Lo que NO pasa, y conviene dejarlo escrito porque es la intuicion equivocada: `git pull` no
# reescribe deploy.sh en el lugar, lo reemplaza por un inodo nuevo. El bash en ejecucion conserva el
# fd del inodo viejo (ya desenlazado) y lo lee entero. Verificado en el box: no hay corrupcion ni
# lineas partidas al medio.
#
# Lo que si pasa: esa corrida ejecuta la version ANTERIOR completa. Por eso el health check no
# corrio en el deploy que lo introdujo, ni el barrido de huerfanos en el suyo.
#
# Entonces, si el pull cambio este archivo, se arranca de nuevo con la version nueva. El centinela
# va en argv, el fd 9 se hereda pero igual se vuelve a tomar el lock, y si no hay sha256sum se sigue
# de largo en vez de adivinar.
if [ "$REEXEC" != "1" ] && [ -n "$SELF_SUM" ]; then
  now_sum="$(sha256sum "$SELF" 2>/dev/null | cut -d' ' -f1 || true)"
  if [ -n "$now_sum" ] && [ "$now_sum" != "$SELF_SUM" ]; then
    log "deploy.sh cambio en ese pull; reejecutando la version nueva."
    exec bash "$SELF" --reexec "$@"
  fi
fi

# Reinstall only when the dependency set actually changed.
#
# Most deploys are a page or a copy change and touch no dependency, but every
# one of them paid a full `npm install`. It is also what kept regenerating
# app/package-lock.json and leaving the server tree dirty — the churn the
# checkout above exists to undo.
#
# The stamp holds the hash of the two files that define the dependency set. The
# `node_modules` test is the safety catch: a missing or wiped tree reinstalls
# regardless of what the stamp says. Anything unexpected (no sha256sum, no
# stamp) falls through to installing, so the failure mode is "slow", never
# "builds against the wrong dependencies".
DEPS_STAMP="$APP_DIR/.deps-stamp"
DEPS_HASH=""
if command -v sha256sum >/dev/null 2>&1; then
  DEPS_HASH="$(cat package.json package-lock.json 2>/dev/null | sha256sum | cut -d' ' -f1)"
fi

if [ -n "$DEPS_HASH" ] && [ -d node_modules ] && [ -f "$DEPS_STAMP" ] &&
  [ "$(cat "$DEPS_STAMP")" = "$DEPS_HASH" ]; then
  log "Deps unchanged — skipping npm install."
else
  log "Installing deps (no-audit)…"
  npm install --no-audit --no-fund
  # An `if`, not `[ … ] && …`: under `set -e` a trailing `&&` that short-circuits
  # returns 1 and would abort the deploy on the machines with no sha256sum.
  if [ -n "$DEPS_HASH" ]; then
    printf '%s' "$DEPS_HASH" >"$DEPS_STAMP"
  fi
fi

log "Building into staging dir ($STAGING) — live .output keeps serving…"
rm -rf "$STAGING" "$APP_DIR/.nuxt"
# 8192 heap: 4096 OOM'd after firebase-auth landed (see memory/deploy notes).
NODE_OPTIONS="--max-old-space-size=8192" NITRO_OUTPUT_DIR="$STAGING" npx nuxt build

# Sanity: the staging build must have a server entry before we swap.
if [ ! -f "$STAGING/server/index.mjs" ]; then
  echo "[deploy] staging build incomplete ($STAGING/server/index.mjs missing); aborting, live site untouched." >&2
  exit 1
fi

# Cached HTML and already-open tabs can reference the previous generation's
# hashed chunks for up to an hour. Carry those immutable files into the fresh
# output before the swap so a rolling reload never strands an old client.
if [ -d "$APP_DIR/.output/public/_nuxt" ]; then
  log "Carrying previous Nuxt assets into the fresh build..."
  mkdir -p "$STAGING/public/_nuxt"
  cp -a -n "$APP_DIR/.output/public/_nuxt/." "$STAGING/public/_nuxt/"
  # Bound retained generations while leaving a wide margin over the 1h CDN TTL.
  #
  # This prune is close to a no-op and that is DELIBERATE — do not "fix" it
  # without reading this. Two things were measured on the server (2026-08-18):
  #
  #   1. `-mtime` counts whole 24h periods, so `+2` means "older than THREE
  #      days", not two. It matched 4 files out of 14.205. Lowering it to `+1`
  #      (older than two days) matched the same 4. Age in days is simply the
  #      wrong unit here.
  #   2. The tree is big because of deploy FREQUENCY, not age: ~14k files and
  #      407 MB, of which 13.411 were under a day old. Every deploy adds a
  #      generation of chunks and `cp -a -n` keeps their original mtimes.
  #
  # So bounding this meaningfully needs hours (`-mmin +360` would drop 11.362
  # files). That was left alone on purpose: `/root` has 130 GB free at 71% use,
  # so the 407 MB buys nothing, while a shorter window raises the chance of
  # 404ing a lazy chunk for a tab that was open or a laptop that was suspended.
  # The `rm -rf` this was blamed for turned out to be I/O contention with the
  # other pm2 jobs, not tree size, and it is off the critical path now anyway.
  find "$STAGING/public/_nuxt" -type f -mtime +2 -delete
fi

# Nuxt reserves /_nuxt for generated files, so copy compatibility assets after
# the build as well. These recover specific clients stranded by older deploys.
if [ -d "$APP_DIR/public/_nuxt" ]; then
  mkdir -p "$STAGING/public/_nuxt"
  cp -a "$APP_DIR/public/_nuxt/." "$STAGING/public/_nuxt/"
fi

log "Swapping staging build into .output…"
rm -rf "$PREV"
[ -d "$APP_DIR/.output" ] && mv "$APP_DIR/.output" "$PREV"
mv "$STAGING" "$APP_DIR/.output"

log "Rolling reload (pm2 reload, zero-downtime)…"
# `pm2 reload` walks the cluster by instance id, and its exit code is NOT a health
# signal. The app runs with `max_memory_restart: 500M` and the instances carry
# thousands of restarts, so one of them can be mid-restart exactly when the walk
# reaches it: pm2 prints "Process N not found" and exits 1 while every instance
# ends up online and serving.
#
# Measured on run 32304404391: instance 21 reloaded fine, 22 was "not found",
# `set -e` killed the script, CI went red — and the app was serving the new build
# the whole time (both instances online, 79s uptime). The real damage was the
# steps BELOW never running, so the previous build's tree was left on disk.
#
# So: tolerate the reload's exit code and gate on whether the app answers.
# `9>&-` cierra el fd del lock para el hijo. Sin eso, si pm2 tiene que levantar su God daemon,
# el daemon hereda el fd y se queda con el lock del deploy PARA SIEMPRE: todos los deploys
# siguientes abortarian con "another deploy holds the lock".
pm2 reload "$PM2_NAME" --update-env 9>&- || log "pm2 reload exited non-zero; the health check below decides."

log "Waiting for the app to answer on :$APP_PORT…"
if ! wait_healthy; then
  echo "[deploy] the app never returned 200 on 127.0.0.1:$APP_PORT after the reload." >&2
  pm2 list | grep -- "$PM2_NAME" >&2 || true
  exit 1
fi
log "App is answering 200. Reload OK."

# Huérfanos: el fallo que el health check de arriba NO ve.
#
# Cuando un `pm2 reload` se corta por la mitad (ver el comentario anterior), los workers viejos
# pueden quedar corriendo SIN que pm2 los conozca, y siguen recibiendo tráfico por el socket
# compartido del cluster. Traen el `server.mjs` anterior en memoria, que referencia chunks de ruta
# que el swap ya borró: el resultado es un 500 INTERMITENTE y sólo en las rutas que cambiaron —
# la home sigue respondiendo 200, así que el chequeo de arriba pasa igual.
#
# Medido el 2026-08-19: dos workers huérfanos de 21 minutos sirviendo el build anterior hacían
# fallar la mitad de los requests a una página nueva, con
# "Cannot find module .../me-cobran-algo-que-no-autorice-<hash viejo>.mjs" en el log.
#
# El patrón de búsqueda va anclado a $APP_DIR a propósito: en este box hay OTRA app Nuxt con el
# mismo nombre de archivo (/root/Cedulas-Uruguay/app/.output/server/index.mjs) que no hay que tocar.
# Y sólo se matan procesos de más de 60 s, para no llevarse por delante un worker que pm2 acaba de
# levantar y todavía no registró.
log "Looking for orphaned workers from a previous failed reload…"
pm2_pids="$(pm2 jlist 2>/dev/null | grep -o '"pid":[0-9][0-9]*' | grep -o '[0-9][0-9]*' | tr '\n' ' ' || true)"
if [ -n "${pm2_pids// /}" ]; then
  for pid in $(pgrep -f "$APP_DIR/.output/server/index.mjs" || true); do
    case " $pm2_pids " in
      *" $pid "*) continue ;;
    esac
    age="$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ')"
    [ -n "$age" ] || continue
    [ "$age" -gt 60 ] || continue
    log "Killing orphaned worker $pid (${age}s old, unknown to pm2)."
    kill -TERM "$pid" 2>/dev/null || true
  done
else
  log "Could not read pm2's pid list; skipping the orphan sweep rather than killing blind."
fi

# Y se vuelve a preguntar, porque el 200 de arriba lo pudo haber contestado un huerfano.
#
# Es el escenario que deja CI en verde con el sitio caido: si los workers nuevos crashean y el unico
# que contestaba era un huerfano, el barrido lo mata y sin esta segunda vuelta el script seguiria,
# borraria el build anterior y loguearia "Deploy complete" con exit 0.
log "Re-checking health after the orphan sweep…"
if ! wait_healthy; then
  echo "[deploy] the app stopped answering after killing orphans: the earlier 200 came from one." >&2
  pm2 list | grep -- "$PM2_NAME" >&2 || true
  exit 1
fi
log "Still answering 200 with only pm2's own workers."

# Delete the old tree DETACHED. By this line the swap and the rolling reload
# have already happened: the site is live on the new build and nothing below
# affects it. Measured on run 32086895800, this `rm -rf` was 1m35s of a 7m29s
# deploy job — CI sat blocked on a directory removal after the deploy was
# effectively done.
#
# Renamed to a unique path FIRST, then removed in the background: `$PREV` is a
# fixed path, so if the next deploy started while a background rm still held it,
# that deploy's `mv .output "$PREV"` would land inside a directory being
# deleted. Renaming frees the name synchronously and makes the race impossible.
#
# `setsid` detaches from the SSH session's process group so the removal survives
# the connection closing; without it the rm dies with the session and leaves the
# trash behind. The `|| nohup` fallback covers a box with no setsid, and the
# sweep of older `.output-trash-*` catches anything a reboot interrupted.
log "Cleaning previous build (detached)…"
if [ -d "$PREV" ]; then
  TRASH="$APP_DIR/.output-trash-$$"
  mv "$PREV" "$TRASH"
fi
if ls -d "$APP_DIR"/.output-trash-* >/dev/null 2>&1; then
  # `9>&-` otra vez, y aca es el que rompia deploys de verdad: este rm tarda ~1m35s y el hijo
  # heredaba el fd 9, asi que el lock seguia tomado despues de que deploy.sh salio. Con
  # `cancel-in-progress: false` los deploys se ENCOLAN, y el siguiente entraba justo en esa ventana
  # y abortaba. Reproducido en el box: sin `9>&-` el lock queda tomado por el hijo detached.
  { setsid rm -rf "$APP_DIR"/.output-trash-* >/dev/null 2>&1 </dev/null ||
    nohup rm -rf "$APP_DIR"/.output-trash-* >/dev/null 2>&1 </dev/null; } 9>&- &
  disown 2>/dev/null || true
fi

log "Deploy complete: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
