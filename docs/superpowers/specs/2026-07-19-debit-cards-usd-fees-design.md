# Tarjetas de débito/prepagas para compras en USD e ítems de juegos — comisiones reales

**Fecha:** 2026-07-19
**Rama:** `feat/debit-cards-usd-fees`
**Estado:** diseño aprobado (2026-07-19), pendiente de research + implementación

## Motivación

Pregunta real (r/uruguay, estilo): un usuario paga con Prex un ítem de juego de
**USD 49,99**, tenía **$4.000 pesos** en la billetera y le descontaron
**$2.168,41** en total. Deduce que Prex cobró **≈ US$ 4,16 (~6,8 %)** de
comisión, y pregunta:

1. ¿Es correcto que la comisión ronda el 6,8 %?
2. ¿Es posible que además le hayan cobrado por **pasar de pesos a dólares**?
3. ¿Cómo le va con **OCA** y otras?

No existe hoy ninguna página del sitio dedicada a **comisiones de tarjetas de
débito/prepagas en compras internacionales / ítems de juegos en USD**. La prosa
más cercana vive dentro de `cardRewards.ts` y `bankTierlist.ts` (que ya trae el
dato Prex "exterior 2,5 % + USD 0,50 + IVA"). Nicho abierto.

## Diagnóstico del caso (grounding del diseño)

Descomposición de la compra Prex, ítem USD 49,99, billetera **en pesos**:

| Concepto | USD |
|---|---|
| Precio ítem | 49,99 |
| Comisión exterior 2,5 % | 1,25 |
| Cargo fijo | 0,50 |
| IVA 22 % sobre la comisión | 0,385 |
| **Subtotal en USD** | **≈ 52,12** |
| × dólar venta Prex ≈ 41,6 | → **≈ $2.168 pesos** |
| **Costo efectivo sobre el ítem** | **≈ 6,9 %** |

El **$2.168** es aritmética pura (52,12 × 41,6). El **~6,9 %** es el sobreprecio
frente a comprar los mismos USD 49,99 al **mayorista/BCU ≈ 40,5** (49,99 × 40,5 ≈
$2.025 → 2.168/2.025 − 1 ≈ 7 %): captura **comisión + spread** juntos. Si sólo se
compara contra el propio tipo venta (41,6), aparece únicamente la comisión
(~4,3 %) — el spread queda "escondido" en el tipo de cambio. La página muestra
las dos lecturas. Reconstruye el **$2.168,41** y el **~6,8 %** casi exactos. Conclusión que la
página debe transmitir: **son dos costos apilados**, no uno solo:

- **(a) Comisión internacional del emisor** — en Prex ≈ 4,3 % sobre un ticket de
  USD 50 (2,5 % + USD 0,50 fijo + IVA sobre la comisión).
- **(b) Conversión pesos → dólar** al tipo **venta** del emisor, con un spread de
  ~1–3 % sobre el mayorista. Esto responde la pregunta 2: **sí, te cobran por
  pasar de pesos a dólares** — es el margen de cambio. Fondear la billetera
  directamente en USD (cuando el emisor lo permite) evita ese tramo, pero **no**
  la comisión internacional.

El cargo fijo (USD 0,50) pesa desproporcionadamente en tickets chicos: en una
compra de USD 5 sería ~10 % solo por el fijo. Mensaje de la página.

## Decisiones de alcance (confirmadas con el usuario)

1. **Estructura:** una sola página combinada (ranking + explicación + calculadora).
2. **Universo:** débito bancario **+** prepagas/fintech.
3. **Datos:** fuentes primarias donde existan; donde no, **estimación rotulada**
   como tal, anclada al caso real.

## Arquitectura

Mismo patrón que `cardRewards.ts`/`bankTierlist.ts`/`rentCommunities.ts`:
catálogo puro en `utils/` + página en `pages/` + test unitario + registro en
`siteNav.ts`. Copy en español; sólo SEO/nav localizados.

### 1. Data catalog — `app/utils/debitCards.ts` (módulo puro)

Sin imports de Vue/Nuxt. Objeto congelado. Interfaces:

