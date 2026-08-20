<!--
THESIS: Nobody rents a flat on one portal. The value we can add is not another listing site — it is
ONE list where the same flat posted on three portals is one row, with every portal beside it.
OWN-WORLD: The site's navy/action-blue surfaces on a catalogue layout people already know from the
chair directory, so the controls need no learning.
STORY: Arrive with a barrio and a budget, narrow it, see who publishes it, leave through the portal.
-->
<template>
  <VContainer class="rentals pt-1 pt-sm-4 pb-12">
    <VBreadcrumbs :items="breadcrumbs" density="compact" class="px-0 py-1" />

    <header class="rentals-head">
      <p class="rentals-kicker">Directorio de alquileres</p>
      <h1 class="rentals-title">Alquileres en Uruguay, sin el mismo aviso tres veces</h1>
      <p class="rentals-lead">
        Reunimos lo publicado en {{ activeSourceLabels || 'los portales' }} y unificamos el mismo
        inmueble cuando aparece en varios lados: una fila por propiedad, con todos los avisos al
        lado. Los precios se comparan en pesos al dólar del día; el aviso siempre se abre en el
        portal que lo publicó.
      </p>

      <div class="rentals-stats">
        <div class="rentals-stat">
          <span class="rentals-stat__value">{{ numberFormat(meta?.properties ?? total) }}</span>
          <span class="rentals-stat__label">propiedades publicadas</span>
        </div>
        <div class="rentals-stat">
          <span class="rentals-stat__value">{{ numberFormat(meta?.merged ?? 0) }}</span>
          <span class="rentals-stat__label">en más de un portal</span>
        </div>
        <div class="rentals-stat">
          <span class="rentals-stat__value">{{
            meta?.usdUyu ? `$ ${meta.usdUyu.toFixed(2)}` : '—'
          }}</span>
          <span class="rentals-stat__label">dólar usado para comparar</span>
        </div>
        <div class="rentals-stat">
          <span class="rentals-stat__value">{{ updatedLabel }}</span>
          <span class="rentals-stat__label">última actualización</span>
        </div>
      </div>

      <!-- A portal that is down is said out loud. The alternative is a directory that quietly
           shrinks and looks like a market that emptied. -->
      <VAlert
        v-if="downSources.length"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-4"
      >
        Sin datos frescos de {{ downSources.map(source => sourceLabel(source.key)).join(', ') }}. Se
        siguen mostrando sus últimos avisos conocidos.
      </VAlert>
    </header>

    <section class="rentals-filters" aria-label="Filtros">
      <VRow dense>
        <VCol cols="12" md="4">
          <VTextField
            v-model="form.q"
            label="Buscar por calle, barrio o texto del aviso"
            prepend-inner-icon="mdi-magnify"
            density="comfortable"
            variant="outlined"
            hide-details
            clearable
            @update:model-value="debouncedApply"
          />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect
            v-model="form.department"
            :items="departmentItems"
            label="Departamento"
            density="comfortable"
            variant="outlined"
            hide-details
            @update:model-value="onDepartmentChange"
          />
        </VCol>
        <VCol cols="6" md="2">
          <VAutocomplete
            v-model="form.neighborhood"
            :items="neighborhoodItems"
            label="Barrio"
            density="comfortable"
            variant="outlined"
            hide-details
            :disabled="!neighborhoodItems.length"
            @update:model-value="apply"
          />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect
            v-model="form.bedrooms"
            :items="bedroomItems"
            label="Dormitorios"
            density="comfortable"
            variant="outlined"
            hide-details
            @update:model-value="apply"
          />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect
            v-model="form.sort"
            :items="sortItems"
            label="Ordenar"
            density="comfortable"
            variant="outlined"
            hide-details
            @update:model-value="apply"
          />
        </VCol>
        <VCol cols="6" md="3">
          <VTextField
            v-model="form.priceMin"
            label="Precio mínimo ($)"
            type="number"
            inputmode="numeric"
            density="comfortable"
            variant="outlined"
            hide-details
            clearable
            @update:model-value="debouncedApply"
          />
        </VCol>
        <VCol cols="6" md="3">
          <VTextField
            v-model="form.priceMax"
            label="Precio máximo ($)"
            type="number"
            inputmode="numeric"
            density="comfortable"
            variant="outlined"
            hide-details
            clearable
            @update:model-value="debouncedApply"
          />
        </VCol>
        <VCol cols="12" md="6" class="d-flex align-center flex-wrap ga-2">
          <VChip
            v-for="type in typeChips"
            :key="type.value"
            :color="form.type === type.value ? 'primary' : undefined"
            :variant="form.type === type.value ? 'flat' : 'tonal'"
            size="small"
            label
            @click="toggleType(type.value)"
          >
            {{ typeLabel(type.value) }} ({{ numberFormat(type.count) }})
          </VChip>
        </VCol>
      </VRow>

      <div class="rentals-filters__row">
        <VSwitch
          v-model="form.multi"
          color="primary"
          density="compact"
          hide-details
          inset
          label="Solo lo publicado en más de un portal"
          @update:model-value="apply"
        />
        <div class="d-flex align-center flex-wrap ga-2">
          <VChip
            v-for="source in sourceChips"
            :key="source.value"
            :color="form.source === source.value ? 'primary' : undefined"
            :variant="form.source === source.value ? 'flat' : 'tonal'"
            size="small"
            label
            @click="toggleSource(source.value)"
          >
            {{ sourceLabel(source.value as RentalSource) }} ({{ numberFormat(source.count) }})
          </VChip>
          <VBtn v-if="hasFilters" size="small" variant="text" @click="clearFilters">
            Limpiar filtros
          </VBtn>
        </div>
      </div>
    </section>

    <section class="rentals-summary" aria-live="polite">
      <p class="mb-0">
        <strong>{{ numberFormat(total) }}</strong> propiedades
        <template v-if="medianUyu">
          · alquiler típico de esta búsqueda: <strong>$ {{ numberFormat(medianUyu) }}</strong>
          <span class="text-medium-emphasis"> (mediana, gastos comunes aparte)</span>
        </template>
      </p>
    </section>

    <VProgressLinear v-if="pending" indeterminate color="primary" class="mb-4" />

    <VAlert v-if="!pending && !items.length" type="info" variant="tonal" class="mb-6">
      No hay propiedades para esos filtros. Probá ampliar el precio o sacar el barrio.
    </VAlert>

    <VRow>
      <VCol v-for="property in items" :key="property.key" cols="12" sm="6" lg="4">
        <VCard class="rental-card h-100 d-flex flex-column" variant="flat">
          <a
            :href="property.offers[0]?.url"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="rental-card__media"
          >
            <img
              v-if="property.offers[0]?.image"
              :src="property.offers[0]!.image!"
              :alt="property.title"
              loading="lazy"
              decoding="async"
              width="400"
              height="260"
            />
            <span v-else class="rental-card__noimage">
              <VIcon size="32">mdi-home-city-outline</VIcon>
            </span>
            <span v-if="property.sources.length > 1" class="rental-card__badge">
              {{ property.sources.length }} portales
            </span>
          </a>

          <div class="rental-card__body">
            <p class="rental-card__price">
              {{ priceLabel(property) }}
              <span v-if="commonExpensesLabel(property)" class="rental-card__ce">
                + {{ commonExpensesLabel(property) }} de gastos
              </span>
            </p>
            <p class="rental-card__specs">
              {{ specsLabel(property) || typeLabel(property.propertyType) }}
            </p>
            <p class="rental-card__where">
              <VIcon size="14" class="mr-1">mdi-map-marker-outline</VIcon>
              <span>{{
                [property.neighborhood, property.department].filter(Boolean).join(', ')
              }}</span>
            </p>
            <p v-if="property.address" class="rental-card__address">{{ property.address }}</p>
            <p class="rental-card__title">{{ property.title }}</p>

            <div class="rental-card__offers">
              <a
                v-for="offer in property.offers"
                :key="offer.listingId"
                :href="offer.url"
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="rental-card__offer"
              >
                <span class="rental-card__offer-source">{{ sourceLabel(offer.source) }}</span>
                <span class="rental-card__offer-price">{{ offerPrice(offer) }}</span>
                <VIcon size="13">mdi-open-in-new</VIcon>
              </a>
            </div>

            <p class="rental-card__meta">
              <span>{{ sellerLabel(property) }}</span>
              <span v-if="ageLabel(property)">· visto {{ ageLabel(property) }}</span>
            </p>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VPagination
      v-if="pageCount > 1"
      v-model="page"
      :length="pageCount"
      :total-visible="smAndDown ? 4 : 7"
      class="mt-6"
      @update:model-value="onPageChange"
    />

    <section class="rentals-notes">
      <h2>Cómo se arma esta lista</h2>
      <ul>
        <li>
          <strong>Qué mostramos.</strong> Precio, ubicación, metros y dormitorios tal como los
          publica cada portal, más el enlace al aviso original. No copiamos las descripciones ni
          reemplazamos al portal: la consulta y el contrato siguen siendo con quien publica.
        </li>
        <li>
          <strong>Cómo unificamos.</strong> Dos avisos son la misma propiedad cuando coinciden calle
          y número, dormitorios, metros (±15 %) y precio (±7 %). Sin dirección —lo habitual en
          Marketplace— hace falta además el mismo barrio y el mismo precio (±5 %). Un edificio de
          ocho apartamentos son ocho avisos en la misma dirección: por eso la dirección sola nunca
          alcanza para unificar.
        </li>
        <li>
          <strong>Qué no vas a ver.</strong> Alquileres por día o temporada, avisos de venta y
          publicaciones de "busco alquiler". Tampoco precios imposibles de mensualidad.
        </li>
        <li>
          <strong>Cada cuánto.</strong> Barrido completo diario y un repaso cada hora de lo recién
          publicado. Una propiedad que deja de aparecer tres semanas sale del directorio.
        </li>
      </ul>

      <p class="rentals-notes__foot">
        Falta Gallito: sus listados se arman con un postback del lado del cliente, sin contenido
        servido ni contrato estable para leer. Preferimos decirlo antes que mostrar una lista
        incompleta como si fuera todo el mercado.
      </p>
    </section>

    <section class="rentals-related">
      <h2>Antes de firmar</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="3">
          <VCard
            :to="localePath(link.to)"
            class="rentals-related__card pa-4 h-100"
            variant="flat"
            hover
          >
            <VIcon color="primary" class="mb-2">{{ link.icon }}</VIcon>
            <h3>{{ link.title }}</h3>
            <p>{{ link.text }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import {
  RENTAL_SELLER_LABEL,
  RENTAL_SORTS,
  RENTAL_SOURCE_LABEL,
  RENTAL_TYPE_LABEL,
  rentalAgeLabel,
  rentalPriceLabel,
  rentalSpecsLabel,
  type RentalOffer,
  type RentalProperty,
  type RentalPropertyType,
  type RentalSource,
  type RentalsResponse,
} from '~/utils/rentals'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { smAndDown } = useDisplay()

const readQuery = (): Record<string, string> => {
  const raw = route.query
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value) out[key] = value
  }
  return out
}

