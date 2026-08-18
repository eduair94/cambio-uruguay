<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Qué busca Uruguay · se actualiza solo</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">Lo que Uruguay busca hoy</h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Las búsquedas que Google publica como tendencia del día en Uruguay, los hilos que más
        conversación están generando en los foros uruguayos y los titulares de economía de la
        semana. Separamos lo que toca el bolsillo de lo que no, y cuando hay una página que contesta
        la pregunta, la enlazamos.
      </p>

      <VAlert
        v-if="snapshot"
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-clock-outline"
      >
        Última lectura: <strong>{{ capturedLabel }}</strong
        >. Se relee cada 3 horas. Las tendencias de búsqueda y su volumen aproximado
        (<em>«2000+»</em>) son de Google, reproducidos tal cual: este sitio no calcula volúmenes.
      </VAlert>
    </header>

    <!-- Empty / error state -->
    <VAlert
      v-if="!snapshot"
      type="warning"
      variant="tonal"
      class="mb-8"
      icon="mdi-cloud-off-outline"
    >
      Todavía no hay una lectura guardada. El proceso que lee las fuentes corre cada 3 horas; si
      esto sigue así, es que no llegó a escribir ninguna.
    </VAlert>

    <template v-else>
      <!-- Source health -->
      <section v-if="brokenSources.length" class="mb-8">
        <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
          <p class="mb-1 font-weight-bold">Esta lectura salió incompleta</p>
          <p class="mb-0 text-body-2">
            No respondieron: <strong>{{ brokenSources.join(', ') }}</strong
            >. Lo que ves abajo es lo que sí se pudo leer — no es que no haya pasado nada.
          </p>
        </VAlert>
      </section>

      <!-- Money summary -->
      <section class="mb-8">
        <VRow>
          <VCol cols="12" sm="4">
            <VCard variant="flat" class="stat pa-4 h-100">
              <p class="text-overline text-medium-emphasis mb-1">Búsquedas del día</p>
              <p class="stat-num mb-1">
                {{ snapshot.counts.moneySearches }} / {{ snapshot.counts.searches }}
              </p>
              <p class="text-body-2 text-medium-emphasis mb-0">tocan el bolsillo</p>
            </VCard>
          </VCol>
          <VCol cols="12" sm="4">
            <VCard variant="flat" class="stat pa-4 h-100">
              <p class="text-overline text-medium-emphasis mb-1">Hilos de foros</p>
              <p class="stat-num mb-1">
                {{ snapshot.counts.moneyReddit }} / {{ snapshot.counts.reddit }}
              </p>
              <p class="text-body-2 text-medium-emphasis mb-0">son de plata</p>
            </VCard>
          </VCol>
          <VCol cols="12" sm="4">
            <VCard variant="flat" class="stat pa-4 h-100">
              <p class="text-overline text-medium-emphasis mb-1">Titulares de economía</p>
              <p class="stat-num mb-1">{{ snapshot.counts.news }}</p>
              <p class="text-body-2 text-medium-emphasis mb-0">de los últimos 7 días</p>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <!-- Trending searches -->
      <section class="mb-8">
        <h2 class="section-heading mb-1">Las búsquedas que Google marca como tendencia</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          En el orden que las publica Google, con su propio volumen aproximado. La etiqueta de la
          izquierda es nuestra: dice si el término, o el titular que Google le adjunta, menciona
          algo de plata.
        </p>

        <VBtnToggle
          v-model="searchFilter"
          color="primary"
          mandatory
          divided
          variant="outlined"
          class="mb-4 filter-toggle"
        >
          <VBtn value="all">Todas ({{ snapshot.searches.length }})</VBtn>
          <VBtn value="money">De plata ({{ moneySearches.length }})</VBtn>
        </VBtnToggle>

        <VAlert
          v-if="searchFilter === 'money' && moneySearches.length === 0"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mb-4"
        >
          Hoy ninguna de las búsquedas del día es de plata. Pasa seguido: la lista de Google en
          Uruguay la dominan el fútbol y la TV. No lo maquillamos.
        </VAlert>

        <VCard
          v-for="row in visibleSearches"
          :key="row.rank"
          variant="flat"
          class="trend pa-4 mb-3"
        >
          <div class="trend-head">
            <span class="rank">{{ row.rank }}</span>
            <div class="grow">
              <p class="text-subtitle-1 font-weight-bold mb-1">{{ row.term }}</p>
              <div class="chips">
                <VChip size="small" variant="tonal" color="primary">{{ row.approxTraffic }}</VChip>
                <VChip :color="moneyColor(row.money)" size="small" variant="tonal">
                  {{ moneyLabel(row.money) }}
                </VChip>
                <VChip v-if="row.matchedOn.length" size="small" variant="text" class="matched">
                  por «{{ row.matchedOn.join('», «') }}»
                </VChip>
              </div>
            </div>
          </div>

          <ul v-if="row.headlines.length" class="headlines mt-3">
            <li v-for="h in row.headlines" :key="h.url">
              <a :href="h.url" target="_blank" rel="noopener noreferrer nofollow">{{ h.title }}</a>
              <span class="text-medium-emphasis"> — {{ h.source }}</span>
            </li>
          </ul>

          <div v-if="answersFor(row.term).length" class="answers mt-3">
            <p class="text-caption text-medium-emphasis mb-1">Lo contestamos acá:</p>
            <NuxtLink
              v-for="a in answersFor(row.term)"
              :key="a.to"
              :to="a.to"
              class="answer-link"
              >{{ a.title }}</NuxtLink
            >
          </div>
        </VCard>
      </section>

      <!-- Reddit -->
      <section v-if="snapshot.reddit.length" class="mb-8">
        <h2 class="section-heading mb-1">Lo que se está preguntando en los foros</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Hilos activos de las comunidades uruguayas, ordenados por cantidad de comentarios y no por
          votos: un hilo con muchos comentarios suele ser una pregunta que nadie terminó de
          contestar, que es exactamente lo que sirve para saber qué falta escribir.
        </p>

        <div class="table-wrap">
          <table class="cu-mobile-cards trend-table">
            <thead>
              <tr>
                <th scope="col">Hilo</th>
                <th scope="col">Comunidad</th>
                <th scope="col">Comentarios</th>
                <th scope="col">¿De plata?</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="post in snapshot.reddit" :key="post.url">
                <td data-label="Hilo">
                  <a :href="post.url" target="_blank" rel="noopener noreferrer nofollow">{{
                    post.title
                  }}</a>
                </td>
                <td data-label="Comunidad">r/{{ post.subreddit }}</td>
                <td data-label="Comentarios">{{ post.comments }}</td>
                <td data-label="¿De plata?">
                  <VChip :color="moneyColor(post.money)" size="small" variant="tonal">
                    {{ moneyLabel(post.money) }}
                  </VChip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- News -->
      <section v-if="snapshot.news.length" class="mb-8">
        <h2 class="section-heading mb-1">Los titulares de economía de la semana</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          De la edición uruguaya de Google Noticias. Enlazan al medio original; este sitio no
          reproduce el contenido.
        </p>
        <VCard variant="flat" class="news-card pa-4">
          <ul class="news-list">
            <li v-for="item in snapshot.news" :key="item.url">
              <a :href="item.url" target="_blank" rel="noopener noreferrer nofollow">{{
                item.title
              }}</a>
              <span class="text-medium-emphasis"> — {{ item.source }}</span>
            </li>
          </ul>
        </VCard>
      </section>

      <!-- Method -->
      <section class="mb-8">
        <h2 class="section-heading mb-1">Cómo se arma esta página</h2>
        <VCard variant="flat" class="practica pa-5">
          <ul class="practica-list">
            <li>
              <strong>Tres fuentes públicas, leídas cada 3 horas:</strong> el RSS de tendencias
              diarias de Google para Uruguay, la edición uruguaya de Google Noticias y los listados
              «hot» de las comunidades uruguayas. Nada de esto requiere cuenta.
            </li>
            <li>
              <strong>El volumen no lo calculamos nosotros.</strong> El «2000+» es el tramo que
              publica Google y se reproduce sin tocarlo. No tenemos ni inventamos búsquedas
              mensuales.
            </li>
            <li>
              <strong>La etiqueta «de plata» la decide una lista de palabras</strong>, no un modelo
              de lenguaje: así el criterio es el mismo en cada corrida, se puede auditar y no puede
              inventar una categoría. Mostramos qué palabra la disparó.
            </li>
            <li>
              <strong>El límite de ese método, dicho de frente:</strong> lee el texto, no la
              historia. El apellido de un ministro el día que anuncia un impuesto queda como «no».
              Por eso existe la etiqueta intermedia «puede ser», en vez de forzar todo a sí o no.
            </li>
            <li>
              <strong
                >Los megahilos fijados y los mismos hilos cruzados en dos comunidades se
                descartan</strong
              >
              antes de ordenar: si no, la guía fijada de compras y la bolsa de trabajo ocuparían los
              primeros lugares para siempre.
            </li>
            <li>
              <strong>Si una fuente no responde, la página lo dice</strong> arriba y muestra el
              resto. Una lista corta en silencio se ve igual que un día tranquilo, y no son lo
              mismo.
            </li>
          </ul>
        </VCard>
      </section>

      <!-- Recirculation -->
      <section class="mb-4">
        <h2 class="section-heading mb-1">Si viniste por alguno de estos temas</h2>
        <ul class="practica-list">
          <li>
            <NuxtLink to="/dolar-hoy">El dólar hoy</NuxtLink> — la pizarra de todas las casas, en
            vivo.
          </li>
          <li>
            <NuxtLink to="/temas-de-dinero-reddit">Los temas de dinero en Reddit</NuxtLink> — el
            análisis de fondo de estas mismas comunidades, no el pulso del día.
          </li>
          <li>
            <NuxtLink to="/noticias">Noticias</NuxtLink> y
            <NuxtLink to="/economia-uruguay">Economía uruguaya</NuxtLink> — el contexto detrás de
            los titulares.
          </li>
          <li>
            <NuxtLink to="/buscar">Buscar en el sitio</NuxtLink> — si tu pregunta no está acá
            arriba.
          </li>
        </ul>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { buildSearchIndex } from '~/utils/searchIndex'
