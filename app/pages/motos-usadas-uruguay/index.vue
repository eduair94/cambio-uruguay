<!--
THESIS: En Uruguay la moto es el vehículo de trabajo y la alternativa de costo medio entre el boleto
y el auto. El sitio publicaba precios de autos usados, de monopatines y de bicicletas eléctricas, y
justo en el medio tenía un agujero. Esta página contesta "cuánto sale una moto usada" con los avisos
vigentes de Mercado Libre y la CILINDRADA como dimensión propia, que es la que decide qué se compara
con qué.
OWN-WORLD: Mismas superficies y tipografía que /autos-usados-uruguay y /celulares-uruguay, de las
que este directorio copia la forma (migas, H1, cuántos avisos y cuándo se leyeron, filtros, tabla).
FAMILY: Sólo español (como autos usados y celulares): el canonical es literal, sin prefijo de
idioma, aunque la ruta exista bajo /en/ y /pt/ por `prefix_except_default`.
-->
<template>
  <VContainer class="motos-hub py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Motos usadas' },
      ]"
      class="px-0 pb-2"
    />

    <header class="mb-6">
      <h1 class="motos-title">Motos usadas en venta en Uruguay: precios por modelo y cilindrada</h1>
      <p class="lead">
        Los avisos vigentes de motos usadas de Mercado Libre y Facebook Marketplace, con foto,
        precio, año, kilómetros, cilindrada y departamento, la ficha de cada aviso con su historia
        de precio y la comparación contra la misma moto, y la ficha de cada modelo con su rango de
        precios y cuánto pierde por año. Son precios <strong>pedidos en avisos</strong>, no precios
        de venta cerrados.
        <template v-if="payload.status === 'ok' && payload.total > 0">
          Hoy hay {{ payload.total.toLocaleString('es-UY') }}
          {{ payload.total === 1 ? 'aviso' : 'avisos' }} con estos filtros{{
            readAt ? `, última lectura el ${readAt}` : ''
          }}.
        </template>
      </p>
    </header>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <MotosCompareLink />
    </div>
    <AssistantCta topic="motos" :filters="chips.map(chip => chip.label)" class="mb-6" />

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
      <strong>El relevamiento está arrancando.</strong> Todavía no publicamos ningún aviso de motos
      usadas: el catálogo se arma con el primer barrido diario. Mientras tanto ya están publicados
      el directorio de <NuxtLink :to="localePath(MOTOS_AUTOS_PATH)">autos usados</NuxtLink> y el
      <NuxtLink :to="localePath(MOTOS_COMPARADOR_PATH)">comparador de transporte</NuxtLink>.
    </VAlert>
    <VAlert
      v-else-if="payload.status === 'unavailable'"
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-database-off-outline"
      class="mb-6"
    >
      No pudimos leer el catálogo en este momento. No es que no haya motos: es que no las pudimos
      leer. Probá de nuevo en unos minutos.
    </VAlert>

    <!--
      En el celular los filtros son un cajón que se teletransporta al body, así que vive FUERA de la
      grilla (la misma trampa que autos: adentro de la celda, Vue moría en `shouldUpdateComponent`).
      Nunca hay dos: o está el cajón, o está la columna.
    -->
    <MotosFilters
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
        <MotosFilters
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
          :sort="query.sort"
          :items="sortItems"
          :active-count="chips.length"
          :open="filtersOpen"
          @open="filtersOpen = true"
          @update:sort="value => update({ ...query, sort: value as MotoSort, page: 1 })"
        />
        <CarsActiveFilters
          :chips="chips"
          @remove="keys => update(motoQueryWithout(query, keys))"
          @clear="update(motoNormalizeQuery({ sort: query.sort }))"
        />
        <div class="results-head">
          <h2 id="motos-resultados" class="results-title motos-anchor">
            {{ payload.total.toLocaleString('es-UY') }}
            {{ payload.total === 1 ? 'aviso' : 'avisos' }}
          </h2>
          <div class="results-actions">
            <RentalAlertButton
              kind="moto-search"
              :filters="motoQueryParams(query)"
              :compact="smAndDown"
              notify
            />
            <VSelect
              v-if="!smAndDown"
              :model-value="query.sort"
              :items="sortItems"
              label="Ordenar"
              density="compact"
              variant="outlined"
              hide-details
              class="sort-select"
              @update:model-value="value => update({ ...query, sort: value, page: 1 })"
            />
          </div>
        </div>
        <p class="price-note">
          El filtro de precio va en dólares: es la única escala en la que un aviso en pesos y uno en
          dólares se pueden comparar. Cada aviso se muestra en su propia moneda.
        </p>

        <p v-if="!payload.items.length" class="empty">
          No hay avisos con esos filtros. Probá ampliar el año, el precio o la cilindrada.
        </p>

        <div v-else ref="resultsList" class="motos-grid">
          <FeedEdge :feed="feed" edge="top" />
          <template v-for="(item, index) in feed.items" :key="item.key">
            <FeedAd :index="index" :feed="feed" />
            <MotosListingCard :moto="item" />
          </template>
          <FeedEdge :feed="feed" edge="bottom" />
        </div>

        <FeedControls :feed="feed">
          <template #pagination>
            <VPagination
              v-if="payload.total > payload.perPage"
              :model-value="query.page"
              :length="pageCount"
              :total-visible="3"
              class="mt-6"
              @update:model-value="changePage"
            />
          </template>
        </FeedControls>
      </template>
    </CarsSidebarLayout>

    <!-- ── El mercado en números (del informe que publica el mismo job) ───── -->
    <section
      v-if="payload.status === 'ok' && market"
      class="hub-section"
      aria-labelledby="motos-mercado"
    >
      <h2 id="motos-mercado">El mercado en números</h2>
      <p class="section-note">
        Sobre {{ market.adverts.toLocaleString('es-UY') }} avisos vigentes sin riesgo declarado. Son
        medianas de lo que se pide, en dólares. Tocá una fila para ver esos avisos.
      </p>
      <div class="market-grid">
        <div v-if="market.displacements.length" class="market-block">
          <h3>Por cilindrada</h3>
          <ul class="market-list">
            <li v-for="row in market.displacements" :key="row.band">
              <button
                v-if="row.band !== 'sin-dato'"
                type="button"
                class="market-row"
                @click="applyShortcut({ cilindrada: row.band })"
              >
                <span>{{ row.label }}</span>
                <span class="market-value">
                  {{ row.medianUsd ? motoUsd(row.medianUsd) : '—' }}
                  <small>{{ row.adverts.toLocaleString('es-UY') }} avisos</small>
                </span>
              </button>
            </li>
          </ul>
        </div>
        <div v-if="market.types.length" class="market-block">
          <h3>Por tipo</h3>
          <ul class="market-list">
            <li v-for="row in market.types" :key="row.type">
              <button type="button" class="market-row" @click="applyShortcut({ tipo: row.type })">
                <span>{{ motoTypeLabel(row.type) }}</span>
                <span class="market-value">
                  <small>{{ row.adverts.toLocaleString('es-UY') }} avisos</small>
                </span>
              </button>
            </li>
          </ul>
        </div>
        <div v-if="market.budgets.length" class="market-block">
          <h3>Qué se compra con cada presupuesto</h3>
          <ul class="market-list">
            <li v-for="row in market.budgets" :key="row.maxUsd">
              <button
                type="button"
                class="market-row"
                @click="applyShortcut({ precioMaxUsd: String(row.maxUsd) })"
              >
                <span>Hasta {{ motoUsd(row.maxUsd) }}</span>
                <span class="market-value">
                  <small>{{ row.adverts.toLocaleString('es-UY') }} avisos</small>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── Fichas por modelo ──────────────────────────────────────────────── -->
    <section v-if="topModels.length" class="hub-section">
      <h2>Precios por modelo</h2>
      <p class="section-note">
        El rango de precios de cada modelo, el desglose por año y cuánto pierde por año de
        antigüedad.
      </p>
      <div class="model-row">
        <VBtn
          v-for="model in topModels"
          :key="model.slug"
          size="small"
          variant="outlined"
          class="mr-2 mb-2"
          :to="localePath(`${MOTOS_PATH}/${model.slug}`)"
        >
          {{ model.brand }} {{ model.model }} ({{ model.listings }})
        </VBtn>
      </div>
    </section>

    <!-- ── Cómo leer estos datos ──────────────────────────────────────────── -->
    <section class="hub-section">
      <h2>Cómo leer estos datos</h2>
      <ul class="guide-list">
        <li>
          Son precios <strong>pedidos</strong> en avisos vigentes, no precios de venta cerrados. En
          Uruguay las transferencias de usados no se publican por modelo, así que lo que se puede
          medir es la oferta.
        </li>
        <li>
          <strong>La cilindrada sale de la ficha del aviso</strong> en Mercado Libre o, si no está,
          del título con la unidad escrita ("125 cc"). Cuando el aviso no la dice, la estimamos con
          lo que declaran los demás avisos del mismo modelo y, si no alcanzan, con el número del
          nombre del modelo ("GTR 125"): esas van con <strong>≈</strong> y dicen de dónde salen. Un
          valor que contradice el tramo que el vendedor eligió en Mercado Libre se descarta: las
          fichas se cargan a mano y a veces dicen «2.000 cc» por 200.
          <template v-if="payload.coverage?.displacementEstimated">
            Hoy hay
            {{ payload.coverage.displacementEstimated.toLocaleString('es-UY') }} avisos con la
            cilindrada estimada<template v-if="payload.coverage.withoutDisplacement">
              y {{ payload.coverage.withoutDisplacement.toLocaleString('es-UY') }} sin ningún dato
              para estimarla</template
            >.
          </template>
        </li>
        <li>
          <strong>Las eléctricas tienen ficha aparte y nunca se promedian con las de nafta.</strong>
          Son dos mercados con dos costos de uso, y una banda que los mezclara no describiría a
          ninguno de los dos.
        </li>
        <li>
          <strong>Cada aviso se muestra en la moneda en la que se publicó.</strong> El filtro y el
          orden por precio usan el valor en dólares que convertimos con la cotización de la corrida,
          porque es lo único comparable entre los dos; la cifra que leés es la del aviso.
        </li>
        <li>
          <strong>Facebook Marketplace</strong> no trae marca, modelo, año ni moneda como datos: los
          leemos del texto del aviso y sólo publicamos los que identificamos contra los modelos de
          Mercado Libre y dicen su año. Cuando el aviso no escribe la moneda, la deducimos
          comparando con la misma moto en Mercado Libre y lo marcamos como «moneda estimada»: esos
          avisos nunca entran en los rangos de precio de los modelos.
        </li>
        <li>
          Los kilómetros son los que declara quien vende. Los valores de relleno (1, 111.111…) se
          muestran como "km no informado".
        </li>
        <li>
          Esta versión <strong>no publica oportunidades ni gangas</strong>. La regla de autos
          —cohorte fija de modelo, año, versión, motor y caja— no tiene equivalente medido en motos,
          y declarar una ganga sin esa cohorte es el error que el directorio de autos ya cometió y
          corrigió: de 125 supuestas gangas quedaron 11 al agregar la versión.
        </li>
        <li>
          Lo que el vendedor declara en el título o la descripción (deuda, papeles, choque,
          recupero, «no anda») se muestra con su cita en la ficha del aviso, y esas motos no entran
          en los rangos de precio del modelo. «Sin deuda ni choque declarados» quiere decir que el
          aviso no lo menciona, no que la moto esté libre.
        </li>
        <li>
          Tampoco publica teléfonos ni nada que esté detrás de un login o un captcha. El enlace va
          al aviso original.
        </li>
        <li v-if="sourceLine">
          Fuentes leídas: {{ sourceLine }}. Ninguna declara haber leído todo el mercado, así que el
          conteo es de avisos vistos y no de motos en venta en Uruguay.
        </li>
      </ul>
    </section>

    <!-- ── Seguí con el detalle ───────────────────────────────────────────── -->
    <section class="hub-section">
      <h2>Seguí con el detalle</h2>
      <VRow dense>
        <VCol cols="12" md="6">
          <VCard variant="outlined" :to="localePath(MOTOS_COMPARADOR_PATH)" class="pa-4 h-100">
            <p class="card-title">¿Conviene auto, moto u ómnibus?</p>
            <p class="card-text">
              El comparador de transporte usa este catálogo como el modo "moto": precio de entrada
              por cilindrada y depreciación medida, contra el boleto y contra el auto.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="outlined" :to="localePath(MOTOS_AUTOS_PATH)" class="pa-4 h-100">
            <p class="card-title">Autos usados en venta en Uruguay</p>
            <p class="card-text">
              El mismo relevamiento para autos, con versión, kilómetros y la comparación contra
              autos iguales.
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
      tasación, no es una recomendación de compra y no dice si una moto está en buen estado.
    </VAlert>
    <RentalAlertDialogHost />
  </VContainer>
