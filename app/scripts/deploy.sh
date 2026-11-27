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
# Since 2026-11-27 CI does NOT call it that way: the `deploy` job of .github/workflows/deploy.yml
# builds on a GitHub runner and uses the two other modes. The plain call above is still the manual
# fallback (it builds here, on the server).
#
#   bash scripts/deploy.sh --check <fingerprint>
#       Sync the tree, then only decide. Prints `DEPLOY_DECISION=skip` when the live build already
#       has that fingerprint and answers 200, `DEPLOY_DECISION=build` otherwise. Builds nothing,
#       installs nothing.
#   bash scripts/deploy.sh --artifact <file.tgz> --fingerprint <fingerprint> --sha256 <sum>
#       Publish an `.output` built elsewhere: the same validation, swap, reload and health checks as
#       a build made here, with the unpacked tarball in place of `nuxt build`.
#
# Why the build left the server: from 2026-11-26 16:30 to 27/11 three builds in a row stalled for
# hours in the Nitro stage, with the box at 56-57 of 62 GB used by other projects and 13-16 GB in
# swap. The same build takes under 6 minutes on a runner.
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

# `--force` (lo pasa el input `force` del workflow_dispatch): compilar aunque la huella de abajo
# coincida con la del build vivo. Viaja en "$@" y el re-exec lo conserva.
#
# `--check` y `--artifact` (ver el encabezado) también viajan en "$@". Se parsean en una función
# para no consumir el "$@" del script, que el re-exec necesita entero. Sin arreglos: en el bash 4.2
# de CentOS 7, un arreglo vacío con `set -u` aborta.
#
# Un deploy.sh VIEJO que recibe `--check` o `--artifact` no los entiende, pero no hace nada con ellos
# antes del re-exec: toma el lock, sincroniza el árbol (que trae esta versión) y se reejecuta. Por
# eso el primer deploy que estrena estos modos no compila en el servidor por accidente.
FORCE_BUILD=0
DEPLOY_MODE=build
GIVEN_FINGERPRINT=""
ARTIFACT=""
ARTIFACT_SHA256=""
parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --force) FORCE_BUILD=1 ;;
      --check | --artifact | --fingerprint | --sha256)
        if [ "$#" -lt 2 ]; then
          printf '[deploy] %s needs a value.\n' "$1" >&2
          exit 2
        fi
        case "$1" in
          --check) DEPLOY_MODE=check; GIVEN_FINGERPRINT="$2" ;;
          --artifact) DEPLOY_MODE=artifact; ARTIFACT="$2" ;;
          --fingerprint) GIVEN_FINGERPRINT="$2" ;;
          --sha256) ARTIFACT_SHA256="$2" ;;
        esac
        shift
        ;;
      *)
        printf '[deploy] unknown argument: %s\n' "$1" >&2
        exit 2
        ;;
    esac
    shift
  done
}
parse_args "$@"

is_sha256() { [[ "$1" =~ ^[0-9a-f]{64}$ ]]; }
if [ "$DEPLOY_MODE" != "build" ] && ! is_sha256 "$GIVEN_FINGERPRINT"; then
  echo "[deploy] --$DEPLOY_MODE needs a 64-hex fingerprint." >&2
  exit 2
fi
if [ "$DEPLOY_MODE" = "artifact" ]; then
  if [ ! -f "$ARTIFACT" ] || ! is_sha256 "$ARTIFACT_SHA256"; then
    echo "[deploy] --artifact needs an existing file and --sha256 <64 hex>." >&2
    exit 2
  fi
fi

