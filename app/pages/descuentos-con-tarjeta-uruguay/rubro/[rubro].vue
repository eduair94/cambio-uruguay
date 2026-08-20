<template>
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
        <VIcon size="small">{{ page.icon }}</VIcon>
        {{ page.label }} · descuentos vigentes
      </p>
      <h1 class="text-h5 text-sm-h4 font-weight-bold mb-2">{{ page.h1 }}</h1>
      <p class="text-body-1 text-medium-emphasis lead mb-4">{{ page.intro }}</p>

      <VRow v-if="data" dense>
        <VCol cols="6" md="4">
          <VCard variant="tonal" class="pa-3 h-100">
            <div class="stat-num">{{ fmt(data.totals.brands) }}</div>
            <div class="stat-label">marcas con descuento</div>
          </VCard>
        </VCol>
        <VCol cols="6" md="4">
          <VCard variant="tonal" class="pa-3 h-100">
            <div class="stat-num">{{ fmt(data.totals.locations) }}</div>
            <div class="stat-label">locales en el mapa</div>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="tonal" class="pa-3 h-100">
            <div class="stat-num">{{ fmt(data.banks.length) }}</div>
            <div class="stat-label">emisores con beneficio en el rubro</div>
          </VCard>
        </VCol>
      </VRow>

      <div class="d-flex flex-wrap ga-2 mt-3">
        <VBtn :to="mapLink" color="primary" size="small">
          <VIcon start size="small">mdi-map-marker-radius-outline</VIcon>
          Ver el rubro en el mapa
        </VBtn>
        <VBtn
          :to="localePath('/que-banco-tiene-mas-descuentos-uruguay')"
          variant="tonal"
          size="small"
        >
          <VIcon start size="small">mdi-chart-bar</VIcon>
          ¿Qué banco tiene más descuentos?
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
      <!-- 1. La pregunta del rubro: con qué tarjeta conviene -->
      <section class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-1">
          Qué tarjeta conviene para {{ page.label.toLowerCase() }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3 lead">
          Emisores ordenados por marcas adheridas dentro de este rubro. "Exclusivas" son las marcas
          que ningún otro emisor del mapa descuenta, y son la mejor medida de cuánto agrega esa
          tarjeta a las que ya tenés.
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
              <tr v-for="row in bankRows" :key="row.bankId">
                <td data-label="Emisor">
                  <span class="bank-dot mr-2" :style="{ background: row.color }" />
                  <NuxtLink v-if="row.to" :to="row.to">{{ row.bankName }}</NuxtLink>
                  <span v-else>{{ row.bankName }}</span>
                </td>
                <td class="num" data-label="Marcas">{{ fmt(row.brands) }}</td>
                <td class="num" data-label="Locales">{{ fmt(row.locations) }}</td>
                <td class="num" data-label="Con débito">{{ fmt(row.debit) }}</td>
                <td class="num" data-label="Exclusivas">{{ fmt(row.exclusive) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 2. Qué dice cada emisor, con el texto sin tocar y deduplicado -->
      <section class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-1">
          Qué ofrece cada emisor en {{ page.label.toLowerCase() }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3 lead">
          El texto es el que publica cada emisor, citado sin cambios. Un mismo emisor puede tener
          varios porque las campañas conviven; al lado va en cuántas marcas del rubro aplica.
        </p>

        <div v-for="group in tiersByBank" :key="group.bankId" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            <span class="bank-dot mr-2" :style="{ background: group.color }" />
            <NuxtLink v-if="group.to" :to="group.to">{{ group.bankName }}</NuxtLink>
            <span v-else>{{ group.bankName }}</span>
          </h3>
          <VCard v-for="tier in group.tiers" :key="tier.text" variant="outlined" class="mb-2 pa-3">
            <p class="tier-text mb-2">“{{ tier.text }}”</p>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                size="x-small"
                variant="tonal"
                :color="tier.kind === 'credit' ? 'primary' : undefined"
              >
                {{ tier.kind === 'credit' ? 'crédito' : 'débito' }}
              </VChip>
              <VChip size="x-small" variant="tonal">
                {{ fmt(tier.brands) }} marca{{ tier.brands === 1 ? '' : 's' }}
              </VChip>
              <VChip size="x-small" variant="tonal">
                {{ fmt(tier.locations) }} local{{ tier.locations === 1 ? '' : 'es' }}
              </VChip>
            </div>
          </VCard>
        </div>
      </section>

      <!-- 3. El directorio del rubro -->
      <section class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-1">{{ page.label }} con descuento en Uruguay</h2>
        <p class="text-body-2 text-medium-emphasis mb-3 lead">
          Ordenadas por cantidad de locales en el mapa. Al lado de cada una, los emisores que le dan
          beneficio hoy.
        </p>
        <ul class="brand-list">
          <li v-for="brand in data.brands" :key="brand.brandId">
            <span class="brand-name">{{ brand.name }}</span>
            <span class="brand-meta">
              {{ brand.locations }} local{{ brand.locations === 1 ? '' : 'es' }} ·
              {{ offerSummary(brand) }}
            </span>
          </li>
        </ul>
      </section>
    </template>

    <VAlert v-else type="info" variant="tonal" class="mb-8" icon="mdi-tag-off-outline">
      <p class="mb-1 font-weight-bold">En esta lectura no hay descuentos vigentes en el rubro</p>
      <p class="mb-0 text-body-2">
        El relevamiento no trajo comercios adheridos en {{ page.label.toLowerCase() }}. La página se
        rearma sola en la próxima lectura.
      </p>
    </VAlert>

    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-3">Descuentos en otros rubros</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="other in siblings"
          :key="other.slug"
          :to="localePath(`/descuentos-con-tarjeta-uruguay/rubro/${other.slug}`)"
          variant="tonal"
          size="small"
        >
          <VIcon start size="x-small">{{ other.icon }}</VIcon>
          {{ other.label }}
        </VChip>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-3">Descuentos por emisor</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="bank in bankPages"
          :key="bank.slug"
          :to="localePath(`/descuentos-con-tarjeta-uruguay/${bank.slug}`)"
          variant="tonal"
          size="small"
        >
          <span class="bank-dot mr-1" :style="{ background: bank.color }" />
          {{ bank.name }}
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
      :heading="`Preguntas frecuentes sobre descuentos en ${page.label.toLowerCase()}`"
      :expanded="true"
    />

    <p class="text-caption text-medium-emphasis mt-6 mb-0">
      Datos de Bankos (bankos.uy)<template v-if="generatedLabel">
        · última lectura {{ generatedLabel }}</template
      >. Este sitio no está afiliado a Bankos ni a los emisores mencionados; confirmá siempre las
      condiciones vigentes antes de pagar.
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BANKOS_BANK_BY_ID, dayRestrictionLabel } from '~/utils/bankos'
import type { BankSlice, BrandRow, OfferTier } from '~/utils/bankosBrands'
import {
  BANKOS_BANK_PAGES,
  BANKOS_CATEGORY_PAGES,
  BANKOS_SHARED_FAQ,
  bankPageForBankId,
  categoryPageSlugs,
  getCategoryPage,
} from '~/utils/bankosPages'
import type { FaqItem } from '~/utils/faqAnswers'

definePageMeta({
  validate: route => categoryPageSlugs().includes(String(route.params.rubro ?? '')),
})

const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.rubro ?? ''))
const page = computed(() => getCategoryPage(slug.value))
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Rubro no encontrado' })
}
const category = page.value.category

