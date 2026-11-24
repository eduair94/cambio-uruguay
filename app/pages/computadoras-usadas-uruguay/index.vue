<!--
THESIS: Quien mira una PC usada en Uruguay no tiene contra qué compararla: el aviso dice «PC gamer
i5 + GTX 1060 $ 23.900» y nadie sabe si eso es mucho. La respuesta está en el mismo mercado: cuánto
salen hoy esas piezas nuevas, cuánto salen usadas sueltas y cuánto piden por máquinas iguales. Esta
página junta las tres cosas por aviso, con los avisos de Facebook Marketplace y Mercado Libre.
OWN-WORLD: La forma de /autos-usados-uruguay y /motos-usadas-uruguay (migas, H1, cuántos avisos y
cuándo se leyeron, columna de filtros, grilla de tarjetas), más el desglose de piezas como dato
propio de la tarjeta.
FAMILY: Sólo español, como autos y motos: el canonical es literal, sin prefijo de idioma.
-->
<template>
  <VContainer class="pc-hub py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Computadoras usadas' },
      ]"
      class="px-0 pb-2"
    />

    <header class="mb-6">
      <h1 class="pc-title">Computadoras usadas en Uruguay, y cuánto valen sus piezas</h1>
      <p class="lead">
        Notebooks, PCs de escritorio, all-in-one y piezas sueltas publicadas en Facebook Marketplace
        y Mercado Libre, con lo que dice cada aviso (procesador, placa de video, RAM, disco) y, en
        las PCs de escritorio, cuánto saldría armarlas hoy con piezas nuevas y cuánto juntar las
        mismas piezas usadas. Son precios <strong>pedidos en avisos</strong>, no precios de venta
        cerrados.
        <template v-if="payload.status === 'ok' && payload.total > 0">
          Hoy hay {{ payload.total.toLocaleString('es-UY') }}
          {{ payload.total === 1 ? 'aviso' : 'avisos' }} con estos filtros{{
            readAt ? `, última lectura el ${readAt}` : ''
          }}.
        </template>
      </p>
    </header>

    <!-- Las dos páginas que salen de este catálogo, a la vista: la barra de la familia también las
         nombra, pero en el celular es un desplegable cerrado y estas son las dos preguntas que más
         trae la gente («¿hay alguna barata?», «¿cuánto sale una notebook?»). -->
    <div class="d-flex flex-wrap ga-2 mb-6" data-testid="pc-ctas">
      <VBtn
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-tag-arrow-down-outline"
        :to="localePath(COMPUTER_OPPORTUNITIES_PATH)"
      >
        Oportunidades
      </VBtn>
      <VBtn
        variant="outlined"
        size="small"
        prepend-icon="mdi-chart-box-outline"
        :to="localePath(COMPUTER_NOTEBOOKS_PATH)"
      >
        Precios de notebooks
      </VBtn>
      <VBtn
        v-if="!query.tipo"
        variant="outlined"
        size="small"
        prepend-icon="mdi-expansion-card"
        @click="applyShortcut({ tipo: 'piezas' })"
      >
        Ver piezas sueltas usadas
      </VBtn>
    </div>

    <!-- El relevamiento arranca: la página existe antes que el primer dato y lo dice, en vez de
         parecer un mercado vacío. -->
    <VAlert
      v-if="payload.status === 'preparing'"
      type="info"
      variant="tonal"
      density="comfortable"
      icon="mdi-progress-clock"
      class="mb-6"
    >
      <strong>El relevamiento está arrancando.</strong> Todavía no publicamos ningún aviso de
      computadoras usadas: el catálogo se arma con el primer barrido diario. Mientras tanto ya está
      publicado el directorio de
      <NuxtLink :to="localePath('/celulares-uruguay')">celulares</NuxtLink>.
    </VAlert>
    <VAlert
      v-else-if="payload.status === 'unavailable'"
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-database-off-outline"
      class="mb-6"
    >
      No pudimos leer el catálogo en este momento. No es que no haya computadoras: es que no las
      pudimos leer. Probá de nuevo en unos minutos.
    </VAlert>

    <!--
      En el celular los filtros son un cajón que se teletransporta al body, así que vive FUERA de la
      grilla (la misma trampa que autos: adentro de la celda, Vue moría en `shouldUpdateComponent`).
      Nunca hay dos: o está el cajón, o está la columna.
    -->
    <ComputadorasFilters
      v-if="payload.status === 'ok' && smAndDown"
      v-model:open="filtersOpen"
      :query="query"
      :facets="payload.facets"
      :total="payload.total"
      mobile
      @apply="update"
    />

    <CarsSidebarLayout v-if="payload.status === 'ok'">
      <template #filters>
        <ComputadorasFilters
          v-if="!smAndDown"
          :query="query"
          :facets="payload.facets"
          :total="payload.total"
          @apply="update"
        />
      </template>
      <template #default>
        <CarsToolbar
          v-if="smAndDown"
          :sort="query.orden"
          :items="sortItems"
          :active-count="chips.length"
          :open="filtersOpen"
          @open="filtersOpen = true"
          @update:sort="value => update({ ...query, orden: value as ComputerSort, pagina: 1 })"
        />
        <CarsActiveFilters
          :chips="chips"
          @remove="keys => update(computerQueryWithout(query, keys))"
          @clear="update(computerNormalizeQuery({ orden: query.orden }))"
        />
        <div class="results-head">
          <h2 id="pc-resultados" class="results-title pc-anchor">
            {{ payload.total.toLocaleString('es-UY') }}
            {{ payload.total === 1 ? 'aviso' : 'avisos' }}
            <span class="results-kind">· {{ computerTipoLabel(query.tipo) }}</span>
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
            @update:model-value="value => update({ ...query, orden: value, pagina: 1 })"
          />
        </div>
        <p class="price-note">
          El filtro de precio va en dólares: es la única escala en la que un aviso en pesos y uno en
          dólares se pueden comparar. Cada aviso se muestra en su propia moneda.
          <template v-if="query.orden === 'relacion'">
            Ordenado por lo que pide contra lo que vale: sólo entran los avisos que se pudieron
            comparar (contra sus piezas o contra máquinas iguales, sin fallas declaradas y con la
            moneda escrita).
          </template>
          <template v-else-if="query.orden === 'ahorro'">
            Ordenado por ahorro: sólo entran las oportunidades, los avisos que piden bastante menos
            que su referencia (ver
            <NuxtLink :to="localePath(COMPUTER_OPPORTUNITIES_PATH)">cómo se eligen</NuxtLink>).
          </template>
          <template v-else-if="query.orden === 'cpu_nuevo'">
            Ordenado por el año del procesador: sólo entran los avisos que dicen el modelo exacto,
            que es lo que deja saber de qué año es la serie.
          </template>
        </p>

        <p v-if="!payload.items.length" class="empty">
          No hay avisos con esos filtros. Probá ampliar el precio, la RAM o el tipo.
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

    <!-- ── Cómo leer estos datos ──────────────────────────────────────────── -->
    <section class="hub-section">
      <h2>Cómo leer estos datos</h2>
      <ul class="guide-list">
        <li>
          Son precios <strong>pedidos</strong> en avisos vigentes, no precios de venta cerrados.
          Nadie publica cuánto se pagó por una computadora usada en Uruguay: lo que se puede medir
          es la oferta.
        </li>
        <li>
          <strong>Las especificaciones son lo que dice el aviso</strong>, leídas del título y, en
          Facebook, de la descripción. No las verificamos: un «i7» puede ser de 2012 o de 2024, y
          por eso un procesador sin modelo exacto queda sin precio en vez de valuarse como el más
          caro o el más barato de su familia.
        </li>
        <li>
          <strong>Cuánto saldría armarla</strong> suma, pieza por pieza, la mediana de hoy de cada
          pieza nueva en Mercado Libre Uruguay y en tiendas de informática uruguayas;
          <strong>sus piezas usadas</strong> suma la mediana de las mismas piezas vendidas sueltas
          en Facebook y Mercado Libre. La mother, la fuente y el gabinete casi nunca se declaran: se
          suponen (la más barata del socket, una fuente que alcance para la placa, un gabinete
          básico) y la ficha lo dice.
        </li>
        <li>
          <strong>Un total sólo se publica si todas las piezas tienen precio.</strong> Sumar las que
          lo tienen daría un número más bajo que el real y haría parecer cara cualquier PC: en esos
          avisos decimos cuántas piezas tienen precio y cuáles faltan.
        </li>
        <li>
          <strong>Cada aviso se muestra en la moneda en la que se publicó.</strong> Facebook marca
          los precios en pesos por defecto; cuando un monto sólo cierra en dólares («PC gamer RTX
          4060 $ 950») lo leemos en dólares, lo decimos en la tarjeta y ese aviso no entra en
          ninguna comparación.
        </li>
        <li>
          «Pide menos de lo que vale» compara una PC contra lo que salen hoy sus mismas piezas, y
          una notebook, una all-in-one o una mini PC (que no se arman) contra lo que piden por
          máquinas iguales en el directorio. No dice que convenga: no sabemos si la máquina anda,
          cuánto uso tiene ni si trae garantía. Lo que el aviso declara que falla («no enciende»,
          «para repuesto») se muestra y deja al aviso fuera del veredicto.
        </li>
        <li>
          Tampoco publicamos el nombre ni el teléfono del vendedor, ni la descripción del aviso: el
          enlace va al aviso original.
        </li>
        <li v-if="sourceLine">
          Fuentes leídas en la última corrida: {{ sourceLine }}. Ninguna declara haber leído todo el
          mercado, así que el conteo es de avisos vistos y no de computadoras en venta en Uruguay.
        </li>
      </ul>
    </section>

    <!-- ── Seguí con el detalle ───────────────────────────────────────────── -->
    <section class="hub-section">
      <h2>Seguí con el detalle</h2>
      <VRow dense>
        <VCol cols="12" md="6">
          <VCard variant="outlined" :to="localePath(COMPUTER_COMPONENTS_PATH)" class="pa-4 h-100">
            <p class="card-title">Precios de componentes de PC en Uruguay</p>
            <p class="card-text">
              Procesadores, placas de video, RAM, discos y fuentes: lo que sale cada uno nuevo y
              usado hoy, y cuánto sale armar una PC de oficina o una gamer.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="outlined" :to="localePath('/celulares-uruguay')" class="pa-4 h-100">
            <p class="card-title">Precio de celulares en Uruguay</p>
            <p class="card-text">
              Cuánto sale cada modelo acá y cuánto costaría el mismo equipo traído de Estados
              Unidos.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- :ad="false": el directorio ya lleva su unidad en la grilla (tests/unit/feedAd.test.ts). -->
    <FaqSection
      :items="faq"
      heading="Preguntas frecuentes"
      :expanded="true"
      :ad="false"
      class="mb-8"
    />

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
      Esto es una comparación de precios pedidos en avisos públicos, con su fecha. No es una
      tasación, no es una recomendación de compra y no dice si una computadora anda.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { VPagination } from 'vuetify/components'
