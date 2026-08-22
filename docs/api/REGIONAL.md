# Cotizaciones regionales — `GET /regional*`

El dólar y los cruces de **Argentina, Brasil, Paraguay, Chile, Bolivia y Uruguay**, con todos los
mercados que publica cada país, series diarias y comparación de rutas. Público, sin clave, CORS
abierto.

- Página que lo documenta para humanos: `/api-cotizaciones-regionales`
- Tablero que lo consume: `/cotizaciones-de-la-region`
- Página de ruta a Brasil: `/llevar-dolares-o-reales-a-brasil`
- Código: `classes/regional/`, entrypoint `sync_regional.ts`, rutas en `index.ts`

## Por qué existe

Un equipo de estudiantes de UTEC pidió cobertura de divisas regionales para un proyecto académico.
La API era uruguaya; ahora no. (Como en `/api-cotizacion-intradia`, se publica **qué** se pidió y
**qué** se hizo, nunca quién lo pidió — ver `docs/` de esa página y la Ley 18.331.)

El problema real que resuelve: "el dólar en Argentina" son **siete precios simultáneos**, "el dólar
en Brasil" son tres, y en Bolivia el oficial casi no se opera. Una API que devuelve un número por
país obliga a adivinar cuál. Ésta devuelve todos, etiquetados por `kind`.

## Endpoints

| Endpoint | Qué devuelve |
|---|---|
| `GET /regional` | Snapshot completo: `quotes`, `board` (una fila por país), `gaps`, `cross` (matriz), `routes` (comparación de rutas), `sources` (quién respondió), `rejected` (qué se descartó y por qué) |
| `GET /regional/history` | Serie diaria de un mercado. Filtros: `country`, `market`, `base`, `quote`, `from`, `to`, `limit` (1–20000, default 5000) |
| `GET /regional/series` | Inventario de series: clave, país, mercado, par, días y rango |
| `GET /regional/compare` | Rutas "comprar acá" vs "llevar dólares". Filtros: `currency`, `amount` |
| `GET /regional/convert` | Conversión entre monedas de la región pasando por el dólar. `from`, `to`, `amount`, `market` |
| `GET /regional/sources` | Catálogo de fuentes: id, publicador, URL, tipo de acceso y qué aporta |

Caché Redis: 120 s el snapshot, 1800 s las series y el catálogo.

## Modelo de datos

Una `RegionalQuote` es **el precio de una unidad de `base` expresado en `quote`**:

```jsonc
{
  "id": "AR:blue:USDARS",        // ${country}:${market}:${base}${quote}
  "country": "AR",
  "market": "blue",
  "label": "Dólar blue",
  "kind": "parallel",            // official | wholesale | parallel | financial | card | retail | reference
  "base": "USD", "quote": "ARS",
  "buy": 1530, "sell": 1550, "avg": 1540, "spreadPct": 1.3072,
  "high": null, "low": null, "variationPct": 0,
  "updatedAt": "2026-08-21T19:59:00.000Z",   // hora que declara la FUENTE
  "source": "ar_bluelytics",
  "sourceUrl": "https://api.bluelytics.com.ar/v2/latest",
  "corroboratedBy": ["ar_dolarapi", "ar_dolarhoy", "ar_ambito"],
  "disagreementPct": 0.4239
}
```

`kind` no es decoración: comparar un `official` con un `parallel` sin decirlo es el error clásico de
las páginas de cotizaciones.

## Las 23 fuentes (21 en vivo + 2 sólo para historia)

Redundantes a propósito: un país cubierto por UNA fuente no tiene forma de notar que esa fuente se
rompió. El 21-08-2026 la única referencia internacional publicó el boliviano 39 % abajo y nada en el
sistema podía distinguirlo de un movimiento real.

