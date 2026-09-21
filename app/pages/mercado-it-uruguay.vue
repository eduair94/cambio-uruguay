<template>
  <VContainer class="mercado-it py-6">
    <VBreadcrumbs :items="crumbs" class="px-0 pt-0" />

    <header class="hero mb-10">
      <div class="eyebrow">r/CharruaDevs · {{ corpusLine }}</div>
      <h1 class="text-h4 text-md-h3 font-weight-bold mt-2 mb-3">
        ¿Qué tan mal está el mercado IT en Uruguay?
      </h1>
      <p class="dek">
        Leímos con IA cada post y cada comentario sobre trabajo del sub de desarrolladores uruguayos
        desde 2021 —{{ fmtInt(relTotal) }} opiniones sobre el mercado y la carrera— y medimos
        cuántas ven el futuro de la profesión con pesimismo. Abajo está el resultado, y un buscador
        para leerlas vos.
      </p>

      <div v-if="snap" class="hero-grid">
        <VCard variant="outlined" class="meter pa-5">
          <div class="meter-label">Últimos 90 días</div>
          <div class="meter-fig">
            <strong>{{ outOfTen(last90?.negOfOpinion) }}</strong>
            <span>de cada 10</span>
          </div>
          <div class="meter-cap">
            opiniones sobre el futuro de la profesión son negativas, entre las que toman partido
            (sin contar las neutrales).
          </div>
          <div class="meter-cmp">
            <div>
              <b>{{ fmtPct(y2022?.negOfOpinion) }}</b>
              <span>en 2022</span>
            </div>
            <div>
              <b>{{ fmtPct(W.sameLastYear?.negOfOpinion) }}</b>
              <span>hace un año</span>
            </div>
            <div>
              <b>{{ fmtPct(last90?.negOfOpinion) }}</b>
              <span>ahora</span>
            </div>
          </div>
        </VCard>
        <div class="kpis">
          <div v-for="k in kpis" :key="k.label" class="kpi">
            <b>{{ k.value }}</b>
            <span>{{ k.label }}</span>
          </div>
        </div>
      </div>
      <VAlert v-else type="info" variant="tonal" class="mt-4">
        El tablero se está actualizando. Mientras tanto, el buscador de más abajo sigue funcionando.
      </VAlert>
    </header>

    <template v-if="snap">
      <section class="block" aria-labelledby="veredicto">
        <div class="kicker">El veredicto</div>
        <h2 id="veredicto" class="text-h5 text-md-h4 font-weight-bold mb-4">{{ verdictTitle }}</h2>
        <div class="verdict">
          <VCard v-for="c in verdictCards" :key="c.title" variant="outlined" class="pa-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ c.title }}</h3>
            <div class="text-body-2 card-body">{{ c.body }}</div>
          </VCard>
        </div>
      </section>

      <section class="block" aria-labelledby="curva">
        <div class="kicker">La curva</div>
        <h2 id="curva" class="text-h5 font-weight-bold mb-2">{{ curveTitle }}</h2>
        <p class="lead">{{ curveText }}</p>
        <VCard variant="outlined" class="pa-4">
          <div class="fig-title">Opiniones negativas y positivas sobre el mercado y la carrera</div>
          <div class="fig-sub">
            Parte de las opiniones de cada mes, promedio móvil de 3 meses. Los puntos violeta marcan
            los meses con algún lanzamiento de IA.
          </div>
          <div class="chart-wrap tall">
            <ClientOnly>
              <LineChart
                :key="`curve-${themeKey}`"
                :chart-data="curveData"
                :options="pctLineOptions"
                aria-label="Evolución mensual de las opiniones negativas y positivas en r/CharruaDevs. Los puntos marcan los meses con un lanzamiento de IA, detallados en la tabla de la sección Los lanzamientos"
              />
              <template #fallback>
                <VSkeletonLoader type="image" height="100%" />
              </template>
            </ClientOnly>
          </div>
        </VCard>

        <VCard variant="outlined" class="pa-4 mt-4">
          <div class="fig-title">Año por año, en la escala completa</div>
          <div class="fig-sub">
            Cada barra es el 100 % de las opiniones sobre el mercado de ese año: lo negativo a la
            izquierda, lo positivo a la derecha y lo neutral partido al medio.
          </div>
          <div class="scale" aria-label="Escala">
            <span v-for="s in STANCE_META" :key="s.value">
              <i :style="{ background: s.color }" aria-hidden="true" />{{ s.label }}
              <em>{{ s.phrase }}</em>
            </span>
          </div>
          <LikertChart :rows="likertRows" />
        </VCard>
      </section>

      <section class="block" aria-labelledby="temas">
        <div class="kicker">De qué se habla cuando se habla mal</div>
        <h2 id="temas" class="text-h5 font-weight-bold mb-2">{{ themesTitle }}</h2>
        <p class="lead">{{ themesText }}</p>
        <VCard variant="outlined" class="pa-4">
          <div class="fig-title mb-3">Temas de los últimos 12 meses</div>
          <ThemesTable :themes="snap.themes" />
        </VCard>
      </section>

      <section class="block" aria-labelledby="ia">
        <div class="kicker">La IA</div>
        <h2 id="ia" class="text-h5 font-weight-bold mb-2">
          La IA pasó de nota al pie a tema central
        </h2>
        <p class="lead">{{ aiText }}</p>
        <div class="two">
          <VCard variant="outlined" class="pa-4">
            <div class="fig-title">Comentarios que mencionan la IA</div>
            <div class="fig-sub">
              Por cada 1.000 comentarios del mes. Conteo directo, sin modelo de lenguaje. Los puntos
              violeta marcan los meses con algún lanzamiento de IA.
            </div>
            <div class="chart-wrap">
              <ClientOnly>
                <LineChart
                  :key="`ai-${themeKey}`"
                  :chart-data="aiMentionsData"
                  :options="lexOptions"
                  aria-label="Menciones de IA por cada mil comentarios. Los puntos marcan los meses con un lanzamiento de IA, detallados en la tabla de la sección Los lanzamientos"
                />
                <template #fallback>
                  <VSkeletonLoader type="image" height="100%" />
                </template>
              </ClientOnly>
            </div>
          </VCard>
          <VCard variant="outlined" class="pa-4">
            <div class="fig-title">¿Amenaza o herramienta?</div>
            <div class="fig-sub">
              Entre lo que opina de la IA, por trimestre. "No amenaza" junta herramienta y "puro
              hype".
            </div>
            <div class="chart-wrap">
              <ClientOnly>
                <BarChart
                  :key="`aiv-${themeKey}`"
                  :chart-data="aiViewData"
                  :options="stackedPctOptions"
                />
                <template #fallback>
                  <VSkeletonLoader type="image" height="100%" />
                </template>
              </ClientOnly>
            </div>
          </VCard>
        </div>
      </section>

      <section class="block" aria-labelledby="lanzamientos">
        <div class="kicker">Los lanzamientos</div>
        <h2 id="lanzamientos" class="text-h5 font-weight-bold mb-2">{{ releasesTitle }}</h2>
        <p class="lead">{{ releasesText }}</p>
        <VCard variant="outlined" class="pa-4">
          <div class="fig-title">Los lanzamientos marcados, uno por uno</div>
          <div class="fig-sub">
            Cada fecha es la del anuncio del propio fabricante, enlazado. Leídas contra su página
            oficial el {{ releasesVerifiedLabel }}.
          </div>
          <div class="table-wrap">
            <VTable density="comfortable" class="cu-mobile-cards releases-table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Qué salió</th>
                  <th scope="col">Quién</th>
                  <th scope="col">Menciones de IA por mil, antes → después</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in releaseRows" :key="`${r.date}-${r.label}`">
                  <td data-label="Fecha" class="text-no-wrap">{{ r.dateLabel }}</td>
                  <td data-label="Qué salió" class="cu-cell-prose">
                    <a :href="r.url" target="_blank" rel="noopener">{{ r.label }}</a>
                    <span class="why">{{ r.why }}</span>
                  </td>
                  <td data-label="Quién">{{ r.vendor }}</td>
                  <td data-label="Menciones de IA por mil, antes → después" class="text-no-wrap">
                    {{ r.baLabel }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCard>
        <p class="small mt-4">
          Esto no prueba causa. Los lanzamientos vienen en racimo —abril, mayo y junio de 2025 traen
          uno cada uno—, así que la ventana de tres meses de un lanzamiento casi siempre contiene
          otro: lo que se mide es el racimo, no el producto de esa fila. Los gráficos por trimestre
          no llevan marca: un trimestre tapa dos o tres lanzamientos y un punto ahí no distinguiría
          nada. El sub además cambió de composición con los años, como dice el método más abajo. Y
          el mercado se movió por cosas que no son un lanzamiento: el índice de avisos de Indeed que
          está más abajo en esta página se derrumba a lo largo de 2022 y 2023, y ese movimiento no
          tiene ninguna fila en esta tabla. La comparación además juega en contra suyo a propósito:
          muchos meses «sin lanzamiento» tienen uno a dos o tres meses de distancia y comparten
          media ventana con él, y eso acerca las dos proporciones.{{ robustnessNote }}
        </p>
      </section>

      <section class="block" aria-labelledby="quien">
        <div class="kicker">A quién le pega</div>
        <h2 id="quien" class="text-h5 font-weight-bold mb-2">{{ personaTitle }}</h2>
        <p class="lead">{{ personaText }}</p>
        <VCard variant="outlined" class="pa-4">
          <div class="fig-title mb-3">Posts negativos según quién escribe (últimos 12 meses)</div>
          <div class="hbars">
            <div v-for="p in personaRows" :key="p.persona" class="hbar">
              <span class="hname">
                {{ PERSONA_LABELS[p.persona] || p.persona }}
                <small>{{ fmtInt(p.n12) }} posts</small>
              </span>
              <span class="htrack">
                <b :style="{ width: `${(p.neg12 ?? 0) * 100}%`, background: NEG }" />
              </span>
              <span class="hval">{{ fmtPct(p.neg12) }}</span>
            </div>
          </div>
        </VCard>
      </section>

      <section class="block" aria-labelledby="relatos">
        <div class="kicker">Lo que la gente cuenta que le pasa</div>
        <h2 id="relatos" class="text-h5 font-weight-bold mb-2">
          Menos «conseguí laburo», más «me echaron»
        </h2>
        <p class="lead">{{ eventsText }}</p>
        <VCard variant="outlined" class="pa-4">
          <div class="fig-title">Relatos en primera persona, por trimestre</div>
          <div class="fig-sub">Por cada 1.000 textos clasificados del trimestre.</div>
          <div class="chart-wrap tall">
            <ClientOnly>
              <LineChart
                :key="`ev-${themeKey}`"
                :chart-data="eventsData"
                :options="perMilleOptions"
                aria-label="Relatos de búsqueda, empleo conseguido, despidos y contrataciones por trimestre"
              />
              <template #fallback>
                <VSkeletonLoader type="image" height="100%" />
              </template>
            </ClientOnly>
          </div>
        </VCard>
      </section>

      <section class="block" aria-labelledby="votos">
        <div class="kicker">¿El sub premia el pesimismo?</div>
        <h2 id="votos" class="text-h5 font-weight-bold mb-2">{{ votesTitle }}</h2>
        <p class="lead">{{ votesText }}</p>
        <VCard variant="outlined" class="pa-4">
          <div class="fig-title">Votos promedio de un comentario, según su tono</div>
          <div class="fig-sub">Puntos (a favor menos en contra) leídos hoy.</div>
          <div class="chart-wrap">
            <ClientOnly>
              <BarChart
                :key="`votes-${themeKey}`"
                :chart-data="votesData"
                :options="votesOptions"
              />
              <template #fallback>
                <VSkeletonLoader type="image" height="100%" />
              </template>
            </ClientOnly>
          </div>
        </VCard>
      </section>

      <section class="block" aria-labelledby="voces">
        <div class="kicker">Las voces</div>
        <h2 id="voces" class="text-h5 font-weight-bold mb-2">Lo más votado del último año</h2>
        <p class="lead">
          Los comentarios negativos con más votos de los últimos 12 meses, tal como se escribieron
          (sin nombres de usuario). Debajo, la otra campana.
        </p>
        <div class="quotes">
          <QuoteCard v-for="q in snap.quotesNeg.slice(0, 6)" :key="q.rid" :quote="q" />
        </div>
        <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-3">Y la otra campana</h3>
        <div class="quotes">
          <QuoteCard v-for="q in snap.quotesPos.slice(0, 4)" :key="q.rid" :quote="q" />
        </div>
      </section>

      <section v-if="snap.authors" class="block" aria-labelledby="quienes">
        <div class="kicker">Quiénes</div>
        <h2 id="quienes" class="text-h5 font-weight-bold mb-2">
          ¿Y quiénes lo dicen? Un ranking aparte
        </h2>
        <p class="lead">{{ rankingTeaser }}</p>
        <VCard variant="outlined" class="pa-5 rank-cta">
          <div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">
              Ranking de autores de r/CharruaDevs
            </h3>
            <p class="text-body-2 mb-0">
              Los más negativos y los más positivos, los catastrofistas, los que más opinan y los
              que cambiaron de opinión — con enlace al perfil de cada uno.
            </p>
          </div>
          <VBtn
            :to="localePath('/ranking-usuarios-charruadevs')"
            color="primary"
            variant="flat"
            append-icon="mdi-arrow-right"
          >
            Ver el ranking
          </VBtn>
        </VCard>
      </section>
    </template>

    <section id="buscador" class="block" aria-labelledby="buscador-titulo">
      <div class="kicker">Buscador</div>
      <h2 id="buscador-titulo" class="text-h5 font-weight-bold mb-2">
        Leelo vos: los posts y comentarios, con su tono
      </h2>
      <p class="lead">
        Filtrá por sentimiento, tema, visión de la IA o lo que cuenta cada autor. Arriba de los
        resultados se ve qué parte de lo que encontraste es negativa, y cómo cambió año a año.
      </p>
      <SearchPanel :years="years" />
    </section>

    <template v-if="snap">
      <section class="block" aria-labelledby="afuera">
        <div class="kicker">Contexto</div>
        <h2 id="afuera" class="text-h5 font-weight-bold mb-2">¿Exagera el sub?</h2>
        <p class="lead">{{ contextText }}</p>
        <!-- Sin serie no hay gráfico: un eje vacío se lee como "cero avisos". -->
        <VCard v-if="fredRows.length" variant="outlined" class="pa-4">
          <div class="fig-title">Avisos de desarrollo de software en Indeed, Estados Unidos</div>
          <div class="fig-sub">
            Índice, febrero de 2020 = 100. Promedio mensual de la serie de Indeed Hiring Lab (la
            misma que publica FRED).
          </div>
          <div class="chart-wrap">
            <ClientOnly>
              <LineChart
                :key="`fred-${themeKey}`"
                :chart-data="fredData"
                :options="indexOptions"
                aria-label="Índice de avisos de desarrollo de software en Indeed Estados Unidos"
              />
              <template #fallback>
                <VSkeletonLoader type="image" height="100%" />
              </template>
            </ClientOnly>
          </div>
        </VCard>
        <div class="facts mt-4">
          <VCard v-for="f in MARKET_CONTEXT" :key="f.id" variant="outlined" class="pa-4 fact">
            <div class="fact-value">{{ f.value }}</div>
            <div class="fact-label">{{ f.label }}</div>
            <div class="text-body-2 fact-detail">{{ f.detail }}</div>
            <a :href="f.url" target="_blank" rel="noopener" class="fact-src">
              {{ f.source }} · {{ f.date }}
            </a>
          </VCard>
        </div>
      </section>
    </template>

    <FaqSection v-if="faq.length" :items="faq" heading="Preguntas frecuentes" expanded />

    <section v-if="snap" class="block" aria-labelledby="metodo">
      <div class="kicker">Cómo se hizo</div>
      <h2 id="metodo" class="text-h5 font-weight-bold mb-3">Método, validación y límites</h2>
      <div class="method">
        <div class="method-text">
          <p>
            <strong>Qué se leyó.</strong> Todo el historial público de r/CharruaDevs:
            {{ fmtInt(snap.corpus.posts) }} posts y {{ fmtInt(snap.corpus.comments) }} comentarios
            desde {{ monthLabelLong(snap.corpus.from) }}. La fuente es el archivo Arctic Shift, que
            conserva lo publicado aunque después se borre; los votos y lo que se borró después se
            leen con la API oficial de Reddit.
          </p>
          <p>
            <strong>Qué se clasificó.</strong> Todos los posts y todos los comentarios que hablan de
            trabajo, sueldos, estudio, IA, despidos o el exterior ({{
              fmtInt(snap.corpus.classifiedComments)
            }}). Un modelo de lenguaje ({{ snap.model }}) leyó cada uno con una rúbrica escrita en
            rioplatense: si habla del mercado o de la carrera, qué postura tiene de −2 a +2, de qué
            temas, qué piensa de la IA y si el autor cuenta algo que le pasó. Una pregunta
            angustiada cuenta como pesimista; una oferta de trabajo sin opinión, como neutral.
          </p>
          <p>
            <strong>Cómo se controló.</strong> Una muestra al azar se leyó a mano sin ver la
            etiqueta del modelo y después se comparó (tabla). El modelo nunca se va a más de un
            punto de la lectura humana y su sesgo de nivel es chico; sí confunde seguido "neutral"
            con "levemente negativo o positivo". Por eso la página mira sobre todo
            <em>tendencias</em>: ese error es el mismo todos los meses. Y hay un control que no pasa
            por ningún modelo: las frases de alarma literales (gráfico).
          </p>
          <p>
            <strong>Límites.</strong> Reddit no es el mercado: escribe más quien está buscando,
            quien está enojado y quien tiene tiempo. El sub cambió de composición (en 2022 había
            muchos estudiantes de Jóvenes a Programar). Los votos de un hilo viejo tuvieron años
            para acumularse. No se guarda ningún nombre de usuario, y lo que hoy está borrado en
            Reddit no se muestra.
          </p>
          <p class="small">Datos actualizados el {{ updatedAt }}. Se renuevan todos los días.</p>
        </div>
        <div class="method-side">
          <VCard variant="outlined" class="pa-4">
            <div class="fig-title">¿Cuánto coincide el modelo con una lectura humana?</div>
            <div class="fig-sub">Muestra ciega del {{ snap.validation.date }}.</div>
            <div class="table-wrap">
              <VTable density="compact">
                <thead>
                  <tr>
                    <th />
                    <th class="text-right">Posts</th>
                    <th class="text-right">Comentarios</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in validationRows" :key="r.label">
                    <td>{{ r.label }}</td>
                    <td class="text-right">{{ r.posts }}</td>
                    <td class="text-right">{{ r.comments }}</td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </VCard>
          <VCard variant="outlined" class="pa-4 mt-4">
            <div class="fig-title">Control sin IA: frases de alarma</div>
            <div class="fig-sub">
              Comentarios con "no hay laburo", "mercado muerto/saturado", despidos o "reemplazo",
              por cada 1.000 del mes (promedio de 3 meses). Los puntos violeta marcan los meses con
              algún lanzamiento de IA.
            </div>
            <div class="chart-wrap">
              <ClientOnly>
                <LineChart
                  :key="`lex-${themeKey}`"
                  :chart-data="alarmData"
                  :options="lexOptions"
                  aria-label="Frases de alarma por cada mil comentarios. Los puntos marcan los meses con un lanzamiento de IA, detallados en la tabla de la sección Los lanzamientos"
                />
                <template #fallback>
                  <VSkeletonLoader type="image" height="100%" />
                </template>
              </ClientOnly>
            </div>
          </VCard>
        </div>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
// Explícitos: components/charts/ y components/mercadoIt/ no se auto-importan planos.
import BarChart from '~/components/charts/BarChart.vue'
import LineChart from '~/components/charts/LineChart.vue'
import LikertChart from '~/components/mercadoIt/LikertChart.vue'
import QuoteCard from '~/components/mercadoIt/QuoteCard.vue'
import SearchPanel from '~/components/mercadoIt/SearchPanel.vue'
import ThemesTable from '~/components/mercadoIt/ThemesTable.vue'
import {
  AI_RELEASES,
  AI_RELEASES_VERIFIED_AT,
  beforeAfter,
  markReleaseMonths,
  releaseMonth,
  releasesInMonth,
  riseSplit,
  type ReleaseMarkerStyle,
  type RiseSplit,
} from '~/utils/aiReleases'
import { stratifiedRiseGap, type RiseStratum, type StratifiedGap } from '~/utils/aiReleasesStrata'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  fmtInt,
  fmtPct,
  MARKET_CONTEXT,
  monthLabel,
  outOfTen,
  PERSONA_LABELS,
  quarterLabel,
  STANCE_META,
  THEME_LABELS,
  type CharruaSnapshot,
  type QuarterStat,
  type WindowStats,
} from '~/utils/charruadevs'

