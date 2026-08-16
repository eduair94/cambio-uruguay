<template>
  <div v-if="facts" class="casa-intent-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <div class="mb-4">
            <VBtn :to="localePath(`/casa/${origin}`)" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Todo sobre {{ facts.name }}
            </VBtn>
          </div>

          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">{{ meta.icon }}</VIcon>
              {{ meta.tag }}
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ heading }}</h1>
            <p class="text-body-1 casa-lead">{{ description }}</p>
            <ShareButtons class="mt-4" :url="canonicalUrl" :text="heading" />
          </header>

          <!-- Sibling intents: the reader who wanted the phone, not the rate -->
          <div class="d-flex flex-wrap ga-2 mb-6">
            <VChip
              v-for="other in siblingIntents"
              :key="other"
              :to="localePath(`/casa/${origin}/${other}`)"
              size="small"
              variant="tonal"
              color="primary"
              link
            >
              <VIcon start size="small">{{ intentMeta(other).icon }}</VIcon>
              {{ intentMeta(other).label }}
            </VChip>
          </div>

          <VDivider class="mb-6" />

          <!-- HORARIOS -->
          <template v-if="intent === 'horarios'">
            <section class="mb-8">
              <p class="text-body-1 casa-prose mb-4">
                Estos son los horarios que {{ facts.name }} declaró ante el Banco Central para cada
                una de sus {{ hoursBranches.length }}
                {{ hoursBranches.length === 1 ? 'sucursal' : 'sucursales' }}{{ whereSuffix }}. Son
                el horario habitual de atención al público: en vísperas de feriado, el 24 y el 31 de
                diciembre y durante la Semana de Turismo suelen recortarse, así que para un trámite
                que no admite volver otro día conviene confirmar por teléfono.
              </p>
              <div v-for="branch in hoursBranches" :key="branch.slug" class="casa-branch mb-5">
                <h2 class="text-h6 font-weight-bold mb-1">
                  <NuxtLink :to="localePath(`/sucursal/${branch.slug}`)" class="casa-link">
                    {{ branch.addressLabel }}
                  </NuxtLink>
                </h2>
                <p class="text-caption text-medium-emphasis mb-2">
                  {{ branch.deptLabel
                  }}<span v-if="branch.phoneLabel"> · Tel. {{ branch.phoneLabel }}</span>
                </p>
                <div v-if="weeklyFor(branch).length" class="table-scroll">
                  <table class="casa-table cu-mobile-cards">
                    <thead>
                      <tr>
                        <th>Día</th>
                        <th>Atención</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in weeklyFor(branch)" :key="row.day">
                        <td>{{ row.day }}</td>
                        <td data-label="Atención">{{ row.hours }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-body-2 casa-prose mb-0">
                  {{ hoursTextFor(branch) }}
                </p>
              </div>
            </section>
          </template>

          <!-- TELÉFONO -->
          <template v-else-if="intent === 'telefono'">
            <section class="mb-8">
              <p class="text-body-1 casa-prose mb-4">
                {{ facts.name }} publica {{ phoneBranches.length }}
                {{ phoneBranches.length === 1 ? 'número' : 'números' }} de contacto{{
                  whereSuffix
                }}. Son los teléfonos que la propia institución informa al Banco Central, uno por
                local: para consultar una cotización por monto grande, reservar billetes de una
                denominación puntual o confirmar si abren un feriado, llamar al local que te queda
                cerca funciona mejor que un número central.
              </p>
              <div class="table-scroll">
                <table class="casa-table cu-mobile-cards">
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th>Teléfono</th>
                      <th>Departamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="branch in phoneBranches" :key="branch.slug">
                      <td>
                        <NuxtLink :to="localePath(`/sucursal/${branch.slug}`)" class="casa-link">
                          {{ branch.addressLabel }}
                        </NuxtLink>
                      </td>
                      <td data-label="Teléfono">
                        <a v-if="telFor(branch)" :href="telFor(branch)!" class="casa-link">
                          {{ branch.phoneLabel }}
                        </a>
                        <span v-else>{{ branch.phoneLabel }}</span>
                      </td>
                      <td data-label="Departamento">{{ branch.deptLabel }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="text-body-2 text-medium-emphasis mt-4 mb-0">
                Ningún operador serio te va a pedir por teléfono una clave, un código que te llegó
                por SMS ni que transfieras dinero a una cuenta personal. Si la llamada la iniciaron
                ellos y te piden eso, cortá y llamá vos al número publicado acá.
              </p>
            </section>
          </template>

          <!-- OPINIONES -->
          <template v-else-if="intent === 'opiniones'">
            <section class="mb-8">
              <h2 class="text-h5 font-weight-bold mb-3">
                Qué se puede verificar de {{ facts.name }}
              </h2>
              <p class="text-body-1 casa-prose mb-3">
                Una opinión suelta en internet no dice mucho. Estos son los datos comprobables:
                cuántas reseñas públicas tiene, si figura en el registro del Banco Central, cuántos
                locales atiende y qué tan competitiva es su pizarra hoy contra el resto del mercado.
              </p>
              <div class="table-scroll">
                <table class="casa-table cu-mobile-cards">
                  <thead>
                    <tr>
                      <th>Dato</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="facts.rating">
                      <td>Calificación en Google</td>
                      <td data-label="Valor">
                        {{ facts.rating.score.toFixed(1) }} / 5 ({{ facts.rating.count }} reseñas)
                      </td>
                    </tr>
                    <tr>
                      <td>Sucursales registradas</td>
                      <td data-label="Valor">{{ facts.branches.length }}</td>
                    </tr>
                    <tr v-if="facts.departments.length">
                      <td>Departamentos donde opera</td>
                      <td data-label="Valor">{{ joinEs(facts.departments) }}</td>
                    </tr>
                    <tr v-if="facts.usd">
                      <td>Dólar hoy (compra / venta)</td>
                      <td data-label="Valor">
                        $ {{ formatRateEs(facts.usd.buy) }} / $ {{ formatRateEs(facts.usd.sell) }}
                      </td>
                    </tr>
                    <tr v-if="facts.sellRank && facts.marketSize">
                      <td>Puesto por venta más barata</td>
                      <td data-label="Valor">{{ facts.sellRank }}º de {{ facts.marketSize }}</td>
                    </tr>
                    <tr v-if="facts.buyRank && facts.marketSize">
                      <td>Puesto por mejor compra</td>
                      <td data-label="Valor">{{ facts.buyRank }}º de {{ facts.marketSize }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="mb-8">
              <h2 class="text-h5 font-weight-bold mb-3">Está o no habilitada</h2>
              <p class="text-body-1 casa-prose">
                En Uruguay las casas de cambio y los bancos están bajo la supervisión del Banco
                Central. Que una institución figure en ese registro no garantiza que te den el mejor
                precio, pero sí que existe un organismo ante el cual reclamar. Es la primera cosa
                que conviene chequear antes de entregar dinero, sobre todo si alguien te ofrece una
                cotización muy por fuera del mercado.
              </p>
              <div class="d-flex flex-wrap ga-2 mt-3">
                <VBtn
                  v-if="facts.bcuUrl"
                  :href="facts.bcuUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="primary"
                  variant="flat"
                  size="small"
                  prepend-icon="mdi-bank-check"
                >
                  Ficha en el BCU
                </VBtn>
                <VBtn
                  :to="localePath('/advertencias-bcu')"
                  color="primary"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-alert-outline"
                >
                  Advertencias del BCU
                </VBtn>
              </div>
            </section>

            <section class="mb-8">
              <h2 class="text-h5 font-weight-bold mb-3">Cómo leer las reseñas</h2>
              <p class="text-body-1 casa-prose">
                Las reseñas de una casa de cambio miden sobre todo la atención: la cola, el trato,
                si había billetes chicos. Casi nunca miden el precio, que es lo que más te cuesta
                plata. Una casa con cinco estrellas y una venta $ 1 más cara que la mejor del día te
                sale $ 1.000 de más cada 1.000 dólares. Mirá las dos cosas: la reputación acá y el
                precio en el comparador, que se actualiza durante toda la jornada.
              </p>
            </section>
          </template>

          <!-- COMPRAR / VENDER DÓLARES -->
          <template v-else>
            <section class="mb-8">
              <p class="text-body-1 casa-prose mb-3">{{ positionSentence }}</p>
              <div v-if="facts.usd" class="table-scroll">
                <table class="casa-table cu-mobile-cards">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>{{ facts.name }}</th>
                      <th>Mejor del día</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{{ isBuying ? 'Te venden el dólar a' : 'Te compran el dólar a' }}</td>
                      <td data-label="Esta casa">
                        $ {{ formatRateEs(isBuying ? facts.usd.sell : facts.usd.buy) }}
                      </td>
                      <td data-label="Mejor del día">{{ bestPriceLabel }}</td>
                    </tr>
                    <tr>
                      <td>
                        {{ isBuying ? 'Costo de 1.000 dólares' : 'Recibís por 1.000 dólares' }}
                      </td>
                      <td data-label="Esta casa">$ {{ formatPesosEs(thousandHere) }}</td>
                      <td data-label="Mejor del día">{{ thousandBestLabel }}</td>
                    </tr>
                    <tr v-if="thousandDiff > 0">
                      <td>{{ isBuying ? 'Pagás de más' : 'Cobrás de menos' }}</td>
                      <td data-label="Esta casa">$ {{ formatPesosEs(thousandDiff) }}</td>
                      <td data-label="Mejor del día">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="text-caption text-medium-emphasis mt-3 mb-0">
                Precios de la pizarra pública de hoy, sin comisiones ni condiciones especiales. Para
                montos grandes muchas casas mejoran la cotización si se la pedís: llevar el mejor
                precio del día como referencia es lo que te da con qué negociar.
              </p>
            </section>

            <section class="mb-8">
              <h2 class="text-h5 font-weight-bold mb-3">
                Dónde {{ isBuying ? 'comprar' : 'vender' }} en {{ facts.name }}
              </h2>
              <p class="text-body-1 casa-prose mb-3">
                <template v-if="facts.branches.length">
                  {{ facts.name }} atiende en {{ facts.branches.length }}
                  {{ facts.branches.length === 1 ? 'local' : 'locales' }}{{ whereSuffix }}. La
                  pizarra es de la casa, no del local: salvo aviso en el mostrador, el precio de
                  esta página es el que te aplican en cualquiera de sus sucursales.
                </template>
                <template v-else>
                  {{ facts.name }} no tiene mostradores registrados en el padrón del Banco Central:
                  se opera por su plataforma o por transferencia, así que el precio que ves acá no
                  depende de a qué local vayas.
                </template>
              </p>
              <VList v-if="topBranches.length" density="comfortable" class="casa-list">
                <VListItem
                  v-for="branch in topBranches"
                  :key="branch.slug"
                  :to="localePath(`/sucursal/${branch.slug}`)"
                >
                  <template #prepend>
                    <VIcon size="small" color="primary">mdi-store-marker-outline</VIcon>
                  </template>
                  <VListItemTitle>{{ branch.addressLabel }}</VListItemTitle>
                  <VListItemSubtitle>{{ branch.deptLabel }}</VListItemSubtitle>
                </VListItem>
              </VList>
            </section>

            <section class="mb-8">
              <h2 class="text-h5 font-weight-bold mb-3">Antes de ir</h2>
              <ul class="casa-bullets">
                <li v-for="(tip, i) in operationTips" :key="i">{{ tip }}</li>
              </ul>
            </section>
          </template>

          <VCard variant="flat" class="casa-related pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                :to="localePath(`/casa/${origin}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-bank-outline</VIcon>
                {{ facts.name }}: cotización de hoy
              </VChip>
              <VChip
                v-if="facts.branches.length"
                :to="localePath(`/sucursales/${origin}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-map-marker-multiple</VIcon>
                Todas las sucursales
              </VChip>
              <VChip
                :to="localePath(`/historico/${origin}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-chart-line</VIcon>
                Histórico
              </VChip>
              <VChip
                :to="localePath('/mejor-casa-de-cambio')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-trophy-outline</VIcon>
                Mejor casa de cambio hoy
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
import type { ExchangeRate } from '~/types/api'
import { displayableHours, telHref, weeklyHoursTable, type BranchPage } from '~/utils/branches'
import { buildUsdComparison, CASAS_REPUTATION } from '~/utils/casasDirectory'
import {
  CASA_INTENT_META,
  availableIntents,
  branchesWithHours,
  branchesWithPhone,
  departmentLabels,
  formatPesosEs,
  formatRateEs,
  intentDescription,
  intentHeading,
  intentIsAvailable,
  intentTitle,
  joinEs,
  marketPositionSentence,
  type CasaFacts,
  type CasaIntent,
} from '~/utils/casaIntents'

// The whole existence question is answered in the route guard, so an intent a
// casa has no data for is a real 404 rather than an empty page answered with
// 200. It reads ONE cached Nitro route (`/api/branches`), which also carries the
// list of origins quoting USD, so the guard needs no market payload.
//
// The intent list is inlined rather than imported: `definePageMeta` is a
// compiler macro whose callback is extracted at build time, so it cannot close
// over module imports. `tests/unit/casaIntents.test.ts` pins this literal
// against `CASA_INTENTS` so the copy cannot drift.
definePageMeta({
  validate: async route => {
    const intent = String(route.params.intent ?? '')
    const known = ['horarios', 'telefono', 'opiniones', 'comprar-dolares', 'vender-dolares']
    if (!known.includes(intent)) return false

    const origin = String(route.params.origin ?? '')
    if (!origin) return false

    try {
      const directory = await $fetch<{
        branches: Array<{ origin: string; phone: string; hours: string }>
        casas: Record<string, unknown>
        quotesUsd: string[]
      }>('/api/branches')

      if (!directory?.casas?.[origin]) return false
      const branches = (directory.branches ?? []).filter(branch => branch.origin === origin)

      if (intent === 'horarios') {
        return branches.some(branch => /\d/.test(String(branch.hours ?? '')))
      }
      if (intent === 'telefono') {
        return branches.some(branch => String(branch.phone ?? '').replace(/\D/g, '').length >= 7)
      }
      if (intent === 'comprar-dolares' || intent === 'vender-dolares') {
        return (directory.quotesUsd ?? []).includes(origin)
      }
      return true
    } catch {
      // Directory unreachable: can't safely 404, so render and degrade.
      return true
    }
  },
})

const localePath = useLocalePath()
const route = useRoute()
const { getProcessedExchangeData } = useApiService()

const origin = computed(() => String(route.params.origin ?? ''))
const intent = computed(() => String(route.params.intent ?? '') as CasaIntent)
const meta = computed(() => CASA_INTENT_META[intent.value])

interface BranchDirectory {
  branches: BranchPage[]
  casas: Record<string, { name: string; website: string; bcu: string }>
}

/** 1-based position of `origin` in an already-sorted list, or `null` when absent. */
function rankOf(list: ReadonlyArray<{ origin: string }>, origin: string): number | null {
  const index = list.findIndex(entry => entry.origin === origin)
  return index === -1 ? null : index + 1
}

const { data: payload } = await useAsyncData(
  () => `casa-intent-${origin.value}`,
  async (): Promise<CasaFacts | null> => {
    const [directory, market, reviews] = await Promise.all([
      $fetch<BranchDirectory>('/api/branches'),
      getProcessedExchangeData(''),
      $fetch<{ reviews: Record<string, { rating: number; count: number }> }>(
        '/api/casas-reviews'
      ).catch(() => ({ reviews: {} })),
    ])

    const casa = directory?.casas?.[origin.value]
    const rows = (market?.exchangeData ?? []) as ExchangeRate[]
    const localData = (market?.localData ?? {}) as Record<string, { name?: string }>
    const known = casa || localData[origin.value]
    if (!known) return null

    const branches = (directory?.branches ?? []).filter(branch => branch.origin === origin.value)

    // One USD cash quote per casa, ranked — the same reduction the comparison
    // table on /casas-de-cambio uses, so the "puesto Nº" here and the ordering
    // there can never disagree.
    const comparison = buildUsdComparison(rows as never)
    const mine = comparison.find(entry => entry.origin === origin.value) ?? null

    // Crown only quotes the outlier detector accepts. Without this the "casa más
    // barata" on these pages was a board sitting 4,6% under the market median —
    // the signature of a stale or misparsed pizarra — and every casa page then
    // told its reader it charged ~$2 per dollar too much against a price nobody
    // could actually get. `offMarket` is the same flag /casas-de-cambio and
    // /pizarra use, so the three pages crown the same winner.
    const ranked = comparison.filter(entry => !entry.offMarket)
    const bySell = [...ranked].sort((a, b) => a.sell - b.sell)
    const byBuy = [...ranked].sort((a, b) => b.buy - a.buy)

    const stored = reviews?.reviews?.[origin.value] ?? null
    const researched = CASAS_REPUTATION.find(entry => entry.code === origin.value) ?? null
    const score = stored?.rating ?? researched?.googleRating ?? null
    const count = stored?.count ?? researched?.googleReviewCount ?? null

    return {
      origin: origin.value,
      name: casa?.name || localData[origin.value]?.name || origin.value,
      branches,
      departments: departmentLabels(branches),
      usd: mine ? { buy: mine.buy, sell: mine.sell, type: mine.type } : null,
      marketBestSell: bySell[0]?.sell ?? null,
      marketBestBuy: byBuy[0]?.buy ?? null,
      marketSize: ranked.length,
      // `findIndex` returns -1 for a casa excluded as off-market, which would
      // print "0º de 43" — leave the rank out instead.
      sellRank: rankOf(bySell, origin.value),
      buyRank: rankOf(byBuy, origin.value),
      rating: score && count ? { score, count } : null,
      bcuUrl: casa?.bcu ?? '',
      website: casa?.website ?? '',
    }
  }
)

const facts = computed(() => payload.value)

// An unknown casa, or an intent this casa has no data for, is a 404 — not an
// empty section. `intentIsAvailable` is the same gate the sitemap uses, so we
// never submit a URL that lands here.
if (!facts.value || !intentIsAvailable(intent.value, facts.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Página no encontrada' })
}

const intentMeta = (slug: CasaIntent) => CASA_INTENT_META[slug]

const siblingIntents = computed(() =>
  facts.value ? availableIntents(facts.value).filter(slug => slug !== intent.value) : []
)

const heading = computed(() => (facts.value ? intentHeading(intent.value, facts.value) : ''))
const description = computed(() =>
  facts.value ? intentDescription(intent.value, facts.value) : ''
)
const pageTitle = computed(() => (facts.value ? intentTitle(intent.value, facts.value) : ''))

const whereSuffix = computed(() => {
  const depts = facts.value?.departments ?? []
  if (!depts.length) return ''
  if (depts.length <= 3) return ` en ${joinEs(depts)}`
  return ` en ${depts.length} departamentos`
})

const hoursBranches = computed(() => branchesWithHours(facts.value?.branches ?? []))
const phoneBranches = computed(() => branchesWithPhone(facts.value?.branches ?? []))
const topBranches = computed(() => (facts.value?.branches ?? []).slice(0, 10))

const weeklyFor = (branch: BranchPage) => weeklyHoursTable(branch.hoursLabel)
const hoursTextFor = (branch: BranchPage) => displayableHours(branch.hoursLabel)
const telFor = (branch: BranchPage) => telHref(branch.phoneLabel)

const isBuying = computed(() => intent.value === 'comprar-dolares')

const positionSentence = computed(() =>
  facts.value && (intent.value === 'comprar-dolares' || intent.value === 'vender-dolares')
    ? marketPositionSentence(intent.value, facts.value)
    : ''
)

const bestPrice = computed(() =>
  isBuying.value ? (facts.value?.marketBestSell ?? null) : (facts.value?.marketBestBuy ?? null)
)
const bestPriceLabel = computed(() =>
  bestPrice.value === null ? '—' : `$ ${formatRateEs(bestPrice.value)}`
)
const thousandHere = computed(() => {
  const usd = facts.value?.usd
  if (!usd) return 0
  return (isBuying.value ? usd.sell : usd.buy) * 1000
})
const thousandBestLabel = computed(() =>
  bestPrice.value === null ? '—' : `$ ${formatPesosEs(bestPrice.value * 1000)}`
)
const thousandDiff = computed(() => {
  const usd = facts.value?.usd
  if (!usd || bestPrice.value === null) return 0
  const diff = isBuying.value
    ? (usd.sell - bestPrice.value) * 1000
    : (bestPrice.value - usd.buy) * 1000
  return diff > 0 ? diff : 0
})

const operationTips = computed(() => {
  const name = facts.value?.name ?? 'esta casa'
  return isBuying.value
    ? [
        `Si comprás dólares, el número que te importa es la VENTA de ${name}: es lo que te cobran por cada dólar. La compra es el otro lado del mostrador.`,
        'Preguntá por las denominaciones antes de pagar. No es lo mismo llevarte billetes de 100 que un fajo de 20, y para viajar a algunos destinos los billetes viejos o marcados se rechazan.',
        'Confirmá si hay comisión o mínimo por operación: un precio bueno se pierde entero en una comisión fija cuando el monto es chico.',
        'Para montos altos conviene consultar por transferencia en vez de billete: suele haber mejor cotización y no tenés que salir con efectivo en la mano.',
        'Evitá cambiar en aeropuertos, terminales y zonas turísticas. La comodidad se paga con un precio claramente peor.',
      ]
    : [
        `Si vendés dólares, mirá la COMPRA de ${name}: es lo que te pagan por cada billete que entregás.`,
        'Los billetes deteriorados, escritos o de series antiguas se pagan menos o directamente no se toman. Revisalos antes de ir.',
        'Para sumas importantes, avisá con anticipación: no todos los locales tienen pesos suficientes en caja para una operación grande sobre la hora.',
        'Si te ofrecen un precio muy por encima del mercado fuera de una casa registrada, es una señal de alarma, no una oportunidad.',
        'Llevá la cédula: por normativa de prevención de lavado, a partir de ciertos montos la casa está obligada a identificarte.',
      ]
})

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com/casa/${origin.value}/${intent.value}`
)

defineOgImageComponent('Cambio', {
  title: () => heading.value,
  subtitle: () => facts.value?.departments.slice(0, 3).join(' · ') ?? '',
  tag: () => meta.value?.tag ?? '',
})

useSeoMeta({
  title: () => `${pageTitle.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => heading.value,
  ogDescription: () => description.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

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
                  name: facts.value?.name,
                  item: `https://cambio-uruguay.com/casa/${origin.value}`,
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: meta.value?.label,
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
.casa-lead,
.casa-prose {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.casa-bullets {
  padding-left: 1.15rem;
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}
.casa-bullets li {
  margin-bottom: 0.45rem;
}

.casa-branch {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.casa-list {
  background: transparent;
}

.casa-related {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}

.casa-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.casa-link:hover {
  text-decoration: underline;
}

.table-scroll {
  overflow-x: auto;
}
.casa-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.casa-table th,
.casa-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.casa-table thead th {
  font-weight: 700;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.casa-table tbody td:first-child {
  font-weight: 600;
}
</style>