```ts
export const DEBIT_CARDS_LAST_REVIEWED = '2026-07-19' // YYYY-MM-DD verificación

export type CardKind = 'banco' | 'prepaga' | 'fintech'
export type CardNetwork = 'visa' | 'mastercard' | 'otro'

// Rúbrica transparente, pesos suman 100, enfocada en uso "comprar en USD/exterior"
export type DimId =
  | 'comisionExterior'  // menor comisión internacional = mayor score
  | 'spreadCambio'      // menor margen peso→USD = mayor score
  | 'saldoUSD'          // ¿podés fondear/mantener saldo en dólares?
  | 'costo'             // emisión/mantenimiento/recarga
  | 'aceptacion'        // Visa/MC, funciona en Steam/PSN/Google Play, 3DS
  | 'recarga'           // facilidad/costo de cargar fondos
export interface RubricDimension { id: DimId; label: string; short: string; icon: string; weight: number; what: string }
export const DEBIT_RUBRIC: readonly RubricDimension[] // Object.freeze, Σ weight = 100

export interface SourceLink { label: string; url: string; publisher: string }

export interface Signal { label: string; value: string; tone: 'pos' | 'neg' | 'neutral' }

export interface DebitCard {
  id: string
  name: string
  issuer: string
  kind: CardKind
  networks: CardNetwork[]
  // Estructura de costo en compra internacional (USD). null = sin dato oficial.
  comisionExteriorPct: number | null   // % sobre el monto de la compra
  cargoFijoUsd: number | null          // cargo fijo por transacción, USD
  ivaSobreComision: boolean            // ¿IVA 22 % aplica sobre la comisión?
  fundeaEnUsd: boolean                 // ¿podés cargar saldo en dólares y saltear conversión?
  fxSpreadNote: string                 // cómo/ a qué tipo convierte pesos→USD
  feeNote: string                      // resumen legible de la estructura de costo
  estimate: boolean                    // true = alguna cifra es estimación, no dato oficial
  scores: Record<DimId, number>        // 0–100 por dimensión
  signals: readonly Signal[]           // datos con fuente
  pros: readonly string[]
  cons: readonly string[]
  bestFor: string
  verdict: string
  verified: boolean                    // hechos núcleo confirmados contra fuente
  sources: readonly SourceLink[]       // fuentes específicas de esta tarjeta
}
export const DEBIT_CARDS: readonly DebitCard[]  // Object.freeze
export const DEBIT_SOURCES: readonly SourceLink[] // fuentes generales (régimen cambiario, BCU, IVA)

// Scoring (idéntico patrón a computeOverall/rankedPrograms)
export function computeOverall(scores: Record<DimId, number>): number
export interface RankedCard extends DebitCard { overall: number; rank: number }
export function rankedCards(cards?: readonly DebitCard[]): RankedCard[]
export function medalFor(rank: number): string | null
export function getDebitCard(id: string): DebitCard | undefined

// Calculadora del costo real
export interface IntlCostInput {
  purchaseUsd: number
  card: DebitCard
  fxVenta: number          // tipo de cambio venta pesos→USD aplicado por el emisor
  fxMid?: number           // tipo mayorista/BCU para estimar el spread (opcional)
}
export interface IntlCostResult {
  purchaseUsd: number
  comisionUsd: number      // % + fijo
  ivaUsd: number
  subtotalUsd: number      // purchase + comision + iva
  totalPesos: number       // subtotalUsd * fxVenta
  spreadPesos: number | null   // (fxVenta - fxMid) * subtotalUsd, si fxMid dado
  costoEfectivoPct: number // (totalPesos / (purchaseUsd * (fxMid ?? fxVenta)) - 1) * 100
}
export function estimateIntlCost(input: IntlCostInput): IntlCostResult
```

`estimate`/`verified`/`comisionExteriorPct: null` permiten cumplir la decisión #3:
donde no hay dato oficial se marca en vez de inventar.

**Universo a poblar (research):** débito **BROU, Itaú, Santander, Scotiabank,
BBVA**; prepagas/fintech **Prex, OCA (prepaga/débito), MiDinero, Astropay,
dLocal, Mercado Pago, Takenos, Paysandú**. (Lista final la ajusta el research
según qué emisores realmente sirven para compras USD/juegos y tienen T&C
públicos.)

### 2. Página — `app/pages/tarjetas-de-debito-uruguay.vue`

Patrón `alquilar-en-uruguay.vue`: `<script setup lang="ts">`, español inline,
`useLocalePath()`, `useSeoMeta` + `useHead` (BreadcrumbList + FAQPage JSON-LD),
`defineOgImageComponent`. Secciones:

1. **Calculadora "¿cuánto me sale de verdad?"** — inputs: monto USD, tarjeta,
   tipo de cambio venta (editable, default razonable). Salida: desglose
   (comisión %, cargo fijo, IVA, spread, total pesos, % efectivo). **Pre-cargada
   con el caso Prex USD 49,99 → ~$2.168 / ~6,9 %.**
2. **"¿Por qué USD 49,99 me salió más?"** — descompone los dos costos con el caso.
3. **"¿Me cobraron por pasar de pesos a dólares?"** — sí, el spread; cómo evitarlo
   fondeando en USD; qué emisores lo permiten.