const localePath = useLocalePath()
const theme = useTheme()

// En el HTML del servidor: las cifras son la página.
const { data: snap } = await useFetch<CharruaSnapshot | null>('/api/charruadevs/summary', {
  key: 'charruadevs-summary',
  default: () => null,
})

const NEG = STANCE_META[1]!.color
const NEG_DEEP = STANCE_META[0]!.color
const POS = STANCE_META[3]!.color
const POS_DEEP = STANCE_META[4]!.color
const NEU = STANCE_META[2]!.color
// El marcador de lanzamiento. Violeta a propósito: tiene que leerse sobre el fondo claro y sobre
// el oscuro, y no poder confundirse ni con el rojo de lo negativo ni con el verde de lo positivo.
const REL = '#8b5cf6'

const dark = computed(() => theme.current.value.dark)
const themeKey = computed(() => (dark.value ? 'd' : 'l'))
const axisColor = computed(() => (dark.value ? '#b8c1cc' : '#536170'))
const gridColor = computed(() => (dark.value ? 'rgba(255,255,255,0.08)' : 'rgba(20,45,70,0.10)'))
const inkColor = computed(() => (dark.value ? '#dfe5ee' : '#26324a'))

const W = computed<Record<string, WindowStats | undefined>>(() => snap.value?.windows ?? {})
const last90 = computed(() => W.value.last90)
const y2022 = computed(() => W.value.y2022)
const relTotal = computed(
  () => (snap.value?.corpus.relPosts ?? 0) + (snap.value?.corpus.relComments ?? 0)
)
const years = computed(() => (snap.value?.yearly ?? []).map(y => y.y))
const MES_LARGO = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
function monthLabelLong(d: string | null | undefined): string {
  if (!d) return '—'
  return `${MES_LARGO[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}`
}
const corpusLine = computed(() =>
  snap.value
    ? `${fmtInt(snap.value.corpus.posts)} posts y ${fmtInt(snap.value.corpus.comments)} comentarios desde ${snap.value.corpus.from?.slice(0, 4) ?? '2021'}`
    : 'el sub de desarrolladores de Uruguay'
)
const updatedAt = computed(() => (snap.value ? snap.value.generatedAt.slice(0, 10) : ''))

