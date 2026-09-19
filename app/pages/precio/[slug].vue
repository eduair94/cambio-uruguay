<template>
  <VContainer class="page py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Precios de supermercado', to: localePath('/precios-de-supermercado-uruguay') },
        { title: articleName },
      ]"
      class="px-0 mb-2"
    />

    <template v-if="!article">
      <h1 class="text-h5 font-weight-bold mb-3">Ese artículo no está en el catálogo</h1>
      <p class="text-body-1 mb-4">
        El catálogo del SIPC cambia: los comercios dan de baja productos y el sistema oficial los
        retira. Buscá el que necesitás en el comparador.
      </p>
      <VBtn color="primary" :to="localePath('/precios-de-supermercado-uruguay')">
        Ver todos los precios
      </VBtn>
    </template>

    <template v-else>
      <header class="mb-6">
        <p class="eyebrow">Precio en {{ rows.length }} locales · lectura del {{ day }}</p>
        <h1 class="text-h4 font-weight-bold mb-2">{{ articleName }}</h1>
        <p v-if="article.unitRaw" class="text-body-2 text-medium-emphasis mb-3">
          Envase declarado: {{ article.unitRaw }}
        </p>

        <VAlert
          v-if="!indexable"
          type="warning"
          variant="tonal"
          density="comfortable"
          icon="mdi-scale-unbalanced"
          class="mb-4"
        >
          Sólo {{ stats?.n ?? 0 }} locales del país declaran este artículo. Alcanza para mirar los
          precios que hay, no para decir cuál es el más barato del país.
        </VAlert>
      </header>

      <!-- Los números -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-caption text-medium-emphasis mb-1">Más barato publicable</p>
            <p class="text-h5 font-weight-bold mb-1">{{ money(cheapest?.price) }}</p>
            <p class="text-body-2 mb-0">
              {{ cheapest ? cheapest.storeName : 'ninguna góndola califica hoy' }}
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-caption text-medium-emphasis mb-1">Mediana del país</p>
            <p class="text-h5 font-weight-bold mb-1">{{ money(stats?.p50) }}</p>
            <p class="text-body-2 mb-0">sobre {{ stats?.n ?? 0 }} locales</p>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-caption text-medium-emphasis mb-1">Más caro</p>
            <p class="text-h5 font-weight-bold mb-1">{{ money(stats?.max) }}</p>
            <p class="text-body-2 mb-0">{{ spreadLabel }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-caption text-medium-emphasis mb-1">Precio por unidad</p>
            <p class="text-h5 font-weight-bold mb-1">{{ perUnitLabel }}</p>
            <p class="text-body-2 mb-0">{{ perUnitNote }}</p>
          </VCard>
        </VCol>
      </VRow>

      <p v-if="cheapest && rawCheapest && rawCheapest.price !== cheapest.price" class="mb-6">
        <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-flag-outline">
          Hay una góndola con un precio más bajo ({{ money(rawCheapest.price) }} en
          {{ rawCheapest.storeName }}) que no encabeza: {{ rawCheapest.blockedReason }}. Está en la
          tabla, marcada.
        </VAlert>
      </p>

      <!-- Tabla local por local -->
      <section id="locales" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-2">Local por local</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Con la fecha que declaró cada local. Filtrá por departamento o buscá tu supermercado; las
          filas marcadas se muestran igual pero no encabezan el ranking.
        </p>

        <div class="precios-toolbar mb-3">
          <VSelect
            v-model="storeTable.depto"
            :items="deptItems"
            label="Departamento"
            prepend-inner-icon="mdi-map-marker-outline"
            variant="outlined"
            density="comfortable"
            hide-details
            class="precios-toolbar__field"
          />
          <VTextField
            v-model="storeTable.q"
            label="Local, cadena o dirección"
            prepend-inner-icon="mdi-store-search-outline"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            class="precios-toolbar__field"
            @click:clear="storeTable.q = ''"
          />
          <div class="precios-toolbar__sort">
            <VSelect
              :model-value="storeTable.orden"
              :items="storeSortItems"
              label="Ordenar por"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="selectStoreSort"
            />
            <VBtn
              variant="outlined"
              :icon="storeTable.dir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
              :aria-label="
                storeTable.dir === 'asc'
                  ? 'De menor a mayor. Tocá para invertir.'
                  : 'De mayor a menor. Tocá para invertir.'
              "
              @click="storeTable.dir = storeTable.dir === 'asc' ? 'desc' : 'asc'"
            />
          </div>
        </div>

        <div class="d-flex flex-wrap align-center ga-2 mb-1">
          <VBtn
            size="small"
            variant="tonal"
            :color="origin ? 'success' : 'primary'"
            :loading="locating"
            prepend-icon="mdi-crosshairs-gps"
            @click="locate"
          >
            {{ origin ? 'Ubicación activa' : 'Cerca de mí' }}
          </VBtn>
          <VChipGroup
            v-if="origin"
            :model-value="radioKm ?? undefined"
            filter
            selected-class="text-primary"
            aria-label="Radio de búsqueda"
            @update:model-value="setRadius"
          >
            <VChip
              v-for="km in PRECIOS_RADIUS_OPTIONS"
              :key="km"
              :value="km"
              size="small"
              variant="outlined"
            >
              a {{ km }} km
            </VChip>
          </VChipGroup>
          <VBtn
            v-if="origin"
            size="small"
            variant="text"
            prepend-icon="mdi-close"
            @click="clearLocation"
          >
            Quitar ubicación
          </VBtn>
        </div>
        <p class="text-caption text-medium-emphasis mb-2">
          <template v-if="geoError">{{ geoError }}</template>
          <template v-else>Tu ubicación se usa sólo en tu navegador y no se guarda.</template>
        </p>

        <div class="d-flex flex-wrap column-gap-6 mb-3">
          <VSwitch
            v-model="storeTable.ocultarViejos"
            color="primary"
            density="compact"
            hide-details
            inset
            label="Ocultar datos de más de dos semanas"
          />
          <VSwitch
            v-model="storeTable.soloOfertas"
            color="primary"
            density="compact"
            hide-details
            inset
            label="Sólo ofertas"
          />
        </div>

        <VAlert
          v-if="rows.length"
          :type="filteredCheapest ? 'success' : 'info'"
          variant="tonal"
          density="comfortable"
          :icon="filteredCheapest ? 'mdi-tag-check-outline' : 'mdi-filter-outline'"
          class="mb-4"
          aria-live="polite"
        >
          <p class="mb-1">
            <strong>{{ filteredRows.length }}</strong>
            {{ filteredRows.length === 1 ? 'local' : 'locales' }} con estos filtros<template
              v-if="filteredMedian !== null"
            >
              · mediana {{ money(filteredMedian) }}</template
            >.
          </p>
          <p v-if="filteredCheapest" class="mb-0 text-body-2">
            El más barato que puede encabezar:
            <strong>{{ money(filteredCheapest.price) }}</strong> en {{ filteredCheapest.storeName
            }}<template v-if="filteredCheapest.distanceKm !== null">
              (a {{ kmLabel(filteredCheapest.distanceKm) }})</template
            >.
          </p>
          <p v-else-if="filteredRows.length" class="mb-0 text-body-2">
            Ninguno de estos locales puede encabezar: son datos viejos o marcados.
          </p>
          <p v-else class="mb-0 text-body-2">
            Ningún local coincide.
            <a href="#locales" @click.prevent="resetStoreTable">Quitar filtros</a>.
          </p>
        </VAlert>

        <div class="table-scroll">
          <VTable density="comfortable" class="cu-mobile-cards cu-roomy">
            <thead>
              <tr>
                <PreciosSortTh
                  label="Local"
                  sort-key="local"
                  :current="storeTable.orden"
                  :dir="storeTable.dir"
                  @sort="headerStoreSort"
                />
                <th scope="col">Departamento</th>
                <PreciosSortTh
                  label="Precio"
                  sort-key="precio"
                  :current="storeTable.orden"
                  :dir="storeTable.dir"
                  align="right"
                  @sort="headerStoreSort"
                />
                <PreciosSortTh
                  label="Dato del"
                  sort-key="fecha"
                  :current="storeTable.orden"
                  :dir="storeTable.dir"
                  @sort="headerStoreSort"
                />
                <PreciosSortTh
                  v-if="origin"
                  label="Distancia"
                  sort-key="distancia"
                  :current="storeTable.orden"
                  :dir="storeTable.dir"
                  align="right"
                  @sort="headerStoreSort"
                />
                <th scope="col"><span class="d-sr-only">Nota</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleRows" :key="row.storeId">
                <td data-label="Local">
                  {{ row.storeName }}
                  <span v-if="row.address" class="d-block text-caption text-medium-emphasis">
                    {{ row.address }}
                  </span>
                </td>
                <td data-label="Departamento">{{ row.department || '—' }}</td>
                <td data-label="Precio" class="text-right">
                  <strong>{{ money(row.price) }}</strong>
                  <VChip
                    v-if="row.promo"
                    size="x-small"
                    color="success"
                    variant="tonal"
                    class="ml-1"
                  >
                    oferta
                  </VChip>
                </td>
                <td data-label="Dato del">
                  <VChip
                    size="x-small"
                    :color="PRECIOS_FRESHNESS_COLOR[row.freshness] || 'default'"
                    variant="tonal"
                  >
                    {{ row.sourceDay }}
                  </VChip>
                </td>
                <td v-if="origin" data-label="Distancia" class="text-right">
                  {{ row.distanceKm === null ? '—' : kmLabel(row.distanceKm) }}
                </td>
                <td data-label="Nota">
                  <span v-if="row.blockedReason" class="text-caption text-medium-emphasis">
                    {{ row.blockedReason }}
                  </span>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p v-if="sortedRows.length > visibleRows.length" class="mt-3">
          <VBtn variant="text" size="small" @click="showAllRows = true">
            Ver los {{ sortedRows.length }} locales
          </VBtn>
        </p>
      </section>

      <!-- Serie propia -->
      <section v-if="series.length > 1" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-2">Cómo se movió</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          La mediana del país, día por día. Esta serie no existe en la fuente oficial: su API
          devuelve sólo el precio de hoy, así que el histórico arranca el día que empezamos a
          guardarlo.
        </p>
        <div class="table-scroll">
          <VTable density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Día</th>
                <th class="text-right">Más barato</th>
                <th class="text-right">Mediana</th>
                <th class="text-right">Más caro</th>
                <th class="text-right">Locales</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="point in recentSeries" :key="point.day">
                <td data-label="Día">{{ point.day }}</td>
                <td data-label="Más barato" class="text-right">{{ money(point.min) }}</td>
                <td data-label="Mediana" class="text-right font-weight-medium">
                  {{ money(point.p50) }}
                </td>
                <td data-label="Más caro" class="text-right">{{ money(point.max) }}</td>
                <td data-label="Locales" class="text-right">{{ point.n }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </section>

      <!-- Del mismo grupo -->
      <section v-if="sameGroup.length" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-2">Otras marcas de {{ article.group }}</h2>
        <p v-if="perUnit" class="text-body-2 text-medium-emphasis mb-4">
          Ordenadas por precio por {{ perUnit.label }} a precio mediano, para comparar envases
          distintos. Esta sale {{ money(perUnit.value) }} por {{ perUnit.label }}.
        </p>
        <VRow>
          <VCol v-for="other in sameGroup" :key="other.articleId" cols="12" sm="6" md="4">
            <VCard
              variant="outlined"
              class="pa-4 h-100"
              :to="localePath(`/precio/${preciosSlug(other.name)}`)"
            >
              <p class="text-subtitle-2 font-weight-bold mb-1">{{ other.name }}</p>
              <p class="text-body-2 text-medium-emphasis mb-0">
                mediana {{ money(other.p50)
                }}<template v-if="otherPerUnit(other)"> · {{ otherPerUnit(other) }}</template> ·
                {{ other.n }} locales
              </p>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <section>
        <h2 class="text-h5 font-weight-bold mb-3">De dónde sale esto</h2>
        <p class="text-body-2 mb-2">
          Los precios los declaran los propios comercios al
          <strong>SIPC</strong>, el Sistema de Información de Precios al Consumidor del Ministerio
          de Economía y Finanzas y el Área Defensa del Consumidor. Es información pública; acá se
          lee todos los días y se guarda para poder comparar en el tiempo.
        </p>
        <p class="text-body-2 mb-4">
          Cada fila trae la fecha que declaró el local, y una góndola quieta por más de dos semanas
          no puede aparecer como el precio más barato: el dato viejo no deja de ser dato, pero el
          titular no se lo lleva.
        </p>
        <VBtn variant="outlined" size="small" :to="localePath('/precios-de-supermercado-uruguay')">
          Ver la canasta y el método completo
        </VBtn>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  PRECIOS_FRESHNESS_COLOR,
  preciosArticleFromSlug,
  preciosIndexable,
  preciosPerUnit,
  preciosSlug,
  preciosSpread,
  type PreciosArticleRow,
  type PreciosStoreRow,
} from '~/utils/preciosCatalog'
import {
  PRECIOS_RADIUS_OPTIONS,
  PRECIOS_STORE_SORTS,
  preciosCheapestRankable,
  preciosFilterStoreRows,
  preciosGroupKey,
  preciosMedianPerUnit,
  preciosSortBy,
  preciosSortStoreRows,
  preciosStoreQueryFromState,
  preciosStoreStateFromQuery,
  preciosWithDistance,
  type PreciosSortDir,
  type PreciosStoreSortKey,
} from '~/utils/preciosTable'

const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug || ''))

