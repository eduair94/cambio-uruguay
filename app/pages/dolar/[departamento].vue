<template>
  <!-- `data` is null only for an unknown slug, where setup throws a 404. Gating
       the whole page on it keeps that error-path SSR render empty (and crash-free)
       so the thrown 404 status is what the response carries. -->
  <div v-if="data" class="pb-8">
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-dolar pa-6">
            <div class="d-flex align-center ga-4 flex-wrap">
              <v-avatar size="56" class="d-none d-md-flex bg-white">
                <v-icon size="32" color="primary">mdi-map-marker-radius</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                  {{ $t('dolarDepto.h1', { department: departmentTitle }) }}
                </h1>
                <p class="text-body-1 text-grey-lighten-2 mb-0 dolar-intro">
                  {{ $t('dolarDepto.intro', { department: departmentTitle }) }}
                </p>
              </div>
            </div>
          </div>

          <v-card-text class="d-flex align-center flex-wrap ga-2 py-4">
            <v-chip color="primary" variant="tonal" size="small">
              <v-icon start size="small">mdi-bank</v-icon>
              {{ $t('dolarDepto.housesCount', { count: houses.length }) }}
            </v-chip>
            <v-chip color="success" variant="tonal" size="small">
              <v-icon start size="small">mdi-autorenew</v-icon>
              {{ $t('dolarDepto.updatedAuto') }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="pending">
      <v-col cols="12" class="text-center py-10">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-h6">{{ $t('dolarDepto.loading') }}</p>
      </v-col>
    </v-row>

    <!-- Houses table -->
    <template v-else>
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-table</v-icon>
              {{ $t('dolarDepto.tableTitle', { department: departmentTitle }) }}
            </v-card-title>

            <v-data-table
              v-if="houses.length"
              :headers="headers"
              :items="houses"
              :mobile="smAndDown"
              hide-default-footer
              :items-per-page="-1"
              density="compact"
              class="elevation-1"
              data-testid="dolar-houses"
            >
              <template #item.name="{ item }">
                <span class="font-weight-medium" data-testid="dolar-house-name">
                  {{ item.name }}
                </span>
              </template>
              <template #item.buy="{ item }">
                {{ formatRate(item.buy) }}
              </template>
              <template #item.sell="{ item }">
                {{ formatRate(item.sell) }}
              </template>
              <template #item.actions="{ item }">
                <v-btn
                  :to="localePath(`/sucursales/${item.origin}`)"
                  color="primary"
                  variant="tonal"
                  size="small"
                >
                  <v-icon start size="small">mdi-map-marker</v-icon>
                  {{ $t('dolarDepto.viewBranches') }}
                </v-btn>
              </template>
            </v-data-table>

            <!-- No houses -->
            <v-card-text v-else class="text-center pa-8" data-testid="dolar-empty">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-bank-off</v-icon>
              <h2 class="text-h6 mb-2">{{ $t('dolarDepto.emptyTitle') }}</h2>
              <p class="text-body-2 text-grey">
                {{ $t('dolarDepto.emptyText', { department: departmentTitle }) }}
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- SEO copy + comparator CTA -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card class="cta-dolar pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">
              {{ $t('dolarDepto.ctaTitle', { department: departmentTitle }) }}
            </h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              {{ $t('dolarDepto.ctaText') }}
            </p>
            <v-btn :to="localePath('/')" color="primary" variant="elevated">
              <v-icon start>mdi-chart-line</v-icon>
              {{ $t('dolarDepto.ctaButton') }}
            </v-btn>
          </v-card>
        </v-col>
      </v-row>

      <!-- Internal linking: other departments -->
      <v-row v-if="relatedDepartments.length" class="mt-2">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center py-3">
              <v-icon start>mdi-map-marker-multiple</v-icon>
              {{ $t('dolarDepto.otherDepartments') }}
            </v-card-title>
            <v-card-text class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="dept in relatedDepartments"
                :key="dept.slug"
                :to="localePath(`/dolar/${dept.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                {{ titleCaseDepartment(dept.name) }}
              </v-chip>
            </v-card-text>
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
import {
  departmentFromSlug,
  housesInDepartment,
  listDepartments,
  slugifyDepartment,
  type DepartmentEntry,
  type LocalDataMap,
} from '~/utils/departments'

// Validate the slug against the live department list BEFORE rendering. Running in
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
      const allNames = listDepartments(localData).map(d => d.name)
      return departmentFromSlug(String(route.params.departamento ?? ''), allNames) !== null
    } catch {
      // API unreachable: can't safely 404, so let the page render and degrade.
      return true
    }
  },
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { smAndDown } = useDisplay()
const { getProcessedExchangeData } = useApiService()

const MAX_RELATED = 12

const slug = computed(() => slugifyDepartment(String(route.params.departamento ?? '')))

