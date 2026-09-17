<!--
THESIS: Alguien busca "precio iphone 17 uruguay" o llega desde el directorio. Decir cuánto sale hoy,
dónde está más barato, y si conviene traerlo de Estados Unidos — con la cuenta completa, nunca un
precio inventado cuando el modelo no tiene uno confiable esta semana.
OWN-WORLD: Misma forma que /equipar-casa-uruguay/[categoria] y /sillas-escritorio-uruguay/[slug].
FIRST VIEWPORT: Migas, H1 con el nombre del modelo, y el resumen (o la razón honesta de por qué no
hay un precio para hoy).
-->
<template>
  <VContainer class="phone-detail py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Celulares', to: localePath('/celulares-uruguay') },
        { title: model.name, disabled: true },
      ]"
      class="px-0 mb-2"
    />

    <header class="mb-4">
      <h1 class="text-h4 font-weight-bold mb-2">{{ model.name }}: precio en Uruguay</h1>
      <p class="text-body-1 lead">
        <template v-if="headline">
          {{ model.newSellers }}
          {{ model.newSellers === 1 ? 'tienda lo vende' : 'tiendas lo venden' }} nuevo; el más
          barato está en {{ phoneMoney(headline.priceUyu)
          }}<template v-if="headline.usdEquivalent">
            ({{ phoneUsd(headline.usdEquivalent) }})</template
          >
          en {{ headline.seller }}, visto el {{ headline.date }}.
        </template>
        <template v-else>{{ reasonUnpublishable }}</template>
      </p>
    </header>

    <VAlert v-if="detail.stale" type="warning" variant="tonal" class="mb-4">
      Los precios de este modelo no se actualizaron en los últimos {{ PHONE_STALE_DAYS }} días.
      Puede que hayan cambiado.
    </VAlert>

    <VAlert v-if="model.esimOnlySeen" type="info" variant="tonal" class="mb-4">
      Algunas ofertas son de equipos sólo eSIM: confirmá que tu compañía lo soporte antes de
      comprar.
    </VAlert>

    <!-- ── Ofertas ────────────────────────────────────────────────────────── -->
    <section v-if="offerRows.length" class="detail-section" aria-labelledby="ofertas-title">
      <h2 id="ofertas-title">Ofertas por condición</h2>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards offers-table" density="compact">
          <thead>
            <tr>
              <th scope="col">Vendedor</th>
              <th scope="col">Condición</th>
              <th scope="col" class="text-right">Precio</th>
              <th scope="col" class="text-right">En pesos</th>
              <th scope="col">eSIM</th>
              <th scope="col">Visto</th>
              <th scope="col">Enlace</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(offer, index) in offerRows" :key="`${offer.condition}:${index}`">
              <td data-label="Vendedor">{{ sellerLabel(offer) }}</td>
              <td data-label="Condición">{{ PHONE_CONDITION_LABEL[offer.condition] }}</td>
              <td data-label="Precio" class="text-right">
                <s v-if="offer.listPrice && offer.listPrice > offer.price" class="muted">{{
                  formatOriginal(offer.listPrice, offer.currency)
                }}</s>
                {{ formatOriginal(offer.price, offer.currency) }}
              </td>
              <td data-label="En pesos" class="text-right">{{ phoneMoney(offer.priceUyu) }}</td>
              <td data-label="eSIM">{{ offer.esimOnly ? 'Sí' : '—' }}</td>
              <td data-label="Visto">{{ shortDate(offer.observedAt) }}</td>
              <td data-label="Enlace">
                <a
                  v-if="offer.url"
                  :href="offer.url"
                  target="_blank"
                  rel="nofollow noopener"
                  class="cel-link"
                >
                  Ver oferta
                </a>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </section>

    <!-- ── Bandas por condición ───────────────────────────────────────────── -->
    <section v-if="bandRows.length" class="detail-section" aria-labelledby="bandas-title">
      <h2 id="bandas-title">Bandas por condición</h2>
      <div class="band-grid">
        <article v-for="row in bandRows" :key="row.condition" class="band-card">
          <h3>{{ PHONE_CONDITION_LABEL[row.condition] }}</h3>
          <template v-if="row.ambiguous">
            <p class="muted">
              Encontramos precios muy distintos entre sí en esta condición y no armamos una banda
              todavía.
            </p>
          </template>
          <template v-else-if="row.band">
            <p class="band-median">
              <span class="amount">{{ phoneMoney(row.band.median) }}</span>
              <span class="band-tag">mediana</span>
            </p>
            <p class="band-range">
              Entre {{ phoneMoney(row.band.min) }} y {{ phoneMoney(row.band.p75) }} ({{
                row.band.n
              }}
              {{ row.band.n === 1 ? 'oferta' : 'ofertas' }} de {{ row.band.sellers }}
              {{ row.band.sellers === 1 ? 'vendedor' : 'vendedores' }}).
            </p>
          </template>
        </article>
      </div>
      <p v-if="model.suspectDropped" class="section-intro">
        Dejamos afuera {{ model.suspectDropped }}
        {{ model.suspectDropped === 1 ? 'oferta' : 'ofertas' }} con precios muy por fuera del resto:
        no entran en las bandas ni en la tabla de arriba.
      </p>
    </section>

    <!-- ── Historia ───────────────────────────────────────────────────────── -->
    <section class="detail-section" aria-labelledby="historia-title">
      <h2 id="historia-title">Cómo se movió el precio nuevo</h2>
      <template v-if="chart">
        <p class="section-intro">Mínimo y mediana diarios de las ofertas nuevas.</p>
        <div class="chart-wrap">
          <ClientOnly>
            <ChartsLineChart
              :chart-data="chart.data"
              :options="chartOptions"
              :aria-label="chart.label"
            />
            <template #fallback>
              <VSkeletonLoader type="image" />
            </template>
          </ClientOnly>
        </div>
      </template>
      <p v-else-if="seriesStart" class="section-intro">
        La serie arranca el {{ seriesStart }}. El gráfico aparece cuando haya tres días con precio
        nuevo relevado.
      </p>
      <p v-else class="section-intro">Todavía no tenemos historia de precio para este modelo.</p>
    </section>

    <!-- ── Traerlo de Estados Unidos ──────────────────────────────────────── -->
    <section class="detail-section" aria-labelledby="traer-title">
      <h2 id="traer-title">Traerlo de Estados Unidos</h2>

      <div v-if="isKnownUsPrice" class="section-intro">
        <p>
          Precio de lista en EE.UU.: <strong>{{ phoneUsd(usPriceUsd) }}</strong
          >, sin impuesto de venta. Leído el {{ usPricesVerifiedAtLabel }} en
          <a :href="phoneUsPricesSource" target="_blank" rel="noopener noreferrer" class="cel-link">
            apple.com</a
          >.
        </p>
      </div>
      <div v-else class="section-intro">
        <VTextField
          v-model.number="manualUsPriceUsd"
          type="number"
          min="0"
          label="Precio en EE.UU. (US$, sin impuesto de venta)"
          density="compact"
          variant="outlined"
          style="max-width: 320px"
          hide-details
        />
        <p class="hint">
          No tenemos un precio de referencia de EE.UU. para este modelo: escribí el que viste en la
          tienda para calcular la cuenta.
        </p>
      </div>

      <VRadioGroup v-model="salesTaxId" inline density="compact" class="mt-2" hide-details>
        <VRadio
          v-for="option in PHONE_US_SALES_TAX"
          :key="option.id"
          :label="option.label"
          :value="option.id"
        />
      </VRadioGroup>

      <template v-if="importEstimate">
        <div class="import-grid">
          <article>
            <h3>En la valija (equipaje de viajero)</h3>
            <ul class="breakdown">
              <li>Factura de compra: {{ phoneUsd(importEstimate.invoiceUsd) }}</li>
              <li>Franquicia: {{ phoneUsd(importEstimate.traveler.franchiseUsd) }}</li>
              <li>Impuesto (50 % del excedente): {{ phoneUsd(importEstimate.traveler.taxUsd) }}</li>
              <li>Certificado URSEC: {{ phoneMoney(importEstimate.ursecUyu) }}</li>
              <li class="total">
                Total puesto en Uruguay: {{ phoneUsd(importEstimate.traveler.totalUsd) }} ({{
                  phoneMoney(importEstimate.traveler.totalUyu)
                }}
                + URSEC)
              </li>
            </ul>
            <NuxtLink :to="localePath('/franquicia-viajero-uruguay')" class="cel-link">
              Cómo funciona la franquicia de viajero
            </NuxtLink>
          </article>
          <article>
            <h3>Por courier (puerta a puerta)</h3>
            <template v-if="importEstimate.courier.totalUyu != null">
              <ul class="breakdown">
                <li>Factura de compra: {{ phoneUsd(importEstimate.invoiceUsd) }}</li>
                <li v-if="importEstimate.courier.taxUsd">
                  IVA: {{ phoneUsd(importEstimate.courier.taxUsd) }}
                </li>
                <li v-if="importEstimate.courier.freightUsd">
                  Flete ({{ importEstimate.courier.courierName }}):
                  {{ phoneUsd(importEstimate.courier.freightUsd) }}
                </li>
                <li>Certificado URSEC: {{ phoneMoney(importEstimate.ursecUyu) }}</li>
                <li class="total">
                  Total puesto en Uruguay: {{ phoneUsd(importEstimate.courier.totalUsd!) }} ({{
                    phoneMoney(importEstimate.courier.totalUyu)
                  }}
                  + URSEC)
                </li>
              </ul>
            </template>
            <p v-else class="muted">
              {{ importEstimate.courier.reasons[0] || 'Régimen general: no lo calculamos.' }}
            </p>
            <NuxtLink :to="localePath('/franquicia-aduana-uruguay')" class="cel-link">
              Franquicia de courier, con la letra chica
            </NuxtLink>
            ·
            <NuxtLink
              :to="localePath('/herramientas/calculadora-impuestos-importacion')"
              class="cel-link"
            >
              Calculadora de impuestos de importación
            </NuxtLink>
          </article>
        </div>

        <p v-if="savingsNote" class="section-intro savings-note">{{ savingsNote }}</p>
        <p v-else class="section-intro muted">
          No tenemos un precio local confiable para comparar contra el costo de traerlo.
        </p>
        <p class="section-intro fine-print">
          Es una estimación con las reglas de importación vigentes al {{ rulesVerifiedAtLabel }} y
          el certificado URSEC ($ {{ importEstimate.ursecUyu }}) sumado en los dos caminos. No
          calcula el régimen general (compras por encima de la franquicia de courier).
        </p>
      </template>
    </section>

    <!-- ── Garantía ───────────────────────────────────────────────────────── -->
    <section class="detail-section" aria-labelledby="garantia-title">
      <h2 id="garantia-title">Garantía</h2>
      <p class="section-intro">
        La garantía oficial de fábrica la da el importador autorizado de la marca en Uruguay. Un
        equipo traído del exterior o comprado como importado paralelo no tiene ese respaldo acá,
        aunque haya venido nuevo de fábrica; el reclamo, en ese caso, depende de lo que ofrezca
        quien lo vendió.
      </p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />

    <!-- ── Otros almacenamientos y modelos de la marca ───────────────────── -->
    <section v-if="detail.siblings.length" class="detail-section" aria-labelledby="hermanos-title">
      <h2 id="hermanos-title">Otros modelos de {{ model.brandLabel }}</h2>
      <div class="d-flex flex-wrap ga-2">
        <NuxtLink
          v-for="sibling in detail.siblings"
          :key="sibling.slug"
          :to="localePath(`/celulares-uruguay/${sibling.slug}`)"
          class="sibling-chip"
        >
          {{ sibling.name }}
        </NuxtLink>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { LAST_RESEARCHED } from '~/utils/importRules'