| id | Publicador | País | Acceso | Qué aporta |
|---|---|---|---|---|
| `ar_dolarapi` | DolarAPI | AR | API | Los siete dólares argentinos en un shape + EUR/BRL/CLP/UYU en pesos |
| `ar_bluelytics` | Bluelytics | AR | API | Segunda lectura del blue + **euro blue** (nadie más lo publica) |
| `ar_ambito` | Ámbito Financiero | AR | API | Ocho mercados **con la variación del día** |
| `ar_dolarhoy` | DolarHoy | AR | scrape | Tercera lectura del blue; la página que mira el público argentino |
| `ar_criptoya` | CriptoYa | AR | API | Quinta lectura, con los financieros **desglosados por bono** (se usa AL30 24 h) y el cripto por stablecoin |
| `ar_bcra` | BCRA | AR | API | Toda la región cotizada en pesos argentinos por el banco central |
| `ar_argentinadatos` | ArgentinaDatos | AR | API | **Serie diaria desde 2011-01-03** (sólo backfill) |
| `br_bcb` | Banco Central do Brasil | BR | API | Fixing **PTAX** + serie diaria **desde 1995** |
| `br_awesomeapi` | AwesomeAPI | BR | API | **Dólar turismo**, cruce directo ARS/BRL, máximo/mínimo del día |
| `cl_mindicador` | mindicador.cl (BCCh) | CL | API | Dólar observado + serie por año |
| `cl_boostr` | Boostr | CL | API | Segunda lectura del observado: cuando coinciden, prueban que **lo leímos bien** |
| `cl_dolarapi` | DolarAPI Chile | CL | API | Mostrador chileno + peso argentino en pesos chilenos |
| `py_bcp` | Banco Central del Paraguay | PY | scrape | Referencial del mercado libre + planilla de ~26 monedas |
| `py_dolarpy` | DolarPy | PY | API | El referencial **por segundo camino** + once casas de cambio en una respuesta |
| `py_maxicambios` | Maxicambios | PY | scrape | Mostrador paraguayo (USD, BRL, ARS, UYU, EUR) |
| `bo_bcb` | Banco Central de Bolivia | BO | scrape | El oficial que fija el banco central. Bolivia era el único país con una sola fuente |
| `bo_dolarapi` | DolarAPI Bolivia | BO | API | Oficial + paralelo (Binance P2P): la brecha real boliviana |
| `uy_local` | cambio-uruguay.com | UY | interno | Mejor precio entre ~46 casas + referencia BCU. Dato propio |
| `uy_external` | DolarAPI Uruguay | UY | API | Lectura de un tercero sobre nuestro propio mercado: el control externo |
| `world_currencyapi` | Currency API (jsDelivr) | Global | API | Referencia mid-market |
| `world_floatrates` | FloatRates | Global | API | Referencia mid-market |
| `world_coinbase` | Coinbase | Global | API | Referencia mid-market |
| `world_erapi` | ExchangeRate-API (open) | Global | API | Referencia mid-market. **La que se rompió**: se conserva porque ahora la votan las otras tres |

Cobertura por mercado tras el cambio (medido 2026-08-22): el blue y el oficial argentinos con **5
lecturas**, el MEP/CCL/cripto/tarjeta con 4, el observado chileno con 2 (0 % de diferencia), el
referencial paraguayo con 2 (0,0085 %), el oficial boliviano con 2 (0,17 %) y cada referencia
internacional con 4.

El BCP no tiene API: su servicio REST está detrás de Cloudflare y contesta 403; las dos páginas
server-rendered sí se leen.

## Validación (`classes/regional/validate.ts`)

Cuatro filtros, en orden de cuánto saben:

1. **Forma** — venta por debajo de compra más de 3 % (`MIN_SPREAD_PCT`), o spread > 50 %
   (`MAX_SPREAD_PCT`, "cartel, no precio").
2. **Bandas** — precio del dólar fuera de un rango imposible para esa moneda (`USD_BANDS`, un orden
   de magnitud de holgura: existen para cazar un parser que leyó la columna equivocada, no para
   opinar sobre dónde debería estar una moneda).
3. **Consenso** — con 3+ fuentes sobre el mismo mercado, se descarta la que se aleja de la mediana:
   **> 20 %** entre relevamientos de un mercado (dos encuestas del blue difieren de verdad) y
   **> 3 %** cuando todas las fuentes del grupo son referencias mid-market (`kind: reference`), que
   están describiendo el mismo número y no la misma multitud. Con cuatro feeds globales y cinco
   lecturas argentinas, este filtro dejó de ser teórico.