import { scoreDocs } from '~/utils/siteNav'
import type { TrendsSnapshotDoc, MoneyVerdict } from '~/server/models/TrendsSnapshot'

const { locale, t } = useI18n()

const { data: snapshot } = await useFetch<TrendsSnapshotDoc | null>('/api/trends', {
  key: 'trends-uy',
  default: () => null,
})

const searchFilter = ref<'all' | 'money'>('all')

const moneySearches = computed(() =>
  (snapshot.value?.searches ?? []).filter(s => s.money === 'money')
)

const visibleSearches = computed(() =>
  searchFilter.value === 'money' ? moneySearches.value : (snapshot.value?.searches ?? [])
)

const brokenSources = computed(() => {
  const s = snapshot.value?.sources
  if (!s) return []
  const names: Record<string, string> = {
    googleTrends: 'Google Trends',
    reddit: 'los foros',
    news: 'Google Noticias',
  }
  return Object.entries(s)
    .filter(([, status]) => !status?.ok)
    .map(([key]) => names[key] ?? key)
})

const capturedLabel = computed(() => {
  const at = snapshot.value?.capturedAt
  if (!at) return ''
  return new Date(at).toLocaleString('es-UY', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
})

function moneyLabel(verdict: MoneyVerdict): string {
  return verdict === 'money' ? 'de plata' : verdict === 'maybe' ? 'puede ser' : 'no'
}

function moneyColor(verdict: MoneyVerdict): string {
  return verdict === 'money' ? 'success' : verdict === 'maybe' ? 'warning' : 'grey'
}

// Reuse the site's OWN search scorer to answer "who here answers this?". Building a second matcher
// would drift from the real search results; this way a page that ranks for the term in /buscar is
// the same page offered here.
const docs = computed(() => buildSearchIndex({ locale: locale.value, t }))

/** The site's best answers for one trending term, or nothing when the match is weak. */
function answersFor(term: string): Array<{ to: string; title: string }> {
  const hits = scoreDocs(term, docs.value)
  return (
    hits
      // A low score means the scorer matched a stray token; offering a page for "fluminense" because
      // it shares a letter run with something is worse than offering nothing.
      .filter(h => !h.suggestion && h.score >= 6)
      .slice(0, 2)
      .map(h => ({ to: h.doc.to, title: h.doc.title }))
  )
}

const title = 'Lo que Uruguay busca hoy: tendencias de búsqueda, foros y economía'
const description =
  'Las tendencias de búsqueda del día en Uruguay según Google, los hilos más comentados de los foros uruguayos y los titulares de economía de la semana, separando lo que toca el bolsillo. Se actualiza cada 3 horas.'
const canonicalUrl = 'https://cambio-uruguay.com/tendencias-uruguay'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'tendencias uruguay, que se busca en uruguay, google trends uruguay, tendencias de busqueda uruguay, temas del momento uruguay, noticias economia uruguay hoy',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      // The ItemList carries only the MONEY-classified searches, and only the terms — the page's
      // own claim, not Google's list reproduced as structured data.
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
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Lo que Uruguay busca hoy',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'CollectionPage',
            name: title,
            description,
            url: canonicalUrl,
            inLanguage: 'es-UY',
            isAccessibleForFree: true,
            ...(snapshot.value?.capturedAt
              ? { dateModified: new Date(snapshot.value.capturedAt).toISOString() }
              : {}),
            mainEntity: {
              '@type': 'ItemList',
              name: 'Búsquedas de tendencia en Uruguay que tocan el bolsillo',
              numberOfItems: moneySearches.value.length,
              itemListElement: moneySearches.value.map((row, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: row.term,
              })),
            },
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 0.35rem;
}

.section-heading {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.25;
}

.stat,
.trend,
.news-card,
.practica {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
}

.stat-num {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.1;
}

.trend-head {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.rank {
  flex: 0 0 auto;
  min-width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  font-size: 0.9rem;
}

.grow {
  flex: 1 1 auto;
  min-width: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.matched {
  font-size: 0.72rem;
}

.headlines,
.news-list,
.practica-list {
  margin: 0;
  padding-left: 1.1rem;
}

.headlines li,
.news-list li,
.practica-list li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.answers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.answer-link {
  font-weight: 600;
}

.filter-toggle {
  max-width: 26rem;
}

.table-wrap {
  overflow-x: auto;
}

.trend-table {
  width: 100%;
  border-collapse: collapse;
}

.trend-table th,
.trend-table td {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
  vertical-align: top;
}

.trend-table th {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
</style>