const kpis = computed(() => [
  { value: fmtInt(relTotal.value), label: 'opiniones sobre el mercado, leídas y clasificadas' },
  {
    value: fmtPct(last90.value?.neg),
    label: 'de todo lo que se dice del mercado hoy es negativo (con las neutrales)',
  },
  {
    value: fmtPct(last90.value?.aiShare),
    label: `de esas opiniones tocan la IA (${fmtPct(y2022.value?.aiShare)} en 2022)`,
  },
  { value: fmtPct(doomNow.value), label: 'son catastrofistas: «se terminó», «no estudies»' },
])

// ---------------------------------------------------------------- lecturas derivadas

const yearsFull = computed(() => (snap.value?.yearly ?? []).filter(y => y.y >= 2022))
const risingEveryYear = computed(() => {
  const v = yearsFull.value.map(y => y.negOfOpinion ?? 0)
  return v.length > 2 && v.every((x, i) => i === 0 || x > v[i - 1]!)
})
function doomOf(
  y: { dist: Record<string, number | null>; n: number | null } | undefined
): number | null {
  return y && y.n ? (y.dist['-2'] ?? 0) / y.n : null
}
const doomNow = computed(() => doomOf(yearsFull.value[yearsFull.value.length - 1]))
const doom2022 = computed(() => doomOf(yearsFull.value.find(y => y.y === 2022)))

