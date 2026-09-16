<template>
  <VContainer class="cd-rank py-6">
    <VBreadcrumbs :items="crumbs" class="px-0 pt-0" />

    <header class="hero mb-8">
      <div class="eyebrow">r/CharruaDevs · ranking de autores</div>
      <h1 class="text-h4 text-md-h3 font-weight-bold mt-2 mb-3">
        Quiénes son los más negativos (y los más positivos) del sub
      </h1>
      <p class="dek">
        El mismo corpus del
        <NuxtLink :to="localePath('/mercado-it-uruguay')">termómetro del mercado IT</NuxtLink>, pero
        mirado por autor: {{ fmtInt(A?.opinions) }} opiniones sobre el mercado y la carrera
        repartidas entre {{ fmtInt(A?.authors) }} cuentas. Ordena la orientación de lo que cada una
        escribió, no quién es ni cuánta razón tiene.
      </p>
      <div v-if="A" class="kpis">
        <div v-for="k in kpis" :key="k.label" class="kpi">
          <b>{{ k.value }}</b>
          <span>{{ k.label }}</span>
        </div>
      </div>
      <VAlert v-else type="info" variant="tonal" class="mt-4">
        El ranking se está calculando. Volvé en un rato: lo rehace el trabajo diario del termómetro.
      </VAlert>
    </header>

    <template v-if="A">
      <section class="block" aria-labelledby="antes">
        <div class="kicker">Antes de leer la lista</div>
        <h2 id="antes" class="text-h5 font-weight-bold mb-2">{{ framingTitle }}</h2>
        <p class="lead">{{ framingText }}</p>
        <div class="cards">
          <VCard v-for="c in framingCards" :key="c.title" variant="outlined" class="pa-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ c.title }}</h3>
            <p class="text-body-2 mb-0">{{ c.body }}</p>
          </VCard>
        </div>
      </section>

      <section class="block" aria-labelledby="negativos">
        <div class="kicker">El top</div>
        <h2 id="negativos" class="text-h5 font-weight-bold mb-2">Los más negativos</h2>
        <p class="lead">{{ negativeText }}</p>
        <VCard variant="outlined" class="pa-4">
          <AuthorTable
            :rows="A.negative"
            :metric="'score'"
            label="Autores más negativos de r/CharruaDevs"
          />
        </VCard>
      </section>

      <section class="block" aria-labelledby="positivos">
        <h2 id="positivos" class="text-h5 font-weight-bold mb-2">Los más positivos</h2>
        <p class="lead">{{ positiveText }}</p>
        <VCard variant="outlined" class="pa-4">
          <AuthorTable
            :rows="A.positive"
            :metric="'score'"
            label="Autores más positivos de r/CharruaDevs"
          />
        </VCard>
      </section>

      <section class="block" aria-labelledby="catastrofistas">
        <h2 id="catastrofistas" class="text-h5 font-weight-bold mb-2">Los catastrofistas</h2>
        <p class="lead">{{ doomText }}</p>
        <VCard variant="outlined" class="pa-4">
          <AuthorTable
            :rows="A.doomers"
            :metric="'doom'"
            label="Autores con más opiniones de catástrofe"
          />
        </VCard>
      </section>

      <section class="block" aria-labelledby="voz">
        <h2 id="voz" class="text-h5 font-weight-bold mb-2">Los que más opinan</h2>
        <p class="lead">{{ loudestText }}</p>
        <VCard variant="outlined" class="pa-4">
          <AuthorTable
            :rows="A.loudest"
            :metric="'n'"
            label="Autores con más opiniones sobre el mercado"
          />
        </VCard>
      </section>

      <section class="block" aria-labelledby="votados">
        <h2 id="votados" class="text-h5 font-weight-bold mb-2">A quién le votan qué</h2>
        <p class="lead">{{ karmaText }}</p>
        <div class="pair">
          <VCard variant="outlined" class="pa-4">
            <div class="fig-title mb-2">Pesimismo más votado</div>
            <div class="fig-sub mb-3">
              Karma sumado de sus opiniones negativas, no de todo lo que escribió.
            </div>
            <AuthorTable
              :rows="A.mostUpvotedNeg"
              :metric="'negK'"
              label="Autores con más karma en sus opiniones negativas"
            />
          </VCard>
          <VCard variant="outlined" class="pa-4">
            <div class="fig-title mb-2">Optimismo más votado</div>
            <div class="fig-sub mb-3">Karma sumado de sus opiniones positivas.</div>
            <AuthorTable
              :rows="A.mostUpvotedPos"
              :metric="'posK'"
              label="Autores con más karma en sus opiniones positivas"
            />
          </VCard>
        </div>
      </section>

      <section v-if="A.pessimistic.length" class="block" aria-labelledby="giros">
        <h2 id="giros" class="text-h5 font-weight-bold mb-2">Los que cambiaron de opinión</h2>
        <p class="lead">{{ shiftText }}</p>
        <div class="pair">
          <VCard variant="outlined" class="pa-4">
            <div class="fig-title mb-2">Se volvieron más pesimistas</div>
            <div class="fig-sub mb-3">Media de sus opiniones antes y ahora.</div>
            <AuthorTable
              :rows="A.pessimistic"
              :metric="'delta'"
              label="Autores que se volvieron más pesimistas"
            />
          </VCard>
          <VCard variant="outlined" class="pa-4">
            <div class="fig-title mb-2">Se volvieron más optimistas</div>
            <div class="fig-sub mb-3">Media de sus opiniones antes y ahora.</div>
            <AuthorTable
              :rows="A.optimistic"
              :metric="'delta'"
              label="Autores que se volvieron más optimistas"
            />
          </VCard>
        </div>
      </section>

      <section class="block" aria-labelledby="metodo">
        <div class="kicker">Cómo se hizo</div>
        <h2 id="metodo" class="text-h5 font-weight-bold mb-3">
          El método, y qué NO dice esta lista
        </h2>
        <VCard variant="outlined" class="pa-5">
          <p class="text-body-2">
            Cada texto lo clasificó el mismo modelo que alimenta el termómetro ({{ model }}) en una
            escala de −2 («se terminó») a +2 («sobra trabajo»). Una «opinión» es un texto que habla
            del mercado o de la carrera y toma partido; las preguntas y los avisos de trabajo quedan
            en 0 o afuera. El corpus va de {{ from }} a {{ to }} e incluye lo que después se borró,
            porque el archivo lo conserva.
          </p>
          <p class="text-body-2">
            El orden no es la media cruda: es una <b>media encogida</b> hacia la media del sub ({{
              signed(A.prior)
            }}) con un peso de {{ A.k }} opiniones. Con pocas opiniones la media es ruido —una
            cuenta con cuatro «se terminó» daría −2 y encabezaría todo—, así que hace falta sostener
            una postura muchas veces para llegar arriba. Además, ninguna tabla admite cuentas con
            menos de {{ A.minOps }} opiniones, y quedan afuera AutoModerator y las cuentas borradas.
          </p>
          <p class="text-body-2 mb-0">
            Qué no dice: nada sobre las personas. El clasificador acierta el signo entre el 61 % y
            el 69 % de las veces y nunca se va más de un punto (validación ciega en la
            <NuxtLink :to="localePath('/mercado-it-uruguay')">página del termómetro</NuxtLink>), así
            que una posición concreta puede estar mal por un lugar o dos; lo que aguanta es la forma
            general. Tampoco mide si alguien tiene razón: el sub podía tener razón en 2023 y estar
            equivocado hoy, y esto no lo sabe. Si estás en la lista y no querés estar,
            <NuxtLink :to="localePath('/contacto')">escribinos</NuxtLink> y te sacamos.
          </p>
        </VCard>
        <p class="upd">
          Datos al {{ updatedAt }}. Se recalcula todos los días con el resto del termómetro.
        </p>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AuthorTable from '~/components/mercadoIt/AuthorTable.vue'