import { useDisplay } from 'vuetify'
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import { trackFilterChanges } from '~/utils/directoryFilterTracking'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  COMPUTADORAS_PATH,
  COMPUTER_COMPONENTS_PATH,
  COMPUTER_NOTEBOOKS_PATH,
  COMPUTER_OPPORTUNITIES_PATH,
  COMPUTER_SORT_ITEMS,
  computerEmptyList,
  computerFilterChips,
  computerFiltered,
  computerLongDate,
  computerNormalizeQuery,
  computerPrecioTipicoAnswer,
  computerQueryParams,
  computerQueryWithout,
  computerTipoLabel,
  type ComputerListResponse,
  type ComputerQuery,
  type ComputerSort,
} from '~/utils/computadoras'

// Directorio: filtros + grilla con el ancho del marco, como autos (`.container_custom--wide`).
definePageMeta({ wide: true })
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { smAndDown } = useDisplay()
const filtersOpen = ref(false)
// El cajón es sólo del celular: si la ventana crece con él abierto, la columna ya está a la vista.
watch(smAndDown, mobile => {
  if (!mobile) filtersOpen.value = false
})

const query = computed<ComputerQuery>(() =>
  computerNormalizeQuery(route.query as Record<string, unknown>)
)

// Server-rendered: los precios tienen que estar en el HTML que lee el buscador, no llegar después
// por un fetch client-only.
const { data } = await useAsyncData(
  'computadoras-directorio',
  () =>
    $fetch<ComputerListResponse>('/api/computadoras', { query: computerQueryParams(query.value) }),
  { watch: [query] }
)

