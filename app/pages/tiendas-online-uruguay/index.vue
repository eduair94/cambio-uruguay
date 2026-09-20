<!--
THESIS: Someone is about to pay a site they never heard of. Show what is verifiable about it — domain age, reviews, Reddit, our own catalogues — with its source and date, never a verdict.
OWN-WORLD: Inherit Cambio Uruguay's Open Sans, navy/paper surfaces and semantic blue links, like /equipar-casa-uruguay and /couriers-uruguay.
FIRST VIEWPORT: Plain title, the disclaimer that this is not a trust ranking, and the filterable table — no JS needed to read a single row.
FORM: Read mode. Filters are client state only; the table itself is server-rendered so a store's name reaches the crawler even before the filters run.
-->
<template>
  <VContainer class="tiendas-index py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Tiendas online', disabled: true },
      ]"
      class="px-0 pb-2"
    />
    <header class="tiendas-header">
      <h1>Tiendas online de Uruguay: opiniones, reclamos y datos verificables</h1>
      <p class="lead">{{ introText }}</p>
      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        class="tiendas-disclaimer"
        icon="mdi-information-outline"
      >
        No es un ranking de confianza: mostramos datos con su fuente y su fecha.
      </VAlert>
    </header>

    <section class="tiendas-filters" aria-label="Filtros">
      <div class="filter-group">
        <span id="filtro-rubro" class="filter-label">Rubro</span>
        <VChipGroup v-model="rubroFilter" column aria-labelledby="filtro-rubro">
          <VChip value="" filter size="small">Todos los rubros</VChip>
          <VChip
            v-for="(label, rubro) in STORE_RUBRO_LABELS"
            :key="rubro"
            :value="rubro"
            filter
            size="small"
          >
            {{ label }}
          </VChip>
        </VChipGroup>
      </div>
      <div class="filter-group">
        <span id="filtro-tipo" class="filter-label">Tipo</span>
        <VChipGroup v-model="kindFilter" column aria-labelledby="filtro-tipo">
          <VChip value="" filter size="small">Todos los tipos</VChip>
          <VChip
            v-for="(label, kind) in STORE_KIND_LABELS"
            :key="kind"
            :value="kind"
            filter
            size="small"
          >
            {{ label }}
          </VChip>
        </VChipGroup>
      </div>
    </section>

    <section class="tiendas-section" aria-labelledby="tabla-title">
      <h2 id="tabla-title">Listado de tiendas</h2>
      <p class="section-intro">
        Orden alfabético. Tocá el nombre de una tienda con ficha propia para ver su detalle.
      </p>

      <VTable class="cu-mobile-cards tiendas-table" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Tienda</th>
            <th scope="col">Rubros</th>
            <th scope="col">En línea desde</th>
            <th scope="col">Trustpilot</th>
            <th scope="col">Google</th>
            <th scope="col">Menciones en Reddit</th>
            <th scope="col">Ofertas en nuestros catálogos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="store in filteredStores" :key="store.key">
            <td data-label="" class="font-weight-medium">
              <NuxtLink
                v-if="store.hasProfile"
                :to="localePath(`/tiendas-online-uruguay/${store.key}`)"
                class="tiendas-link"
              >
                {{ store.name }}
              </NuxtLink>
              <template v-else>{{ store.name }}</template>
            </td>
            <td data-label="Rubros">{{ rubroLabel(store.rubros) }}</td>
            <td data-label="En línea desde">
              {{ store.since ? storeFormatDate(store.since) : '—' }}
            </td>
            <td data-label="Trustpilot">
              {{
                store.trustpilot
                  ? `${storeEsDecimal(store.trustpilot.score)}/5 (${storeEsCount(store.trustpilot.reviews)})`
                  : '—'
              }}
            </td>
            <td data-label="Google">
              {{
                store.google
                  ? `${storeEsDecimal(store.google.rating)}/5 (${storeEsCount(store.google.reviews)})`
                  : '—'
              }}
            </td>
            <td data-label="Menciones en Reddit">
              {{ redditCell(store) }}
            </td>
            <td data-label="Ofertas en nuestros catálogos">
              {{ store.catalogOffers != null ? storeEsCount(store.catalogOffers) : '—' }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p v-if="!filteredStores.length" class="empty-note">
        Ninguna tienda del registro coincide con ese filtro.
      </p>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />
  </VContainer>
</template>

<script setup lang="ts">
import type { StoreCard, StoresIndexResponse } from '~/server/api/stores/index.get'
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import { STORE_KIND_LABELS, STORE_RUBRO_LABELS, type StoreRubro } from '~/utils/storeDirectory'
import {
  storeEsCount,
  storeEsDecimal,
  storeFormatDate,
  storeHubItemList,
  STORE_REDDIT_MAX_MENTIONS,
} from '~/utils/storeProfiles'

const localePath = useLocalePath()

// Server-rendered: the table has to be in the HTML a search engine reads, filters or not.
const { data } = await useFetch<StoresIndexResponse>('/api/stores', { key: 'tiendas-online-index' })

const stores = computed<StoreCard[]>(() => data.value?.stores ?? [])
const reviewedAt = computed(() => data.value?.reviewedAt ?? null)

const rubroFilter = ref('')
const kindFilter = ref('')

const filteredStores = computed(() =>
  stores.value.filter(store => {
    if (rubroFilter.value && !store.rubros.includes(rubroFilter.value)) return false
    if (kindFilter.value && store.kind !== kindFilter.value) return false
    return true
  })
)

function rubroLabel(rubros: string[]): string {
  return rubros.map(rubro => STORE_RUBRO_LABELS[rubro as StoreRubro] ?? rubro).join(', ')
}

// "500 o más", never a bare "500" that reads as an exact tally (fix round F1, item 2).
function redditCell(store: StoreCard): string {
  if (store.redditMentions == null) return '—'
  return store.redditMentionsCapped
    ? `${STORE_REDDIT_MAX_MENTIONS} o más`
    : storeEsCount(store.redditMentions)
}

const reviewedAtLabel = computed(() => (reviewedAt.value ? storeFormatDate(reviewedAt.value) : ''))

const introText = computed(() => {
  const count = stores.value.length
  const base = count
    ? `Relevamos ${storeEsCount(count)} tiendas online que operan en Uruguay o le venden al país desde el exterior.`
    : 'Estamos armando el relevamiento de tiendas online que operan en Uruguay o le venden al país desde el exterior.'
  return reviewedAtLabel.value ? `${base} Última revisión: ${reviewedAtLabel.value}.` : base
})

const faqItems = [
  {
    id: 'tiendas-que-medimos',
    question: '¿Qué datos muestra esta página?',
    answer:
      'Antigüedad del dominio, reseñas de Trustpilot y Google, menciones en Reddit y presencia ' +
      'en nuestros propios catálogos de precios, cada uno con su fuente y su fecha de revisión.',
  },
  {
    id: 'tiendas-que-no',
    question: '¿Qué NO es esta página?',
    answer:
      'No es un ranking de confianza ni una recomendación de compra: cada dato lleva su fuente ' +
      'para que lo verifiques vos mismo antes de decidir.',
  },
  {
    id: 'tiendas-corregir',
    question: '¿Cómo corrijo un dato de mi tienda?',
    answer:
      'Escribinos desde la página de contacto con el dato a corregir y una fuente que lo respalde.',
  },
]

// Absolute and LITERAL, never built from `localePath` (fix round 1, item 1): this family is
// Spanish-only and the canonical/JSON-LD urls must stay the same string on /en/ and /pt/ too — a
// `localePath`-built absolute url would carry the locale prefix on those routes (real routes under
// `prefix_except_default`, linked by the sitewide hreflang alternates) and turn into three
// self-canonical URLs instead of one. `localePath` stays reserved for on-page NuxtLink navigation
// targets, which SHOULD follow the visitor's locale. Same pattern as
// equipar-casa-uruguay/[categoria].vue.
const CANONICAL = 'https://cambio-uruguay.com/tiendas-online-uruguay'

defineOgImageComponent('Cambio', {
  title: 'Tiendas online de Uruguay',
  subtitle: 'Opiniones, reclamos y datos verificables',
  tag: 'TIENDAS',
})

const seoTitle = 'Tiendas online de Uruguay: opiniones y datos verificables | Cambio Uruguay'
const seoDescription =
  'Antigüedad del dominio, Trustpilot, Google, menciones en Reddit y catálogos propios de las ' +
  'tiendas online que venden en Uruguay, con fuente y fecha.'

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: 'Tiendas online de Uruguay: opiniones y datos verificables',
  ogDescription: seoDescription,
  ogType: 'website',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
  twitterTitle: 'Tiendas online de Uruguay',
  twitterDescription: seoDescription,
})