log() { printf '
[1;36m[deploy][0m %s
' "$*"; }

# Report phase costs without printing command arguments or environment variables.
timed() {
  local label="$1" started="$SECONDS" status
  shift
  log "$label…"
  if "$@"; then
    log "$label completed in $((SECONDS - started))s."
  else
    status=$?
    log "$label failed after $((SECONDS - started))s (exit $status)."
    return "$status"
  fi
}

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

# El build pesa hasta 8 GB de heap y satura CPU (ver memoria de deploy). Si el box ya esta caliente
# -por ejemplo resucitando pm2 despues de un reboot, load average 40+ con 260 apps- sumarle un build
# encima es lo que motivo esta guarda. No aborta el deploy: espera con un tope y sigue igual, porque
# un deploy mas lento es mejor que dejar el prod sirviendo un build viejo (ver "CI deploy broken" en
# la memoria de deploy.md).
wait_for_load() {
  local cores threshold load1 waited=0 max_wait=600
  cores="$(nproc 2>/dev/null || echo 1)"
  threshold="$(awk -v c="$cores" 'BEGIN{printf "%.2f", c*1.5}')"
  while :; do
    load1="$(cut -d' ' -f1 /proc/loadavg 2>/dev/null || echo 0)"
    if ! awk -v l="$load1" -v t="$threshold" 'BEGIN{exit !(l>t)}'; then
      [ "$waited" -gt 0 ] && log "Load back to $load1 (threshold $threshold) — proceeding with the build."
      return 0
    fi
    if [ "$waited" -ge "$max_wait" ]; then
      log "Load still $load1 (threshold $threshold, ${cores} cores) after ${max_wait}s — building anyway."
      return 0
    fi
    log "Load $load1 over threshold $threshold (${cores} cores) — waiting before the build (${waited}s so far)…"
    sleep 30
    waited=$((waited + 30))
  done
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
  bash "$APP_DIR/scripts/sync-deploy-source.sh" "$REPO_DIR"
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

# El tarball del build de CI lleva app/.env horneado en el servidor de Nitro (claves incluidas): no
# se deja en el disco, salga bien o mal el deploy. Va después del re-exec porque `exec` no conserva
# los traps, y la segunda pasada lo vuelve a poner.
if [ "$DEPLOY_MODE" = "artifact" ]; then
  trap 'rm -f -- "$ARTIFACT"' EXIT
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

install_deps() {
  timed "Install dependencies" npm install --force --no-audit --no-fund
  # An `if`, not `[ … ] && …`: under `set -e` a trailing `&&` that short-circuits
  # returns 1 and would abort the deploy on the machines with no sha256sum.
  if [ -n "$DEPS_HASH" ]; then
    printf '%s' "$DEPS_HASH" >"$DEPS_STAMP"
  fi
}

# `--artifact` también instala, y no por el build: el servidor de Nitro NO es autocontenido
# (`nitro.externals.trace: false` en nuxt.config) e importa vue, mongoose, firebase-admin y unos 40
# paquetes más desde app/node_modules DE ESTE BOX, por ruta absoluta. Un build hecho en CI corre
# entonces contra estos node_modules, que tienen que ser los del mismo lockfile (lo confirma
# scripts/externals-versions.mjs más abajo, antes del swap).
if [ "$DEPLOY_MODE" = "check" ]; then
  log "--check: sólo se decide; no se instala nada."
elif [ -n "$DEPS_HASH" ] && [ -d node_modules ] && [ -f "$DEPS_STAMP" ] &&
  [ "$(cat "$DEPS_STAMP")" = "$DEPS_HASH" ]; then
  log "Deps unchanged — skipping npm install."
else
  install_deps
fi

# Huella de todo lo que decide qué sale del build, y salto cuando ya está sirviendo.
#
# Nuxt no tiene build incremental de producción: cada `nuxt build` arranca de cero (~12 min y hasta
# 12 GB de heap en este box). Lo que sí se puede es no compilar lo que ya está compilado. El
# workflow_dispatch del automerge llama a este script en CADA PR, toque o no `app/`, y una ráfaga
# de merges encola varios runs que construyen el mismo `main`: de los 40 PRs anteriores al
# 2026-11-23, 14 no tocaban `app/` y los 40 pagaron el build entero.
#
# Entra a la huella todo lo que el build lee: el árbol de `app/` en el commit (incluye este script,
# nuxt.config, i18n y el lockfile), el estado de las deps, la versión de Node y `app/.env` (Nuxt lo
# hornea al compilar y vive fuera de git; sólo su hash, nunca el contenido). Se guarda DENTRO de
# `.output` al publicar, así que viaja con el build que describe: un build fallido no la toca y un
# `.output` borrado o reemplazado a mano no tiene huella y se recompila.
#
# Lo que no puede salir mal en silencio: si cualquier parte no se puede calcular la huella queda
# vacía y se compila (lento, nunca viejo); si la app no contesta 200 se compila igual; y `--force`
# compila siempre.
BUILD_STAMP=".build-fingerprint"
build_fingerprint() {
  local tree node_version env_sum=none
  command -v sha256sum >/dev/null 2>&1 || return 0
  [ -n "$DEPS_HASH" ] || return 0
  tree="$(git -C "$REPO_DIR" rev-parse --verify -q 'HEAD:app' 2>/dev/null)" || return 0
  [ -n "$tree" ] || return 0
  node_version="$(node --version 2>/dev/null)" || return 0
  if [ -f "$APP_DIR/.env" ]; then
    env_sum="$(sha256sum "$APP_DIR/.env" | cut -d' ' -f1)"
  fi
  printf 'app-tree=%s deps=%s node=%s env=%s\n' "$tree" "$DEPS_HASH" "$node_version" "$env_sum" |
    sha256sum | cut -d' ' -f1
}
#
# Con `--check` y `--artifact` la huella la trae quien compila (el job de CI), calculada con esta
# misma receta sobre el mismo commit, el mismo lockfile y el mismo app/.env, que baja de acá. Lo
# único que cambia es la versión de Node, que es la del runner: el primer build de CI nunca coincide
# con uno hecho acá, y eso está bien (compila una vez de más, nunca saltea de menos).
if [ -n "${GIVEN_FINGERPRINT:-}" ]; then
  FINGERPRINT="$GIVEN_FINGERPRINT"
else
  FINGERPRINT="$(build_fingerprint || true)"
fi
LIVE_FINGERPRINT="$(cat "$APP_DIR/.output/$BUILD_STAMP" 2>/dev/null || true)"

if [ "$FORCE_BUILD" = "1" ]; then
  log "--force: se compila aunque la huella coincida."
elif [ "${DEPLOY_MODE:-build}" = "artifact" ]; then
  # CI ya preguntó con `--check` antes de compilar; acá se publica lo que mandó.
  log "Build hecho en CI (huella ${FINGERPRINT:0:12}): se publica sin compilar en el servidor."
elif [ -n "$FINGERPRINT" ] && [ "$FINGERPRINT" = "$LIVE_FINGERPRINT" ] &&
  [ -f "$APP_DIR/.output/server/index.mjs" ]; then
  log "app/ sin cambios respecto del build que está sirviendo (huella ${FINGERPRINT:0:12}); si contesta 200, no hay nada que compilar."
  if wait_healthy; then
    # Ni purga de borde ni IndexNow: no cambió nada que servir. (Y no se escribe "Deploy complete":
    # los tests de orden ubican la purga respecto de esa línea, la del final.)
    # El job de CI lee esta línea para no compilar.
    log "DEPLOY_DECISION=skip"
    log "Listo sin compilar: el build vivo ya corresponde a $(git -C "$REPO_DIR" rev-parse --short HEAD)."
    exit 0
  fi
  log "Misma huella pero la app no contesta 200 en :$APP_PORT; se compila igual."
fi

if [ "${DEPLOY_MODE:-build}" = "check" ]; then
  log "DEPLOY_DECISION=build"
  exit 0
fi

timed "Clear staging and generated build files" rm -rf "$STAGING" "$APP_DIR/.nuxt"

# Publish a build made in CI: verify it arrived whole, unpack it where `nuxt build` would have
# written, and confirm that the packages its server imports from app/node_modules are the versions
# it was built against. Any failure here aborts before the swap, with the live site untouched.
unpack_artifact() {
  local sum
  sum="$(sha256sum "$ARTIFACT" | cut -d' ' -f1)"
  if [ "$sum" != "$ARTIFACT_SHA256" ]; then
    echo "[deploy] the artifact's sha256 is not the one CI sent (truncated upload?); aborting, live site untouched." >&2
    return 1
  fi
  mkdir -p "$STAGING"
  tar -xzf "$ARTIFACT" -C "$STAGING" --no-same-owner
}
check_externals() {
  if node "$APP_DIR/scripts/externals-versions.mjs" check "$STAGING"; then
    return 0
  fi
  # The stamp can say "unchanged" over a tree someone touched by hand. One reinstall from the
  # lockfile, then the verdict stands.
  log "app/node_modules no tiene las versiones del build; se reinstala una vez desde el lockfile."
  install_deps
  node "$APP_DIR/scripts/externals-versions.mjs" check "$STAGING"
}

if [ "$DEPLOY_MODE" = "artifact" ]; then
  timed "Unpack the build made in CI" unpack_artifact
  timed "Check the server's external packages" check_externals
else
  wait_for_load
  # 12288 heap: 4096 OOM'd after firebase-auth landed, and 8192 stopped fitting with the Nuxt 4.4 upgrade
  # (2026-09-30): the build's peak climbed from ~9.4 GB to ~10.6 GB RSS, most of it retained into the Nitro
  # stage, and a CentOS 7 / Node 22.14 replica of this box ran out of heap at 8192 and built at 10240.
  # 10240 then ran out 3 minutes into the Nitro stage on 2026-11-05 (#241: 35 locales on every route, the
  # i18n route resources ~10x larger) while main's own Nitro stage was finishing right at the limit. The box
  # has 62 GB, ~15 GB available and 27 GB of free swap while serving.
  #
  # Prioridad baja de CPU y disco: el build comparte el box con la app que sirve, la API y ~260 jobs de
  # pm2. Con el box ocioso `nice` no cuesta nada (32 cores); cuando hay competencia, cede el build y no
  # el sitio. `ionice` se usa si existe; `nice` es de coreutils y siempre está (y así el arreglo nunca
  # queda vacío, que en el bash 4.2 de CentOS 7 con `set -u` aborta).
  LOW_PRIORITY=(nice -n 10)
  if command -v ionice >/dev/null 2>&1; then
    LOW_PRIORITY+=(ionice -c2 -n7)
  fi
  timed "Build staging output" "${LOW_PRIORITY[@]}" env NODE_OPTIONS="--max-old-space-size=12288" NITRO_OUTPUT_DIR="$STAGING" npx nuxt build
fi

# Sanity: the staging build must have a server entry before we swap.
if [ ! -f "$STAGING/server/index.mjs" ]; then
  echo "[deploy] staging build incomplete ($STAGING/server/index.mjs missing); aborting, live site untouched." >&2
  exit 1
fi

# A listening socket is not proof of working SSR. Validate the complete candidate
# on a separate port BEFORE touching live output or asking PM2 to reload.
timed "Check candidate SSR before the swap" node "$APP_DIR/scripts/check-staging.cjs" "$STAGING"

# La huella entra al candidato recién validado y no antes: si algo de aquí en adelante aborta, el
# `.output` vivo conserva la suya y el próximo deploy vuelve a compilar.
if [ -n "$FINGERPRINT" ]; then
  printf '%s\n' "$FINGERPRINT" >"$STAGING/$BUILD_STAMP"
fi

# The old workers still serve requests until each replacement has rendered SSR
# and signalled ready. Their lazy server imports resolve through .output, too:
# swapping only client assets stranded them between the swap and the reload.
timed "Retain previous server chunks" bash "$APP_DIR/scripts/retain-server-chunks.sh" "$APP_DIR/.output" "$STAGING"

# Reuse immutable client files while preserving the three-day retention window.
# Compatibility overrides go first so no later copy can modify a live hardlink.
timed "Retain previous client assets" bash "$APP_DIR/scripts/retain-client-assets.sh" \
  "$APP_DIR/.output" "$STAGING" "$APP_DIR/public/_nuxt"

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
# `startOrReload <ecosystem>` y no `reload <nombre>`: el segundo recarga el CÓDIGO y el env pero NO
# relee ecosystem.config.cjs, así que ningún cambio de ese archivo llega nunca al runtime. Se vio
# con `max_memory_restart`: el archivo dice 900M desde el 2026-08-19 y `pm2 jlist` seguía
# devolviendo 524288000 (500 MiB) el 2026-09-03, con las instancias reiniciándose ~113 veces por día
# por superar el techo viejo. Es la misma clase de deriva que 6c5fda6 arregló para el cron de los
# jobs del backend.
#
# Vale para cualquier campo futuro, no sólo ese. El archivo declara UNA sola app, así que
# startOrReload no toca nada más, y para una app que ya corre hace la misma recarga gradual.
pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env 9>&- || log "pm2 startOrReload exited non-zero; the health check below decides."

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

# Purga la caché de borde después del swap.
#
# POR QUÉ ACÁ Y NO ANTES: recién en esta línea el sitio está confirmado sirviendo el build nuevo
# con los workers de pm2 y sin huérfanos. Purgar antes repoblaría el borde desde un build que
# todavía podía no quedar.
#
# POR QUÉ HAY QUE PURGAR: desde que `routeRules` declara `s-maxage` por familia (guías, glosario,
# comparativas e importar 24 h; casa/sucursales 1 h; histórico/cotización 10 min; páginas de
# pregunta 6 h), Cloudflare guarda HTML hasta un día, y ese HTML nombra `_nuxt/<hash>.js` que
# este deploy acaba de renombrar. Sin la purga, el borde reproduce solo el daño de
# docs/app/LOADING_INCIDENT_2026-09-06.md: 45 scripts que 404 y una pestaña que gira.
# `purge_everything` y no por prefijo porque la purga por prefijo es Enterprise; el costo es un
# pico de origen para assets que estaban bien, y es barato.
#
# NO ABORTA EL DEPLOY: a esta altura el sitio ya está arriba; una purga fallida es caché viejo, no
# un sitio caído. Por eso la llamada va con `|| true` (el script corre con `set -e`) y la función
# devuelve 0 en todas sus salidas. El token sale del `.env` de la raíz (el mismo archivo que lee
# scripts/oneoff/cf_traffic_report.ts con dotenv) y NUNCA se imprime: sólo se loguea el código HTTP.
# `tests/unit/deployEdgePurge.test.ts` vigila las tres cosas.
purge_edge_cache() {
  local env_file="$REPO_DIR/.env" token zone code
  if [ ! -r "$env_file" ]; then
    log "Sin $env_file legible; se saltea la purga de borde."
    return 0
  fi
  # Sólo estas dos claves y sólo dentro de esta función: no se exporta nada al resto del deploy.
  # Se corta después del `=` (la primera aparición, como hace dotenv), se tolera un CR de Windows y
  # se sacan comillas envolventes por si alguien las puso.
  token="$(sed -n 's/^[[:space:]]*CLOUDFLARE_TOKEN[[:space:]]*=[[:space:]]*//p' "$env_file" | head -n1 | tr -d '\r')"
  token="${token%\"}"; token="${token#\"}"; token="${token%\'}"; token="${token#\'}"
  zone="$(sed -n 's/^[[:space:]]*CLOUDFLARE_ZONE_ID[[:space:]]*=[[:space:]]*//p' "$env_file" | head -n1 | tr -d '\r')"
  zone="${zone%\"}"; zone="${zone#\"}"
  # La zona de cambio-uruguay.com. NO es un secreto (identifica, no autoriza): es la misma que
  # scripts/oneoff/cf_traffic_report.ts trae de respaldo, y el .env de producción no la declara.
  zone="${zone:-fcd8289e0c93d7f889d8cd583929a4e5}"
  if [ -z "$token" ]; then
    log "Sin CLOUDFLARE_TOKEN en el .env; se saltea la purga de borde."
    return 0
  fi
  # `-s -o /dev/null -w '%{http_code}'`: la respuesta no se imprime y el token viaja sólo en la
  # cabecera. Una conexión que no llega devuelve "000", no vacío.
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST \
    "https://api.cloudflare.com/client/v4/zones/$zone/purge_cache" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    --data '{"purge_everything":true}' || true)"
  if [ "$code" = "200" ]; then
    log "Caché de borde purgada (purge_everything)."
  else
    log "La purga de borde devolvió HTTP ${code:-sin respuesta}; el deploy sigue igual."
  fi
  return 0
}
purge_edge_cache || true

# IndexNow (Bing/Yandex y los motores que comparten el protocolo; Google NO lo lee): avisa que las
# URLs del sitemap en español cambiaron. Va DESPUES del segundo wait_healthy a proposito: recien
# aca sabemos que el build nuevo es el que contesta, y avisar antes seria anunciar URLs que todavia
# sirve el build viejo. Inerte hasta INDEXNOW_ENABLED=1 (entorno o app/.env): desplegar el archivo
# no puede, por si solo, empezar a llamar a un tercero.
#
# `|| log`: bajo `set -e`, un 4xx de api.indexnow.org pondria en rojo un deploy ya swapeado y sano,
# la misma clase de bug que el `pm2 startOrReload ... || log` de arriba. `9>&-`: el hijo no hereda
# el flock del deploy (ver los dos comentarios sobre el fd 9). El script nunca sale distinto de 0,
# pero la guarda queda por si algun dia lo hace. Tripwire: app/tests/unit/deployIndexNow.test.ts.
log "IndexNow: submitting the es-ES sitemap (no-op unless INDEXNOW_ENABLED=1)…"
node "$APP_DIR/scripts/indexnow.mjs" 9>&- || log "indexnow: submission skipped (non-fatal)."

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
