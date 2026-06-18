# Import calculator: freight fixes + couriers comparison page

**Date:** 2026-06-18
**Scope:** `pages/herramientas/calculadora-impuestos-importacion.vue`, `utils/importTax.ts`,
`utils/courierShipping.ts`, `tests/unit/importTax.test.ts`, new `pages/couriers-uruguay.vue`.

## Problem

Five issues with the import-cost calculator (courier regime):

1. **Stale freight on toggle off.** Disabling "Estimar flete por peso" leaves the last
   weight-computed value stuck in the (now editable) freight field. It should reset to 0.
2. **IVA taxes freight.** `courierImport` builds `declared = value + shipping + insurance`,
   caps the franchise at `declared`, and charges IVA on the franchised base — so freight inside
   the franchise gets taxed. IVA must apply only to the product's internal cost.
3. **Freight is invisible in the breakdown.** The first line bundles it: "Valor declarado
   (mercadería + envío)". Freight must be its own explicit line so the total reads clearly.
4. **No copy stating the rule.** Nothing tells the user IVA is always on the product cost and
   never on the courier freight.
5. **No courier comparison.** No page lists/compares the couriers available in Uruguay, and the
   calculator does not link to one.

## Decisions (locked)

- **Freight = untaxed pass-through (courier regime).** Franchise, IVA and the 60% simplified
  rate all operate on the **merchandise value only**. Freight is added to the landed total with
  no IVA and no 60%. (User-chosen over "freight exempt from IVA but still in the 60% base".)
- **Couriers page is standalone** at `/couriers-uruguay` (own SEO/OG + `ItemList` JSON-LD),
  ES-only, following the ToolShell SEO style (`useSeoMeta` + `defineOgImageComponent` +
  `useHead` for canonical + schema). Not a `tools.ts` catalog entry.
- TIFA / USA ≤ USD 200 IVA exemption stays, but its threshold is now checked on the
  **merchandise value** (freight is no longer part of the declared goods value).
- `generalImport` (régimen general) is **unchanged**: there CIF legitimately includes freight
  and IVA applies over CIF + arancel + tasa consular. The product owner's directive is scoped to
  the courier regime ("costo de envío del courier"). The page copy will make this distinction
  explicit so the two regimes don't read as contradictory.

## Changes

### A. `utils/importTax.ts` — `courierImport`

Restructure the courier math so freight never enters any tax base:

```
value      = max(input.value, 0)        // merchandise / internal product cost
shipping   = max(input.shipping, 0)     // courier freight — pass-through, untaxed
insurance  = max(input.insurance, 0)    // (courier UI keeps this 0)

franchise  = useFranchise ? min(franchiseAvailable ?? 800, value) : 0   // on merchandise
excess     = max(value - franchise, 0)                                   // -> 60%

usaIvaExempt = origin === 'usa' && value <= TIFA_IVA_EXEMPTION_USD       // threshold on goods
iva        = round(franchise * (usaIvaExempt ? 0 : ivaPct) / 100)
simplified = round(excess * ratePct / 100); if 0 < simplified < minTax -> minTax

totalTax   = iva + simplified                       // freight contributes 0
taxableBase= (usaIvaExempt ? 0 : franchise) + excess
landedCost = value + totalTax + shipping            // freight added at the end, untaxed
effectiveRatePct = value > 0 ? totalTax / value * 100 : null
```

Breakdown lines (in order):

| Condition | Label | Amount |
|---|---|---|
| always | `Mercadería` | `value` |
| `useFranchise && franchise > 0` | `Franquicia (exenta de aranceles)` | `-franchise` |
| `useFranchise && franchise > 0` | TIFA exempt → `IVA exonerado (TIFA · EE.UU. ≤ US$ 200)`; else `IVA (22%) sobre la mercadería` | `iva` |
| `useFranchise && excess > 0` | `Impuesto único (60%) sobre el excedente` | `simplified` |
| `!useFranchise` | `Impuesto único (60%)` | `simplified` |
| `shipping > 0` | `Envío / flete (sin impuestos)` | `shipping` |

The merchandise-only declared value drops the old "Valor declarado (mercadería + envío)" line.
`generalImport` is untouched.

### B. `pages/herramientas/calculadora-impuestos-importacion.vue`

- **Toggle reset:** replace the `watch([shipByWeight, computedShipping], …)` so that when
  `shipByWeight` becomes `false` (courier regime), `shipping.value = 0`; when `true`, it tracks
  `computedShipping`. (Watch `shipByWeight` for the reset; keep feeding `computedShipping` while on.)
- **Copy — "Cómo funciona" (courier paragraph):** add a sentence: el IVA se calcula siempre
  sobre el costo del producto; el flete del courier se suma aparte y no paga IVA.
- **By-weight box:** one-line note that the freight estimated here is added to the total without
  taxes, plus the link to the comparison page (see D).
- **New FAQ entry:** "¿El flete del courier paga IVA?" → No; el IVA grava el costo interno del
  producto, no el envío. (Contrast with régimen general where the freight is part del CIF.)
- **Disclaimer:** minor wording so it no longer implies freight is taxed in the courier regime.

### C. `utils/courierShipping.ts` — replace placeholders with verified, sourced couriers

Extend `Courier` with presentation/source fields; the by-weight selector keeps using
`perKgUsd`/`baseUsd`.