/**
 * La respuesta, con la forma vacía como piso. Sin esto un fallo de red deja `data.value` en `null`
 * y la plantilla revienta antes de hidratar — y esta página TIENE que renderizar aunque el job
 * nunca haya corrido.
 */
const payload = computed<ComputerListResponse>(
  () => data.value ?? computerEmptyList(query.value, 'unavailable')
)

const pageCount = computed(() =>
  Math.min(200, Math.ceil(payload.value.total / Math.max(1, payload.value.perPage)))
)
// "Cargar más al bajar" (composables/useInfiniteFeed.ts): las filas recorren `feed.items`.
const resultsList = ref<HTMLElement | null>(null)
const feed = useInfiniteFeed<ComputerListResponse['items'][number]>({
  id: 'computadoras',
  itemKey: item => item.slug,
  list: resultsList,
  items: () => payload.value.items,
  page: () => query.value.pagina,
  pageCount: () => pageCount.value,
  perPage: () => payload.value.perPage,
  resetKey: () => JSON.stringify(computerQueryParams({ ...query.value, pagina: 1 })),
  fetchPage: (page, signal) =>
    $fetch<ComputerListResponse>('/api/computadoras', {
      query: computerQueryParams({ ...query.value, pagina: page }),
      signal,
    }).then(response => response.items),
  enabled: () => payload.value.items.length > 0,
  goToPage: changePage,
  anchorId: 'pc-resultados',
})

