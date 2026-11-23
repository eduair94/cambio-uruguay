<!--
THESIS: Hasta tres motos reales, una al lado de la otra, con la misma evidencia que la ficha de cada
una. Es la forma del comparador de autos (/autos-usados-uruguay/comparar): la selección vive en la
URL (`?motos=a,b,c`), así se comparte tal cual.
-->
<template>
  <VContainer class="moto-comparison py-6 py-md-10">
    <header class="mb-6">
      <VBtn
        :to="localePath(MOTOS_PATH)"
        variant="text"
        class="cu-btn-flush mb-3"
        prepend-icon="mdi-arrow-left"
      >
        Directorio de motos usadas
      </VBtn>
      <h1 class="text-h4 font-weight-bold mb-3">Comparar motos usadas</h1>
      <p class="comparison-prose text-body-1 mb-0">
        Elegí hasta {{ MOTO_COMPARE_MAX }} avisos y miralos lado a lado: precio, año, kilómetros,
        cilindrada, ficha técnica y lo que declara cada vendedor. El enlace de esta página lleva la
        selección, así se la podés mandar a alguien.
      </p>
    </header>

    <section
      v-if="keys.length"
      class="mb-8"
      aria-labelledby="comparison-selection"
      :aria-busy="status === 'pending'"
    >
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
        <h2 id="comparison-selection" class="text-h5 mb-0">Tu selección</h2>
        <span class="text-body-2" aria-live="polite">
          {{ keys.length }} de {{ MOTO_COMPARE_MAX }}
        </span>
        <VBtn variant="text" size="small" @click="setKeys([])">Vaciar la selección</VBtn>
      </div>
      <VProgressLinear
        v-if="status === 'pending'"
        indeterminate
        color="primary"
        aria-label="Cargando la selección"
        class="mb-3"
      />
      <VAlert v-if="comparisonError" type="warning" variant="outlined" class="mb-4">
        No pudimos cargar la comparación ahora mismo.
        <VBtn variant="text" @click="refreshComparison()">Reintentar</VBtn>
      </VAlert>
      <VAlert v-if="missing.length" type="info" variant="outlined" class="mb-4">
        {{
          missing.length === 1
            ? 'Un aviso ya no está en el directorio: se vendió o venció.'
            : `${missing.length} avisos ya no están en el directorio: se vendieron o vencieron.`
        }}
        <VBtn variant="text" @click="setKeys(keys.filter(key => !missing.includes(key)))">
          Sacarlos
        </VBtn>
      </VAlert>

      <div v-if="entries.length" class="comparison-table-wrap">
        <table class="comparison-table">
          <thead>
            <tr>
              <th scope="col"><span class="visually-hidden">Dato</span></th>
              <th v-for="entry in entries" :key="entry.moto.key" scope="col">
                <div class="comparison-head">
                  <img
                    v-if="entry.moto.picture"
                    :src="entry.moto.picture"
                    :alt="entry.moto.title"
                    width="160"
                    height="110"
                    referrerpolicy="no-referrer"
                  />
                  <NuxtLink
                    :to="localePath(motoAvisoPath(entry.moto.key))"
                    class="comparison-title"
                  >
                    {{ entry.moto.title }}
                  </NuxtLink>
                  <span v-if="entry.stale" class="text-caption text-medium-emphasis">
                    Hace días que no lo vemos: puede estar vendido.
                  </span>
                  <VBtn
                    variant="text"
                    size="small"
                    prepend-icon="mdi-close"
                    @click="setKeys(keys.filter(key => key !== entry.moto.key))"
                  >
                    Sacar
                  </VBtn>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <th scope="row">{{ row.label }}</th>
              <td
                v-for="(cell, index) in row.cells"
                :key="entries[index]!.moto.key"
                :class="{ 'comparison-best': cell.best }"
              >
                {{ cell.value }}
                <span v-if="cell.note" class="comparison-note">{{ cell.note }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="entries.length === 1" class="text-body-2 mt-3">
        Agregá al menos otra moto para compararlas.
      </p>
      <p v-if="entries.length > 1" class="text-body-2 text-medium-emphasis mt-3">
        En verde, el mejor valor de la fila (menor precio, menos kilómetros, más nueva). La
        cilindrada con ≈ es estimada. La ficha técnica la cargó cada vendedor y no la verificamos.
      </p>
    </section>

    <section v-if="canSearch" id="comparison-search" aria-labelledby="comparison-search-title">
      <h2 id="comparison-search-title" class="text-h5 mb-3">
        {{ keys.length ? 'Agregar otra moto' : 'Buscá las motos que querés comparar' }}
      </h2>
      <form class="comparison-search mb-4" @submit.prevent="submitSearch">
        <VTextField
          v-model="searchDraft"
          label="Marca, modelo o palabra del título"
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
        />
        <VBtn type="submit" color="primary">Buscar</VBtn>
      </form>
      <VAlert v-if="searchError" type="warning" variant="outlined" class="mb-4">
        No pudimos buscar ahora mismo.
        <VBtn variant="text" @click="refreshSearch()">Reintentar</VBtn>
      </VAlert>
      <p v-else-if="searchStatus === 'success' && !candidates.length" class="text-body-1">
        No hay avisos con esa búsqueda.
      </p>
      <ul v-else class="comparison-candidates">
        <li v-for="moto in candidates" :key="moto.key" class="comparison-candidate">
          <img
            v-if="moto.picture"
            :src="moto.picture"
            :alt="moto.title"
            width="96"
            height="64"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
          <div class="comparison-candidate__body">
            <NuxtLink :to="localePath(motoAvisoPath(moto.key))">{{ moto.title }}</NuxtLink>
            <span class="text-body-2 text-medium-emphasis">
              {{ motoMoney(moto.price, moto.currency) }} · {{ moto.year }} ·
              {{ motoKmLabel(moto.km) }}
            </span>
          </div>
          <VBtn
            variant="outlined"
            size="small"
            prepend-icon="mdi-plus"
            :disabled="keys.includes(moto.key)"
            @click="setKeys([...keys, moto.key])"
          >
            {{ keys.includes(moto.key) ? 'Ya está' : 'Agregar' }}
          </VBtn>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  MOTOS_PATH,
  MOTO_COLOR_LABEL,
  MOTO_COMPARE_MAX,
  MOTO_COMPARE_PATH,
  MOTO_RISK_GUIDE,
  MOTO_SELLER_LABEL,
  motoAvisoPath,
  motoCompareKeys,
  motoCompareSelection,
  motoDisplacementText,
  motoFuelLabel,
  motoKmLabel,
  motoLongDate,
  motoMoney,
  motoTypeLabel,
  motoUsd,
  type MotoCompareResponse,
  type MotoListResponse,
} from '~/utils/motos'
import type { MotoPublicListing } from '~/utils/motosPublic'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const keys = computed(() => motoCompareKeys(route.query.motos))
const {
  data: comparison,
  error: comparisonError,
  status,
  refresh: refreshComparison,
} = await useAsyncData(
  () => `moto-comparison-${keys.value.join(',')}`,
  () =>
    keys.value.length
      ? $fetch<MotoCompareResponse>('/api/motos/compare', {
          query: { motos: keys.value.join(',') },
        })
      : Promise.resolve<MotoCompareResponse>({ items: [], missing: [] })
)
const entries = computed(() =>
  (comparison.value?.items ?? []).filter(entry => keys.value.includes(entry.moto.key))
)
const missing = computed(() =>
  (comparison.value?.missing ?? []).filter(key => keys.value.includes(key))
)
async function setKeys(value: string[]) {
  await router.push(localePath(motoCompareSelection(value)))
  await nextTick()
  if (import.meta.client)
    document.getElementById('comparison-selection')?.scrollIntoView({ block: 'start' })
}