const qs = computed(() =>
  (snap.value?.quarterly ?? []).filter(q => q.q >= '2022-T1' && (q.all ?? 0) >= 300)
)
function rate(q: QuarterStat, k: keyof QuarterStat['ev']): number {
  return ((q.ev[k] ?? 0) / (q.all || 1)) * 1000
}
function avgRate(list: QuarterStat[], k: keyof QuarterStat['ev']): number | null {
  return list.length ? list.reduce((a, q) => a + rate(q, k), 0) / list.length : null
}
const earlyQs = computed(() => qs.value.filter(q => q.q < '2024-T1'))
const lateQs = computed(() => qs.value.slice(-4))
const x1 = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('es-UY', { maximumFractionDigits: 1 })

const aiQs = computed(() => qs.value.filter(q => q.ai.raw >= 25))
function aiShareOf(
  q: QuarterStat | undefined,
  k: 'amenaza' | 'herramienta' | 'hype' | 'mixto'
): number | null {
  return q && q.ai.n ? (q.ai[k] ?? 0) / q.ai.n : null
}
const aiLast = computed(() => aiQs.value[aiQs.value.length - 1])
const ai2025 = computed(() => aiQs.value.find(q => q.q === '2025-T1'))

const persona = (k: string) => snap.value?.persona.find(p => p.persona === k)
const personaRows = computed(() =>
  (snap.value?.persona ?? [])
    .filter(p => p.persona !== 'desconocido' && p.n12 >= 40)
    .sort((a, b) => (b.neg12 ?? 0) - (a.neg12 ?? 0))
)

const themesByNeg = computed(() =>
  [...(snap.value?.themes ?? [])]
    .filter(t => t.n12 >= 300)
    .sort((a, b) => (b.neg12 ?? 0) - (a.neg12 ?? 0))
)
const themesByWeight = computed(() =>
  [...(snap.value?.themes ?? [])]
    .filter(t => t.n12 >= 300)
    .sort((a, b) => (b.share12 ?? 0) - (a.share12 ?? 0))
)
const themeName = (th: string | undefined) => (th ? (THEME_LABELS[th] ?? th).toLowerCase() : '')

function weightedMean(keys: string[]): number | null {
  const e = snap.value?.engagementComments
  if (!e) return null
  let n = 0
  let s = 0
  for (const k of keys) {
    const r = e[k]
    if (!r || r.mean == null) continue
    n += r.n
    s += r.mean * r.n
  }
  return n ? s / n : null
}
const negMean = computed(() => weightedMean(['-2', '-1']))
const restMean = computed(() => weightedMean(['0', '1', '2']))

const fredLast = computed(() => snap.value?.fred[snap.value.fred.length - 1])
const fredLow = computed(() => {
  const f = (snap.value?.fred ?? []).filter(p => p.m >= '2023-01')
  return f.reduce<{ m: string; v: number } | undefined>(
    (low, p) => (!low || p.v < low.v ? p : low),
    undefined
  )
})

// ---------------------------------------------------------------- textos (salen de los datos)

const verdictTitle = computed(() =>
  risingEveryYear.value ? 'Mal, y un poco peor cada año' : 'Más mal que bien, aunque con altibajos'
)

const verdictCards = computed(() => {
  const j = persona('junior')
  const s = persona('senior')
  return [
    {
      title: 'El pesimismo se volvió mayoría',
      body: `En 2022, ${fmtPct(y2022.value?.negOfOpinion)} de las opiniones que tomaban partido eran negativas; en los últimos 90 días, ${fmtPct(last90.value?.negOfOpinion)}.${risingEveryYear.value ? ' Subió todos los años, sin excepción.' : ''} Contando también las neutrales, hoy ${fmtPct(last90.value?.neg)} de lo que se dice del mercado es negativo y ${fmtPct(last90.value?.pos)} es positivo.`,
    },
    {
      title: 'Es preocupación, no pánico',
      body: `Casi todo el pesimismo es del tipo «está brava» (−1). Los catastrofistas —«se terminó», «no estudies»— pasaron de ${fmtPct(doom2022.value)} en 2022 a ${fmtPct(doomNow.value)} este año: crecieron, pero siguen siendo pocos.`,
    },
    {
      title: 'La IA se metió en todas las conversaciones',
      body: `En 2022 casi nadie opinaba de la IA (${fmtPct(y2022.value?.aiShare)} de las opiniones); en los últimos 90 días, ${fmtPct(last90.value?.aiShare)}. Y ${fmtPct(last90.value?.aiNeg)} de lo que se dice de ella es negativo.`,
    },
    {
      title: 'Le pega más a la puerta de entrada',
      body: `En el último año, ${fmtPct(j?.neg12)} de los posts de juniors son negativos, contra ${fmtPct(s?.neg12)} de los de seniors. Y los relatos de «conseguí laburo» bajaron de ${x1(avgRate(earlyQs.value, 'consiguio'))} a ${x1(avgRate(lateQs.value, 'consiguio'))} cada 1.000 textos.`,
    },
  ]
})

const crossMonth = computed(() => {
  const m = (snap.value?.monthly ?? []).filter(x => x.m >= '2022-01' && x.rel3 >= 60)
  for (let i = 0; i < m.length; i++) {
    if (m.slice(i).every(x => (x.neg3 ?? 0) > (x.pos3 ?? 0))) return m[i]!.m
  }
  return null
})
const curveTitle = computed(() =>
  risingEveryYear.value
    ? 'Cada año, más gente ve el vaso vacío'
    : 'Lo negativo le ganó a lo positivo'
)
const curveText = computed(() =>
  crossMonth.value
    ? `La línea roja es la parte negativa de las opiniones sobre el mercado; la verde, la positiva. Se cruzaron en ${monthLabelLong(crossMonth.value)} y desde entonces no volvieron a cruzarse: lo negativo pasó de ${fmtPct(y2022.value?.neg)} en 2022 a ${fmtPct(last90.value?.neg)} en los últimos 90 días, y lo positivo de ${fmtPct(y2022.value?.pos)} a ${fmtPct(last90.value?.pos)}.`
    : `La línea roja es la parte negativa de las opiniones sobre el mercado; la verde, la positiva: ${fmtPct(last90.value?.neg)} y ${fmtPct(last90.value?.pos)} en los últimos 90 días.`
)

const themesTitle = computed(() => {
  const [a, b] = themesByNeg.value
  return a && b ? `Lo más negro: ${themeName(a.th)} y ${themeName(b.th)}` : 'De qué se habla'
})
const themesText = computed(() => {
  const top = themesByNeg.value.slice(0, 3)
  const least = themesByNeg.value.slice(-2)
  const heavy = themesByWeight.value[0]
  if (!top.length || !heavy) return ''
  return `En los últimos 12 meses, ${top.map(t => `${themeName(t.th)} (${fmtPct(t.neg12)} negativo)`).join(', ')} son los temas con peor tono. En el otro extremo, ${least.map(t => `${themeName(t.th)} (${fmtPct(t.neg12)})`).join(' y ')}. Lo que más se discute sigue siendo ${themeName(heavy.th)}: ${fmtPct(heavy.share12)} de las opiniones.`
})

const aiText = computed(() => {
  const lex = snap.value?.lexMonthly ?? []
  const avg = (y: string) => {
    const rows = lex.filter(r => r.m.startsWith(y) && r.n >= 200)
    const tot = rows.reduce((a, r) => a + r.n, 0)
    return tot ? rows.reduce((a, r) => a + (r.ia_menciones ?? 0) * r.n, 0) / tot : null
  }
  const lastYear = String(new Date(snap.value?.generatedAt ?? Date.now()).getUTCFullYear())
  return `En 2022, ${x1(avg('2022'))} de cada 1.000 comentarios mencionaban la IA; en ${lastYear}, ${x1(avg(lastYear))}. En el último trimestre, ${fmtPct(aiShareOf(aiLast.value, 'amenaza'))} de lo que se opina de ella la ve como amenaza y ${fmtPct(aiShareOf(aiLast.value, 'herramienta'))} como herramienta; a comienzos de 2025 la relación era ${fmtPct(aiShareOf(ai2025.value, 'amenaza'))} a ${fmtPct(aiShareOf(ai2025.value, 'herramienta'))}.`
})

