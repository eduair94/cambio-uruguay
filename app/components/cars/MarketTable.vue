<template>
  <div class="market-table">
    <p :id="captionId" class="mt-caption">{{ caption }}</p>

    <div class="mt-controls" :class="{ 'mt-controls--sort-only': !filterable }">
      <!-- Las versiones son el filtro que más se usa: van siempre a la vista, en una fila que se
           desliza en el celular en vez de partirse en cuatro renglones. -->
      <VChipGroup
        v-if="filterable && trimOptions.length > 1"
        v-model="filters.trims"
        multiple
        class="mt-trims"
        selected-class="mt-chip--on"
        aria-label="Filtrar por versión"
      >
        <VChip
          v-for="option in trimOptions"
          :key="option.value"
          :value="option.value"
          variant="outlined"
          filter
          class="mt-chip"
        >
          {{ option.title }}
        </VChip>
      </VChipGroup>

      <div class="mt-toolbar">
        <VBtn
          v-if="filterable"
          class="mt-mobile-only mt-filters-toggle"
          variant="tonal"
          :aria-expanded="panelOpen ? 'true' : 'false'"
          :aria-controls="panelId"
          prepend-icon="mdi-tune-variant"
          @click="panelOpen = !panelOpen"
        >
          Filtros{{ activeCount ? ` (${activeCount})` : '' }}
        </VBtn>
        <VSelect
          v-model="sortValue"
          class="mt-mobile-only mt-sort"
          :items="sortOptions"
          label="Ordenar"
          density="comfortable"
          variant="outlined"
          hide-details
        />
      </div>

      <div
        v-if="filterable"
        :id="panelId"
        class="mt-panel"
        :class="{ 'is-open': panelOpen }"
        role="group"
        aria-label="Filtros de la tabla"
      >
        <VSelect
          v-model="filters.yearMin"
          :items="yearOptions"
          label="Año desde"
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
        />
        <VSelect
          v-model="filters.yearMax"
          :items="yearOptions"
          label="Año hasta"
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
        />
        <VSelect
          v-if="engineOptions.length > 1"
          v-model="filters.engine"
          :items="engineOptions"
          label="Motor"
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
        />
        <VSelect
          v-if="transmissionOptions.length > 1"
          v-model="filters.transmission"
          :items="transmissionOptions"
          label="Caja"
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
        />
        <VTextField
          v-model="priceDraft"
          label="Mediana hasta"
          prefix="US$"
          inputmode="numeric"
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
        />
      </div>

      <div v-if="filterable" class="mt-status">
        <span aria-live="polite">
          <template v-if="activeCount"
            >{{ visible.length }} de {{ rows.length }} combinaciones</template
          >
          <template v-else>{{ rows.length }} combinaciones</template>
        </span>
        <VBtn
          v-if="activeCount"
          variant="text"
          size="small"
          class="cu-btn-flush"
          @click="clearFilters"
        >
          Limpiar filtros
        </VBtn>
      </div>
    </div>

    <VTable class="mt-table" :aria-describedby="captionId">
      <thead>
        <tr>
          <PreciosSortTh label="Año" sort-key="year" v-bind="sortBind" @sort="toggleSort" />
          <PreciosSortTh
            v-if="showVersion"
            label="Versión"
            sort-key="version"
            v-bind="sortBind"
            @sort="toggleSort"
          />
          <PreciosSortTh
            label="Avisos"
            sort-key="n"
            align="right"
            v-bind="sortBind"
            @sort="toggleSort"
          />
          <th scope="col" class="mt-range-th"><span>Rango central (P25–P75)</span></th>
          <PreciosSortTh
            label="Mediana"
            sort-key="median"
            align="right"
            v-bind="sortBind"
            @sort="toggleSort"
          />
          <PreciosSortTh
            label="Km mediano"
            sort-key="km"
            align="right"
            v-bind="sortBind"
            @sort="toggleSort"
          />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in visible"
          :key="`${row.year}-${row.trim}-${row.engine}-${row.transmission}`"
          :class="{ 'has-version': showVersion }"
        >
          <td class="mt-year">{{ row.year }}</td>
          <td v-if="showVersion" class="mt-version">
            <span class="mt-trim">{{ displayTrim(row.trim) }}</span>
            <span v-if="specOf(row)" class="mt-spec">{{ specOf(row) }}</span>
          </td>
          <td class="mt-num mt-n" data-label="Avisos">{{ row.n }}</td>
          <td class="mt-range" data-label="Rango central">
            <span class="mt-range-text">
              {{ formatCarUsd(row.p25) }} – {{ formatCarUsd(row.p75).replace('US$ ', '') }}
            </span>
            <span v-if="scale" class="mt-band" aria-hidden="true">
              <span
                class="mt-band-fill"
                :style="{
                  left: `${carMarketPct(row.p25, scale)}%`,
                  width: `${Math.max(1, carMarketPct(row.p75, scale) - carMarketPct(row.p25, scale))}%`,
                }"
              />
              <span class="mt-band-tick" :style="{ left: `${carMarketPct(row.median, scale)}%` }" />
            </span>
          </td>
          <td class="mt-num mt-median" data-label="Mediana">{{ formatCarUsd(row.median) }}</td>
          <td class="mt-num mt-km" data-label="Km mediano">{{ formatCarKm(row.kmMedian) }}</td>
        </tr>
        <tr v-if="!visible.length" class="mt-empty">
          <td :colspan="showVersion ? 6 : 5">
            Ninguna combinación cumple esos filtros.
            <VBtn variant="text" size="small" @click="clearFilters">Limpiar filtros</VBtn>
          </td>
        </tr>
      </tbody>
    </VTable>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { CAR_TRANSMISSION_LABELS, formatCarKm, formatCarUsd } from '~/utils/cars'