import { dateLocale } from '~/utils/format'
import type { FaqItem } from '~/utils/faqAnswers'
import { phoneImportEstimate, type PhoneImportEstimate } from '~/utils/phoneImport'
import {
  PHONE_SLUG_RE,
  PHONE_STALE_DAYS,
  phoneMoney,
  phoneSellerLabel,
  phoneUsd,
  type PhoneCondition,
  type PhoneDetailResponse,
  type PhoneModelDoc,
  type PhoneOfferDoc,
} from '~/utils/phones'
import {
  PHONE_US_PRICES,
  PHONE_US_PRICES_SOURCE,
  PHONE_US_PRICES_VERIFIED_AT,
  PHONE_US_SALES_TAX,
} from '~/utils/phoneUsPrices'

// 404 real para un slug inventado, ANTES de renderizar: mismo patrón que
// pages/descuentos-con-tarjeta-uruguay/marca/[marca].vue. El filtro de forma va primero para no
// gastar una consulta por cada URL basura.
definePageMeta({
  validate: async route => {
    const slug = String(route.params.modelo ?? '')
    if (!PHONE_SLUG_RE.test(slug)) return false
    try {
      await $fetch(`/api/phones/${slug}`)
      return true
    } catch {
      return false
    }
  },
})

const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.modelo ?? ''))