```ts
export interface Courier {
  id: string
  name: string
  perKgUsd: number      // representative small-parcel reference rate, USD/kg
  baseUsd: number       // handling fee per shipment, USD
  modality: string      // e.g. "Casillero en Miami", "Aéreo puerta a puerta", "Postal oficial"
  transit?: string      // e.g. "3–7 días hábiles"
  website: string       // official site
  source: string        // URL backing the reference rate / info
  note?: string         // tiered-rate / surcharge caveats
}
```

The existing placeholder list (USX Cargo, Miami Box, Aeropost/Tiendamia, Grabr, Correo/postal)
is **replaced** with the real couriers whose tariffs were verified (2026-06-18). The estimator
selector uses the four casillero services that publish a clean per-kg, with their **small-parcel
tier** as the reference `perKgUsd` (heavier-parcel tiers are noted on the page, not modelled by
the flat `base + perKg·kg` estimate):

| id | name | perKgUsd | baseUsd | modality | transit | note |
|---|---|---|---|---|---|---|
| `gripper` | Gripper | 21.9 | 5 | Casillero en Miami | 3–7 días hábiles | Escala: 5–20 kg US$16.5/kg; +10% TSPU; <900 g US$19.80 fijo |
| `enviamicompra` | Envía Mi Compra | 21.9 | 5 | Casillero en Miami | — | Escala: 10–20 kg US$16.5/kg; 20+ kg US$11.9/kg; mín. 0.5 kg |
| `casillamia` | Casilla Mía | 20 | 10 | Casillero en Miami | — | Por tramos de 500 g; despacho aduana US$75 (≤800)/135 (>800) |
| `puntomio` | Punto Mío | 18 | 5 | Casillero en Miami | — | Desde US$8.99 (<0.5 kg); libros US$8.90/kg; tiene calculadora propia |

Rates are explicitly labelled **"de referencia, verificadas el 2026-06-18"**; the page tells
users to confirm on each courier's site. The `+10% TSPU` (Tasa de Servicio Postal Universal) is
mentioned as a real surcharge not included in the per-kg figure.

### D. New page `pages/couriers-uruguay.vue`

- ES-only standalone page; hero (title + intro) then a responsive comparison `VTable`:
  **Courier · Modalidad · US$/kg (ref.) · Cargo fijo · Demora · Sitio**, sourced from `COURIERS`.
- A short prose section **"Otras opciones"** linking the broader landscape with sources, not in
  the structured estimator: Correo Uruguayo (postal oficial), Logistika.US (aéreo, desde US$130),
  couriers express DHL/UPS/FedEx (por cotización) y marketplaces con envío incluido
  (Tiendamia, Aeropost).
- A box explaining how this ties to the calculator: el flete del courier es un costo aparte que
  **no paga IVA**; solo la mercadería tributa. Link/CTA back to
  `/herramientas/calculadora-impuestos-importacion`.
- "Fuentes y referencias" block: each courier's `source` + the Aduanas franchise page + the MEF
  FAQ. Prominent note that per-kg rates are reference values verified on 2026-06-18 and change.
- SEO: `useSeoMeta` (title/description/OG/twitter), `defineOgImageComponent('Cambio', …)`,
  `useHead` with canonical `https://cambio-uruguay.com/couriers-uruguay` and JSON-LD
  `@graph` = `[ItemList of couriers, BreadcrumbList]`.
- Link from the calculator (section B by-weight box): "¿Qué courier conviene? Mirá la comparativa
  de couriers en Uruguay" → `/couriers-uruguay` (via `localePath`).

### Verified sources (2026-06-18)

- Aduanas — nuevo régimen de franquicias (mayo 2026): franquicia US$ 800/año, hasta 3 envíos,
  máx. 20 kg; **la franquicia se aplica al valor de la factura y NO incluye el flete internacional**.
- MEF — guía de preguntas frecuentes del régimen de envíos postales (IVA, excepción EE.UU. ≤ US$ 200).
- Tarifas verificadas: Gripper (`/tarifas`), Envía Mi Compra (`/servicios-tarifas`),
  Casilla Mía (`/Tarifas`), Punto Mío, Logistika.US (`/puerta-a-puerta`), Correo Uruguayo (`/tarifas`).

## Testing

`tests/unit/importTax.test.ts` — update the courier expectations to the new model and add cases:

- `value 150, origin other, useFranchise` → IVA 22% of 150 = 33; landed 183 (unchanged numerically).
- `value 150, shipping 40, useFranchise, other` → tax still 33 (freight untaxed); **landed 223**
  (183 + 40); freight appears as its own breakdown line.
- `value 1000, franchise 800, other` → IVA 176 + 60% of 200 (120) = 296; landed 1296 (unchanged).
- `value 1000, shipping 100, franchise 800, other` → tax 296 (freight untaxed); landed 1396.
- `value 250, origin usa, useFranchise` → above 200 → IVA 55 (TIFA threshold on merchandise).
- `value 100, shipping 20, useFranchise false` → 60% of 100 = 60 (freight not in base); landed 180.
- Remove/replace the old `includes shipping and insurance in the declared value` test
  (`taxableBase 125`) — it asserted the now-removed behavior.
- `generalImport` tests unchanged.

`courierShipping` tests unchanged (cost math untouched). New page is presentational; covered by
the existing build/lint, no unit test required for the table render.

## Out of scope

- Régimen general math, IMESI, insurance handling.
- Real-time / scraped courier tariffs (rates stay manual reference values).
- i18n of the new page (site tools are ES-only).
- Changing the franchise cap (USD 800) or the 60% / minimum constants.
