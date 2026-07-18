<template>
  <div class="rt-page pb-8">
    <div class="mb-3">
      <VBtn :to="localePath('/economia-uruguay')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Economía
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Radar en vivo · Reddit Uruguay</p>
        <h1 class="hero-title">De qué habla Uruguay sobre plata</h1>
        <p class="hero-lead">
          Lo que la gente realmente pregunta sobre dinero en Reddit —dólar, deudas, alquiler,
          impuestos, inversión, sueldo— ordenado por lo que más se repite. Cada tema enlaza a los
          hilos reales y a nuestra guía o herramienta para resolverlo.
        </p>
        <div class="d-flex align-center flex-wrap ga-3 mt-4">
          <ShareButtons text="De qué habla Uruguay sobre plata en Reddit" />
          <span v-if="asOfLabel" class="hero-asof">Actualizado {{ asOfLabel }}</span>
        </div>
      </div>
    </VCard>

    <VAlert
      v-if="!pending && data?.empty"
      type="info"
      variant="tonal"
      border="start"
      class="mb-6"
      icon="mdi-clock-outline"
    >
      Estamos juntando los primeros datos desde Reddit. Este radar se actualiza todos los días;
      volvé en unas horas y vas a ver los temas rankeados.
    </VAlert>

    <div v-else class="topic-grid">
      <VCard v-for="(t, i) in topics" :key="t.id" variant="flat" class="topic-card pa-5">
        <div class="d-flex align-center ga-3 mb-2">
          <span class="topic-rank">{{ i + 1 }}</span>
          <VIcon :icon="t.icon" color="primary" />
          <h2 class="topic-title">{{ t.label }}</h2>
          <VChip
            v-if="t.recent > 0"
            size="x-small"
            color="success"
            variant="flat"
            label
            class="ml-auto"
          >
            {{ t.recent }} recientes
          </VChip>
        </div>
        <p class="topic-blurb">{{ t.blurb }}</p>
        <div class="topic-count">
          <strong>{{ t.total.toLocaleString('es-UY') }}</strong> hilos analizados
        </div>

        <ul v-if="t.sample.length" class="thread-list">
          <li v-for="th in t.sample" :key="th.permalink">
            <a :href="th.permalink" target="_blank" rel="noopener noreferrer">
              <VIcon size="13" icon="mdi-reddit" />
              {{ th.title }}
            </a>
            <span class="thread-meta">{{ th.numComments }} coment. · r/{{ th.sub }}</span>
          </li>
        </ul>

        <div v-if="t.related.length" class="related">
          <span class="related-label">Nuestra respuesta:</span>
          <VBtn
            v-for="r in t.related"
            :key="r.to"
            :to="localePath(r.to)"
            size="x-small"
            variant="tonal"
            color="primary"
            class="mr-2 mb-2"
          >
            {{ r.label }}
            <VIcon end size="14" icon="mdi-arrow-right" />
          </VBtn>
        </div>
      </VCard>
    </div>

    <VCard variant="flat" class="method-card pa-5 pa-sm-6 mt-6 mb-6">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">
        <VIcon start color="primary">mdi-information-outline</VIcon>
        Cómo se arma este radar
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Leemos posts públicos de las comunidades uruguayas de Reddit
        <span v-if="data?.subs?.length">({{ data.subs.map(s => 'r/' + s).join(', ') }})</span>, los
        guardamos y los agrupamos por tema con reglas de palabras clave, sin que ninguna IA invente
        un número: el ranking es puro conteo de hilos y su ritmo reciente. Los títulos y enlaces
        pertenecen a sus autores en Reddit; los usamos para detectar qué preocupa, no para convertir
        una anécdota en una regla.
      </p>
    </VCard>

    <VRow class="my-2">
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/economia-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-chart-box-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Economía Uruguay</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">Noticias y datos por tema, al día.</p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/mejores-bancos-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-bank</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Qué dice Reddit de los bancos</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">Sentimiento real por banco y fintech.</p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Ordená tu plata y no vuelvas a las dudas.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

interface TopicThread {
  title: string
  permalink: string
  score: number
  numComments: number
  date: string
  sub: string
}
interface Topic {
  id: string
  label: string
  icon: string
  blurb: string
  total: number
  recent: number
  related: Array<{ label: string; to: string }>
  sample: TopicThread[]
}
interface TopicsPayload {
  topics: Topic[]
  asOf: string | null
  empty: boolean
  subs: string[]
}

const { data, pending } = await useFetch<TopicsPayload>('/api/reddit-topics', {
  key: 'reddit-topics',
  default: () => ({ topics: [], asOf: null, empty: true, subs: [] }),
})

const topics = computed(() => data.value?.topics ?? [])
const asOfLabel = computed(() =>
  data.value?.asOf
    ? new Date(data.value.asOf).toLocaleDateString('es-UY', { day: 'numeric', month: 'long' })
    : ''
)

const canonicalUrl = 'https://cambio-uruguay.com/temas-de-dinero-reddit'
const title = 'De qué habla Uruguay sobre plata en Reddit: temas de dinero (2026)'
const description =
  'Radar en vivo de lo que los uruguayos preguntan sobre dinero en Reddit: dólar, deudas y clearing, alquiler, impuestos, préstamos, inversión, sueldo, tarjetas y más, rankeado por lo que más se repite, con hilos reales y la guía nuestra para cada tema.'

defineOgImageComponent('Cambio', {
  title: 'De qué habla Uruguay sobre plata',
  subtitle: 'Radar de temas de dinero en Reddit Uruguay',
  tag: 'ECONOMÍA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'temas de dinero reddit uruguay, que pregunta la gente sobre plata, reddit uruguay finanzas, dolar deudas clearing alquiler impuestos, economia personal uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
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
            name: 'Temas de dinero en Reddit',
            item: canonicalUrl,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.rt-page {
  overflow-x: hidden;
}
.hero {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(255, 69, 0, 0.28), transparent 55%),
    linear-gradient(135deg, #10233a 0%, #1a2a3a 55%, #3a2412 100%);
}
.hero-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 700;
  color: #ffc9a1;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 780px;
  line-height: 1.65;
  margin-bottom: 0;
}
.hero-asof {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.8rem;
  font-weight: 600;
}
.topic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.topic-card,
.method-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 16px;
}
.topic-rank {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.78rem;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
  flex: 0 0 auto;
}
.v-theme--light .topic-rank {
  color: #0d47a1;
}
.topic-title {
  font-size: 1.05rem;
  font-weight: 800;
}
.topic-blurb {
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
  margin-bottom: 8px;
}
.topic-count {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 10px;
}
.topic-count strong {
  color: rgb(var(--v-theme-primary));
  font-size: 1rem;
}
.thread-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: grid;
  gap: 7px;
}
.thread-list li {
  font-size: 0.82rem;
  line-height: 1.4;
}
.thread-list a {
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  font-weight: 600;
}
.thread-list a:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
.thread-meta {
  display: block;
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.related {
  border-top: 1px dashed rgba(var(--v-border-color), 0.22);
  padding-top: 10px;
}
.related-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-bottom: 6px;
}
.cross-link {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease;
}
.cross-link:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.6);
}
@media (max-width: 720px) {
  .topic-grid {
    grid-template-columns: 1fr;
  }
}
</style>
