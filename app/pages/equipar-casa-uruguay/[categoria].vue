<!--
THESIS: Someone searched "precio heladera uruguay". Answer with today's median per size, the band around it,
what used costs, and where the cheapest honest listings are — then what to check before buying.
OWN-WORLD: Same surfaces, type and link blue as the /equipar-casa-uruguay hub this page hangs from.
FIRST VIEWPORT: Breadcrumbs, the H1, how many listings back the numbers and when, then the per-size cards.
FAMILY: Spanish only (like comparativas and sucursal): the canonical carries no locale prefix.
-->
<template>
  <VContainer class="equipar-cat py-6 py-md-10">
    <VBreadcrumbs class="px-0 pb-2" :items="crumbs" />

    <header class="cat-header">
      <h1>{{ page.h1 }}</h1>
      <p class="lead">{{ summary }}</p>
    </header>

    <!-- ── Cuánto sale, por tamaño ────────────────────────────────────────── -->
    <section class="cat-section" aria-labelledby="variantes-title">
      <h2 id="variantes-title">Cuánto sale hoy, por tamaño o tipo</h2>
      <p v-if="!variants.length" class="empty-note">
        Todavía no tenemos avisos recientes de {{ page.plural }}. La página se completa sola con la
        próxima lectura de tiendas, MercadoLibre y Marketplace.
      </p>

      <div v-else class="variant-grid">
        <article v-for="item in variants" :key="item.key" class="variant-card">
          <h3>{{ item.variantLabel }}</h3>

          <template v-if="item.newBand">
            <p class="variant-median">
              <span class="amount">{{ money(item.newBand.median) }}</span>
              <span class="variant-tag">mediana nuevo</span>
            </p>
            <p class="variant-band">
              La mitad de los avisos entre {{ money(item.newBand.p25) }} y
              {{ money(item.newBand.p75) }} ({{ item.newBand.n }} avisos nuevos).
            </p>
          </template>
          <p v-else class="muted">Nuevo: sin datos suficientes.</p>

          <p v-if="!page.usedOk" class="variant-used muted">Usado: no se recomienda.</p>
          <p v-else-if="item.usedBand" class="variant-used">
            Usado: mediana {{ money(item.usedBand.median) }} ({{ item.usedBand.n }} avisos)<span
              v-if="item.usedSavingPct"
              class="saving"
              >, usado sale {{ Math.round(item.usedSavingPct) }} % menos</span
            >.
          </p>
          <p v-else class="variant-used muted">Usado: sin datos suficientes.</p>
        </article>
      </div>
    </section>

    <!-- ── Historia ───────────────────────────────────────────────────────── -->
    <section v-if="variants.length" class="cat-section" aria-labelledby="historia-title">
      <h2 id="historia-title">Cómo se movió la mediana</h2>
      <template v-if="chart">
        <p class="section-intro">
          Mediana diaria de los avisos nuevos, una línea por tamaño o tipo.
        </p>
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
        La serie arranca el {{ seriesStart }}. El gráfico aparece cuando haya tres días relevados.
      </p>
    </section>

    <!-- ── Modelos ────────────────────────────────────────────────────────── -->
    <section v-if="productRows.length" class="cat-section" aria-labelledby="modelos-title">
      <h2 id="modelos-title">Modelos y sus mejores ofertas</h2>
      <p class="section-intro">
        Cada modelo con cuántos vendedores lo tienen, el precio más bajo que encontramos y hasta
        tres ofertas para comparar.
      </p>
      <VTable class="cu-mobile-cards products-table" density="compact">
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col" class="text-right">Vendedores</th>
            <th scope="col" class="text-right">Mejor precio</th>
            <th scope="col">Ofertas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in productRows" :key="row.key">
            <td data-label="">
              <strong>{{ row.product.name }}</strong>
              <span class="cu-cell-note">{{ row.variantLabel }}</span>
            </td>
            <td data-label="Vendedores" class="text-right">{{ row.product.sellers }}</td>
            <td data-label="Mejor precio" class="text-right price">
              {{ money(row.product.bestPriceUyu) }}
            </td>
            <td data-label="Ofertas" class="cu-cell-prose">
              <ul class="offer-mini">
                <li v-for="(offer, index) in row.product.offers" :key="`${row.key}:${index}`">
                  <a :href="offer.url" target="_blank" rel="nofollow noopener" class="cat-link">{{
                    offer.seller
                  }}</a>
                  <NuxtLink
                    v-if="storeKeyFor(offer.seller, offer.source)"
                    :to="
                      localePath(
                        `/tiendas-online-uruguay/${storeKeyFor(offer.seller, offer.source)}`
                      )
                    "
                    :aria-label="`Ficha de ${offer.seller}`"
                    class="cat-link seller-ficha"
                  >
                    (ficha)
                  </NuxtLink>
                  {{ money(offer.priceUyu) }} · {{ shortDate(offer.observedAt) }}
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- ── Los más baratos ────────────────────────────────────────────────── -->
    <section
      v-if="cheapestNew.length || cheapestUsed.length"
      class="cat-section"
      aria-labelledby="baratos-title"
    >
      <h2 id="baratos-title">Los más baratos esta semana</h2>
      <p class="section-intro">
        Los avisos más baratos de la última lectura, con la fecha en que los vimos. El precio cambia
        todos los días: confirmalo en el aviso antes de ir.
        <template v-if="suspectDropped">
          Dejamos afuera {{ suspectDropped }} {{ suspectDropped === 1 ? 'aviso' : 'avisos' }} con
          precios muy por debajo del resto de su tamaño: no entran en las medianas, en esta lista ni
          en la tabla de modelos.
        </template>
      </p>

      <div class="cheap-grid">
        <div v-if="cheapestNew.length">
          <h3>Nuevos</h3>
          <ol class="offer-list">
            <li v-for="row in cheapestNew" :key="row.key">
              <a :href="row.offer.url" target="_blank" rel="nofollow noopener" class="cat-link">{{
                row.offer.title
              }}</a>
              <span class="offer-meta"
                ><NuxtLink
                  v-if="storeKeyFor(row.offer.seller, row.offer.source)"
                  :to="
                    localePath(
                      `/tiendas-online-uruguay/${storeKeyFor(row.offer.seller, row.offer.source)}`
                    )
                  "
                  class="cat-link"
                  >{{ row.offer.seller }}</NuxtLink
                ><template v-else>{{ row.offer.seller }}</template> · {{ row.variantLabel }} ·
                {{ shortDate(row.offer.observedAt) }}</span
              >
              <span class="offer-price"
                >{{ money(row.offer.priceUyu)
                }}<span v-if="row.offer.currency === 'USD'" class="offer-usd">{{
                  usd(row.offer.price)
                }}</span></span
              >
            </li>
          </ol>
        </div>
        <div v-if="cheapestUsed.length">
          <h3>Usados</h3>
          <ol class="offer-list">
            <li v-for="row in cheapestUsed" :key="row.key">
              <a :href="row.offer.url" target="_blank" rel="nofollow noopener" class="cat-link">{{
                row.offer.title
              }}</a>
              <span class="offer-meta"
                ><NuxtLink
                  v-if="storeKeyFor(row.offer.seller, row.offer.source)"
                  :to="
                    localePath(
                      `/tiendas-online-uruguay/${storeKeyFor(row.offer.seller, row.offer.source)}`
                    )
                  "
                  class="cat-link"
                  >{{ row.offer.seller }}</NuxtLink
                ><template v-else>{{ row.offer.seller }}</template> · {{ row.variantLabel }} ·
                {{ shortDate(row.offer.observedAt) }}</span
              >
              <span class="offer-price"
                >{{ money(row.offer.priceUyu)
                }}<span v-if="row.offer.currency === 'USD'" class="offer-usd">{{
                  usd(row.offer.price)
                }}</span></span
              >
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- ── Por qué está en su tier ────────────────────────────────────────── -->
    <section class="cat-section" aria-labelledby="tier-title">
      <h2 id="tier-title">Por qué está en el tier {{ page.tier }}: {{ tierName }}</h2>
      <p v-if="reason" class="section-intro">{{ reason }}</p>
      <p v-if="page.usedNote" class="section-intro">{{ page.usedNote }}</p>
      <p class="section-intro">
        <NuxtLink :to="`${localePath('/equipar-casa-uruguay')}#ranking`" class="cat-link">
          Ver el orden completo para equipar una casa vacía
        </NuxtLink>
      </p>
    </section>

    <!-- ── Qué mirar ──────────────────────────────────────────────────────── -->
    <section v-if="page.guide" class="cat-section" aria-labelledby="guia-title">
      <h2 id="guia-title">Qué mirar al comprar</h2>
      <ul class="guide-list">
        <li v-for="(line, index) in page.guide" :key="index">{{ line }}</li>
      </ul>
    </section>

    <!-- ── Plan Redondo de UTE ────────────────────────────────────────────── -->
    <section v-if="page.planRedondo" class="cat-section" aria-labelledby="plan-title">
      <h2 id="plan-title">Plan Redondo de UTE</h2>
      <!-- Donde la categoría no entra (microondas, horno de mesa, lavarropas común), la ventana y
      "se acredita" contradirían la frase que dice que no entra. -->
      <p v-if="planRedondoWindow" class="section-intro">
        {{ page.planRedondo }} Rige para compras hechas entre el
        {{ EQUIPAR_PLAN_REDONDO_WINDOW.from }} y el {{ EQUIPAR_PLAN_REDONDO_WINDOW.to }} y el
        descuento se acredita en la factura (verificado el
        {{ EQUIPAR_PLAN_REDONDO_WINDOW.verifiedAt }}).
      </p>
      <p v-else class="section-intro">
        {{ page.planRedondo }} Verificado el {{ EQUIPAR_PLAN_REDONDO_WINDOW.verifiedAt }}.
      </p>
      <p class="section-intro">
        <a
          :href="EQUIPAR_PLAN_REDONDO_SOURCE"
          target="_blank"
          rel="noopener noreferrer"
          class="cat-link"
          >Condiciones del plan en ute.com.uy</a
        >
        ·
        <NuxtLink :to="localePath('/factura-de-ute-uruguay')" class="cat-link">
          Cómo se calcula la factura de UTE
        </NuxtLink>
      </p>
    </section>

    <!-- ── Costo por hora ─────────────────────────────────────────────────── -->
    <section v-if="hourlyCost" class="cat-section" aria-labelledby="consumo-title">
      <h2 id="consumo-title">Cuánto gasta prendido</h2>
      <p class="section-intro">{{ hourlyCost }}</p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />

    <!-- ── Otras categorías ───────────────────────────────────────────────── -->
    <section v-if="siblings.length" class="cat-section" aria-labelledby="otras-title">
      <h2 id="otras-title">Otras categorías {{ roomName }}</h2>
      <ul class="sibling-list">
        <li v-for="other in siblings" :key="other.key">
          <NuxtLink :to="localePath(`/equipar-casa-uruguay/${other.key}`)" class="cat-link">
            {{ other.label }}
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- ── Método ─────────────────────────────────────────────────────────── -->
    <section class="cat-section" aria-labelledby="metodo-title">
      <h2 id="metodo-title">De dónde salen estos precios</h2>
      <p class="section-intro">
        Nuevo y usado son dos mercados y nunca se promedian: cada uno tiene su propia mediana. Un
        tamaño chico y uno grande tampoco son la misma compra, así que cada mediana es por tamaño o
        tipo.
      </p>
      <p class="section-intro">
        Sólo publicamos lo que vimos a la venta en los últimos 4 días. Los avisos de Facebook
        Marketplace entran únicamente en los precios de usados.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  EQUIPAR_CATEGORY_PAGES,
  EQUIPAR_PLAN_REDONDO_SOURCE,
  EQUIPAR_PLAN_REDONDO_WINDOW,
  equiparCategoryFaq,
  equiparCategoryPage,
  equiparCategoryTitle,
  equiparGrammarFor,
  equiparHourlyCostUyu,
  equiparPlanRedondoWindowApplies,
  isEquiparCategorySlug,
} from '~/utils/equiparCategoryPages'
import {
  equiparMoney,
  equiparPlausibleProducts,
  type EquiparCategoryResponse,
  type EquiparItemDoc,
  type EquiparOffer,
  type EquiparProduct,
  type EquiparRoom,
} from '~/utils/equipar'
import { equiparEs } from '~/utils/equiparEs'
import { dateLocale } from '~/utils/format'
import { storeSlugForSeller } from '~/utils/storeDirectory'