const readAt = computed(() => computerLongDate(payload.value.coverage?.generatedAt || null))
const sortItems = [...COMPUTER_SORT_ITEMS]
const chips = computed(() => computerFilterChips(query.value, payload.value.facets))

const sourceLine = computed(() => {
  const counts = payload.value.coverage?.counts
  if (!counts) return ''
  return [
    counts.facebook ? `Facebook Marketplace (${counts.facebook.toLocaleString('es-UY')})` : null,
    counts.mercadolibre ? `Mercado Libre (${counts.mercadolibre.toLocaleString('es-UY')})` : null,
  ]
    .filter(Boolean)
    .join(' · ')
})

const track = useTrack()
/** La página no es un filtro: sin esto, paginar contaría como «cambió un filtro». */
const trackedParams = (next: ComputerQuery) => {
  const { pagina: _pagina, ...rest } = computerQueryParams(next)
  return rest
}
function update(next: ComputerQuery) {
  filtersOpen.value = false
  // Todo cambio de filtro pasa por acá: qué filtro, por nombre y sin valor
  // (utils/directoryFilterTracking.ts). La carga de la página no pasa, así que no cuenta.
  trackFilterChanges(track, 'computadoras', trackedParams(query.value), trackedParams(next))
  router.replace({ query: computerQueryParams(next) })
}

function changePage(page: number) {
  update({ ...query.value, pagina: page })
  scrollToPageTop('pc-resultados')
}

/** Un atajo reemplaza los filtros, conserva el orden y sube a la lista. */
function applyShortcut(params: Record<string, string>) {
  update(computerNormalizeQuery({ ...params, orden: query.value.orden }))
  scrollToPageTop('pc-resultados')
}

