# Buscador con IA: alquileres, oportunidades, autos y productos por MCP + skill

Fecha: 2026-09-21 · Estado: aprobado (standing order: spec y plan auto-aprobados)

## Qué se pide

Que cualquier persona pueda buscar alquiler (y oportunidades de alquiler), auto usado (y
oportunidades de autos) y productos de los directorios del sitio **desde su propia IA**
(Claude, ChatGPT, Cursor, Claude Code…), con una experiencia personalizada: la IA entrevista,
cruza presupuesto, ingresos, destinos diarios, mascotas, garantías, barrio, consumo del auto,
riesgo declarado, y devuelve una lista corta con links, explicando por qué.

## Decisión de arquitectura

**Se extiende el MCP existente (`mcp/`, paquete `cambio-uruguay-mcp`) en vez de crear otro.**

- Ya está publicado en `https://mcp.cambio-uruguay.com/mcp` (pm2 `currency-mcp`, túnel de
  Cloudflare), con transporte stdio + Streamable HTTP sin estado, handlers puros testeados sobre
  una costura inyectada. Un segundo paquete duplicaría deploy, dominio y documentación.
- Las rutas de datos de alquileres, autos y directorios viven en la **app Nuxt**
  (`https://cambio-uruguay.com/api/*`, APP DB), no en la API del backend. El MCP suma una
  segunda base: `SITE_BASE_URL` (default `https://cambio-uruguay.com`). Sigue sin DB, sin
  scraping y sin secretos: sólo lee lo que el sitio ya publica.
- Alternativas descartadas: (a) un endpoint `/mcp` dentro de Nuxt — la app es pm2 cluster ×2 y
  cada deploy tarda ~5 min; (b) un MCP nuevo — dos superficies para mantener.

### Toolsets

Con 26 tools un cliente puede querer sólo una parte. Cuatro toolsets: `cambio` (las 7 de hoy),
`alquileres`, `autos`, `productos`.

- HTTP: `/mcp` = todo; `/mcp/alquileres`, `/mcp/autos`, `/mcp/productos`, `/mcp/cambio` = uno.
  (`/mcp?toolsets=alquileres,autos` también.)
- stdio: `MCP_TOOLSETS=alquileres,autos` (default: todos).

### Instrucciones del servidor

`McpServer` acepta `instructions` en la inicialización. Ahí va un playbook corto (qué preguntar
antes de buscar, cómo encadenar tools, reglas del dominio uruguayo) para que la calidad no
dependa de que la persona haya instalado además la skill. Se arma sólo con los toolsets activos.

## Tools

Nombres en inglés snake_case, como las 7 existentes; descripciones detalladas con los términos
uruguayos (gastos comunes, garantía ANDA, dueño directo, etc.). Toda salida trae:

- `content` en texto compacto en español (lista con montos formateados y links),
- `structuredContent` **compactado** (nunca el JSON crudo del sitio: ahorra tokens),
- `asOf` (fecha de los datos), `siteUrl` (la misma búsqueda abierta en cambio-uruguay.com, para
  guardarla o crear alerta) y `notes` (advertencias honestas del dato).

### Alquileres (`alquileres`, 8)