// El catálogo primero, para resolver el slug a un id sin inventar la relación.
const { data: catalogue } = await useFetch<any>('/api/precios', {
  key: 'precios-catalogue',
  default: () => null,
})

const articles = computed<PreciosArticleRow[]>(() => catalogue.value?.articles ?? [])
const catalogueEntry = computed(() => preciosArticleFromSlug(slug.value, articles.value))

const { data: detail } = await useFetch<any>('/api/precios/article', {
  key: () => `precios-detail-${slug.value}`,
  query: computed(() => ({ id: catalogueEntry.value?.articleId ?? 0 })),
  default: () => null,
  immediate: true,
})

const article = computed(() => detail.value?.article ?? null)
const articleName = computed(() => article.value?.name || catalogueEntry.value?.name || 'Artículo')
const stats = computed(() => detail.value?.stats ?? catalogueEntry.value ?? null)
const day = computed(() => detail.value?.day ?? catalogue.value?.day ?? '')
const rows = computed<PreciosStoreRow[]>(() => detail.value?.rows ?? [])
const series = computed<any[]>(() => detail.value?.series ?? [])
const cheapest = computed<PreciosStoreRow | null>(() => detail.value?.cheapest ?? null)

// La fila más barata sin filtrar, para poder decir en la cara cuál se dejó
// fuera del titular y por qué. Ocultarla sería tan malo como publicarla.
const rawCheapest = computed<PreciosStoreRow | null>(() => rows.value[0] ?? null)