const personaTitle = computed(() => {
  const j = persona('junior')
  const s = persona('senior')
  return j && s && (j.neg12 ?? 0) > (s.neg12 ?? 0)
    ? 'Los juniors la están pasando peor'
    : 'A quién le pega'
})
const personaText = computed(() => {
  const j = persona('junior')
  const s = persona('senior')
  const e = persona('estudiante')
  return `Cuando el autor cuenta quién es, los posts de juniors son los más negativos (${fmtPct(j?.neg12)} en el último año), seguidos por quienes cambian de carrera. Los seniors quedan en ${fmtPct(s?.neg12)} y los estudiantes, curiosamente, en ${fmtPct(e?.neg12)}: todavía no salieron a buscar.`
})

const eventsText = computed(
  () =>
    `Además de opinar, la gente cuenta lo que le pasa. Los relatos de «conseguí laburo» eran ${x1(avgRate(earlyQs.value, 'consiguio'))} cada 1.000 textos en 2022–2023 y ${x1(avgRate(lateQs.value, 'consiguio'))} en el último año; los de «me echaron» pasaron de ${x1(avgRate(earlyQs.value, 'despedido'))} a ${x1(avgRate(lateQs.value, 'despedido'))}. Los de quienes buscan y no consiguen se mantienen altos, y las ofertas de trabajo, bajas y estables.`
)

const votesTitle = computed(() =>
  negMean.value != null && restMean.value != null && negMean.value > restMean.value * 1.1
    ? 'Un poco, sí'
    : 'No mucho'
)
const rankingTeaser = computed(() => {
  const a = snap.value?.authors
  if (!a) return ''
  return `Las opiniones no están repartidas parejo: el 10 % de las cuentas escribe ${fmtPct(a.concentration.top10)} de todo lo que se dice del mercado, y ${fmtInt(a.concentration.single)} opinaron una sola vez en cinco años. Entre quienes opinan seguido, ${fmtPct(a.mix.negative)} son mayormente negativos y ${fmtPct(a.mix.positive)} mayormente positivos.`
})

const votesText = computed(
  () =>
    `Un comentario negativo junta en promedio ${x1(negMean.value)} votos; uno neutral o positivo, ${x1(restMean.value)}. La mediana es la misma para todos: la diferencia la hacen los pocos comentarios negativos que explotan. El sub no castiga el pesimismo, y a veces lo premia.`
)

const contextText = computed(() => {
  const last = fredLast.value
  const low = fredLow.value
  // Sin la serie de Indeed la frase de EE.UU. se omite entera: no se afirma una cifra que no se muestra.
  const usa = last
    ? ` En Estados Unidos —el mercado que más software le compra a Uruguay— los avisos de desarrollo en Indeed están ${Math.round(100 - last.v)} % por debajo de febrero de 2020${low ? `, aunque rebotaron desde el piso de ${monthLabelLong(`${low.m}-01`)}` : ''}.`
    : ''
  return `Afuera el cuadro es más mixto que en el sub.${usa} En Uruguay, el empleo del sector no cae y desarrollador de software fue el puesto más pedido en la primera mitad de 2026. Lo que cambió es para quién hay: equipos más chicos y más senior, con menos lugar para el primer empleo. El pesimismo del sub es real, pero está más cerca de «está difícil entrar» que de «no hay trabajo».`
})

// ---------------------------------------------------------------- gráficos

const pct100 = (v: number | null | undefined) => (v == null ? null : Math.round(v * 1000) / 10)
function baseLineOptions(
  tick: (v: number) => string,
  yMax?: number,
  tooltipCallbacks?: Record<string, unknown>
) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: axisColor.value, boxWidth: 14 } },
      // Sin callbacks el objeto queda exactamente como estaba: chart.js arma su tooltip solo.
      ...(tooltipCallbacks ? { tooltip: { callbacks: tooltipCallbacks } } : {}),
    },
    scales: {
      x: { ticks: { color: axisColor.value, maxTicksLimit: 8 }, grid: { color: gridColor.value } },
      y: {
        beginAtZero: true,
        ...(yMax ? { max: yMax } : {}),
        ticks: { color: axisColor.value, callback: (v: number | string) => tick(Number(v)) },
        grid: { color: gridColor.value },
      },
    },
  }
}
const perMilleOptions = computed(() => baseLineOptions(v => `${v} ‰`))
const indexOptions = computed(() => baseLineOptions(v => String(v)))

/**
 * El tooltip que cuenta qué salió ese mes. Se arma una sola vez, al montar el gráfico (el
 * componente no observa `options`), pero lee el getter en cada llamada, así que sigue a los datos.
 */
function releaseTooltip(monthAt: (i: number) => string | undefined) {
  return {
    afterBody: (ctx: Array<{ dataIndex: number }>) => {
      const month = monthAt(ctx[0]?.dataIndex ?? -1)
      const rels = month ? releasesInMonth(month) : []
      if (!rels.length) return []
      return ['', 'Ese mes salió:', ...rels.map(r => `· ${r.label} (${r.vendor})`)]
    },
  }
}

const line = (
  label: string,
  data: Array<number | null>,
  color: string,
  fill = false,
  marks?: ReleaseMarkerStyle
) => ({
  label,
  data,
  borderColor: color,
  backgroundColor: fill ? `${color}22` : color,
  borderWidth: 2,
  pointRadius: marks ? marks.pointRadius : 0,
  ...(marks
    ? {
        pointBackgroundColor: marks.pointBackgroundColor,
        pointHoverRadius: marks.pointRadius.map(r => Math.max(r + 2, 4)),
      }
    : {}),
  tension: 0.25,
  fill,
  spanGaps: true,
})

const curveMonths = computed(() =>
  (snap.value?.monthly ?? []).filter(m => m.m >= '2022-01' && m.rel3 >= 60)
)
const curveMonthKeys = computed(() => curveMonths.value.map(m => m.m))
const pctLineOptions = computed(() =>
  baseLineOptions(
    v => `${v} %`,
    60,
    releaseTooltip(i => curveMonthKeys.value[i])
  )
)
const curveData = computed(() => ({
  labels: curveMonths.value.map(m => monthLabel(m.m)),
  datasets: [
    line(
      'Negativas (−1 y −2)',
      curveMonths.value.map(m => pct100(m.neg3)),
      NEG,
      false,
      markReleaseMonths(curveMonthKeys.value, REL, NEG)
    ),
    line(
      'Positivas (+1 y +2)',
      curveMonths.value.map(m => pct100(m.pos3)),
      POS,
      false,
      markReleaseMonths(curveMonthKeys.value, REL, POS)
    ),
  ],
}))

const likertRows = computed(() =>
  yearsFull.value.map(y => ({
    label: `${y.y}${String(y.y) === (snap.value?.corpus.to ?? '').slice(0, 4) ? '*' : ''}`,
    dist: y.dist,
    n: y.n,
  }))
)

const lexRows = computed(() =>
  (snap.value?.lexMonthly ?? []).filter(r => r.m >= '2022-01' && r.n >= 200)
)
const lexMonthKeys = computed(() => lexRows.value.map(r => r.m))
const lexOptions = computed(() =>
  baseLineOptions(
    v => `${v} ‰`,
    undefined,
    releaseTooltip(i => lexMonthKeys.value[i])
  )
)
const aiMentionsData = computed(() => ({
  labels: lexRows.value.map(r => monthLabel(r.m)),
  datasets: [
    line(
      'Comentarios con IA, por mil',
      lexRows.value.map(r => r.ia_menciones),
      inkColor.value,
      true,
      markReleaseMonths(lexMonthKeys.value, REL, inkColor.value)
    ),
  ],
}))

const aiViewData = computed(() => ({
  labels: aiQs.value.map(q => quarterLabel(q.q)),
  datasets: [
    {
      label: 'Amenaza',
      data: aiQs.value.map(q => pct100(aiShareOf(q, 'amenaza'))),
      backgroundColor: NEG,
      stack: 'ai',
    },
    {
      label: 'Mixto',
      data: aiQs.value.map(q => pct100(aiShareOf(q, 'mixto'))),
      backgroundColor: NEU,
      stack: 'ai',
    },
    {
      label: 'No amenaza',
      data: aiQs.value.map(q =>
        pct100((aiShareOf(q, 'herramienta') ?? 0) + (aiShareOf(q, 'hype') ?? 0))
      ),
      backgroundColor: POS,
      stack: 'ai',
    },
  ],
}))
const stackedPctOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: axisColor.value, boxWidth: 14 } },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: axisColor.value, maxTicksLimit: 8 },
      grid: { display: false },
    },
    y: {
      stacked: true,
      max: 100,
      ticks: { color: axisColor.value, callback: (v: number | string) => `${v} %` },
      grid: { color: gridColor.value },
    },
  },
}))