const form = reactive({
  q: readQuery().q ?? '',
  department: readQuery().department ?? '',
  neighborhood: readQuery().neighborhood ?? '',
  type: readQuery().type ?? '',
  source: readQuery().source ?? '',
  bedrooms: readQuery().bedrooms ?? '',
  priceMin: readQuery().priceMin ?? '',
  priceMax: readQuery().priceMax ?? '',
  multi: readQuery().multi === '1',
  sort: readQuery().sort ?? 'recientes',
})
const page = ref(Number(readQuery().page ?? 1) || 1)

/** The request the API actually gets. Empty values are dropped so the cache key stays small. */
const requestParams = computed(() => {
  const params: Record<string, string> = {}
  if (form.q) params.q = String(form.q)
  if (form.department) params.department = form.department
  if (form.neighborhood) params.neighborhood = form.neighborhood
  if (form.type) params.type = form.type
  if (form.source) params.source = form.source
  if (form.bedrooms !== '' && form.bedrooms !== null) params.bedrooms = String(form.bedrooms)
  if (form.priceMin) params.priceMin = String(form.priceMin)
  if (form.priceMax) params.priceMax = String(form.priceMax)
  if (form.multi) params.multi = '1'
  if (form.sort && form.sort !== 'recientes') params.sort = form.sort
  if (page.value > 1) params.page = String(page.value)
  return params
})

