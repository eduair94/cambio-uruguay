# Mi lista de seguimiento — diseño

**Fecha:** 2026-08-09
**Ruta:** `/mi-lista`
**Estado:** aprobado (orden permanente del mantenedor: auto-aprobar spec + plan)

## Problema

El sitio compara *todo el mercado*. Alguien de Tacuarembó, de Salto o de un barrio
concreto de Montevideo tiene que volver a filtrar lo mismo en cada visita: qué
casas tiene realmente cerca, qué tarjeta le conviene usar, cuánto se movió lo que
mira. Hoy eso se pierde al cerrar la pestaña. Las funciones que persisten
(favoritos, resultados guardados, alertas) están detrás del login, que es
fricción justo para el público que menos la tolera.

## Qué construimos

Una **lista de seguimiento personal**, sin login, que el usuario arma una vez:

1. **Su zona** — su ubicación (geolocalización), una localidad concreta, o un
   departamento entero.
2. **Sus casas** — las casas / bancos / fintechs que realmente usaría.
3. **Sus tarjetas** — las de débito/prepagas/fintech que tiene en la billetera.

Desde ahí `/mi-lista` es su tablero: las mejores cotizaciones **entre sus casas,
en su zona**, cuánto se movieron **desde su última visita**, y **cuál de sus
tarjetas** le sale más barata para una compra en dólares.

## Principios de diseño

- **Sin login.** localStorage primero. La cuenta sincroniza entre dispositivos,
  no habilita la función. Mismo espíritu que `/pizarra`.
- **Alcance real, no distancia ciega.** Una cotización *online* (Prex, eBROU,
  TRANSFERENCIA, fintechs) tiene alcance nacional: se toma igual desde Rivera
  que desde Pocitos. Filtrar por distancia la escondería justo para el usuario
  del interior, que es a quien más le sirve. Regla ya codificada en
  `utils/exchangeChannel.ts` (`channelForRate`, `servesDepartment`); la
  reutilizamos, no la reimplementamos.
- **Nada de coordenadas inventadas.** El centro de una localidad se **deriva**
  del centroide de las sucursales reales que la API ya publica (`/api/locations`,
  campos `dept` / `locality` / `lat` / `lng`). No se agrega un dataset de barrios
  a mano.
- **Los "barrios" son un punto + radio.** No existe dataset de barrios en la API.
  Geolocalización con radio de 1–2 km cubre el caso "mi barrio" sin inventar
  datos; el selector de departamento/localidad cubre "mi ciudad" y "el interior".
- **Módulos puros + cableado fino.** La lógica vive en módulos sin Vue, testeados
  en Node; las páginas y el store solo cablean.

## Arquitectura

### Módulos puros

**`app/utils/watchlist.ts`** — forma, validación, (de)serialización y merge.

```ts
export type WatchZoneMode = 'point' | 'department'

export interface WatchZone {
  mode: WatchZoneMode
  /** point: coordenadas del usuario o centroide de una localidad */
  lat?: number
  lng?: number
  /** point: radio de búsqueda en km */
  radiusKm?: number
  /** department: nombre canónico tal cual lo publica localData */
  department?: string
  /** Etiqueta legible ("Mi ubicación", "Salto", "MONTEVIDEO") */
  label?: string
}

export interface Watchlist {
  zone: WatchZone | null
  /** origins seguidos; vacío = "todas las de mi zona" */
  origins: string[]
  /** ids de utils/debitCards.ts */
  cards: string[]
  /** códigos de moneda seguidos, p.ej. ['USD'] */
  currencies: string[]
  direction: 'buy' | 'sell'
  /** monto de referencia para el cálculo de costo de tarjeta (USD) */
  amountUsd: number
}
```

- `WATCHLIST_STORAGE_KEY = 'cu_watchlist_v1'`, `WATCHLIST_SNAPSHOT_KEY = 'cu_watchlist_snap_v1'`
- `DEFAULT_WATCHLIST`
- `sanitizeWatchlist(raw): Watchlist` — recorta, valida rangos (radio 1–200 km,
  monto 0–100 000), tope de 40 origins / 12 tarjetas / 6 monedas. Compartido por
  cliente y servidor, igual que `sanitizeStoredCart`.
- `mergeWatchlists(local, remote): Watchlist` — unión de origins/tarjetas/monedas;
  la zona y los escalares de la cuenta ganan si la cuenta tiene zona, si no
  adopta la local (misma regla que `mergeCarts`).
- `encodeWatchlist(w): string` / `decodeWatchlist(s): Watchlist | null` — JSON
  compacto en base64url para el deep link `?l=`. Tolerante a basura: devuelve
  `null`, nunca tira.

**`app/utils/watchlistBoard.ts`** — el tablero.

- `localitiesForDepartment(branches, dept): Array<{ locality, count }>`
- `zoneCenter(branches, zone): LatLng | null` — centroide de las sucursales de
  esa localidad/departamento; para `mode: 'point'` devuelve el punto tal cual.
- `buildBoard(input): BoardRow[]` — por cada moneda seguida:
  - filtra filas públicas (sin interbancario/BCU: se reusa `publicRates`),
  - una fila por `origin` + `type`,
  - **alcance**: `online` pasa siempre (nacional); `presencial` exige sucursal
    dentro del radio (modo punto) o en el departamento (modo departamento),
  - `distanceKm` a la sucursal más cercana (null para online),
  - respeta `origins` cuando no está vacío,
  - marca `best` por moneda+dirección.
