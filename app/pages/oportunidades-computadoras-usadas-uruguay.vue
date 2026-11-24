<!--
THESIS: Entre dos mil avisos de computadoras usadas, cuáles piden bastante menos que lo que valen
según el mismo mercado: sus piezas usadas sumadas, las máquinas iguales o la misma pieza usada. Con
la regla de /oportunidades-autos-usados-uruguay: referencia fija, mínimo de comparables, ninguna falla
declarada, ninguna moneda deducida y la ficha de Facebook leída.
OWN-WORLD: La forma de /oportunidades-autos-usados-uruguay (resumen de la lista entera, método,
advertencia, columna de filtros, grilla) con las tarjetas del directorio de computadoras.
FAMILY: Sólo español, como el directorio: el canonical es literal.
-->
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Computadoras usadas', to: localePath(COMPUTADORAS_PATH) },
        { title: 'Oportunidades' },
      ]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="pc-title">Oportunidades en computadoras usadas en Uruguay</h1>
      <!-- La lista ENTERA, no la página que se ve: las páginas 2 en adelante y cada filtro van
           noindex, así que sin este resumen la URL indexada sólo contaría las primeras 24. -->
      <p v-if="payload.status === 'ok'" class="lead" data-testid="deal-summary">
        {{ computerDealSummaryText(payload.summary) }}
        <template v-if="readAt">Cálculo del {{ readAt }}.</template>
      </p>
      <p class="lead">
        Una oportunidad es un aviso que pide <strong>entre el 15 % y el 55 % menos</strong> que su
        referencia: la suma de lo que salen hoy sus mismas piezas usadas (una PC de escritorio), lo
        que se pide por máquinas iguales (una notebook, una all-in-one, una mini PC) o lo que se
        pide por la misma pieza usada. Ninguna declara una falla, en ninguna dedujimos la moneda, y
        de cada aviso de Facebook Marketplace leímos su propia ficha, que es donde el vendedor
        cuenta lo que no anda.
      </p>
      <VAlert type="warning" variant="outlined" density="comfortable" class="mb-3">
        <strong>No es una tasación ni una garantía.</strong> Un precio bajo puede tener una
        explicación que el aviso no dice. Antes de pagar, pedí que te la prendan delante tuyo, probá
        el teclado, la pantalla y los puertos, mirá cuánto aguanta la batería y que el cargador sea
        el suyo. Desconfiá de quien pide seña o envío antes de que la veas, y de un precio que baja
        solo cuando preguntás.
      </VAlert>
      <p class="text-body-2 mb-0">
        Para saber qué es caro y qué es barato antes de mirar avisos:
        <NuxtLink :to="localePath(COMPUTER_NOTEBOOKS_PATH)">precios de notebooks usadas</NuxtLink>
        y la
        <NuxtLink :to="localePath(COMPUTER_COMPONENTS_PATH)">tabla de componentes</NuxtLink>.
      </p>
    </header>

    <VAlert
      v-if="payload.status === 'preparing'"
      type="info"
      variant="tonal"
      density="comfortable"
      icon="mdi-progress-clock"
      class="mb-6"
    >
      <strong>El cálculo está arrancando.</strong> Todavía no publicamos oportunidades: salen de la
      corrida diaria del <NuxtLink :to="localePath(COMPUTADORAS_PATH)">directorio</NuxtLink>.
    </VAlert>
    <VAlert
      v-else-if="payload.status === 'unavailable'"
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-database-off-outline"
      class="mb-6"
    >
      No pudimos leer la lista en este momento. No es que no haya oportunidades: es que no las
      pudimos leer. Probá de nuevo en unos minutos.
    </VAlert>

    <!--
      En el celular el panel es un cajón que se teletransporta al body: va FUERA de la grilla (la
      misma trampa que autos: adentro de la celda, Vue moría en `shouldUpdateComponent`).
    -->
    <CarsFilterPanel
      v-if="payload.status === 'ok' && smAndDown"
      v-model:open="filtersOpen"
      mobile
      :total="payload.total"
      noun="oportunidad"
      noun-plural="oportunidades"
      @apply="apply"
      @clear="clear"
    >
      <VSelect v-model="draft.evidencia" :items="tierItems" v-bind="fieldProps" label="Evidencia" />
      <VSelect v-model="draft.tipo" :items="tipoItems" v-bind="fieldProps" label="Qué es" />
      <VSelect
        v-model="draft.marcaEquipo"
        :items="brandItems"
        v-bind="fieldProps"
        label="Marca del equipo"
      />
      <VTextField
        v-model="draft.precioMaxUsd"
        v-bind="fieldProps"
        label="US$ máx."
        inputmode="numeric"
      />
      <VSelect v-model="draft.fuente" :items="sourceItems" v-bind="fieldProps" label="Fuente" />
    </CarsFilterPanel>

    <CarsSidebarLayout v-if="payload.status === 'ok'">
      <template #filters>
        <CarsFilterPanel
          v-if="!smAndDown"
          :mobile="false"
          :total="payload.total"
          noun="oportunidad"
          noun-plural="oportunidades"
          @apply="apply"
          @clear="clear"
        >
          <VSelect
            v-model="draft.evidencia"
            :items="tierItems"
            v-bind="fieldProps"
            label="Evidencia"
            data-testid="deal-filtro-evidencia"
          />
          <VSelect v-model="draft.tipo" :items="tipoItems" v-bind="fieldProps" label="Qué es" />
          <VSelect
            v-model="draft.marcaEquipo"
            :items="brandItems"
            v-bind="fieldProps"
            label="Marca del equipo"
          />
          <VTextField
            v-model="draft.precioMaxUsd"
            v-bind="fieldProps"
            label="US$ máx."
            inputmode="numeric"
          />
          <VSelect v-model="draft.fuente" :items="sourceItems" v-bind="fieldProps" label="Fuente" />
        </CarsFilterPanel>
      </template>
      <template #default>
        <CarsToolbar
          v-if="smAndDown"
          :sort="query.orden"
          :items="sortItems"
          :active-count="chips.length"
          :open="filtersOpen"
          @open="filtersOpen = true"
          @update:sort="
            value => navigate({ ...query, orden: value as ComputerDealSort, pagina: 1 })
          "
        />
        <CarsActiveFilters
          :chips="chips"
          @remove="keys => removeChip(keys)"
          @clear="navigate(computerDealNormalizeQuery({ orden: query.orden }))"
        />
        <div class="results-head">
          <h2 id="deal-results" class="results-title pc-anchor">
            {{ payload.total.toLocaleString('es-UY') }}
            {{ payload.total === 1 ? 'oportunidad' : 'oportunidades' }}
          </h2>
          <VSelect
            v-if="!smAndDown"
            :model-value="query.orden"
            :items="sortItems"
            label="Ordenar"
            density="compact"
            variant="outlined"
            hide-details
            class="sort-select"
            data-testid="deal-sort"
            @update:model-value="value => navigate({ ...query, orden: value, pagina: 1 })"
          />
        </div>
        <p v-if="!payload.items.length" class="empty">
          Hoy no hay avisos que cumplan estas condiciones con esos filtros. Es un resultado válido:
          la regla es exigente a propósito.
        </p>
        <div v-else ref="resultsList" class="pc-grid">
          <FeedEdge :feed="feed" edge="top" />
          <template v-for="(item, index) in feed.items" :key="item.slug">
            <FeedAd :index="index" :feed="feed" />
            <ComputadorasListingCard :computer="item" />
          </template>
          <FeedEdge :feed="feed" edge="bottom" />
        </div>
        <FeedControls :feed="feed">
          <template #pagination>
            <VPagination
              v-if="payload.total > payload.perPage"
              :model-value="query.pagina"
              :length="pageCount"
              :total-visible="3"
              class="mt-6"
              @update:model-value="changePage"
            />
          </template>
        </FeedControls>
      </template>
    </CarsSidebarLayout>

    <section v-if="payload.summary.kinds.length" class="pc-section">
      <h2>Qué hay en la lista</h2>
      <p class="section-note">Sobre la lista entera, sin filtros. Tocá una fila para verla.</p>
      <ul class="pc-kinds">
        <li v-for="row in payload.summary.kinds" :key="row.kind">
          <NuxtLink :to="{ query: computerDealQueryParams({ ...emptyQuery, tipo: row.kind }) }">
            {{ row.label }}
          </NuxtLink>
          <strong>{{ row.count.toLocaleString('es-UY') }}</strong>
        </li>
      </ul>
    </section>

    <section id="metodo" class="pc-section">
      <h2>Cómo se calcula</h2>
      <ul class="guide-list">
        <li>
          <strong>La referencia depende de lo que es el aviso.</strong> Una PC de escritorio se mide
          contra la suma de sus mismas piezas usadas, y sólo cuando TODAS tienen precio. Una
          notebook, una all-in-one o una mini PC no se arman: se miden contra la mediana de lo que
          piden por las iguales (mismo procesador y RAM, el mismo chip de Mac, o la misma línea con
          la misma familia de procesador). Una pieza suelta, contra la misma pieza usada.
        </li>
        <li>
          <strong>Oportunidad es pedir entre el 15 % y el 55 % menos.</strong> Menos del 15 % es el
          ruido de cualquier mercado. Más del 55 % queda afuera a propósito: con esa diferencia es
          más probable un error de moneda, una falla que el aviso no dice o una estafa que una
          ganga.
        </li>
        <li>
          <strong>Comparación sólida</strong> cuando la referencia es la suma completa de sus piezas
          usadas, o la mediana de seis avisos iguales o más por procesador, placa o chip, o de cinco
          piezas usadas iguales o más. <strong>Exploratoria</strong> con menos avisos o con una
          igualdad más gruesa (un Mac por año, la misma línea y familia, la misma generación): sirve
          para mirar, no para apurarse.
        </li>
        <li>
          Quedan afuera los avisos que declaran una falla, los de moneda deducida (Facebook marca
          todo en pesos por defecto), los que no vimos en los últimos dos días y los de menos de
          {{ computerUsd(40) }}. En Facebook, sólo entra un aviso cuya ficha leímos.
        </li>
        <li>Como mucho tres oportunidades por vendedor de Mercado Libre.</li>
        <li>
          Son precios <strong>pedidos</strong> en avisos, no precios de venta cerrados, y las
          especificaciones son lo que dice el aviso: no las verificamos.
        </li>
      </ul>
    </section>

    <section class="pc-section">
      <h2>Seguí con el detalle</h2>
      <VRow dense>
        <VCol cols="12" md="4">
          <VCard variant="outlined" :to="localePath(COMPUTADORAS_PATH)" class="pa-4 h-100">
            <p class="card-title">Todas las computadoras usadas</p>
            <p class="card-text">
              El directorio completo, con filtros por procesador, RAM, disco, pantalla y precio.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="outlined" :to="localePath(COMPUTER_NOTEBOOKS_PATH)" class="pa-4 h-100">
            <p class="card-title">Precios de notebooks usadas</p>
            <p class="card-text">
              Cuánto se pide por marca, procesador, generación y RAM, y la escalera de las MacBook.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="outlined" :to="localePath(COMPUTER_COMPONENTS_PATH)" class="pa-4 h-100">
            <p class="card-title">Precios de componentes de PC</p>
            <p class="card-text">
              La tabla contra la que se mide cada PC: cada pieza nueva y usada, hoy.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- :ad="false": la página ya lleva su unidad dentro de la grilla (FeedAd, feedAd.test.ts). -->
    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" :ad="false" />
  </VContainer>
