# Cash-Withdrawal Points (Abitab + Redpagos) on the Map — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Add Abitab and Redpagos outlets to `/mapa` as a separate, toggleable "Retiro de efectivo" layer (distinct markers, excluded from the best-rate ranking), sourced live from the official BCU open-data CSVs.

**Architecture:** A Nitro route `/api/cash-points` fetches+parses both networks' BCU open-data CSVs (semicolon-delimited), cached 1 day, degrading per-source on failure. A pure tested parser handles the CSV. `/mapa` gains a toggle that lazily loads the layer; `LocationsMap` renders it as a second marker-cluster group with a distinct icon. No new npm deps, no backend change (frontend-only deploy).

**Tech Stack:** Nuxt 4 Nitro (`defineCachedEventHandler`, `$fetch`), Vue 3 `<script setup>`, Vuetify 3.9, Leaflet (existing), vitest.

## Global Constraints
- Frontend-only; do NOT touch the Express backend. No new npm dependencies (hand-rolled CSV parse).
- Pure tested logic in `app/server/utils/`, vitest `tests/unit/**`, node env, no Nuxt auto-imports.
- Vue: `<script setup lang="ts">`, Vuetify V-prefixed, explicit component imports.
- All user-facing strings via i18n in es/en/pt.
- Cash points have NO buy/sell rate — they must be EXCLUDED from `rankNearby`/the ranked panel and shown only as map markers.
- Verify Vue files via dev-server route smoke (`npm run typecheck`/`npm run build` are broken in this worktree by pre-existing issues — vue-tsc crash + `moment` import in comparar.vue). `.ts` files: `npx tsc --noEmit -p .nuxt/tsconfig.server.json`.
- CSV facts (verified): both `;`-delimited; columns `0 instCode;1 tipo;2 puntoCode;3 Nombre;4 Lat;5 Lng;6 Direccion;7 Barrio/Localidad;8 DeptoCode;9 Pais;10 Telefonos;11 Horario;…`. Abitab CSV is UTF-8 at `https://www.abitab.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv`; Redpagos is latin1 at `https://redpagos.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv`. Both need a browser `user-agent` header. Lat/lng are dot-decimal but the parser also tolerates comma-decimal.

---

### Task 1: `parseBcuCsv` util (TDD)

**Files:** Create `app/server/utils/cashPoints.ts`; Test `app/tests/unit/cash-points.test.ts`

**Interfaces — Produces:**
- `interface CashPoint { network: 'abitab'|'redpagos'; id: string; name: string; address: string; locality: string; dept: string; phone: string; hours: string; lat: number; lng: number }`
- `parseBcuCsv(text: string, network: 'abitab'|'redpagos'): CashPoint[]`

