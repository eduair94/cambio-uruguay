<template>
  <!-- `data` is null only for an unknown origin, where setup throws a 404. Gating
       the whole page on it keeps that error-path SSR render empty (and crash-free)
       so the thrown 404 status is what the response carries. -->
  <div v-if="data" class="pb-8">
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-casa pa-6 on-dark">
            <div class="d-flex align-center ga-4 flex-wrap">
              <v-avatar size="56" class="d-none d-md-flex bg-white">
                <v-icon size="32" color="primary">mdi-bank</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                  {{ $t('casaPage.h1', { casa: casaName }) }}
                </h1>
                <p class="text-body-1 text-grey-lighten-2 mb-0 casa-intro">
                  {{ $t('casaPage.intro', { casa: casaName }) }}
                </p>
              </div>
            </div>

            <div class="d-flex align-center flex-wrap ga-2 mt-4">
              <v-chip
                v-if="bcu"
                :href="bcu"
                target="_blank"
                rel="noopener noreferrer"
                color="white"
                variant="elevated"
                size="small"
                link
                data-testid="casa-bcu"
              >
                <v-icon start size="small">mdi-shield-check</v-icon>
                {{ $t('casaPage.bcuBadge') }}
              </v-chip>
              <v-chip
                v-if="website"
                :href="website"
                target="_blank"
                rel="noopener noreferrer"
                color="white"
                variant="outlined"
                size="small"
                link
              >
                <v-icon start size="small">mdi-web</v-icon>
                {{ $t('casaPage.website') }}
              </v-chip>
            </div>
          </div>

          <v-card-text class="d-flex align-center flex-wrap ga-2 py-4">
            <v-chip color="primary" variant="tonal" size="small">
              <v-icon start size="small">mdi-cash-multiple</v-icon>
              {{ $t('casaPage.currencyCount', { count: rates.length }) }}
            </v-chip>
            <v-chip color="success" variant="tonal" size="small">
              <v-icon start size="small">mdi-autorenew</v-icon>
              {{ $t('casaPage.updatedAuto') }}
            </v-chip>
            <v-spacer class="d-none d-sm-flex" />
            <ShareButtons :text="$t('casaPage.h1', { casa: casaName })" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="pending">
      <v-col cols="12" class="text-center py-10">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-h6">{{ $t('casaPage.loading') }}</p>
      </v-col>
    </v-row>

    <template v-else>
      <!-- Rates table -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-table</v-icon>
              {{ $t('casaPage.tableTitle', { casa: casaName }) }}
            </v-card-title>

            <v-data-table
              v-if="rates.length"
              :headers="headers"
              :items="rates"
              :mobile="smAndDown"
              hide-default-footer
              :items-per-page="-1"
              density="compact"
              class="elevation-1"
              data-testid="casa-rates"
            >
              <template #item.code="{ item }">
                <span class="font-weight-medium" data-testid="casa-rate-code">
                  {{ item.code }}
                </span>
                <span class="text-grey ms-2">{{ item.name }}</span>
              </template>
              <template #item.buy="{ item }">
                {{ formatRate(item.buy) }}
              </template>
              <template #item.sell="{ item }">
                {{ formatRate(item.sell) }}
              </template>
              <template #item.actions="{ item }">
                <v-btn
                  :to="localePath(canonicalRoutePath(`/historico/${origin}/${item.code}`))"
                  color="secondary"
                  variant="text"
                  size="small"
                >
                  <v-icon start size="small">mdi-chart-line</v-icon>
                  {{ $t('casaPage.viewHistory') }}
                </v-btn>
              </template>
            </v-data-table>

            <!-- No rates -->
            <v-card-text v-else class="text-center pa-8" data-testid="casa-empty">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-cash-remove</v-icon>
              <h2 class="text-h6 mb-2">{{ $t('casaPage.emptyTitle') }}</h2>
              <p class="text-body-2 text-grey">
                {{ $t('casaPage.emptyText', { casa: casaName }) }}
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Departments where the casa operates -->
      <v-row v-if="departments.length" class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-map-marker-multiple</v-icon>
              {{ $t('casaPage.departmentsTitle', { casa: casaName }) }}
            </v-card-title>
            <v-card-text>
              <v-btn
                :to="localePath(`/sucursales/${origin}`)"
                color="primary"
                variant="tonal"
                size="small"
                class="mb-3"
              >
                <v-icon start size="small">mdi-map-marker</v-icon>
                {{ $t('casaPage.viewBranches') }}
              </v-btn>
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="dept in departments"
                  :key="dept.slug"
                  :to="localePath(`/dolar/${dept.slug}`)"
                  color="secondary"
                  variant="tonal"
                  size="small"
                  link
                >
                  <v-icon start size="small">mdi-map-marker</v-icon>
                  {{ dept.title }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Récords del dólar de esta casa: hechos que ningún competidor de una sola cotización
           publica, y contenido distinto en cada URL. -->
      <v-row v-if="records" class="mt-2">
        <v-col cols="12">
          <v-card variant="flat" class="records-card pa-5 pa-md-6">
            <h2 class="text-h6 font-weight-bold mb-1">
              {{ $t('casaPage.recordsTitle', { casa: casaName }) }}
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ $t('casaPage.recordsSubtitle') }}
            </p>
            <dl class="cu-records mb-0">
              <div class="cu-record">
                <dt>{{ $t('records.max') }}</dt>
                <dd>
                  {{ formatRate(records.max.value) }}
                  <span class="text-medium-emphasis">· {{ formatDay(records.max.date) }}</span>
                </dd>
              </div>
              <div class="cu-record">
                <dt>{{ $t('records.min') }}</dt>
                <dd>
                  {{ formatRate(records.min.value) }}
                  <span class="text-medium-emphasis">· {{ formatDay(records.min.date) }}</span>
                </dd>
              </div>
              <div v-if="records.biggest" class="cu-record">
                <dt>{{ $t('records.biggestMove') }}</dt>
                <dd>
                  {{ records.biggest.pct.toFixed(2) }} %
                  <span class="text-medium-emphasis">· {{ formatDay(records.biggest.date) }}</span>
                </dd>
              </div>
              <div v-if="records.daysSinceHigh !== null" class="cu-record">
                <dt>{{ $t('records.daysSinceHigh') }}</dt>
                <dd>{{ $t('records.days', { days: records.daysSinceHigh }) }}</dd>
              </div>
            </dl>
            <p v-if="streakSentence" class="text-body-2 text-medium-emphasis mt-3 mb-0">
              {{ streakSentence }}
            </p>
          </v-card>
        </v-col>
      </v-row>

      <!-- Espejo de otra pizarra. Este hub es la página canónica de la marca, así que el hecho va
           acá y no sólo en el leaf de moneda: alguien que compara y ve cuatro casas con el mismo
           precio no está viendo un empate de mercado, está viendo una pizarra repetida. -->
      <v-row v-if="mirror" class="mt-2">
        <v-col cols="12">
          <VAlert type="info" variant="tonal" density="comfortable">
            <div class="font-weight-medium mb-1">
              {{ $t('mirror.title', { source: mirror.sourceName }) }}
            </div>
            <p class="mb-2 text-body-2">
              {{ $t('mirror.body', { casa: casaName, source: mirror.sourceName }) }}
            </p>
            <VBtn
              :to="localePath(`/casa/${mirror.source}`)"
              size="small"
              variant="tonal"
              density="comfortable"
            >
              {{ $t('mirror.cta', { source: mirror.sourceName }) }}
            </VBtn>
          </VAlert>
        </v-col>
      </v-row>

      <!-- SEO copy + comparator CTA -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card class="cta-casa pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">
              {{ $t('casaPage.ctaTitle', { casa: casaName }) }}
            </h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              {{ $t('casaPage.ctaText') }}
            </p>
            <div class="d-flex justify-center flex-wrap ga-2">
              <v-btn :to="localePath('/comparar')" color="primary" variant="elevated">
                <v-icon start>mdi-compare-horizontal</v-icon>
                {{ $t('casaPage.ctaButton') }}
              </v-btn>
              <v-btn :to="localePath('/cotizacion/dolar')" color="secondary" variant="tonal">
                <v-icon start>mdi-cash-multiple</v-icon>
                {{ $t('casaPage.ctaDolar') }}
              </v-btn>
              <v-btn :to="localePath('/casas-de-cambio')" color="secondary" variant="tonal">
                <v-icon start>mdi-bank</v-icon>
                {{ $t('casaPage.ctaDirectorio') }}
              </v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import type { ExchangeRate } from '~/types/api'
