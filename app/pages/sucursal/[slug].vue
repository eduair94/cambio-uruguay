<template>
  <div v-if="branch" class="branch-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <div class="mb-4">
            <VBtn :to="localePath('/sucursal')" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Todas las sucursales
            </VBtn>
          </div>

          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-map-marker</VIcon>
              {{ branch.deptLabel }}
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ heading }}</h1>
            <p class="text-body-1 branch-lead">{{ lead }}</p>
            <ShareButtons class="mt-4" :url="canonicalUrl" :text="heading" />
          </header>

          <!-- NAP card: the data that makes this page worth its own URL -->
          <VCard variant="flat" class="branch-card pa-5 mb-6">
            <VRow>
              <VCol cols="12" sm="6">
                <div class="branch-field">
                  <span class="branch-label">Dirección</span>
                  <span class="branch-value">{{ branch.addressLabel || '—' }}</span>
                </div>
                <div class="branch-field">
                  <span class="branch-label">Departamento</span>
                  <NuxtLink :to="localePath(`/dolar/${branch.deptSlugValue}`)" class="branch-link">
                    {{ branch.deptLabel }}
                  </NuxtLink>
                </div>
                <div v-if="branch.phoneLabel" class="branch-field">
                  <span class="branch-label">Teléfono</span>
                  <a v-if="telLink" :href="telLink" class="branch-link">{{ branch.phoneLabel }}</a>
                  <span v-else class="branch-value">{{ branch.phoneLabel }}</span>
                </div>
              </VCol>
              <VCol cols="12" sm="6">
                <div v-if="hoursText" class="branch-field">
                  <span class="branch-label">Horario publicado</span>
                  <span class="branch-value">{{ hoursText }}</span>
                </div>
                <div class="branch-field">
                  <span class="branch-label">Casa de cambio</span>
                  <NuxtLink :to="localePath(`/casa/${branch.origin}`)" class="branch-link">
                    {{ branch.casaName }}
                  </NuxtLink>
                </div>
                <div v-if="casa?.website" class="branch-field">
                  <span class="branch-label">Sitio oficial</span>
                  <a
                    :href="casa.website"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    class="branch-link"
                    >{{ websiteHost }}</a
                  >
                </div>
              </VCol>
            </VRow>

            <div class="d-flex flex-wrap ga-2 mt-4">
              <VBtn
                v-if="mapsHref"
                :href="mapsHref"
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-google-maps"
              >
                Cómo llegar
              </VBtn>
              <VBtn
                v-if="telLink"
                :href="telLink"
                color="primary"
                variant="tonal"
                size="small"
                prepend-icon="mdi-phone"
              >
                Llamar
              </VBtn>
            </div>
          </VCard>

          <!-- Weekly hours, only when the free-text schedule parsed unambiguously -->
          <section v-if="weekly.length" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Horarios de {{ branch.casaName }}</h2>
            <p class="text-body-2 text-medium-emphasis mb-3">
              Horario declarado ante el Banco Central para esta sucursal. Los feriados y las
              vísperas pueden alterarlo: si vas por algo puntual, conviene confirmar por teléfono.
            </p>
            <div class="table-scroll">
              <table class="branch-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Atención</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in weekly" :key="row.day">
                    <td>{{ row.day }}</td>
                    <td data-label="Atención">{{ row.hours }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Today's quotes for this casa -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Cotizaciones de hoy en {{ branch.casaName }}
            </h2>
            <p v-if="rates.length" class="text-body-2 text-medium-emphasis mb-3">
              Precios que publica {{ branch.casaName }} hoy. La pizarra es de la casa, no de la
              sucursal: salvo aviso en el local, estos son los valores que te aplican en
              {{ branch.addressLabel || branch.deptLabel }}.
            </p>
            <div v-if="rates.length" class="table-scroll">
              <table class="branch-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Moneda</th>
                    <th>Compra</th>
                    <th>Venta</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rate in rates" :key="`${rate.code}-${rate.type}`">
                    <td>{{ rate.name }}</td>
                    <td data-label="Compra">{{ formatMoney(rate.buy) }}</td>
                    <td data-label="Venta">{{ formatMoney(rate.sell) }}</td>
                    <td data-label="Tipo">{{ rate.type || 'Billete' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <VAlert v-else type="info" variant="tonal" density="comfortable" class="mt-2">
              Esta casa no publica cotizaciones en el momento de generar la página. Mirá la
              comparativa completa para ver quién sí lo hace hoy.
            </VAlert>
            <div class="d-flex flex-wrap ga-2 mt-3">
              <VChip :to="localePath('/')" color="primary" variant="tonal" size="small" link>
                <VIcon start size="small">mdi-compare-horizontal</VIcon>
                Comparar todas las casas
              </VChip>
              <VChip
                :to="localePath(`/historico/${branch.origin}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-chart-line</VIcon>
                Histórico de {{ branch.casaName }}
              </VChip>
            </div>
          </section>

          <!-- Map, only when the coordinate is trustworthy for this department -->
          <section v-if="mapBranches.length" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Dónde queda</h2>
            <!-- `fit-to-markers` y no un centro fijo: sin esto el mapa abría en Montevideo con
                 zoom 15 para CUALQUIER sucursal, así que la de Rivera o la de Salto se veían como
                 un mapa vacío del centro de Montevideo. Encuadra sobre el punto real. -->
            <LocationsMap
              :branches="mapBranches"
              :zoom="15"
              fit-to-markers
              height="42vh"
              :directions-label="t('map.directions')"
            />
          </section>

          <!-- Other branches of the same casa -->
          <section v-if="siblings.length" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Otras sucursales de {{ branch.casaName }}</h2>
            <VList density="comfortable" class="branch-list">
              <VListItem
                v-for="sibling in siblings"
                :key="sibling.slug"
                :to="localePath(`/sucursal/${sibling.slug}`)"
              >
                <template #prepend>
                  <VIcon size="small" color="primary">mdi-store-marker-outline</VIcon>
                </template>
                <VListItemTitle>{{ sibling.addressLabel }}</VListItemTitle>
                <VListItemSubtitle>{{ sibling.deptLabel }}</VListItemSubtitle>
              </VListItem>
            </VList>
            <VBtn
              :to="localePath(`/sucursales/${branch.origin}`)"
              variant="text"
              size="small"
              class="mt-2 px-1"
            >
              Ver la lista completa
              <VIcon end size="small">mdi-arrow-right</VIcon>
            </VBtn>
          </section>

          <!-- Alternatives nearby: one branch per competing casa in the department -->
          <section v-if="competitors.length" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Otras casas de cambio en {{ branch.deptLabel }}
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-3">
              Antes de cambiar conviene mirar al menos dos pizarras: en un mismo departamento la
              diferencia entre la mejor y la peor cotización suele ser de varios pesos por dólar.
            </p>
            <VList density="comfortable" class="branch-list">
              <VListItem
                v-for="competitor in competitors"
                :key="competitor.slug"
                :to="localePath(`/sucursal/${competitor.slug}`)"
              >
                <template #prepend>
                  <VIcon size="small" color="primary">mdi-bank-outline</VIcon>
                </template>
                <VListItemTitle>{{ competitor.casaName }}</VListItemTitle>
                <VListItemSubtitle>{{ competitor.addressLabel }}</VListItemSubtitle>
              </VListItem>
            </VList>
          </section>

          <VCard variant="flat" class="branch-related pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                :to="localePath(`/dolar/${branch.deptSlugValue}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-map-marker</VIcon>
                Dólar en {{ branch.deptLabel }}
              </VChip>
              <VChip
                :to="localePath('/casa-de-cambio-cerca-de-mi')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-crosshairs-gps</VIcon>
                Casa de cambio cerca mío
              </VChip>
              <VChip :to="localePath('/mapa')" color="primary" variant="tonal" size="small" link>
                <VIcon start size="small">mdi-map</VIcon>
                Mapa de casas de cambio
              </VChip>
              <VChip
                :to="localePath('/casas-de-cambio')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-format-list-bulleted</VIcon>
                Comparativa de casas
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import LocationsMap from '~/components/map/LocationsMap.vue'
import type { ExchangeRate } from '~/types/api'
import {
  branchDescription,
  branchTitle,
  deptSlug,
  displayableHours,
  nearbyCompetitors,
  openingHoursSpecification,
  siblingBranches,
  telHref,
  weeklyHoursTable,
  type BranchPage,
} from '~/utils/branches'
import { ratesForOrigin, type CasaRate } from '~/utils/currencyPages'

interface BranchCasa {
  origin: string
  name: string
  website: string
  maps: string
  bcu: string
  departments: string[]
}
interface BranchDirectory {
  branches: BranchPage[]
  casas: Record<string, BranchCasa>
}

// Reject unknown slugs in the route guard, not in setup. Throwing `createError`
// after an `await` inside setup renders the error page but answers 200, which
// would let Google index every typo as a soft 404; `validate` returns a real
// 404 on SSR and on client navigation alike. The directory route it reads is
// cached in Nitro, so this costs no upstream call.
definePageMeta({
  validate: async route => {
    try {
      const directory = await $fetch<{ branches: Array<{ slug: string }> }>('/api/branches')
      return (directory?.branches ?? []).some(
        branch => branch.slug === String(route.params.slug ?? '')
      )
    } catch {
      // Directory unreachable: can't safely 404, so render and degrade.
      return true
    }
  },
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { getProcessedExchangeData } = useApiService()

const slug = computed(() => String(route.params.slug ?? ''))

// The directory is one cached Nitro route shared by every branch page, the
// `/sucursal` index and the sitemap, so all three agree on the slug set.
//
// El `transform` deja sólo las sucursales que ESTA página puede llegar a mostrar, y en esta
// familia importa más que en ninguna otra: son 528 páginas y cada una serializaba el directorio
// entero. Medido en producción el 2026-09-03 sobre /sucursal/alter-cambio-misiones-1375, la página
// pesaba 534.869 bytes y 233.275 eran este documento — el 44 %, repetido 528 veces.
//
// Conserva la MISMA forma a propósito, en vez de devolver `{branch, siblings, competidores}`: así
// los computeds de abajo no cambian y el recorte no puede alterar lo que se renderiza. Y es
// idempotente — `siblingBranches` y `nearbyCompetitors` sobre el subconjunto eligen exactamente lo
// mismo que sobre la lista completa, porque el subconjunto ES lo que ellas eligieron.
//
// La clave del caché lleva el slug porque el contenido ahora depende de él. Con la clave compartida
// —que /sucursal y /sucursal/<slug> usaban igual— la segunda página renderizada en el mismo proceso
// se habría quedado con el recorte de la primera.
const { data: directory } = await useAsyncData(
  `branch-directory-${route.params.slug}`,
  () => $fetch<BranchDirectory>('/api/branches'),
  {
    transform: (all: BranchDirectory): BranchDirectory => {
      const wanted = String(route.params.slug ?? '')
      const found = (all?.branches ?? []).find(item => item.slug === wanted)
      if (!found) return { branches: [], casas: {} }
      const keep = [
        found,
        ...siblingBranches(found, all.branches),
        ...nearbyCompetitors(found, all.branches),
      ]
      const casas: BranchDirectory['casas'] = {}
      for (const b of keep) {
        const casa = all.casas?.[b.origin]
        if (casa) casas[b.origin] = casa
      }
      return { branches: keep, casas }
    },
  }
)

const branch = computed(() => {
  const found = directory.value?.branches.find(item => item.slug === slug.value)
  return found ? { ...found, deptSlugValue: deptSlug(found.dept) } : null
})

// Unknown slug (or an upstream outage that emptied the feed) must 404 rather
// than render an empty shell that Google would index as a soft 404.
if (!branch.value) {
  throw createError({ statusCode: 404, statusMessage: 'Sucursal no encontrada' })
}

const casa = computed(() => directory.value?.casas[branch.value?.origin ?? ''] ?? null)

const heading = computed(() => (branch.value ? branchTitle(branch.value) : ''))
const lead = computed(() => (branch.value ? branchDescription(branch.value) : ''))
const hoursText = computed(() => displayableHours(branch.value?.hoursLabel ?? ''))
const weekly = computed(() => weeklyHoursTable(branch.value?.hoursLabel ?? ''))
const telLink = computed(() => telHref(branch.value?.phoneLabel ?? ''))

const websiteHost = computed(() => {
  const url = casa.value?.website
  if (!url) return ''
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
})

const mapsHref = computed(() => {
  const item = branch.value
  if (!item) return ''
  if (item.mapUrl) return item.mapUrl
  const query = `${item.casaName} ${item.addressLabel} ${item.deptLabel} Uruguay`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
})

// Only a coordinate we trust reaches the map — see `utils/branches.ts` on why a
// slice of the feed carries another department's lat/lng.
const mapBranches = computed(() =>
  branch.value && branch.value.hasTrustedCoordinate
    ? [
        {
          origin: branch.value.origin,
          id: branch.value.id,
          name: branch.value.casaName,
          dept: branch.value.deptLabel,
          locality: '',
          address: branch.value.addressLabel,
          phone: branch.value.phoneLabel,
          hours: hoursText.value,
          lat: branch.value.lat,
          lng: branch.value.lng,
          mapUrl: branch.value.mapUrl,
          source: 'bcu' as const,
        },
      ]
    : []
)

const siblings = computed(() =>
  branch.value ? siblingBranches(branch.value, directory.value?.branches ?? []) : []
)
const competitors = computed(() =>
  branch.value ? nearbyCompetitors(branch.value, directory.value?.branches ?? []) : []
)

// This casa's live quotes. Lazy: the NAP block above is the reason the page
// exists and must not wait on the market payload.
const { data: rateData } = await useAsyncData(
  () => `branch-rates-${branch.value?.origin ?? ''}`,
  async () => {
    const origin = branch.value?.origin
    if (!origin) return [] as CasaRate[]
    const result = await getProcessedExchangeData('')
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    return ratesForOrigin(rows, origin)
  },
  { lazy: true }
)

const rates = computed<CasaRate[]>(() => rateData.value ?? [])

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—'
  return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}

const canonicalUrl = computed(() => `https://cambio-uruguay.com/sucursal/${slug.value}`)

defineOgImageComponent('Cambio', {
  title: () => branch.value?.casaName ?? '',
  subtitle: () => `${branch.value?.addressLabel ?? ''} · ${branch.value?.deptLabel ?? ''}`,
  tag: 'SUCURSAL',
})

useSeoMeta({
  title: () => `${heading.value} | Cambio Uruguay`,
  description: () => lead.value,
  ogTitle: () => heading.value,
  ogDescription: () => lead.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

// LocalBusiness + BreadcrumbList. `geo` and `openingHoursSpecification` are
// emitted ONLY when we could verify them: a wrong coordinate or an unparseable
// schedule is left out rather than guessed, because bad structured data about a
// physical place is worse than none.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => {
        const item = branch.value
        if (!item) return '{}'
        const hoursSpec = openingHoursSpecification(item.hoursLabel)
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'FinancialService',
              '@id': `${canonicalUrl.value}#branch`,
              name: `${item.casaName} — ${item.addressLabel}`,
              parentOrganization: { '@type': 'Organization', name: item.casaName },
              url: canonicalUrl.value,
              ...(item.phoneLabel ? { telephone: item.phoneLabel } : {}),
              ...(casa.value?.website ? { sameAs: [casa.value.website] } : {}),
              address: {
                '@type': 'PostalAddress',
                streetAddress: item.addressLabel,
                addressRegion: item.deptLabel,
                addressCountry: 'UY',
              },
              ...(item.hasTrustedCoordinate
                ? { geo: { '@type': 'GeoCoordinates', latitude: item.lat, longitude: item.lng } }
                : {}),
              ...(hoursSpec.length ? { openingHoursSpecification: hoursSpec } : {}),
              currenciesAccepted: 'UYU, USD',
              areaServed: { '@type': 'AdministrativeArea', name: item.deptLabel },
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
                  name: 'Sucursales',
                  item: 'https://cambio-uruguay.com/sucursal',
                },
                { '@type': 'ListItem', position: 3, name: heading.value, item: canonicalUrl.value },
              ],
            },
          ],
        })
      }),
    },
  ],
})
</script>

<style scoped>
.branch-lead {
  line-height: 1.7;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.branch-card,
.branch-related {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}

.branch-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 14px;
}
.branch-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.branch-value {
  font-size: 0.98rem;
  line-height: 1.5;
}
.branch-link {
  font-size: 0.98rem;
  font-weight: 600;
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.branch-link:hover {
  text-decoration: underline;
}

.branch-list {
  background: transparent;
}

.table-scroll {
  overflow-x: auto;
}
.branch-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.branch-table th,
.branch-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
}
.branch-table thead th {
  font-weight: 700;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.branch-table tbody td:first-child {
  font-weight: 600;
}
</style>
