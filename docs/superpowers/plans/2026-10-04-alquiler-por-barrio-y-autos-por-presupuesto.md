# Alquiler por barrio y autos por presupuesto — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar ~122 páginas indexables `/alquiler/<departamento>/<barrio>` y 5 páginas
`/autos-usados-uruguay/hasta-<monto>-dolares`, armadas sólo con snapshots que ya existen.

**Architecture:** Un módulo puro por familia en `app/utils/` (slugs, armado de la respuesta, gate de
indexación, FAQ), un endpoint delgado por familia en `app/server/api/` que lee los loaders
existentes con caché, y una página Vue SSR por familia. Hubs, fichas y sitemap enlazan las páginas.

**Tech Stack:** Nuxt 4.4 / Vuetify 4.2 / TypeScript 6.0, vitest, mongoose (APP DB).

**Spec:** `docs/superpowers/specs/2026-10-04-alquiler-por-barrio-y-autos-por-presupuesto-design.md`

**Worktree:** `C:\Users\airau\Documents\GitHub\cu-seo-barrios` (rama `feat/seo-barrios-presupuestos`).
`app/node_modules` está instalado ahí. Correr todo desde `C:\Users\airau\Documents\GitHub\cu-seo-barrios\app`.
Tests del app: `npx vitest run <ruta>`. Lint: `npm run lint` (`npm run typecheck` está roto, no usarlo).

## Global Constraints

- Sólo español en las dos familias: `defineI18nRoute({ locales: ['es'] })` (como `pages/alquileres/[key].vue:49`).
- Mínimo de muestra: una mediana se publica sólo si la proyección la dejó no nula (n ≥ 8, `RENTAL_ZONE_SAMPLE_MINIMUM`).
- Indexación barrio: ≥ 2 celdas publicables (apartamento + casa, cualquier dormitorio incluido `any`) Y snapshot `market.generatedAt` de ≤ 7 días. Si no: `noindex, follow` y fuera del sitemap.
- Indexación presupuesto: tramo con ≥ 3 modelos.
- Topes de presupuesto: exactamente `[6000, 10000, 15000, 20000, 30000]` (paridad con `classes/autos/report.ts`).
- Nunca una mediana de medianas: entre barrios sólo se COMPARAN medianas (rank, similares).
- Cache del endpoint: `public, max-age=120, s-maxage=300`; error de base → 503 con `no-store`; no encontrado → 404.
- Title ≤ 60 caracteres con la marca (`seoTitleBudget`), description única por página (`seoDescriptionBudget`).
- Montos en pesos con `Intl.NumberFormat('es-UY')`, sin decimales; dólares "US$ 6.000".
- Cero cifras de ingreso publicitario en código, comentarios o commits (repo público).
- No mover `pages/alquileres-uruguay.vue`.

## Review Focus

- Barrio con tilde/mayúsculas en distintos portales ("POCITOS"/"Pocitos", "Malvín"/"MALVIN"): una sola página, una sola URL; el slug con tilde también resuelve (`malvín` → 404 está bien, `malvin` → página). Test en Task 1.
- Dos barrios distintos cuyo slug coincide (p. ej. "Carrasco" en Montevideo y en Canelones): el departamento los separa; dentro de un mismo departamento, dos nombres con el mismo slug se unen (son la misma cadena normalizada). Test en Task 1.
- Snapshot vencido (el job estuvo caído del 1 al 4/10/2026): página sigue respondiendo 200 con los datos y la fecha, pero `indexable: false`. Test en Task 1.
- Base caída o lenta: endpoint 503 `no-store`, la página devuelve 503 y no cachea una página vacía en el borde. Avisos del barrio que fallan → lista vacía, la página igual se sirve. Test en Task 2.
- Monto inválido (`hasta-7000-dolares`, `hasta-abc-dolares`, `hasta-6000.5-dolares`): 404, nunca cae en `[key].vue` con un 500. Test en Task 5.

---

### Task 1: Módulo puro de barrios (`app/utils/rentalBarrio.ts`)

**Files:**
- Create: `app/utils/rentalBarrio.ts`
- Test: `app/tests/unit/rentalBarrio.test.ts`

**Interfaces:**
- Consumes: `RentalZoneSnapshots` (`app/utils/rentalZones.ts:282`), `rentalZoneName`, `rentalZoneLabel` (`app/utils/rentalZones.ts`), `slugifyText` (`app/utils/longform.ts`), `slugifyDepartment` (`app/utils/departments.ts`), tipos `RentalZonePrices`, `RentalZonePropertyType`, `RentalZoneBedrooms` (`app/utils/rentalZoneTypes.ts`).
- Produces:
  ```ts
  export const RENTAL_BARRIO_MAX_AGE_DAYS = 7
  export const RENTAL_BARRIO_MIN_CELLS = 2
  export const RENTAL_BARRIO_BEDROOMS: readonly RentalZoneBedrooms[] // ['any','0','1','2','3','4plus']
  export const RENTAL_BARRIO_TYPES: readonly RentalZonePropertyType[] // ['apartamento','casa']
  export function rentalBarrioSlug(neighborhood: string): string
  export function rentalBarrioPath(department: string, neighborhood: string): string // '/alquiler/montevideo/pocitos'
  export interface RentalBarrioCell { propertyType: RentalZonePropertyType; bedrooms: RentalZoneBedrooms; prices: RentalZonePrices }
  export interface RentalBarrioLink { department: string; neighborhood: string; path: string; median: number | null; count: number }
  export interface RentalBarrioSummary { department: string; departmentSlug: string; neighborhood: string; slug: string; path: string; cells: RentalBarrioCell[]; publishableCells: number; listings: number }
  export function listRentalBarrios(snapshots: RentalZoneSnapshots): RentalBarrioSummary[]
  export interface RentalBarrioRank { position: number; of: number; propertyType: RentalZonePropertyType; bedrooms: RentalZoneBedrooms }
  export interface RentalBarrioPage {
    department: string; departmentSlug: string; neighborhood: string; slug: string; path: string
    cells: RentalBarrioCell[]; rank: RentalBarrioRank | null
    similar: RentalBarrioLink[]; largest: RentalBarrioLink[]
    generatedAt: string | null; rentalDataAsOf: string | null; indexable: boolean
    officialZone: string | null // nombre del barrio oficial INE (sólo Montevideo) o null
  }
  export function buildRentalBarrioPage(snapshots: RentalZoneSnapshots, departmentSlug: string, barrioSlug: string, now?: number): RentalBarrioPage | null
  export function rentalBarrioDirectoryPath(department: string, neighborhood: string, bedrooms?: string): string
  ```

Notas de dominio:
- `snapshots.market.buckets` ya viene proyectado: `{ department (canónico, p. ej. 'Montevideo'), neighborhood (cadena cruda del primer aviso), propertyType, bedrooms, prices }`, y la proyección ya anula medianas con n < 8.
- Un barrio = (departamento, `rentalZoneName(neighborhood)`). Varios buckets del mismo barrio pueden traer distinta grafía; la etiqueta visible es `rentalZoneLabel(todasLasGrafías)`.
- "Celda publicable" = `prices.rent.median !== null`.
- `listings` del resumen = `rent.count` de la celda `apartamento/any` + `casa/any` (las `any` no se solapan entre tipos; las de dormitorio sí se solapan con `any`, por eso no se suman).
- Rank: celda preferida `apartamento/2`; si este barrio no la tiene publicable, `apartamento/any`; si tampoco, `null`. Se ordenan DESC por mediana todos los barrios del mismo departamento con esa misma celda publicable; `position` es 1-based (1 = el más caro).
- `similar`: barrios del mismo departamento (sin el propio) con la celda del rank publicable, ordenados por |mediana − la propia| asc, hasta 6. Sin rank → `[]`.
- `largest`: barrios del mismo departamento (sin el propio) ordenados por `listings` desc y luego nombre, con ≥ 1 celda publicable, hasta 6. `median` = mediana `apartamento/any` o null.
- `indexable` = `publishableCells >= RENTAL_BARRIO_MIN_CELLS && edad(market.generatedAt) <= 7 días`.
- `buildRentalBarrioPage` devuelve `null` si el barrio no existe en el departamento o si `market` es null.

- [ ] **Step 1: Escribir el test que falla**