</template>

<script setup lang="ts">
import { VPagination } from 'vuetify/components'
import { useDisplay } from 'vuetify'
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import RentalAlertButton from '~/components/rentals/RentalAlertButton.vue'
import RentalAlertDialogHost from '~/components/rentals/RentalAlertDialogHost.vue'
import { trackFilterChanges } from '~/utils/directoryFilterTracking'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  MOTOS_AUTOS_PATH,
  MOTOS_COMPARADOR_PATH,
  MOTOS_PATH,
  MOTO_SORT_ITEMS,
  motoCilindradaAnswer,
  motoEmptyList,
  motoFilterChips,
  motoFiltered,
  motoLongDate,
  motoNormalizeQuery,
  motoPrecioTipicoAnswer,
  motoQueryParams,
  motoQueryWithout,
  motoTypeLabel,
  motoUsd,
  type MotoListResponse,
  type MotoMarketSummary,
  type MotoQuery,
  type MotoSort,
} from '~/utils/motos'

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

const query = computed<MotoQuery>(() => motoNormalizeQuery(route.query as Record<string, unknown>))

// Server-rendered: los precios tienen que estar en el HTML que lee el buscador, no llegar después
// por un fetch client-only.
// El mercado en números sale del informe que publica el mismo job, en paralelo y con un tope corto:
// si tarda o falla, el bloque no se dibuja y la lista sí (la misma regla que autos).
const [{ data }, { data: marketData }] = await Promise.all([
  useAsyncData(
    'motos-directorio',
    () => $fetch<MotoListResponse>('/api/motos', { query: motoQueryParams(query.value) }),
    { watch: [query] }
  ),
  useAsyncData('motos-directorio-mercado', () =>
    $fetch<MotoMarketSummary | null>('/api/motos/informe', { timeout: 2500, retry: 0 }).catch(
      () => null
    )
  ),
])
const market = computed(() => marketData.value ?? null)