- `applyDrift(rows, snapshot): BoardRow[]` — agrega `prev` y `deltaPct` contra la
  foto de la última visita; `takeSnapshot(rows)` produce la foto nueva.
- `rankCardCosts(cardIds, amountUsd, fxVenta, fxMid)` — envuelve
  `estimateIntlCost` de `utils/debitCards.ts`, ordena de más barata a más cara.
  `fxVenta` sale de la mejor venta USD del tablero del usuario; `fxMid` del
  promedio del mercado, así el spread queda visible.

### Estado

**`app/stores/watchlist.ts`** (Pinia) — espejo de `stores/importCart.ts`:
localStorage inmediato, push debounced a `/api/me/watchlist` cuando hay sesión,
merge al loguearse. La foto de la última visita es **solo local** (es "desde tu
última visita en este dispositivo"), no se sincroniza.

Enganche en `plugins/firebase.client.ts` junto a `cart.hydrateFromAccount` /
`cart.onLogout`.

### Persistencia en cuenta

- `app/server/models/Watchlist.ts` — un documento por `uid`.
- `app/server/api/me/watchlist/index.get.ts` — devuelve el doc o uno vacío.
- `app/server/api/me/watchlist/index.put.ts` — `sanitizeWatchlist` + upsert.
  Mismo patrón exacto que `me/cart`.

### UI

`app/pages/mi-lista.vue` + `app/components/watchlist/`:

- `ZonePicker.vue` — botón "Usar mi ubicación", radio, o departamento →
  localidad. Chips de ciudades rápidas como fallback si deniegan el permiso
  (mismo patrón que `/casa-de-cambio-cerca-de-mi`).
- `OriginPicker.vue` — lista de casas de la zona con check; muestra badge
  "online / nacional" para las que no dependen de sucursal.
- `CardPicker.vue` — chips de `DEBIT_CARDS` agrupadas por tipo.
- `QuoteBoard.vue` — la tabla del tablero: origen, tipo de operación, compra /
  venta, distancia o "en tu celular", Δ desde la última visita, botón de alerta.
- `CardBoard.vue` — costo real de una compra de USD N con cada tarjeta elegida,
  la más barata destacada, link a `/tarjetas-de-debito-uruguay`.

Estado vacío = asistente de 3 pasos, cada paso salteable. Estado configurado =
tablero arriba, configuración plegada en un panel.

Tablas anchas con `cu-mobile-cards` + `data-label` (regla del repo para móvil).

### Integraciones existentes que se reutilizan

- Alertas: cada fila ofrece "avisame si…" con la alerta precargada contra
  `POST /api/me/alerts` (solo con sesión; si no hay, invita a entrar).
- Compartir: `?l=<base64url>` reusa `ShareButtons`; al abrir un link con `?l=`
  se ofrece importar la lista sin pisar la propia en silencio.
- Navegación: alta en `utils/siteNav.ts` (sección herramientas) — sin eso el test
  de cobertura de rutas falla, que es justamente el objetivo.

## SEO

Página indexable con título/descripción/OG propios. El tablero es client-only
(vive en localStorage), así que el SSR entrega la explicación + el asistente
vacío, que es contenido real y suficiente para el crawler. Sin `noindex`: es una
herramienta pública, no un área de cuenta.

## Errores y bordes

| Caso | Comportamiento |
|---|---|
| localStorage corrupto | `sanitizeWatchlist` devuelve la lista por defecto |
| Geolocalización denegada | Mensaje + chips de ciudades + selector de departamento |
| Zona sin sucursales de las casas seguidas | Muestra solo las online + sugiere ampliar el radio |
| Sin cotización para una moneda seguida | La fila se omite; nota "sin datos hoy" |
| Deep link `?l=` inválido | Se ignora en silencio, la lista local no se toca |
| Sin sesión | Todo funciona; los botones de alerta invitan a entrar |
| Tarjeta sin comisión publicada | `estimateIntlCost` no inventa costo; la fila lo dice |

## Tests

- `app/tests/unit/watchlist.test.ts` — sanitize (topes, rangos, basura), merge,
  encode/decode round-trip y entradas hostiles.
- `app/tests/unit/watchlistBoard.test.ts` — centroide de localidad, la regla de
  alcance nacional de las online (el test que impide la regresión que mataría el
  caso del interior), filtro por radio, mejor fila, drift, ranking de tarjetas.
- `app/tests/unit/api-watchlist.test.ts` — GET/PUT, sanitización en el servidor,
  auth requerida (espejo de `api-import-cart.test.ts`).
- `app/tests/e2e/mi-lista.spec.ts` — humo: elegir ciudad rápida, marcar una
  tarjeta, ver el tablero, recargar y que persista.

## Fuera de alcance

- Dataset propio de barrios con coordenadas a mano.
- Notificaciones automáticas nuevas (las alertas ya existen y se reutilizan).
- Seguimiento de tarjetas de crédito por puntos/beneficios: el catálogo de
  `cardRewards.ts` es de programas de recompensas, no de costo de cambio; se
  enlaza pero no se duplica en el tablero.