- [ ] **Step 1: failing test** — `app/tests/unit/cash-points.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseBcuCsv } from '../../server/utils/cashPoints'

const HEADER = 'Codigo;Tipo;CodigoPunto;Nombre;Ubicacion - Latitud;Ubicacion - Longitud;Direccion;Barrio;Depto;Pais;Telefonos;Horario;Servicios;RUT;Ref'
const rp = [
  HEADER,
  '6500;PTO;1;CAMBIO MATRIZ PLAZA MATRIZ;-34.907198;-56.203703;Sarandi 556 esq. Ituzaingo;CIUDAD VIEJA - MONTEVIDEO;MO;UY;29150800;Lunes a Viernes 09:00 a 18:00;25 - 30;214549310013;',
  '6500;PTO;2;SUC SIN COORD;;;Calle Falsa 123;X;MO;UY;;;;;', // no coords -> skipped
  '6500;PTO;3;FUERA DE UY;10.0;20.0;Otro pais;Y;XX;UY;;;;;',  // outside UY bbox -> skipped
].join('\n')

describe('parseBcuCsv', () => {
  it('parses valid rows and tags the network', () => {
    const out = parseBcuCsv(rp, 'redpagos')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      network: 'redpagos', id: 'redpagos-1', name: 'CAMBIO MATRIZ PLAZA MATRIZ',
      address: 'Sarandi 556 esq. Ituzaingo', locality: 'CIUDAD VIEJA - MONTEVIDEO', dept: 'MO',
      phone: '29150800',
    })
    expect(out[0].lat).toBeCloseTo(-34.907198)
    expect(out[0].lng).toBeCloseTo(-56.203703)
  })

  it('skips rows with missing/zero coords and rows outside the Uruguay bbox', () => {
    expect(parseBcuCsv(rp, 'redpagos').map(p => p.id)).toEqual(['redpagos-1'])
  })

  it('tolerates comma-decimal coordinates', () => {
    const csv = HEADER + '\n6509;PTO;434;Agencia 01/01;-34,8484573;-56,1698608;Avda San Martin 4250;Cerrito;MO;UY;22166045;L-V;;;'
    const out = parseBcuCsv(csv, 'abitab')
    expect(out).toHaveLength(1)
    expect(out[0].lat).toBeCloseTo(-34.8484573)
    expect(out[0].network).toBe('abitab')
  })

  it('returns empty for header-only or blank input', () => {
    expect(parseBcuCsv(HEADER, 'abitab')).toEqual([])
    expect(parseBcuCsv('', 'abitab')).toEqual([])
  })
})
```

- [ ] **Step 2: run, expect FAIL** — `npm run test -- cash-points` → module not found.

- [ ] **Step 3: implement** `app/server/utils/cashPoints.ts`:
```typescript
export interface CashPoint {
  network: 'abitab' | 'redpagos'
  id: string
  name: string
  address: string
  locality: string
  dept: string
  phone: string
  hours: string
  lat: number
  lng: number
}

const num = (v: string): number => parseFloat(String(v ?? '').trim().replace(',', '.'))
const cell = (v: string): string => String(v ?? '').trim()

// BCU open-data CSV (semicolon-delimited). Columns:
// 0 instCode;1 tipo;2 puntoCode;3 Nombre;4 Lat;5 Lng;6 Direccion;7 Barrio/Localidad;8 Depto;9 Pais;10 Telefonos;11 Horario;...
export function parseBcuCsv(text: string, network: 'abitab' | 'redpagos'): CashPoint[] {
  const out: CashPoint[] = []
  const lines = String(text || '').split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    const c = line.split(';')
    if (c.length < 8) continue
    const lat = num(c[4])
    const lng = num(c[5])
    if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) continue
    // Uruguay bounding box sanity (drops foreign/garbage coords).
    if (lat < -35.5 || lat > -29.5 || lng < -59 || lng > -52.5) continue
    out.push({
      network,
      id: `${network}-${cell(c[2]) || String(i)}`,
      name: cell(c[3]),
      address: cell(c[6]),
      locality: cell(c[7]),
      dept: cell(c[8]),
      phone: cell(c[10]),
      hours: cell(c[11]),
      lat,
      lng,
    })
  }
  return out
}
```

- [ ] **Step 4: run, expect PASS** — `npm run test -- cash-points`.
- [ ] **Step 5: commit** — `feat(map): add tested BCU cash-point CSV parser`.

---

### Task 2: Nitro `/api/cash-points` route

**Files:** Create `app/server/api/cash-points.get.ts`

**Interfaces — Consumes:** `parseBcuCsv`, `CashPoint`. **Produces:** `GET /api/cash-points` → `CashPoint[]`.