```ts
// app/tests/unit/rentalBarrio.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildRentalBarrioPage,
  listRentalBarrios,
  rentalBarrioDirectoryPath,
  rentalBarrioPath,
  rentalBarrioSlug,
} from '../../utils/rentalBarrio'
import type { RentalZoneSnapshots } from '../../utils/rentalZones'

const NOW = Date.parse('2026-10-04T12:00:00Z')
const dist = (median: number | null, count = 20) => ({
  count,
  mean: median,
  median,
  p25: median === null ? null : Math.round(median * 0.85),
  p75: median === null ? null : Math.round(median * 1.15),
})
const empty = { count: 0, mean: null, median: null, p25: null, p75: null }
const bucket = (
  neighborhood: string,
  propertyType: 'apartamento' | 'casa',
  bedrooms: 'any' | '0' | '1' | '2' | '3' | '4plus',
  median: number | null,
  count = 20,
  department = 'Montevideo'
) => ({
  department,
  neighborhood,
  propertyType,
  bedrooms,
  prices: {
    rent: dist(median, count),
    commonExpenses: dist(median === null ? null : 6000, count),
    monthlyTotal: dist(median === null ? null : median + 6000, count),
    builtSquareMeter: empty,
    sources: 3,
    lastSeenFrom: '2026-09-28T00:00:00.000Z',
    lastSeenTo: '2026-10-03T00:00:00.000Z',
  },
})
const snapshots = (generatedAt = '2026-10-04T06:53:00.000Z'): RentalZoneSnapshots =>
  ({
    market: {
      generatedAt,
      rentalDataAsOf: generatedAt,
      buckets: [
        bucket('POCITOS', 'apartamento', 'any', 32000, 900),
        bucket('Pocitos', 'apartamento', '2', 36000, 300),
        bucket('POCITOS', 'apartamento', '1', 27000, 250),
        bucket('Pocitos', 'casa', 'any', null, 5),
        bucket('Cordón', 'apartamento', 'any', 24000, 1200),
        bucket('CORDON', 'apartamento', '2', 26000, 400),
        bucket('Malvín', 'apartamento', 'any', 28000, 500),
        bucket('MALVIN', 'apartamento', '2', 34000, 200),
        bucket('Casabó', 'casa', 'any', 15000, 9),
        bucket('Carrasco', 'apartamento', 'any', 45000, 100, 'Canelones'),
        bucket('Carrasco', 'apartamento', '2', 47000, 40, 'Canelones'),
      ],
    },
    context: null,
  }) as unknown as RentalZoneSnapshots

describe('rentalBarrioSlug / rentalBarrioPath', () => {
  it('pliega tildes, mayúsculas y espacios', () => {
    expect(rentalBarrioSlug('Malvín Norte')).toBe('malvin-norte')
    expect(rentalBarrioSlug('  PUNTA   CARRETAS ')).toBe('punta-carretas')
    expect(rentalBarrioPath('Cerro Largo', 'Melo')).toBe('/alquiler/cerro-largo/melo')
  })
})

describe('listRentalBarrios', () => {
  it('une las grafías de un mismo barrio y separa departamentos', () => {
    const list = listRentalBarrios(snapshots())
    const pocitos = list.filter(item => item.slug === 'pocitos')
    expect(pocitos).toHaveLength(1)
    expect(pocitos[0]!.neighborhood).toBe('Pocitos')
    expect(pocitos[0]!.publishableCells).toBe(3)
    expect(pocitos[0]!.listings).toBe(905)
    const carrasco = list.filter(item => item.slug === 'carrasco')
    expect(carrasco.map(item => item.departmentSlug)).toEqual(['canelones'])
    expect(list.find(item => item.slug === 'malvin')!.neighborhood).toBe('Malvín')
  })
})

describe('buildRentalBarrioPage', () => {
  it('arma celdas, rank, similares y más buscados', () => {
    const page = buildRentalBarrioPage(snapshots(), 'montevideo', 'pocitos', NOW)!
    expect(page.path).toBe('/alquiler/montevideo/pocitos')
    // `casa/any` de Pocitos tiene mediana nula (n = 5): page.cells sólo trae celdas publicables.
    expect(page.cells.map(cell => `${cell.propertyType}/${cell.bedrooms}`)).toEqual([
      'apartamento/any',
      'apartamento/1',
      'apartamento/2',
    ])
    expect(page.officialZone).toBeNull()
    expect(page.rank).toEqual({ position: 1, of: 3, propertyType: 'apartamento', bedrooms: '2' })
    expect(page.similar.map(link => link.neighborhood)).toEqual(['Malvín', 'Cordón'])
    expect(page.largest[0]!.neighborhood).toBe('Cordón')
    expect(page.largest.some(link => link.neighborhood === 'Carrasco')).toBe(false)
    expect(page.indexable).toBe(true)
  })

  it('sin la celda de 2 dormitorios, compara por apartamento/any', () => {
    const data = snapshots()
    data.market!.buckets = data.market!.buckets.filter(
      row => !(row.neighborhood.toLowerCase() === 'pocitos' && row.bedrooms === '2')
    )
    const page = buildRentalBarrioPage(data, 'montevideo', 'pocitos', NOW)!
    expect(page.rank).toEqual({ position: 1, of: 3, propertyType: 'apartamento', bedrooms: 'any' })
  })

  it('con menos de dos celdas publicables no se indexa', () => {
    const page = buildRentalBarrioPage(snapshots(), 'montevideo', 'casabo', NOW)!
    expect(page.cells).toHaveLength(1)
    expect(page.indexable).toBe(false)
    expect(page.rank).toBeNull()
  })

  it('un snapshot de más de 7 días se sirve pero no se indexa', () => {
    const page = buildRentalBarrioPage(snapshots('2026-09-26T06:53:00.000Z'), 'montevideo', 'pocitos', NOW)!
    expect(page.indexable).toBe(false)
    expect(page.generatedAt).toBe('2026-09-26T06:53:00.000Z')
  })

  it('reconoce el barrio oficial de Montevideo (para el panel de servicios)', () => {
    const data = snapshots()
    ;(data as any).context = { boundaries: { features: [{ properties: { name: 'POCITOS', officialCode: '1' } }] } }
    expect(buildRentalBarrioPage(data, 'montevideo', 'pocitos', NOW)!.officialZone).toBe('POCITOS')
    expect(buildRentalBarrioPage(data, 'montevideo', 'cordon', NOW)!.officialZone).toBeNull()
    expect(buildRentalBarrioPage(data, 'canelones', 'carrasco', NOW)!.officialZone).toBeNull()
  })

  it('arma el filtro del directorio', () => {
    expect(rentalBarrioDirectoryPath('Montevideo', 'Pocitos', '2')).toBe(
      '/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos&bedrooms=2'
    )
    expect(rentalBarrioDirectoryPath('Montevideo', 'Pocitos', 'any')).toBe(
      '/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos'
    )
  })

  it('barrio o departamento desconocido, o sin mercado, devuelve null', () => {
    expect(buildRentalBarrioPage(snapshots(), 'montevideo', 'carrasco', NOW)).toBeNull()
    expect(buildRentalBarrioPage(snapshots(), 'atlantida', 'pocitos', NOW)).toBeNull()
    expect(buildRentalBarrioPage({ market: null, context: null }, 'montevideo', 'pocitos', NOW)).toBeNull()
  })
})
```

- [ ] **Step 2: Correrlo y verlo fallar**

Run: `npx vitest run tests/unit/rentalBarrio.test.ts`
Expected: FAIL, "Failed to resolve import ../../utils/rentalBarrio".

- [ ] **Step 3: Implementar**

