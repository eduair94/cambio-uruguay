<!--
THESIS: Someone asked r/uruguay how much to spend on a 2-plaza sommier, and where "investment" ends and
"money badly spent" begins. Answer with today's band, what each price tranche buys according to its own
listings, and the two numbers that buy nothing: the crossed-out price and the "ortopédico" premium.
OWN-WORLD: Same surfaces, type and link blue as /equipar-casa-uruguay, the hub this page hangs from.
FIRST VIEWPORT: Breadcrumbs, the question as the H1, the answer with today's figures, the three cards.
FAMILY: Spanish only, like the category pages: the canonical carries no locale prefix.
-->
<template>
  <VContainer class="sommier py-6 py-md-10">
    <VBreadcrumbs :items="crumbs" class="px-0 pb-2" />

    <header class="sommier-header">
      <p class="eyebrow">Equipar la casa</p>
      <h1>{{ SOMMIER_H1 }}</h1>
      <p class="lead">{{ answer }}</p>
      <p class="criterion">
        La otra mitad de la pregunta —hasta dónde es inversión— no tiene una cifra, pero sí un
        criterio: la plata de más es inversión mientras compra algo que podés nombrar y comprobar en
        el aviso (el tipo de resorte, la densidad de la espuma, la garantía por escrito), y deja de
        serlo cuando lo único que sube es lo que no se puede comprobar: un nombre, un precio tachado
        que nadie cobró o la marca de la base.
      </p>
      <ShareButtons
        class="mt-4"
        :url="canonical"
        text="¿Cuánto gastar en un sommier de 2 plazas? Precios de hoy en Uruguay"
      />
    </header>

    <!-- ── La medida ──────────────────────────────────────────────────────── -->
    <div class="size-switch" role="group" aria-label="Medida del sommier">
      <span class="size-switch__label">Medida:</span>
      <button
        v-for="option in SOMMIER_SIZES"
        :key="option.variant"
        type="button"
        class="size-switch__option"
        :aria-pressed="variant === option.variant"
        @click="variant = option.variant"
      >
        {{ option.short }}
      </button>
    </div>

    <!-- ── Tres números ───────────────────────────────────────────────────── -->
    <section class="sommier-section" aria-labelledby="numeros-title">
      <h2 id="numeros-title">La respuesta en tres números: {{ sizeLabel }}</h2>
      <p v-if="!band" class="empty-note">
        Todavía no reunimos avisos suficientes de sommier de {{ sizeLabel }} para publicar una
        mediana ({{ minSample }} como mínimo). La página se completa sola con la próxima lectura de
        tiendas y Mercado Libre.
        <template v-if="current?.colchonBand">
          Mientras tanto, el colchón solo de esa medida cuesta
          {{ sommierMoney(current.colchonBand.median) }} en mediana.
        </template>
      </p>
      <div v-else class="verdict-grid">
        <article class="verdict-card">
          <h3>Lo normal</h3>
          <p class="verdict-amount">{{ sommierMoney(band.p25) }} a {{ sommierMoney(band.p75) }}</p>
          <p class="verdict-text">
            Lo que pide la mitad de los sommiers nuevos de {{ sizeLabel }}, con su colchón. Mediana
            {{ sommierMoney(band.median) }}, sobre {{ band.n }} avisos.
          </p>
        </article>
        <article class="verdict-card verdict-card--warn">
          <h3>Ya es caro</h3>
          <p class="verdict-amount">más de {{ sommierMoney(expensiveFrom) }}</p>
          <p class="verdict-text">
            {{
              topIsP90
                ? 'Más que nueve de cada diez avisos de la misma medida.'
                : 'Más que tres de cada cuatro avisos de la misma medida.'
            }}
            Puede valer la pena, pero tenés que poder decir qué te dan a cambio.
          </p>
        </article>
        <article class="verdict-card">
          <h3>Lo que suma la base</h3>
          <template v-if="premium && current?.colchonBand">
            <p class="verdict-amount">+{{ sommierMoney(premium.diff) }}</p>
            <p class="verdict-text">
              Contra la mediana del colchón solo de {{ sizeLabel }} ({{
                sommierMoney(current.colchonBand.median)
              }}): un {{ premium.pct }} % más. Son dos grupos de avisos distintos, no el precio de
              una base suelta.
            </p>
          </template>
          <p v-else class="verdict-text">
            Hoy no tenemos las dos medianas de {{ sizeLabel }} —conjunto y colchón solo— como para
            restarlas.
          </p>
        </article>
      </div>
      <p v-if="asOf" class="as-of">Relevado el {{ asOf }}.</p>
    </section>

    <!-- ── Qué compra cada tramo ──────────────────────────────────────────── -->
    <section id="tramos" class="sommier-section" aria-labelledby="tramos-title">
      <h2 id="tramos-title">Qué compra cada tramo de precio</h2>
      <p class="section-intro">
        En cada tramo contamos qué dice el título de cada aviso sobre lo que trae adentro. Si al
        subir de tramo crece la proporción de resortes pocket o de capas de confort, la plata está
        comprando construcción. Donde la proporción deja de cambiar, lo que sube es otra cosa: la
        marca, la altura, el respaldo o el nombre.
      </p>
      <p v-if="!tramos.length" class="empty-note">
        Todavía no hay avisos suficientes de {{ sizeLabel }} como para partirlos en tramos.
      </p>
      <template v-else>
        <div class="table-wrap">
          <table class="cu-mobile-cards tramo-table">
            <thead>
              <tr>
                <th scope="col">Tramo</th>
                <th scope="col">Precio</th>
                <th scope="col">Avisos</th>
                <th scope="col">Pocket</th>
                <th scope="col">Bonnell u otros resortes</th>
                <th scope="col">Espuma</th>
                <th scope="col">No lo dice</th>
                <th scope="col">Con capa de confort</th>
                <th scope="col">Dice «ortopédico»</th>
                <th scope="col">Con precio tachado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tramo in tramos" :key="tramo.key">
                <td data-label="" class="tramo-name">{{ sommierTramoLabel(tramo) }}</td>
                <td data-label="Precio" class="price">{{ sommierTramoRange(tramo) }}</td>
                <td data-label="Avisos" class="num">{{ tramo.n }}</td>
                <td data-label="Pocket" class="num">
                  {{ sommierShare(tramo.cores.pocket, tramo.n) }}
                </td>
                <td data-label="Bonnell u otros resortes" class="num">
                  {{ sommierShare(tramo.cores.bonnell + tramo.cores.resortes, tramo.n) }}
                </td>
                <td data-label="Espuma" class="num">
                  {{ sommierShare(tramo.cores.espuma, tramo.n) }}
                </td>
                <td data-label="No lo dice" class="num">
                  {{ sommierShare(tramo.cores['sin-dato'], tramo.n) }}
                </td>
                <td data-label="Con capa de confort" class="num">
                  {{ sommierShare(tramo.comfort, tramo.n) }}
                </td>
                <td data-label="Dice «ortopédico»" class="num">
                  {{ sommierShare(tramo.ortopedico, tramo.n) }}
                </td>
                <td data-label="Con precio tachado" class="num">
                  {{ sommierShare(tramo.tachado, tramo.n) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="table-note">
          {{ analysis.listings }} avisos nuevos de sommier de {{ sizeLabel }} vistos en los últimos
          {{ windowDays }} días. Los cortes de 25&nbsp;% y 75&nbsp;% son los de la banda publicada;
          el de nueve de cada diez sale de estos avisos. Un tramo con menos de {{ minTramo }} avisos
          muestra cuántos hay y no proporciones. «Capa de confort» es pillow top, euro top,
          viscoelástica, látex o gel.
        </p>
      </template>
    </section>

    <!-- ── Lo que dice el título ──────────────────────────────────────────── -->
    <section class="sommier-section" aria-labelledby="nucleo-title">
      <h2 id="nucleo-title">Lo que trae adentro, y lo que se paga por eso</h2>
      <p class="section-intro">
        La mediana de cada tipo de núcleo, según lo que dice el aviso. Lo que no podemos ver es la
        calidad de cada uno: dos sommiers «pocket» pueden tener resortes muy distintos, y por eso la
        pregunta al vendedor es cuántos resortes y de qué calibre, o qué densidad tiene la espuma.
      </p>
      <p v-if="!analysis.listings" class="empty-note">
        Todavía no hay avisos de sommier de {{ sizeLabel }} vistos en los últimos
        {{ windowDays }} días.
      </p>
      <ul v-else class="core-list">
        <li v-for="core in analysis.cores" :key="core.key">
          <span class="core-name">{{ core.label }}</span>
          <span v-if="core.median !== null" class="price">{{ sommierMoney(core.median) }}</span>
          <span v-else class="muted">sin mediana</span>
          <span class="core-n">{{ core.n }} avisos</span>
        </li>
      </ul>
      <p v-if="analysis.listings" class="table-note">
        Publicamos una mediana desde {{ minSample }} avisos; con menos, sólo cuántos hay.
      </p>
      <p v-if="analysis.ortopedico" class="section-intro">
        <strong>«Ortopédico», «terapéutico», «postural».</strong> Los
        {{ analysis.ortopedico.n }} avisos que se presentan así piden
        {{ sommierMoney(analysis.ortopedico.median) }} en mediana, contra
        {{ sommierMoney(analysis.ortopedico.otherMedian) }} de los otros
        {{ analysis.ortopedico.otherN }}:
        {{
          analysis.ortopedico.premiumPct >= 0
            ? `un ${analysis.ortopedico.premiumPct} % más`
            : `un ${Math.abs(analysis.ortopedico.premiumPct)} % menos`
        }}. La palabra no dice qué tiene adentro: preguntá lo mismo que a cualquier otro.
      </p>
      <p v-else class="section-intro">
        <strong>«Ortopédico», «terapéutico», «postural».</strong> Hoy no hay avisos suficientes de
        los dos lados para comparar cuánto más piden. La palabra, de todos modos, no dice qué tiene
        adentro: preguntá lo mismo que a cualquier otro.
      </p>
    </section>

    <!-- ── Por noche ──────────────────────────────────────────────────────── -->
    <section id="por-noche" class="sommier-section" aria-labelledby="noche-title">
      <h2 id="noche-title">¿Inversión o plata tirada? Repartilo por noche</h2>
      <p class="section-intro">
        Un sommier se usa todas las noches durante años, y repartido así el salto entre un precio y
        otro cambia de tamaño. Los años son un horizonte para hacer la cuenta, no una vida útil: la
        que vale es la que el fabricante pone por escrito en la garantía, y ésa no la medimos.
      </p>
      <div v-if="nightRows.length" class="table-wrap">
        <table class="cu-mobile-cards night-table">
          <thead>
            <tr>
              <th scope="col">Precio</th>
              <th v-for="years in SOMMIER_YEARS" :key="years" scope="col">En {{ years }} años</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in nightRows" :key="row.key">
              <td data-label="" class="tramo-name">
                {{ row.label }}: <span class="price">{{ sommierMoney(row.price) }}</span>
              </td>
              <td
                v-for="cell in row.cells"
                :key="cell.years"
                :data-label="`En ${cell.years} años`"
                class="num"
              >
                {{ cell.text }} por noche
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="stepPerNight" class="section-intro">
        Pasar de la mediana a uno de los caros cuesta
        <strong>{{ stepPerNight }} más por noche</strong> en {{ STEP_YEARS }} años. Si eso compra un
        núcleo mejor, es poco; si compra el mismo núcleo con otro nombre, es mucho.
      </p>

      <div class="calc">
        <h3>Con tu presupuesto</h3>
        <div class="calc-controls">
          <label class="calc-field">
            <span>Precio del sommier ($)</span>
            <input
              v-model="quoteInput"
              type="number"
              inputmode="numeric"
              min="0"
              step="500"
              :placeholder="band ? String(band.median) : '30000'"
            />
          </label>
          <label class="calc-field">
            <span>Años que pensás usarlo</span>
            <input v-model.number="yearsInput" type="number" inputmode="numeric" min="1" max="20" />
          </label>
        </div>
        <p v-if="calc" class="calc-result">
          {{ sommierMoney(calc.price) }} en {{ calc.years }} años son
          <strong>{{ calc.night }} por noche</strong>, o {{ calc.month }} por mes.
          <template v-if="calc.position">{{ calc.position }}</template>
        </p>
        <p v-else class="muted">Poné un precio para hacer la cuenta.</p>
      </div>
    </section>

    <!-- ── El precio tachado ──────────────────────────────────────────────── -->
    <section id="tachado" class="sommier-section" aria-labelledby="tachado-title">
      <h2 id="tachado-title">El precio tachado no es una referencia</h2>
      <p v-if="analysis.tachado" class="section-intro">
        De {{ analysis.tachado.total }} sommiers nuevos de {{ sizeLabel }},
        <strong>{{ analysis.tachado.withList }} muestran un precio tachado</strong>, con un
        descuento declarado de {{ analysis.tachado.medianOffPct }} % en mediana.
        <template v-if="analysis.tachado.listAboveP90 !== null && analysis.p90 !== null">
          Y {{ analysis.tachado.listAboveP90 }} de esos tachan un precio por encima de
          {{ sommierMoney(analysis.p90) }}, que es más de lo que piden nueve de cada diez avisos de
          la misma medida.
        </template>
      </p>
      <p v-else class="section-intro">
        Hoy no hay avisos suficientes de {{ sizeLabel }} para medir cuántos muestran un precio
        tachado.
      </p>
      <p class="section-intro">
        Para decidir si un precio es bueno, la comparación que sirve es contra lo que cobra el
        mercado hoy por la misma medida —la franja de arriba—, no contra el número tachado del
        propio aviso. En la
        <NuxtLink :to="localePath(SOMMIER_CATEGORY_PATH)">página de precios del sommier</NuxtLink>
        cada oferta muestra además cómo se movió su propio precio desde que la vemos, y en
        <NuxtLink :to="localePath('/ciberlunes-y-black-friday-uruguay')"
          >CyberLunes y Black Friday</NuxtLink
        >
        está cómo distinguimos un descuento real de uno inflado.
      </p>
    </section>

    <!-- ── La base ────────────────────────────────────────────────────────── -->
    <section class="sommier-section" aria-labelledby="base-title">
      <h2 id="base-title">¿Hace falta la base?</h2>
      <p class="section-intro">
        Lo que se siente al dormir es el colchón; la base le da altura y un apoyo parejo. Por eso,
        en el orden para equipar una casa vacía, el colchón es de lo primero y el sommier «puede
        esperar meses»: con el colchón sobre un estrado o una cama de tablas se duerme desde la
        primera noche. Si el presupuesto no alcanza para los dos buenos, el que importa es el
        colchón.
      </p>
      <p class="section-intro">
        <NuxtLink :to="localePath('/equipar-casa-uruguay/colchon')"
          >Precios del colchón solo, por medida</NuxtLink
        >
        ·
        <NuxtLink :to="`${localePath('/equipar-casa-uruguay')}#ranking`"
          >Qué comprar primero para una casa vacía</NuxtLink
        >
      </p>
    </section>

    <!-- ── Usado ──────────────────────────────────────────────────────────── -->
    <section class="sommier-section" aria-labelledby="usado-title">
      <h2 id="usado-title">Usado, no</h2>
      <p class="section-intro">
        Para equipar una casa vacía, buena parte se puede comprar usada; el colchón no, y el sommier
        tampoco, porque lo trae, y un colchón usado viene con lo que no se ve en la foto: chinches,
        ácaros y un hundimiento que recién notás cuando dormís encima. La base sola usada es otra
        compra.
      </p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />

    <!-- ── Seguí por acá ──────────────────────────────────────────────────── -->
    <section class="sommier-section" aria-labelledby="seguir-title">
      <h2 id="seguir-title">Seguí por acá</h2>
      <ul class="related-list">
        <li v-for="link in related" :key="link.to">
          <NuxtLink :to="localePath(link.to)" class="cat-link">{{ link.label }}</NuxtLink>
          <span>{{ link.hint }}</span>
        </li>
      </ul>
    </section>

    <!-- ── Método ─────────────────────────────────────────────────────────── -->
    <section class="sommier-section" aria-labelledby="metodo-title">
      <h2 id="metodo-title">De dónde salen estos números</h2>
      <p class="section-intro">
        De la misma lectura diaria de tiendas uruguayas y Mercado Libre que arma
        <NuxtLink :to="localePath('/equipar-casa-uruguay')">Equipar una casa</NuxtLink>. Un sommier
        es el conjunto de base y colchón: la base sola, las sábanas, los protectores y los respaldos
        «para sommier» quedan afuera, y el colchón solo se mide en su propia fila. La banda de cada
        medida (25&nbsp;%, mediana y 75&nbsp;%) es la misma que publica la página de precios del
        sommier.
      </p>
      <p class="section-intro">
        Los tramos, los núcleos, la palabra «ortopédico» y el precio tachado salen de los avisos
        nuevos vistos en los últimos {{ windowDays }} días, sin los que quedaron muy por debajo de
        su propia banda. Es lo que cada aviso dice de sí mismo: no probamos colchones, así que nada
        de esto mide comodidad ni duración.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  SOMMIER_CATEGORY_PATH,
  SOMMIER_DEFAULT_VARIANT,
  SOMMIER_DESCRIPTION,
  SOMMIER_H1,
  SOMMIER_MIN_SAMPLE,
  SOMMIER_MIN_TRAMO,
  SOMMIER_PATH,
  SOMMIER_SIZES,
  SOMMIER_TITLE,
  SOMMIER_WINDOW_DAYS,
  SOMMIER_YEARS,
  sommierAnalyze,
  sommierAnswer,
  sommierBasePremium,
  sommierDate,
  sommierEmptyResponse,
  sommierFaq,
  sommierMoney,
  sommierMoneyPerNight,
  sommierPerNight,
  sommierShare,
  sommierSize,
  sommierTramoLabel,
  sommierTramoRange,
  type SommierResponse,
  type SommierVariant,
} from '~/utils/sommierBudget'

const localePath = useLocalePath()

const minSample = SOMMIER_MIN_SAMPLE
const minTramo = SOMMIER_MIN_TRAMO
const windowDays = SOMMIER_WINDOW_DAYS
/** El horizonte del "pasar de la mediana a uno caro": el del medio de los tres de la tabla. */
const STEP_YEARS = SOMMIER_YEARS[1]

// Server-rendered: la respuesta con las cifras del día tiene que estar en el HTML que lee el
// buscador. La API devuelve sólo agregados.
const { data } = await useFetch<SommierResponse>('/api/sommier', {
  key: 'sommier',
  server: true,
  default: () => sommierEmptyResponse(),
})

const generatedAt = computed(() => data.value?.generatedAt ?? null)
const asOf = computed(() => sommierDate(generatedAt.value))

// La pregunta es por 2 plazas: la respuesta del encabezado y el FAQ hablan siempre de esa medida.
// El selector cambia las secciones de abajo, para quien duerme en otra.
const headline = computed(() => sommierSize(data.value, SOMMIER_DEFAULT_VARIANT))
const answer = computed(() => sommierAnswer(headline.value, generatedAt.value))
const faq = computed<FaqItem[]>(() => sommierFaq(headline.value, generatedAt.value))

const variant = ref<SommierVariant>(SOMMIER_DEFAULT_VARIANT)
const current = computed(() => sommierSize(data.value, variant.value))
const sizeLabel = computed(() => current.value?.short ?? '2 plazas')
const band = computed(() => current.value?.band ?? null)
const analysis = computed(() => current.value?.analysis ?? sommierAnalyze([], null))
const tramos = computed(() => analysis.value.tramos)
const premium = computed(() => sommierBasePremium(current.value))

const topIsP90 = computed(
  () => !!band.value && analysis.value.p90 !== null && analysis.value.p90 > band.value.p75
)
const expensiveFrom = computed(() =>
  topIsP90.value ? (analysis.value.p90 as number) : (band.value?.p75 ?? 0)
)

// ── Por noche
const nightRows = computed(() => {
  if (!band.value) return []
  const marks: Array<{ key: string; label: string; price: number }> = [
    { key: 'p25', label: 'Uno de los baratos', price: band.value.p25 },
    { key: 'median', label: 'El del medio', price: band.value.median },
    { key: 'p75', label: 'Uno de los caros', price: band.value.p75 },
  ]
  if (topIsP90.value) {
    marks.push({
      key: 'p90',
      label: 'Más caro que 9 de cada 10',
      price: analysis.value.p90 as number,
    })
  }
  return marks.map(mark => ({
    ...mark,
    cells: SOMMIER_YEARS.map(years => ({
      years,
      text: sommierMoneyPerNight(sommierPerNight(mark.price, years) ?? 0),
    })),
  }))
})

const stepPerNight = computed(() => {
  if (!band.value) return null
  const from = sommierPerNight(band.value.median, STEP_YEARS)
  const to = sommierPerNight(band.value.p75, STEP_YEARS)
  if (from === null || to === null || !(to > from)) return null
  return sommierMoneyPerNight(to - from)
})

const quoteInput = ref<number | string>('')
const yearsInput = ref<number | string>(STEP_YEARS)
const calc = computed(() => {
  const typed = Number(quoteInput.value)
  const price = Number.isFinite(typed) && typed > 0 ? typed : (band.value?.median ?? 0)
  const years = Number(yearsInput.value)
  const night = sommierPerNight(price, years)
  if (night === null) return null
  let position = ''
  if (band.value) {
    if (price < band.value.p25) position = ' Está entre los más baratos de su medida.'
    else if (price <= band.value.p75) position = ' Está en la mitad del medio de su medida.'
    else if (topIsP90.value && price > (analysis.value.p90 as number))
      position = ' Es más que lo que piden nueve de cada diez de su medida.'
    else position = ' Es más que lo que piden tres de cada cuatro de su medida.'
  }
  return {
    price,
    years,
    night: sommierMoneyPerNight(night),
    month: sommierMoney(price / (years * 12)),
    position,
  }
})

const related = [
  {
    to: SOMMIER_CATEGORY_PATH,
    label: 'Precio de sommiers',
    hint: 'La mediana por medida y los modelos con sus ofertas',
  },
  {
    to: '/equipar-casa-uruguay/productos/sommier',
    label: 'Avisos de sommier',
    hint: 'Todos, con filtros de precio, medida y marca',
  },
  {
    to: '/equipar-casa-uruguay/colchon',
    label: 'Precio de colchones',
    hint: 'El colchón solo, por medida',
  },
  {
    to: '/equipar-casa-uruguay',
    label: 'Equipar una casa',
    hint: 'Qué comprar primero y cuánto sale todo',
  },
  {
    to: '/fletes-mudanzas-uruguay',
    label: 'Fletes y mudanzas',
    hint: 'Cuánto sale llevarlo hasta tu casa',
  },
  {
    to: '/conviene-comprar-en-cuotas',
    label: 'Cuotas o contado',
    hint: 'Si financiar lo caro conviene',
  },
  {
    to: '/defensa-al-consumidor-uruguay',
    label: 'Defensa del consumidor',
    hint: 'Qué hacer si la garantía no se cumple',
  },
]

// ── SEO
const canonical = `https://cambio-uruguay.com${SOMMIER_PATH}`

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Equipar una casa', to: localePath('/equipar-casa-uruguay') },
  { title: 'Cuánto gastar en un sommier', disabled: true },
])