// 404 real para un slug inventado: `validate` corre antes del setup (un createError después de un
// await respondería 200). Es una macro, así que sólo puede usar la función importada.
definePageMeta({
  validate: route => isEquiparCategorySlug(String(route.params.categoria ?? '')),
})

const route = useRoute()
const localePath = useLocalePath()

const slug = computed(() => String(route.params.categoria ?? ''))
const found = equiparCategoryPage(slug.value)
if (!found) {
  // Red de seguridad antes de cualquier await: `validate` ya filtró los slugs que no existen.
  throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada', fatal: true })
}
const page = computed(() => equiparCategoryPage(slug.value) ?? found)

// Task 10: el nombre del vendedor enlaza a su ficha (/tiendas-online-uruguay/<key>) sólo cuando esa
// tienda tiene ficha propia — la ruta 404s de verdad si no. `storeProfileKeys` es la lista compartida
// con /sillas-escritorio-uruguay/[slug].vue (useStoreProfileKeys.ts).
const storeProfileKeys = useStoreProfileKeys()
// `source` is optional so every existing call site keeps compiling untouched; a facebook-sourced
// offer never links, even when the seller name happens to resolve to a curated store — a private
// Marketplace seller's display name is not a company identity (fix round F1, item 4).
const storeKeyFor = (seller: string, source?: string): string | null => {
  if (source === 'facebook') return null
  const key = storeSlugForSeller(seller)
  return key && storeProfileKeys.value.includes(key) ? key : null
}