</template>

<script setup lang="ts">
import { VPagination } from 'vuetify/components'
import { useDisplay } from 'vuetify'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  COMPUTADORAS_PATH,
  COMPUTER_COMPONENTS_PATH,
  COMPUTER_DEAL_SORT_ITEMS,
  COMPUTER_KIND_LABEL,
  COMPUTER_MACHINE_KINDS,
  COMPUTER_NOTEBOOKS_PATH,
  COMPUTER_OPPORTUNITIES_PATH,
  COMPUTER_PART_KINDS,
  COMPUTER_SOURCE_LABEL,
  COMPUTER_TIER_LABEL,
  computerDealChips,
  computerDealFaq,
  computerDealFiltered,
  computerDealNormalizeQuery,
  computerDealQueryParams,
  computerDealsEmpty,
  computerDealSummaryText,
  computerLongDate,
  computerUsd,
  type ComputerDealQuery,
  type ComputerDealSort,
  type ComputerDealsResponse,
} from '~/utils/computadoras'

// Directorio: filtros + grilla con el ancho del marco, como el de oportunidades de autos.
definePageMeta({ wide: true })
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { smAndDown } = useDisplay()
const filtersOpen = ref(false)
watch(smAndDown, mobile => {
  if (!mobile) filtersOpen.value = false
})

