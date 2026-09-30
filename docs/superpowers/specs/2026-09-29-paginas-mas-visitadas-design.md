# `/paginas-mas-visitadas` — el ranking, en público

Fecha: 2026-09-29. Pedido: "quiero que el análisis quede público en una página del sitio para que la
gente vea las páginas top / más consultadas y otros datos útiles". Sigue a
`2026-09-29-ranking-de-paginas-design.md` (la versión privada, `/estadisticas-por-pagina`).

## Qué se publica y qué no

La página privada lleva cosas que no son para el lector: el tramo y el multiplicador de valor de cada
familia (forma del ingreso), la lista "dónde enfocarse", el % de vistas desde Uruguay por página
(habla de tráfico automatizado) y las entradas por canal de cada página. Nada de eso sale.

Se publica: las páginas más visitadas (base semanal, 28 días, 4 semanas, tendencia, permanencia,
"nueva"), las que más suben, las que más recomiendan los asistentes de IA (entradas desde IA de esas
páginas, nada más), los temas más consultados, cómo llega la gente semana a semana (canales, en
agregado) y celular contra computadora.

## Decisiones

- **Documento público APARTE** (`sitetoppages`, APP DB), armado por una función pura
  (`buildPublicTopPages`) que construye cada fila CAMPO POR CAMPO desde el ranking privado. Regla del
  repo (`siterevenuesnapshots`): lo público nunca sale de un `.select()` sobre un documento privado.
  Test: ninguna clave privada (`tier`, `multiplier`, `value`, `focus`, `uyShare`, `viewsAll`,
  `entrances`, `engagedRate`, `signals`) aparece en el JSON público.
- **Qué entra en las listas públicas**: sólo páginas en español, públicas y de lectura:
  - fuera las privadas: `PUBLIC_EXCLUDED_PATHS` en el backend, con test de paridad contra
    `EXCLUDED_ROUTES` de `app/utils/siteNav.ts` (leído como texto);
  - fuera los espejos `/en/*` y `/pt/*`;
  - fuera las fichas sueltas de directorio: lo que `bucketOf` deja sin plegar con dos segmentos o
    más (`/alquileres/<ficha>`, `/autos-usados-uruguay/<…>`) — van y vienen. Siguen contando en los
    temas.
- **Datos nuevos en el job**: dos reportes GA4 más en `pageRankingRequests` (sesiones UY por
  `sessionDefaultChannelGroup` y por `deviceCategory`, las 4 semanas) → `totals.weeklyChannels` y
  `totals.weeklyDevices` en el ranking (también sirven a la privada). Con 7 reportes `runReports`
  hace dos llamadas.
- **"En alza" sin ponderar por plata**: crece o nueva, sin pico, ≥ 20 vistas en las dos últimas
  semanas, ordenadas por vistas ganadas por semana (sin multiplicador de tramo).
- **Asistentes de IA**: páginas con ≥ 3 entradas desde IA, por entradas.
- **Temas** = familias del ranking (sin espejos ni privadas), con nombre humano en el app vía
  `NAV_SECTIONS` (la entrada cuyo `to` es la ruta o el prefijo más largo).
- **Tamaños**: 100 páginas, 10 en alza, 10 de IA, 25 temas.
- **Guarda**: no se escribe si el ranking está vacío o quedan menos de 10 páginas públicas.

## Superficie

- Job `currency-site-analytics`: después de guardar el ranking, en su propio `try`, arma y guarda el
  documento público.
- `GET /api/site-top-pages`: pública, `public, max-age=1800, s-maxage=3600,
  stale-while-revalidate=86400` (igual que `/api/site-analytics`), devuelve el documento o `null`.
- `/paginas-mas-visitadas`: español, canonical literal, `Dataset` + `BreadcrumbList`, OG. Secciones:
  resumen → las más visitadas (50 + "ver más" hasta 100) → en alza → recomendadas por IA → temas →
  cómo llega la gente → celular o computadora → cómo se mide. Enlaces a cada página rankeada.
- Registro: `siteNav` (sección `site`, junto a `/estadisticas-del-sitio`, con `labelKey` en es/en/pt),
  `FUERA_DE_TEMA_POR_DISENO` (página sobre el propio sitio), `NEVER_SUGGEST` en `relatedPages`, fila
  en `docs/seo/experiments.json`. Enlace cruzado desde `/estadisticas-del-sitio`.

## Pruebas

Raíz: reportes nuevos; `buildPublicTopPages` (filtros, orden, campos, tamaños, guarda, claves
prohibidas); paridad de exclusiones; paridad de esquema. App: helpers (`topicOf`, crecimiento por
canal) y la suite completa (contratos de SEO, contenedor, temas, títulos y descripciones).
Verificación: preview en dev con el documento real y medición en producción después del deploy.