```ts
// app/utils/rentalBarrio.ts
// Una página por barrio con lo que ya calcula `currency-property-zones` (snapshot `market`):
// renta, gastos comunes y total por tipo × dormitorios. Este módulo es puro: lo usan el endpoint,
// el sitemap y el hub, así que el gate de indexación vive en un solo lugar.
import { slugifyDepartment } from './departments'
import { slugifyText } from './longform'
import { rentalZoneLabel, rentalZoneName, type RentalZoneSnapshots } from './rentalZones'
import type { RentalZoneBedrooms, RentalZonePrices, RentalZonePropertyType } from './rentalZoneTypes'

export const RENTAL_BARRIO_MAX_AGE_DAYS = 7
export const RENTAL_BARRIO_MIN_CELLS = 2
export const RENTAL_BARRIO_BEDROOMS: readonly RentalZoneBedrooms[] = ['any', '0', '1', '2', '3', '4plus']
export const RENTAL_BARRIO_TYPES: readonly RentalZonePropertyType[] = ['apartamento', 'casa']
const SIMILAR_LIMIT = 6
const LARGEST_LIMIT = 6

export const rentalBarrioSlug = (neighborhood: string): string => slugifyText(rentalZoneName(neighborhood))
export const rentalBarrioPath = (department: string, neighborhood: string): string =>
  `/alquiler/${slugifyDepartment(department)}/${rentalBarrioSlug(neighborhood)}`

export interface RentalBarrioCell {
  propertyType: RentalZonePropertyType
  bedrooms: RentalZoneBedrooms
  prices: RentalZonePrices
}
export interface RentalBarrioLink {
  department: string
  neighborhood: string
  path: string
  median: number | null
  count: number
}
export interface RentalBarrioSummary {
  department: string
  departmentSlug: string
  neighborhood: string
  slug: string
  path: string
  cells: RentalBarrioCell[]
  publishableCells: number
  listings: number
}
export interface RentalBarrioRank {
  position: number
  of: number
  propertyType: RentalZonePropertyType
  bedrooms: RentalZoneBedrooms
}
export interface RentalBarrioPage {
  department: string
  departmentSlug: string
  neighborhood: string
  slug: string
  path: string
  cells: RentalBarrioCell[]
  rank: RentalBarrioRank | null
  similar: RentalBarrioLink[]
  largest: RentalBarrioLink[]
  generatedAt: string | null
  rentalDataAsOf: string | null
  indexable: boolean
  officialZone: string | null
}

export function rentalBarrioDirectoryPath(department: string, neighborhood: string, bedrooms?: string): string {
  const params = new URLSearchParams({ department, neighborhood })
  if (bedrooms && bedrooms !== 'any') params.set('bedrooms', bedrooms)
  return `/alquileres-uruguay?${params.toString()}`
}

const cellOrder = (cell: RentalBarrioCell) =>
  RENTAL_BARRIO_TYPES.indexOf(cell.propertyType) * 10 + RENTAL_BARRIO_BEDROOMS.indexOf(cell.bedrooms)
const cellOf = (summary: RentalBarrioSummary, type: RentalZonePropertyType, bedrooms: RentalZoneBedrooms) =>
  summary.cells.find(cell => cell.propertyType === type && cell.bedrooms === bedrooms) ?? null
const medianOf = (summary: RentalBarrioSummary, type: RentalZonePropertyType, bedrooms: RentalZoneBedrooms) =>
  cellOf(summary, type, bedrooms)?.prices.rent.median ?? null

export function listRentalBarrios(snapshots: RentalZoneSnapshots): RentalBarrioSummary[] {
  const groups = new Map<string, { department: string; spellings: string[]; cells: RentalBarrioCell[] }>()
  for (const bucket of snapshots.market?.buckets ?? []) {
    const key = JSON.stringify([bucket.department, rentalZoneName(bucket.neighborhood)])
    const group = groups.get(key) ?? { department: bucket.department, spellings: [], cells: [] }
    if (!group.spellings.includes(bucket.neighborhood)) group.spellings.push(bucket.neighborhood)
    group.cells.push({ propertyType: bucket.propertyType, bedrooms: bucket.bedrooms, prices: bucket.prices })
    groups.set(key, group)
  }
  const out: RentalBarrioSummary[] = []
  for (const group of groups.values()) {
    const neighborhood = rentalZoneLabel(group.spellings)
    const cells = group.cells.sort((a, b) => cellOrder(a) - cellOrder(b))
    const anyCount = (type: RentalZonePropertyType) =>
      cells.find(cell => cell.propertyType === type && cell.bedrooms === 'any')?.prices.rent.count ?? 0
    out.push({
      department: group.department,
      departmentSlug: slugifyDepartment(group.department),
      neighborhood,
      slug: rentalBarrioSlug(neighborhood),
      path: rentalBarrioPath(group.department, neighborhood),
      cells,
      publishableCells: cells.filter(cell => cell.prices.rent.median !== null).length,
      listings: anyCount('apartamento') + anyCount('casa'),
    })
  }
  return out.sort(
    (a, b) => a.department.localeCompare(b.department, 'es') || b.listings - a.listings || a.neighborhood.localeCompare(b.neighborhood, 'es')
  )
}

const link = (summary: RentalBarrioSummary, type: RentalZonePropertyType, bedrooms: RentalZoneBedrooms): RentalBarrioLink => ({
  department: summary.department,
  neighborhood: summary.neighborhood,
  path: summary.path,
  median: medianOf(summary, type, bedrooms),
  count: summary.listings,
})

export function buildRentalBarrioPage(
  snapshots: RentalZoneSnapshots,
  departmentSlug: string,
  barrioSlug: string,
  now = Date.now()
): RentalBarrioPage | null {
  const market = snapshots.market
  if (!market) return null
  const all = listRentalBarrios(snapshots)
  const self = all.find(item => item.departmentSlug === departmentSlug && item.slug === barrioSlug)
  if (!self) return null
  const peers = all.filter(item => item.department === self.department && item !== self)
  const cells = self.cells.filter(cell => cell.prices.rent.median !== null)

  let rank: RentalBarrioRank | null = null
  let similar: RentalBarrioLink[] = []
  for (const [type, bedrooms] of [['apartamento', '2'], ['apartamento', 'any']] as const) {
    const own = medianOf(self, type, bedrooms)
    if (own === null) continue
    const compared = peers.filter(item => medianOf(item, type, bedrooms) !== null)
    const higher = compared.filter(item => medianOf(item, type, bedrooms)! > own).length
    rank = { position: higher + 1, of: compared.length + 1, propertyType: type, bedrooms }
    similar = compared
      .sort(
        (a, b) =>
          Math.abs(medianOf(a, type, bedrooms)! - own) - Math.abs(medianOf(b, type, bedrooms)! - own) ||
          a.neighborhood.localeCompare(b.neighborhood, 'es')
      )
      .slice(0, SIMILAR_LIMIT)
      .map(item => link(item, type, bedrooms))
    break
  }
  const largest = peers
    .filter(item => item.publishableCells > 0)
    .sort((a, b) => b.listings - a.listings || a.neighborhood.localeCompare(b.neighborhood, 'es'))
    .slice(0, LARGEST_LIMIT)
    .map(item => link(item, 'apartamento', 'any'))

  const generated = Date.parse(market.generatedAt ?? '')
  const fresh = Number.isFinite(generated) && now - generated <= RENTAL_BARRIO_MAX_AGE_DAYS * 86_400_000
  // The 62 official areas only exist for Montevideo; match by the same folded name the job uses.
  const officialZone =
    self.department === 'Montevideo'
      ? (snapshots.context?.boundaries?.features ?? [])
          .map(feature => feature.properties.name)
          .find(name => rentalZoneName(name) === rentalZoneName(self.neighborhood)) ?? null
      : null
  return {
    officialZone,
    department: self.department,
    departmentSlug: self.departmentSlug,
    neighborhood: self.neighborhood,
    slug: self.slug,
    path: self.path,
    cells,
    rank,
    similar,
    largest,
    generatedAt: market.generatedAt ?? null,
    rentalDataAsOf: market.rentalDataAsOf ?? null,
    indexable: fresh && self.publishableCells >= RENTAL_BARRIO_MIN_CELLS,
  }
}
```

Si el tipo `PublicMarket` de `rentalZones.ts` no está exportado, importar `RentalZoneSnapshots` y usar
`NonNullable<RentalZoneSnapshots['market']>['buckets'][number]` cuando haga falta el tipo del bucket.

- [ ] **Step 4: Correr y ver pasar**

Run: `npx vitest run tests/unit/rentalBarrio.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add app/utils/rentalBarrio.ts app/tests/unit/rentalBarrio.test.ts
git commit -m "feat(alquiler): modulo puro de paginas por barrio"
```

---

### Task 2: Endpoints `/api/rentals/barrio` y `/api/rentals/barrios`

**Files:**
- Create: `app/server/utils/rentalBarrio.ts`
- Create: `app/server/api/rentals/barrio.get.ts`
- Create: `app/server/api/rentals/barrios.get.ts`
- Test: `app/tests/unit/rentalBarrioServer.test.ts`