interface PhoneDetailView {
  generatedAt: string
  usdUyu: number
  model: PhoneModelDoc
  stale: boolean
  publishable: boolean
  siblings: PhoneDetailResponse['siblings']
}

// Server-rendered: el precio tiene que estar en el HTML que recibe el buscador, no llegar por un
// fetch client-only. La clave incluye el slug para que navegar entre fichas no reuse el caché de
// otro modelo.
const { data, error } = await useFetch(() => `/api/phones/${slug.value}`, {
  key: () => `phone-detail-${slug.value}`,
  transform: (response: PhoneDetailResponse): PhoneDetailView => ({
    generatedAt: response.generatedAt,
    usdUyu: response.usdUyu,
    model: response.model,
    stale: response.stale,
    publishable: response.publishable,
    siblings: response.siblings,
  }),
})

// Red de seguridad: `validate` ya filtró los slugs que no existen. Llegar acá sin datos significa
// que el catálogo se cayó ENTRE la validación y esta lectura; un 404 es la respuesta honesta igual.
if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Modelo no encontrado', fatal: true })
}
const detail = computed(() => data.value!)
const model = computed(() => detail.value.model)

const PHONE_CONDITION_ORDER: PhoneCondition[] = ['new', 'open-box', 'refurbished', 'used']
const PHONE_CONDITION_LABEL: Record<PhoneCondition, string> = {
  new: 'Nuevo',
  'open-box': 'Caja abierta',
  refurbished: 'Reacondicionado',
  used: 'Usado',
}