const { data, pending } = await useAsyncData<RentalsResponse | null>(
  'rentals',
  () => $fetch('/api/rentals', { query: requestParams.value }),
  { watch: [requestParams] }
)

const items = computed<RentalProperty[]>(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const meta = computed(() => data.value?.meta ?? null)
const medianUyu = computed(() => data.value?.medianUyu ?? 0)
const usdUyu = computed(() => meta.value?.usdUyu ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / (data.value?.perPage || 24))))

const downSources = computed(() => (meta.value?.sources ?? []).filter(source => !source.ok))
const activeSourceLabels = computed(() =>
  (meta.value?.sources ?? [])
    .filter(source => source.ok && source.listings > 0)
    .map(source => sourceLabel(source.key))
    .join(', ')
)

const departmentItems = computed(() => [
  { title: 'Todo el país', value: '' },
  ...(data.value?.facets.departments ?? []).map(facet => ({
    title: `${facet.value} (${numberFormat(facet.count)})`,
    value: facet.value,
  })),
])

const neighborhoodItems = computed(() => [
  { title: 'Todos los barrios', value: '' },
  ...(data.value?.facets.neighborhoods ?? []).map(facet => ({
    title: `${facet.value} (${numberFormat(facet.count)})`,
    value: facet.value,
  })),
])

