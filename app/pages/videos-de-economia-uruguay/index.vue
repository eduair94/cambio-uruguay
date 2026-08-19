<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Videos de economía · se actualiza solo</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Videos de economía en Uruguay, al día
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4 lead">
        Lo último que se publicó en YouTube sobre el dólar, la inflación, los sueldos, los
        impuestos, las inversiones y todo lo que toca el bolsillo en Uruguay. Leemos los canales de
        los medios uruguayos, de los analistas y de los divulgadores de finanzas personales cuatro
        veces por día, dejamos afuera lo que no es de plata, y ordenamos lo que queda por tema.
      </p>

      <VAlert
        v-if="snapshot"
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-clock-outline"
      >
        Última lectura: <strong>{{ capturedLabel }}</strong
        >. Se releen los canales cada 6 horas.
        <strong>{{ snapshot.counts.videos }} videos</strong> de
        <strong>{{ snapshot.counts.channelsOk }} canales</strong>, de los cuales
        {{ snapshot.counts.uruguayan }} son de canales uruguayos. Los videos son de sus autores: acá
        sólo los listamos, con el enlace a YouTube y al canal.
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
      Todavía no hay una lectura guardada. El proceso que lee los canales corre cada 6 horas; si
      esto sigue así, es que no llegó a escribir ninguna.
    </VAlert>

    <template v-else>
      <!-- Topic navigation. Real links, not a client-side filter: cada tema es una página propia
           y esta fila es el camino por el que se llega (y por el que Google las descubre). -->
      <nav v-if="topicNav.length" class="topics mb-8" aria-label="Videos por tema">
        <h2 class="section-heading mb-3">Por tema</h2>
        <div class="topic-chips">
          <VChip
            v-for="topic in topicNav"
            :key="topic.slug"
            :to="localePath(`/videos-de-economia-uruguay/${topic.slug}`)"
            variant="tonal"
            color="primary"
            class="topic-chip"
          >
            <VIcon start size="small">{{ topic.icon }}</VIcon>
            {{ topic.label }}
            <span v-if="topic.count" class="topic-count">{{ topic.count }}</span>
          </VChip>
        </div>
      </nav>

      <!-- Broken sources -->
      <VAlert
        v-if="brokenChannels.length"
        type="warning"
        variant="tonal"
        density="comfortable"
        icon="mdi-alert-outline"
        class="mb-8"
      >
        <p class="mb-1 font-weight-bold">Esta lectura salió incompleta</p>
        <p class="mb-0 text-body-2">
          No respondieron: <strong>{{ brokenChannels.join(', ') }}</strong
          >. Lo que ves abajo es lo que sí se pudo leer — no es que esos canales no hayan publicado
          nada.
        </p>
      </VAlert>

      <!-- Latest -->
      <section class="mb-10">
        <h2 class="section-heading mb-1">Lo último</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Los videos más recientes, del más nuevo al más viejo. La fecha está en cada tarjeta: nada
          acá se presenta como de hoy si no lo es.
        </p>
        <div class="video-grid">
          <VideosCard v-for="video in latest" :key="video.videoId" :video="video" />
        </div>
      </section>

      <!-- Per topic -->
      <section v-for="block in topicBlocks" :key="block.topic.slug" class="mb-10">
        <div class="topic-head">
          <h2 class="section-heading">
            <VIcon size="small" class="mr-1">{{ block.topic.icon }}</VIcon>
            {{ block.topic.label }}
          </h2>
          <NuxtLink
            :to="localePath(`/videos-de-economia-uruguay/${block.topic.slug}`)"
            class="topic-more"
          >
            Ver los {{ block.total }} videos de {{ block.topic.label.toLowerCase() }}
            <VIcon size="small">mdi-arrow-right</VIcon>
          </NuxtLink>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-4">{{ block.topic.intro }}</p>
        <div class="video-grid">
          <VideosCard
            v-for="video in block.videos"
            :key="video.videoId"
            :video="video"
            :hide-topic="block.topic.slug"
          />
        </div>
      </section>

      <!-- Sources -->
      <section class="mb-10">
        <h2 class="section-heading mb-1">De dónde salen estos videos</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Estos son los canales que leemos, con el enlace a cada uno. La lista es nuestra y es
          revisable: si falta un canal uruguayo de economía que valga la pena,
          <NuxtLink :to="localePath('/contacto')">escribinos</NuxtLink>.
        </p>

        <div class="channel-grid">
          <div v-for="channel in sortedChannels" :key="channel.id" class="channel">
            <div class="channel-head">
              <a
                v-if="channel.handle"
                :href="`https://www.youtube.com/${channel.handle}`"
                target="_blank"
                rel="noopener noreferrer"
                class="channel-name"
                >{{ channel.name }}</a
              >
              <span v-else class="channel-name">{{ channel.name }}</span>
              <VChip v-if="channel.country === 'UY'" size="x-small" variant="tonal" color="success">
                Uruguay
              </VChip>
              <VChip v-else size="x-small" variant="tonal">{{ channel.country }}</VChip>
            </div>
            <p class="channel-blurb">{{ channel.blurb }}</p>
            <p class="channel-count">
              <template v-if="!channel.ok">No respondió en esta lectura.</template>
              <template v-else-if="channel.count === 0"
                >Sin videos de economía en la ventana leída.</template
              >
              <template v-else
                >{{ channel.count }} video{{ channel.count === 1 ? '' : 's' }} en esta
                lectura.</template
              >
            </p>
          </div>
        </div>
      </section>

      <!-- Method -->
      <section class="mb-10">
        <h2 class="section-heading mb-3">Cómo se arma esta página</h2>
        <div class="method">
          <ol class="method-list">
            <li>
              Una vez cada 6 horas leemos el feed público de cada canal de la lista de arriba. No
              usamos la API de YouTube ni ninguna clave: es el mismo XML que YouTube publica para
              cualquiera.
            </li>
            <li>
              Descartamos los <strong>Shorts</strong> y todo lo publicado hace más de
              {{ MAX_AGE_DAYS }} días.
            </li>
            <li>
              De los canales generalistas (un informativo, una radio) sólo dejamos pasar los videos
              cuyo título o primer párrafo menciona algo de plata. De los canales que son de
              economía y nada más, dejamos pasar todo.
            </li>
            <li>
              Clasificamos cada video por tema con una tabla de palabras, no con un modelo: así el
              mismo video cae siempre en el mismo lugar y podés predecir dónde va a estar.
            </li>
          </ol>
          <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
            <strong>Lo que esto no ve:</strong> el clasificador lee el título y el primer párrafo de
            la descripción, no el video. Un programa llamado «Editorial de los lunes» que dedica
            veinte minutos al dólar es invisible para él. Tampoco opinamos sobre lo que dice cada
            video: listarlo no es recomendarlo.
          </VAlert>
        </div>
      </section>

      <!-- FAQ -->
      <FaqBlock :items="faqItems" heading="Preguntas frecuentes" expanded />

      <!-- Related -->
      <section class="mb-4">
        <h2 class="section-heading mb-3">Seguí por acá</h2>
        <ul class="practica">
          <li>
            <NuxtLink :to="localePath('/dolar-hoy')">El dólar hoy</NuxtLink> — la pizarra de todas
            las casas de cambio, en vivo. Ningún video te va a dar el precio de este minuto.
          </li>
          <li>
            <NuxtLink :to="localePath('/tendencias-uruguay')">Lo que Uruguay busca hoy</NuxtLink> —
            las búsquedas y los titulares del día, con el mismo criterio de «esto toca el bolsillo».
          </li>
          <li>
            <NuxtLink :to="localePath('/noticias')">Noticias</NuxtLink> y
            <NuxtLink :to="localePath('/economia-uruguay')">Economía uruguaya</NuxtLink> — el texto
            detrás de los mismos temas.
          </li>
          <li>
            <NuxtLink :to="localePath('/herramientas')">Las calculadoras</NuxtLink> — cuando el
            video te dejó con la cuenta a medio hacer.
          </li>
        </ul>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import type { VideoItem, VideosSnapshotDoc } from '~/server/models/VideosSnapshot'