function sellerLabel(offer: Pick<PhoneOfferDoc, 'sellerKey' | 'seller'>): string {
  return phoneSellerLabel(offer)
}

function formatOriginal(price: number, currency: 'UYU' | 'USD'): string {
  return currency === 'USD' ? phoneUsd(price) : phoneMoney(price)
}

/** `YYYY-MM-DD` (o ISO completo) se lee como mediodía UTC para no caer al día anterior en Montevideo. */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : new Date(time)
}

function longDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date
    ? date.toLocaleDateString(dateLocale('es'), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Montevideo',
      })
    : ''
}

function shortDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date
    ? date.toLocaleDateString(dateLocale('es'), {
        day: 'numeric',
        month: 'numeric',
        timeZone: 'America/Montevideo',
      })
    : ''
}

// ── Ofertas y bandas ─────────────────────────────────────────────────────
const offerRows = computed(() =>
  [...model.value.offers].sort(
    (a, b) =>
      PHONE_CONDITION_ORDER.indexOf(a.condition) - PHONE_CONDITION_ORDER.indexOf(b.condition) ||
      a.priceUyu - b.priceUyu
  )
)

const bandRows = computed(() =>
  PHONE_CONDITION_ORDER.filter(
    condition => model.value.bands[condition] || model.value.ambiguousConditions.includes(condition)
  ).map(condition => ({
    condition,
    band: model.value.bands[condition] ?? null,
    ambiguous: model.value.ambiguousConditions.includes(condition),
  }))
)

