# Seguimiento punkpeye/awesome-mcp-servers #9525 — 2026-09-06

**Resultado final:** se actualizó el [PR existente #9525](https://github.com/punkpeye/awesome-mcp-servers/pull/9525), se resolvió su conflicto con upstream y se agregó el badge real de la ficha Glama pública. GitHub devuelve `MERGEABLE`, `CLEAN`, etiqueta `has-glama` y check de submission `SUCCESS`. Sigue **abierto**, pendiente de revisión; no está fusionado ni aceptado. La release y evaluación de calidad de Glama siguen pendientes por dos fallas de su plataforma antes del build.

## Cambios publicados

- Rama original: `eduair94/awesome-mcp-servers:add-cambio-uruguay`.
- Commit anterior: `8f586e25597d08804290678f9da3609f549a137b`, única contribución previa y de `eduair94`.
- Upstream usado: `9f3ae55c50a6b2cac8172700fc5af43cf16f76cf`.
- [Commit de resolución](https://github.com/eduair94/awesome-mcp-servers/commit/82f9bc35c76a0784f58688b5793e698fe52a5051): `82f9bc35c76a0784f58688b5793e698fe52a5051`.
- [Commit final con badge](https://github.com/eduair94/awesome-mcp-servers/commit/a4c44b645bfbd639449b528f1954592493618d34): `a4c44b645bfbd639449b528f1954592493618d34`.
- Push normal, sin force: el nuevo commit conserva como padres el aporte original y upstream.
- Diferencia final del PR: **un archivo (`README.md`), una línea añadida, ninguna eliminada**. La entrada quedó bajo Finance & Fintech, después de `edge-claw` y antes de `EmblemCompany`, conservando el contenido original.
- Se actualizó la descripción del PR: cobertura `40+` en vez de `every`, documentación MCP, npm, endpoint remoto, registro oficial, ficha fuente y conector Glama. Informa que el autor está verificado y el badge existe; explica que la release y evaluación de calidad siguen pendientes después de dos fallas de plataforma.

No se abrió otro PR, no se agregó un badge inexistente y no se modificó código de producción. El trabajo se hizo en el clone aislado `dist/backlink-submissions/awesome-mcp-servers`, rama local `prepare-pr-9525`, que quedó limpio.

## Verificación

**Verificación final tras publicar el badge:** `headRefOid: a4c44b645bfbd639449b528f1954592493618d34`, `OPEN`, `MERGEABLE`, `CLEAN`; un archivo, una línea añadida, cero eliminaciones. Etiquetas: `has-emoji`, `valid-name`, `has-glama`. [Check final de submission](https://github.com/punkpeye/awesome-mcp-servers/actions/runs/34013747344/job/101433884113): `SUCCESS`. Ficha fuente y badge: HTTP 200. La página Score confirma `Author verified` y todavía indica `No Glama release`.

Lectura posterior de GitHub, alrededor de `2026-09-06T05:08Z`:

- PR `OPEN`, `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`.
- `headRefOid: 82f9bc35c76a0784f58688b5793e698fe52a5051`.
- `changedFiles: 1`, `additions: 1`, `deletions: 0`.
- [Check de submission](https://github.com/punkpeye/awesome-mcp-servers/actions/runs/34013221635/job/101432506487): `SUCCESS`. Este check aplica validaciones y etiquetas; no certifica aceptación editorial ni evaluación de Glama.
- `git diff --cached upstream/main --check` pasó antes del commit.
- [Conector remoto Glama](https://glama.ai/mcp/connectors/io.github.eduair94/cambio-uruguay): HTTP 200. Es una ficha pública real; no equivale a la ficha de servidor fuente ni a una puntuación de calidad.

## Requisito editorial que queda pendiente

El [comentario del mantenedor](https://github.com/punkpeye/awesome-mcp-servers/pull/9525#issuecomment-4956186903) pide que el servidor se registre en Glama, se reclame y obtenga una evaluación de calidad; cualquier grado sirve. El formulario de alta del servidor fuente se envió el 2026-09-06. Poco después de actualizar el PR, la [ficha fuente](https://glama.ai/mcp/servers/eduair94/cambio-uruguay) quedó pública (HTTP 200). Su [página Score](https://glama.ai/mcp/servers/eduair94/cambio-uruguay/score) confirma `Author verified`, pero todavía indica `No Glama release`. Queda pendiente la compilación, publicación de una release en Glama y evaluación de calidad.

El comentario antiguo sugería `/badge.svg`; el [workflow vigente](https://github.com/punkpeye/awesome-mcp-servers/blob/9f3ae55c50a6b2cac8172700fc5af43cf16f76cf/.github/workflows/check-glama.yml) exige literalmente `/badges/score.svg`. Se agregó el badge real con esa ruta después del enlace GitHub cuando empezó a responder HTTP 200, dejando explícito en el PR que la evaluación aún no está completada. No se reutilizó la URL de `/mcp/connectors/` como si fuera un badge de `/mcp/servers/`.

Antes de la solicitud, las rutas `/mcp/servers/eduair94/cambio-uruguay`, `/mcp/servers/@eduair94/cambio-uruguay` y su `/badges/score.svg` devolvían HTTP 404. La API de búsqueda probada devolvió HTTP 401; no se usó esa falla para afirmar ausencia exhaustiva.

Si la evaluación de Glama autodetecta el repositorio, recordar que el servidor está en `mcp/`; el `package.json` de la raíz corresponde al backend Express. La configuración de compilación del servidor fuente debe apuntar a ese subdirectorio. Se preparó `dist/backlink-submissions/glama-cambio.Dockerfile` para contexto de build en la raíz, copiando sólo el código MCP. El lockfile de `mcp/` no está commiteado, por lo que el Dockerfile usa `npm install`; un primer borrador con `npm ci` se corrigió antes de su uso.

## Configuración de evaluación validada

La interfaz de Glama genera el Dockerfile a partir de opciones, por lo que no requiere subir el archivo preparado. Con `WORKDIR /app/mcp`, usar Node 22, estos pasos de build y CMD `['node', 'dist/index.js']`:

```json
[
  "npm install --ignore-scripts",
  "npm run build",
  "npm prune --omit=dev --ignore-scripts"
]
```

Los tres comandos pasaron desde una exportación `git archive` aislada, sin lockfile ni node_modules previos. Después de podar dependencias de desarrollo, el proceso respondió a `initialize` y `tools/list` por stdio, exponiendo las siete herramientas esperadas. Stdio es el transporte por defecto; no se necesita configurar secretos.

El árbol `mcp/` probado tiene hash `c13992b8b3cdb09154d3f8747d9dc1d03394dadf`, idéntico al del main público `76c6d05723ff3b3418319a578e3998d9b2687866`. La comprobación se ejecutó en Windows con Node local; Docker Desktop tenía el daemon apagado, por lo que la compilación y ejecución Linux deben confirmarse en Glama. La página Score indica que **Build & Release** compila y publica la release que habilita la evaluación de calidad.

## Ejecuciones en Glama

El primer **Build & Release** falló aproximadamente a los dos minutos, antes de ejecutar cualquiera de los pasos de build. Según el diagnóstico mostrado por Glama y leído en su interfaz, el builder perdió la sesión de BuildKit: fallo de plataforma, sin atribuirlo al spec, la imagen base ni el repositorio. La interfaz recomendó reintentar y se inició un segundo intento sin cambiar la configuración.

- [Primer test, acceso de administrador](https://glama.ai/mcp/servers/eduair94/cambio-uruguay/admin/dockerfile/tests/01a07523-7f86-7b2d-9a25-ec92ab4295cc).
- [Segundo test, acceso de administrador](https://glama.ai/mcp/servers/eduair94/cambio-uruguay/admin/dockerfile/tests/01a07526-37ab-7e31-b354-c172baa4ff63): terminó con el mismo fallo de plataforma, aproximadamente a los dos minutos, antes del primer paso de build. No se hicieron más reintentos.

El fallo del primer test no se presenta como un fallo de compilación del código MCP, ya que los comandos no llegaron a ejecutarse. Tampoco se presenta la compilación local como una evaluación completada por Glama.

Actualización `2026-09-06T05:18Z`: el [badge oficial de score](https://glama.ai/mcp/servers/eduair94/cambio-uruguay/badges/score.svg) ya devuelve HTTP 200, `image/svg+xml`, 4071 bytes. Muestra `A--`: licencia A, sin puntuación de las otras dos dimensiones. La página Score mantiene `No Glama release`; un badge disponible no demuestra que la calidad del servidor haya sido evaluada. Tras concluir el segundo test se hizo una única actualización final del README y la descripción del PR, publicando este badge existente y explicando con precisión la evaluación pendiente.