// Las respuestas se calculan de los MISMOS datos que la página imprime, así el texto visible y el
// schema.org no pueden divergir (misma técnica que /motos-usadas-uruguay).
const faq = computed<FaqItem[]>(() => [
  {
    id: 'pc-precio-tipico',
    question: '¿Cuánto sale una computadora usada en Uruguay?',
    answer: computerPrecioTipicoAnswer(payload.value.items, payload.value.coverage),
  },
  {
    id: 'pc-armarla',
    question: '¿Cómo sé si una PC usada está cara?',
    answer:
      'Comparando lo que piden contra lo que salen hoy sus mismas piezas. En cada PC de escritorio sumamos la mediana del precio nuevo de cada pieza en Mercado Libre Uruguay y en tiendas uruguayas (armarla nueva) y la mediana de las mismas piezas vendidas sueltas y usadas (juntarlas usadas). Si todas las piezas tienen precio, decimos cuánto pide el aviso contra esa suma; si a alguna le falta, no publicamos un total, porque daría un número más bajo que el real.',
  },
  {
    id: 'pc-precio-pedido',
    question: '¿Estos precios son de venta o de aviso?',
    answer:
      'Son precios pedidos en avisos vigentes, no precios de venta cerrados. Nadie publica cuánto se pagó por una computadora usada en Uruguay, así que lo que se puede medir es la oferta.',
  },
  {
    id: 'pc-especificaciones',
    question: '¿Las especificaciones están verificadas?',
    answer:
      'No. Son lo que dice el aviso, leído del título y de la descripción. Un procesador sin modelo exacto («i7») no se valúa como ningún i7 concreto: queda sin precio, porque un i7 de 2012 y uno de 2024 valen cosas muy distintas. Antes de pagar, pedí ver la máquina encendida y el modelo exacto de cada pieza.',
  },
  {
    id: 'pc-moneda',
    question: '¿Por qué algunos precios están en pesos y otros en dólares?',
    answer:
      'Porque así los publica cada vendedor, y la cifra que leés es la del aviso. Facebook marca todo en pesos por defecto: cuando un monto sólo cierra en dólares lo leemos en dólares y lo decimos, y esos avisos no entran en ninguna comparación. El filtro y el orden por precio usan el valor en dólares que calculamos con la cotización de la corrida.',
  },
])

// ── SEO ────────────────────────────────────────────────────────────────────
// Absoluto y literal, nunca con localePath: esta familia es sólo en español.
const CANONICAL = `https://cambio-uruguay.com${COMPUTADORAS_PATH}`
const TITLE = 'Computadoras usadas en Uruguay'
const DESCRIPTION =
  'Notebooks, PCs y piezas usadas de Facebook y Mercado Libre, con lo que saldría armar cada PC con piezas nuevas y cuánto valen sus piezas usadas hoy.'

defineOgImageComponent('Cambio', {
  title: TITLE,
  subtitle: 'Y cuánto saldría armarlas con piezas nuevas',
  tag: 'COMPUTADORAS · PRECIOS',
})

useSeoMeta({
  title: `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: TITLE,
  ogDescription: DESCRIPTION,
  ogType: 'website',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
  // Cada combinación de filtros es una copia fina de esta página: sólo la URL base se indexa.
  robots: () => (computerFiltered(query.value) ? 'noindex, follow' : 'index, follow'),
})

// El FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
  meta: [
    {
      name: 'keywords',
      content:
        'computadoras usadas uruguay, notebook usada uruguay, pc gamer usada montevideo, placa de video usada uruguay, cuanto sale armar una pc uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'CollectionPage', name: TITLE, description: DESCRIPTION, url: CANONICAL },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              directoriosHubListItem(2),
              { '@type': 'ListItem', position: 3, name: 'Computadoras usadas', item: CANONICAL },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.pc-grid {
  display: grid;
  /* En el celular la ficha es una fila a todo el ancho; desde 600 px, tarjetas con foto. */
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .pc-grid {
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 16px;
  }
}
.price-note {
  margin: 0 0 12px;
  font-size: 0.8rem;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* Rol Display de DESIGN.md (el idiom .hero-title): a tamaño fijo un título de 50+ caracteres ocupa
   cinco líneas a 390 px de ancho. */
.pc-title {
  margin: 0 0 8px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
/* El reset de Vuetify 4 no cero-ea el margen de bloque del texto: todo párrafo cuyo espaciado
   importa declara el suyo (app/AGENTS.md). */
.lead {
  max-width: 68ch;
  margin: 0 0 8px;
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
.results-kind {
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.sort-select {
  max-width: 260px;
}
.hub-section {
  margin-top: 40px;
}
.hub-section h2 {
  margin: 0 0 12px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.2;
  font-weight: 700;
}
.guide-list {
  margin: 0;
  padding-left: 20px;
  max-width: 76ch;
}
.guide-list li {
  margin-top: 8px;
}
.empty {
  margin: 12px 0 0;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-anchor {
  /* La barra del sitio es fixed (65 px): sin este margen el encabezado de la lista queda tapado
     justo después de paginar. */
  scroll-margin-top: 84px;
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