const query = computed<ComputerDealQuery>(() =>
  computerDealNormalizeQuery(route.query as Record<string, unknown>)
)
const emptyQuery = computerDealNormalizeQuery({})

// Server-rendered: la lista y su resumen tienen que estar en el HTML que lee el buscador.
const { data } = await useAsyncData(
  'computadoras-oportunidades',
  () =>
    $fetch<ComputerDealsResponse>('/api/computadoras/oportunidades', {
      query: computerDealQueryParams(query.value),
    }),
  { watch: [query] }
)
/** Con la forma vacía como piso: la página tiene que dibujarse aunque el job nunca haya corrido. */
const payload = computed<ComputerDealsResponse>(
  () => data.value ?? computerDealsEmpty(query.value, 'unavailable')
)
const readAt = computed(() => computerLongDate(payload.value.generatedAt || null))
const pageCount = computed(() =>
  Math.min(200, Math.ceil(payload.value.total / Math.max(1, payload.value.perPage)))
)
const resultsList = ref<HTMLElement | null>(null)
const feed = useInfiniteFeed<ComputerDealsResponse['items'][number]>({
  id: 'oportunidades-computadoras',
  itemKey: item => item.slug,
  list: resultsList,
  items: () => payload.value.items,
  page: () => query.value.pagina,
  pageCount: () => pageCount.value,
  perPage: () => payload.value.perPage,
  resetKey: () => JSON.stringify(computerDealQueryParams({ ...query.value, pagina: 1 })),
  fetchPage: (page, signal) =>
    $fetch<ComputerDealsResponse>('/api/computadoras/oportunidades', {
      query: computerDealQueryParams({ ...query.value, pagina: page }),
      signal,
    }).then(response => response.items),
  enabled: () => payload.value.items.length > 0,
  goToPage: changePage,
  anchorId: 'deal-results',
})

