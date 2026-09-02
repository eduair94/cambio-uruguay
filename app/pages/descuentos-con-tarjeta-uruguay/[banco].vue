<template>
  <!-- Gated on `page`: un slug desconocido tira 404 en setup, así que el camino de error nunca
       llega a renderizar con `page` indefinido. -->
  <VContainer v-if="page" class="py-4 py-md-6">
    <div class="mb-3">
      <VBtn
        :to="localePath('/descuentos-con-tarjeta-uruguay')"
        variant="text"
        size="small"
        class="px-1"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Mapa de descuentos
      </VBtn>
    </div>

    <header class="mb-5">
      <p class="eyebrow mb-1">
        <span class="bank-dot" :style="{ background: bank?.color }" />
        {{ bank?.name }} · descuentos vigentes
      </p>
      <h1 class="text-h5 text-sm-h4 font-weight-bold mb-2">{{ page.h1 }}</h1>
      <p class="text-body-1 text-medium-emphasis lead mb-4">{{ page.intro }}</p>

      <!-- Los números NO están escritos en ningún lado: salen de la lectura de este minuto. -->
      <VRow v-if="data" dense class="mb-2">
        <VCol cols="6" md="3">
          <VCard variant="tonal" class="pa-3 h-100">
            <div class="stat-num">{{ fmt(data.totals.brands) }}</div>
            <div class="stat-label">marcas con descuento</div>
          </VCard>
        </VCol>
        <VCol cols="6" md="3">
          <VCard variant="tonal" class="pa-3 h-100">
            <div class="stat-num">{{ fmt(data.totals.locations) }}</div>
            <div class="stat-label">locales en el mapa</div>
          </VCard>
        </VCol>
        <VCol cols="6" md="3">
          <VCard variant="tonal" class="pa-3 h-100">
            <div class="stat-num">{{ fmt(slice?.debit ?? 0) }}</div>
            <div class="stat-label">también con débito</div>
          </VCard>
        </VCol>
        <VCol cols="6" md="3">
          <VCard variant="tonal" class="pa-3 h-100">
            <div class="stat-num">{{ fmt(slice?.exclusive ?? 0) }}</div>
            <div class="stat-label">que sólo tiene {{ bank?.name }}</div>
          </VCard>
        </VCol>
      </VRow>

      <div class="d-flex flex-wrap ga-2 mt-3">
        <VBtn :to="mapLink" color="primary" size="small">
          <VIcon start size="small">mdi-map-marker-radius-outline</VIcon>
          Ver en el mapa los locales cerca tuyo
        </VBtn>
        <VBtn v-if="creditFicha" :to="creditFicha" variant="tonal" size="small">
          <VIcon start size="small">mdi-credit-card-multiple-outline</VIcon>
          Tarjeta de crédito {{ bank?.name }}
        </VBtn>
        <VBtn v-if="debitFicha" :to="debitFicha" variant="tonal" size="small">
          <VIcon start size="small">mdi-credit-card-outline</VIcon>
          Débito {{ bank?.name }}
        </VBtn>
      </div>
    </header>

    <VAlert v-if="error" type="warning" variant="tonal" density="comfortable" class="mb-4">
      No pudimos leer los descuentos en este momento. Probá de nuevo en unos minutos.
    </VAlert>

    <div v-else-if="pending" class="text-center py-10">
      <VProgressCircular indeterminate color="primary" />
      <p class="text-caption mt-2">Leyendo los descuentos vigentes…</p>
    </div>

    <template v-else-if="data && data.totals.brands">
      <!-- 1. Cuánto es el descuento: los textos deduplicados, que es la pregunta real -->
      <section class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-1">Cuánto es el descuento de {{ bank?.name }}</h2>
        <p class="text-body-2 text-medium-emphasis mb-3 lead">
          {{ page.howItWorks }}
        </p>

        <div v-for="group in tierGroups" :key="group.kind" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            <VIcon size="small" class="mr-1">{{
              group.kind === 'credit' ? 'mdi-credit-card' : 'mdi-card-bulleted-outline'
            }}</VIcon>
            {{ group.title }}
          </h3>
          <VCard
            v-for="entry in group.entries"
            :key="entry.index"
            variant="outlined"
            class="mb-2 pa-3"
          >
            <p class="tier-text mb-2">“{{ entry.tier.text }}”</p>
            <div class="d-flex flex-wrap ga-2 mb-2">
              <VChip size="x-small" variant="tonal" color="primary">
                {{ fmt(entry.tier.brands) }} marca{{ entry.tier.brands === 1 ? '' : 's' }}
              </VChip>
              <VChip size="x-small" variant="tonal">
                {{ fmt(entry.tier.locations) }} local{{ entry.tier.locations === 1 ? '' : 'es' }}
              </VChip>
            </div>
            <p class="text-caption text-medium-emphasis mb-0">
              <template v-for="(brand, i) in tierBrands(entry)" :key="brand.brandId">
                <span v-if="i">, </span>{{ brand.name }}
              </template>
              <template v-if="entry.tier.brands > TIER_BRAND_PREVIEW">
                y {{ fmt(entry.tier.brands - TIER_BRAND_PREVIEW) }} más.
              </template>
            </p>
          </VCard>
        </div>

        <VAlert type="info" variant="tonal" density="comfortable" class="mt-3">
          {{ page.watchOut }}
        </VAlert>
      </section>

      <!-- 2. Las marcas, agrupadas por rubro: un <h3> por rubro es la estructura que la página
           necesita y el enlace interno hacia la página del rubro. -->
      <section class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-1">
          Dónde tenés descuento con {{ bank?.name }}, por rubro
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-4 lead">
          Cada marca con la cantidad de locales que tiene en el mapa. Los rubros van de mayor a
          menor cobertura, y cada uno enlaza a la comparativa de ese rubro entre todos los emisores.
        </p>

        <section v-for="group in brandsByCategory" :key="group.category" class="rubro mb-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-1">
            <NuxtLink v-if="group.to" :to="group.to">{{ group.label }}</NuxtLink>
            <span v-else>{{ group.label }}</span>
            <span class="text-caption text-medium-emphasis font-weight-regular ml-2">
              {{ fmt(group.brands.length) }} marca{{ group.brands.length === 1 ? '' : 's' }}
            </span>
          </h3>
          <ul class="brand-list">
            <li v-for="brand in group.brands" :key="brand.brandId">
              <NuxtLink
                v-if="brand.pageSlug"
                :to="localePath(`/descuentos-con-tarjeta-uruguay/marca/${brand.pageSlug}`)"
                class="brand-name brand-link"
              >
                {{ brand.name }}
              </NuxtLink>
              <span v-else class="brand-name">{{ brand.name }}</span>
              <span class="brand-meta">
                {{ brand.locations }} local{{ brand.locations === 1 ? '' : 'es' }}
                <template v-if="brandDayNote(brand)"> · {{ brandDayNote(brand) }}</template>
                <template v-if="brandHasDebit(brand)"> · también con débito</template>
              </span>
            </li>
          </ul>
        </section>
      </section>

      <!-- 3. Cómo se compara. Sale de /api/bankos/analysis, que es una reducción chica del mismo
           catálogo cacheado: no vuelve a bajar el mapa entero. -->
      <section v-if="comparison.length" class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-1">{{ bank?.name }} frente a los otros emisores</h2>
        <p class="text-body-2 text-medium-emphasis mb-3 lead">
          Cobertura contada del mismo mapa. No mide cuánto ahorrás: mide en cuántas marcas y locales
          tenés beneficio, que es lo único que el catálogo permite comparar sin inventar.
        </p>
        <div class="table-scroll">
          <table class="cmp cu-mobile-cards">
            <thead>
              <tr>
                <th>Emisor</th>
                <th class="num">Marcas</th>
                <th class="num">Locales</th>
                <th class="num">Con débito</th>
                <th class="num">Exclusivas</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in comparison"
                :key="row.bankId"
                :class="{ self: row.bankId === bank?.id }"
              >
                <td data-label="Emisor">
                  <NuxtLink v-if="row.to" :to="row.to">{{ row.name }}</NuxtLink>
                  <span v-else>{{ row.name }}</span>
                  <VChip v-if="row.bankId === bank?.id" size="x-small" variant="tonal" class="ml-1">
                    esta página
                  </VChip>
                </td>
                <td class="num" data-label="Marcas">{{ fmt(row.brands) }}</td>
                <td class="num" data-label="Locales">{{ fmt(row.locations) }}</td>
                <td class="num" data-label="Con débito">{{ fmt(row.debit) }}</td>
                <td class="num" data-label="Exclusivas">{{ fmt(row.exclusive) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-caption text-medium-emphasis mt-2 mb-0">
          "Exclusivas" son las marcas que ningún otro emisor del mapa descuenta: es lo que realmente
          suma agregar esa tarjeta a las que ya tenés.
          <NuxtLink :to="localePath('/que-banco-tiene-mas-descuentos-uruguay')">
            El análisis completo, con gráficas
          </NuxtLink>
          .
        </p>
      </section>
    </template>

    <VAlert v-else type="info" variant="tonal" class="mb-8" icon="mdi-tag-off-outline">
      <p class="mb-1 font-weight-bold">
        En esta lectura no hay descuentos vigentes de {{ bank?.name }}
      </p>
      <p class="mb-0 text-body-2">
        El relevamiento no trajo ningún comercio adherido para este emisor. La página se rearma sola
        en la próxima lectura; mientras tanto, el mapa combina las tarjetas que sí tengas.
      </p>
    </VAlert>

    <!-- Hermanos: el camino lateral de la familia -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-3">Descuentos de los otros emisores</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="other in siblings"
          :key="other.slug"
          :to="localePath(`/descuentos-con-tarjeta-uruguay/${other.slug}`)"
          variant="tonal"
          size="small"
        >
          <span class="bank-dot mr-1" :style="{ background: other.color }" />
          {{ other.name }}
        </VChip>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-3">Seguí por acá</h2>
      <ul class="related">
        <li v-for="link in page.related" :key="link.to">
          <NuxtLink :to="localePath(link.to)">{{ link.label }}</NuxtLink>
        </li>
      </ul>
    </section>

    <FaqSection
      :items="faqItems"
      :heading="`Preguntas frecuentes sobre los descuentos de ${bank?.name}`"
      :expanded="true"
    />

    <p class="text-caption text-medium-emphasis mt-6 mb-0">
      Datos de Bankos (bankos.uy)<template v-if="sourceLabel"> · {{ sourceLabel }}</template
      ><template v-if="generatedLabel"> · última lectura {{ generatedLabel }}</template
      >. Este sitio no está afiliado a Bankos ni a los emisores mencionados; confirmá siempre las
      condiciones vigentes antes de pagar.
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BANKOS_BANK_BY_ID, BANKOS_CARD_PAGE_ANCHORS, dayRestrictionLabel } from '~/utils/bankos'
import type { BrandRow, OfferTier } from '~/utils/bankosBrands'
import type { BankosAnalysis } from '~/utils/bankosAnalysis'
import {
  BANKOS_BANK_PAGES,
  BANKOS_SHARED_FAQ,
  bankPageSlugs,
  categoryPageForCategory,
  getBankPage,
} from '~/utils/bankosPages'
import type { FaqItem } from '~/utils/faqAnswers'

// Un slug fuera del catálogo es 404 de verdad. OJO: `validate` se extrae en build, así que tocar
// la lista obliga a reiniciar el dev server.
definePageMeta({
  validate: route => bankPageSlugs().includes(String(route.params.banco ?? '')),
})

/** Cuántas marcas se nombran dentro de cada tramo antes del "y N más". */
const TIER_BRAND_PREVIEW = 12

const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.banco ?? ''))
const page = computed(() => getBankPage(slug.value))
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Emisor no encontrado' })
}
const bankId = page.value.bankId
const bank = computed(() => BANKOS_BANK_BY_ID[bankId])