import {
  CAR_MARKET_DEFAULT_SORT,
  CAR_MARKET_FIRST_DIR,
  CAR_MARKET_SORT_OPTIONS,
  carMarketPct,
  carMarketScale,
  displayTrim,
  emptyCarMarketFilters,
  filterCarMarketRows,
  parseCarMarketSort,
  sortCarMarketRows,
  trimKey,
  type CarMarketSort,
  type CarMarketSortKey,
} from '~/utils/carMarketTable'
import type { PublicCarMarketRow } from '~/utils/carsPublic'

const props = withDefaults(
  defineProps<{
    rows: PublicCarMarketRow[]
    caption: string
    showVersion?: boolean
    /** Filtros por versión, año, motor, caja y presupuesto. El orden está siempre. */
    filterable?: boolean
  }>(),
  { showVersion: false, filterable: false }
)

const uid = useId()
const captionId = `mt-caption-${uid}`
const panelId = `mt-panel-${uid}`

const sort = ref<CarMarketSort>({ ...CAR_MARKET_DEFAULT_SORT })
const filters = reactive(emptyCarMarketFilters())
const priceDraft = ref<string | null>('')
const panelOpen = ref(false)

// "20.000", "20000" y "US$ 20 mil" a medio escribir: sólo cuentan los dígitos.
watch(priceDraft, value => {
  const digits = String(value ?? '').replace(/\D/g, '')
  filters.priceMax = digits ? Number(digits) : null
})