import { fmtInt, fmtPct, monthLabel, type CharruaSnapshot } from '~/utils/charruadevs'

const localePath = useLocalePath()

// La misma clave que /mercado-it-uruguay: si se navega entre las dos, el snapshot se pide una vez.
const { data: snap } = await useFetch<CharruaSnapshot | null>('/api/charruadevs/summary', {
  key: 'charruadevs-summary',
  default: () => null,
})

const A = computed(() => snap.value?.authors ?? null)
const model = computed(() => snap.value?.model ?? 'Gemini')
const updatedAt = computed(() => snap.value?.generatedAt.slice(0, 10) ?? '')
const from = computed(() => monthLabel(snap.value?.corpus.from ?? '2021-04-01'))
const to = computed(() => monthLabel(snap.value?.corpus.to ?? '2026-09-01'))

const signed = (v: number | null | undefined, d = 2): string =>
  v == null
    ? '—'
    : `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('es-UY', {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })}`

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Mercado IT', to: localePath('/mercado-it-uruguay') },
  { title: 'Ranking de autores', disabled: true },
])

const kpis = computed(() => [
  { value: fmtInt(A.value?.authors), label: 'cuentas con al menos una opinión sobre el mercado' },
  { value: fmtInt(A.value?.opinions), label: 'opiniones clasificadas, de 2021 a hoy' },
  {
    value: fmtPct(A.value?.concentration.top10),
    label: 'de todas las opiniones las escribe el 10 % de las cuentas',
  },
  {
    value: fmtPct(A.value?.mix.negative),
    label: `de quienes opinan seguido (${A.value?.mix.minOps}+) son mayormente negativos`,
  },
])