| tool | upstream | para qué |
|---|---|---|
| `geocode_uy_address` | `GET /api/rentals/geocode` (IDE Uruguay) | dirección o esquina → coordenadas, para "cerca de" y destinos |
| `search_rentals` | `GET /api/rentals` | directorio completo con TODOS los filtros del sitio: departamento, barrios, tipos, dormitorios (mín./exacto), baños, m², precio (UYU/USD), **total mensual con gastos comunes**, tope de gastos comunes, mascotas, garaje, amueblado, garantías (ANDA, Contaduría, aseguradora, propietaria, depósito, BHU), comodidades, dueño directo, inmobiliaria, portal, texto libre, punto + radio, calidad del barrio (pocas denuncias, pocos cortes de agua…), ocultar avisos reportados como no disponibles, orden (recientes, precio, total mensual, $/m², metros, distancia) |
| `rank_rentals_for_household` | `POST /api/rentals/fit` | **el personalizado**: hogar de 1–8 personas con ingreso, días de home office y hasta 4 destinos cada una (trabajo/estudio, días/semana, modo, distancia objetivo); presupuesto de vivienda, otros gastos, ahorro, transporte; tipos, dormitorios, m², mascotas, garaje, amueblado; barrios preferidos/excluidos (`prefer`/`only`); prioridad (equilibrado/presupuesto/traslados). Destinos por dirección se geocodifican antes. Devuelve puntaje, desglose (alquiler, gastos comunes, total, lo que queda del ingreso, % del ingreso), distancia de cada persona a cada destino, motivos y advertencias traducidos |
| `get_rental` | `GET /api/rentals/ficha/:key` + `GET /api/rentals/zone-profile` | ficha completa: todos los avisos de esa vivienda (precio por portal), descripción, comodidades, texto de garantía, inmobiliaria, **comparación con el mercado** (mediana del mismo barrio/tipo/dormitorios y diferencia %), similares, y perfil del barrio (denuncias, cortes de agua, reclamos, servicios) |
| `rental_market_stats` | `GET /api/rentals/analysis` | mediana/p25/p75 de alquiler, gastos comunes, total mensual y $/m² por departamento/barrio/tipo/dormitorios; ranking de barrios (más baratos/caros) — "¿dónde me alcanza?" |
| `estimate_fair_rent` | `POST /api/rentals/estimate` | tasador: rango justo para una vivienda concreta y posición del precio pedido (percentil, % vs mediana, comparables) |
| `compare_neighborhoods` | `GET /api/rentals/zones` + `/zone-scores` | comparar barrios lado a lado: precios, denuncias por tipo, cortes de agua, reclamos, servicios cercanos, y el puesto de cada uno entre los 62 de Montevideo; o rankear por un criterio |
| `find_property_opportunities` | `GET /api/property-opportunities` | avisos pedidos por debajo de comparables con evidencia (brecha %, comparables, anunciantes distintos, cautelas). `operation` = `rent` (default) o `sale` |

### Autos (`autos`, 6)

| tool | upstream | para qué |
|---|---|---|
| `search_used_cars` | `GET /api/cars` | directorio de 10 fuentes: marca/modelo (acepta nombre, resuelve slug), año, km, precio US$, consumo máx. L/100 km, combustible, caja, carrocería, puertas, color, departamento, automotora/particular, fuente, bajó de precio, sólo oportunidades, sin deuda ni choque declarados, publicado en los últimos N días, orden |
| `find_car_opportunities` | `GET /api/car-opportunities` | autos por debajo de su cohorte fija (modelo+año+versión+motor+caja, km comparable): brecha, brecha conservadora, muestra (n, vendedores, p25/mediana/p75) y comparables |
| `get_car` | `GET /api/cars/ficha/:key` | ficha: cohorte, referencia de la guía de ML, riesgos declarados con cita, similares |
| `car_model_prices` | `GET /api/cars/market/:slug` | precio del modelo por año y versión, guía de precios, oportunidades del modelo |
| `car_declared_risks` | `GET /api/car-risks` | avisos que DECLARAN deuda, papeles, choque, recupero, mecánica, chapa extranjera, ex taxi, con la frase del vendedor y cuánto menos piden; resumen por categoría |
| `car_market_report` | `GET /api/car-report` | secciones: panorama, **qué se compra con cada presupuesto**, depreciación por modelo, margen de negociación, automotora vs particular, valuación (km, automática, diésel) |

### Productos (`productos`, 5)

| tool | upstream | para qué |
|---|---|---|
| `list_directories` | `GET /api/directorios` | qué directorios hay, cuántos ítems y links |
| `search_products` | `/api/phones`, `/api/chairs`, `/api/equipar`, `/api/movilidad/{monopatin-electrico,bicicleta-electrica}` | búsqueda unificada normalizada: vertical, texto, marca, tope de precio, nuevo/usado → nombre, banda de precios, mejor oferta (vendedor, precio, link), cantidad de vendedores, tier/rating |
| `plan_home_setup` | `GET /api/equipar` | canasta para equipar una vivienda (mínima/…): excluir lo que ya se tiene, preferir usado o nuevo, total parcial honesto con lo que falta |
| `check_online_store` | `GET /api/stores`, `/api/stores/:slug` | señales fechadas de una tienda online (antigüedad del dominio, Google, Trustpilot, Reddit, políticas, medios de pago). Nunca un veredicto "confiable/estafa" |
| `supermarket_prices` | `GET /api/precios` | precios oficiales SIPC por artículo (p10/mediana/p90) y supermercados más baratos por canasta emparejada |