defineOgImageComponent('Cambio', {
  title: 'Cuánto gastar en un sommier',
  subtitle: () =>
    headline.value?.band
      ? `2 plazas: mediana ${sommierMoney(headline.value.band.median).replace('\u00A0', ' ')}`
      : 'Precios relevados en Uruguay',
  tag: 'EQUIPAR',
})

useSeoMeta({
  title: `${SOMMIER_TITLE} | Cambio Uruguay`,
  description: SOMMIER_DESCRIPTION,
  ogTitle: SOMMIER_TITLE,
  ogDescription: SOMMIER_DESCRIPTION,
  ogType: 'article',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
  twitterTitle: SOMMIER_TITLE,
  twitterDescription: SOMMIER_DESCRIPTION,
})

// FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical }],
  meta: [
    {
      name: 'keywords',
      content:
        'cuanto gastar en un sommier, precio sommier 2 plazas uruguay, cuanto sale un sommier, sommier o colchon, sommier caro, sommier pocket o bonnell, sommier ortopedico',
    },
  ],
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
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Cuánto gastar en un sommier',
                item: canonical,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: SOMMIER_H1,
            description: SOMMIER_DESCRIPTION,
            inLanguage: 'es-UY',
            ...(generatedAt.value ? { dateModified: generatedAt.value } : {}),
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.sommier {
  max-width: 1120px;
}
/* Vuetify 4 no anula el margen de los bloques de texto: cada uno declara el suyo (DESIGN.md → "The
   Text Block Owns Its Top Margin Rule"). */