4. **Ranking** (scores computados, podio + detalle por tarjeta) con panel de
   metodología desde `DEBIT_RUBRIC`.
5. **Tabla head-to-head** "costo real de un ítem de USD 50" por tarjeta (usa
   `estimateIntlCost`).
6. **Tips** — fondear en USD, ojo cargo fijo en tickets chicos, moneda de la
   tienda del juego, evitar doble conversión, chequear que la tarjeta funcione en
   Steam/PSN/Google Play.
7. **FAQ** (FAQPage schema) — las preguntas exactas del post + variantes.
8. **Fuentes** — `DEBIT_SOURCES` + fuentes por tarjeta.

Links internos relevantes: `/mejores-bancos-uruguay`, `/tarjetas-de-credito-uruguay`,
`/herramientas/calculadora-spread`, `/casas-de-cambio`, `/apps-economia-uruguay`.

### 3. Registro de navegación — `app/utils/siteNav.ts`

Añadir un `NavEntry` en la sección **`credit`** (donde ya viven
`/mejores-bancos-uruguay`, `/tarjetas-de-credito-uruguay`):
`{ to: '/tarjetas-de-debito-uruguay', labelKey: 'nav.debitCards', icon: 'mdi-...',
keywords: ['debito','prepaga','prex','oca','comprar en dolares','juegos','steam',
'comision exterior','pagar online'] }`. Agregar `nav.debitCards` a
`i18n/locales/{es,en,pt}.ts` (y json si aplica).

### 4. Test — `app/tests/unit/debitCards.test.ts`

Mismo molde que `rentCommunities.test.ts` + `cardRewards.test.ts`:

- **Rúbrica:** `DEBIT_RUBRIC` pesos suman 100, ids únicos, dentro de `DimId`.
- **Catálogo:** `DEBIT_CARDS.length >= 10`; cada tarjeta con `name`/`issuer`/
  `bestFor`/`verdict` no vacíos, `scores` completos y en 0–100, `kind`/`networks`
  en sus enums, `sources` con `https://` y sin duplicar, `signals` no vacíos.
- **Coherencia de datos:** si `comisionExteriorPct == null` o `estimate == true`,
  el `feeNote` lo refleja (no afirma cifra oficial). `verified` presente.
- **Scoring:** `computeOverall` 0→0, 100→100, ponderación correcta; `rankedCards`
  ordena desc con rank 1-indexado; `medalFor` 🥇🥈🥉.
- **Calculadora:** `estimateIntlCost` reproduce el caso Prex (USD 49,99, 2,5 %,
  fijo 0,50, IVA, `fxVenta` 41,6) → `subtotalUsd` ≈ 52,12 y `totalPesos` ≈ 2.168
  (±1) — aritmética exacta. Con `fxMid` 40,5 → `costoEfectivoPct` ≈ 6–7 (comisión
  + spread) y `spreadPesos` ≈ 55–60; **sin** `fxMid` → ≈ 4–4,3 (sólo comisión) y
  `spreadPesos == null`. El test asevera ambas ramas.
- **Fuentes:** `DEBIT_SOURCES` no vacío, todas `https://`.

## Research + verificación (previo a hornear números)

Las comisiones/spread por emisor son el trabajo sensible y el repo exige fuente.
Post-aprobación del spec: **Workflow** de fan-out — un agente por emisor busca
T&C oficiales de compra internacional (comisión %, cargo fijo, IVA, si permite
saldo USD, tipo de cambio aplicado) + un agente para el régimen cambiario/IVA UY;
luego verificación adversarial de cada cifra; síntesis al catálogo. Cifras sin
fuente oficial → `estimate: true` + nota. Estampar `DEBIT_CARDS_LAST_REVIEWED`.

Anclas conocidas a verificar/actualizar: Prex "exterior 2,5 % + USD 0,50 + IVA"
(hoy en `bankTierlist.ts`), Takenos 3 %.

## Fuera de alcance (YAGNI)

- Trilingüe en el cuerpo (patrón del repo: cuerpo ES, sólo nav/SEO localizados).
- Datos en vivo / auto-refresh (snapshot estático fechado, como rentCommunities).
- Tarjetas de crédito a fondo (ya existe `/tarjetas-de-credito-uruguay`; sólo
  linkear cuando convenga crédito para compras USD).

## Criterios de éxito

- La página responde las 3 preguntas del post con números que reconstruyen el caso.
- `npm run lint` y el test unitario pasan; `siteNav-coverage` pasa (página registrada).
- Cada cifra de comisión tiene fuente **o** está rotulada como estimación.
- Ranking con scores computados (no hand-set), metodología visible.
