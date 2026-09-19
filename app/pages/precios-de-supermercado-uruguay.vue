<template>
  <VContainer class="page py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Precios de supermercado', disabled: true },
      ]"
      class="px-0 pb-2"
    />
    <header class="hero on-dark mb-8">
      <p class="eyebrow">Precios de góndola · {{ freshnessLabel }}</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">Precios de supermercado en Uruguay</h1>
      <p class="hero-lead text-body-1 mb-4">
        Los precios que las <strong>{{ storeCount }} bocas</strong> declaran al
        <strong>SIPC</strong>, el sistema oficial del Ministerio de Economía y el Área Defensa del
        Consumidor. {{ articleCount }} artículos, los 19 departamentos, y una cosa que el Estado no
        guarda: <strong>el histórico</strong>. Su API devuelve sólo el precio de hoy y no tiene
        endpoint de serie, así que la evolución empieza el día que este archivo empezó a guardarla.
      </p>
      <p class="hero-lead text-body-2 mb-4">
        Cada precio dice <strong>de qué día es</strong>. Eso importa: el 94 % de las góndolas
        reportan hoy o ayer, pero hay locales que no actualizan desde hace semanas, y como el
        ranking ordena por "más barato" serían justo esos los que encabezarían. No encabezan.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn color="white" variant="flat" size="small" prepend-icon="mdi-magnify" href="#buscador">
          Buscar un producto
        </VBtn>
        <VBtn variant="outlined" size="small" prepend-icon="mdi-basket-outline" href="#canasta">
          La canasta
        </VBtn>
        <VBtn variant="text" size="small" prepend-icon="mdi-scale-balance" href="#metodo">
          Cómo se mide
        </VBtn>
      </div>
    </header>

    <VAlert
      v-if="!hasData"
      type="info"
      variant="tonal"
      density="comfortable"
      icon="mdi-database-clock-outline"
      class="mb-8"
    >
      Todavía no hay una lectura guardada. El barrido corre una vez por día; cuando termine, esta
      página muestra los precios y la canasta.
    </VAlert>

    <template v-else>
      <!-- Buscador -->
      <section id="buscador" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-2">Buscá un producto</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ articleCount }} artículos con precio mínimo, mediana y máximo del país. La diferencia
          entre el más barato y el más caro del mismo producto llega a
          <strong>{{ maxSpreadLabel }}</strong
          >, así que la mediana dice más que el promedio. Tocá cualquier columna para ordenar.
        </p>

        <div class="d-flex flex-wrap align-center ga-2 mb-4">
          <span class="text-caption text-medium-emphasis mr-1">Atajos:</span>
          <VBtn
            v-for="preset in articlePresets"
            :key="preset.label"
            size="small"
            variant="tonal"
            color="primary"
            :prepend-icon="preset.icon"
            @click="applyPreset(preset.state)"
          >
            {{ preset.label }}
          </VBtn>
        </div>

        <div class="precios-toolbar mb-3">
          <VTextField
            v-model="articleTable.q"
            label="Aceite, yerba, pañales, shampoo…"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            class="precios-toolbar__search"
            @click:clear="articleTable.q = ''"
          />
          <div class="precios-toolbar__sort">
            <VSelect
              :model-value="articleTable.orden"
              :items="articleSortItems"
              label="Ordenar por"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="selectArticleSort"
            />
            <VBtn
              variant="outlined"
              :icon="articleTable.dir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
              :aria-label="
                articleTable.dir === 'asc'
                  ? 'De menor a mayor. Tocá para invertir.'
                  : 'De mayor a menor. Tocá para invertir.'
              "
              @click="articleTable.dir = articleTable.dir === 'asc' ? 'desc' : 'asc'"
            />
          </div>
        </div>

        <VChipGroup
          :model-value="articleTable.rubro || undefined"
          column
          filter
          selected-class="text-primary"
          aria-label="Filtrar por rubro"
          class="mb-1"
          @update:model-value="setRubro"
        >
          <VChip
            v-for="category in categoryChips"
            :key="category.id"
            :value="category.id"
            size="small"
            variant="outlined"
          >
            {{ category.label }} · {{ category.count }}
          </VChip>
        </VChipGroup>

        <VSwitch
          v-model="articleTable.muestra"
          color="primary"
          density="compact"
          hide-details
          inset
          class="mb-2"
          :label="`Sólo artículos que declaran ${PRECIOS_MIN_OBSERVATIONS} locales o más`"
        />

        <p class="text-body-2 mb-3 d-flex flex-wrap align-center ga-2" aria-live="polite">
          <span>
            <strong>{{ filteredArticles.length }}</strong> de {{ articleCount }} artículos ·
            ordenados por {{ articleSortSummary }}
          </span>
          <VBtn
            v-if="articleFiltersActive"
            variant="text"
            size="small"
            prepend-icon="mdi-filter-remove-outline"
            @click="resetArticleTable"
          >
            Limpiar filtros
          </VBtn>
        </p>

        <div class="table-scroll">
          <VTable density="comfortable" class="cu-mobile-cards cu-roomy">
            <thead>
              <tr>
                <PreciosSortTh
                  v-for="column in articleColumns"
                  :key="column.key"
                  :label="column.label"
                  :sort-key="column.key"
                  :current="articleTable.orden"
                  :dir="articleTable.dir"
                  :align="column.key === 'nombre' ? 'left' : 'right'"
                  @sort="headerArticleSort"
                />
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleArticles" :key="row.articleId">
                <td data-label="Artículo">
                  <NuxtLink :to="localePath(`/precio/${preciosSlug(row.name)}`)">
                    {{ row.name }}
                  </NuxtLink>
                  <span class="d-block text-caption text-medium-emphasis">
                    {{
                      [row.unitRaw, preciosCategoryLabel(preciosCategory(row))]
                        .filter(Boolean)
                        .join(' · ')
                    }}
                  </span>
                  <VChip
                    v-if="bestInGroup.has(row.articleId)"
                    size="x-small"
                    color="success"
                    variant="tonal"
                    prepend-icon="mdi-trophy-outline"
                    class="mt-1"
                  >
                    mejor precio por {{ perUnitShort(row) }} de {{ bestInGroup.get(row.articleId) }}
                    marcas
                  </VChip>
                </td>
                <td data-label="Más barato" class="text-right">{{ money(row.min) }}</td>
                <td data-label="Mediana" class="text-right font-weight-medium">
                  {{ money(row.p50) }}
                </td>
                <td data-label="Más caro" class="text-right">{{ money(row.max) }}</td>
                <td data-label="Por litro o kilo" class="text-right">{{ perUnitLabel(row) }}</td>
                <td data-label="Ahorro buscando" class="text-right">
                  {{ savingsLabel(row) }}
                  <span
                    v-if="row.p10 && hasSavings(row)"
                    class="d-block text-caption text-medium-emphasis"
                  >
                    {{ money(row.p10) }} en el 10 % más barato
                  </span>
                </td>
                <td data-label="Locales" class="text-right">
                  {{ row.n }}
                  <span
                    v-if="(row.n ?? 0) < PRECIOS_MIN_OBSERVATIONS"
                    class="d-block text-caption text-medium-emphasis"
                  >
                    muestra chica
                  </span>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>

        <p v-if="filteredArticles.length > visibleArticles.length" class="mt-3">
          <VBtn variant="text" size="small" @click="showAll = true">
            Ver los {{ filteredArticles.length }} artículos
          </VBtn>
        </p>
        <p v-if="!filteredArticles.length" class="text-body-2 text-medium-emphasis mt-3">
          Ningún artículo del catálogo oficial coincide con esos filtros.
          <a href="#buscador" @click.prevent="resetArticleTable">Ver todos</a>.
        </p>
        <p class="text-caption text-medium-emphasis mt-3 mb-0" style="max-width: 75ch">
          <strong>Por litro o kilo</strong>: la mediana llevada a la misma unidad, para comparar
          envases distintos. <strong>Ahorro buscando</strong>: cuánto menos que la mediana paga
          quien compra en el 10 % de locales más baratos. Se mide contra ese 10 % y no contra el
          mínimo, porque el mínimo puede ser una góndola quieta o un error de carga.
        </p>
      </section>

      <!-- Canasta -->
      <section v-if="basket" id="canasta" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-2">La canasta, y qué se puede comparar</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Una canasta fija de <strong>{{ basket.basketItems }} artículos</strong> pinneada el
          {{ basket.basketPinnedAt }}. Se calcula sólo con precios observados:
          <strong>{{ basket.qualifiedStores }} locales</strong> declaran al menos el 70 % de ella y
          por eso entran en la comparación; los demás dicen "muestra insuficiente" en lugar de un
          número que parece comparable y no lo es.
        </p>

        <VAlert
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-information-outline"
          class="mb-5"
        >
          <p class="mb-1 font-weight-medium">Por qué no publicamos "la canasta cuesta $X acá"</p>
          <p class="text-body-2 mb-0">
            Ningún local del país declara los {{ basket.basketItems }} artículos. Sumar sólo lo que
            cada uno declara le baja el total al que le <em>faltan</em> productos, no al que es
            barato: medido, la correlación entre cobertura y total crudo es <strong>0,842</strong>,
            y de los diez "más baratos" por total sólo uno sigue estando entre los diez más baratos
            cuando se compara bien. Así que se publica cuánto cobra cada local por
            <strong>los artículos que sí declara</strong>, contra la mediana del país de
            <strong>esos mismos</strong> artículos.
          </p>
        </VAlert>

        <h3 id="locales-canasta" class="text-subtitle-1 font-weight-bold mb-2">
          Dónde la canasta sale más barata
        </h3>
        <div class="precios-toolbar mb-3">
          <VSelect
            v-model="storeDept"
            :items="storeDeptItems"
            label="Departamento"
            prepend-inner-icon="mdi-map-marker-outline"
            variant="outlined"
            density="comfortable"
            hide-details
            class="precios-toolbar__search"
          />
          <div class="precios-toolbar__sort">
            <VSelect
              :model-value="storeSort.orden"
              :items="storeSortItems"
              label="Ordenar por"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="selectStoreSort"
            />
            <VBtn
              variant="outlined"
              :icon="storeSort.dir === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
              :aria-label="
                storeSort.dir === 'asc'
                  ? 'De menor a mayor. Tocá para invertir.'
                  : 'De mayor a menor. Tocá para invertir.'
              "
              @click="storeSort.dir = storeSort.dir === 'asc' ? 'desc' : 'asc'"
            />
          </div>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-3" aria-live="polite">{{ storeListNote }}</p>
        <div class="table-scroll mb-2">
          <VTable density="comfortable" class="cu-mobile-cards cu-roomy">
            <thead>
              <tr>
                <PreciosSortTh
                  v-for="column in storeColumns"
                  :key="column.key"
                  :label="column.label"
                  :sort-key="column.key"
                  :current="storeSort.orden"
                  :dir="storeSort.dir"
                  :align="column.align"
                  @sort="headerStoreSort"
                />
              </tr>
            </thead>
            <tbody>
              <tr v-for="store in visibleStores" :key="store.storeId">
                <td data-label="Local">
                  {{ store.storeName }}
                  <span v-if="store.address" class="d-block text-caption text-medium-emphasis">
                    {{ store.address }}
                  </span>
                </td>
                <td data-label="Departamento">{{ store.department || '—' }}</td>
                <td data-label="Nivel de precios" class="text-right">
                  <strong>{{ levelLabel(store.ratio) }}</strong>
                </td>
                <td data-label="Cobertura" class="text-right">
                  {{ Math.round(store.coverage * 100) }} %
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p v-if="sortedStores.length > visibleStores.length" class="mb-6">
          <VBtn variant="text" size="small" @click="showAllStores = true">
            Ver los {{ sortedStores.length }} locales
          </VBtn>
        </p>
        <p v-else-if="!sortedStores.length" class="text-body-2 text-medium-emphasis mb-6">
          Ningún local de {{ storeDept }} declara hoy el 70 % de la canasta.
        </p>
        <div v-else class="mb-6" />

        <h3 class="text-subtitle-1 font-weight-bold mb-2">Por departamento</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ rankedDepartments.length }} de 19 departamentos tienen muestra suficiente. Los otros
          {{ unrankedDepartments.length }} no: el catálogo oficial tiene
          {{ thinnestDepartmentNote }}, y con eso no hay ranking honesto.
        </p>
        <div class="table-scroll mb-4">
          <VTable density="comfortable" class="cu-mobile-cards cu-roomy">
            <thead>
              <tr>
                <PreciosSortTh
                  v-for="column in scopeColumns('Departamento')"
                  :key="column.key"
                  :label="column.label"
                  :sort-key="column.key"
                  :current="deptSort.orden"
                  :dir="deptSort.dir"
                  :align="column.align"
                  @sort="sortDepts"
                />
                <th v-if="hasRankedStores">Local más barato</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="scope in rankedDepartments" :key="scope.scope">
                <td data-label="Departamento">{{ scopeName(scope.scope) }}</td>
                <td data-label="Nivel de precios" class="text-right">
                  {{ levelLabel(scope.median) }}
                </td>
                <td data-label="Locales" class="text-right">{{ scope.stores }}</td>
                <td v-if="hasRankedStores" data-label="Local más barato">
                  <template v-if="cheapestByDept.get(scopeName(scope.scope))">
                    {{ cheapestByDept.get(scopeName(scope.scope))?.storeName }}
                    <span class="d-block text-caption text-medium-emphasis">
                      {{ levelLabel(cheapestByDept.get(scopeName(scope.scope))?.ratio) }}
                    </span>
                  </template>
                  <VBtn
                    variant="text"
                    size="small"
                    density="comfortable"
                    append-icon="mdi-arrow-right"
                    class="cu-btn-flush"
                    @click="showDeptStores(scopeName(scope.scope))"
                  >
                    Ver locales
                  </VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p v-if="unrankedDepartments.length" class="text-body-2 text-medium-emphasis mb-6">
          Sin muestra suficiente:
          {{ unrankedDepartments.map(s => `${scopeName(s.scope)} (${s.stores})`).join(', ') }}.
        </p>

        <h3 class="text-subtitle-1 font-weight-bold mb-2">Por cadena</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Sólo las cadenas con al menos 5 locales que declaren el 70 % de la canasta. Es un nivel de
          precios sobre esta canasta y este día, no un veredicto sobre la cadena.
        </p>
        <div class="table-scroll">
          <VTable density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <PreciosSortTh
                  v-for="column in scopeColumns('Cadena')"
                  :key="column.key"
                  :label="column.label"
                  :sort-key="column.key"
                  :current="chainSort.orden"
                  :dir="chainSort.dir"
                  :align="column.align"
                  @sort="sortChains"
                />
              </tr>
            </thead>
            <tbody>
              <tr v-for="scope in rankedChains" :key="scope.scope">
                <td data-label="Cadena">{{ scopeName(scope.scope) }}</td>
                <td data-label="Nivel de precios" class="text-right">
                  {{ levelLabel(scope.median) }}
                </td>
                <td data-label="Locales" class="text-right">{{ scope.stores }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </section>

      <!-- Método -->
      <section id="metodo" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-3">Cómo se mide, y qué se descarta</h2>
        <VRow>
          <VCol v-for="card in methodCards" :key="card.title" cols="12" md="6">
            <VCard variant="outlined" class="pa-4 h-100">
              <p class="text-subtitle-2 font-weight-bold mb-1">{{ card.title }}</p>
              <p class="text-body-2 mb-0" v-html="card.body" />
            </VCard>
          </VCol>
        </VRow>
      </section>

      <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" class="mb-10" />

      <section class="mb-4">
        <h2 class="text-h5 font-weight-bold mb-3">Seguí con el resto del presupuesto</h2>
        <VRow>
          <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="3">
            <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
              <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
            </VCard>
          </VCol>
        </VRow>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  PRECIOS_MIN_OBSERVATIONS,
  preciosSlug,
  preciosSpread,
  type PreciosArticleRow,
} from '~/utils/preciosCatalog'
import {
  PRECIOS_ARTICLE_SORTS,
  PRECIOS_ARTICLE_TABLE_DEFAULTS,
  PRECIOS_CATEGORIES,
  PRECIOS_RANKED_SORTS,
  preciosArticleQueryFromState,
  preciosArticleStateFromQuery,
  preciosBestPerUnitInGroup,
  preciosCategory,
  preciosCategoryCounts,
  preciosCategoryLabel,
  preciosFilterArticles,
  preciosMedianPerUnit,
  preciosSavings,
  preciosSortArticles,
  preciosSortBy,
  preciosSortRankedStores,
  type PreciosArticleSortKey,
  type PreciosArticleTableState,
  type PreciosCategoryId,
  type PreciosRankedSortKey,
  type PreciosRankedStore,
  type PreciosSortDir,
} from '~/utils/preciosTable'