## Prompts (flujos guiados; en Claude Desktop aparecen como comandos)

`buscar-alquiler`, `evaluar-aviso-alquiler`, `comparar-barrios`, `buscar-auto-usado`,
`evaluar-auto`, `equipar-casa` (+ `analizar-dolar-hoy` existente). Cada uno: entrevistar lo
mínimo, llamar las tools en orden, presentar lista corta con links y una checklist de visita.

## Skill

`mcp/skills/buscador-uruguay/`: `SKILL.md` + `references/{alquileres,autos,productos,api-http}.md`.
Enseña el flujo (entrevista → búsqueda → ranking → verificación → shortlist), las reglas del
dominio y, si no hay MCP conectado, **cómo llamar la API HTTP pública directamente** (Claude Code
y otros agentes con fetch). Se publica además como zip en
`app/public/descargas/buscador-uruguay-skill.zip` (Claude.ai → Skills → subir), generado por
`mcp/scripts/pack-skill.mjs` (zip "store", sin dependencias, `zlib.crc32` de Node ≥22); un test
verifica que el zip coincide con la carpeta.

## Página para usuarios

`/buscar-con-ia`: qué se puede pedir, cómo conectarlo paso a paso (Claude.ai/Desktop conector
personalizado con la URL, ChatGPT modo desarrollador, Claude Code `claude mcp add`, Cursor/VS
Code JSON, npx local), descarga de la skill, prompts de ejemplo copiables por vertical,
privacidad y límites. Entrada en `siteNav`, i18n del label (es/en/pt), y `McpConfigCard`
menciona las nuevas capacidades y linkea la página. No es un cambio pensado para mover tráfico:
no lleva fila en `docs/seo/experiments.json`.

## Reglas de dominio que las tools respetan (y dicen)

- Alquiler ≠ total: el total suma gastos comunes **del mismo aviso**; ~70 % de los avisos no
  los publica → `monthly` null, nunca estimado.
- Avisos sin visto en 10 días no se muestran; "reportado no disponible" viene de la comunidad.
- Oportunidad = precio **pedido** por debajo de comparables, no tasación; siempre con cautelas.
- Autos: precios en US$; moneda deducida (`currencyInferred`) se marca; riesgo = lo que el
  vendedor declara, con cita; la ausencia no es afirmación.
- Tiendas: señales con fecha, nunca veredicto.
- No se inventan datos de contacto; se linkea el aviso original.

## Errores, límites y privacidad

- Cliente HTTP con timeout 20 s, UA `cambio-uruguay-mcp/<versión>`, caché en memoria (60 s
  búsquedas; 10 min catálogos grandes: zonas, equipar, sillas, celulares, tiendas, precios,
  directorios, informe de autos), deduplicación de pedidos en vuelo.
- 429 del sitio (el ranking por hogar admite 10/min por IP) → error claro "reintentá en un
  minuto"; 503 → "temporalmente no disponible"; 404 → "no existe o ya no está publicado".
- Ingresos, coordenadas y direcciones del hogar **no se loguean** ni se cachean.

## Pruebas

- Handlers puros con `SiteApi` falso y fixtures sintéticos con la forma real (vitest).
- Test de servidor con `InMemoryTransport`: toolsets registran exactamente sus tools; llamadas
  end-to-end devuelven texto + structuredContent.
- `mcp/vitest.config.ts` propio (hoy el paquete hereda el config de la raíz y falla en un
  checkout sin `node_modules` de raíz).
- Humo en vivo `npm run smoke` contra producción (fuera de CI).
- App: test de la página (ruta en siteNav, zip presente) + `npm run lint`.

## Deploy

App: push a `main` (CI). MCP: manual según `mcp/DEPLOY.md` (SSH, `git pull`, `npm install`,
`npm run build`, `pm2 reload currency-mcp`), verificar `tools/list` contra
`https://mcp.cambio-uruguay.com/mcp`. Versión 0.2.0. `npm publish` sigue pendiente de login.

## Fuera de alcance (v1)

Crear alertas o reportar disponibilidad desde la IA (escrituras: se devuelve `siteUrl` para
hacerlo en el sitio); búsqueda de ventas de viviendas (sólo oportunidades de venta); series de
precios (arrancaron el 2026-09-18, sin historia útil todavía); CyberLunes (sin elegibles hasta
2026-10-08).