interface BrandsResponse {
  /** Cada marca con el slug de su página, o null si no tiene (el 85 % del catálogo). */
  brands: Array<BrandRow & { pageSlug: string | null }>
  categories: { category: string; brands: number; locations: number }[]
  tiers: OfferTier[]
  banks: {
    bankId: string
    bankName: string
    color: string
    brands: number
    locations: number
    exclusive: number
    debit: number
  }[]
  totals: { brands: number; locations: number }
  source: string
  generatedAt: string | null
}

const { data, pending, error } = await useFetch<BrandsResponse>('/api/bankos/brands', {
  query: { banco: bankId },
  key: `bankos-brands-${bankId}`,
})

// La comparativa entre emisores sale de la ruta de análisis, que es una reducción chica del MISMO
// catálogo cacheado en el servidor: pedirla no vuelve a bajar el mapa. Se comparte key con la
// página de análisis para no leerla dos veces por navegación.
const { data: analysis } = await useFetch<BankosAnalysis>('/api/bankos/analysis', {
  key: 'bankos-analysis',
  default: () => null,
})

const slice = computed(() => data.value?.banks.find(b => b.bankId === bankId) ?? null)

/**
 * Los tramos, separados por medio de pago y CON su índice original.
 *
 * El índice importa: `BrandOffer.credit/debit` apunta a la posición del tramo en el array que
 * mandó el servidor, así que filtrar por `kind` sin arrastrarlo rompería la relación (y buscarlo
 * después con `indexOf` sería una pasada por tramo en cada render).
 */
