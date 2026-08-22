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
| `GET /regional/changes` | **Cada movimiento de precio, sin umbral mínimo.** Filtros: `key`, `country`, `market`, `base`, `quote`, `from`, `to`, `limit` (1–5000, default 500) |
| `GET /regional/series` | Inventario de series: clave, país, mercado, par, días y rango |
| `GET /regional/compare` | Rutas "comprar acá" vs "llevar dólares". Filtros: `currency`, `amount` |
| `GET /regional/convert` | Conversión entre monedas de la región pasando por el dólar. `from`, `to`, `amount`, `market` |
| `GET /regional/sources` | Las fuentes **con el estado de la última corrida**: si respondió, cuánto tardó, qué mercados publica, en cuáles corrobora, qué se le descartó. Más un `summary` con `singleSourceMarkets` |
| `GET /regional/sources/{id}` | La misma ficha, de una sola fuente |

Caché Redis: 120 s el snapshot y las fuentes, 60 s los movimientos, 1800 s las series y el catálogo.

## El ledger de movimientos

`/regional/history` guarda **un punto por día** y esa fila se sobrescribe en cada corrida: al cerrar
el día lo que queda es el cierre. Sirve para dibujar cuarenta años y no sirve para nada de lo que
pasa adentro de un día.

`/regional/changes` es la otra mitad. Cada corrida compara lo que acaba de leer contra el último
estado conocido de cada mercado y escribe una fila por diferencia. **No hay umbral**: la primera
corrida registró un movimiento de 0,0002 % en el dólar cripto argentino (tres milésimas de peso) y
otro de 0,0431 % en el paralelo boliviano. Un umbral parece higiene y es una decisión editorial
disfrazada — quien consume el ledger puede filtrar por el tamaño que le importe; lo que no puede es
recuperar lo que nunca se guardó.

La **resolución** es la del trabajo: se ve lo que hay cuando se mira, cada diez minutos. Dos
movimientos dentro de la misma ventana quedan como uno, del primer valor al último. Por eso cada
fila trae:

- `observedAt` — cuándo lo vimos;
- `sourceUpdatedAt` — cuándo dice la fuente que fijó el valor;
- `sinceMinutes` — cuánto pasó desde la lectura anterior de ese mercado.

Un mercado que aparece por primera vez NO genera fila: sin estado anterior no hay movimiento, y una
fila con 0 % la contaría alguien como un cambio real. La colección (`regional_changes`) es
append-only y única por (clave, momento observado), así que un reinicio de pm2 no puede duplicar
nada.

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
| `ar_bcra` | BCRA | AR | API | Toda la región cotizada en pesos argentinos por el banco central, **y su serie del dólar desde 1996** |
| `ar_argentinadatos` | ArgentinaDatos | AR | API | **Serie diaria desde 2011-01-03** (sólo backfill) |
| `br_bcb` | Banco Central do Brasil | BR | API | Fixing **PTAX** + serie diaria **desde el Plano Real (julio 1994)** |
| `br_awesomeapi` | AwesomeAPI | BR | API | **Dólar turismo**, cruce directo ARS/BRL, máximo/mínimo del día |
| `cl_mindicador` | mindicador.cl (BCCh) | CL | API | Dólar observado + serie por año **desde 1984** |
| `cl_boostr` | Boostr | CL | API | Segunda lectura del observado: cuando coinciden, prueban que **lo leímos bien** |
| `cl_dolarapi` | DolarAPI Chile | CL | API | Mostrador chileno + peso argentino en pesos chilenos |
| `py_bcp` | Banco Central del Paraguay | PY | scrape | Referencial del mercado libre + planilla de ~26 monedas + **archivo día por día desde 2014** |
| `py_dolarpy` | DolarPy | PY | API | El referencial **por segundo camino** + once casas de cambio en una respuesta |
| `py_maxicambios` | Maxicambios | PY | scrape | Mostrador paraguayo (USD, BRL, ARS, UYU, EUR) |
| `bo_bcb` | Banco Central de Bolivia | BO | scrape | El oficial que fija el banco central. Bolivia era el único país con una sola fuente |
| `bo_dolarapi` | DolarAPI Bolivia | BO | API | Oficial + paralelo (Binance P2P): la brecha real boliviana |
| `uy_local` | cambio-uruguay.com | UY | interno | Mejor precio entre ~46 casas + referencia BCU. Dato propio, **con serie desde 2022-12-28** |
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

Tres caminos, y no son lo mismo:

- **Series enteras** que el publicador entrega de una: los siete dólares argentinos desde
  2011-01-03, la **referencia del BCRA desde 1996-01-02** (la convertibilidad y el salto de 2002
  adentro), el **PTAX brasileño desde el 1 de julio de 1994** y el **dólar observado chileno desde
  1984-01-02**.
- **Archivos que sólo contestan de a un día**, recorridos con presupuesto por corrida y salteando lo
  ya guardado: el del Banco Central del Paraguay (`?fecha=dd/mm/yyyy`, con archivo desde 2014) y
  **nuestra propia colección diaria uruguaya desde 2022-12-28**, que nunca había sido mirada como
  serie. El tablero uruguayo histórico se rearma con `buildUyQuotes`, la MISMA función que arma la
  fila de hoy: si la regla de qué casa entra cambia, el histórico y el presente cambian juntos.
- **El snapshot**: todo lo demás no tiene historia pública, así que su serie empieza el día que este
  trabajo corrió por primera vez y crece una fila por día.

Por qué el PTAX no arranca en 1984, que es donde arranca la serie del BCB: porque antes de julio de
1994 la moneda era el cruzeiro, a 2.828 por dólar. Guardarlo bajo la clave `USDBRL` sería publicar
otra moneda con esta etiqueta.

La fila diaria guarda el **último valor observado del día** (su cierre), nunca su apertura: se
sobreescribe en cada corrida. El día se mide en **la zona horaria del país que publicó el precio**.

Trampas cazadas en producción:

- La API SGS del BCB **rechaza ventanas de más de diez años** devolviendo vacío, que es
  indistinguible de "no hay serie" — por eso `sgsWindows()` parte el rango.
- Un publicador que rate-limita devuelve `null`, que el log escribe como FALLÓ y no como "0 días".
- **Chile publica hacia adelante**: el dólar observado de un día hábil se fija la tarde anterior, así
  que un sábado la serie ya trae el lunes. Es calendario, no bug — se guarda. Lo que se descarta es
  cualquier día a más de `MAX_FUTURE_DAYS` (7) de hoy.
- **El BCP contesta cualquier fecha.** Pedirle un domingo devuelve la página con el encabezado del
  domingo y una sola fila: `(*)Prom. viernes`, el promedio del día hábil anterior. Guardarla
  copiaría el viernes sobre el domingo, así que el archivo sólo acepta filas **con hora**.

Colecciones reales en Mongo: **`regional_datas`**, **`regional_histories`** y
**`regional_changes`** — mongoose pluraliza el nombre del modelo, igual que `bcu_rates_datas`.

## Operación

| pm2 app | script | cron (UTC) |
|---|---|---|
| `currency-regional` | `dist/sync_regional.js` | `*/10 * * * *` |
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