function bestNewOffer(): PhoneOfferDoc | null {
  let best: PhoneOfferDoc | null = null
  for (const offer of model.value.offers) {
    if (offer.condition !== 'new') continue
    if (!best || offer.priceUyu < best.priceUyu) best = offer
  }
  return best
}

const headline = computed(() => {
  if (!detail.value.publishable) return null
  const offer = bestNewOffer()
  if (!offer) return null
  return {
    priceUyu: offer.priceUyu,
    usdEquivalent: detail.value.usdUyu ? offer.priceUyu / detail.value.usdUyu : null,
    seller: sellerLabel(offer),
    date: shortDate(offer.observedAt),
  }
})

const reasonUnpublishable = computed(() => {
  if (detail.value.publishable) return ''
  if (model.value.ambiguousConditions.includes('new')) {
    return 'Encontramos ofertas nuevas con precios muy distintos entre sí y todavía no podemos armar un precio único para este modelo.'
  }
  if (detail.value.stale) {
    return `La última lectura con precio nuevo es del ${longDate(model.value.lastSeen)} y quedó vieja: no la mostramos como el precio de hoy.`
  }
  return 'Todavía no juntamos suficientes ofertas nuevas para armar un precio de este modelo.'
})

// ── Historia ───────────────────────────────────────────────────────────────
const chart = computed(() => {
  const points = (model.value.history ?? []).filter(point => point.newMedian != null)
  if (points.length < 3) return null
  const labels = points.map(point => point.date.slice(0, 10))
  return {
    data: {
      labels: labels.map(date => `${date.slice(8, 10)}/${date.slice(5, 7)}`),
      datasets: [
        {
          label: 'Mínimo nuevo',
          data: points.map(point => point.newMin),
          borderColor: '#ef6c00',
          backgroundColor: '#ef6c00',
          tension: 0.2,
          spanGaps: true,
          pointRadius: labels.length > 60 ? 0 : 2,
        },
        {
          label: 'Mediana nuevo',
          data: points.map(point => point.newMedian),
          borderColor: '#1565c0',
          backgroundColor: '#1565c0',
          tension: 0.2,
          spanGaps: true,
          pointRadius: labels.length > 60 ? 0 : 2,
        },
      ],
    },
    label: `Precio nuevo diario (mínimo y mediana) de ${model.value.name}, del ${longDate(points[0]?.date)} al ${longDate(points[points.length - 1]?.date)}`,
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { ticks: { maxRotation: 0, autoSkipPadding: 12 } },
    y: { ticks: { callback: (value: number) => `$ ${Number(value).toLocaleString('es-UY')}` } },
  },
}

const seriesStart = computed(() => longDate(model.value.firstSeen))

// ── Traerlo de Estados Unidos ────────────────────────────────────────────
const isKnownUsPrice = computed(() => model.value.key in PHONE_US_PRICES)
const manualUsPriceUsd = ref<number | null>(null)
const salesTaxId = ref(PHONE_US_SALES_TAX[0]!.id)

const usPriceUsd = computed(() => PHONE_US_PRICES[model.value.key] ?? 0)
const usPricesVerifiedAtLabel = computed(() => longDate(PHONE_US_PRICES_VERIFIED_AT))
const phoneUsPricesSource = PHONE_US_PRICES_SOURCE
const rulesVerifiedAtLabel = computed(() => longDate(LAST_RESEARCHED))

const importEstimate = computed<PhoneImportEstimate | null>(() => {
  const base = isKnownUsPrice.value ? usPriceUsd.value : manualUsPriceUsd.value || 0
  if (!(base > 0) || !detail.value.usdUyu) return null
  const salesTax = PHONE_US_SALES_TAX.find(option => option.id === salesTaxId.value)
  const localBestUyu = detail.value.publishable ? (model.value.bands.new?.min ?? null) : null
  return phoneImportEstimate({
    usPriceUsd: base,
    salesTaxPct: salesTax?.pct ?? 0,
    usdUyu: detail.value.usdUyu,
    localBestUyu,
  })
})

const savingsNote = computed(() => {
  const estimate = importEstimate.value
  if (!estimate || estimate.localBestUyu == null) return ''
  const traveler = estimate.savingTravelerUyu
  const courier = estimate.savingCourierUyu
  const best = courier != null && (traveler == null || courier > traveler) ? courier : traveler
  if (best == null) return ''
  return best > 0
    ? `Traerlo sale ${phoneMoney(best)} más barato que comprarlo en Uruguay, según el camino más conveniente.`
    : `Comprarlo en Uruguay sale ${phoneMoney(Math.abs(best))} más barato que traerlo, según esta cuenta.`
})

// ── FAQ ──────────────────────────────────────────────────────────────────
const faq = computed<FaqItem[]>(() => {
  const items: FaqItem[] = [
    {
      id: `phone-${model.value.slug}-precio`,
      question: `¿Cuánto sale el ${model.value.name}?`,
      answer: headline.value
        ? `Está desde ${phoneMoney(headline.value.priceUyu)} nuevo, en ${model.value.newSellers} ${model.value.newSellers === 1 ? 'vendedor' : 'vendedores'}, visto el ${headline.value.date}.`
        : reasonUnpublishable.value,
    },
  ]
  if (headline.value) {
    items.push({
      id: `phone-${model.value.slug}-donde`,
      question: `¿Dónde está más barato el ${model.value.name}?`,
      answer: `En ${headline.value.seller}, a ${phoneMoney(headline.value.priceUyu)}, visto el ${headline.value.date}. Los precios cambian todos los días: confirmalo en la oferta antes de comprar.`,
    })
  }
  items.push({
    id: `phone-${model.value.slug}-traer`,
    question: `¿Conviene traer el ${model.value.name} de Estados Unidos?`,
    answer:
      savingsNote.value ||
      'Depende del precio en EE.UU. y del impuesto de venta del estado donde se compre. Usá la calculadora de esta página para verlo con el modelo y el camino que te sirva.',
  })
  items.push({
    id: 'phone-caja-abierta-reacondicionado',
    question: '¿Qué diferencia hay entre caja abierta y reacondicionado?',
    answer:
      'Caja abierta es un equipo nuevo de fábrica cuyo empaque se abrió, por exhibición o por una devolución sin uso. Reacondicionado es un equipo usado, reparado y probado por el vendedor o el fabricante. Ninguno de los dos es lo mismo que nuevo, aunque el precio se le acerque.',
  })
  return items
})

// ── SEO ────────────────────────────────────────────────────────────────────
// Absoluta y literal, NUNCA con localePath (la ruling del controlador para esta familia): sólo
// español, sin prefijo de idioma. La navegación de la página (breadcrumbs, hermanos) sí usa
// localePath, arriba en el template.
const canonical = computed(() => `https://cambio-uruguay.com/celulares-uruguay/${slug.value}`)
const title = computed(() => `${model.value.name}: precio en Uruguay`)
const description = computed(() =>
  headline.value
    ? `${model.value.name} nuevo desde ${phoneMoney(headline.value.priceUyu)} en ${model.value.newSellers} ${model.value.newSellers === 1 ? 'vendedor' : 'vendedores'} de Uruguay. Ofertas por condición y la cuenta de traerlo de Estados Unidos.`
    : `Precio de ${model.value.name} en Uruguay: ofertas por condición y la cuenta de traerlo de Estados Unidos.`
)

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
})