- [ ] **Step 1: create the route**:
```typescript
import { defineCachedEventHandler } from '#imports'
import { parseBcuCsv, type CashPoint } from '../utils/cashPoints'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
const SOURCES: { network: 'abitab' | 'redpagos'; url: string; encoding: BufferEncoding }[] = [
  { network: 'abitab', url: 'https://www.abitab.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv', encoding: 'utf-8' },
  { network: 'redpagos', url: 'https://redpagos.com.uy/datos-abiertos/sucursales-y-puntos-de-atencion.csv', encoding: 'latin1' },
]

// Cached 1 day; the source CSVs change rarely. Each source fails independently.
export default defineCachedEventHandler(
  async () => {
    const all: CashPoint[] = []
    for (const s of SOURCES) {
      try {
        const buf = await $fetch<ArrayBuffer>(s.url, {
          responseType: 'arrayBuffer',
          headers: { 'user-agent': UA },
          timeout: 20000,
        })
        const text = Buffer.from(buf).toString(s.encoding)
        all.push(...parseBcuCsv(text, s.network))
      } catch (err) {
        console.error(`[/api/cash-points] ${s.network} fetch failed:`, err)
      }
    }
    return all
  },
  { maxAge: 86400, name: 'cash-points', getKey: () => 'all' }
)
```

- [ ] **Step 2: typecheck** `.ts` — `npx tsc --noEmit -p .nuxt/tsconfig.server.json` (no errors referencing these files; pre-existing unrelated errors OK).
- [ ] **Step 3: dev smoke** — `npm run dev`; `curl.exe -s http://localhost:3000/api/cash-points -o cp.json`; `node -e "const a=require('./cp.json');const ab=a.filter(x=>x.network==='abitab').length;const rp=a.filter(x=>x.network==='redpagos').length;console.log('total',a.length,'abitab',ab,'redpagos',rp)"`; `rm cp.json`. Expect total ~900-1000 (abitab ~520, redpagos ~470). Stop dev.
- [ ] **Step 4: commit** — `feat(map): add /api/cash-points (Abitab+Redpagos BCU open data)`.

---

### Task 3: `getCashPoints()` composable

**Files:** Modify `app/composables/useApiService.ts`

- [ ] **Step 1:** add near `getAllLocations`:
```typescript
  const getCashPoints = async (): Promise<any[]> => {
    try {
      return await $fetch('/api/cash-points')
    } catch (error) {
      console.error('Error fetching cash points:', error)
      return []
    }
  }
```
- [ ] **Step 2:** add `getCashPoints,` to the composable's returned object (next to `getAllLocations`).
- [ ] **Step 3:** `npx tsc --noEmit -p .nuxt/tsconfig.json` — no new errors referencing the file.
- [ ] **Step 4: commit** — `feat(map): expose getCashPoints() composable`.

---

### Task 4: `LocationsMap` cash-points layer

**Files:** Modify `app/components/map/LocationsMap.vue`

**Interfaces — Consumes (Task 5):** new optional prop `cashPoints?: Array<{network:string;id:string;name:string;address:string;locality:string;dept:string;phone:string;hours:string;lat:number;lng:number}>` (default `[]`).

- [ ] **Step 1:** add `cashPoints` to the `Props` interface and `withDefaults` (default `() => []`).
- [ ] **Step 2:** in `<script setup>`, add a second cluster layer. Near the existing `let cluster`, add `let cashCluster: any = null`. After the casa `cluster` is created in `init()`, add:
```javascript
  cashCluster = (L as any).markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60 })
  map.addLayer(cashCluster)
  renderCashPoints()
```
- [ ] **Step 3:** add a distinct icon + render function (place beside `pinIcon`/`renderMarkers`):
```javascript
function cashIcon() {
  return L.divIcon({
    className: 'cash-pin',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:3px;background:#00897b;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5);color:#fff;font-size:10px;font-weight:700;line-height:1">$</span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function cashPopup(p) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const net = p.network === 'abitab' ? 'Abitab' : 'Redpagos'
  const q = encodeURIComponent(`${p.name} ${p.address} ${p.locality}`)
  const dir = esc(`https://www.google.com/maps/search/${q}`)
  return `<strong>${esc(p.name || net)}</strong><br><span style="color:#00897b;font-weight:600">${net} · ${esc(cashLabel.value)}</span>` +
    (p.address ? `<br>${esc(p.address)}` : '') +
    (p.locality ? `<br>${esc(p.locality)}` : '') +
    (p.hours ? `<br><em>${esc(p.hours)}</em>` : '') +
    (p.phone ? `<br>📞 ${esc(p.phone)}` : '') +
    `<br><a href="${dir}" target="_blank" rel="noopener">${esc(directionsLabel.value)} →</a>`
}

