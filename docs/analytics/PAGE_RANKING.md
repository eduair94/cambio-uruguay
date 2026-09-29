# Ranking de páginas por visita (`/estadisticas-por-pagina`)

Página **privada** (`requireAdmin`, `noindex`, fuera de robots, sitemap y anuncios) que contesta qué
páginas mueven el sitio, cuáles suben, cuáles se caen y cuáles engañan, y arma la lista "dónde
enfocarse". Diseño: `docs/superpowers/specs/2026-09-29-ranking-de-paginas-design.md`.

```
currency-site-analytics (10:51 UTC)
   ├── siteanalyticssnapshots → /api/site-analytics     → /estadisticas-del-sitio   (PÚBLICO)
   ├── siterevenuesnapshots   → /api/site-revenue       → /estadisticas-de-busqueda (requireAdmin)
   └── sitepagerankings       → /api/site-page-ranking  → /estadisticas-por-pagina  (requireAdmin)
```

El tercer paso va último y en su propio `try`: un fallo no deja sin actualizar ni la página pública
ni el ingreso, y un ranking con cero vistas uruguayas no pisa el anterior. Código:
`classes/site-analytics/pageRanking.ts` (puro salvo `refreshPageRanking`), tests en
`tests/site_analytics/page_ranking.test.ts`.

## Los cinco reportes (un `batchRunReports`)

| # | dimensiones | métricas | filtro |
|---|---|---|---|
| 0 | `pagePath` × 4 semanas | `screenPageViews` | `countryId = UY` |
| 1 | `pagePath`, `pageTitle` | vistas, `activeUsers`, `userEngagementDuration` | UY |
| 2 | `pagePath` | vistas | ninguno (todos los países) |
| 3 | `landingPage`, `sessionDefaultChannelGroup` | `sessions`, `engagedSessions` | UY |
| 4 | `countryId` | vistas, sesiones, usuarios | ninguno |

El reporte 0 manda **cuatro `dateRanges` con nombre** (`w0`…`w3`, la más vieja primero): GA4 agrega la
dimensión `dateRange` a cada fila con ese nombre. Los usuarios no se suman entre semanas, por eso el
reporte 1 es de 28 días. Rutas sin query string (`publicPath`, igual que el snapshot público);
`(not set)` cuenta en los totales y nunca es una fila. Si `rows < rowCount` el documento lleva
`truncated: true` y la página lo dice.

## Tres decisiones que salieron de leer GA4 antes de escribir (1–28/9/2026)

- **Sólo Uruguay para rankear.** La granja "Singapur" (14–22/9) y un salto desde EE.UU. el 23/9 fueron
  la mayoría de lo que midió GA4 en la ventana. El total de todos los países queda como columna `% UY`.
- **Base semanal = mediana** de las semanas desde la primera con vistas, y sin la semana del pico si lo
  hubo. `/oportunidades-inmobiliarias-uruguay` hizo 192, 32, 34, 19: la suma dice 277, la base 32.
- **Tendencia dentro de la ventana y por semana**: las dos últimas semanas contra las anteriores en que
  la página ya existía. Nunca contra la ventana anterior: el 2/9/2026 cambió el consentimiento por
  región y GA4 pasó de ver ~25 % del tráfico a verlo casi todo.

## Señales

| señal | regla |
|---|---|
| `nueva` | sin vistas en las dos primeras semanas |
| `pico` | una semana ≥ 3× la segunda mejor, ≥ 20 vistas, y NO es la última (ahí no se distingue de un crecimiento) |
| `cae` / `crece` | por semana ≤ 0,6× / ≥ 1,5×, muestra mínima, nunca sobre un pico ni en una nueva |
| `rebota` | tramo contenido u otro, ≥ 50 vistas, < 20 s por usuario (en una cotización la visita corta es el éxito) |
| `afuera` | ≥ 50 vistas totales y < 50 % desde Uruguay |
| `ia` | ≥ 5 entradas desde asistentes de IA |

Cada umbral es una constante exportada al principio de `pageRanking.ts`.

## "Dónde enfocarse"

Grupos en orden de lectura: sostienen (top 5 por valor) → caen → suben/nuevas → se van rápido →
llegan desde IA → picos. Hasta 6 por grupo. **Valor = base × multiplicador del tramo** de la familia
(`tierOf`, el mismo del plan de ingreso): forma, no plata — este repo es público. Caídas y subas se
ordenan por vistas movidas por semana × multiplicador. "Suben" excluye picos y exige 20 vistas en las
dos últimas semanas. El consejo ante una caída depende del canal que traía la página (directo: fin de
un empujón; redes: el hilo se enfrió; búsqueda: Search Console).

## Correrlo a mano

En el VPS, `node dist/sync_site_analytics.js` reescribe los tres documentos. No hay flag para correr
sólo el ranking: los tres pasos son idempotentes.