interface TierEntry {
  tier: OfferTier
  index: number
}
const tierGroups = computed(() => {
  const entries: TierEntry[] = (data.value?.tiers ?? []).map((tier, index) => ({ tier, index }))
  return [
    {
      kind: 'credit' as const,
      title: 'Pagando con crédito',
      entries: entries.filter(e => e.tier.kind === 'credit'),
    },
    {
      kind: 'debit' as const,
      title: 'Pagando con débito',
      entries: entries.filter(e => e.tier.kind === 'debit'),
    },
  ].filter(group => group.entries.length)
})

/** Las primeras marcas de un tramo, para nombrarlas sin listar las trescientas. */
function tierBrands(entry: TierEntry): BrandRow[] {
  const key = entry.tier.kind === 'credit' ? 'credit' : 'debit'
  return (data.value?.brands ?? [])
    .filter(brand => brand.offers.some(offer => offer[key] === entry.index))
    .slice(0, TIER_BRAND_PREVIEW)
}

function brandHasDebit(brand: BrandRow): boolean {
  return brand.offers.some(offer => offer.debit >= 0)
}

function brandDayNote(brand: BrandRow): string {
  const days = brand.offers.find(offer => offer.days?.length)?.days
  return dayRestrictionLabel(days ?? null)
}

/**
 * Marcas agrupadas por rubro.
 *
 * Se usa la PRIMERA categoría del catálogo, no todas: una marca en dos rubros aparecería dos
 * veces y la página diría más marcas de las que hay. El rubro completo, con todos los emisores,
 * está en su propia página — que es a donde enlaza el encabezado.
 */
