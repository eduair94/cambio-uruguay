<!--
  /accidente-de-trabajo-uruguay — qué te corresponde cuando te accidentás trabajando.

  Nació de un hilo de r/LegalUruguay: a un pistero de estación de servicio una baranda sin
  amortiguación le amputó parcialmente un dedo, le activaron el BSE el mismo día, y lo que lo trajo a
  preguntar fue que la empresa mandó a decir que "lo vieron nervioso arriba del camión".

  Toda la página cuelga de un artículo que casi nadie conoce y que contesta esa escena entera: el 9
  de la Ley 16.074. El derecho a la indemnización se mantiene aun con culpa grave del trabajador, y
  sólo se pierde si el accidente se provocó dolosamente. La versión de la empresa sobre de quién fue
  la culpa no cambia nada de lo que el BSE debe.
-->
<template>
  <VContainer class="wacc py-6">
    <VCard class="overflow-hidden mb-5" elevation="4">
      <div class="wacc__hero on-dark pa-6 pa-md-8">
        <p class="wacc__eyebrow mb-3">Trabajo · Accidentes y BSE</p>
        <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-3">
          Accidente de trabajo en Uruguay: qué te corresponde
        </h1>
        <p class="text-body-1 text-grey-lighten-2 mb-0">
          Si te accidentaste trabajando, la pregunta que la empresa suele instalar —de quién fue la
          culpa— <strong class="text-white">no decide nada</strong>. La ley mantiene tu derecho a la
          indemnización incluso mediando culpa grave tuya. Acá está lo que dice cada artículo, con
          la cita, y qué conviene hacer los primeros días.
        </p>
      </div>
    </VCard>

    <!-- El artículo que contesta la escena entera -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">La frase que hay que conocer</h2>
      <blockquote class="law-quote">
        <p class="law-quote-text">
          “…mantienen el derecho a la indemnización aún cuando el accidente se haya producido
          mediante culpa leve o grave de parte de aquéllos… pero lo pierden en el caso de haberlo
          provocado dolosamente.”
        </p>
        <footer class="law-quote-src">Ley 16.074, artículo 9</footer>
      </blockquote>
      <p class="text-body-2 mb-0">
        <strong>Dolosamente</strong> significa a propósito. Estar nervioso no es dolo. Estar
        distraído no es dolo. Haber hecho mal la maniobra tampoco: eso, como mucho, es culpa — y el
        artículo dice expresamente que con culpa, incluso grave, el derecho se mantiene. Por eso una
        conversación sobre quién tuvo la culpa no es una negociación: no hay nada ahí que puedas
        perder aceptando o ganar negando.
      </p>
    </VCard>

    <!-- Los hechos, con artículo -->
    <section class="mb-6" aria-labelledby="hechos-title">
      <h2 id="hechos-title" class="text-h6 font-weight-bold mb-3">
        Lo que dice la ley, artículo por artículo
      </h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in ACCIDENT_FACTS" :key="f.id">
          <VExpansionPanelTitle>
            <VIcon start size="small" color="primary">mdi-gavel</VIcon>
            {{ f.claim }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-caption text-medium-emphasis mb-2">{{ f.norm }}</p>
            <p v-if="f.quote" class="norm-quote mb-2">“{{ f.quote }}”</p>
            <p class="text-body-2 mb-2">{{ f.meaning }}</p>
            <a
              :href="f.source.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-caption d-inline-flex align-center ga-1"
            >
              <VIcon size="12">mdi-open-in-new</VIcon>{{ f.source.label }} —
              {{ f.source.publisher }}
            </a>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Qué hacer -->
    <section class="mb-6" aria-labelledby="pasos-title">
      <h2 id="pasos-title" class="text-h6 font-weight-bold mb-1">Qué hacer, y en qué orden</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Los primeros días definen cómo queda registrado el accidente, y eso pesa mucho más adelante
        que cualquier discusión posterior.
      </p>
      <VCard variant="outlined" class="pa-4">
        <ol class="steps">
          <li v-for="(s, i) in ACCIDENT_STEPS" :key="s.step">
            <strong>{{ i + 1 }}. {{ s.step }}.</strong> {{ s.detail }}
          </li>
        </ol>
      </VCard>
    </section>

    <!-- Mitos -->
    <section class="mb-6" aria-labelledby="mitos-title">
      <h2 id="mitos-title" class="text-h6 font-weight-bold mb-3">
        Lo que se dice y lo que dice la ley
      </h2>
      <div class="myth-grid">
        <VCard v-for="m in ACCIDENT_MYTHS" :key="m.myth" variant="outlined" class="pa-4">
          <p class="myth-claim mb-2">“{{ m.myth }}”</p>
          <p class="text-body-2 mb-1">{{ m.reality }}</p>
          <p v-if="m.norm" class="text-caption text-medium-emphasis mb-0">{{ m.norm }}</p>
        </VCard>
      </div>
    </section>

    <VCard variant="outlined" class="pa-4">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
      <ul class="related">
        <li>
          <NuxtLink :to="localePath('/denunciar-trabajo-en-negro-uruguay')">
            Trabajo en negro: dónde se denuncia y qué pasa después
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/cuanto-me-tienen-que-pagar-uruguay')">
            Cuánto te tienen que pagar
          </NuxtLink>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Verificado contra el texto de la ley el {{ fmtDate(WORK_ACCIDENT_REVIEWED) }}. Informativo,
        no es asesoramiento legal: si te queda una secuela permanente, consultá a un abogado
        laboralista.
      </p>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import {
  ACCIDENT_FACTS,
  ACCIDENT_MYTHS,
  ACCIDENT_STEPS,
  WORK_ACCIDENT_REVIEWED,
} from '~/utils/workAccident'

const localePath = useLocalePath()

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/accidente-de-trabajo-uruguay'
const title = 'Accidente de trabajo en Uruguay: el BSE'
const description =
  'La Ley 16.074 mantiene tu derecho a la indemnización aun con culpa grave tuya: sólo lo perdés si lo provocaste a propósito. Plazos de la denuncia patronal, cuánto se cobra de licencia y qué pasa si estabas en negro.'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'FAQPage',
            '@id': canonicalUrl,
            mainEntity: ACCIDENT_MYTHS.map(m => ({
              '@type': 'Question',
              name: `¿${m.myth}?`,
              acceptedAnswer: { '@type': 'Answer', text: m.reality },
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: title, item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.wacc__hero {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(var(--v-theme-primary), 0.45), transparent 55%),
    linear-gradient(135deg, #0a0e1a 0%, #121a2e 100%);
}
.wacc__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.85;
  margin: 0;
}
.law-quote {
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding: 0.75rem 0 0.75rem 1rem;
  margin: 0 0 1rem;
}
.law-quote-text {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 0.35rem;
}
.law-quote-src {
  font-size: 0.8rem;
  opacity: 0.7;
}
/* 1px, no 3: la regla "No Side Tab" de DESIGN.md prohíbe un borde de color de más de 1px en un
   costado de una tarjeta, un ítem de lista o un callout, y esto es un callout dentro de un panel.
   El .law-quote de arriba se queda en 4px porque es un <blockquote> —una cita textual de la ley— y
   ésa no es ninguna de las tres cosas que la regla nombra. */
.norm-quote {
  border-left: 1px solid rgba(var(--v-theme-primary), 0.5);
  padding-left: 0.75rem;
  font-style: italic;
  font-size: 0.875rem;
}
.steps {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.95rem;
  line-height: 1.7;
}
.steps li + li {
  margin-top: 0.75rem;
}
.myth-grid {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 700px) {
  .myth-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.myth-claim {
  font-weight: 600;
  opacity: 0.75;
  font-style: italic;
}
.related {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.875rem;
  line-height: 1.9;
}
</style>