interface EquiparCategoryView {
  generatedAt: string | null
  items: EquiparItemDoc[]
}

/** Ofertas por producto que la tabla muestra; la API manda hasta 6. */
const PRODUCT_OFFERS_SHOWN = 3

// Server-rendered: las medianas tienen que estar en el HTML que lee el buscador. El recorte va en
// `transform`, que corre ANTES de escribir el payload: lo que la página no dibuja no viaja.
const { data } = await useFetch(() => `/api/equipar/${slug.value}`, {
  key: `equipar-cat-${slug.value}`,
  transform: (response: EquiparCategoryResponse): EquiparCategoryView => ({
    generatedAt: response?.generatedAt ?? null,
    items: (response?.items ?? []).map(item => ({
      ...item,
      image: null,
      products: (item.products ?? []).map(product => ({
        ...product,
        offers: (product.offers ?? []).slice(0, PRODUCT_OFFERS_SHOWN),
      })),
      // El gráfico dibuja sólo la mediana nueva; la usada no se manda al navegador.
      history: (item.history ?? []).map(point => ({
        date: point.date,
        newMedian: point.newMedian,
        usedMedian: null,
      })),
    })),
  }),
})

const items = computed<EquiparItemDoc[]>(() => data.value?.items ?? [])
const generatedAt = computed(() => data.value?.generatedAt ?? null)