const localePath = useLocalePath()
const route = useRoute()

// Server-rendered: los números SON la página. Un crawler y alguien con mala
// conexión tienen que recibirlos en el HTML, no después de un round trip.
const { data } = await useFetch<any>('/api/precios', {
  key: 'precios-hub',
  default: () => null,
})

const articles = computed<PreciosArticleRow[]>(() => data.value?.articles ?? [])
const basket = computed<any>(() => data.value?.basket ?? null)
const hasData = computed(() => articles.value.length > 0)

const articleCount = computed(() => articles.value.length)
const storeCount = computed(() => {
  // Los locales que efectivamente declararon algo, no el tamaño del catálogo.
  const scopes = basket.value?.scopes ?? []
  const depts = scopes.filter((s: any) => s.scope.startsWith('dept:'))
  const counted = depts.reduce((sum: number, s: any) => sum + (s.stores || 0), 0)
  return counted || basket.value?.qualifiedStores || 0
})

const freshnessLabel = computed(() =>
  data.value?.day ? `lectura del ${data.value.day}` : 'sin lectura'
)

// ---------------------------------------------------------------------------
// Tabla de artículos
// ---------------------------------------------------------------------------

// El estado sale de la URL también en el servidor: un enlace compartido
// ("?q=aceite&orden=unidad") llega ya filtrado y ordenado en el HTML, no se
// reordena delante de quien lo abre después de hidratar.
const articleTable = reactive<PreciosArticleTableState>(preciosArticleStateFromQuery(route.query))
const showAll = ref(false)

