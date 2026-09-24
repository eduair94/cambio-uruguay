# Ejecutor diario de mejoras (routine de Claude en la nube)

El job `currency-revenue-plan` **mide y prioriza**; no ejecuta nada, por diseño. Esta es la otra
mitad: un agente programado que una vez por día toma un ítem y lo entrega como Pull Request.

## Estado

**Creada y activa** desde el 2026-09-20 (`trig_01GMv1wqDRRux2tLhCWYTsJU`), después de conectar la
cuenta de GitHub — hasta entonces la API la rechazaba con
`401 · "Connect your GitHub account before saving a routine that uses a GitHub repository."`

Se administra en <https://claude.ai/code/routines>. Para pausarla, deshabilitarla ahí.

**Ojo (2026-09-24):** desde la sesión local de esa fecha el trigger `trig_01GMv1wqDRRux2tLhCWYTsJU`
devuelve 404 y no aparece en el listado de routines de esa cuenta, pero la corrida sigue llegando
(PRs #37, #38 y #39, ~16:15 UTC). Está administrada desde otra cuenta u organización de claude.ai:
para cambiarle el prompt hay que entrar con esa. Las reglas que tienen que llegarle sí o sí van en
`AGENTS.md`, que toda sesión de Claude Code carga sola.

## Lo que este agente NO puede ver

Corre en la nube de Anthropic, en un checkout aislado. **No tiene** acceso al Mongo del app, a
Search Console, a GA4 ni a `/api/revenue-plan` (que está detrás de `requireAdmin`). Y el plan **no
puede** copiarse al repo: este repositorio es público y el documento cruza consultas de búsqueda con
facturación por sección.

Así que el agente trabaja con lo que sí está en el repo, que alcanza para la mayor parte del trabajo:
la **tesis de tramos** (`classes/revenueplan/value.ts` — contenido 8×, dato-vivo 1×, directorio
0,2×), los **trinquetes de deuda SEO** (que sólo pueden bajar), el **libro de cambios**
(`docs/seo/experiments.json`) y el **registro de crecimiento** con lo que ya se descartó con
evidencia.

La priorización fina en plata la sigue leyendo una persona en `/estadisticas-de-busqueda`.

## Configuración

| campo | valor |
|---|---|
| nombre | `cambio-uruguay — mejora diaria de ingreso (PR)` |
| cron (UTC) | `0 16 * * *` — 13:00 en Montevideo |
| modelo | `claude-opus-5` |
| entorno | `env_019FM2bPVBBpsWohTSsRYLC4` (Default) |
| repo | `https://github.com/eduair94/cambio-uruguay` |
| herramientas | `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep` |

**Por qué 16:00 UTC:** lejos del bucle de Codex (09:30 UY) y después de `currency-revenue-plan`
(11:50 UTC), así el plan del día ya está escrito cuando una persona lo mira.

## Las reglas que lleva el prompt

- **Nunca empuja a `main` ni despliega.** Rama + PR. Desde el 2026-09-24 el merge y el deploy los
  hace el job `automerge` de `.github/workflows/deploy.yml` cuando gitleaks y los tests unitarios
  pasan (ver `AGENTS.md`, sección Deploy). Antes quedaban esperando una aprobación que el autor no
  puede darse, y como la corrida siguiente mira `main` y no los PRs abiertos, rehacía el mismo
  trabajo: #37, #38 y #39 tocaban las mismas páginas.
- **Mira los PRs abiertos antes de elegir el trabajo del día** y no abre uno sobre rutas que otro
  PR abierto ya toca. Si un PR suyo quedó abierto, es que la compuerta falló: se arregla ése.
- **Una mejora por día, terminada y verificada.** Si no hay nada que valga la pena, lo dice y no abre
  PR: un PR de relleno ensucia el libro de cambios y arruina la medición de los que sí importan.
- **Declara lo que cambia** en `docs/seo/experiments.json`, en el mismo commit. Un cambio que toca
  todas las páginas no se declara (sin control, el veredicto siempre da "sin cambio").
- **Cero cifras de ingreso** en el repo público.
- **Nada inventado**: toda cifra publicada necesita fuente y fecha.
- `id`/`slug` y nunca `key` para identificadores con dígitos, por el gate de gitleaks.
- Verifica con `npm install` (nunca `npm ci`), `app` con `--force` (nunca `--legacy-peer-deps`), y
  `lint` en vez de `typecheck`, que está roto.

## Orden de prioridad que se le dio

1. Deuda de SEO en páginas del tramo `contenido` — es donde el clic paga.
2. Títulos de guía que no responden la consulta.
3. Enlaces de contexto desde páginas de alto tráfico y bajo RPM hacia guías.
4. Páginas huérfanas sin tema en `app/utils/guideHubs.ts`.

## Alternativa si se quiere que SÍ lea el plan

El ejecutor tendría que correr donde están los datos: el VPS. Ya existe ahí un Claude Code headless
privado (`/root/claude-agent-api`, pm2 `Claude_Agent_API`, `127.0.0.1:9310`) que podría recibir un
dossier armado desde el snapshot. Es más trabajo y pone un loop autónomo adentro de la máquina de
producción; no se hizo.
