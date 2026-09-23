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
        Los avisos vigentes de motos usadas con el precio, el año, la cilindrada y el departamento,
        y la ficha de cada modelo con su rango de precios y cuánto pierde por año. Son precios
        <strong>pedidos en avisos</strong>, no precios de venta cerrados.
        <template v-if="payload.status === 'ok' && payload.total > 0">
          Hoy hay {{ payload.total.toLocaleString('es-UY') }}
          {{ payload.total === 1 ? 'aviso' : 'avisos' }} con estos filtros<template v-if="readAt">
            , última lectura el {{ readAt }}</template
          >.
        </template>
      </p>
    </header>

    <AssistantCta topic="motos" class="mb-6" />

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

    <!-- ── Filtros ────────────────────────────────────────────────────────── -->
    <section v-if="payload.status === 'ok'" class="filters mb-6" aria-label="Filtros">
      <VRow dense>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            :model-value="query.marca"
            :items="itemsOf(payload.facets.brands, 'Todas las marcas')"
            label="Marca"
            density="compact"
            variant="outlined"
            hide-details
            data-testid="filtro-marca"
            @update:model-value="value => update({ ...query, marca: value, modelo: '', page: 1 })"
          />
        </VCol>
        <VCol v-if="payload.facets.models.length > 1" cols="12" sm="6" md="3">
          <VSelect
            :model-value="query.modelo"
            :items="itemsOf(payload.facets.models, 'Todos los modelos')"
            label="Modelo"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="value => update({ ...query, modelo: value, page: 1 })"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            :model-value="query.cilindrada"
            :items="displacementItems"
            label="Cilindrada"
            density="compact"
            variant="outlined"
            hide-details
            data-testid="filtro-cilindrada"
            @update:model-value="value => update({ ...query, cilindrada: value, page: 1 })"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            :model-value="query.tipo"
            :items="itemsOf(payload.facets.types, 'Cualquier tipo')"
            label="Tipo"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="value => update({ ...query, tipo: value, page: 1 })"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            :model-value="query.departamento"
            :items="itemsOf(payload.facets.departments, 'Todo el país')"
            label="Departamento"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="value => update({ ...query, departamento: value, page: 1 })"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            :model-value="query.combustible"
            :items="itemsOf(payload.facets.fuels, 'Cualquier motor')"
            label="Motor"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="value => update({ ...query, combustible: value, page: 1 })"
          />
        </VCol>
        <VCol cols="6" sm="3" md="2">
          <VTextField
            :model-value="query.anioDesde ?? ''"
            label="Año desde"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="
              value => update({ ...query, anioDesde: numberOrNull(value), page: 1 })
            "
          />
        </VCol>
        <VCol cols="6" sm="3" md="2">
          <VTextField
            :model-value="query.anioHasta ?? ''"
            label="Año hasta"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="
              value => update({ ...query, anioHasta: numberOrNull(value), page: 1 })
            "
          />
        </VCol>
        <VCol cols="12" sm="6" md="4">
          <VTextField
            :model-value="query.precioMaxUsd ?? ''"
            label="Precio máximo"
            prefix="USD"
            type="number"
            density="compact"
            variant="outlined"
            hint="En dólares: es la única escala en la que un aviso en pesos y uno en dólares se pueden comparar. Cada aviso se muestra en su propia moneda."
            persistent-hint
            data-testid="filtro-precio"
            @update:model-value="
              value => update({ ...query, precioMaxUsd: numberOrNull(value), page: 1 })
            "
          />
        </VCol>
      </VRow>

      <div v-if="chips.length" class="chips mt-4">
        <VChip
          v-for="chip in chips"
          :key="chip.label"
          size="small"
          variant="tonal"
          closable
          class="mr-2 mb-2"
          @click:close="update(motoQueryWithout(query, chip.keys))"
        >
          {{ chip.label }}
        </VChip>
        <VBtn size="small" variant="text" @click="update(motoNormalizeQuery({}))">
          Limpiar todo
        </VBtn>
      </div>
    </section>

    <!-- ── Resultados ─────────────────────────────────────────────────────── -->
    <section v-if="payload.status === 'ok'" class="mb-8">
      <div class="results-head">
        <h2 id="motos-resultados" class="results-title motos-anchor">
          {{ payload.total.toLocaleString('es-UY') }}
          {{ payload.total === 1 ? 'aviso' : 'avisos' }}
        </h2>
        <VSelect
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

      <p v-if="!payload.items.length" class="empty">
        No hay avisos con esos filtros. Probá ampliar el año, el precio o la cilindrada.
      </p>

      <div v-else class="table-wrap">
        <VTable class="cu-mobile-cards motos-table" density="compact">
          <thead>
            <tr>
              <th>Moto</th>
              <th class="text-right">Año</th>
              <th class="text-right">Cilindrada</th>
              <th class="text-right">Kilómetros</th>
              <th>Dónde</th>
              <th class="text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in payload.items" :key="item.key">
              <td data-label="Moto">
                <a
                  :href="item.permalink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="moto-link"
                >
                  {{ item.title }}
                </a>
                <NuxtLink
                  class="model-link"
                  :to="localePath(`${MOTOS_PATH}/${motoFichaSlug(item)}`)"
                >
                  {{ item.brand }} {{ item.model }}
                </NuxtLink>
                <span v-if="item.fuel === 'electrica'" class="tag">Eléctrica</span>
                <span v-for="flag in item.flags" :key="flag" class="tag tag-flag">
                  {{ flag }}
                </span>
              </td>
              <td data-label="Año" class="text-right">{{ item.year }}</td>
              <td data-label="Cilindrada" class="text-right">
                {{ motoDisplacementLabel(item.displacement) }}
              </td>
              <td data-label="Kilómetros" class="text-right">{{ motoKmLabel(item.km) }}</td>
              <td data-label="Dónde">
                {{ item.department || 'No informado' }}
                <span v-if="item.sellerType" class="tag">
                  {{ MOTO_SELLER_LABEL[item.sellerType] }}
                </span>
              </td>
              <td data-label="Precio" class="text-right price">
                {{ motoMoney(item.price, item.currency) }}
                <span v-if="item.currency === 'UYU'" class="usd-note">
                  ≈ {{ motoUsd(item.priceUsd) }}
                </span>
                <span v-if="item.currencyInferred" class="tag">moneda estimada</span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <VPagination
        v-if="payload.total > payload.perPage"
        :model-value="query.page"
        :length="Math.min(200, Math.ceil(payload.total / payload.perPage))"
        :total-visible="3"
        class="mt-6"
        @update:model-value="changePage"
      />
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
          <strong>La cilindrada sale del título del aviso</strong>, con una expresión explícita
          ("125 cc", "125cc", "125 c.c."). Si el vendedor no la escribe, el aviso queda sin
          cilindrada y no entra en ningún tramo: precisión sobre recall, la misma regla que usamos
          con los kilómetros de los autos.
          <template v-if="payload.coverage?.withoutDisplacementBand">
            Hoy hay
            {{ payload.coverage.withoutDisplacementBand.toLocaleString('es-UY') }} avisos así.
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

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
      Esto es una comparación de precios pedidos en avisos públicos, con su fecha. No es una
      tasación, no es una recomendación de compra y no dice si una moto está en buen estado.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  MOTOS_AUTOS_PATH,
  MOTOS_COMPARADOR_PATH,
  MOTOS_PATH,
  MOTO_DISPLACEMENT_BUCKETS,
  MOTO_SELLER_LABEL,
  motoCilindradaAnswer,
  motoDisplacementLabel,
  motoEmptyList,
  motoFichaSlug,
  motoFilterChips,
  motoFiltered,
  motoKmLabel,
  motoLongDate,
  motoMoney,
  motoNormalizeQuery,
  motoPrecioTipicoAnswer,
  motoQueryParams,
  motoQueryWithout,
  motoUsd,
  type MotoFacet,
  type MotoListResponse,
  type MotoQuery,
  type MotoSort,
} from '~/utils/motos'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const query = computed<MotoQuery>(() => motoNormalizeQuery(route.query as Record<string, unknown>))