/**
 * La respuesta, con la forma vacía como piso. Sin esto un fallo de red deja `data.value` en `null`
 * y la plantilla revienta antes de hidratar — y esta página TIENE que renderizar aunque el job
 * nunca haya corrido.
 */
const payload = computed<MotoListResponse>(
  () => data.value ?? motoEmptyList(query.value, 'unavailable')
)

const pageCount = computed(() =>
  Math.min(200, Math.ceil(payload.value.total / Math.max(1, payload.value.perPage)))
)
// "Cargar más al bajar" (composables/useInfiniteFeed.ts): las filas recorren `feed.items`.
const resultsList = ref<HTMLElement | null>(null)
const feed = useInfiniteFeed<MotoListResponse['items'][number]>({
  id: 'motos',
  itemKey: item => item.key,
  list: resultsList,
  items: () => payload.value.items,
  page: () => query.value.page,
  pageCount: () => pageCount.value,
  perPage: () => payload.value.perPage,
  resetKey: () => JSON.stringify(motoQueryParams({ ...query.value, page: 1 })),
  fetchPage: (page, signal) =>
    $fetch<MotoListResponse>('/api/motos', {
      query: motoQueryParams({ ...query.value, page }),
      signal,
    }).then(response => response.items),
  enabled: () => payload.value.items.length > 0,
  goToPage: changePage,
  anchorId: 'motos-resultados',
})