**Interfaces:**
- Consumes: Task 1 (`buildRentalBarrioPage`, `listRentalBarrios`, `RentalBarrioPage`, `RentalBarrioSummary`, `RENTAL_BARRIO_MIN_CELLS`, `RENTAL_BARRIO_MAX_AGE_DAYS`), `loadRentalZoneSnapshots` (`app/server/utils/rentalZones.ts`), `RentalListingModel` (`app/server/models/RentalListing`), `buildRentalFilter`, `normalizeRentalQuery`, `RENTAL_STALE_DAYS`, `RENTAL_COLLATION` (`app/utils/rentals.ts`), `connectDb` (`app/server/utils/db`).
- Produces:
  ```ts
  // app/server/utils/rentalBarrio.ts
  export interface RentalBarrioListing { key: string; title: string; propertyType: string; bedrooms: number | null; price: number; currency: 'UYU' | 'USD'; area: number | null }
  export interface RentalBarrioResponse extends RentalBarrioPage { listings: RentalBarrioListing[]; directoryPath: string }
  export async function loadRentalBarrio(departmentSlug: string, barrioSlug: string, deps?: { snapshots?: typeof loadRentalZoneSnapshots; listings?: (department: string, neighborhood: string) => Promise<RentalBarrioListing[]>; now?: () => number }): Promise<RentalBarrioResponse | null>
  export async function loadIndexableRentalBarrios(deps?: { snapshots?: typeof loadRentalZoneSnapshots; now?: () => number }): Promise<RentalBarrioSummary[]>
  export function rentalBarrioDirectoryPath(department: string, neighborhood: string, bedrooms?: string): string
  ```
  `GET /api/rentals/barrio?department=<slug>&barrio=<slug>` → `RentalBarrioResponse`.
  `GET /api/rentals/barrios` → `{ barrios: Array<Pick<RentalBarrioSummary,'department'|'neighborhood'|'path'|'listings'>> }` (sólo indexables).

Notas:
- `rentalBarrioDirectoryPath('Montevideo','Pocitos','2')` → `/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos&bedrooms=2` (usar `URLSearchParams`; sin `bedrooms` o con `any`, sin ese parámetro).
- Avisos: `RentalListingModel.find(buildRentalFilter(normalizeRentalQuery({ department, neighborhood }), RENTAL_STALE_DAYS))`, `.collation(RENTAL_COLLATION)`, `.sort({ lastSeen: -1 })`, `.limit(6)`, `.select({ _id: 0, key: 1, title: 1, propertyType: 1, bedrooms: 1, price: 1, currency: 1, area: 1 })`, `.maxTimeMS(3000)`, `.lean()`. Cualquier error → `[]`. Antes de escribir esto, leer `buildRentalFilter` (`app/utils/rentals.ts:927`) para confirmar que acepta `(query, staleDays)` sin los otros parámetros y que el modelo tiene esos campos; si el filtro exige `usdUyu`, pasar `0` como el default.
- `loadIndexableRentalBarrios`: `listRentalBarrios` filtrado por `publishableCells >= RENTAL_BARRIO_MIN_CELLS` y frescura (≤ 7 días desde `market.generatedAt`); si el snapshot está vencido devuelve `[]` (el sitemap no publica nada vencido).
- Ruta `barrio.get.ts`: param inválido (no `^[a-z0-9-]{1,80}$`) → 404. `RentalZonesError`/cualquier error del loader → 503 con `cache-control: no-store`. `null` → 404. OK → `public, max-age=120, s-maxage=300`. Mismo patrón que `server/api/rentals/zones.get.ts`.
- Ruta `barrios.get.ts`: mismo manejo de errores, `public, max-age=300, s-maxage=900`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// app/tests/unit/rentalBarrioServer.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn(async () => undefined) }))
vi.mock('../../server/models/RentalListing', () => ({ RentalListingModel: { find: vi.fn() } }))
vi.mock('../../server/utils/rentalZones', () => ({ loadRentalZoneSnapshots: vi.fn() }))

const { loadRentalBarrio, loadIndexableRentalBarrios } = await import('../../server/utils/rentalBarrio')

const NOW = Date.parse('2026-10-04T12:00:00Z')
const dist = (median: number | null) => ({ count: 20, mean: median, median, p25: median, p75: median })
const prices = (median: number | null) => ({
  rent: dist(median),
  commonExpenses: dist(null),
  monthlyTotal: dist(null),
  builtSquareMeter: dist(null),
  sources: 2,
  lastSeenFrom: null,
  lastSeenTo: null,
})
const snapshots = (generatedAt: string) => async () =>
  ({
    market: {
      generatedAt,
      rentalDataAsOf: generatedAt,
      buckets: [
        { department: 'Montevideo', neighborhood: 'Pocitos', propertyType: 'apartamento', bedrooms: 'any', prices: prices(32000) },
        { department: 'Montevideo', neighborhood: 'Pocitos', propertyType: 'apartamento', bedrooms: '2', prices: prices(36000) },
        { department: 'Montevideo', neighborhood: 'Casabó', propertyType: 'casa', bedrooms: 'any', prices: prices(15000) },
      ],
    },
    context: null,
  }) as any

describe('loadRentalBarrio', () => {
  it('agrega avisos y el enlace al directorio', async () => {
    const listings = vi.fn(async () => [
      { key: 'montevideo-pocitos-x', title: 'Apto 2 dorm', propertyType: 'apartamento', bedrooms: 2, price: 35000, currency: 'UYU' as const, area: 60 },
    ])
    const page = await loadRentalBarrio('montevideo', 'pocitos', {
      snapshots: snapshots('2026-10-04T06:00:00Z'),
      listings,
      now: () => NOW,
    })
    expect(page!.listings).toHaveLength(1)
    expect(listings).toHaveBeenCalledWith('Montevideo', 'Pocitos')
    expect(page!.directoryPath).toBe('/alquileres-uruguay?department=Montevideo&neighborhood=Pocitos')
    expect(page!.indexable).toBe(true)
  })

  it('si los avisos fallan, la página sale igual sin avisos', async () => {
    const page = await loadRentalBarrio('montevideo', 'pocitos', {
      snapshots: snapshots('2026-10-04T06:00:00Z'),
      listings: async () => {
        throw new Error('timeout')
      },
      now: () => NOW,
    })
    expect(page!.listings).toEqual([])
  })

  it('barrio desconocido devuelve null; snapshot caído propaga el error', async () => {
    expect(
      await loadRentalBarrio('montevideo', 'atlantida', { snapshots: snapshots('2026-10-04T06:00:00Z'), listings: async () => [], now: () => NOW })
    ).toBeNull()
    await expect(
      loadRentalBarrio('montevideo', 'pocitos', {
        snapshots: async () => {
          throw new Error('503')
        },
        listings: async () => [],
        now: () => NOW,
      })
    ).rejects.toThrow('503')
  })
})

describe('loadIndexableRentalBarrios', () => {
  it('sólo barrios con dos celdas y snapshot fresco', async () => {
    const fresh = await loadIndexableRentalBarrios({ snapshots: snapshots('2026-10-04T06:00:00Z'), now: () => NOW })
    expect(fresh.map(item => item.path)).toEqual(['/alquiler/montevideo/pocitos'])
    const stale = await loadIndexableRentalBarrios({ snapshots: snapshots('2026-09-20T06:00:00Z'), now: () => NOW })
    expect(stale).toEqual([])
  })
})
```

- [ ] **Step 2: Correrlo y verlo fallar**

Run: `npx vitest run tests/unit/rentalBarrioServer.test.ts`
Expected: FAIL, no resuelve `../../server/utils/rentalBarrio`.

- [ ] **Step 3: Implementar**

```ts
// app/server/utils/rentalBarrio.ts
import {
  buildRentalBarrioPage,
  listRentalBarrios,
  RENTAL_BARRIO_MAX_AGE_DAYS,
  RENTAL_BARRIO_MIN_CELLS,
  rentalBarrioDirectoryPath,
  type RentalBarrioPage,
  type RentalBarrioSummary,
} from '../../utils/rentalBarrio'

export { rentalBarrioDirectoryPath }
import { buildRentalFilter, normalizeRentalQuery, RENTAL_COLLATION, RENTAL_STALE_DAYS } from '../../utils/rentals'
import { RentalListingModel } from '../models/RentalListing'
import { connectDb } from './db'
import { loadRentalZoneSnapshots } from './rentalZones'

export interface RentalBarrioListing {
  key: string
  title: string
  propertyType: string
  bedrooms: number | null
  price: number
  currency: 'UYU' | 'USD'
  area: number | null
}
export interface RentalBarrioResponse extends RentalBarrioPage {
  listings: RentalBarrioListing[]
  directoryPath: string
}

async function latestListings(department: string, neighborhood: string): Promise<RentalBarrioListing[]> {
  await connectDb()
  const filter = buildRentalFilter(normalizeRentalQuery({ department, neighborhood }), RENTAL_STALE_DAYS)
  const rows = await RentalListingModel.find(filter)
    .collation(RENTAL_COLLATION)
    .sort({ lastSeen: -1 })
    .limit(6)
    .select({ _id: 0, key: 1, title: 1, propertyType: 1, bedrooms: 1, price: 1, currency: 1, area: 1 })
    .maxTimeMS(3000)
    .lean()
  return (rows as Array<Record<string, unknown>>)
    .filter(row => typeof row.key === 'string' && typeof row.price === 'number')
    .map(row => ({
      key: row.key as string,
      title: String(row.title ?? ''),
      propertyType: String(row.propertyType ?? ''),
      bedrooms: typeof row.bedrooms === 'number' ? row.bedrooms : null,
      price: row.price as number,
      currency: row.currency === 'USD' ? 'USD' : 'UYU',
      area: typeof row.area === 'number' ? row.area : null,
    }))
}