const articleSortItems = Object.entries(PRECIOS_ARTICLE_SORTS).map(([value, sort]) => ({
  title: sort.label,
  value,
}))

const articleColumns: Array<{ key: PreciosArticleSortKey; label: string }> = [
  { key: 'nombre', label: 'Artículo' },
  { key: 'barato', label: 'Más barato' },
  { key: 'mediana', label: 'Mediana' },
  { key: 'caro', label: 'Más caro' },
  { key: 'unidad', label: 'Por litro o kilo' },
  { key: 'ahorro', label: 'Ahorro buscando' },
  { key: 'locales', label: 'Locales' },
]

/** El encabezado alterna: la misma columna invierte, otra columna arranca en su orden natural. */
function headerArticleSort(key: string) {
  const next = key as PreciosArticleSortKey
  if (!(next in PRECIOS_ARTICLE_SORTS)) return
  if (articleTable.orden === next) {
    articleTable.dir = articleTable.dir === 'asc' ? 'desc' : 'asc'
    return
  }
  articleTable.orden = next
  articleTable.dir = PRECIOS_ARTICLE_SORTS[next].defaultDir
}

/**
 * El selector NO alterna. Vuetify re-emite el valor mientras monta, y un toggle
 * acá invertiría el orden de una URL compartida sin que nadie tocara nada.
 */