const readAt = computed(() => motoLongDate(payload.value.coverage?.lastReadAt || null))

const sortItems = [...MOTO_SORT_ITEMS]

const chips = computed(() => motoFilterChips(query.value, payload.value.facets))

/** Los modelos con más avisos de la corrida. Se enlazan por `slug`, que es el de la ficha. */
const topModels = computed(() => (payload.value.coverage?.models ?? []).slice(0, 36))

const sourceLine = computed(() =>
  (payload.value.coverage?.sources ?? [])
    .filter(source => source.listings > 0)
    .map(source => `${source.name} (${source.listings.toLocaleString('es-UY')})`)
    .join(' · ')
)

const track = useTrack()
function update(next: MotoQuery) {
  filtersOpen.value = false
  const params = motoQueryParams(next)
  // Todo cambio de filtro pasa por acá: qué filtro, por nombre y sin valor
  // (utils/directoryFilterTracking.ts). La carga de la página no pasa, así que no cuenta.
  trackFilterChanges(track, 'motos', motoQueryParams(query.value), params)
  router.replace({ query: params })
}

function changePage(page: number) {
  update({ ...query.value, page })
  scrollToPageTop('motos-resultados')
}

/** Un atajo del mercado en números reemplaza los filtros, conserva el orden y sube a la lista. */
function applyShortcut(params: Record<string, string>) {
  update(motoNormalizeQuery({ ...params, sort: query.value.sort }))
  scrollToPageTop('motos-resultados')
}

