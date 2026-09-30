# `/paginas-mas-visitadas` — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar el ranking de páginas por visita (sin nada privado) en una página indexable.

**Architecture:** el job arma, además del ranking privado, un documento público por proyección
explícita; ruta Nitro pública cacheada; página en español que sólo pinta.

**Tech Stack:** TS 4.9 (raíz), mongoose, vitest; Nuxt 4 + Vuetify 4.

**Spec:** `docs/superpowers/specs/2026-09-29-paginas-mas-visitadas-design.md`

## Global Constraints

- Ninguna clave privada en el documento público: `tier`, `multiplier`, `value`, `focus`, `uyShare`,
  `viewsAll`, `entrances`, `engagedRate`, `signals`.
- Listas públicas sin privadas (paridad con `EXCLUDED_ROUTES`), sin `/en|/pt`, sin fichas sueltas.
- Cero cifras de ingreso en código, docs y commits.
- Título ≤ 60, descripción ≤ 155, únicos; una H1; raíz `VContainer`; canonical literal.

## Review Focus

1. Ranking sin páginas públicas suficientes → no se escribe el documento (guarda de 10).
2. Una ruta privada nueva en `EXCLUDED_ROUTES` sin espejo en el backend → test de paridad rojo.
3. Documento público ausente → la página muestra su estado vacío, la ruta devuelve `null` sin 500.
4. Canal nuevo de GA4 sin traducción → se muestra la etiqueta cruda.
5. Página rankeada sin entrada en `NAV_SECTIONS` → tema = título de GA4 sin sufijo, sin romper.

### Task 1: reportes semanales por canal y dispositivo
`classes/site-analytics/pageRanking.ts` + test: `pageRankingRequests` devuelve 7; `buildPageRanking`
llena `totals.weeklyChannels` / `totals.weeklyDevices` (`{ label, weeks[4] }[]`, por total desc);
reportes ausentes → `[]`.

### Task 2: proyección pública
`classes/site-analytics/publicTopPages.ts` + `tests/site_analytics/public_top_pages.test.ts`:
`PUBLIC_EXCLUDED_PATHS`, `isPublicListable(path)`, `buildPublicTopPages(ranking)`,
`publicTopPagesIsThin(doc)`; paridad con `EXCLUDED_ROUTES`; claves prohibidas.

### Task 3: persistencia y job
Modelos `SiteTopPages` (raíz y app, colección `sitetoppages`), `saveSiteTopPages`, paso en el job,
paridad de esquema.

### Task 4: API pública + utilidades del app
`app/server/api/site-top-pages.get.ts`, `app/utils/topPages.ts` (tipos, `topicOf`, `channelGrowth`),
`app/tests/unit/topPages.test.ts`.

### Task 5: página + registro
`app/pages/paginas-mas-visitadas.vue`; `siteNav` + i18n es/en/pt; `temaHuerfanas`; `relatedPages`
`NEVER_SUGGEST`; enlace desde `/estadisticas-del-sitio`; `docs/seo/experiments.json`. Suite unit +
lint.

### Task 6: docs, verificación, deploy
`docs/analytics/PAGE_RANKING.md`, `AGENTS.md`; preview en dev con el documento real; merge a main,
CI, correr el job en el VPS, medir la página en producción.