function selectArticleSort(key: unknown) {
  const next = key as PreciosArticleSortKey
  if (!(next in PRECIOS_ARTICLE_SORTS) || next === articleTable.orden) return
  articleTable.orden = next
  articleTable.dir = PRECIOS_ARTICLE_SORTS[next].defaultDir
}

function setRubro(value: unknown) {
  articleTable.rubro =
    typeof value === 'string' && PRECIOS_CATEGORIES.some(category => category.id === value)
      ? (value as PreciosCategoryId)
      : ''
}

const articleFiltersActive = computed(
  () => Object.keys(preciosArticleQueryFromState(articleTable)).length > 0
)

function resetArticleTable() {
  Object.assign(articleTable, PRECIOS_ARTICLE_TABLE_DEFAULTS)
  showAll.value = false
}

const articlePresets: Array<{
  label: string
  icon: string
  state: Partial<PreciosArticleTableState>
}> = [
  {
    label: 'Aceites por litro',
    icon: 'mdi-bottle-tonic-outline',
    // Con muestra amplia: por litro, un artículo que declaran 13 locales encabezaba
    // con la mitad de la mediana de los que declaran 300.
    state: { q: 'aceite', orden: 'unidad', dir: 'asc', muestra: true },
  },
  {
    label: 'Yerbas por kilo',
    icon: 'mdi-leaf',
    state: { q: 'yerba', orden: 'unidad', dir: 'asc', muestra: true },
  },
  {
    label: 'Dónde conviene buscar precio',
    icon: 'mdi-cash-fast',
    state: { orden: 'ahorro', dir: 'desc', muestra: true },
  },
  {
    label: 'Lo que más locales declaran',
    icon: 'mdi-store-outline',
    state: { orden: 'locales', dir: 'desc' },
  },
]