// ---------------------------------------------------------------------------
// Tabla local por local: filtros, orden y "cerca de mí"
// ---------------------------------------------------------------------------

// Departamento, texto, switches y orden salen de la URL también en el servidor.
// La ubicación y el radio no: nunca se escriben en una dirección compartible.
const initialStoreState = preciosStoreStateFromQuery(route.query)
const storeTable = reactive<{
  depto: string
  q: string
  ocultarViejos: boolean
  soloOfertas: boolean
  orden: PreciosStoreSortKey
  dir: PreciosSortDir
}>({ ...initialStoreState })

const origin = ref<{ lat: number; lng: number } | null>(null)
const radioKm = ref<number | null>(null)
const locating = ref(false)
const geoError = ref('')

const showAllRows = ref(false)

const deptItems = computed(() => {
  const counts = new Map<string, number>()
  for (const row of rows.value) {
    if (row.department) counts.set(row.department, (counts.get(row.department) || 0) + 1)
  }
  return [
    { title: 'Todo el país', value: '' },
    ...[...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'es'))
      .map(([name, count]) => ({ title: `${name} (${count})`, value: name })),
  ]
})

// Un departamento de la URL que no vende este artículo se ignora: la tabla
// vacía sin explicación es peor que mostrar el país.
watch(
  deptItems,
  items => {
    if (
      storeTable.depto &&
      items.length > 1 &&
      !items.some(item => item.value === storeTable.depto)
    ) {
      storeTable.depto = ''
    }
  },
  { immediate: true }
)