const eventsData = computed(() => ({
  labels: qs.value.map(q => quarterLabel(q.q)),
  datasets: [
    line(
      'Busca y no consigue',
      qs.value.map(q => Math.round(rate(q, 'busca') * 10) / 10),
      NEG
    ),
    line(
      'Lo echaron',
      qs.value.map(q => Math.round(rate(q, 'despedido') * 10) / 10),
      NEG_DEEP
    ),
    line(
      'Consiguió laburo',
      qs.value.map(q => Math.round(rate(q, 'consiguio') * 10) / 10),
      POS
    ),
    line(
      'Está contratando',
      qs.value.map(q => Math.round(rate(q, 'contrata') * 10) / 10),
      POS_DEEP
    ),
  ],
}))

const votesData = computed(() => {
  const e = snap.value?.engagementComments ?? {}
  return {
    labels: STANCE_META.map(s => s.label),
    datasets: [
      {
        label: 'Votos promedio',
        data: STANCE_META.map(s => e[String(s.value)]?.mean ?? 0),
        backgroundColor: STANCE_META.map(s => s.color),
        borderRadius: 4,
        maxBarThickness: 48,
      },
    ],
  }
})
const votesOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: axisColor.value }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: axisColor.value }, grid: { color: gridColor.value } },
  },
}))

const fredRows = computed(() => (snap.value?.fred ?? []).filter(p => p.m >= '2020-02'))
const fredData = computed(() => ({
  labels: fredRows.value.map(p => monthLabel(p.m)),
  datasets: [
    line(
      'Índice Indeed (feb 2020 = 100)',
      fredRows.value.map(p => p.v),
      inkColor.value,
      true
    ),
  ],
}))

const alarmData = computed(() => {
  const raw = lexRows.value.map(
    r => (r.no_hay_laburo ?? 0) + (r.saturado ?? 0) + (r.despidos ?? 0) + (r.reemplazo_ia ?? 0)
  )
  const rolled = raw.map((_, i) => {
    const w = raw.slice(Math.max(0, i - 2), i + 1)
    return Math.round((w.reduce((a, b) => a + b, 0) / w.length) * 10) / 10
  })
  return {
    labels: lexRows.value.map(r => monthLabel(r.m)),
    datasets: [
      line(
        'Frases de alarma, por mil',
        rolled,
        NEG,
        false,
        markReleaseMonths(lexMonthKeys.value, REL, NEG)
      ),
    ],
  }
})

// ---------------------------------------------------------------- lanzamientos de IA
//
// El placebo es la sección entera: la misma cuenta, hecha sobre los meses SIN lanzamiento, va en
// la misma oración que el resultado. Sobre una serie que sube casi todos los meses, cualquier
// fecha que marques queda "seguida de una suba", así que el número de la izquierda solo no dice
// nada. Por eso los textos se derivan de la COMPARACIÓN y no de un umbral escrito a mano.

/** Lo que separa "se ve la diferencia" de "es la misma proporción", en partes de 1. */
const RISE_GAP = 0.1
/**
 * El listón, mucho más alto, que necesita el TÍTULO para afirmar algo. La muestra son trece meses
 * con lanzamiento repartidos en cinco años: casi ningún año aporta más de dos. Una brecha de diez
 * puntos ahí no distingue una señal de un sorteo, y un `<h2>` no se lee con la muestra al lado.
 */
const TITLE_GAP = 0.25
const RELEASE_MONTHS = new Set(AI_RELEASES.map(releaseMonth))

const lexIaValues = computed(() => lexRows.value.map(r => r.ia_menciones ?? null))
const iaRise = computed(() => riseSplit(lexMonthKeys.value, lexIaValues.value, RELEASE_MONTHS))
// La serie que va acá es la NEGATIVIDAD CRUDA del mes, no la `neg3` que dibuja el gráfico: `neg3`
// ya es un promedio de tres meses, así que meterla en una ventana de tres meses arrastra el mes
// del lanzamiento adentro del "después" y solapa las dos ventanas por la suavización. La cuenta
// tiene que hacerse sobre la misma cantidad que muestra la curva, sin el suavizado.
const negRise = computed(() =>
  riseSplit(
    curveMonthKeys.value,
    curveMonths.value.map(m => pct100(m.neg)),
    RELEASE_MONTHS
  )
)
// La MISMA cuenta sobre las opiniones que toman partido (la medida del titular de la página). No
// se publica como resultado: se publica como control de robustez, porque da otra brecha y elegir
// entre las dos series sin decirlo es exactamente cómo se fabrica un hallazgo.
const negOpRise = computed(() =>
  riseSplit(
    curveMonthKeys.value,
    curveMonths.value.map(m => pct100(m.negOfOpinion)),
    RELEASE_MONTHS
  )
)
function gapOf(s: RiseSplit): number | null {
  const { share: a } = s.withRelease
  const { share: b } = s.without
  return a == null || b == null ? null : a - b
}
const iaGap = computed(() => gapOf(iaRise.value))
const negGap = computed(() => gapOf(negRise.value))
const negOpGap = computed(() => gapOf(negOpRise.value))

// La brecha cruda mide el ALMANAQUE: los lanzamientos se amontonan en los años en que la serie
// subió todos los meses, con lanzamiento o sin él. El veredicto de la sección se decide con la
// brecha estratificada por año —cada mes con lanzamiento contra los meses sin lanzamiento del
// MISMO año—, que es la única de las dos que puede distinguir el lanzamiento del calendario.
const iaStrat = computed(() =>
  stratifiedRiseGap(lexMonthKeys.value, lexIaValues.value, RELEASE_MONTHS)
)
const negStrat = computed(() =>
  stratifiedRiseGap(
    curveMonthKeys.value,
    curveMonths.value.map(m => pct100(m.neg)),
    RELEASE_MONTHS
  )
)
const ppText = (gap: number) => `${Math.round(Math.abs(gap) * 100)} puntos`
const negGapClause = computed(() => {
  const gap = negGap.value
  if (gap == null) return 'y todavía no hay muestra para comparar'
  if (Math.abs(gap) < RISE_GAP) return 'o sea casi la misma proporción'
  return gap > 0 ? `o sea ${ppText(gap)} más seguido` : `o sea ${ppText(gap)} menos seguido`
})

// El mismo conteo da otra brecha según qué serie de negatividad se mire, y eso es un dato sobre
// la cuenta, no sobre la IA. Publicar las dos es lo único que impide elegir después la que da el
// número más lindo.
const robustnessNote = computed(() => {
  const a = negGap.value
  const b = negOpGap.value
  if (a == null || b == null) return ''
  return ` Y el resultado se mueve según la serie que se mire: sobre las opiniones que toman partido —la medida del titular de esta página— la brecha da ${ppText(b)} en lugar de ${ppText(a)}. Acá se publica la serie que está dibujada arriba, no la que da el número más grande.`
})

// La respuesta de la FAQ sale entera al JSON-LD, sin la sección alrededor que la explique. Por
// eso tiene su propia guarda: con pocos meses, "0 de 0 (—)" es una respuesta publicada.
const releasesAnswer = computed(() => {
  const head = `Con estos datos no se puede afirmar. ChatGPT salió en noviembre de 2022 y la curva ya venía subiendo: en 2022 el ${fmtPct(y2022.value?.negOfOpinion)} de las opiniones que tomaban partido eran negativas y en los últimos 90 días son el ${fmtPct(last90.value?.negOfOpinion)}.`
  const s = negRise.value
  const strat = negStrat.value.gap
  if (s.withRelease.share == null || s.without.share == null) {
    return `${head} La página marca los ${AI_RELEASES.length} lanzamientos de IA que le cambiaron el día a quien programa, pero todavía no hay meses suficientes con las dos ventanas de tres meses enteras como para comparar los que tuvieron uno contra los que no.`
  }
  const tail =
    strat == null
      ? 'y no hay años con meses de los dos tipos como para corregir por el calendario'
      : Math.abs(strat) < RISE_GAP
        ? `pero comparando cada mes contra los del mismo año la diferencia se cae a ${ppText(strat)}, porque los lanzamientos se amontonan justo en los años en que la serie subía sola`
        : `y comparando cada mes contra los del mismo año la diferencia se sostiene en ${ppText(strat)}`
  return `${head} Lo que sí se puede hacer es marcar esos ${AI_RELEASES.length} lanzamientos y comparar los ${s.withRelease.n} meses comparables que tuvieron uno contra los ${s.without.n} que no: promediando los tres meses previos contra los tres siguientes, la parte negativa del mes quedó más arriba en ${s.withRelease.rose} de ${s.withRelease.n} (${fmtPct(s.withRelease.share)}) y en ${s.without.rose} de ${s.without.n} (${fmtPct(s.without.share)}), ${negGapClause.value}, ${tail}. Los lanzamientos vienen en racimo y la serie sube sola, así que nada de esto prueba causa.`
})