function applyPreset(state: Partial<PreciosArticleTableState>) {
  Object.assign(articleTable, PRECIOS_ARTICLE_TABLE_DEFAULTS, state)
  showAll.value = false
}

const filteredArticles = computed(() =>
  preciosSortArticles(
    preciosFilterArticles(articles.value, articleTable),
    articleTable.orden,
    articleTable.dir
  )
)

// Con una búsqueda escrita se muestra todo lo que coincide: nadie busca
// "aceite" para ver 25 de 30 aceites.
const visibleArticles = computed(() =>
  showAll.value || articleTable.q.trim()
    ? filteredArticles.value
    : filteredArticles.value.slice(0, 25)
)

const categoryCounts = computed(() => preciosCategoryCounts(articles.value))
const categoryChips = computed(() =>
  PRECIOS_CATEGORIES.map(category => ({
    ...category,
    count: categoryCounts.value[category.id] || 0,
  })).filter(category => category.count > 0)
)

const articleSortSummary = computed(() => {
  const asc = articleTable.dir === 'asc'
  const direction =
    articleTable.orden === 'nombre'
      ? asc
        ? 'de la A a la Z'
        : 'de la Z a la A'
      : asc
        ? 'de menor a mayor'
        : 'de mayor a menor'
  return `${PRECIOS_ARTICLE_SORTS[articleTable.orden].label.toLowerCase()}, ${direction}`
})

const bestInGroup = computed(() => preciosBestPerUnitInGroup(articles.value))

const maxSpreadLabel = computed(() => {
  let best = 0
  for (const row of articles.value) {
    const spread = preciosSpread(row)
    if (spread && spread > best) best = spread
  }
  return best ? `${best.toFixed(1)} veces` : '—'
})

const perUnitLabel = (row: PreciosArticleRow): string => {
  const perUnit = preciosMedianPerUnit(row)
  return perUnit ? `${money(perUnit.value)} / ${perUnit.label}` : '—'
}
const perUnitShort = (row: PreciosArticleRow): string =>
  preciosMedianPerUnit(row)?.label ?? 'unidad'

/** Por debajo de medio punto no hay nada que ganar recorriendo locales. */
const hasSavings = (row: PreciosArticleRow): boolean => (preciosSavings(row) ?? 0) >= 0.005
const savingsLabel = (row: PreciosArticleRow): string => {
  const savings = preciosSavings(row)
  if (savings === null) return '—'
  return hasSavings(row) ? `${Math.round(savings * 100)} %` : 'casi nada'
}

// ---------------------------------------------------------------------------
// Canasta: locales, departamentos y cadenas
// ---------------------------------------------------------------------------

const rankedStores = computed<PreciosRankedStore[]>(() => basket.value?.rankedStores ?? [])
// Un documento de canasta anterior al 2026-09-19 no trae la lista por
// departamento: la tabla cae a los 25 más baratos del país y lo dice.
const hasRankedStores = computed(() => rankedStores.value.length > 0)

const storeDept = ref(typeof route.query.depto === 'string' ? route.query.depto.slice(0, 40) : '')
const showAllStores = ref(false)
const storeSort = reactive<{ orden: PreciosRankedSortKey; dir: PreciosSortDir }>({
  orden: 'nivel',
  dir: 'asc',
})

const deptScopes = computed<any[]>(() =>
  (basket.value?.scopes ?? []).filter((s: any) => s.scope.startsWith('dept:'))
)

const storeDeptOptions = computed(() => {
  const pool = hasRankedStores.value ? rankedStores.value : (basket.value?.cheapestStores ?? [])
  const names = new Set<string>()
  for (const store of pool) if (store.department) names.add(store.department)
  return [...names].sort((a, b) => a.localeCompare(b, 'es'))
})