const storeSortItems = computed(() =>
  Object.entries(PRECIOS_STORE_SORTS)
    .filter(([key]) => key !== 'distancia' || origin.value)
    .map(([value, sort]) => ({ title: sort.label, value }))
)

function headerStoreSort(key: string) {
  const next = key as PreciosStoreSortKey
  if (!(next in PRECIOS_STORE_SORTS)) return
  if (storeTable.orden === next) {
    storeTable.dir = storeTable.dir === 'asc' ? 'desc' : 'asc'
    return
  }
  storeTable.orden = next
  storeTable.dir = PRECIOS_STORE_SORTS[next].defaultDir
}

// No alterna: Vuetify re-emite el valor al montar (ver el hub).
function selectStoreSort(key: unknown) {
  const next = key as PreciosStoreSortKey
  if (!(next in PRECIOS_STORE_SORTS) || next === storeTable.orden) return
  storeTable.orden = next
  storeTable.dir = PRECIOS_STORE_SORTS[next].defaultDir
}

const rowsWithDistance = computed(() => preciosWithDistance(rows.value, origin.value))

const filteredRows = computed(() =>
  preciosFilterStoreRows(rowsWithDistance.value, {
    depto: storeTable.depto,
    q: storeTable.q || '',
    ocultarViejos: storeTable.ocultarViejos,
    soloOfertas: storeTable.soloOfertas,
    radioKm: origin.value ? radioKm.value : null,
  })
)

