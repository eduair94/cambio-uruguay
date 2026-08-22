<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero on-dark mb-8">
      <p class="eyebrow">
        {{ REQUESTED_FEATURES.length }} cosas que existen porque alguien las pidió
      </p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">Hecho a pedido</h1>
      <p class="hero-lead text-body-1 mb-4">
        Buena parte de lo que este sitio hace no salió de una hoja de ruta: salió de un correo, de
        un issue en GitHub o de una pregunta que alguien hizo en público y que acá no estaba
        contestada. Esta página lista esos casos, con <strong>qué se pidió</strong>,
        <strong>qué se hizo</strong> y <strong>qué se aprendió haciéndolo</strong>.
      </p>
      <p class="hero-lead text-body-2 mb-4">
        Lo que no vas a encontrar es <strong>quién</strong> lo pidió. Un nombre o una casilla son
        datos personales y nadie los entrega esperando figurar en una página web.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          color="white"
          variant="flat"
          size="small"
          prepend-icon="mdi-email-outline"
          :to="localePath('/contacto')"
        >
          Pedir algo
        </VBtn>
        <VBtn
          variant="outlined"
          size="small"
          prepend-icon="mdi-github"
          href="https://github.com/eduair94/cambio-uruguay/issues/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir un issue
        </VBtn>
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-api"
          :to="localePath('/desarrolladores')"
        >
          La API pública
        </VBtn>
      </div>
    </header>

    <!-- 1. Cómo funciona -->
    <section class="mb-10" aria-labelledby="como">
      <h2 id="como" class="section-heading mb-1">Cómo llega un pedido, y qué se publica de él</h2>
      <p class="section-lead text-body-2 mb-4">
        Tres puertas, y cada una cambia qué se puede contar después.
      </p>
      <VRow>
        <VCol v-for="(channel, key) in REQUEST_CHANNELS" :key="key" cols="12" md="4">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon size="small" color="primary">{{ channel.icon }}</VIcon>
              <span class="text-subtitle-2 font-weight-bold">{{ channel.label }}</span>
              <VChip size="x-small" variant="tonal">{{ countFor(key) }}</VChip>
            </div>
            <p class="text-body-2 mb-0">{{ channel.note }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- 2. Las fichas -->
    <section class="mb-10" aria-labelledby="listado">
      <h2 id="listado" class="section-heading mb-4">Lo que se construyó</h2>

      <VCard
        v-for="feature in REQUESTED_FEATURES"
        :key="feature.id"
        variant="outlined"
        class="entry pa-5 mb-5"
      >
        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <VChip
            size="small"
            variant="tonal"
            color="primary"
            :prepend-icon="REQUEST_CHANNELS[feature.channel].icon"
          >
            {{ REQUEST_CHANNELS[feature.channel].label }}
          </VChip>
          <span class="text-caption text-medium-emphasis">
            Publicado el {{ shippedLabel(feature) }}
          </span>
          <VChip v-if="turnaroundLabel(feature)" size="x-small" variant="tonal" color="success">
            {{ turnaroundLabel(feature) }}
          </VChip>
        </div>

        <h3 class="entry-title text-h6 font-weight-bold mb-3">{{ feature.title }}</h3>

        <div class="entry-grid">
          <div class="entry-block">
            <p class="block-label text-overline mb-1">Qué se pidió</p>
            <p class="text-body-2 mb-0">{{ feature.asked }}</p>
          </div>
          <div class="entry-block">
            <p class="block-label text-overline mb-1">Qué se hizo</p>
            <p class="text-body-2 mb-0">{{ feature.built }}</p>
          </div>
        </div>

        <VAlert
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-lightbulb-on-outline"
          class="mt-4"
        >
          <p class="alert-title font-weight-bold mb-1">Lo no obvio</p>
          <p class="text-body-2 mb-0">{{ feature.insight }}</p>
        </VAlert>

        <div class="d-flex flex-wrap ga-2 mt-4">
          <VBtn
            v-for="link in feature.links"
            :key="link.label"
            size="small"
            variant="outlined"
            :to="link.to ? localePath(link.to) : undefined"
            :href="link.href"
            :target="link.href ? '_blank' : undefined"
            :rel="link.href ? 'noopener noreferrer' : undefined"
            :append-icon="link.href ? 'mdi-open-in-new' : 'mdi-arrow-right'"
          >
            {{ link.label }}
          </VBtn>
        </div>
      </VCard>
    </section>

    <!-- 3. Qué no publicamos -->
    <section class="mb-10" aria-labelledby="privacidad">
      <h2 id="privacidad" class="section-heading mb-1">Qué no vas a leer acá</h2>
      <p class="section-lead text-body-2 mb-4">
        De cada pedido se publica el contenido funcional y nada más. No hay nombres, ni direcciones
        de correo —ni completas ni ofuscadas—, ni capturas, ni citas textuales del mensaje, ni
        institución, curso o cátedra cuando el pedido llegó por privado. Tampoco en el repositorio
        ni en el historial de commits.
      </p>
      <VCard variant="tonal" color="primary" class="pa-4">
        <div class="d-flex align-center ga-2 mb-2">
          <VIcon>mdi-scale-balance</VIcon>
          <span class="text-subtitle-1 font-weight-bold">Por qué, en concreto</span>
        </div>
        <p class="text-body-2 mb-2">
          Una casilla de correo es un <strong>dato personal</strong> en los términos del artículo 4
          literal D de la <strong>Ley Nº 18.331</strong>, y publicarla sería una comunicación de
          datos que el artículo 17 sólo admite con consentimiento previo del titular. Ese
          consentimiento no existe: nadie escribe una consulta técnica esperando aparecer en una
          página web.
        </p>
        <p class="text-body-2 mb-0">
          Un issue de GitHub es distinto: es público desde que se abre, así que se enlaza el issue
          para que cualquiera lo lea entero. El razonamiento completo, con los artículos, está en
          <NuxtLink :to="localePath('/api-cotizacion-intradia')"
            >la página del endpoint intradía</NuxtLink
          >.
        </p>
      </VCard>
    </section>

    <!-- 4. Qué se puede pedir -->
    <section class="mb-10" aria-labelledby="pedir">
      <h2 id="pedir" class="section-heading mb-1">Qué tiene sentido pedir</h2>
      <p class="section-lead text-body-2 mb-4">
        Sin promesas de plazo: esto lo mantiene una persona. Pero estas cosas suelen salir, y estas
        otras no van a salir nunca.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="success">mdi-check-circle-outline</VIcon>
              <span class="text-subtitle-1 font-weight-bold">Suele salir</span>
            </div>
            <ul class="tight-list text-body-2">
              <li v-for="item in YES" :key="item">{{ item }}</li>
            </ul>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="error">mdi-close-circle-outline</VIcon>
              <span class="text-subtitle-1 font-weight-bold">No va a salir</span>
            </div>
            <ul class="tight-list text-body-2">
              <li v-for="item in NO" :key="item">{{ item }}</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- 5. FAQ -->
    <section class="mb-10">
      <FaqSection :items="FAQ" heading="Preguntas frecuentes" :expanded="true" />
    </section>

    <!-- 6. CTA -->
    <section aria-labelledby="cta">
      <h2 id="cta" class="section-heading mb-3">Pedí lo tuyo</h2>
      <p class="text-body-1 mb-3">
        Si te falta un dato, una moneda, un país, un campo en la API o una página que conteste algo
        que nadie contesta, escribí. La mitad de esta lista empezó exactamente así.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          variant="flat"
          color="primary"
          size="small"
          prepend-icon="mdi-email-outline"
          :to="localePath('/contacto')"
        >
          Contacto
        </VBtn>
        <VBtn
          variant="outlined"
          size="small"
          prepend-icon="mdi-github"
          href="https://github.com/eduair94/cambio-uruguay/issues/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir un issue
        </VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'
import {
  REQUESTED_FEATURES,
  REQUEST_CHANNELS,
  featuresByChannel,
  shippedLabel,
  turnaroundLabel,
  type RequestChannel,
} from '~/utils/requestedFeatures'

const localePath = useLocalePath()

const countFor = (channel: string) => featuresByChannel(channel as RequestChannel).length

const YES = [
  'Un dato que ya publica una fuente pública y acá no está: una moneda, un país, un indicador.',
  'Un campo o un filtro nuevo en la API, si se puede calcular con lo que ya se guarda.',
  'Un formato distinto de algo que ya existe, para poder integrarlo.',
  'Una página que conteste una pregunta concreta que hoy no tiene respuesta clara en ningún lado.',
  'Un error: un precio raro, una casa que falta, una cuenta que no cierra.',
]

const NO = [
  'Datos personales de nadie, ni de clientes de casas de cambio ni de quien escribe.',
  'Cifras que ninguna fuente publica. Si no está escrito en ningún lado, se dice que no está.',
  'Recomendaciones de inversión, o "decime cuándo comprar dólares".',
  'Sacar o maquillar el precio de una casa porque no le gusta cómo quedó en la comparación.',
  'Acceso privilegiado o exclusivo a los datos: la API es pública para todos o para nadie.',
]

const FAQ: FaqItem[] = [
  {
    id: 'pedido-como',
    question: '¿Cómo pido algo?',
    answer:
      'Por la página de contacto o abriendo un issue en el repositorio de GitHub. El issue es público y no expone tu correo; si escribís por mail, tu dirección no se publica en ningún lado. Cuanto más concreto el pedido —qué dato, para qué, en qué formato— más rápido se puede evaluar.',
  },
  {
    id: 'pedido-cuanto-tarda',
    question: '¿Cuánto tarda?',
    answer:
      'No hay plazo comprometido: el sitio lo mantiene una persona. En los casos de esta lista, dos salieron el mismo día o al día siguiente porque los datos ya estaban del lado de acá y sólo faltaba exponerlos; un reporte de scraping tardó bastante más. Si algo requiere una fuente nueva, el tiempo lo define esa fuente, no las ganas.',
  },
  {
    id: 'pedido-cuesta',
    question: '¿Cuesta algo? ¿Hay que registrarse?',
    answer:
      'No. Todo lo que sale de un pedido queda público y gratis para cualquiera, sin clave ni registro. No existe una versión "premium" ni un acceso reservado a quien pidió: si se construye, se construye para todos.',
  },
  {
    id: 'pedido-academico',
    question: 'Estoy haciendo un trabajo académico, ¿puedo usar los datos?',
    answer:
      'Sí, y varios de los casos de esta lista salieron justamente de proyectos académicos. Lo único que pedimos es que cites la fuente primaria de cada dato: la API devuelve la URL original de cada cotización precisamente para eso. Si necesitás un volumen alto o una descarga masiva, escribí antes: es más fácil pasarte los datos de otra forma que aguantar el tráfico.',
  },
  {
    id: 'pedido-por-que-publicar',
    question: '¿Por qué publicar esta lista?',
    answer:
      'Por dos razones. La primera es que muestra que pedir sirve, que es lo que hace que alguien se tome el trabajo de escribir. La segunda es que cada caso deja algo aprendido —una trampa de los datos, un supuesto que era falso— y eso es más útil compartido que guardado en un commit.',
  },
]

const title = 'Hecho a pedido: lo que se construyó porque alguien lo pidió'
const description =
  'Endpoints, páginas y arreglos de este sitio que existen porque alguien los pidió por correo, por un issue o preguntando en público. Qué se pidió, qué se hizo y qué se aprendió — sin publicar quién.'
const canonicalUrl = 'https://cambio-uruguay.com/hecho-a-pedido'

defineOgImageComponent('Cambio', {
  title: 'Hecho a pedido',
  subtitle: 'Lo que existe porque alguien lo pidió',
  tag: 'PEDIDOS',
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

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: title,
        description,
        url: canonicalUrl,
        inLanguage: 'es-UY',
        numberOfItems: REQUESTED_FEATURES.length,
        itemListElement: REQUESTED_FEATURES.map((feature, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: feature.title,
          description: feature.built,
          url: feature.links[0]?.to
            ? `https://cambio-uruguay.com${feature.links[0].to}`
            : feature.links[0]?.href,
        })),
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  position: relative;
  isolation: isolate;
  border-radius: 16px;
  padding: 28px 24px;
  background:
    radial-gradient(circle at 78% 18%, rgba(255, 190, 92, 0.22), transparent 36%),
    linear-gradient(135deg, #1b1730 0%, #2b2350 55%, #17324f 100%);
  color: #f7f4ff;
}
.hero-lead {
  max-width: 74ch;
  margin-top: 0;
  color: rgba(247, 244, 255, 0.88);
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  margin-top: 0;
  margin-bottom: 12px;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  color: #ffd9a0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.section-heading {
  margin-top: 0;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
}
.section-lead {
  margin-top: 0;
  max-width: 80ch;
}
.entry-title {
  margin-top: 0;
}
.entry-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}
@media (min-width: 960px) {
  .entry-grid {
    grid-template-columns: 1fr 1fr;
  }
}
.entry-block p {
  max-width: 62ch;
}
.block-label {
  margin-top: 0;
  opacity: 0.72;
  letter-spacing: 0.08em;
}
.alert-title {
  margin-top: 0;
}
.tight-list {
  margin-top: 0;
  padding-left: 1.15rem;
}
.tight-list li + li {
  margin-top: 8px;
}
</style>