export async function loadRentalBarrio(
  departmentSlug: string,
  barrioSlug: string,
  deps: {
    snapshots?: typeof loadRentalZoneSnapshots
    listings?: (department: string, neighborhood: string) => Promise<RentalBarrioListing[]>
    now?: () => number
  } = {}
): Promise<RentalBarrioResponse | null> {
  const snapshots = await (deps.snapshots ?? loadRentalZoneSnapshots)()
  const page = buildRentalBarrioPage(snapshots, departmentSlug, barrioSlug, (deps.now ?? Date.now)())
  if (!page) return null
  const listings = await (deps.listings ?? latestListings)(page.department, page.neighborhood).catch(() => [])
  return { ...page, listings, directoryPath: rentalBarrioDirectoryPath(page.department, page.neighborhood) }
}

export async function loadIndexableRentalBarrios(
  deps: { snapshots?: typeof loadRentalZoneSnapshots; now?: () => number } = {}
): Promise<RentalBarrioSummary[]> {
  const snapshots = await (deps.snapshots ?? loadRentalZoneSnapshots)()
  const generated = Date.parse(snapshots.market?.generatedAt ?? '')
  const now = (deps.now ?? Date.now)()
  if (!Number.isFinite(generated) || now - generated > RENTAL_BARRIO_MAX_AGE_DAYS * 86_400_000) return []
  return listRentalBarrios(snapshots).filter(item => item.publishableCells >= RENTAL_BARRIO_MIN_CELLS)
}
```

```ts
// app/server/api/rentals/barrio.get.ts
import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { loadRentalBarrio } from '../../utils/rentalBarrio'

const SLUG = /^[a-z0-9-]{1,80}$/

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const query = getQuery(event)
  const department = String(query.department ?? '')
  const barrio = String(query.barrio ?? '')
  if (!SLUG.test(department) || !SLUG.test(barrio))
    throw createError({ statusCode: 404, statusMessage: 'Neighborhood not found' })
  let page
  try {
    page = await loadRentalBarrio(department, barrio)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Neighborhood data temporarily unavailable' })
  }
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Neighborhood not found' })
  setResponseHeader(event, 'cache-control', 'public, max-age=120, s-maxage=300')
  return page
})
```

```ts
// app/server/api/rentals/barrios.get.ts
import { createError, defineEventHandler, setResponseHeader } from 'h3'
import { loadIndexableRentalBarrios } from '../../utils/rentalBarrio'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  let barrios
  try {
    barrios = await loadIndexableRentalBarrios()
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Neighborhood data temporarily unavailable' })
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=900')
  return {
    barrios: barrios.map(({ department, neighborhood, path, listings }) => ({ department, neighborhood, path, listings })),
  }
})
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npx vitest run tests/unit/rentalBarrioServer.test.ts tests/unit/rentalBarrio.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/rentalBarrio.ts app/server/api/rentals/barrio.get.ts app/server/api/rentals/barrios.get.ts app/tests/unit/rentalBarrioServer.test.ts
git commit -m "feat(alquiler): endpoints de barrio y lista de barrios indexables"
```

---

### Task 3: Página `/alquiler/[departamento]/[barrio]`

**Files:**
- Create: `app/utils/rentalBarrioCopy.ts` (textos y FAQ puros)
- Create: `app/pages/alquiler/[departamento]/[barrio].vue`
- Test: `app/tests/unit/rentalBarrioCopy.test.ts`

**Interfaces:**
- Consumes: `RentalBarrioResponse` (Task 2), `RentalBarrioCell` (Task 1), `FaqItem` (`app/utils/faqAnswers`), `FaqSection` (`app/components/Faq/FaqSection.vue`, emite FAQPage solo), `RentalsZoneServicesPanel` (`app/components/rentals/ZoneServicesPanel.vue`, prop `zone: RentalOfficialZone`).
- Produces:
  ```ts
  // app/utils/rentalBarrioCopy.ts
  export const BEDROOM_LABEL: Record<RentalZoneBedrooms, string> // any:'Todos', '0':'Monoambiente', '1':'1 dormitorio', '2':'2 dormitorios', '3':'3 dormitorios', '4plus':'4 o más dormitorios'
  export function formatUyu(value: number | null): string // '$ 32.000' | '—'
  export function rentalBarrioTitle(page: Pick<RentalBarrioPage,'neighborhood'>): string // 'Alquiler en Pocitos: cuánto cuesta hoy' (sin marca; la agrega el layout)
  export function rentalBarrioDescription(page: RentalBarrioPage): string
  export function rentalBarrioIntro(page: RentalBarrioPage): string
  export function rentalBarrioFaq(page: RentalBarrioPage): FaqItem[]
  export function rentalBarrioRankSentence(page: RentalBarrioPage): string | null
  ```

Reglas de copy (todas probadas):
- Title: `Alquiler en ${barrio}: cuánto cuesta hoy`; si con " | Cambio Uruguay" pasa de 60, `Alquiler en ${barrio}: precios hoy`; si aún pasa, `Alquiler en ${barrio}`. Antes de escribirlo, leer `tests/unit/seoTitleBudget.test.ts` para ver cómo se cuenta la marca y replicarlo.
- Description: `Alquilar en ${barrio} (${departamento}): apartamento de 2 dormitorios a ${mediana} por mes de mediana, con gastos comunes y rango por dormitorio. Datos del ${fecha}.` usando la mejor celda disponible en el orden `apartamento/2`, `apartamento/1`, `apartamento/any`, `casa/any`; fecha `d de mes de aaaa` en es-UY desde `rentalDataAsOf`.
- Intro: una oración por cada celda `apartamento/1`, `/2`, `/3` publicable ("1 dormitorio: $ 27.000 de mediana (entre $ 23.000 y $ 31.000)"), y la cantidad de avisos de `apartamento/any`.
- Rank: `${barrio} es el ${n}.º barrio más caro de ${departamento} para un apartamento de 2 dormitorios, entre ${of} con datos.` (o "para un apartamento" si la celda es `any`). Con `of < 3` → `null`.
- FAQ: (1) por cada `apartamento/1|2|3` publicable: "¿Cuánto cuesta alquilar un apartamento de N dormitorios en X?" con mediana, rango y n; (2) si `commonExpenses.median` de `apartamento/any` no es null: "¿Cuánto son los gastos comunes en X?"; (3) si hay rank: "¿X es caro comparado con el resto de D?"; (4) siempre: "¿Qué garantía piden para alquilar en X?" con link `{ to: '/garantia-de-alquiler-uruguay', label: 'Garantías de alquiler' }` (respuesta genérica: ANDA, CGN, seguro de fianza, depósito en BHU; sin cifras). Leer `app/utils/faqAnswers.ts` para la forma exacta de `FaqItem` y de `link`.

Página (estructura; seguir el estilo de `pages/autos-usados-uruguay/precios/[slug].vue` y `pages/celulares-uruguay/[modelo].vue`):
- `defineI18nRoute({ locales: ['es'] })`.
- `definePageMeta({ validate: route => /^[a-z0-9-]{1,80}$/.test(String(route.params.departamento)) && /^[a-z0-9-]{1,80}$/.test(String(route.params.barrio)) })`.
- `useAsyncData('rental-barrio-' + dep + '-' + barrio, () => $fetch('/api/rentals/barrio', { query: { department, barrio } }))`. En SSR, error 404 → `setResponseStatus(event, 404)`; 503/otro → `setResponseStatus(event, 503)`; en ambos `cache-control: no-store` (copiar el bloque de `precios/[slug].vue:146-152`) y un H1 de respaldo.
- `useSeoMeta` (title, description, ogTitle, ogDescription, ogUrl), `useHead` con canonical absoluto `https://cambio-uruguay.com${page.path}`, `robots: page.indexable ? 'index, follow' : 'noindex, follow'`, y `ld+json` con `BreadcrumbList` (Inicio `/` › Alquileres `/alquileres-uruguay` › Barrio) — sin otro schema (FaqSection ya emite FAQPage).
- `VBreadcrumbs` visibles con los mismos tres niveles.
- Un solo `<h1>`: `rentalBarrioTitle(page)`.
- Párrafo intro + fecha.
- `VAlert type="info"` si `!page.indexable`: "Todavía hay pocos avisos o datos recientes de este barrio para publicar precios firmes."
- Tabla (`cu-mobile-cards`, `data-label` por `<td>`) por tipo: Dormitorios | Mediana | Rango (p25–p75) | Gastos comunes | Total mensual | $/m² | Avisos. Cada fila enlaza a `rentalBarrioDirectoryPath(department, neighborhood, bedrooms)` (importarlo de `app/utils/rentalBarrio.ts`).
- Rank sentence si existe.
- "Avisos de hoy en {barrio}": hasta 6 tarjetas (`NuxtLink` a `/alquileres/${key}`: título, precio con moneda, dormitorios, m²) + botón "Ver todos en el directorio" → `page.directoryPath`.
- Si `page.officialZone`: `<RentalsZoneServicesPanel :zone="{ zone: page.officialZone, name: page.neighborhood, department: page.department, evidence: 'name' }" />`. Antes, leer `loadRentalZoneServiceProfile` (`app/server/utils/rentalZoneServices.ts`) para confirmar qué espera en `zone` (nombre oficial o código); si espera otra cosa, ajustar el valor de `officialZone` en Task 1. Si es null, no se muestra.
- "Barrios con precios parecidos" (`page.similar`) y "Barrios con más avisos" (`page.largest`): chips/links con la mediana.
- "Antes de alquilar": links a `/garantia-de-alquiler-uruguay`, `/guias/deposito-de-alquiler-uruguay`, `/primer-alquiler-uruguay`, `/guias/que-revisar-antes-de-firmar-alquiler`, `/evolucion-precio-alquileres-uruguay`, `/barrios-alquileres-uruguay`.
- `<FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />`.
- `<AssistantCta topic="hogar" />` si el componente acepta ese topic (leer `components/AssistantCta.vue`); si no, omitir.