const sortedRows = computed(() =>
  preciosSortStoreRows(filteredRows.value, storeTable.orden, storeTable.dir)
)
const visibleRows = computed(() =>
  showAllRows.value ? sortedRows.value : sortedRows.value.slice(0, 30)
)

const filteredCheapest = computed(() => preciosCheapestRankable(filteredRows.value))

const filteredMedian = computed<number | null>(() => {
  const prices = filteredRows.value.map(row => row.price).sort((a, b) => a - b)
  if (!prices.length) return null
  const mid = Math.floor(prices.length / 2)
  return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2
})

watch(
  () => [
    storeTable.depto,
    storeTable.q,
    storeTable.ocultarViejos,
    storeTable.soloOfertas,
    radioKm.value,
  ],
  () => {
    showAllRows.value = false
  }
)

function resetStoreTable() {
  Object.assign(storeTable, {
    depto: '',
    q: '',
    ocultarViejos: false,
    soloOfertas: false,
    orden: 'precio',
    dir: 'asc',
  })
  radioKm.value = null
}

/**
 * El radio más chico con al menos 3 locales: "cerca de mí" que devuelve una
 * tabla vacía no le sirve a nadie, y uno de 25 km en Montevideo es todo el
 * departamento.
 */
function pickRadius(from: { lat: number; lng: number }): number | null {
  const withDistance = preciosWithDistance(rows.value, from)
  for (const km of PRECIOS_RADIUS_OPTIONS) {
    const inside = withDistance.filter(row => row.distanceKm !== null && row.distanceKm <= km)
    if (inside.length >= 3) return km
  }
  return null
}