// A house in this department joined with its current USD quote.
interface DepartmentHouseRow {
  origin: string
  name: string
  buy: number | null
  sell: number | null
}

// Shape resolved by the SSR fetch. `null` marks an unknown department slug (the
// `validate` hook normally rejects those first; this is the fallback signal).
interface DepartmentPageData {
  departmentName: string
  houses: DepartmentHouseRow[]
  related: DepartmentEntry[]
}

// SSR fetch: localData (for the department -> houses mapping) + today's quotes
// (for each house's current USD buy/sell). Keyed by slug so each department page
// is cached independently.
const { data, pending } = await useAsyncData<DepartmentPageData | null>(
  () => `dolar-departamento-${slug.value}`,
  async () => {
    const result = await getProcessedExchangeData('')
    const localData = (result?.localData ?? {}) as LocalDataMap
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]

    // Resolve the slug against the live list of department names.
    const allNames = listDepartments(localData).map(d => d.name)
    const departmentName = departmentFromSlug(slug.value, allNames)
    if (!departmentName) return null

    // Latest USD buy/sell per origin (last row wins; the snapshot is "today").
    const usdByOrigin = new Map<string, { buy: number | null; sell: number | null }>()
    for (const row of rows) {
      if (row.code !== 'USD') continue
      usdByOrigin.set(row.origin, { buy: row.buy ?? null, sell: row.sell ?? null })
    }

    const houses: DepartmentHouseRow[] = housesInDepartment(localData, departmentName).map(
      house => {
        const usd = usdByOrigin.get(house.origin)
        return {
          origin: house.origin,
          name: house.name,
          buy: usd?.buy ?? null,
          sell: usd?.sell ?? null,
        }
      }
    )

    const related = listDepartments(localData)
      .filter(d => d.name !== departmentName)
      .slice(0, MAX_RELATED)

    return { departmentName, houses, related }
  }
)

// The `validate` hook above 404s unknown slugs before this renders. This is a
// belt-and-suspenders fallback for the case where `validate` let the request
// through (API briefly unreachable) but the slug is in fact unknown: the template
// is gated on `data`, so this throw sets the 404 without a half-rendered page.
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Departamento no encontrado' })
}

// `data` is populated past this point; computeds stay null-safe for the SSR
// error-path render that may still run before the thrown 404 propagates.
const departmentName = computed(() => data.value?.departmentName ?? '')
const departmentTitle = computed(() => titleCaseDepartment(departmentName.value))
const houses = computed<DepartmentHouseRow[]>(() => data.value?.houses ?? [])
const relatedDepartments = computed<DepartmentEntry[]>(() => data.value?.related ?? [])

const headers = computed(() => [
  { title: t('dolarDepto.colHouse'), key: 'name', sortable: false },
  { title: t('dolarDepto.colBuy'), key: 'buy', sortable: true, align: 'end' as const },
  { title: t('dolarDepto.colSell'), key: 'sell', sortable: true, align: 'end' as const },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
])

// Title-case an UPPERCASE department name for display (e.g. "CERRO LARGO" ->
// "Cerro Largo"). Pure presentation; the slug/match logic stays in the util.
function titleCaseDepartment(name: string): string {
  return name.toLocaleLowerCase('es').replace(/\b\p{L}/gu, ch => ch.toLocaleUpperCase('es'))
}

const formatRate = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const canonicalUrl = computed(() => `https://cambio-uruguay.com/dolar/${slug.value}`)

// Branded OG image for the department page.
defineOgImageComponent('Cambio', {
  title: () => t('dolarDepto.ogTitle', { department: departmentTitle.value }),
  subtitle: () => t('dolarDepto.ogSubtitle'),
  tag: 'DÓLAR',
})

// SEO meta.
useSeoMeta({
  title: () => t('dolarDepto.metaTitle', { department: departmentTitle.value }),
  description: () => t('dolarDepto.metaDescription', { department: departmentTitle.value }),
  ogTitle: () => t('dolarDepto.metaTitle', { department: departmentTitle.value }),
  ogDescription: () => t('dolarDepto.metaDescription', { department: departmentTitle.value }),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('dolarDepto.metaTitle', { department: departmentTitle.value }),
  twitterDescription: () => t('dolarDepto.metaDescription', { department: departmentTitle.value }),
})

// Place + BreadcrumbList JSON-LD for rich results.
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
              '@type': 'Place',
              name: departmentTitle.value,
              address: {
                '@type': 'PostalAddress',
                addressRegion: departmentTitle.value,
                addressCountry: 'UY',
              },
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
                  name: t('dolarDepto.h1', { department: departmentTitle.value }),
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
.bg-gradient-dolar {
  background: linear-gradient(135deg, #1565c0 0%, #00897b 100%);
}

.dolar-intro {
  max-width: 760px;
  line-height: 1.6;
}

/* Readable CTA on dark theme (avoid Vuetify outlined color tinting the text) */
.cta-dolar {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