function dayLabelLong(d: string): string {
  return `${Number(d.slice(8, 10))} de ${MES_LARGO[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}`
}
const releasesVerifiedLabel = dayLabelLong(AI_RELEASES_VERIFIED_AT)

const releaseRows = computed(() =>
  AI_RELEASES.map(r => {
    const i = lexMonthKeys.value.indexOf(releaseMonth(r))
    // Un lanzamiento de los últimos tres meses no tiene "después": son tres meses que todavía no
    // pasaron. Eso se dice con una raya, nunca con un promedio de menos meses disfrazado.
    const ba = i < 0 ? { before: null, after: null } : beforeAfter(lexIaValues.value, i)
    return {
      ...r,
      dateLabel: dayLabelLong(r.date),
      baLabel: ba.before == null || ba.after == null ? '—' : `${x1(ba.before)} → ${x1(ba.after)}`,
    }
  })
)

// El título se decide con la brecha ESTRATIFICADA, no con la cruda: la cruda da un número alto
// por el almanaque y el título es justo la frase que se lee sin leer el resto.
const releasesTitle = computed(() => {
  const ia = iaStrat.value.gap
  const neg = negStrat.value.gap
  if (ia == null || neg == null) return 'Todavía no hay meses suficientes para comparar'
  // Para AFIRMAR algo desde el título hacen falta las dos series, para el mismo lado y con una
  // brecha grande. Con trece meses con lanzamiento, una diferencia de diez o quince puntos entra
  // holgada en el ruido, y el título es lo único de la sección que se lee sin el resto al lado.
  const loud = Math.abs(ia) >= TITLE_GAP && Math.abs(neg) >= TITLE_GAP && ia > 0 === neg > 0
  if (!loud) return 'El marcador no separa el lanzamiento de la tendencia'
  return ia > 0
    ? 'Comparando dentro del mismo año, los meses con lanzamiento suben más seguido'
    : 'Comparando dentro del mismo año, los meses con lanzamiento suben menos seguido'
})

function riseLine(what: string, s: RiseSplit): string {
  return `${what}: subieron ${s.withRelease.rose} de los ${s.withRelease.n} meses con lanzamiento (${fmtPct(s.withRelease.share)}) y ${s.without.rose} de los ${s.without.n} meses sin lanzamiento (${fmtPct(s.without.share)})`
}
function gapVerdict(what: string, gap: number): string {
  if (Math.abs(gap) < RISE_GAP) {
    return `En ${what} las dos proporciones quedan a ${ppText(gap)} de distancia.`
  }
  return gap > 0
    ? `En ${what} la diferencia cruda es de ${ppText(gap)} a favor de los meses con lanzamiento.`
    : `En ${what} la diferencia cruda es de ${ppText(gap)} en contra de los meses con lanzamiento.`
}

/** El año que más meses con lanzamiento aporta, que es de dónde sale la brecha cruda. */
function heaviestYear(s: StratifiedGap): RiseStratum | null {
  return s.strata.reduce<RiseStratum | null>(
    (top, x) => (!top || x.withRelease.n > top.withRelease.n ? x : top),
    null
  )
}

// Acá se dice la parte incómoda: la diferencia cruda casi toda la explica el año, no el
// lanzamiento. Se escribe con el número que dé, para los dos lados.
function stratVerdict(s: StratifiedGap): string {
  const gap = s.gap
  if (gap == null)
    return 'Ningún año tiene meses de los dos tipos, así que no hay con qué corregir.'
  const top = heaviestYear(s)
  const where =
    top && top.withRelease.n > 1
      ? ` Los lanzamientos no están repartidos parejo: ${top.withRelease.n} de los ${s.weight} meses comparables caen en ${top.key}, y en ${top.key} subieron ${fmtPct(top.withRelease.share)} de los meses con lanzamiento y ${fmtPct(top.without.share)} de los que no tuvieron ninguno.`
      : ''
  const verdict =
    Math.abs(gap) < RISE_GAP
      ? `la diferencia se cae a ${ppText(gap)}: lo que medía la cuenta cruda era el almanaque.`
      : `la diferencia se sostiene en ${ppText(gap)}.`
  return `${where} Comparando cada mes con lanzamiento contra los meses sin lanzamiento del mismo año, ${verdict}`
}

/** La misma corrección sobre la otra serie, y el recordatorio de cuántos meses la sostienen. */
function stratTail(s: StratifiedGap): string {
  if (s.gap == null) return ''
  return ` En las opiniones negativas la misma corrección deja ${ppText(s.gap)}, sobre ${s.weight} meses con lanzamiento repartidos en ${s.strata.length} años: es una muestra chica y ninguna de las dos cifras alcanza para afirmar un efecto.`
}

const releasesText = computed(() => {
  const ia = iaGap.value
  const neg = negGap.value
  if (ia == null || neg == null) {
    return 'Todavía no hay meses con las dos ventanas de tres meses enteras como para comparar los que tuvieron un lanzamiento contra los que no. Hasta que los haya no se publica la mitad de la cuenta: sobre una serie que sube casi todos los meses, cualquier fecha que marques queda seguida de una suba.'
  }
  return `Para cada mes se promedian los tres meses de antes y los tres de después y se mira si la serie quedó más arriba; los meses del borde, sin las dos ventanas enteras, no entran. ${riseLine('Menciones de IA', iaRise.value)}. ${riseLine('Opiniones negativas del mes', negRise.value)}. ${gapVerdict('las menciones', ia)} ${gapVerdict('la negatividad', neg)} La segunda proporción de cada par es un placebo, no un test, y es lo único que hace legible a la primera.${stratVerdict(iaStrat.value)}${stratTail(negStrat.value)}`
})

const validationRows = computed(() => {
  const v = snap.value?.validation
  if (!v) return []
  const p = (x: number) => fmtPct(x)
  const d = (x: number) => x.toLocaleString('es-UY', { maximumFractionDigits: 2 })
  return [
    { label: 'Textos revisados', posts: String(v.posts.n), comments: String(v.comments.n) },
    {
      label: '¿Es sobre el mercado? (acuerdo)',
      posts: p(v.posts.relAgreement),
      comments: p(v.comments.relAgreement),
    },
    {
      label: 'Mismo signo (neg / neutral / pos)',
      posts: p(v.posts.signAgreement),
      comments: p(v.comments.signAgreement),
    },
    { label: 'Postura a ±1 punto', posts: p(v.posts.within1), comments: p(v.comments.within1) },
    { label: 'Kappa de Cohen', posts: d(v.posts.kappa4), comments: d(v.comments.kappa4) },
    { label: 'Sesgo (modelo − humano)', posts: d(v.posts.bias), comments: d(v.comments.bias) },
  ]
})

// ---------------------------------------------------------------- FAQ