const framingTitle = computed(() =>
  (A.value?.concentration.tableNegShare ?? 0) < 0.1
    ? 'El pesimismo no es obra de diez amargados'
    : 'Unas pocas cuentas concentran el pesimismo'
)

const framingText = computed(() => {
  const c = A.value?.concentration
  if (!c) return ''
  return `Los diez de la primera tabla escriben ${fmtPct(c.tableNegShare)} de las opiniones negativas del sub. El resto lo sostiene mucha gente que opina poco: ${fmtInt(c.single)} cuentas (${fmtPct(c.singleShare)} del total) opinaron una sola vez en cinco años. Eso importa para leer lo que sigue: la lista muestra quién lo dice más seguido y más fuerte, no de dónde viene el pesimismo.`
})

const framingCards = computed(() => {
  const A2 = A.value
  if (!A2) return []
  const k = A2.karmaByOrientation
  const best =
    k.negative != null && k.mixed != null && k.positive != null
      ? Math.max(k.negative, k.mixed, k.positive)
      : null
  return [
    {
      title: 'Habla poca gente, y mucho',
      body: `El 1 % de las cuentas escribe ${fmtPct(A2.concentration.top1)} de las opiniones y ${fmtPct(A2.concentration.top1Neg)} de las negativas; el 10 %, ${fmtPct(A2.concentration.top10)} y ${fmtPct(A2.concentration.top10Neg)}. El Gini de la distribución es ${A2.concentration.gini.toLocaleString('es-UY', { maximumFractionDigits: 2 })}: más desigual que casi cualquier reparto de ingresos.`,
    },
    {
      title: 'La mayoría no es extrema',
      body: `Entre quienes tienen al menos ${A2.mix.minOps} opiniones, ${fmtPct(A2.mix.negative)} son mayormente negativos, ${fmtPct(A2.mix.positive)} mayormente positivos y ${fmtPct(A2.mix.mixed)} mixtos —ni una cosa ni la otra—. Para entrar en «mayormente» hace falta separar diez puntos entre lo negativo y lo positivo propio.`,
    },
    {
      title: 'El sub no premia al pesimista',
      body:
        k.negative != null
          ? `Karma promedio por comentario según la orientación de quien lo escribe: ${x2(k.negative)} los mayormente negativos, ${x2(k.mixed)} los mixtos y ${x2(k.positive)} los mayormente positivos${best != null && k.negative < best ? '. El pesimismo no es lo más votado' : ''}. La ventaja que se ve texto por texto la hacen unos pocos comentarios que explotan, no una prima estable.`
          : 'Todavía no hay suficientes comentarios con voto para medirlo.',
    },
    {
      title: 'Y casi todos se movieron para el mismo lado',
      body: `De las ${fmtInt(A2.shift.both)} cuentas con historia en las dos ventanas, ${fmtInt(A2.shift.morePessimistic)} se volvieron más pesimistas y ${fmtInt(A2.shift.moreOptimistic)} más optimistas. No es que aparecieron cuentas negativas: es la misma gente opinando peor.`,
    },
  ]
})