const bedroomItems = [
  { title: 'Cualquiera', value: '' },
  { title: 'Monoambiente', value: '0' },
  { title: '1 o más', value: '1' },
  { title: '2 o más', value: '2' },
  { title: '3 o más', value: '3' },
  { title: '4 o más', value: '4' },
]

const sortItems = RENTAL_SORTS.map(option => ({ title: option.label, value: option.value }))
const typeChips = computed(() => data.value?.facets.types ?? [])
const sourceChips = computed(() => data.value?.facets.sources ?? [])

const hasFilters = computed(() =>
  Boolean(
    form.q ||
      form.department ||
      form.neighborhood ||
      form.type ||
      form.source ||
      form.bedrooms ||
      form.priceMin ||
      form.priceMax ||
      form.multi
  )
)

const numberFormat = (value: number): string =>
  new Intl.NumberFormat('es-UY').format(Math.round(value || 0))
const sourceLabel = (source: RentalSource): string => RENTAL_SOURCE_LABEL[source] ?? source
const typeLabel = (type: string): string => RENTAL_TYPE_LABEL[type as RentalPropertyType] ?? type
const specsLabel = (property: RentalProperty): string => rentalSpecsLabel(property)
const priceLabel = (property: RentalProperty): string =>
  rentalPriceLabel(property.price, property.currency, usdUyu.value)
const offerPrice = (offer: RentalOffer): string =>
  offer.currency === 'USD' ? `U$S ${numberFormat(offer.price)}` : `$ ${numberFormat(offer.price)}`

const commonExpensesLabel = (property: RentalProperty): string => {
  const withExpenses = property.offers.find(
    offer => offer.commonExpenses && offer.commonExpenses > 0
  )
  if (!withExpenses?.commonExpenses) return ''
  return withExpenses.commonExpensesCurrency === 'USD'
    ? `U$S ${numberFormat(withExpenses.commonExpenses)}`
    : `$ ${numberFormat(withExpenses.commonExpenses)}`
}

const sellerLabel = (property: RentalProperty): string => {
  const named = property.offers.find(offer => offer.sellerType !== 'desconocido')
  if (named) return `${RENTAL_SELLER_LABEL[named.sellerType]}: ${named.sellerName}`
  return property.offers[0]?.sellerName || 'Sin dato'
}

const ageLabel = (property: RentalProperty): string => {
  const published = property.offers
    .map(offer => offer.publishedAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0]
  return rentalAgeLabel(published || property.firstSeen)
}