const faq = computed<FaqItem[]>(() => {
  if (!snap.value) return []
  const j = persona('junior')
  const s = persona('senior')
  const estudio = snap.value.themes.find(t => t.th === 'estudio')
  return [
    {
      id: 'mercado-it-mal',
      question: '¿Está mal el mercado IT en Uruguay?',
      answer: `Según lo que escriben los propios desarrolladores en r/CharruaDevs, sí, y cada vez más: ${outOfTen(last90.value?.negOfOpinion)} de cada 10 opiniones que toman partido sobre el mercado son negativas, contra ${outOfTen(y2022.value?.negOfOpinion)} de cada 10 en 2022. Los indicadores de afuera son más mixtos: el empleo del sector en Uruguay no cae y desarrollador de software fue el puesto más pedido en la primera mitad de 2026, pero la demanda se corrió hacia perfiles senior.`,
    },
    {
      id: 'mercado-it-ia',
      question: '¿La IA va a reemplazar a los programadores?',
      answer: `En el sub la IA pasó de casi no aparecer a estar en ${fmtPct(last90.value?.aiShare)} de las opiniones sobre el mercado, y la mirada se volvió más temerosa: en el último trimestre ${fmtPct(aiShareOf(aiLast.value, 'amenaza'))} de lo que se opina la ve como amenaza y ${fmtPct(aiShareOf(aiLast.value, 'herramienta'))} como herramienta. Lo que muestran los datos de empleo es menos un reemplazo masivo que un cambio de forma: equipos más chicos y más senior.`,
    },
    {
      id: 'mercado-it-lanzamientos',
      question: '¿El pesimismo del sub arranca con ChatGPT?',
      answer: releasesAnswer.value,
    },
    {
      id: 'mercado-it-junior',
      question: '¿Cuesta conseguir el primer trabajo como programador junior?',
      answer: `Es donde más duele: en el último año ${fmtPct(j?.neg12)} de los posts de juniors son negativos, contra ${fmtPct(s?.neg12)} de los de seniors, y los relatos de «conseguí laburo» bajaron a ${x1(avgRate(lateQs.value, 'consiguio'))} cada 1.000 textos. El primer escalón no desapareció, pero se achicó.`,
    },
    {
      id: 'mercado-it-estudiar',
      question: '¿Conviene estudiar programación en Uruguay?',
      answer: `Es el tema más discutido del sub y uno de los de mejor tono: ${fmtPct(estudio?.neg12)} de las opiniones sobre estudiar son negativas, frente a más de la mitad en búsqueda de trabajo o despidos. La carrera sigue teniendo demanda; lo que se endureció es la entrada, así que estudiar sirve más si se combina con experiencia real.`,
    },
    {
      id: 'mercado-it-metodo',
      question: '¿De dónde salen estos números?',
      answer: `De todo el historial público de r/CharruaDevs (${fmtInt(snap.value.corpus.posts)} posts y ${fmtInt(snap.value.corpus.comments)} comentarios), clasificado por un modelo de lenguaje con una rúbrica en rioplatense y validado con una muestra leída a mano. Es lo que opina un sub de Reddit, no una encuesta representativa: escribe más quien está buscando o enojado.`,
    },
  ]
})

// ---------------------------------------------------------------- SEO

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Mercado IT', disabled: true },
])

const canonicalUrl = 'https://cambio-uruguay.com/mercado-it-uruguay'
const TITLE = '¿Qué tan mal está el mercado IT en Uruguay?'
const STATIC_DESCRIPTION =
  'Lo que dicen los desarrolladores uruguayos en r/CharruaDevs sobre el mercado y la carrera, leído con IA: cuánto pesimismo hay, de qué temas y un buscador por sentimiento.'
const description = computed(() =>
  snap.value
    ? `${outOfTen(last90.value?.negOfOpinion)} de cada 10 opiniones sobre el futuro de la profesión en r/CharruaDevs son negativas (${fmtPct(y2022.value?.negOfOpinion)} en 2022). ${fmtInt(relTotal.value)} posts y comentarios leídos con IA, con buscador por tema y sentimiento.`
    : STATIC_DESCRIPTION
)

defineOgImageComponent('Cambio', {
  title: 'Mercado IT en Uruguay',
  subtitle: snap.value
    ? `${outOfTen(last90.value?.negOfOpinion)} de cada 10 opiniones en r/CharruaDevs son negativas`
    : 'Lo que dicen los desarrolladores en r/CharruaDevs',
  tag: 'MERCADO IT',
})

useSeoMeta({
  title: () => `${TITLE} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: TITLE,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: TITLE,
  twitterDescription: () => description.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'mercado it uruguay, mercado laboral it uruguay, trabajo programador uruguay, charruadevs, ia reemplaza programadores, junior it uruguay, despidos it uruguay, saturado mercado it',
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
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              { '@type': 'ListItem', position: 2, name: 'Mercado IT', item: canonicalUrl },
            ],
          },
          {
            '@type': 'Article',
            headline: TITLE,
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: snap.value?.generatedAt ?? undefined,
            mainEntityOfPage: canonicalUrl,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
          },
          {
            '@type': 'Dataset',
            name: 'Sentimiento sobre el mercado IT en r/CharruaDevs',
            description:
              'Posts y comentarios de r/CharruaDevs clasificados por postura (−2 a +2), tema, visión de la IA y relato en primera persona, con agregados mensuales.',
            url: canonicalUrl,
            creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
            isBasedOn: 'https://www.reddit.com/r/CharruaDevs/',
            temporalCoverage:
              snap.value?.corpus.from && snap.value?.corpus.to
                ? `${snap.value.corpus.from}/${snap.value.corpus.to}`
                : undefined,
            measurementTechnique:
              'Clasificación con un modelo de lenguaje, validada con una muestra leída a ciegas',
            variableMeasured: [
              'postura sobre el mercado (−2 a +2)',
              'tema',
              'visión de la IA',
              'relato en primera persona',
            ],
            dateModified: snap.value?.generatedAt ?? undefined,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.mercado-it {
  max-width: 1080px;
}
.eyebrow,
.kicker {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.dek,
.lead {
  font-size: 1.05rem;
  line-height: 1.6;
  max-width: 70ch;
  margin: 0 0 16px;
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 20px;
  align-items: stretch;
}
.meter-label {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.meter-fig {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 6px;
}
/* Tokens de DESIGN.md: `display` para la cifra, `headline` para "de cada 10". */
.meter-fig strong {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.meter-fig span {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
}
.meter-cap {
  font-size: 0.95rem;
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.meter-cmp {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.meter-cmp div {
  display: grid;
  gap: 2px;
}
.meter-cmp b {
  font-size: 1.25rem;
  font-weight: 700;
}
.meter-cmp span {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.kpi {
  display: grid;
  gap: 4px;
  align-content: start;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.kpi b {
  font-size: 1.5rem;
  font-weight: 700;
}
.kpi span {
  font-size: 0.85rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* La barra del sitio es fixed (65 px): sin esto, paginar dejaba el encabezado del
   buscador justo debajo de la barra, tapado. Medido: aterrizaba en 0. */
#buscador {
  scroll-margin-top: 84px;
}
.block {
  margin-top: 48px;
}
.verdict {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.card-body {
  line-height: 1.55;
}
.fig-title {
  font-weight: 700;
  font-size: 0.95rem;
}
.fig-sub {
  font-size: 0.8rem;
  margin-bottom: 8px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.chart-wrap {
  position: relative;
  height: 260px;
}
.chart-wrap.tall {
  height: 320px;
}
.scale {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 0.8rem;
  margin: 4px 0 10px;
}
.scale i {
  display: inline-block;
  width: 12px;
  height: 10px;
  border-radius: 4px;
  margin-right: 6px;
}
.scale em {
  font-style: normal;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.hbars {
  display: grid;
  gap: 10px;
}
.hbar {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr) 48px;
  gap: 12px;
  align-items: center;
}
.hname {
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.2;
}
.hname small {
  display: block;
  font-weight: 400;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.htrack {
  display: block;
  height: 12px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  overflow: hidden;
}
.htrack b {
  display: block;
  height: 100%;
}
.hval {
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
  text-align: right;
}
.rank-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}
.rank-cta > div {
  flex: 1 1 320px;
}
.quotes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
}
.fact {
  display: grid;
  gap: 6px;
  align-content: start;
}
.fact-value {
  font-size: 1.5rem;
  font-weight: 700;
}
.fact-label {
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.35;
}
.fact-detail {
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.fact-src {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-link));
}
.method {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 24px;
}
.method-text p {
  margin: 0 0 14px;
  line-height: 1.6;
}
.small {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.table-wrap {
  overflow-x: auto;
}
.releases-table .why {
  display: block;
  max-width: 48ch;
  margin-top: 2px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
@media (max-width: 860px) {
  .hero-grid,
  .verdict,
  .two,
  .quotes,
  .method {
    grid-template-columns: minmax(0, 1fr);
  }
  .hbar {
    grid-template-columns: 120px minmax(0, 1fr) 44px;
  }
}
</style>