const searchDraft = ref<string | null>('')
const searchQuery = ref('')
const canSearch = computed(() => keys.value.length < MOTO_COMPARE_MAX)
const {
  data: searchData,
  error: searchError,
  status: searchStatus,
  refresh: refreshSearch,
} = await useAsyncData<Pick<MotoListResponse, 'items'>>(
  'moto-comparison-search',
  () =>
    canSearch.value
      ? $fetch<MotoListResponse>('/api/motos', {
          query: searchQuery.value ? { q: searchQuery.value } : {},
        })
      : Promise.resolve({ items: [] }),
  { watch: [searchQuery, canSearch] }
)
const candidates = computed(() => (searchData.value?.items ?? []).slice(0, 12))
function submitSearch() {
  const next = (searchDraft.value || '').trim()
  if (next === searchQuery.value) void refreshSearch()
  else searchQuery.value = next
}

type Cell = { value: string; note?: string; best?: boolean }
const unknown = 'No informado'
const yesNo = (value: boolean | null | undefined) => (value == null ? unknown : value ? 'Sí' : 'No')

/** El mejor valor de una fila numérica: sólo si hay dos o más con dato y no empatan todos. */
function bestOf(values: Array<number | null>, prefer: 'min' | 'max'): Set<number> {
  const known = values.map((value, index) => ({ value, index })).filter(item => item.value != null)
  if (known.length < 2) return new Set()
  const target =
    prefer === 'min'
      ? Math.min(...known.map(item => item.value!))
      : Math.max(...known.map(item => item.value!))
  const winners = known.filter(item => item.value === target)
  return winners.length === known.length ? new Set() : new Set(winners.map(item => item.index))
}