const variants = computed(() =>
  [...items.value].sort((a, b) => (a.variantRank ?? 1) - (b.variantRank ?? 1))
)

// Espacio duro entre el signo y la cifra: en el celular "$ 13.019" no se parte en dos renglones.
const money = (value: number): string => `$\u00A0${equiparMoney(value).slice(1)}`
const usd = (value: number): string => `USD\u00A0${Math.round(value).toLocaleString('es-UY')}`

/** `YYYY-MM-DD` se lee como mediodía UTC: a medianoche caería el día anterior en Montevideo. */
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

const newCount = computed(() => items.value.reduce((sum, item) => sum + (item.newBand?.n ?? 0), 0))
// Donde el usado no se recomienda (colchón, toallas…) la página no lo cuenta ni lo anuncia.
const usedCount = computed(() =>
  page.value.usedOk ? items.value.reduce((sum, item) => sum + (item.usedBand?.n ?? 0), 0) : 0
)

const summary = computed(() => {
  if (!newCount.value && !usedCount.value) return page.value.description
  const updated = longDate(generatedAt.value)
  const counted = usedCount.value
    ? `${newCount.value} avisos nuevos y ${usedCount.value} usados de ${page.value.plural} en tiendas uruguayas, MercadoLibre y Marketplace`
    : `${newCount.value} avisos nuevos de ${page.value.plural} en tiendas uruguayas y MercadoLibre`
  return `Relevamos ${counted}.${updated ? ` Actualizado el ${updated}.` : ''}`
})