4. **Coherencia** — una cotización que no está en dólares tiene que coincidir (±35 %) con lo que
   implican las dos patas en dólares del mismo país. Acá muere un corrimiento de columna.
5. **La referencia internacional contra el propio país** (±5 %). Medido contra el tablero vivo el
   2026-08-22, el feed mid-market gratuito estaba **11 % abajo en el peso chileno, 12 % en el
   uruguayo y 39 % en el boliviano**, mientras acertaba el peso argentino y el real. Sirve como
   respaldo si un país se queda sin fuentes propias — para eso está — pero no puede sentarse en el
   tablero **contradiciendo al banco central** del país que dice describir.

Lo descartado se **publica** en `rejected` con el motivo. Un tablero que tira filas en silencio
convierte una regresión de parser en un misterio de la semana siguiente.

Después de validar, `dedupeQuotes` deja **una fila por mercado**: gana el publicador de mayor rango
(banco central > proveedor de datos > medio > casa de cambio > referencia internacional), y los
demás quedan en `corroboratedBy` con la diferencia máxima en `disagreementPct`.

## Historia

Dos caminos, y no son lo mismo:

- **Backfill** (`--backfill`, diario): las series que el propio publicador entrega — siete dólares
  argentinos desde 2011, PTAX desde 1995, dólar observado chileno año por año.
- **Snapshot**: todo lo demás (Paraguay, Bolivia, el mostrador uruguayo, los cruces) no tiene
  historia pública, así que su serie **empieza el día que este trabajo corrió por primera vez** y
  crece una fila por día.

La fila diaria guarda el **último valor observado del día** (su cierre), nunca su apertura: se
sobreescribe en cada corrida. El día se mide en **la zona horaria del país que publicó el precio**.

Trampas cazadas en producción:

- La API SGS del BCB **rechaza ventanas de más de diez años** y lo hace devolviendo vacío, que es
  indistinguible de "no hay serie" — por eso `sgsWindows()` parte el rango.
- Un publicador que rate-limita devuelve `null`, que el log escribe como FALLÓ y no como "0 días".
- **Chile publica hacia adelante**: el dólar observado de un día hábil se fija la tarde anterior, así
  que un sábado la serie ya trae el valor del lunes. Es calendario, no bug — se guarda. Lo que se
  descarta es cualquier día a más de `MAX_FUTURE_DAYS` (7) de hoy, que sí sería un error de zona
  horaria o de parseo.

Colecciones reales en Mongo: **`regional_datas`** y **`regional_histories`** — mongoose pluraliza el
nombre del modelo, igual que `bcu_rates_datas`. Índices: `{key, day}` único, `{country, market, day}`
y `{day}`. Al 2026-08-22: 40.587 documentos, ~7,8 MB de datos y ~3,5 MB de índices.

## Operación

| pm2 app | script | cron (UTC) |
|---|---|---|
| `currency-regional` | `dist/sync_regional.js` | `*/20 * * * *` |
| `currency-regional-history` | `dist/sync_regional.js --backfill` | `9 5 * * *` |

Ambas en `OTHER_APPS` de `scripts/deploy-backend.sh`. Local: `npm run sync_regional` /
`npm run sync_regional_backfill`.

Guardas de escritura: no se publica un snapshot vacío, ni uno con menos de la mitad de las
cotizaciones del guardado (`REGIONAL_COLLAPSE_RATIO`, default 0.5). Si el snapshot no se pudo
publicar, el proceso sale con código 1 — pm2 no debe reportar éxito mientras el tablero envejece.

Env opcionales: `REGIONAL_HOST_GAP_MS` (400), `REGIONAL_HTTP_TIMEOUT_MS` (15000),
`REGIONAL_SOURCE_TIMEOUT_MS` (30000), `REGIONAL_USER_AGENT`, `REGIONAL_COLLAPSE_RATIO`.

## Atribución

Salvo la fila de Uruguay, ningún dato es nuestro. Cada cotización trae `source` y `sourceUrl`: si se
publica un número tomado de acá, **el crédito va a quien lo publica**.