// FAQPage schema is emitted by FaqSection, so it is deliberately not repeated here.
useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
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
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com/',
              },
              directoriosHubListItem(2),
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Tiendas online',
                item: CANONICAL,
              },
            ],
          },
          // Only rows with a real page of their own — a store with no written profile has no URL
          // for this list to point at (`GET /api/stores/<slug>` 404s without one). Omitted
          // entirely, not emitted with zero items, when nothing in the registry has a profile yet
          // (fix round 1, item 4).
          ...storeHubItemList(stores.value),
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.tiendas-index {
  max-width: 1120px;
}
.tiendas-index p {
  margin: 12px 0 0;
}
.tiendas-header h1 {
  margin: 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  line-height: 1.2;
}
.lead {
  max-width: 68ch;
  font-size: 1.075rem;
}
.tiendas-disclaimer {
  margin-top: 16px !important;
  max-width: 68ch;
}
.tiendas-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 32px;
  margin-top: 28px;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}
.tiendas-section {
  margin-top: 32px;
}
.tiendas-section h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
}
.section-intro {
  max-width: 68ch;
  font-size: 0.9rem;
  opacity: 0.85;
}
.tiendas-table {
  margin-top: 16px;
}
.tiendas-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.tiendas-link:hover {
  text-decoration: underline;
}
.empty-note {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.9rem;
}
</style>