// Server-rendered: los precios tienen que estar en el HTML que lee el buscador, no llegar después
// por un fetch client-only.
const { data } = await useAsyncData(
  'motos-directorio',
  () => $fetch<MotoListResponse>('/api/motos', { query: motoQueryParams(query.value) }),
  { watch: [query] }
)

/**
 * La respuesta, con la forma vacía como piso. Sin esto un fallo de red deja `data.value` en `null`
 * y la plantilla revienta antes de hidratar — y esta página TIENE que renderizar aunque el job
 * nunca haya corrido.
 */
const payload = computed<MotoListResponse>(
  () => data.value ?? motoEmptyList(query.value, 'unavailable')
)

const readAt = computed(() => motoLongDate(payload.value.coverage?.lastReadAt || null))

/** Un facet como `:items` de un VSelect, con la opción "todas" adelante. */
function itemsOf(facets: readonly MotoFacet[], allLabel: string) {
  return [
    { title: allLabel, value: '' },
    ...facets.map(facet => ({ title: `${facet.label} (${facet.count})`, value: facet.value })),
  ]
}

const displacementItems = [
  { title: 'Cualquier cilindrada', value: '' },
  ...MOTO_DISPLACEMENT_BUCKETS.map(bucket => ({ title: bucket.label, value: bucket.id })),
]

const sortItems: Array<{ title: string; value: MotoSort }> = [
  { title: 'Vistos más recientemente', value: 'recent' },
  { title: 'Menor precio', value: 'price_asc' },
  { title: 'Mayor precio', value: 'price_desc' },
  { title: 'Más nuevas', value: 'year_desc' },
  { title: 'Menos kilómetros', value: 'km_asc' },
]

const chips = computed(() => motoFilterChips(query.value, payload.value.facets))

/** Los modelos con más avisos de la corrida. Se enlazan por `slug`, que es el de la ficha. */
const topModels = computed(() => (payload.value.coverage?.models ?? []).slice(0, 36))

const sourceLine = computed(() =>
  (payload.value.coverage?.sources ?? [])
    .filter(source => source.listings > 0)
    .map(source => `${source.name} (${source.listings.toLocaleString('es-UY')})`)
    .join(' · ')
)

/** Un campo numérico vacío es `NaN`, no cero: el filtro se cae en vez de quedar en "hasta 0". */
function numberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null
}

function update(next: MotoQuery) {
  router.replace({ query: motoQueryParams(next) })
}

function changePage(page: number) {
  update({ ...query.value, page })
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
  'Precios de motos usadas en Uruguay: avisos vigentes con año, cilindrada, kilómetros y departamento, y la ficha de cada modelo con su rango de precios y cuánto pierde por año.'

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
.motos-hub {
  max-width: 1120px;
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
.table-wrap {
  overflow-x: auto;
}
.motos-table .price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.moto-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.moto-link:hover {
  text-decoration: underline;
}
.model-link {
  display: block;
  margin-top: 2px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.usd-note {
  display: block;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* Lo que declara el VENDEDOR (deuda, choque, papeles) se marca, pero sin color de sentimiento: no
   es un veredicto nuestro sobre el aviso, es la palabra que él escribió. */
.tag-flag {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
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