// Las respuestas se calculan de los MISMOS datos que la página imprime, así el texto visible y el
// schema.org no pueden divergir (misma técnica que /monopatines-electricos-uruguay).
const faq = computed<FaqItem[]>(() => [
  {
    id: 'motos-precio-tipico',
    question: '¿Cuánto sale una moto usada en Uruguay?',
    answer: motoPrecioTipicoAnswer(payload.value.items, payload.value.coverage),
  },
  {
    id: 'motos-cilindrada',
    question: '¿Qué cilindrada tiene más oferta?',
    answer: motoCilindradaAnswer(payload.value.items, payload.value.coverage),
  },
  {
    id: 'motos-precio-pedido',
    question: '¿Estos precios son de venta o de aviso?',
    answer:
      'Son precios pedidos en avisos vigentes, no precios de venta cerrados. En Uruguay las transferencias de usados no se publican por modelo, así que lo que se puede medir es la oferta, no la venta.',
  },
  {
    id: 'motos-oportunidades',
    question: '¿Publican oportunidades o gangas?',
    answer:
      'Todavía no. La regla que usa el directorio de autos exige una cohorte fija de modelo, año, versión, motor y caja, y en motos no tenemos un equivalente medido. Declarar una ganga sin esa cohorte es el error que autos ya cometió y corrigió: de 125 supuestas gangas quedaron 11 cuando se agregó la versión.',
  },
  {
    id: 'motos-cilindrada-estimada',
    question: '¿Qué quiere decir la cilindrada con «≈»?',
    answer:
      'Que el aviso no la dice y la estimamos. Primero buscamos la cilindrada en la ficha del aviso y en el título; si no está, usamos la que declaran los demás avisos del mismo modelo (con al menos tres que coincidan) y, si no alcanzan, el número del nombre del modelo. La estimada ubica a la moto en su tramo, pero puede no ser el número exacto: confirmalo con el vendedor.',
  },
  {
    id: 'motos-electricas',
    question: '¿Las motos eléctricas entran en estos precios?',
    answer:
      'Entran al catálogo, pero con ficha propia: una línea eléctrica nunca se promedia con las de nafta del mismo fabricante. Son dos mercados con dos costos de uso, y el comparador de transporte los trata distinto.',
  },
  {
    id: 'motos-moneda',
    question: '¿Por qué algunos precios están en pesos y otros en dólares?',
    answer:
      'Porque así los publica cada vendedor, y no los convertimos para mostrarlos: la cifra que leés es la del aviso. El filtro y el orden por precio sí usan el valor en dólares que calculamos con la cotización de la corrida, porque es lo único comparable entre los dos.',
  },
])

// ── SEO ────────────────────────────────────────────────────────────────────
// Absoluto y literal, nunca con localePath: esta familia es sólo en español.
const CANONICAL = `https://cambio-uruguay.com${MOTOS_PATH}`
const TITLE = 'Motos usadas en venta en Uruguay'
const DESCRIPTION =
  'Avisos vigentes de motos usadas con año, cilindrada, kilómetros y departamento. Las eléctricas van aparte: nunca se promedian con las de nafta.'

defineOgImageComponent('Cambio', {
  title: TITLE,
  subtitle: 'Precios por modelo, año y cilindrada',
  tag: 'MOTOS · PRECIOS',
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
  robots: () => (motoFiltered(query.value) ? 'noindex, follow' : 'index, follow'),
})

// El FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
  meta: [
    {
      name: 'keywords',
      content:
        'motos usadas uruguay, precio moto usada uruguay, moto 125 precio uruguay, comprar moto usada montevideo, yumbo precio, vento precio uruguay',
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
              { '@type': 'ListItem', position: 3, name: 'Motos usadas', item: CANONICAL },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.motos-grid {
  display: grid;
  /* En el celular la ficha es una fila a todo el ancho; desde 600 px, tarjetas con foto. */
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .motos-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px;
  }
}
.price-note {
  margin: 0 0 12px;
  font-size: 0.8rem;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 12px;
}
.market-block {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 12px 16px;
}
.market-block h3 {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 700;
}
.market-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.market-row {
  display: flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.market-list li:first-child .market-row {
  border-top: 0;
}
.market-row:hover span:first-child {
  text-decoration: underline;
}
.market-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.market-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.market-value small {
  display: block;
  font-weight: 400;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* Rol Display de DESIGN.md (el idiom .hero-title): a tamaño fijo un título de 60+ caracteres ocupa
   cinco líneas a 390 px de ancho. */
.motos-title {
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
.results-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.results-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}
.sort-select {
  max-width: 240px;
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
.empty,
.section-note {
  margin: 12px 0 0;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.motos-anchor {
  /* La barra del sitio es fixed (65 px): sin este margen el encabezado de la lista queda tapado
     justo después de paginar. */
  scroll-margin-top: 84px;
}
.model-row {
  display: flex;
  flex-wrap: wrap;
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