import { slugifyDepartment, type LocalDataMap } from '~/utils/departments'
import { ratesForOrigin, type CasaRate } from '~/utils/currencyPages'
import { pickOriginRate } from '~/utils/rateSource'
import { mirrorOf } from '~/utils/rateMirrors'
import { computePageRecords } from '~/utils/rateStats'
// `formatBareRate` va aliaseado: esta página ya tiene un `formatRate` local que arma la moneda
// entera ("$ 39,00"), y la meta description quiere el número pelado porque el "$" es parte de
// la oración.
import { formatRate as formatBareRate, selectTypeRows } from '~/utils/rateAnswer'

const MAX_DEPARTMENTS = 8

// Validate the origin against the live localData keys BEFORE rendering. Running in
// the route guard yields a real 404 status (on SSR and client navigation) and,
// unlike throwing inside setup, never partially renders this component. The
// callback is self-contained (definePageMeta is a compiler macro), so it fetches
// localData directly rather than via the composable.
definePageMeta({
  validate: async route => {
    const config = useRuntimeConfig()
    const baseURL = import.meta.server ? config.apiBaseServer : config.public.apiBase
    try {
      const localData = await $fetch<LocalDataMap>('/localData', { baseURL })
      return String(route.params.origin ?? '') in localData
    } catch {
      // API unreachable: can't safely 404, so let the page render and degrade.
      return true
    }
  },
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { smAndDown } = useDisplay()
const { getProcessedExchangeData } = useApiService()

const origin = computed(() => String(route.params.origin ?? ''))

/** Las casas que replican la pizarra de otra: ver `utils/rateMirrors.ts`. */
const mirror = computed(() => mirrorOf(origin.value))

// A department where this casa has branches, with slug + display title.
interface CasaDepartment {
  slug: string
  title: string
}

// Shape resolved by the SSR fetch. `null` marks an unknown origin (the `validate`
// hook normally rejects those first; this is the fallback signal).
interface CasaPageData {
  name: string
  website: string
  bcu: string
  rates: CasaRate[]
  departments: CasaDepartment[]
  /** This casa's own USD quote, or null when it publishes none (e.g. BCU). */
  usdToday: { buy: number; sell: number } | null
}

// Title-case an UPPERCASE department name for display (e.g. "CERRO LARGO" ->
// "Cerro Largo"). Pure presentation.
function titleCaseDepartment(name: string): string {
  return name.toLocaleLowerCase('es').replace(/\b\p{L}/gu, ch => ch.toLocaleUpperCase('es'))
}

// SSR fetch: localData (for the casa's name/website/bcu/departments) + today's
// quotes (for this casa's currency rates). Keyed by origin so each casa page is
// cached independently.
const { data, pending } = await useAsyncData<CasaPageData | null>(
  () => `casa-${origin.value}`,
  async () => {
    const result = await getProcessedExchangeData('')
    const localData = (result?.localData ?? {}) as LocalDataMap
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]

    const entry = localData[origin.value]
    if (!entry) return null

    const departments: CasaDepartment[] = (entry.departments ?? [])
      .filter(dep => dep && dep.trim())
      .slice(0, MAX_DEPARTMENTS)
      .map(dep => ({ slug: slugifyDepartment(dep), title: titleCaseDepartment(dep) }))

    // This casa's own USD quote, resolved server-side so the SERP snippet leads
    // with the number the "cambio {casa}" query is really asking for. Only the
    // two scalars cross into the hydration payload, not the market array.
    const usd = pickOriginRate(rows, origin.value)

    return {
      name: entry.name && entry.name.trim() ? entry.name : origin.value,
      website: entry.website ?? '',
      bcu: entry.bcu ?? '',
      rates: ratesForOrigin(rows, origin.value),
      departments,
      usdToday: usd ? { buy: usd.buy, sell: usd.sell } : null,
    }
  }
)

// The `validate` hook 404s unknown origins before this renders; belt-and-suspenders
// fallback that keeps the SSR error-path render empty.
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Casa de cambio no encontrada' })
}