const sortBind = computed(() => ({ current: sort.value.key, dir: sort.value.dir }))
const toggleSort = (key: string) => {
  const next = key as CarMarketSortKey
  sort.value =
    sort.value.key === next
      ? { key: next, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
      : { key: next, dir: CAR_MARKET_FIRST_DIR[next] }
}
const SORT_NAMES: Record<CarMarketSortKey, string> = {
  year: 'Año',
  version: 'Versión',
  n: 'Avisos',
  median: 'Mediana',
  km: 'Km',
}
// Un orden de encabezado que no está entre las opciones del selector ("avisos, de menos a más")
// igual se muestra: el selector dice lo que la tabla está haciendo.
const sortOptions = computed(() => {
  const base = props.showVersion
    ? CAR_MARKET_SORT_OPTIONS
    : CAR_MARKET_SORT_OPTIONS.filter(option => !option.value.startsWith('version'))
  const current = `${sort.value.key}:${sort.value.dir}`
  return base.some(option => option.value === current)
    ? base
    : [
        ...base,
        {
          title: `${SORT_NAMES[sort.value.key]}, ${sort.value.dir === 'asc' ? 'de menor a mayor' : 'de mayor a menor'}`,
          value: current,
        },
      ]
})
const sortValue = computed({
  get: () => `${sort.value.key}:${sort.value.dir}`,
  set: value => {
    sort.value = parseCarMarketSort(value)
  },
})

const specOf = (row: PublicCarMarketRow): string =>
  [row.engine, row.transmission && CAR_TRANSMISSION_LABELS[row.transmission]]
    .filter(Boolean)
    .join(' · ')

const trimOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const row of props.rows)
    if (!seen.has(trimKey(row))) seen.set(trimKey(row), displayTrim(row.trim))
  return [...seen]
    .map(([value, title]) => ({ value, title }))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
})
const yearOptions = computed(() =>
  [...new Set(props.rows.map(row => row.year))].sort((a, b) => b - a)
)
const engineOptions = computed(() =>
  [...new Set(props.rows.map(row => row.engine).filter((v): v is string => !!v))].sort()
)
const transmissionOptions = computed(() =>
  [...new Set(props.rows.map(row => row.transmission).filter(Boolean))].map(value => ({
    value: value as string,
    title: CAR_TRANSMISSION_LABELS[value as keyof typeof CAR_TRANSMISSION_LABELS] ?? String(value),
  }))
)

const activeCount = computed(
  () =>
    (filters.trims.length ? 1 : 0) +
    (filters.yearMin !== null ? 1 : 0) +
    (filters.yearMax !== null ? 1 : 0) +
    (filters.engine ? 1 : 0) +
    (filters.transmission ? 1 : 0) +
    (filters.priceMax !== null ? 1 : 0)
)

const clearFilters = () => {
  Object.assign(filters, emptyCarMarketFilters())
  priceDraft.value = ''
}

// Un select con `clearable` devuelve null al limpiar; los filtros de texto esperan ''.
const normalized = computed(() => ({
  ...filters,
  engine: filters.engine ?? '',
  transmission: filters.transmission ?? '',
}))

const visible = computed(() =>
  sortCarMarketRows(
    props.filterable ? filterCarMarketRows(props.rows, normalized.value) : props.rows,
    sort.value
  )
)
// La escala sale de TODAS las filas y no de las filtradas: así una barra no cambia de largo al
// filtrar, y dos filas se comparan igual antes y después.
const scale = computed(() => carMarketScale(props.rows))
</script>

<style scoped>
.market-table {
  min-width: 0;
}

.mt-caption {
  margin: 0 0 12px;
  font-size: 0.875rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* ── Controles ─────────────────────────────────────────────────────────── */
.mt-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
/* Sin filtros, lo único que queda es el selector de orden del celular: en escritorio ordenan los
   encabezados y el bloque no existe. */
@media (min-width: 600px) {
  .mt-controls--sort-only {
    display: none;
  }
}

.mt-trims :deep(.v-slide-group__content) {
  gap: 8px;
}
.mt-chip {
  margin: 0 !important;
}
.mt-chip--on {
  background: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}

.mt-toolbar {
  display: none;
}

.mt-panel {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  min-width: 0;
}
.mt-panel > * {
  min-width: 0;
}

.mt-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  min-height: 28px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* ── Tabla ─────────────────────────────────────────────────────────────── */
.mt-table {
  background: transparent;
}
.mt-table :deep(table) {
  font-variant-numeric: tabular-nums;
}
.mt-table :deep(thead th) {
  font-size: 0.8rem;
  white-space: nowrap;
  vertical-align: bottom;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}
.mt-table :deep(tbody td) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  vertical-align: top;
}

