<template>
  <!-- `data` is null only for an unknown origin, where setup throws a 404. Gating
       the whole page on it keeps that error-path SSR render empty (and crash-free)
       so the thrown 404 status is what the response carries. -->
  <div v-if="data" class="pb-8">
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-casa pa-6">
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
                  :to="localePath(`/historico/${origin}/${item.code}`)"
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
import { useDisplay } from 'vuetify/lib/composables/display.mjs'
import type { ExchangeRate } from '~/types/api'
import { slugifyDepartment, type LocalDataMap } from '~/utils/departments'
import { ratesForOrigin, type CasaRate } from '~/utils/currencyPages'

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

    return {
      name: entry.name && entry.name.trim() ? entry.name : origin.value,
      website: entry.website ?? '',
      bcu: entry.bcu ?? '',
      rates: ratesForOrigin(rows, origin.value),
      departments,
    }
  }
)

// The `validate` hook 404s unknown origins before this renders; belt-and-suspenders
// fallback that keeps the SSR error-path render empty.
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Casa de cambio no encontrada' })
}

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

// SEO meta.
useSeoMeta({
  title: () => t('casaPage.metaTitle', { casa: casaName.value }),
  description: () => t('casaPage.metaDescription', { casa: casaName.value }),
  ogTitle: () => t('casaPage.metaTitle', { casa: casaName.value }),
  ogDescription: () => t('casaPage.metaDescription', { casa: casaName.value }),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('casaPage.metaTitle', { casa: casaName.value }),
  twitterDescription: () => t('casaPage.metaDescription', { casa: casaName.value }),
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
</style>