- [ ] **Step 1: Test que falla de `rentalBarrioCopy`**

```ts
// app/tests/unit/rentalBarrioCopy.test.ts
import { describe, expect, it } from 'vitest'
import {
  formatUyu,
  rentalBarrioDescription,
  rentalBarrioFaq,
  rentalBarrioIntro,
  rentalBarrioRankSentence,
  rentalBarrioTitle,
} from '../../utils/rentalBarrioCopy'
import type { RentalBarrioPage } from '../../utils/rentalBarrio'

const dist = (median: number | null, count = 40) => ({ count, mean: median, median, p25: median && median - 4000, p75: median && median + 4000 })
const cell = (propertyType: 'apartamento' | 'casa', bedrooms: any, median: number, expenses: number | null = null) => ({
  propertyType,
  bedrooms,
  prices: {
    rent: dist(median),
    commonExpenses: dist(expenses),
    monthlyTotal: dist(expenses === null ? null : median + expenses),
    builtSquareMeter: dist(null),
    sources: 3,
    lastSeenFrom: null,
    lastSeenTo: null,
  },
})
const page = (over: Partial<RentalBarrioPage> = {}): RentalBarrioPage => ({
  department: 'Montevideo',
  departmentSlug: 'montevideo',
  neighborhood: 'Pocitos',
  slug: 'pocitos',
  path: '/alquiler/montevideo/pocitos',
  cells: [cell('apartamento', 'any', 32000, 6500), cell('apartamento', '1', 27000), cell('apartamento', '2', 36000)],
  rank: { position: 4, of: 40, propertyType: 'apartamento', bedrooms: '2' },
  similar: [],
  largest: [],
  generatedAt: '2026-10-04T06:53:00.000Z',
  rentalDataAsOf: '2026-10-04T06:48:00.000Z',
  indexable: true,
  ...over,
})

describe('rentalBarrioCopy', () => {
  it('formatea pesos uruguayos', () => {
    expect(formatUyu(32000)).toBe('$ 32.000')
    expect(formatUyu(null)).toBe('—')
  })

  it('title y description con el dato', () => {
    expect(rentalBarrioTitle(page())).toBe('Alquiler en Pocitos: cuánto cuesta hoy')
    // Nombre largo: cae a la variante más corta, aunque igual se pase (no se corta un nombre propio).
    expect(rentalBarrioTitle(page({ neighborhood: 'Barrio Parque Miramar Las Delicias' }))).toBe(
      'Alquiler en Barrio Parque Miramar Las Delicias'
    )
    const description = rentalBarrioDescription(page())
    expect(description).toContain('2 dormitorios')
    expect(description).toContain('$ 36.000')
    expect(description).toContain('4 de octubre de 2026')
  })

  it('intro con 1 y 2 dormitorios, sin 3 si no hay dato', () => {
    const intro = rentalBarrioIntro(page())
    expect(intro).toContain('1 dormitorio: $ 27.000')
    expect(intro).toContain('2 dormitorios: $ 36.000')
    expect(intro).not.toContain('3 dormitorios')
  })

  it('rank sólo con al menos 3 barrios comparados', () => {
    expect(rentalBarrioRankSentence(page())).toBe(
      'Pocitos es el 4.º barrio más caro de Montevideo para un apartamento de 2 dormitorios, entre 40 con datos.'
    )
    expect(rentalBarrioRankSentence(page({ rank: { position: 1, of: 2, propertyType: 'apartamento', bedrooms: '2' } }))).toBeNull()
  })

  it('FAQ: sólo preguntas con dato, más garantías', () => {
    const faq = rentalBarrioFaq(page())
    const questions = faq.map(item => item.question)
    expect(questions).toContain('¿Cuánto cuesta alquilar un apartamento de 2 dormitorios en Pocitos?')
    expect(questions).toContain('¿Cuánto son los gastos comunes en Pocitos?')
    expect(questions).toContain('¿Pocitos es caro comparado con el resto de Montevideo?')
    expect(questions).toContain('¿Qué garantía piden para alquilar en Pocitos?')
    expect(questions.some(q => q.includes('3 dormitorios'))).toBe(false)
  })
})
```

Si `FaqItem` usa otros nombres (`q`/`a`, `title`/`body`), adaptar las aserciones a esos nombres, no al revés.

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run tests/unit/rentalBarrioCopy.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `app/utils/rentalBarrioCopy.ts`** siguiendo las reglas de copy de arriba. Fecha con `new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Montevideo' })`. Ordinal: `${n}.º`.

- [ ] **Step 4: Correr y ver pasar** — `npx vitest run tests/unit/rentalBarrioCopy.test.ts` → PASS.

- [ ] **Step 5: Crear la página** con la estructura de arriba.

- [ ] **Step 6: Lint** — `npm run lint` → sin errores (los warnings preexistentes no cuentan).

- [ ] **Step 7: Commit**

```bash
git add app/utils/rentalBarrioCopy.ts app/tests/unit/rentalBarrioCopy.test.ts "app/pages/alquiler/[departamento]/[barrio].vue"
git commit -m "feat(alquiler): pagina de precios de alquiler por barrio"
```

---

### Task 4: Enlazado de barrios (hub, ficha, sitemap)

**Files:**
- Modify: `app/pages/barrios-alquileres-uruguay.vue` (lista SSR)
- Modify: `app/pages/alquileres/[key].vue` (enlace a la página del barrio)
- Modify: `app/server/api/__sitemap__/urls.get.ts` (bloque nuevo junto al de autos, ~línea 369)

**Interfaces:**
- Consumes: `GET /api/rentals/barrios` (Task 2), `rentalBarrioPath` (Task 1), `loadIndexableRentalBarrios` (Task 2).

- [ ] **Step 1: Hub.** En `barrios-alquileres-uruguay.vue` agregar debajo del `ZoneExplorer` una sección SSR "Precios de alquiler por barrio": `useAsyncData('rental-barrios', () => $fetch('/api/rentals/barrios'), { default: () => ({ barrios: [] }) })`, agrupado por departamento (Montevideo primero, luego alfabético), cada barrio un `NuxtLink` a `path` con la cantidad de avisos. Si la lista viene vacía no se renderiza la sección. Si el error falla, la página sigue igual que hoy.

- [ ] **Step 2: Ficha.** En `pages/alquileres/[key].vue`, donde se muestra el barrio de la propiedad, agregar un `NuxtLink` "Precios de alquiler en {barrio}" a `rentalBarrioPath(property.department, property.neighborhood)` **sólo si** ese path está en la lista de `/api/rentals/barrios` (`useAsyncData('rental-barrios', …)` con la misma clave que el hub, así Nuxt deduplica). No mostrar el link a un barrio sin página indexable (sería un enlace a noindex desde 9.600 fichas).

- [ ] **Step 3: Sitemap.** En `urls.get.ts`, después del bloque de modelos de autos:

