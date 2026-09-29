# Ranking de páginas por visita (`/estadisticas-por-pagina`) — diseño

Fecha: 2026-09-29. Pedido: "crear una página usando la API de Google Analytics, rankeando páginas por
visita, y usar el análisis para ver dónde enfocarse".

## Lo que ya existe y por qué no alcanza

- `/estadisticas-del-sitio` (pública) publica el top 25 por vistas de los últimos 28 días, TODO el
  tráfico, sin tendencia por página.
- `siterevenuesnapshots` (privado) tiene vistas e ingreso por URL y familia; `/estadisticas-de-busqueda`
  (privada) cruza Search Console con el RPM por familia.

Ninguna responde "qué páginas mueven el sitio, cuáles suben, cuáles se caen y cuáles engañan".

## Lo que mostró la lectura real (GA4, 1–28/9/2026)

1. **La suma de 28 días de TODO el tráfico no sirve para rankear.** 35.749 vistas medidas, 10.236 desde
   Uruguay. La granja "Singapur" (14–22/9) y un salto desde EE.UU. el 23/9 son la mayoría del total.
2. **Los picos engañan.** `/alquileres-uruguay` hizo 303 → 210 → 124 → 27 vistas uruguayas por semana;
   `/oportunidades-inmobiliarias-uruguay` 192 → 32 → 34 → 19. Días sueltos de tráfico directo (4–9/9)
   inflan la suma; la base real es otra.
3. **La medición cambió el 2/9** (consentimiento por región): antes GA4 veía ~25 %. Comparar contra
   agosto declara crecimiento falso. La tendencia se mide DENTRO de la ventana, semana contra semana.
4. **Canales (sesiones UY):** orgánico 55 %, directo 23 %, social 7,5 % (Reddit), asistentes de IA 6,7 %
   (ChatGPT casi todo). La IA ya es un canal y nadie lo miraba por página.

## Decisiones

- **Privada** (`requireAdmin`, `noindex`, fuera del sitemap y de robots), como `/estadisticas-de-busqueda`:
  es una herramienta de decisión, lleva el tramo de valor de cada familia y las fuentes de entrada por
  página. La pública no se toca.
- **Audiencia = Uruguay** (`countryId = UY`) para rankear. El total de todos los países se guarda al lado
  sólo para mostrar qué parte de cada página es de afuera.
- **Base semanal = mediana de las semanas activas** (desde la primera semana con vistas), no la suma, y
  sin la semana del pico cuando lo hay (con dos semanas activas la mediana es el promedio: `[0,0,95,4]`
  daba 50). Es lo que ordena por defecto. La suma de 28 días queda como columna.
- **Calculado una vez por día en el job existente** `currency-site-analytics`, no en el pedido (regla del
  repo: el análisis que procesa la base se guarda). Va en su propio `try` después del snapshot público y
  del ingreso: un fallo acá no frena nada de lo anterior.
- **El texto de "dónde enfocarse" lo arma el backend** (función pura, testeada). La página sólo lo pinta.
- **Sin cifras de ingreso**: el valor usa el multiplicador del tramo (`tierOf` del plan de ingreso), que
  es forma y no plata. El repo es público.

## Datos

Un `batchRunReports` de cinco reportes, ventana = los 28 días que terminan ayer (`analyticsWindows`),
partida en cuatro semanas (GA4 acepta hasta 4 `dateRanges` por reporte y devuelve la dimensión
`dateRange`):

| # | dimensiones | métricas | filtro |
|---|---|---|---|
| 0 | pagePath × 4 semanas | screenPageViews | UY |
| 1 | pagePath, pageTitle | screenPageViews, activeUsers, userEngagementDuration | UY |
| 2 | pagePath | screenPageViews | — (todos los países) |
| 3 | landingPage, sessionDefaultChannelGroup | sessions, engagedSessions | UY |
| 4 | countryId | screenPageViews, sessions, activeUsers | — |

Rutas sin query string (`publicPath`, igual que el snapshot público). `(not set)` no es una página y se
descarta de la tabla (cuenta en los totales). Si `rows < rowCount` en cualquier reporte, el snapshot
lleva `truncated: true` y la página lo dice.

## Documento (APP DB `sitepagerankings`, uno solo, `key: "site"`)