const brandsByCategory = computed(() => {
  const groups = new Map<string, BrandRow[]>()
  for (const brand of data.value?.brands ?? []) {
    const category = brand.categories[0] ?? 'Otros'
    if (!groups.has(category)) groups.set(category, [])
    groups.get(category)!.push(brand)
  }
  return [...groups.entries()]
    .map(([category, brands]) => {
      const catPage = categoryPageForCategory(category)
      return {
        category,
        label: catPage?.label ?? category,
        to: catPage ? localePath(`/descuentos-con-tarjeta-uruguay/rubro/${catPage.slug}`) : '',
        brands,
      }
    })
    .sort((a, b) => b.brands.length - a.brands.length || a.label.localeCompare(b.label, 'es'))
})

const comparison = computed(() => {
  const rows = analysis.value?.banks ?? []
  return rows
    .filter(row => row.brands > 0 || row.bankId === bankId)
    .map(row => {
      const other = BANKOS_BANK_PAGES.find(p => p.bankId === row.bankId)
      return {
        bankId: row.bankId,
        name: row.name,
        brands: row.brands,
        locations: row.locations,
        debit: row.debit,
        exclusive: row.exclusive,
        to:
          other && other.bankId !== bankId
            ? localePath(`/descuentos-con-tarjeta-uruguay/${other.slug}`)
            : '',
      }
    })
})

const siblings = computed(() =>
  BANKOS_BANK_PAGES.filter(p => p.slug !== slug.value).map(p => ({
    slug: p.slug,
    name: BANKOS_BANK_BY_ID[p.bankId]?.name ?? p.bankId,
    color: BANKOS_BANK_BY_ID[p.bankId]?.color ?? '#888',
  }))
)

const mapLink = computed(() => localePath(`/descuentos-con-tarjeta-uruguay?banco=${bankId}`))
const creditFicha = computed(() => {
  const id = BANKOS_CARD_PAGE_ANCHORS[bankId]?.credit
  return id ? localePath(`/tarjetas-de-credito-uruguay#programa-${id}`) : ''
})
const debitFicha = computed(() => {
  const id = BANKOS_CARD_PAGE_ANCHORS[bankId]?.debit
  return id ? localePath(`/tarjetas-de-debito-uruguay#tarjeta-${id}`) : ''
})