```ts
  // --- Rental price pages per neighborhood: only indexable ones (≥2 cells, fresh snapshot) -----
  // Spanish only, same reasoning as the used-car block: the body is Uruguayan asking prices.
  try {
    const barrios = await loadIndexableRentalBarrios()
    barrios.forEach(barrio => {
      urls.push({ loc: barrio.path, changefreq: 'daily', priority: 0.6 })
    })
    if (barrios.length) console.log(`- Rental neighborhood pages: ${barrios.length} routes`)
  } catch (barrioError) {
    console.warn('Failed to add rental neighborhood pages to sitemap:', barrioError)
  } finally {
    await disconnectDbAfterPrerender()
  }
```
con `import { loadIndexableRentalBarrios } from '../../utils/rentalBarrio'` (ruta relativa desde `server/api/__sitemap__/`: `'../../utils/rentalBarrio'`). Revisar que `loadRentalZoneSnapshots` llame a `connectDb()` (lo hace en `readSnapshots`).

- [ ] **Step 4: Tests y lint** — `npx vitest run tests/unit` (todo el unit del app) y `npm run lint`. Arreglar lo que falle por estos cambios (p. ej. `siteNav-coverage`, `seoContract`): eso es parte de Task 6 si no se puede resolver acá; anotarlo.

- [ ] **Step 5: Commit**

```bash
git add app/pages/barrios-alquileres-uruguay.vue "app/pages/alquileres/[key].vue" app/server/api/__sitemap__/urls.get.ts
git commit -m "feat(alquiler): enlazar paginas de barrio desde el hub, las fichas y el sitemap"
```

---

### Task 5: Autos usados por presupuesto

**Files:**
- Create: `app/utils/carBudget.ts`
- Create: `app/server/api/cars/budget/[monto].get.ts`
- Create: `app/pages/autos-usados-uruguay/hasta-[monto]-dolares.vue`
- Modify: `app/pages/mercado-de-autos-usados-uruguay.vue` (bloque de presupuestos, ~l.246-254: cada tramo enlaza a su página)
- Modify: `app/server/api/__sitemap__/urls.get.ts` (5 rutas)
- Test: `app/tests/unit/carBudget.test.ts`

**Interfaces:**
- Consumes: `loadCarReport()`, `loadCarCatalogMeta()`, `carListingProjection`, `publicCarRow` (`app/server/utils/cars.ts`), `CarCatalogModel` (`app/server/models/CarCatalog`), `PublicCarReportBudget` (`app/utils/carsPublic.ts`), `CAR_MARKET_INDEX_MIN` (`app/utils/cars.ts`).
- Produces:
  ```ts
  // app/utils/carBudget.ts
  export const CAR_BUDGETS = [6000, 10000, 15000, 20000, 30000] as const
  export type CarBudget = (typeof CAR_BUDGETS)[number]
  export const CAR_BUDGET_MIN_MODELS = 3
  export function parseCarBudget(raw: unknown): CarBudget | null // '6000' → 6000; '7000','6000.5','abc','' → null
  export function carBudgetPath(budget: CarBudget): string // '/autos-usados-uruguay/hasta-6000-dolares'
  export function formatUsd(value: number): string // 'US$ 6.000'
  export interface CarBudgetModelRow { marketSlug: string; brand: string; model: string; adverts: number; medianUsd: number; medianYear: number; medianKm: number | null; hasPage: boolean }
  export interface CarBudgetResponse { budget: CarBudget; adverts: number; models: CarBudgetModelRow[]; listings: PublicCarListing[]; generatedAt: string | null; indexable: boolean; others: CarBudget[] }
  export function carBudgetTitle(budget: CarBudget): string // 'Autos usados hasta US$ 6.000 en Uruguay'
  export function carBudgetDescription(r: CarBudgetResponse): string
  export function carBudgetFaq(r: CarBudgetResponse): FaqItem[]
  ```

Notas:
- `hasPage` = `marketSlug` está en `loadCarCatalogMeta().models` con `listings >= CAR_MARKET_INDEX_MIN` (mismo criterio que el sitemap de modelos; confirmar en `urls.get.ts:374` qué campo es el slug — `model.slug`).
- Avisos: `CarCatalogModel.find({ priceUsd: { $lte: budget, $gte: budget * 0.5 }, lastSeen: { $gte: <freshDays atrás ISO> } }).select(carListingProjection).sort({ year: -1, priceUsd: 1, key: 1 }).limit(12).maxTimeMS(5000).lean()` → `publicCarRow`; error → `[]`. El piso del 50 % evita llenar la lista con repuestos/señas que `priceSanity` no haya retirado.
- Paridad: test que lee `../../../classes/autos/report.ts` como texto y verifica que la lista de topes (`[6000, 10000, 15000, 20000, 30000]` o como esté escrita en la línea 62) coincide con `CAR_BUDGETS`. El app no importa del backend (paquetes separados): sólo se lee el archivo en el test.
- Ruta `[monto].get.ts`: `parseCarBudget(param)` null → 404; error de `loadCarReport` → 503 `no-store`; tramo ausente en el snapshot → 404; OK → `public, max-age=300, s-maxage=900`.
- Página: archivo `hasta-[monto]-dolares.vue`. `definePageMeta({ validate: route => parseCarBudget(route.params.monto) !== null })`. Antes de seguir, verificar con `npx nuxi prepare` o leyendo `.nuxt/types` / el router generado que Nuxt reconoce el segmento mixto `hasta-[monto]-dolares` y que `/autos-usados-uruguay/hasta-6000-dolares` no cae en `[key].vue`. **Si Nuxt no soporta el segmento mixto**, alternativa: `app/pages/autos-usados-uruguay/presupuesto/[monto].vue` con URL `/autos-usados-uruguay/presupuesto/6000-dolares` y `parseCarBudget` aceptando `'6000-dolares'`; ajustar `carBudgetPath` y los tests.
- Contenido según la spec (Familia B, puntos 1–7). H1 = `carBudgetTitle`. Tabla de modelos con link a `/autos-usados-uruguay/precios/${marketSlug}` si `hasPage`. Aclaración de la banda 80–100 %. Avisos: tarjetas simples (título/año/km/precio, link a `/autos-usados-uruguay/${key}`) + botón al directorio `/autos-usados-uruguay?priceMax=${budget}` (confirmar el nombre del parámetro en `utils/cars.ts:555`). "Qué revisar antes de comprar" con los 4 links. Otros presupuestos + `/que-auto-comprar-uruguay` + `/mercado-de-autos-usados-uruguay`. `FaqSection`. `defineI18nRoute({ locales: ['es'] })`. SEO como Task 3 (canonical absoluto, robots según `indexable`, BreadcrumbList Inicio › Autos usados `/autos-usados-uruguay` › Hasta US$ X).
- FAQ: "¿Qué auto usado comprar con US$ X?" (los 3–5 modelos con más avisos y su mediana), "¿Cuántos autos usados hay hasta US$ X?" (avisos de la banda; aclarar que es la banda cerca del tope), "¿De qué año es un auto usado de US$ X?" (rango de `medianYear` de los modelos).

- [ ] **Step 1: Test que falla**

```ts
// app/tests/unit/carBudget.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CAR_BUDGETS,
  carBudgetDescription,
  carBudgetFaq,
  carBudgetPath,
  carBudgetTitle,
  formatUsd,
  parseCarBudget,
  type CarBudgetResponse,
} from '../../utils/carBudget'

const response = (over: Partial<CarBudgetResponse> = {}): CarBudgetResponse => ({
  budget: 6000,
  adverts: 759,
  models: [
    { marketSlug: 'chevrolet-corsa', brand: 'Chevrolet', model: 'Corsa', adverts: 53, medianUsd: 5700, medianYear: 2008, medianKm: 188500, hasPage: true },
    { marketSlug: 'chevrolet-spark', brand: 'Chevrolet', model: 'Spark', adverts: 41, medianUsd: 5500, medianYear: 2009, medianKm: 135000, hasPage: false },
    { marketSlug: 'volkswagen-gol', brand: 'Volkswagen', model: 'Gol', adverts: 24, medianUsd: 5495, medianYear: 1998, medianKm: 236000, hasPage: true },
  ],
  listings: [],
  generatedAt: '2026-10-04T03:37:27.814Z',
  indexable: true,
  others: [10000, 15000, 20000, 30000],
  ...over,
})

describe('carBudget', () => {
  it('acepta sólo los topes del informe', () => {
    expect(parseCarBudget('6000')).toBe(6000)
    expect(parseCarBudget('30000')).toBe(30000)
    for (const bad of ['7000', '6000.5', 'abc', '', '06000', undefined, ['6000']]) expect(parseCarBudget(bad)).toBeNull()
  })

  it('paridad con classes/autos/report.ts', () => {
    const source = readFileSync(resolve(__dirname, '../../../classes/autos/report.ts'), 'utf8')
    const literal = source.match(/\[\s*6000\s*,[^\]]*\]/)
    expect(literal, 'la lista de topes cambió de forma en report.ts').not.toBeNull()
    expect(JSON.parse(literal![0])).toEqual([...CAR_BUDGETS])
  })

  it('ruta, formato, title, description', () => {
    expect(carBudgetPath(6000)).toBe('/autos-usados-uruguay/hasta-6000-dolares')
    expect(formatUsd(6000)).toBe('US$ 6.000')
    expect(carBudgetTitle(6000)).toBe('Autos usados hasta US$ 6.000 en Uruguay')
    const description = carBudgetDescription(response())
    expect(description).toContain('Corsa')
    expect(description).toContain('759')
  })

  it('FAQ con modelos y años del tramo', () => {
    const faq = carBudgetFaq(response())
    expect(faq.map(item => item.question)).toEqual([
      '¿Qué auto usado comprar con US$ 6.000?',
      '¿Cuántos autos usados hay hasta US$ 6.000?',
      '¿De qué año es un auto usado de US$ 6.000?',
    ])
    expect(faq[2]!.answer).toContain('1998')
    expect(faq[2]!.answer).toContain('2009')
  })
})
```