// Récords del dólar de ESTA casa, sobre 12 meses. Es el bloque que el plan de crecimiento
// orgánico llama «el patrón del moat»: hechos que ningún competidor de una sola cotización puede
// publicar, y texto distinto en cada URL, que es lo que les faltaba a las plantillas casi
// idénticas que Google dejó sin indexar.
//
// Tres decisiones deliberadas:
//   - `lazy: true`: el hub ya renderiza nombre, sucursales y tabla de cotizaciones con su propio
//     fetch bloqueante. Los récords son enriquecimiento: no valen retrasar el TTFB de la página.
//   - Se salta en los espejos de BROU: sus récords SON los de BROU y publicarlos duplica cuatro
//     URLs. Ver `utils/rateMirrors.ts`.
//   - Si el endpoint falla, `records` queda en null y el bloque no se renderiza. Una casa sin
//     serie es un caso normal (recién agregada, scraper caído), no un error de la página.
const { getEvolutionData } = useApiService()

// La reducción va en el `transform`, no en un computed aparte, y es la diferencia entre serializar
// cuatro escalares o un año entero de serie. `transform` corre ANTES de que Nuxt escriba el
// payload, así que lo que viaja en __NUXT_DATA__ es lo que devuelve.
//
// Medido el 2026-09-03 en /casa/brou: la página pesa 332.818 b y su bloque __NUXT_DATA__ 73.740,
// de los cuales 65.981 —el 89 %— eran las 732 filas de `evolution`, cada una con date, buy, sell,
// origin, code, type y name. La página no dibuja ningún gráfico: toda esa serie se reducía a
// máximo, mínimo, mayor salto y días desde el máximo. Son 110 URLs con datos en Search Console.
const { data: records } = await useAsyncData(
  () => `casa-records-${origin.value}`,
  async () => {
    if (mirror.value) return null
    const res = await getEvolutionData(origin.value, 'USD', undefined, 12)
    return res.error ? null : res.data
  },
  {
    lazy: true,
    watch: [origin],
    transform: (raw: unknown) => {
      const rows = (raw as { evolution?: { date: string; sell: number; type?: string }[] } | null)
        ?.evolution
      if (!rows?.length) return null
      // Sin filtrar por tipo, la serie mezcla billete, cable e interbancario del mismo día y el
      // "máximo" sale de comparar cosas distintas. `selectTypeRows` se queda con un solo tipo.
      const typed = selectTypeRows(rows, undefined)
      return computePageRecords(
        typed
          .map(r => ({ date: r.date, value: r.sell }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      )
    },
  }
)

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    timeZone: 'America/Montevideo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

const streakSentence = computed(() => {
  const r = records.value
  if (!r || r.streak.direction === 'flat' || r.streak.days < 1) return ''
  return t(r.streak.direction === 'up' ? 'records.streakUp' : 'records.streakDown', {
    days: r.streak.days,
  })
})

const casaName = computed(() => data.value?.name ?? '')
const website = computed(() => data.value?.website ?? '')
const bcu = computed(() => data.value?.bcu ?? '')
const rates = computed<CasaRate[]>(() => data.value?.rates ?? [])
const departments = computed<CasaDepartment[]>(() => data.value?.departments ?? [])

const headers = computed(() => [
  { title: t('casaPage.colCurrency'), key: 'code', sortable: false },
  { title: t('casaPage.colBuy'), key: 'buy', sortable: true, align: 'end' as const },
  { title: t('casaPage.colSell'), key: 'sell', sortable: true, align: 'end' as const },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
])

const formatRate = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const canonicalUrl = computed(() => `https://cambio-uruguay.com/casa/${origin.value}`)

// Branded OG image for the casa page.
defineOgImageComponent('Cambio', {
  title: () => casaName.value,
  subtitle: () => t('casaPage.ogSubtitle'),
  locale: locale.value as 'es' | 'en' | 'pt',
  tag: 'CASA',
})

// This page is the canonical hub for the "cambio {casa}" brand query, so its
// snippet leads with the casa's own dollar rate. Falls back to the generic
// sentence for the origins that publish no USD quote (BCU quotes UI/UR/UP only)
// rather than borrowing another casa's number.
const seoDescription = computed(() => {
  const usd = data.value?.usdToday
  if (!usd) return t('casaPage.metaDescription', { casa: casaName.value })
  return t('casaPage.metaDescriptionLive', {
    casa: casaName.value,
    buy: formatBareRate(usd.buy),
    sell: formatBareRate(usd.sell),
  })
})

// SEO meta.
useSeoMeta({
  title: () => t('casaPage.metaTitle', { casa: casaName.value }),
  description: () => seoDescription.value,
  ogTitle: () => t('casaPage.metaTitle', { casa: casaName.value }),
  ogDescription: () => seoDescription.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('casaPage.metaTitle', { casa: casaName.value }),
  twitterDescription: () => seoDescription.value,
})

// FinancialService + BreadcrumbList JSON-LD for rich results.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'FinancialService',
              name: casaName.value,
              ...(website.value ? { url: website.value } : {}),
              areaServed: { '@type': 'Country', name: 'Uruguay' },
              ...(departments.value.length
                ? {
                    address: departments.value.map(dep => ({
                      '@type': 'PostalAddress',
                      addressRegion: dep.title,
                      addressCountry: 'UY',
                    })),
                  }
                : {}),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Cambio Uruguay',
                  item: 'https://cambio-uruguay.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: t('casaPage.h1', { casa: casaName.value }),
                  item: canonicalUrl.value,
                },
              ],
            },
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.bg-gradient-casa {
  background: linear-gradient(135deg, #2f81f7 0%, #6a3df7 100%);
}

.casa-intro {
  max-width: 760px;
  line-height: 1.6;
}

/* Readable CTA on dark theme (avoid Vuetify outlined color tinting the text) */
.cta-casa {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

.records-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .records-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}

.cu-records {
  display: grid;
  gap: 0.75rem 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  margin: 0;
}
.cu-record dt {
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  opacity: 0.75;
  text-transform: uppercase;
}
.cu-record dd {
  font-size: 1.05rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin: 0;
}
</style>
