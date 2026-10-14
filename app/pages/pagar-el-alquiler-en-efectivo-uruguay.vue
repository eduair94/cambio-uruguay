<template>
  <VContainer class="rent-cash-page">
    <nav aria-label="Ruta de navegación" class="text-caption mb-4">
      <NuxtLink :to="localePath('/')" class="text-decoration-none">Cambio Uruguay</NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <NuxtLink :to="localePath('/temas/alquiler-y-vivienda-uruguay')" class="text-decoration-none">
        Alquilar en Uruguay
      </NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <span class="text-grey">Pagar el alquiler en efectivo</span>
    </nav>

    <header class="mb-8">
      <VChip class="mb-4" color="primary" size="small" variant="tonal">
        <VIcon start size="small">mdi-cash-sync</VIcon>
        ALQUILER Y MEDIOS DE PAGO
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Pagar el alquiler en efectivo en Uruguay
      </h1>
      <p class="text-body-1 rent-cash-block mb-4">
        <strong>No es obligatorio pagar el alquiler por transferencia.</strong> Lo fue entre el 1 de
        diciembre de 2015 y 2020: la Ley de Inclusión Financiera mandaba acreditar en una cuenta del
        arrendador todo alquiler de más de {{ RENT_BANK_RULE_THRESHOLD_BPC }} BPC al año, con multa
        de {{ RENT_BANK_RULE_FINE_MONTHS }} alquileres para quien cobrara de otra forma. La LUC
        derogó ese artículo por número y nada lo reemplazó.
      </p>
      <p class="text-body-1 rent-cash-block mb-4">
        Lo que no desapareció es el <strong>tope general de efectivo</strong>, el reglamento del
        IRPF que todavía nombra al decreto derogado, y la exigencia —esa sí de la ley— de estar al
        día con el impuesto para hacer valer el contrato en juicio. Las tres cosas están abajo, cada
        una con su artículo.
      </p>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Todo sale del texto de las normas en impo.com.uy, cotejado artículo por artículo el
        {{ verifiedAt }}. Esta página explica qué dicen; no es asesoramiento legal.
      </p>
    </header>

    <!-- La línea de tiempo primero: sin las tres fechas, la conclusión de arriba parece una
         opinión. Con ellas es la lectura de tres textos. -->
    <section class="mb-10" aria-labelledby="linea-de-tiempo">
      <h2 id="linea-de-tiempo" class="text-h5 font-weight-bold mb-4">
        Las tres fechas que explican el enredo
      </h2>
      <VTimeline side="end" density="compact" truncate-line="both">
        <VTimelineItem
          v-for="event in RENT_PAYMENT_TIMELINE"
          :key="event.on"
          dot-color="primary"
          size="x-small"
        >
          <p class="text-subtitle-2 font-weight-bold mb-1">{{ asLongDate(event.on) }}</p>
          <p class="text-body-2 rent-cash-detail mb-1">{{ event.label }}</p>
          <p class="text-caption text-medium-emphasis rent-cash-detail mb-0">
            <a :href="event.url" rel="noopener noreferrer" target="_blank">{{ event.law }}</a>
          </p>
        </VTimelineItem>
      </VTimeline>
    </section>

    <section class="mb-10" aria-labelledby="que-rige">
      <h2 id="que-rige" class="text-h5 font-weight-bold mb-2">
        Qué rige hoy, artículo por artículo
      </h2>
      <p class="text-body-2 text-medium-emphasis rent-cash-block mb-5">
        La etiqueta de cada bloque dice de qué tipo es la afirmación. «{{
          RENT_PAYMENT_STATUS_LABEL['sin-base-legal']
        }}» no es un sinónimo de derogada: el decreto sigue publicado sin nota de derogación, y
        decir que no existe sería tan falso como decir que obliga.
      </p>
      <VCard v-for="rule in RENT_PAYMENT_RULES" :key="rule.id" class="mb-4 pa-5" variant="outlined">
        <div class="d-flex flex-wrap align-center mb-2" style="gap: 0.5rem">
          <VChip :color="statusColor(rule.status)" size="small" variant="tonal">
            {{ RENT_PAYMENT_STATUS_LABEL[rule.status] }}
          </VChip>
          <span class="text-caption text-medium-emphasis">{{ rule.law }}</span>
        </div>
        <h3 class="text-subtitle-1 font-weight-bold rent-cash-detail mb-2">{{ rule.heading }}</h3>
        <p class="text-body-2 rent-cash-detail mb-3">{{ rule.body }}</p>
        <blockquote v-if="rule.quote" class="rent-cash-quote text-body-2 mb-3">
          «{{ rule.quote }}»
        </blockquote>
        <p class="text-caption rent-cash-detail mb-0">
          <a :href="rule.url" rel="noopener noreferrer" target="_blank">
            Leer {{ rule.law }} en IMPO
          </a>
        </p>
      </VCard>
    </section>

    <section class="mb-10" aria-labelledby="por-que-rastro">
      <h2 id="por-que-rastro" class="text-h5 font-weight-bold mb-2">
        Por qué conviene que el pago deje rastro igual
      </h2>
      <p class="text-body-2 text-medium-emphasis rent-cash-block mb-5">
        Que nada lo obligue no quiere decir que no convenga. Las tres razones de abajo no son
        consejos sueltos: cada una sale de un artículo, y dos de ellas de la parte del régimen que
        quedó sin ley.
      </p>
      <VRow>
        <VCol v-for="reason in RENT_PAYMENT_WHY_TRACEABLE" :key="reason.id" cols="12" md="4">
          <VCard class="h-100 pa-5" variant="tonal" color="primary">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ reason.heading }}</h3>
            <p class="text-body-2 rent-cash-detail mb-3">{{ reason.body }}</p>
            <p class="text-caption rent-cash-detail mb-0">
              <a :href="reason.url" rel="noopener noreferrer" target="_blank">{{ reason.law }}</a>
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="mb-10" aria-labelledby="sin-respuesta">
      <h2 id="sin-respuesta" class="text-h5 font-weight-bold mb-2">Lo que no podemos afirmar</h2>
      <p class="text-body-2 text-medium-emphasis rent-cash-block mb-5">
        Dos preguntas que el texto de las normas no contesta. Van publicadas porque una página que
        se calla lo que no sabe hace creer que lo sabe todo.
      </p>
      <VCard
        v-for="open in RENT_PAYMENT_UNRESOLVED"
        :key="open.id"
        class="mb-4 pa-5"
        variant="outlined"
        color="info"
      >
        <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ open.heading }}</h3>
        <p class="text-body-2 rent-cash-detail mb-3">{{ open.body }}</p>
        <p class="text-caption rent-cash-detail mb-0">
          <a :href="open.url" rel="noopener noreferrer" target="_blank">{{ open.law }}</a>
        </p>
      </VCard>
    </section>

    <section class="mb-10" aria-labelledby="preguntas">
      <h2 id="preguntas" class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="faq in RENT_PAYMENT_FAQ" :key="faq.question">
          <VExpansionPanelTitle class="text-subtitle-2 font-weight-bold">
            {{ faq.question }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 mb-0">{{ faq.answer }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <section class="mb-10" aria-labelledby="seguir">
      <h2 id="seguir" class="text-h5 font-weight-bold mb-4">Seguir por acá</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <VCard :to="localePath(link.to)" class="h-100 pa-4" variant="outlined">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.label }}</p>
            <p class="text-body-2 text-medium-emphasis rent-cash-detail mb-0">
              {{ link.description }}
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section aria-labelledby="fuentes">
      <h2 id="fuentes" class="text-h5 font-weight-bold mb-4">Fuentes</h2>
      <ul class="rent-cash-sources text-body-2">
        <li v-for="source in RENT_PAYMENT_SOURCES" :key="source.url">
          <a :href="source.url" rel="noopener noreferrer" target="_blank">{{ source.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis rent-cash-block mb-0">
        Cotejado el {{ verifiedAt }}. Los dos topes están en unidades que se mueven —BPC al año y UI
        por operación—, así que acá no publicamos su equivalente en pesos: el valor del día vive en
        <NuxtLink :to="localePath('/indicadores')">nuestros indicadores</NuxtLink>.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  RENT_BANK_RULE_FINE_MONTHS,
  RENT_BANK_RULE_THRESHOLD_BPC,
  RENT_PAYMENT_FAQ,
  RENT_PAYMENT_RULES,
  RENT_PAYMENT_SOURCES,
  RENT_PAYMENT_STATUS_LABEL,
  RENT_PAYMENT_TIMELINE,
  RENT_PAYMENT_UNRESOLVED,
  RENT_PAYMENT_VERIFIED_ON,
  RENT_PAYMENT_WHY_TRACEABLE,
  type RentPaymentStatus,
} from '~/utils/rentPaymentMeans'

const localePath = useLocalePath()

const asLongDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = asLongDate(RENT_PAYMENT_VERIFIED_ON)

// El color dice de un vistazo si lo que se lee obliga hoy, obligó, o quedó sin la ley que lo
// sostenía, que es el ángulo de la página.
const statusColor = (status: RentPaymentStatus) =>
  status === 'vigente'
    ? 'success'
    : status === 'derogada'
      ? 'blue-grey'
      : status === 'sin-base-legal'
        ? 'warning'
        : 'info'

const relatedLinks = [
  {
    to: '/limite-de-efectivo-uruguay',
    label: 'Límite de efectivo',
    description: 'El tope general que sí sigue vigente, con su artículo.',
  },
  {
    to: '/credito-fiscal-por-alquiler-uruguay',
    label: 'Crédito fiscal por alquiler',
    description: 'El 8 % del alquiler que el inquilino imputa al IRPF.',
  },
  {
    to: '/primer-alquiler-uruguay',
    label: 'Tu primer alquiler',
    description: 'Qué pagás al entrar, entre garantía, depósito y trámites.',
  },
  {
    to: '/garantia-de-alquiler-uruguay',
    label: 'Garantías de alquiler',
    description: 'Qué pide cada una y cuánto sale, con los topes en UR.',
  },
  {
    to: '/desalojo-de-alquiler-uruguay',
    label: 'Desalojo de un alquiler',
    description: 'Los dos regímenes y sus plazos, incluido el de la LUC.',
  },
  {
    to: '/alquileres-uruguay',
    label: 'Alquileres en Uruguay',
    description: 'Avisos vigentes con precio y gastos comunes.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/pagar-el-alquiler-en-efectivo-uruguay'
const title = 'Pagar el alquiler en efectivo: se puede'
// Literal a propósito, para que la mida el trinquete de los 155 caracteres de
// `seoDescriptionBudget.test.ts`. Las cifras que nombra las fija `rentPaymentMeans.test.ts`.
const description =
  'La obligación de cobrarlo por banco la derogó la LUC en 2020 (Ley 19.889, art. 224): queda sólo el tope general de 200.000 UI en efectivo.'

defineOgImageComponent('Cambio', {
  title: 'Pagar el alquiler en efectivo',
  subtitle: 'La obligación de cobrarlo por banco se derogó en 2020',
  tag: 'ALQUILER',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
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
        'pagar el alquiler en efectivo uruguay, es obligatorio pagar el alquiler por transferencia, alquiler en efectivo, ley 19210 articulo 39, decreto 264/015, ley 19889 articulo 224, multa por cobrar el alquiler en efectivo, como probar el pago del alquiler, recibo de alquiler uruguay, 40 bpc alquiler',
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
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Alquilar en Uruguay',
                item: 'https://cambio-uruguay.com/temas/alquiler-y-vivienda-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Pagar el alquiler en efectivo',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: RENT_PAYMENT_FAQ.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: RENT_PAYMENT_SOURCES.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.rent-cash-block {
  max-width: 68ch;
}

.rent-cash-detail {
  margin-top: 0.25rem;
}

.rent-cash-quote {
  border-left: 3px solid rgb(var(--v-theme-primary));
  margin-top: 0.25rem;
  padding-left: 0.85rem;
  font-style: italic;
}

.rent-cash-sources {
  padding-left: 1.25rem;
}

.rent-cash-sources li {
  margin-top: 0.35rem;
}
</style>
