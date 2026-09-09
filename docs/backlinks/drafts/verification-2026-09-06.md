# Verificación de activos y tutorial — 6 de septiembre de 2026

Este documento registra lecturas y material preparado. No constituye una publicación.

## Hallazgos comprobados en vivo

- `GET https://dev.to/api/articles/eduair94/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-1fml`: artículo **4083098**, usuario `eduair94`, publicado el 2026-07-06T22:28:10Z, `edited_at: null`, `body_markdown` de longitud **0**, `reading_time_minutes: 0`. Canonical: artículo EN de Medium. La reparación del cuerpo sigue pendiente al hacer esta lectura.
- `GET https://api.cambio-uruguay.com/parameters/origins`: `count: 46`, **45 al excluir `bcu`**. El texto público debe decir «más de 40» y nunca «todas las casas del Uruguay».
- `GET https://api.cambio-uruguay.com/`: 200 filas; **42** filas USD con `type` vacío, otras 6 en canales distintos. Son filas, no cobertura exhaustiva del mercado.
- `GET https://api.cambio-uruguay.com/frozen-quotes`: respuesta válida; `generatedAt: 2026-09-06T04:37:09.515Z`, `windowDays: 120`, `checked: 23291`, **46** avisos para todas las monedas/tipos.
- `https://cambio-uruguay.com/desarrolladores` y `https://github.com/eduair94/cambio-uruguay/blob/main/classes/rate_staleness.ts`: HTTP 200.
- Se ejecutó `node docs/backlinks/drafts/audit-frozen-rates.mjs` contra la API pública. Terminó en 0, mostró las 42 filas USD de mostrador y los avisos correspondientes. No escribe en la API ni necesita credenciales.

La representación de `/estado` devuelta por el buscador web contenía datos anteriores a las correcciones actuales. Para validar datos mutables se usaron respuestas HTTP directas, no esa copia.

## Preparado

- [Texto final para reparar Dev.to 4083098](./devto-currency-exchange-repair.md): tutorial original, sin frontmatter y listo para pegar. Título: **Fresh timestamps, frozen prices: auditing a currency API with Node.js**. Incluye disclosure de dueño y asistencia de IA; tres enlaces editoriales. Sustituye el artículo vacío por contenido técnico, sin crear una segunda publicación. El canonical viejo de Medium debe retirarse porque este tutorial no es una copia del artículo turístico de Medium.
- [Primer borrador con frontmatter](./fresh-timestamps-frozen-prices.md): antecedente de la misma pieza; no publicar como artículo adicional.
- [Ejemplo ejecutable](./audit-frozen-rates.mjs): Node.js 22+, sin dependencias. No mezcla canales, no borra filas por sospecha y no presenta ausencia de aviso como garantía. El límite de un día para el reporte es una política elegida para el ejemplo, no una garantía del API.
- Los bloques JavaScript se extrajeron literalmente de ambos Markdown y se ejecutaron: **exit 0**, 42 filas USD, informe `2026-09-06T04:42:32.718Z` y avisos presentes.
- [Texto portugués final para Medium](./medium-pt-cambio-uruguai-ready.md): sin frontmatter; título **Câmbio no Uruguai: como ler compra e venda antes de trocar reais**. Tags: **Uruguay, Travel, Currency Exchange**. Tiene disclosure dueño/IA y tres enlaces. No incluye legislación, impuestos, cifras de cotización ni promesas de cobertura exhaustiva.
- Para el texto portugués, se verificaron por HTTP directo `/pt`, `/pt/mapa` y `/pt/estado`: **200** y título/H1 en portugués. `/pt/convertir` respondió 200 pero con título/H1 en español: se omitió del artículo.

## Estado local de otros canales

Según `docs/medium-articles/README.md` y el tracker del 04/09, los artículos ES y EN están publicados en Medium; PT continúa pendiente. El plan de X del 04/09 contiene dos piezas con PNG y textos alternativos, pero su documento registra que no fueron publicadas.

Los borradores Medium necesitan revisión antes de reutilizarlos: contienen «every exchange house» y otras afirmaciones más amplias que la cobertura real. También conservan metadatos internos y enlaces relativos que no deben copiarse al cuerpo público.

No aparecieron variables de publicación Dev.to, Medium, Hashnode, X o npm en `.env`, `app/.env` ni en los nombres de variables del proceso. `bots/.env` y `mcp/.env` no existen en este worktree. Sí hay nombres de variables Reddit (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `NUXT_REDDIT_REFRESH_TOKEN`); su presencia no prueba que una sesión tenga permisos de publicación. No se inspeccionaron ni registraron valores de credenciales en este informe.

## Próximas acciones con mejor encaje

1. Reparar el artículo Dev.to 4083098 con el tutorial técnico final: aprovechar la publicación existente, cambiar título y retirar el canonical turístico de Medium. La pieza debe sostenerse por su código y explicación, de acuerdo con el enfoque de DEV.
2. Publicar el artículo portugués revisado en Medium: abre una audiencia distinta (turistas brasileños), actualmente sin pieza publicada según los registros locales.
3. Ejecutar las altas o reparaciones de directorios/API/MCP investigadas en paralelo, sin duplicar artículos ni PRs ya registrados en el tracker.