/** Ofertas NUEVAS únicamente: el AggregateOffer nunca mezcla con usado/caja abierta/reacondicionado. */
const newOffers = computed(() => model.value.offers.filter(offer => offer.condition === 'new'))

// FAQPage lo emite FaqSection: no se repite acá.
useHead(() => {
  const newBand = model.value.bands.new
  const canPublishProduct = detail.value.publishable && !!newBand && newOffers.value.length > 0
  const highPrice = newOffers.value.reduce((max, offer) => Math.max(max, offer.priceUyu), 0)
  return {
    link: [{ rel: 'canonical', href: canonical.value }],
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
                  name: 'Inicio',
                  item: 'https://cambio-uruguay.com/',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Celulares',
                  item: 'https://cambio-uruguay.com/celulares-uruguay',
                },
                { '@type': 'ListItem', position: 3, name: model.value.name, item: canonical.value },
              ],
            },
            // Nunca declaramos una calificación agregada: este sitio no mide reseñas de producto. Y
            // nunca con un precio que la propia página no headlinea (publishable=false): mejor sin
            // Product que uno inventado.
            ...(canPublishProduct
              ? [
                  {
                    '@type': 'Product',
                    name: model.value.name,
                    ...(model.value.image ? { image: model.value.image } : {}),
                    brand: { '@type': 'Brand', name: model.value.brandLabel },
                    offers: {
                      '@type': 'AggregateOffer',
                      priceCurrency: 'UYU',
                      lowPrice: Math.round(newBand!.min),
                      highPrice: Math.round(Math.max(highPrice, newBand!.min)),
                      offerCount: newBand!.n,
                    },
                  },
                ]
              : []),
          ],
        }),
      },
    ],
  }
})
</script>