import { buildVideoPageSchema, SITE_URL } from '~/utils/videoSchema'
import { VIDEO_TOPIC_PAGES } from '~/utils/videoTopics'

/**
 * Mirrors `MAX_AGE_DAYS` in classes/videos/refresh.ts.
 *
 * Duplicated rather than imported: the app cannot import from the backend package (different
 * build, different tsconfig), and this is one number shown in prose. `tests/unit/videoTopics.test.ts`
 * asserts the two stay equal by reading the backend file, so a change there turns CI red here.
 */
const MAX_AGE_DAYS = 120

/** How many of the freshest videos the "Lo último" grid shows. */
const LATEST_COUNT = 12

/** How many videos each per-topic block previews, and the floor for showing the block at all. */
const PER_TOPIC = 3

const localePath = useLocalePath()

const { data: snapshot } = await useFetch<VideosSnapshotDoc | null>('/api/videos', {
  key: 'videos-uy',
  default: () => null,
})

const videos = computed<VideoItem[]>(() => snapshot.value?.videos ?? [])

const latest = computed(() =>
  [...videos.value]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, LATEST_COUNT)
)

/**
 * Every topic, the fullest first.
 *
 * A topic with no videos this week keeps its chip: its page carries its own writing and its own
 * links, it is in both sitemaps, and dropping the only in-site path to it on a quiet week is how a
 * page loses the position it took months to earn. The count is simply omitted when it is zero.
 */