```ts
{
  key, asOf, timezone,
  range: { start, end, days },          // 28 días
  weeks: { start, end }[],              // 4, la más vieja primero
  totals: {
    viewsUy, viewsAll, uyShare, sessionsUy, usersUy,
    weeklyUy: number[4],
    channels: { label, sessions, share }[],   // sesiones UY por canal
  },
  pageCount,                            // páginas con vistas desde UY
  truncated,
  pages: PageRankRow[],                 // hasta 600, por base; + toda página con señal de foco
  families: FamilyRankRow[],            // mismo bucketOf que GSC y el plan de ingreso
  focus: FocusItem[],                   // "dónde enfocarse"
}
PageRankRow = {
  path, title, family, tier, multiplier, rank,
  weeks: number[4], views, base, users, engagementSeconds,     // por usuario
  viewsAll, uyShare,
  entrances: { total, organic, direct, social, ai, other }, engagedRate,
  trend: number | null,                 // (s3+s4)/(s1+s2) − 1
  value,                                // base × multiplier
  signals: ('pico'|'cae'|'crece'|'nueva'|'rebota'|'afuera'|'ia')[],
}
```

## Señales (umbrales en constantes exportadas)

- **nueva**: las dos primeras semanas en cero y vistas después.
- **pico**: la semana máxima ≥ 3× la SEGUNDA mejor, ≥ 20 vistas, y no es la última semana (ahí no se
  distingue de un crecimiento). `[10,10,40,40]` es cambio de nivel, no pico. No se decide con esto.
- **cae** / **crece**: POR SEMANA, las dos últimas contra las anteriores en que la página ya existía
  (`[0,108,70,13]` por mitades crudas daba −23 %; por semana, −62 %). Muestra mínima 30 vistas llevadas a
  dos semanas; ≤ 0,6× cae, ≥ 1,5× crece; nunca sobre un pico. Una página nueva no "crece": es nueva.
- **rebota**: ≥ 50 vistas, < 20 s de permanencia por usuario y tramo `contenido` u `otro`. En una
  cotización, una visita corta es el éxito.
- **afuera**: ≥ 50 vistas totales y < 50 % desde Uruguay (espejo /en legítimo o tráfico automatizado).
- **ia**: ≥ 5 entradas desde asistentes de IA.

## "Dónde enfocarse" (orden fijo de grupos; dentro, por valor)

1. **Sostienen el sitio**: top 5 por valor → no romper, velocidad, enlazar desde ellas.
2. **Se están cayendo**: `cae` (sin `pico`), por vistas perdidas × multiplicador → revisar posición en
   Search Console y que la página responda.
3. **Suben / nuevas**: `crece` o `nueva`, sin `pico` y con ≥ 20 vistas en las últimas dos semanas, por
   vistas ganadas × multiplicador → enlazarlas desde las grandes, ampliarlas. El texto de "caen" cambia
   según el canal: directo (fin de un empujón), redes (el hilo se enfrió), IA, búsqueda (Search Console).
4. **Se van rápido**: `rebota` → rehacer lo de arriba del pliegue.
5. **Llegan desde IA**: `ia` → mantener cifras fechadas y frescas.
6. **Picos**: `pico` → aviso para no leer la suma como base.

Hasta 6 ítems por grupo. Cada ítem trae `kind, path, title, headline, detail` en castellano, armados con
las cifras de la fila.

## Superficie

- `GET /api/site-page-ranking` (`requireAdmin`, `private, no-store`), `{ snapshot }` o
  `{ snapshot: null, hint }`.
- `/estadisticas-por-pagina`: resumen (vistas UY, % UY, 4 semanas, canales) → dónde enfocarse →
  ranking filtrable (texto, familia, señal) y ordenable (base, 28 días, tendencia, valor, permanencia),
  50 filas y "ver más" → familias → metodología. Enlaces cruzados con `/estadisticas-de-busqueda`.
- Registro de página privada en los mismos seis lugares que `/estadisticas-de-busqueda`.

## Guardas y pruebas

- No se guarda un snapshot con `viewsUy = 0` (propiedad equivocada o permiso, no un mes quieto).
- Raíz (vitest): funciones puras de ranking, señales, foco, mezcla por ruta y título, canales, truncado;
  paridad de esquema backend↔app; el modelo no declara campos de plata.
- App (vitest): helpers de filtrado/orden/etiquetas.
- Verificación: correr el job en el VPS después del deploy y leer el documento real.

## Fuera de alcance

Ingreso por página en esta vista (vive en `/estadisticas-de-busqueda`), histórico propio (GA4 es el
archivo), consultas de Search Console por página, fila en `experiments.json` (no mueve tráfico).