<style scoped>
.phone-detail {
  max-width: 1120px;
}
.phone-detail p {
  margin: 12px 0 0;
}
.lead {
  max-width: 68ch;
  font-size: 1.075rem;
}
.cel-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.muted {
  opacity: 0.66;
}
.detail-section {
  margin-top: 40px;
}
.detail-section h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.25;
}
.detail-section h3 {
  margin: 0 0 6px;
  font-size: 1.05rem;
}
.section-intro {
  max-width: 72ch;
  font-size: 0.95rem;
  opacity: 0.9;
}
.hint {
  font-size: 0.825rem;
  opacity: 0.75;
  max-width: 60ch;
}
.table-wrap {
  overflow-x: auto;
}
.offers-table {
  margin-top: 12px;
}

/* Bandas */
.band-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.band-card {
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.band-median {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin: 0;
}
.band-median .amount {
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.band-tag {
  font-size: 0.75rem;
  opacity: 0.7;
}
.band-range {
  font-size: 0.85rem;
}

/* Gráfico */
.chart-wrap {
  position: relative;
  height: clamp(220px, 40vw, 340px);
  margin-top: 12px;
}

/* Traer de EE.UU. */
.import-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.breakdown {
  margin: 8px 0;
  padding-left: 18px;
  font-size: 0.9rem;
}
.breakdown li {
  padding: 2px 0;
}
.breakdown .total {
  font-weight: 700;
  list-style: none;
  margin-left: -18px;
  margin-top: 6px;
}
.savings-note {
  font-weight: 600;
}
.fine-print {
  font-size: 0.8rem;
  opacity: 0.75;
}

/* Hermanos */
.sibling-chip {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 999px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.sibling-chip:hover {
  border-color: rgb(var(--v-theme-link));
}
</style>