const rows = computed(() => {
  const motos = entries.value.map(entry => entry.moto)
  const cheapest = bestOf(
    motos.map(moto => moto.priceUsd),
    'min'
  )
  const fewestKm = bestOf(
    motos.map(moto => moto.km),
    'min'
  )
  const newest = bestOf(
    motos.map(moto => moto.year),
    'max'
  )
  const definitions: Array<{
    id: string
    label: string
    cell: (moto: MotoPublicListing, index: number) => Cell
  }> = [
    {
      id: 'price',
      label: 'Precio',
      cell: (moto, index) => ({
        value: motoMoney(moto.price, moto.currency),
        note: moto.priceConverted ? `≈ ${motoUsd(moto.priceUsd)}` : undefined,
        best: cheapest.has(index),
      }),
    },
    {
      id: 'year',
      label: 'Año',
      cell: (moto, index) => ({ value: String(moto.year), best: newest.has(index) }),
    },
    {
      id: 'km',
      label: 'Kilómetros',
      cell: (moto, index) => ({ value: motoKmLabel(moto.km), best: fewestKm.has(index) }),
    },
    {
      id: 'cc',
      label: 'Cilindrada',
      cell: moto => ({ value: motoDisplacementText(moto) ?? unknown }),
    },
    {
      id: 'type',
      label: 'Tipo',
      cell: moto => ({ value: moto.type ? motoTypeLabel(moto.type) : unknown }),
    },
    {
      id: 'engine',
      label: 'Motor',
      cell: moto => ({
        value:
          [moto.fuel ? motoFuelLabel(moto.fuel) : null, moto.specs?.engine]
            .filter(Boolean)
            .join(' · ') || unknown,
      }),
    },
    { id: 'power', label: 'Potencia', cell: moto => ({ value: moto.specs?.power ?? unknown }) },
    { id: 'brakes', label: 'Frenos', cell: moto => ({ value: moto.specs?.brakes ?? unknown }) },
    {
      id: 'color',
      label: 'Color',
      cell: moto => ({
        value: moto.color ? (MOTO_COLOR_LABEL[moto.color] ?? moto.color) : unknown,
      }),
    },
    {
      id: 'owner',
      label: 'Único dueño',
      cell: moto => ({ value: yesNo(moto.specs?.uniqueOwner) }),
    },
    {
      id: 'tradeIn',
      label: 'Acepta permuta',
      cell: moto => ({ value: yesNo(moto.specs?.tradeIn) }),
    },
    {
      id: 'risks',
      label: 'Declara',
      cell: moto => ({
        value:
          (moto.risks ?? [])
            .map(risk => MOTO_RISK_GUIDE[risk.category]?.label ?? risk.category)
            .join(' · ') || 'Nada',
      }),
    },
    {
      id: 'place',
      label: 'Dónde',
      cell: moto => ({
        value:
          [moto.department, moto.sellerType ? MOTO_SELLER_LABEL[moto.sellerType] : null]
            .filter(Boolean)
            .join(' · ') || unknown,
      }),
    },
    { id: 'seen', label: 'Visto desde', cell: moto => ({ value: motoLongDate(moto.firstSeen) }) },
  ]
  return definitions.map(definition => ({
    id: definition.id,
    label: definition.label,
    cells: motos.map((moto, index) => definition.cell(moto, index)),
  }))
})

const canonical = `https://cambio-uruguay.com${MOTO_COMPARE_PATH}`
const TITLE = 'Comparar motos usadas'
const DESCRIPTION =
  'Hasta tres avisos de motos usadas lado a lado: precio, año, kilómetros, cilindrada, ficha técnica y lo que declara cada vendedor.'
useSeoMeta({
  title: `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: TITLE,
  ogDescription: DESCRIPTION,
  ogUrl: canonical,
  // Una herramienta, no una página de contenido: como el comparador de avisos de autos.
  robots: 'noindex, follow',
})
defineOgImage({ url: '/img/og-motos.png', width: 1200, height: 630 })
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Motos usadas',
                item: `https://cambio-uruguay.com${MOTOS_PATH}`,
              },
              { '@type': 'ListItem', position: 3, name: TITLE, item: canonical },
            ],
          },
          { '@type': 'WebPage', name: TITLE, description: DESCRIPTION, url: canonical },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.comparison-prose {
  max-width: 72ch;
}
.comparison-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.comparison-table th,
.comparison-table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.comparison-table thead th {
  border-top: 0;
  min-width: 180px;
}
.comparison-table tbody th {
  font-weight: 600;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.comparison-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
.comparison-head img {
  width: 160px;
  max-width: 100%;
  height: auto;
  aspect-ratio: 16 / 11;
  object-fit: cover;
  border-radius: 8px;
}
.comparison-title {
  font-weight: 700;
}
.comparison-note {
  display: block;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.comparison-best {
  font-weight: 700;
  color: rgb(var(--v-theme-success));
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.comparison-search {
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: 640px;
}
.comparison-candidates {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.comparison-candidate {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.comparison-candidate img {
  width: 96px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}
.comparison-candidate__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
@media (max-width: 599px) {
  .comparison-candidate {
    grid-template-columns: 72px minmax(0, 1fr);
  }
  .comparison-candidate img {
    width: 72px;
    height: 48px;
  }
  .comparison-candidate :deep(.v-btn) {
    grid-column: 1 / -1;
  }
}
</style>