// ── Gráfico ────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#1565c0', '#ef6c00', '#2e7d32', '#6a1b9a', '#00838f', '#c62828']

const chart = computed(() => {
  const dates = new Set<string>()
  for (const item of variants.value) {
    for (const point of item.history ?? []) {
      if (point.newMedian != null) dates.add(point.date.slice(0, 10))
    }
  }
  if (dates.size < 3) return null
  const labels = [...dates].sort()
  const datasets = variants.value
    .filter(item => (item.history ?? []).some(point => point.newMedian != null))
    .map((item, index) => {
      const byDate = new Map(
        (item.history ?? []).map(point => [point.date.slice(0, 10), point.newMedian])
      )
      const color = CHART_COLORS[index % CHART_COLORS.length]
      return {
        label: item.variantLabel,
        data: labels.map(date => byDate.get(date) ?? null),
        borderColor: color,
        backgroundColor: color,
        tension: 0.2,
        spanGaps: true,
        pointRadius: labels.length > 60 ? 0 : 2,
      }
    })
  return {
    data: { labels: labels.map(date => `${date.slice(8, 10)}/${date.slice(5, 7)}`), datasets },
    label: `Mediana diaria del precio nuevo de ${page.value.plural} en Uruguay por tamaño, del ${longDate(labels[0])} al ${longDate(labels[labels.length - 1])}`,
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

const seriesStart = computed(() => {
  const first = items.value
    .map(item => item.firstSeen)
    .filter(Boolean)
    .sort()[0]
  return longDate(first)
})

// ── Modelos y ofertas ──────────────────────────────────────────────────────
// El slug de un producto es único dentro de su item (categoría+variante), no dentro de la
// categoría: la clave de fila lleva los dos. `equiparPlausibleProducts` saca los productos por debajo
// de la mitad del p25 nuevo: documentos escritos antes del arreglo del backend los armaban con avisos
// que la banda descartaba (yogures a $ 70 en colchón), y esta tabla alimenta el JSON-LD de Offer.
const productRows = computed(() =>
  variants.value
    .filter(item => item.regime === 'modelo')
    .flatMap(item =>
      equiparPlausibleProducts(item).map((product: EquiparProduct) => ({
        key: `${item.key}:${product.slug}`,
        variantLabel: item.variantLabel,
        product,
      }))
    )
    .filter(row => row.product.bestPriceUyu > 0)
    .sort(
      (a, b) =>
        b.product.sellers - a.product.sellers || a.product.bestPriceUyu - b.product.bestPriceUyu
    )
    .slice(0, 12)
)

function cheapest(condition: EquiparOffer['condition'], limit: number) {
  return variants.value
    .flatMap(item =>
      (item.offers ?? [])
        .filter(offer => offer.condition === condition && offer.url)
        .map((offer, index) => ({
          key: `${item.key}:${condition}:${index}`,
          variantLabel: item.variantLabel,
          offer,
        }))
    )
    .sort((a, b) => a.offer.priceUyu - b.offer.priceUyu)
    .slice(0, limit)
}

const cheapestNew = computed(() => cheapest('new', 8))
const cheapestUsed = computed(() => (page.value.usedOk ? cheapest('used', 6) : []))
const suspectDropped = computed(() =>
  items.value.reduce((sum, item) => sum + (item.suspectDropped ?? 0), 0)
)

// ── Contexto ───────────────────────────────────────────────────────────────
const planRedondoWindow = computed(() => equiparPlanRedondoWindowApplies(page.value))
const tierName = computed(() => equiparEs.tierNames[page.value.tier].name)
const reason = computed(() => items.value[0]?.reason ?? '')

/** Con la preposición contraída: "Otras categorías del living", nunca "de el living". */
const ROOM_NAMES: Record<EquiparRoom, string> = {
  cocina: 'de la cocina',
  dormitorio: 'del dormitorio',
  bano: 'del baño',
  living: 'del living',
  limpieza: 'de limpieza',
}
const roomName = computed(() => ROOM_NAMES[page.value.room] ?? 'de la casa')

const siblings = computed(() =>
  EQUIPAR_CATEGORY_PAGES.filter(
    other => other.room === page.value.room && other.key !== page.value.key
  )
)

/** Sólo estufa y ventilador declaran potencia de ejemplo; artículo, participio y verbo concuerdan. */
const hourlyCost = computed(() => {
  const watts = page.value.wattsExample
  if (!watts) return ''
  const { gender, plural } = equiparGrammarFor(page.value.key)
  const article = `${gender === 'f' ? 'Una' : 'Un'}${plural ? (gender === 'f' ? 's' : 'os') : ''}`
  const lit = `prendid${gender === 'f' ? 'a' : 'o'}${plural ? 's' : ''}`
  const cost = equiparHourlyCostUyu(watts).toLocaleString('es-UY', { maximumFractionDigits: 1 })
  return `${article} ${page.value.label.toLowerCase()} de ${watts.toLocaleString('es-UY')} W ${lit} una hora ${plural ? 'cuestan' : 'cuesta'} unos $ ${cost} con IVA, si tu casa está en el escalón de 101 a 600 kWh de la tarifa residencial simple.`
})

const faq = computed(() =>
  equiparCategoryFaq(page.value, items.value, generatedAt.value).map((entry, index) => ({
    id: `equipar-${page.value.key}-${index}`,
    question: entry.question,
    answer: entry.answer,
  }))
)

// ── SEO ────────────────────────────────────────────────────────────────────
const canonical = computed(
  () => `https://cambio-uruguay.com/equipar-casa-uruguay/${page.value.key}`
)
const titleText = computed(() => equiparCategoryTitle(page.value, items.value))

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Equipar una casa', to: localePath('/equipar-casa-uruguay') },
  { title: page.value.label, disabled: true },
])

defineOgImageComponent('Cambio', {
  title: () => titleText.value,
  subtitle: 'Equipar una casa',
  tag: 'PRECIOS',
})

useSeoMeta({
  title: () => `${titleText.value} | Cambio Uruguay`,
  description: () => page.value.description,
  ogTitle: () => titleText.value,
  ogDescription: () => page.value.description,
  ogType: 'website',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
})

/**
 * Hasta 10 modelos con precio y enlace: nunca calificaciones, que este sitio no mide. Precio y URL
 * salen de la MISMA oferta (la más barata de las que viajan), para que el Offer no declare un precio
 * que el enlace no muestra.
 */
const productsLd = computed(() =>
  productRows.value
    .map(row => {
      const offer = [...row.product.offers].sort((a, b) => a.priceUyu - b.priceUyu)[0]
      if (!offer?.url || !(offer.priceUyu > 0)) return null
      return {
        '@type': 'Product',
        name: row.product.name,
        ...(row.product.image ? { image: row.product.image } : {}),
        ...(row.product.brand ? { brand: { '@type': 'Brand', name: row.product.brand } } : {}),
        offers: {
          '@type': 'Offer',
          price: Math.round(offer.priceUyu),
          priceCurrency: 'UYU',
          url: offer.url,
        },
      }
    })
    .filter(Boolean)
    .slice(0, 10)
)

// FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
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
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Equipar una casa',
                item: 'https://cambio-uruguay.com/equipar-casa-uruguay',
              },
              { '@type': 'ListItem', position: 3, name: page.value.label, item: canonical.value },
            ],
          },
          ...(productsLd.value.length
            ? [
                {
                  '@type': 'ItemList',
                  name: `Modelos de ${page.value.plural} a la venta en Uruguay`,
                  numberOfItems: productsLd.value.length,
                  itemListElement: productsLd.value.map((product, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    item: product,
                  })),
                },
              ]
            : []),
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.equipar-cat {
  max-width: 1120px;
}
.equipar-cat p {
  margin: 12px 0 0;
}
.cat-header h1 {
  margin: 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  line-height: 1.2;
  text-wrap: balance;
}
.lead {
  max-width: 68ch;
  font-size: 1.075rem;
}
.cat-section {
  margin-top: 40px;
}
.cat-section h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.25;
}
.cat-section h3 {
  margin: 0;
  font-size: 1.05rem;
}
.section-intro {
  max-width: 70ch;
  font-size: 0.95rem;
  opacity: 0.88;
}
.empty-note {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.95rem;
}
/* Enlaces chicos: el azul de enlace del tema, que pasa AA en los dos modos (nunca primary). */
.cat-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}