const x2 = (v: number | null | undefined) =>
  v == null
    ? '—'
    : v.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const negativeText = computed(() => {
  const top = A.value?.negative[0]
  if (!top) return ''
  return `Ordenados por la orientación media de sus opiniones, ya encogida. Encabeza ${top.a}: ${fmtInt(top.n)} opiniones, ${fmtPct(top.neg)} negativas y ${fmtPct(top.doom)} en el extremo «se terminó». La barra de la derecha es el reparto de cada uno entre negativo, neutral y positivo.`
})

const positiveText = computed(() => {
  const top = A.value?.positive[0]
  if (!top) return ''
  return `La misma medida al revés. Encabeza ${top.a}, con ${fmtPct(top.pos)} de opiniones positivas sobre ${fmtInt(top.n)}. Mirá los temas debajo de cada nombre: el optimismo del sub habla de trabajar para afuera y de estudiar, y el pesimismo, de las empresas de acá, las condiciones y la IA.`
})

const doomText = computed(
  () =>
    `Acá no manda el promedio sino el extremo: qué parte de lo que cada uno opinó es −2, la postura de «se terminó, no estudies esto». Es la etiqueta más rara del corpus y la que más pesa cuando aparece.`
)

const loudestText = computed(() => {
  const top = A.value?.loudest[0]
  if (!top) return ''
  return `Las voces grandes del sub casi no son extremas: ${top.a} lleva ${fmtInt(top.n)} opiniones y aun así reparte ${fmtPct(top.neg)} negativas contra ${fmtPct(top.pos)} positivas. Nadie sostiene una postura de un solo signo a lo largo de miles de comentarios.`
})

const karmaText = computed(
  () =>
    `Sumando los votos que juntó cada uno, pero separando lo que dijo en contra de lo que dijo a favor: con el karma total mezclado, «pesimismo más votado» lo encabeza cualquiera que haya tenido un comentario viral del otro signo.`
)

const shiftText = computed(() => {
  const s = A.value?.shift
  if (!s) return ''
  return `Sólo entran las cuentas con ${s.window}. La comparación es entre la media de lo que opinaban antes y la de lo que opinan ahora: ${fmtInt(s.morePessimistic)} empeoraron y ${fmtInt(s.moreOptimistic)} mejoraron.`
})

const TITLE = 'Ranking de usuarios de r/CharruaDevs: los más negativos y los más positivos'
const description =
  'Quiénes sostienen el pesimismo (y el optimismo) sobre el mercado IT en r/CharruaDevs, medido sobre todas sus opiniones clasificadas desde 2021.'

// `noindex` a propósito: es una lista de personas con nombre. Existe en el sitio y se llega desde
// el termómetro, pero que alguien busque un nombre propio no tiene por qué traerlo acá. La página
// indexable con los mismos datos, sin nombres, es /mercado-it-uruguay.
useSeoMeta({
  title: () => `${TITLE} | Cambio Uruguay`,
  description,
  robots: 'noindex, nofollow',
})
</script>

<style scoped>
.cd-rank {
  max-width: 1080px;
}
.eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}
.dek {
  font-size: 1.05rem;
  line-height: 1.6;
  max-width: 62ch;
  opacity: 0.9;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 22px;
}
.kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.kpi b {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
}
.kpi span {
  font-size: 0.85rem;
  opacity: 0.75;
  line-height: 1.3;
}
.block {
  margin-bottom: 44px;
}
.kicker {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.65;
  margin-bottom: 4px;
}
.lead {
  max-width: 72ch;
  line-height: 1.6;
  margin-bottom: 16px;
  opacity: 0.9;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}
.cards p {
  line-height: 1.55;
  opacity: 0.9;
}
/* Dos tablas al lado sólo si cada una tiene ancho de tabla. Con 340 px entraban de a dos en una
   tableta y adentro se partía el nombre de usuario: la grilla de la fila mira el viewport, no el
   contenedor, así que la que decide es esta. */
.pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: 16px;
}
.fig-title {
  font-weight: 700;
}
.fig-sub {
  font-size: 0.8rem;
  opacity: 0.7;
  line-height: 1.35;
}

.cd-rank :deep(p.text-body-2) {
  line-height: 1.6;
  margin-bottom: 12px;
}
.upd {
  font-size: 0.75rem;
  opacity: 0.65;
  margin-top: 10px;
}
</style>
