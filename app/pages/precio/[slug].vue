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
      <section class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-2">Local por local</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Ordenado de más barato a más caro, con la fecha que declaró cada local. Las filas marcadas
          se muestran igual pero no encabezan el ranking.
        </p>
        <div class="table-scroll">
          <VTable density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Local</th>
                <th>Departamento</th>
                <th class="text-right">Precio</th>
                <th>Dato del</th>
                <th />
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
                <td data-label="Nota">
                  <span v-if="row.blockedReason" class="text-caption text-medium-emphasis">
                    {{ row.blockedReason }}
                  </span>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p v-if="rows.length > visibleRows.length" class="mt-3">
          <VBtn variant="text" size="small" @click="showAllRows = true">
            Ver los {{ rows.length }} locales
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
        <VRow>
          <VCol v-for="other in sameGroup" :key="other.articleId" cols="12" sm="6" md="4">
            <VCard
              variant="outlined"
              class="pa-4 h-100"
              :to="localePath(`/precio/${preciosSlug(other.name)}`)"
            >
              <p class="text-subtitle-2 font-weight-bold mb-1">{{ other.name }}</p>
              <p class="text-body-2 text-medium-emphasis mb-0">
                mediana {{ money(other.p50) }} · {{ other.n }} locales
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
import { computed, ref } from 'vue'
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

const showAllRows = ref(false)
const visibleRows = computed(() => (showAllRows.value ? rows.value : rows.value.slice(0, 30)))
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

const sameGroup = computed(() => {
  const group = article.value?.group
  if (!group) return []
  return articles.value
    .filter(row => row.group === group && row.articleId !== article.value?.articleId)
    .slice(0, 6)
})

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
</style>