.sommier p {
  margin: 12px 0 0;
}
.eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.75;
}
.sommier-header h1 {
  margin: 4px 0 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  line-height: 1.2;
  text-wrap: balance;
}
.lead {
  max-width: 68ch;
  font-size: 1.075rem;
}
.criterion {
  max-width: 68ch;
  font-size: 0.95rem;
  opacity: 0.88;
}
.sommier-section {
  margin-top: 40px;
}
.sommier-section h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.25;
}
.sommier-section h3 {
  margin: 0;
  font-size: 1.05rem;
}
.section-intro {
  max-width: 70ch;
  font-size: 0.95rem;
}
.empty-note {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.95rem;
}
/* Enlaces: el azul de enlace del tema, que pasa AA en los dos modos (nunca primary). Los que van
   dentro de un párrafo no llevan clase, que con dos atributos prettier y vue/max-attributes-per-line
   no se ponen de acuerdo en dónde cortar la línea. */
.cat-link,
.section-intro a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
/* 0.66 es el piso que todavía pasa 4.5:1 sobre el lienzo claro (medido en el hub de equipar). */
.muted {
  opacity: 0.66;
  font-size: 0.875rem;
}
.as-of,
.table-note {
  max-width: 70ch;
  font-size: 0.8rem;
  opacity: 0.75;
}
.price,
.num {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.price {
  font-weight: 600;
}

/* Selector de medida: botones de 44 px de alto, el mínimo cómodo para el pulgar. */
.size-switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 28px;
}
.size-switch__label {
  font-size: 0.9rem;
  font-weight: 600;
}
.size-switch__option {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
  cursor: pointer;
}
.size-switch__option[aria-pressed='true'] {
  border-color: rgb(var(--v-theme-link));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-link));
  font-weight: 700;
}