const storeDeptItems = computed(() => [
  { title: 'Todo el país', value: '' },
  ...storeDeptOptions.value.map(name => {
    const scope = deptScopes.value.find(s => scopeName(s.scope) === name)
    return {
      title: scope ? `${name} (${scope.stores} ${scope.stores === 1 ? 'local' : 'locales'})` : name,
      value: name,
    }
  }),
])

// Un departamento de la URL que hoy no tiene locales comparables se ignora en
// vez de dejar la tabla vacía sin explicación.
watch(
  storeDeptOptions,
  options => {
    if (storeDept.value && options.length && !options.includes(storeDept.value)) {
      storeDept.value = ''
    }
  },
  { immediate: true }
)

watch(storeDept, () => {
  showAllStores.value = false
})

const storeColumns: Array<{ key: PreciosRankedSortKey; label: string; align: 'left' | 'right' }> = [
  { key: 'local', label: 'Local', align: 'left' },
  { key: 'departamento', label: 'Departamento', align: 'left' },
  { key: 'nivel', label: 'Nivel de precios', align: 'right' },
  { key: 'cobertura', label: 'Cobertura', align: 'right' },
]

const storeSortItems = Object.entries(PRECIOS_RANKED_SORTS).map(([value, sort]) => ({
  title: sort.label,
  value,
}))

function headerStoreSort(key: string) {
  const next = key as PreciosRankedSortKey
  if (!(next in PRECIOS_RANKED_SORTS)) return
  if (storeSort.orden === next) {
    storeSort.dir = storeSort.dir === 'asc' ? 'desc' : 'asc'
    return
  }
  storeSort.orden = next
  storeSort.dir = PRECIOS_RANKED_SORTS[next].defaultDir
}

function selectStoreSort(key: unknown) {
  const next = key as PreciosRankedSortKey
  if (!(next in PRECIOS_RANKED_SORTS) || next === storeSort.orden) return
  storeSort.orden = next
  storeSort.dir = PRECIOS_RANKED_SORTS[next].defaultDir
}

const addressById = computed(
  () => new Map(rankedStores.value.map(store => [store.storeId, store.address || '']))
)

const storePool = computed<PreciosRankedStore[]>(() => {
  // Todo el país: los 25 más baratos de verdad. La lista por departamento viene
  // recortada a los primeros de CADA uno, así que en Montevideo le faltarían
  // locales que sí están entre los más baratos del país.
  if (!storeDept.value || !hasRankedStores.value) {
    const national: PreciosRankedStore[] = (basket.value?.cheapestStores ?? []).map(
      (store: any) => ({ ...store, address: addressById.value.get(store.storeId) || '' })
    )
    return storeDept.value
      ? national.filter(store => store.department === storeDept.value)
      : national
  }
  return rankedStores.value.filter(store => store.department === storeDept.value)
})

const sortedStores = computed(() =>
  preciosSortRankedStores(storePool.value, storeSort.orden, storeSort.dir)
)
const visibleStores = computed(() =>
  showAllStores.value ? sortedStores.value : sortedStores.value.slice(0, 12)
)

const storeListNote = computed(() => {
  if (!storeDept.value) {
    return `Los ${storePool.value.length} locales con la canasta más barata del país. Elegí un departamento para ver los del tuyo.`
  }
  const scope = deptScopes.value.find(s => scopeName(s.scope) === storeDept.value)
  const total = scope?.stores ?? storePool.value.length
  if (!hasRankedStores.value) {
    return `Sólo los de ${storeDept.value} que están entre los 25 más baratos del país: la lista completa por departamento se publica desde la próxima lectura.`
  }
  if (storePool.value.length < total) {
    return `Los ${storePool.value.length} locales con la canasta más barata de ${storeDept.value}, de ${total} comparables.`
  }
  return `${total === 1 ? 'El único local' : `Los ${total} locales`} de ${storeDept.value} con canasta comparable.`
})

const cheapestByDept = computed(() => {
  const out = new Map<string, PreciosRankedStore>()
  for (const store of rankedStores.value) {
    const current = out.get(store.department)
    if (!current || store.ratio < current.ratio) out.set(store.department, store)
  }
  return out
})