const fieldProps = { density: 'comfortable', variant: 'outlined', hideDetails: true } as const
const sortItems = [...COMPUTER_DEAL_SORT_ITEMS]
const tierItems = [
  { title: 'Sólida y exploratoria', value: '' },
  ...Object.entries(COMPUTER_TIER_LABEL).map(([value, title]) => ({
    title: `Sólo ${title.toLowerCase()}`,
    value,
  })),
]
const tipoItems = [
  { title: 'Computadoras y piezas', value: '' },
  { title: 'Computadoras (todas)', value: 'computadoras' },
  ...COMPUTER_MACHINE_KINDS.map(kind => ({ title: COMPUTER_KIND_LABEL[kind], value: kind })),
  { title: 'Piezas sueltas (todas)', value: 'piezas' },
  ...COMPUTER_PART_KINDS.map(kind => ({ title: COMPUTER_KIND_LABEL[kind], value: kind })),
]
// Las marcas salen del resumen (la lista entera): `?? []`, una respuesta vieja no las trae.
const brandItems = computed(() => [
  { title: 'Cualquier marca', value: '' },
  ...(payload.value.summary.brands ?? []).map(row => ({
    title: `${row.label} (${row.count})`,
    value: row.value,
  })),
])
const sourceItems = [
  { title: 'Todas las fuentes', value: '' },
  ...Object.entries(COMPUTER_SOURCE_LABEL).map(([value, title]) => ({ title, value })),
]