/* Tres números */
.verdict-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.verdict-card {
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.verdict-card--warn {
  border-color: rgba(var(--v-theme-warning), 0.6);
}
.verdict-amount {
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.verdict-text {
  font-size: 0.9rem;
}

/* Tablas */
.table-wrap {
  margin-top: 16px;
  overflow-x: auto;
}
.tramo-table,
.night-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.tramo-table th,
.night-table th {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.4);
  font-weight: 600;
  text-align: left;
  vertical-align: bottom;
}
.tramo-table td,
.night-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  vertical-align: top;
}
.tramo-name {
  font-weight: 600;
}

/* Núcleos */
.core-list {
  max-width: 70ch;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.core-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 4px 16px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  font-size: 0.95rem;
}
.core-n {
  font-size: 0.8rem;
  opacity: 0.75;
  text-align: right;
}

/* Calculadora */
.calc {
  max-width: 70ch;
  margin-top: 24px;
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.calc-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
}
.calc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.875rem;
}
.calc-field input {
  min-height: 44px;
  width: 12rem;
  max-width: 100%;
  padding: 0 12px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
}
.calc-result {
  font-size: 0.95rem;
}

/* Seguí por acá */
.related-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px 24px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.related-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 44px;
  font-size: 0.95rem;
}
.related-list span {
  font-size: 0.8rem;
  opacity: 0.75;
}
</style>