const topicNav = computed(() =>
  VIDEO_TOPIC_PAGES.map(topic => ({
    ...topic,
    count: snapshot.value?.topicCounts?.[topic.slug] ?? 0,
  })).sort((a, b) => b.count - a.count)
)

/**
 * The per-topic preview blocks.
 *
 * Only topics with at least `PER_TOPIC` videos get a block: a heading over one card reads as a
 * broken section, and the chip row above already links to the page for the thin ones.
 */
const topicBlocks = computed(() =>
  topicNav.value
    .filter(topic => topic.count >= PER_TOPIC)
    .map(topic => ({
      topic,
      total: topic.count,
      videos: videos.value.filter(v => v.topics.includes(topic.slug)).slice(0, PER_TOPIC),
    }))
)

const sortedChannels = computed(() =>
  [...(snapshot.value?.channels ?? [])].sort((a, b) => {
    // Uruguayan first, then by how much each one actually contributed. A channel that answered
    // with nothing still appears — hiding it would hide that we read it.
    const local = Number(b.country === 'UY') - Number(a.country === 'UY')
    return local !== 0 ? local : b.count - a.count
  })
)

const brokenChannels = computed(() =>
  (snapshot.value?.channels ?? []).filter(c => !c.ok).map(c => c.name)
)

const capturedLabel = computed(() => {
  const at = snapshot.value?.capturedAt
  if (!at) return ''
  // Pinned to Montevideo, not to whoever is rendering: the server (UTC) and the browser (the
  // reader's zone) would otherwise format the same instant differently — a wrong hour for a
  // Uruguayan page, and a hydration mismatch.
  return new Date(at).toLocaleString('es-UY', {
    timeZone: 'America/Montevideo',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
})

const faqItems = [
  {
    id: 'que-es',
    question: '¿Qué es esta página?',
    answer:
      'Un listado, actualizado varias veces por día, de los videos de YouTube sobre economía y dinero que le sirven a alguien en Uruguay: el dólar, la inflación, los sueldos, los impuestos, las inversiones, los créditos y la vivienda. Los videos son de sus autores; acá se listan, se agrupan por tema y se enlazan a YouTube y al canal.',
  },
  {
    id: 'cada-cuanto',
    question: '¿Cada cuánto se actualiza?',
    answer:
      'Los canales se releen cada 6 horas, todos los días. La fecha y la hora de la última lectura están arriba de todo, y cada video muestra su propia fecha de publicación.',
  },
  {
    id: 'como-se-eligen',
    question: '¿Cómo se eligen los videos?',
    answer:
      'Se leen los feeds públicos de una lista fija de canales. Se descartan los Shorts y lo publicado hace más de 120 días. De los canales generalistas sólo pasan los videos cuyo título o primer párrafo menciona algo de dinero; de los canales que son de economía y nada más, pasa todo. La clasificación por tema es una tabla de palabras, no un modelo de lenguaje, así que es la misma en cada corrida.',
  },
  {
    id: 'recomendacion',
    question: '¿Los videos que aparecen acá están recomendados por el sitio?',
    answer:
      'No. Que un video esté en la lista significa que su canal está en la lista y que el video habla de dinero. No revisamos el contenido de cada video ni respaldamos lo que dice. En particular, ningún video de esta página es asesoramiento financiero.',
  },
  {
    id: 'sugerir-canal',
    question: '¿Se puede sugerir un canal?',
    answer:
      'Sí. La lista de canales está publicada en esta misma página. Si falta un canal uruguayo de economía o de finanzas personales que valga la pena, se puede proponer desde la página de contacto del sitio.',
  },
  {
    id: 'cotizacion',
    question: '¿Puedo saber la cotización del dólar por estos videos?',
    answer:
      'No conviene. Un video queda fijo en el día que se grabó. Para el precio de ahora está la pizarra del sitio, que lee las casas de cambio y los bancos cada pocos minutos.',
  },
]

const title = 'Videos de economía en Uruguay: dólar, inflación, sueldos e inversiones'
const description =
  'Los videos de YouTube sobre economía uruguaya, actualizados todos los días: dólar, inflación, sueldos, impuestos, inversiones, créditos y vivienda, agrupados por tema y con la fecha de cada uno.'
const canonicalUrl = `${SITE_URL}/videos-de-economia-uruguay`

// Branded OG image, same template as the rest of the site.
defineOgImageComponent('Cambio', {
  title: 'Videos de economía en Uruguay',
  subtitle: 'Dólar, inflación, sueldos e inversiones, en video y al día',
  tag: 'VIDEOS',
})

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

/** Exactly the videos this page renders a player for — nothing marked up that is not on the page. */
const schemaVideos = computed(() => {
  const seen = new Set<string>()
  const out: VideoItem[] = []
  for (const video of [...latest.value, ...topicBlocks.value.flatMap(b => b.videos)]) {
    if (seen.has(video.videoId)) continue
    seen.add(video.videoId)
    out.push(video)
  }
  return out
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'videos economia uruguay, videos dolar uruguay, youtube economia uruguay, videos finanzas personales uruguay, videos inflacion uruguay, videos inversiones uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      // FAQPage is emitted by <FaqBlock> from the same `faqItems`, so it is deliberately NOT
      // repeated here — two FAQPage nodes on one page is a validation error, not a bonus.
      innerHTML: JSON.stringify(
        buildVideoPageSchema({
          url: canonicalUrl,
          name: title,
          description,
          videos: schemaVideos.value,
          capturedAt: snapshot.value?.capturedAt ?? null,
        })
      ),
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

.lead {
  max-width: 68ch;
}

.section-heading {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.25;
}

.topic-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.topic-count {
  margin-left: 0.45rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(var(--v-theme-primary), 0.16);
}

.topic-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 0.25rem;
}

.topic-more {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.topic-more:hover {
  text-decoration: underline;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.channel {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  padding: 0.9rem 1rem;
}

.channel-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
}

.channel-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: inherit;
  text-decoration: none;
}

.channel-name:hover {
  text-decoration: underline;
}

.channel-blurb {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.channel-count {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.method {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}

.method-list {
  margin: 0;
  padding-left: 1.15rem;
  display: grid;
  gap: 0.55rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.practica {
  margin: 0;
  padding-left: 1.15rem;
  display: grid;
  gap: 0.5rem;
  line-height: 1.55;
}

@media (max-width: 599px) {
  .video-grid {
    grid-template-columns: 1fr;
  }
}
</style>