/* Tarjetas por tamaño */
.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.variant-card {
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.variant-median {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.variant-median .amount {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.variant-tag {
  font-size: 0.8rem;
  opacity: 0.7;
}
.variant-band,
.variant-used {
  font-size: 0.875rem;
}
.saving {
  font-weight: 700;
  color: rgb(var(--v-theme-success));
}
/* 0.66 es el piso que todavía pasa 4.5:1 sobre el lienzo claro (medido en el hub). */
.muted {
  opacity: 0.66;
  font-size: 0.875rem;
}

/* Gráfico */
.chart-wrap {
  position: relative;
  height: clamp(240px, 44vw, 360px);
  margin-top: 16px;
}

/* Modelos */
.products-table {
  margin-top: 16px;
}
.price {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.cu-cell-note {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
}
.offer-mini {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
}
.offer-mini li {
  padding: 2px 0;
}
.seller-ficha {
  font-size: 0.72rem;
  font-weight: 400;
  opacity: 0.85;
}

/* Más baratos */
.cheap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px 32px;
  margin-top: 18px;
}
.offer-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.offer-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  font-size: 0.875rem;
}
.offer-list a {
  grid-column: 1;
  overflow-wrap: anywhere;
}
.offer-meta {
  grid-column: 1;
  font-size: 0.75rem;
  opacity: 0.72;
}
.offer-usd {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.72;
  text-align: right;
}
.offer-price {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

/* Guía y otras categorías */
.guide-list {
  max-width: 70ch;
  margin: 12px 0 0;
  padding-left: 22px;
  font-size: 0.95rem;
}
.guide-list li {
  padding: 4px 0;
}
.sibling-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 4px 20px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.sibling-list li {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.95rem;
}
</style>