const faqItems = computed<FaqItem[]>(() => [...(page.value?.faq ?? []), ...BANKOS_SHARED_FAQ])

const SOURCE_LABELS: Record<string, string> = {
  live: 'lectura en vivo',
  cache: 'lectura en vivo (en caché)',
  snapshot: 'último relevamiento guardado',
}
const sourceLabel = computed(() => SOURCE_LABELS[data.value?.source ?? ''] ?? '')
const generatedLabel = computed(() => {
  const at = data.value?.generatedAt
  if (!at) return ''
  return new Date(at).toLocaleString('es-UY', {
    timeZone: 'America/Montevideo',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
})

function fmt(n: number): string {
  return new Intl.NumberFormat('es-UY').format(n)
}

const SITE_URL = 'https://cambio-uruguay.com'
const canonicalUrl = computed(() => `${SITE_URL}/descuentos-con-tarjeta-uruguay/${slug.value}`)

defineOgImageComponent('Cambio', {
  title: () => page.value?.h1 ?? 'Descuentos con tarjeta',
  subtitle: () => `Comercios adheridos de ${bank.value?.name ?? ''}`,
  tag: 'DESCUENTOS',
})

useSeoMeta({
  title: () => `${page.value?.seoTitle ?? ''} | Cambio Uruguay`,
  description: () => page.value?.seoDescription ?? '',
  ogTitle: () => page.value?.h1 ?? '',
  ogDescription: () => page.value?.seoDescription ?? '',
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => page.value?.h1 ?? '',
  twitterDescription: () => page.value?.seoDescription ?? '',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [{ name: 'keywords', content: (page.value?.keywords ?? []).join(', ') }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Cambio Uruguay', item: SITE_URL },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Descuentos con tarjeta',
                item: `${SITE_URL}/descuentos-con-tarjeta-uruguay`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: page.value?.h1 ?? '',
                item: canonicalUrl.value,
              },
            ],
          },
          {
            // Las marcas con beneficio, en el orden en que la página las muestra. Sólo las
            // primeras: una ItemList de trescientos elementos no ayuda a nadie y pesa.
            '@type': 'ItemList',
            name: page.value?.h1 ?? '',
            numberOfItems: data.value?.totals.brands ?? 0,
            itemListElement: (data.value?.brands ?? []).slice(0, 25).map((brand, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: brand.name,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.6);
  display: flex;
  align-items: center;
  gap: 6px;
}
.lead {
  max-width: 75ch;
}
.bank-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.stat-num {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
}
.stat-label {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
/* El texto del emisor va citado y en cursiva: es la única parte de la página que no escribimos
   nosotros, y conviene que se note. */
.tier-text {
  font-style: italic;
  font-size: 0.95rem;
  line-height: 1.5;
}
.brand-list {
  list-style: none;
  margin: 0;
  padding: 0;
  columns: 2;
  column-gap: 24px;
}
@media (max-width: 599.98px) {
  .brand-list {
    columns: 1;
  }
}
.brand-list li {
  break-inside: avoid;
  padding: 3px 0;
  font-size: 0.875rem;
  line-height: 1.4;
}
.brand-name {
  font-weight: 600;
}
.brand-meta {
  display: block;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.rubro h3 a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.rubro h3 a:hover,
.rubro h3 a:focus-visible {
  text-decoration: underline;
}
.table-scroll {
  overflow-x: auto;
}
.cmp {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.cmp th,
.cmp td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  text-align: left;
}
.cmp .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.cmp tr.self {
  background: rgba(var(--v-theme-primary), 0.08);
  font-weight: 600;
}
.cmp a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.cmp a:hover,
.cmp a:focus-visible {
  text-decoration: underline;
}
.related {
  margin: 0;
  padding-left: 1.1rem;
}
.related li {
  margin-bottom: 6px;
  font-size: 0.9rem;
}

/* La marca es un enlace sólo cuando tiene página propia; el resto queda como texto. Token de
   link y no primary: en tema oscuro primary da 4,01:1 sobre la tarjeta y no llega a AA. */
.brand-link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.brand-link:hover {
  text-decoration: underline;
}
</style>