/* El mismo 2px de aire que el botón de los encabezados ordenables: si no, este rótulo queda un
   escalón más abajo que sus vecinos. */
.mt-range-th > span {
  display: inline-block;
  padding: 2px 0;
  font-weight: 600;
}
.mt-year {
  font-weight: 700;
  white-space: nowrap;
}
.mt-version {
  min-width: 140px;
}
.mt-trim {
  display: block;
  font-weight: 600;
}
.mt-spec {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.mt-num {
  text-align: right;
  white-space: nowrap;
}
.mt-median {
  font-weight: 700;
}
.mt-range {
  min-width: 180px;
}
.mt-range-text {
  display: block;
  white-space: nowrap;
}

/* La banda P25–P75 sobre una escala común: se lee de un vistazo qué versión es más cara y cuál
   tiene más dispersión, sin comparar cuatro números por renglón. */
.mt-band {
  position: relative;
  display: block;
  height: 8px;
  margin-top: 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.mt-band-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: rgba(var(--v-theme-link), 0.6);
}
.mt-band-tick {
  position: absolute;
  /* 2px más alto y más bajo que la banda: el tick de la mediana tiene que leerse encima del relleno. */
  top: -2px;
  bottom: -2px;
  width: 3px;
  margin-left: -1.5px;
  border-radius: 999px;
  background: rgb(var(--v-theme-on-surface));
}

.mt-empty td {
  text-align: center;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.mt-mobile-only {
  display: none;
}

/* ── Celular: cada fila es una tarjeta ─────────────────────────────────── */
@media (max-width: 599.98px) {
  .mt-mobile-only {
    display: inline-flex;
  }
  .mt-toolbar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }
  .mt-toolbar:not(:has(.mt-filters-toggle)) {
    grid-template-columns: minmax(0, 1fr);
  }
  /* 44px de alto: es un control de pulgar. */
  .mt-filters-toggle {
    min-height: 48px;
  }
  .mt-sort {
    display: block;
  }

  .mt-panel {
    display: none;
    grid-template-columns: 1fr 1fr;
  }
  .mt-panel.is-open {
    display: grid;
  }

  .mt-table :deep(.v-table__wrapper) {
    overflow: visible;
  }
  .mt-table :deep(thead) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .mt-table :deep(table),
  .mt-table :deep(tbody) {
    display: block;
  }
  .mt-table :deep(tbody tr) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-areas:
      'year med med'
      'range range range'
      'n n km';
    gap: 4px 16px;
    margin-bottom: 8px;
    padding: 12px 16px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 12px;
    background: rgb(var(--v-theme-surface));
  }
  .mt-table :deep(tbody tr.has-version) {
    grid-template-areas:
      'year med med'
      'ver med med'
      'range range range'
      'n n km';
  }
  .mt-table :deep(tbody td) {
    display: block;
    height: auto !important;
    padding: 0 !important;
    border: 0 !important;
    min-width: 0;
  }
  .mt-year {
    grid-area: year;
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .mt-version {
    grid-area: ver;
  }
  .mt-median {
    grid-area: med;
    align-self: start;
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .mt-range {
    grid-area: range;
    display: flex !important;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0 8px;
    margin: 8px 0;
    padding-top: 8px !important;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
  }
  .mt-n {
    grid-area: n;
    text-align: left;
  }
  .mt-km {
    grid-area: km;
  }
  .mt-median::before,
  .mt-range::before,
  .mt-n::before,
  .mt-km::before {
    content: attr(data-label);
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.0333em;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  }
  .mt-range .mt-band {
    flex: 1 0 100%;
  }
  .mt-range::before,
  .mt-n::before,
  .mt-km::before {
    display: inline;
    margin-right: 8px;
  }
  .mt-n,
  .mt-km {
    font-size: 0.875rem;
  }
  .mt-empty {
    display: block !important;
  }
  .mt-empty td {
    text-align: left;
  }
}
</style>