interface BrandsResponse {
  brands: BrandRow[]
  categories: { category: string; brands: number; locations: number }[]
  tiers: OfferTier[]
  banks: BankSlice[]
  totals: { brands: number; locations: number }
  source: string
  generatedAt: string | null
}

const { data, pending, error } = await useFetch<BrandsResponse>('/api/bankos/brands', {
  query: { rubro: category },
  key: `bankos-rubro-${slug.value}`,
})

const bankRows = computed(() =>
  (data.value?.banks ?? []).map(row => {
    const bankPage = bankPageForBankId(row.bankId)
    return {
      ...row,
      to: bankPage ? localePath(`/descuentos-con-tarjeta-uruguay/${bankPage.slug}`) : '',
    }
  })
)

/**
 * Los tramos agrupados por emisor, en el mismo orden del ranking de arriba.
 *
 * Acá no hace falta arrastrar el índice del tramo (a diferencia de la página de emisor): esta
 * sección no cruza tramos con marcas, sólo los muestra con su propio conteo.
 */
const tiersByBank = computed(() => {
  const tiers = data.value?.tiers ?? []
  return (data.value?.banks ?? [])
    .map(bank => {
      const bankPage = bankPageForBankId(bank.bankId)
      return {
        bankId: bank.bankId,
        bankName: bank.bankName,
        color: bank.color,
        to: bankPage ? localePath(`/descuentos-con-tarjeta-uruguay/${bankPage.slug}`) : '',
        tiers: tiers.filter(t => t.bankId === bank.bankId),
      }
    })
    .filter(group => group.tiers.length)
})

/**
 * Los emisores que descuentan esta marca, cada uno con SU restricción de días.
 *
 * La atribución no es cosmética: acá una marca puede tener beneficio de varios emisores y el día
 * lo declara cada beneficio por separado. Mostrar "solo lunes y martes" suelto, tomado del primer
 * emisor que traiga días, le colgaría esa restricción a los otros dos.
 */
function offerSummary(brand: BrandRow): string {
  return brand.offers
    .map(offer => {
      const name = BANKOS_BANK_BY_ID[offer.bankId]?.name ?? offer.bankId
      const days = dayRestrictionLabel(offer.days ?? null)
      return days ? `${name} (${days})` : name
    })
    .join(' · ')
}

const siblings = computed(() => BANKOS_CATEGORY_PAGES.filter(p => p.slug !== slug.value))

const bankPages = computed(() =>
  BANKOS_BANK_PAGES.map(p => ({
    slug: p.slug,
    name: BANKOS_BANK_BY_ID[p.bankId]?.name ?? p.bankId,
    color: BANKOS_BANK_BY_ID[p.bankId]?.color ?? '#888',
  }))
)

// El mapa ya acepta `?categoria=`: la página de análisis lo usa desde hace tiempo y el select se
// rellena con las categorías que el catálogo realmente trajo.
const mapLink = computed(() =>
  localePath(`/descuentos-con-tarjeta-uruguay?categoria=${encodeURIComponent(category)}`)
)

const faqItems = computed<FaqItem[]>(() => [...(page.value?.faq ?? []), ...BANKOS_SHARED_FAQ])

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
const canonicalUrl = computed(
  () => `${SITE_URL}/descuentos-con-tarjeta-uruguay/rubro/${slug.value}`
)

defineOgImageComponent('Cambio', {
  title: () => page.value?.h1 ?? 'Descuentos por rubro',
  subtitle: () => 'Qué tarjeta conviene en este rubro',
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
.cmp a,
.rubro-links a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.cmp a:hover,
.cmp a:focus-visible {
  text-decoration: underline;
}
h3 a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
h3 a:hover,
h3 a:focus-visible {
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
</style>