(Si `FaqItem` usa otros nombres de campo, adaptar. Si la regex de paridad no encuentra la lista porque `report.ts` la escribe con `_` (`6_000`), cambiar la regex para quitar `_` antes de parsear.)

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run tests/unit/carBudget.test.ts` → FAIL.
- [ ] **Step 3: Implementar `app/utils/carBudget.ts`** (`parseCarBudget`: `typeof raw === 'string' && /^[1-9]\d{3,5}$/.test(raw)` y `CAR_BUDGETS.includes(Number(raw))`).
- [ ] **Step 4: Correr y ver pasar.**
- [ ] **Step 5: Endpoint `[monto].get.ts`** según las notas, con la respuesta tipada `CarBudgetResponse` (`others` = los otros 4 topes; `indexable` = `models.length >= CAR_BUDGET_MIN_MODELS`).
- [ ] **Step 6: Página** según las notas. Verificar la resolución del segmento mixto antes de escribir el resto.
- [ ] **Step 7: Enlaces** desde `mercado-de-autos-usados-uruguay.vue` (cada tramo de presupuesto → `carBudgetPath`) y 5 entradas en el sitemap (después del bloque de modelos de autos: `CAR_BUDGETS.forEach(budget => urls.push({ loc: carBudgetPath(budget), changefreq: 'daily', priority: 0.6 }))`; sin consulta a la base).
- [ ] **Step 8: Tests + lint** — `npx vitest run tests/unit/carBudget.test.ts` y `npm run lint`.
- [ ] **Step 9: Commit**

```bash
git add app/utils/carBudget.ts app/tests/unit/carBudget.test.ts "app/server/api/cars/budget/[monto].get.ts" "app/pages/autos-usados-uruguay/hasta-[monto]-dolares.vue" app/pages/mercado-de-autos-usados-uruguay.vue app/server/api/__sitemap__/urls.get.ts
git commit -m "feat(autos): paginas de autos usados por presupuesto"
```

---

### Task 6: Convenciones del repo, experimentos y verificación completa

**Files:**
- Modify: `app/nuxt.config.ts` (routeRules)
- Modify: `app/utils/siteNav.ts` (`DYNAMIC_ROUTE_KEYS`, ~l.4262)
- Modify: `app/tests/unit/seoContract.test.ts` (`NOINDEXED`, ~l.166)
- Modify: `docs/seo/experiments.json`
- Modify (si hace falta): `app/utils/relatedPages.ts` `CURATED`, `app/utils/directorios.ts`

- [ ] **Step 1: routeRules.** Leer `nuxt.config.ts:384-560` y `tests/unit/routeRules-browser-cache.test.ts`. Agregar, con el mismo formato literal de las familias existentes:
  - `'/alquiler/**': { headers: { 'cache-control': 'public, max-age=0, must-revalidate, s-maxage=300' } }` (sólo español; no agregar `/en`/`/pt` porque la ruta no existe en esos idiomas — si el test exige los tres, seguir lo que el test exige).
  - Para `/autos-usados-uruguay/hasta-*`: si las familias usan `/**`, `'/autos-usados-uruguay/**'` ya puede existir; no duplicar. Si no existe, agregar la regla con `s-maxage=900`. La OG: la regla `'/autos-usados-uruguay/*'` (un segmento) ya le da `og-autos.png`.
- [ ] **Step 2: siteNav.** `DYNAMIC_ROUTE_KEYS`: `'alquiler/[departamento]/[barrio]': 'vivienda'` (usar la sección que ya usan las páginas de alquiler; buscar qué valor tiene `alquileres/[key]`) y `'autos-usados-uruguay/hasta-[monto]-dolares': 'consumer'`. Correr `npx vitest run tests/unit/siteNav-coverage.test.ts` y ajustar hasta verde.
- [ ] **Step 3: seoContract.** Agregar las dos páginas a `NOINDEXED` (noindex condicional). Correr `npx vitest run tests/unit/seoContract.test.ts tests/unit/seoTitleBudget.test.ts tests/unit/seoDescriptionBudget.test.ts`.
- [ ] **Step 4: experiments.json.** Agregar dos filas (con `shippedOn` = fecha del deploy, `2026-10-04`):

```json
{
  "id": "alquiler-precios-por-barrio",
  "shippedOn": "2026-10-04",
  "routes": ["/alquiler/"],
  "hypothesis": "Una página por barrio con la mediana por dormitorio (dato propio que los portales no publican) capta la cola larga 'alquiler <barrio> <n> dormitorios' / 'cuánto cuesta alquilar en <barrio>' que hoy cae en fichas sueltas en posición 10-60."
},
{
  "id": "autos-usados-por-presupuesto",
  "shippedOn": "2026-10-04",
  "routes": ["/autos-usados-uruguay/hasta-"],
  "hypothesis": "Las búsquedas 'autos usados hasta <monto> dólares' y 'qué auto usado comprar' no tienen página; el informe ya calcula qué modelos hay en cada tramo."
}
```
  Correr `npx vitest run tests/revenueplan/experiments_routes.test.ts` **desde la raíz del worktree** (`C:\Users\airau\Documents\GitHub\cu-seo-barrios`; la raíz no tiene `node_modules`: crear antes una junction con PowerShell `New-Item -ItemType Junction -Path C:\Users\airau\Documents\GitHub\cu-seo-barrios\node_modules -Target C:\Users\airau\Documents\GitHub\cambio-uruguay\node_modules`). Si la ruta `/autos-usados-uruguay/hasta-` no resuelve en el test (el segmento parcial), usar `"/autos-usados-uruguay/hasta-6000-dolares"` etc. o lo que el test acepte, sin tocar el test.
- [ ] **Step 5: Enlazado automático.** Revisar `app/utils/relatedPages.ts` (`CURATED`, l.331) y `app/utils/directorios.ts`: si las familias de alquiler/autos tienen una entrada por prefijo, verificar que las rutas nuevas caen en la correcta; si no, agregar `CURATED` para `/alquiler/` (→ garantías, depósito, comparativa de barrios, evolución de precios) y `/autos-usados-uruguay/hasta-` (→ mercado, qué auto comprar, comprar con deuda, transferir). Si se tocó algo indexado por `temaIndex`, `npx vitest run tests/unit/temaIndex.test.ts -u`.
- [ ] **Step 6: Suite completa.** `npx vitest run` (app entero) y `npm run lint`. Todo verde salvo fallas preexistentes en `main` (compararlas con `git stash`/`origin/main` si aparece alguna ajena).
- [ ] **Step 7: Commit**

```bash
git add app/nuxt.config.ts app/utils/siteNav.ts app/tests/unit/seoContract.test.ts docs/seo/experiments.json app/utils/relatedPages.ts app/utils/directorios.ts
git commit -m "chore(seo): rutas, cache, contrato SEO y experimentos de barrios y presupuestos"
```

---

### Task 7: Verificación local en el navegador

- [ ] Levantar el app en el worktree contra producción no es posible sin `MONGO_URI` (ver memoria "Verificar la ficha de alquiler en dev"). Verificar en su lugar lo que no depende de datos: `npx nuxi build` NO (frío roto en esta caja). Alcanza con la suite + lint; la verificación real es en producción después del deploy (la hace el orquestador): status 200, `<h1>`, canonical, robots, BreadcrumbList, FAQPage, sitemap con las rutas, y el enlace "Precios de alquiler en …" en una ficha.