function showDeptStores(dept: string) {
  storeDept.value = dept
  storeSort.orden = 'nivel'
  storeSort.dir = 'asc'
  if (import.meta.client) {
    document
      .getElementById('locales-canasta')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

type ScopeSortKey = 'nombre' | 'nivel' | 'locales'
const SCOPE_SORTS: Record<ScopeSortKey, { defaultDir: PreciosSortDir; value: (s: any) => any }> = {
  nombre: { defaultDir: 'asc', value: s => scopeName(s.scope) },
  nivel: { defaultDir: 'asc', value: s => s.median },
  locales: { defaultDir: 'desc', value: s => s.stores },
}

const scopeColumns = (first: string) => [
  { key: 'nombre', label: first, align: 'left' as const },
  { key: 'nivel', label: 'Nivel de precios', align: 'right' as const },
  { key: 'locales', label: 'Locales', align: 'right' as const },
]

const deptSort = reactive<{ orden: ScopeSortKey; dir: PreciosSortDir }>({
  orden: 'nivel',
  dir: 'asc',
})
const chainSort = reactive<{ orden: ScopeSortKey; dir: PreciosSortDir }>({
  orden: 'nivel',
  dir: 'asc',
})

function toggleScopeSort(state: { orden: ScopeSortKey; dir: PreciosSortDir }, key: string) {
  const next = key as ScopeSortKey
  if (!(next in SCOPE_SORTS)) return
  if (state.orden === next) {
    state.dir = state.dir === 'asc' ? 'desc' : 'asc'
    return
  }
  state.orden = next
  state.dir = SCOPE_SORTS[next].defaultDir
}
const sortDepts = (key: string) => toggleScopeSort(deptSort, key)
const sortChains = (key: string) => toggleScopeSort(chainSort, key)

const sortScopes = (rows: any[], state: { orden: ScopeSortKey; dir: PreciosSortDir }) =>
  preciosSortBy(rows, SCOPE_SORTS[state.orden].value, state.dir, s => scopeName(s.scope))

const rankedDepartments = computed(() =>
  sortScopes(
    deptScopes.value.filter((s: any) => s.qualified),
    deptSort
  )
)
const unrankedDepartments = computed(() =>
  deptScopes.value.filter((s: any) => !s.qualified).sort((a: any, b: any) => b.stores - a.stores)
)
const rankedChains = computed(() =>
  sortScopes(
    (basket.value?.scopes ?? []).filter((s: any) => s.scope.startsWith('chain:') && s.qualified),
    chainSort
  )
)

const thinnestDepartmentNote = computed(() => {
  const thin = unrankedDepartments.value[unrankedDepartments.value.length - 1]
  if (!thin) return 'pocas bocas en varios de ellos'
  return `${thin.stores} ${thin.stores === 1 ? 'boca' : 'bocas'} con canasta comparable en ${scopeName(thin.scope)}`
})

usePreciosQuerySync(() => ({
  ...preciosArticleQueryFromState(articleTable),
  ...(storeDept.value ? { depto: storeDept.value } : {}),
}))

const money = (value?: number): string =>
  value === undefined || value === null
    ? '—'
    : `$ ${value.toLocaleString('es-UY', { maximumFractionDigits: 2 })}`

const scopeName = (scope: string): string => scope.replace(/^(dept|chain):/, '')

/**
 * El nivel de precios en palabras. Se publica el cociente y NO un total
 * completado: escalarlo a la canasta entera daría una cifra linda y comparable
 * pero sería inventar el precio de los artículos que el local no vende.
 */
const levelLabel = (ratio?: number | null): string => {
  if (ratio === undefined || ratio === null || !Number.isFinite(ratio)) return '—'
  const pct = (ratio - 1) * 100
  if (Math.abs(pct) < 1) return 'como la mediana'
  return pct < 0 ? `${Math.abs(pct).toFixed(1)} % más barato` : `${pct.toFixed(1)} % más caro`
}

const methodCards = [
  {
    title: 'La fuente es el Estado, no nosotros',
    body: 'Los precios los declaran los comercios al SIPC (Ministerio de Economía / Área Defensa del Consumidor). <code>precios.gub.uy</code> redirige a <code>precios.uy</code>: es el mismo sistema oficial. Acá no se releva ningún precio a mano.',
  },
  {
    title: 'Una góndola vieja no encabeza',
    body: 'Cada fila trae la fecha que declara el local. Si pasaron más de dos semanas se marca y <strong>no puede ganar el "más barato"</strong>. No se borra: una góndola quieta puede ser un precio real. Pero el titular no se lo lleva.',
  },
  {
    title: 'El precio absurdo se marca, no se borra',
    body: 'La banda se calcula con los percentiles del propio artículo, porque el spread real va de 1,58× a 4,86× según el producto y un factor fijo no sirve para los dos. Lo que queda muy por debajo del resto se muestra marcado y tampoco encabeza.',
  },
  {
    title: 'Las ofertas cuentan',
    body: 'Una de cada diez filas viene declarada como <em>oferta</em>, y es 7,8 % más barata que el precio normal del mismo artículo. Descartarlas empujaría todos los promedios para arriba y borraría del ranking a los locales que están haciendo promoción, así que se leen y se etiquetan.',
  },
  {
    title: 'Lo que no se publica',
    body: 'El comparador oficial completa los huecos de su tabla con un promedio nacional marcado <code>(*)</code>. Para un artículo con 28 precios reales llega a mostrar el mismo número en 722 locales. Nada de eso entra: sin precio propio y sin fecha propia, no es una observación.',
  },
  {
    title: 'Esto no es el IPC',
    body: 'Es una canasta fija propia, con cantidades supuestas, útil para comparar locales entre sí. El índice de precios al consumo lo publica el INE y se calcula de otra manera.',
  },
]

const relatedLinks = [
  {
    to: '/herramientas/costo-de-vida',
    title: 'Costo de vida',
    body: 'Cuánto necesitás por mes según con quién vivís y dónde.',
  },
  {
    to: '/descuentos-con-tarjeta-uruguay',
    title: 'Descuentos con tarjeta',
    body: 'Qué día conviene comprar y con qué tarjeta.',
  },
  {
    to: '/herramientas/calculadora-sueldo-liquido',
    title: 'Sueldo líquido',
    body: 'De lo que dice el contrato a lo que llega a la cuenta.',
  },
  {
    to: '/alquileres-uruguay',
    title: 'Alquileres',
    body: 'La otra mitad grande del presupuesto, aviso por aviso.',
  },
]

const faqItems: FaqItem[] = [
  {
    id: 'fuente',
    question: '¿De dónde salen estos precios?',
    answer:
      'Los declaran los propios comercios al SIPC, el Sistema de Información de Precios al Consumidor del Ministerio de Economía y Finanzas y el Área Defensa del Consumidor. Es información pública y oficial; acá se lee todos los días, se guarda y se compara.',
  },
  {
    id: 'fecha-vieja',
    question: '¿Por qué un local aparece con un precio de la semana pasada?',
    answer:
      'Porque es la fecha que el propio local declaró. El sistema oficial no obliga a actualizar todos los días, así que hay góndolas que quedan quietas. La fecha se muestra siempre, y una fila de más de dos semanas no puede aparecer como el precio más barato.',
  },
  {
    id: 'canasta-completa',
    question: '¿Por qué no dicen cuánto cuesta la canasta completa en cada supermercado?',
    answer:
      'Porque ningún local declara todos los artículos de la canasta, y sumar sólo lo que cada uno declara favorece al que tiene menos productos cargados en lugar de al más barato. En vez de eso se compara cuánto cobra cada local por los artículos que sí declara, contra la mediana del país de esos mismos artículos.',
  },
  {
    id: 'sin-ranking',
    question: '¿Por qué mi departamento no tiene ranking?',
    answer:
      'Porque el catálogo oficial tiene muy pocas bocas ahí. Con dos o tres locales, un "más barato del departamento" diría más sobre quién carga precios que sobre los precios. Cuando no hay muestra suficiente se dice, en vez de publicar el número igual.',
  },
  {
    id: 'comparar-marcas',
    question: '¿Cómo comparo marcas que vienen en envases distintos?',
    answer:
      'Con la columna "Por litro o kilo": lleva el precio mediano de cada artículo a la misma unidad, así un aceite de 900 ml y uno de 1,5 litros se comparan directo. Buscá el producto (por ejemplo "aceite") y ordená por esa columna. Cuando dos o más marcas del mismo producto tienen muestra amplia, la que sale menos por unidad lleva la marca "mejor precio".',
  },
  {
    id: 'ahorro-buscando',
    question: '¿En qué productos conviene recorrer supermercados?',
    answer:
      'En los que tienen el "ahorro buscando" más alto: es cuánto menos que la mediana paga quien compra en el 10 % de locales más baratos de ese artículo. Hay productos donde casi no hay diferencia entre locales y otros donde pasa del 40 %. Se mide contra ese 10 % y no contra el precio mínimo, porque el mínimo puede ser una góndola que no se actualiza o un error de carga.',
  },
  {
    id: 'no-es-ipc',
    question: '¿Es el mismo dato que el índice de precios del INE?',
    answer:
      'No. El IPC lo calcula el Instituto Nacional de Estadística con su propia canasta y su propia metodología. Lo de esta página es una canasta fija propia, con cantidades supuestas, que sirve para comparar locales entre sí en un mismo día.',
  },
]

// 34 caracteres: con el sufijo del sitio el titulo renderizado queda en 51 y
// entra completo en el SERP. El presupuesto de titulos del repo tolera 33
// pasados de 60 y no hace falta gastar el 34 aca.
const title = 'Precios de supermercado en Uruguay'
const description =
  'Precios de góndola declarados al SIPC (Ministerio de Economía), producto por producto y local por local, con la fecha de cada dato y el histórico que el Estado no guarda.'
const canonicalUrl = 'https://cambio-uruguay.com/precios-de-supermercado-uruguay'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'Precios de supermercado en Uruguay (SIPC)',
        description,
        url: canonicalUrl,
        inLanguage: 'es-UY',
        isAccessibleForFree: true,
        creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
        distribution: [
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: 'https://api.cambio-uruguay.com/precios/articles',
          },
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: 'https://api.cambio-uruguay.com/precios/basket',
          },
        ],
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Inicio',
            item: 'https://cambio-uruguay.com/',
          },
          directoriosHubListItem(2),
          { '@type': 'ListItem', position: 3, name: 'Precios de supermercado', item: canonicalUrl },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}
/* "Ver locales" desplaza hasta acá: sin margen, el título queda bajo la barra fija. */
#locales-canasta {
  scroll-margin-top: 88px;
}
.precios-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.precios-toolbar__search {
  flex: 1 1 280px;
  max-width: 520px;
}
.precios-toolbar__sort {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 0 1 300px;
  min-width: 0;
}
.precios-toolbar__sort :deep(.v-select) {
  min-width: 0;
}
@media (max-width: 599px) {
  .precios-toolbar__search,
  .precios-toolbar__sort {
    flex-basis: 100%;
    max-width: none;
  }
}
</style>