function locate() {
  if (!import.meta.client) return
  if (!('geolocation' in navigator)) {
    geoError.value = 'Tu navegador no comparte la ubicación.'
    return
  }
  locating.value = true
  geoError.value = ''
  navigator.geolocation.getCurrentPosition(
    position => {
      const from = { lat: position.coords.latitude, lng: position.coords.longitude }
      origin.value = from
      radioKm.value = pickRadius(from)
      // Hay un departamento elegido que puede no ser donde estás: cerca de mí manda.
      storeTable.depto = ''
      if (radioKm.value === null) {
        storeTable.orden = 'distancia'
        storeTable.dir = 'asc'
      } else if (storeTable.orden === 'distancia') {
        storeTable.orden = 'precio'
        storeTable.dir = 'asc'
      }
      locating.value = false
    },
    error => {
      locating.value = false
      geoError.value =
        error.code === error.PERMISSION_DENIED
          ? 'No diste permiso para usar tu ubicación. Podés filtrar por departamento.'
          : 'No se pudo obtener tu ubicación. Probá de nuevo o filtrá por departamento.'
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
  )
}

function setRadius(value: unknown) {
  radioKm.value = typeof value === 'number' && PRECIOS_RADIUS_OPTIONS.includes(value) ? value : null
}

function clearLocation() {
  origin.value = null
  radioKm.value = null
  if (storeTable.orden === 'distancia') {
    storeTable.orden = 'precio'
    storeTable.dir = 'asc'
  }
}

usePreciosQuerySync(() =>
  preciosStoreQueryFromState({
    ...storeTable,
    q: storeTable.q || '',
    // La distancia depende de una ubicación que no va a la URL: quien abra el
    // enlace no la tiene, así que se comparte como el orden por precio.
    orden: storeTable.orden === 'distancia' ? 'precio' : storeTable.orden,
    dir: storeTable.orden === 'distancia' ? 'asc' : storeTable.dir,
  })
)

const kmLabel = (km: number): string =>
  km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toLocaleString('es-UY', { maximumFractionDigits: 1 })} km`

const recentSeries = computed(() => series.value.slice(-30).reverse())

const indexable = computed(() => preciosIndexable(stats.value))

const spreadLabel = computed(() => {
  const spread = preciosSpread(stats.value)
  return spread ? `se abre ${spread.toFixed(2)}× contra el más barato` : 'sin comparación posible'
})

const perUnit = computed(() =>
  stats.value?.p50 ? preciosPerUnit(stats.value.p50, article.value) : null
)
const perUnitLabel = computed(() => (perUnit.value ? money(perUnit.value.value) : '—'))
const perUnitNote = computed(() =>
  perUnit.value
    ? `por ${perUnit.value.label}, a precio mediano`
    : 'el envase declarado no permite calcularlo'
)

// Por clave normalizada: el SIPC escribe "Arroz Blanco" y "Arroz blanco", y
// "Gaseosa Pepsi" y "Gaseosa Pepsi.", como grupos distintos del mismo producto.
// Ordenadas por precio por unidad, que es lo que hace comparables dos envases.
const sameGroup = computed(() => {
  const group = preciosGroupKey(article.value?.group)
  if (!group) return []
  const others = articles.value.filter(
    row => preciosGroupKey(row.group) === group && row.articleId !== article.value?.articleId
  )
  return preciosSortBy(
    others,
    row => preciosMedianPerUnit(row)?.value,
    'asc',
    row => row.name
  ).slice(0, 6)
})

const otherPerUnit = (row: PreciosArticleRow): string => {
  const value = preciosMedianPerUnit(row)
  return value ? `${money(value.value)} / ${value.label}` : ''
}

function money(value?: number | null): string {
  return value === undefined || value === null
    ? '—'
    : `$ ${value.toLocaleString('es-UY', { maximumFractionDigits: 2 })}`
}

const canonicalUrl = computed(() => `https://cambio-uruguay.com/precio/${slug.value}`)
const title = computed(() => `${articleName.value}: precio en Uruguay`)
const description = computed(() => {
  if (!stats.value?.p50) {
    return `Precio de ${articleName.value} en supermercados de Uruguay, según los datos oficiales del SIPC.`
  }
  return `${articleName.value} cuesta entre $${stats.value.min} y $${stats.value.max} según el local, con mediana de $${stats.value.p50} sobre ${stats.value.n} supermercados. Datos oficiales del SIPC, con la fecha de cada góndola.`
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  // Un artículo que el país casi no declara existe como página —alguien puede
  // llegar por un enlace— pero no promete una comparación que la muestra no
  // sostiene, así que no entra al índice.
  robots: () => (indexable.value ? 'index, follow' : 'noindex, follow'),
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [
    {
      type: 'application/ld+json',
      // `AggregateOffer` con los precios REALMENTE observados: `lowPrice` es el
      // más barato publicable, no el mínimo crudo, porque el mínimo crudo puede
      // ser la góndola congelada o el error de carga que la guarda dejó fuera
      // del titular. Declarar acá un precio que la propia página se niega a
      // encabezar sería contradecirse en el marcado.
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: articleName.value,
        description: description.value,
        url: canonicalUrl.value,
        ...(stats.value?.p50 && cheapest.value
          ? {
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'UYU',
                lowPrice: cheapest.value.price,
                highPrice: stats.value.max,
                offerCount: stats.value.n,
                availability: 'https://schema.org/InStock',
              },
            }
          : {}),
      }),
    },
  ],
}))
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}
.precios-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.precios-toolbar__field {
  flex: 1 1 220px;
  max-width: 360px;
}
.precios-toolbar__sort {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 0 1 280px;
  min-width: 0;
}
.precios-toolbar__sort :deep(.v-select) {
  min-width: 0;
}
@media (max-width: 599px) {
  .precios-toolbar__field,
  .precios-toolbar__sort {
    flex-basis: 100%;
    max-width: none;
  }
}
</style>