const toDraft = (value: ComputerDealQuery) => ({
  evidencia: value.evidencia as string,
  tipo: value.tipo as string,
  marcaEquipo: value.marcaEquipo,
  precioMaxUsd: value.precioMaxUsd == null ? '' : String(value.precioMaxUsd),
  fuente: value.fuente as string,
})
const draft = reactive(toDraft(query.value))
watch(query, next => Object.assign(draft, toDraft(next)))
const chips = computed(() => computerDealChips(query.value))

function navigate(next: ComputerDealQuery) {
  filtersOpen.value = false
  router.replace({ query: computerDealQueryParams(next) })
}
function changePage(page: number) {
  navigate({ ...query.value, pagina: page })
  scrollToPageTop('deal-results')
}
function apply() {
  // El orden se elige al lado de la lista, no en el formulario: aplicar filtros lo conserva.
  navigate(computerDealNormalizeQuery({ ...draft, orden: query.value.orden }))
}
function clear() {
  navigate(computerDealNormalizeQuery({ orden: query.value.orden }))
}
function removeChip(keys: Array<keyof ComputerDealQuery>) {
  const next = { ...query.value, pagina: 1 } as Record<string, unknown>
  for (const key of keys) next[key] = key === 'precioMaxUsd' ? null : ''
  navigate(next as unknown as ComputerDealQuery)
}

const faq = computed<FaqItem[]>(() =>
  computerDealFaq(payload.value.summary, payload.value.generatedAt)
)

// ── SEO ────────────────────────────────────────────────────────────────────
const CANONICAL = `https://cambio-uruguay.com${COMPUTER_OPPORTUNITIES_PATH}`
const TITLE = 'Oportunidades en computadoras usadas'
const DESCRIPTION =
  'Notebooks, PCs y piezas usadas que piden entre 15 % y 55 % menos que sus iguales o sus piezas, con la referencia a la vista. No es una tasación.'

defineOgImageComponent('Cambio', {
  title: TITLE,
  subtitle: 'Las que piden menos que lo que valen',
  tag: 'COMPUTADORAS · OPORTUNIDADES',
})

useSeoMeta({
  title: `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: TITLE,
  ogDescription: DESCRIPTION,
  ogUrl: CANONICAL,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  // Cada combinación de filtros es una copia fina de esta lista: sólo la URL base se indexa.
  robots: () =>
    computerDealFiltered(query.value) || query.value.pagina > 1
      ? 'noindex, follow'
      : 'index, follow',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: TITLE,
            description: DESCRIPTION,
            url: CANONICAL,
            dateModified: payload.value.generatedAt || undefined,
          },
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
                name: 'Computadoras usadas',
                item: `https://cambio-uruguay.com${COMPUTADORAS_PATH}`,
              },
              { '@type': 'ListItem', position: 3, name: 'Oportunidades', item: CANONICAL },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Rol Display de DESIGN.md (el idiom .hero-title). */
.pc-title {
  margin: 0 0 8px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
/* El reset de Vuetify 4 no cero-ea el margen de bloque del texto (app/AGENTS.md). */
.lead {
  max-width: 72ch;
  margin: 0 0 12px;
}
.pc-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .pc-grid {
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 16px;
  }
}
.results-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.results-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}
.sort-select {
  max-width: 240px;
}
.pc-anchor {
  /* La barra del sitio es fixed (65 px): sin este margen el encabezado queda tapado al paginar. */
  scroll-margin-top: 84px;
}
.empty,
.section-note {
  margin: 12px 0 0;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-section {
  margin-top: 40px;
}
.pc-section h2 {
  margin: 0 0 12px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.2;
  font-weight: 700;
}
.pc-kinds {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  max-width: 420px;
}
.pc-kinds li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-variant-numeric: tabular-nums;
}
.guide-list {
  margin: 0;
  padding-left: 20px;
  max-width: 76ch;
}
.guide-list li {
  margin-top: 8px;
}
.card-title {
  margin: 0;
  font-weight: 700;
}
.card-text {
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