const updatedLabel = computed(() => {
  const iso = meta.value?.generatedAt
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

/** Filters live in the URL: a search worth sharing is a search worth linking. */
function syncUrl(): void {
  router.replace({ query: requestParams.value })
}

function apply(): void {
  page.value = 1
  syncUrl()
}

let timer: ReturnType<typeof setTimeout> | null = null
function debouncedApply(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(apply, 450)
}

function onDepartmentChange(): void {
  // A barrio from the previous department would return zero rows and look like a broken filter.
  form.neighborhood = ''
  apply()
}

function toggleType(value: string): void {
  form.type = form.type === value ? '' : value
  apply()
}

function toggleSource(value: string): void {
  form.source = form.source === value ? '' : value
  apply()
}

function clearFilters(): void {
  form.q = ''
  form.department = ''
  form.neighborhood = ''
  form.type = ''
  form.source = ''
  form.bedrooms = ''
  form.priceMin = ''
  form.priceMax = ''
  form.multi = false
  form.sort = 'recientes'
  apply()
}

function onPageChange(): void {
  syncUrl()
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const relatedLinks = [
  {
    to: '/alquilar-en-uruguay',
    icon: 'mdi-home-search-outline',
    title: 'Guía para alquilar',
    text: 'Garantías, costos de entrada, contrato, visita y estafas, paso a paso.',
  },
  {
    to: '/alquilar-en-uruguay#comunidades',
    icon: 'mdi-account-group-outline',
    title: 'Grupos y comunidades',
    text: 'Dónde publicar tu búsqueda y ver la oferta de dueño directo que no llega a los portales.',
  },
  {
    to: '/alquilar-sin-recibo-de-sueldo',
    icon: 'mdi-file-document-outline',
    title: 'Sin recibo de sueldo',
    text: 'Qué garantía acepta a un monotributista, un freelance o un independiente.',
  },
  {
    to: '/alquilar-estando-en-clearing',
    icon: 'mdi-account-alert-outline',
    title: 'Estando en el clearing',
    text: 'Cuáles de las garantías consultan el clearing y cuáles no.',
  },
]

const breadcrumbs = computed(() => {
  const current = { title: 'Alquileres', disabled: true }
  return smAndDown.value
    ? [current]
    : [
        { title: t('inicio'), to: localePath('/'), disabled: false },
        { title: t('nav.alquilar'), to: localePath('/alquilar-en-uruguay'), disabled: false },
        current,
      ]
})

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/alquileres-uruguay')}`
)

defineOgImageComponent('Cambio', {
  title: () => 'Alquileres en Uruguay',
  subtitle: () =>
    meta.value
      ? `${numberFormat(meta.value.properties)} propiedades de ${meta.value.sources.filter(source => source.ok).length} portales, sin repetidos`
      : 'Un buscador que unifica el mismo aviso publicado en varios portales',
  tag: 'ALQUILERES',
})

useSeoMeta({
  title: 'Alquileres en Uruguay: buscador unificado de portales | Cambio Uruguay',
  description:
    'Alquileres de todo el país reunidos de Mercado Libre, InfoCasas y Facebook Marketplace, con el mismo inmueble unificado en una sola fila. Filtrá por barrio, precio y dormitorios.',
  ogTitle: 'Alquileres en Uruguay, sin el mismo aviso tres veces',
  ogDescription:
    'Un buscador que junta los portales y unifica el aviso repetido: precio, barrio, metros y todos los portales que lo publican.',
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  // Only the FILTERED views are kept out of the index — the page itself is meant to rank. The
  // facets multiply into millions of URLs and every one of them is a thin copy of this page.
  meta: page.value > 1 || hasFilters.value ? [{ name: 'robots', content: 'noindex, follow' }] : [],
  script: items.value.length
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Alquileres en Uruguay',
            description:
              'Propiedades en alquiler publicadas en los portales uruguayos, unificadas en una fila por inmueble.',
            url: canonicalUrl.value,
            numberOfItems: items.value.length,
            // Only the page being rendered is described. Claiming the whole collection would be a
            // list Google never sees.
            itemListElement: items.value.slice(0, 24).map((property, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: property.title,
              url: property.offers[0]?.url,
            })),
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.rentals {
  max-width: 1240px;
}

.rentals-head {
  margin-bottom: 24px;
}

.rentals-kicker {
  margin: 0 0 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.rentals-title {
  margin: 0 0 8px;
  font-size: clamp(1.5rem, 3.4vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.15;
}

.rentals-lead {
  margin: 0;
  max-width: 68ch;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.rentals-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.rentals-stat {
  padding: 12px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-surface-bright), 0.35);
}

.rentals-stat__value {
  display: block;
  font-size: 1.25rem;
  font-weight: 800;
}

.rentals-stat__label {
  display: block;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.rentals-filters {
  margin: 20px 0 8px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.rentals-filters__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  margin-top: 12px;
}

.rentals-summary {
  margin: 16px 0 12px;
}

.rental-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
}

.rental-card__media {
  position: relative;
  display: block;
  aspect-ratio: 3 / 2;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.rental-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rental-card__noimage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.rental-card__badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
}

.rental-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
}

.rental-card__price {
  margin: 0;
  font-size: 1.075rem;
  font-weight: 800;
}

.rental-card__ce {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.rental-card__specs {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.rental-card__where,
.rental-card__address,
.rental-card__meta {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.rental-card__title {
  margin: 4px 0 0;
  font-size: 0.875rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rental-card__offers {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 10px 0 6px;
}

.rental-card__offer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  text-decoration: none;
  color: inherit;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.rental-card__offer:hover {
  background: rgba(var(--v-theme-primary), 0.12);
}

.rental-card__offer-source {
  font-weight: 600;
}

.rental-card__offer-price {
  margin-left: auto;
}

.rental-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.rentals-notes,
.rentals-related {
  margin-top: clamp(40px, 6vw, 72px);
}

.rentals-notes h2,
.rentals-related h2 {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.rentals-notes ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 78ch;
  font-size: 0.95rem;
  line-height: 1.55;
}

.rentals-notes__foot {
  margin-top: 16px;
  max-width: 78ch;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.rentals-related__card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.rentals-related__card h3 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.rentals-related__card p {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
</style>