function renderCashPoints() {
  if (!cashCluster) return
  cashCluster.clearLayers()
  for (const p of props.cashPoints || []) {
    const m = L.marker([p.lat, p.lng], { icon: cashIcon() })
    m.bindPopup(cashPopup(p))
    cashCluster.addLayer(m)
  }
}
```
Where `cashLabel`/`directionsLabel` are computed/props: reuse the existing `directionsLabel` prop (Task 6 from the prior feature). For `cashLabel`, add a prop `cashLabel?: string` default `'Retiro de efectivo'`. (If `directionsLabel` is currently a prop with a default, mirror it; otherwise hardcode the Spanish default and let the page override.)
- [ ] **Step 4:** in `onBeforeUnmount` add `cashCluster = null`. Add a watcher: `watch(() => props.cashPoints, () => renderCashPoints(), { deep: false })`.
- [ ] **Step 5: dev smoke (with Task 5) / commit** — `feat(map): cash-points marker layer in LocationsMap`.

---

### Task 5: `/mapa` toggle + load

**Files:** Modify `app/pages/mapa.vue`

- [ ] **Step 1:** add state `const showCash = ref(false)` and `const cashPoints = ref<any[]>([])`.
- [ ] **Step 2:** add a control to the control bar (a `<v-col>` with a `v-switch`):
```vue
<v-col cols="12" sm="6" md="3" class="d-flex align-center">
  <v-switch
    v-model="showCash"
    :label="t('map.cashPoints')"
    color="teal"
    density="compact"
    hide-details
    @update:model-value="onToggleCash"
  />
</v-col>
```
- [ ] **Step 3:** lazy-load on first enable:
```javascript
const { getAllLocations, getProcessedExchangeData, getCashPoints } = useApiService()
async function onToggleCash(v: boolean) {
  if (v && cashPoints.value.length === 0) {
    cashPoints.value = await getCashPoints()
  }
}
```
- [ ] **Step 4:** pass to the map: on the `<LocationsMap>` add `:cash-points="showCash ? cashPoints : []"` and `:cash-label="t('map.withdrawCash')"`. (Leave `branches`, ranking, etc. unchanged — cash points are NOT added to `branches` and never reach `rankNearby`.)
- [ ] **Step 5:** dev smoke — `/mapa` 200, toggle loads points (manually verified by controller). commit — `feat(map): /mapa toggle for cash-withdrawal points`.

---

### Task 6: i18n strings

**Files:** Modify `app/i18n/locales/json/{es,en,pt}.json`

- [ ] Add inside the existing `"map"` object in each locale:
  - es: `"cashPoints": "Retiro de efectivo (Abitab/Redpagos)"`, `"withdrawCash": "Retiro de efectivo"`
  - en: `"cashPoints": "Cash withdrawal (Abitab/Redpagos)"`, `"withdrawCash": "Cash withdrawal"`
  - pt: `"cashPoints": "Saque de dinheiro (Abitab/Redpagos)"`, `"withdrawCash": "Saque de dinheiro"`
- [ ] Validate JSON parses (all three). commit — `feat(map): i18n for cash-withdrawal layer`.

---

## Self-Review
- Coverage: full official data (Task 2 both CSVs) ✓; separate toggleable layer (Tasks 4-5) ✓; excluded from ranking (cash points never enter `branches`/`rankNearby`) ✓; i18n (Task 6) ✓.
- No new deps, frontend-only (clean CI deploy; no package-lock change → no pull-abort).
- Type consistency: `CashPoint` defined in Task 1, parsed in Task 2, shape mirrored in Task 4 prop; `getCashPoints` (Task 3) → page (Task 5) → `cashPoints` prop (Task 4).
