<template>
  <div class="glossary-hub">
    <VContainer>
      <header class="text-center pt-2 pb-6 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-book-alphabet</VIcon>
          GLOSARIO
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
          Glosario financiero y cambiario de Uruguay
        </h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto glossary-intro">
          Definiciones claras de los términos del dólar, el cambio de divisas, los impuestos y la
          economía uruguaya. Desde spread y cotización hasta IVA, IRPF, UI y BCU, en lenguaje simple
          y con ejemplos locales.
        </p>
      </header>

      <section v-for="group in groups" :key="group.category" class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4 d-flex align-center">
          <VIcon start color="primary">mdi-tag-outline</VIcon>
          {{ group.label }}
        </h2>
        <VRow>
          <VCol v-for="term in group.items" :key="term.slug" cols="12" sm="6" md="4">
            <VCard
              class="term-card h-100 d-flex flex-column"
              :to="localePath(`/glosario/${term.slug}`)"
              elevation="2"
              hover
            >
              <div class="pa-4 d-flex flex-column flex-grow-1">
                <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ term.term }}</h3>
                <p class="text-body-2 text-grey-lighten-1 mb-0 term-desc">{{ term.short }}</p>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <VCard class="cta-glossary my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">Pasá de la teoría a la práctica</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">
          Compará la cotización del dólar o usá nuestras calculadoras financieras.
        </p>
        <div class="d-flex justify-center flex-wrap ga-2">
          <VBtn :to="localePath('/')" color="primary" variant="elevated">
            <VIcon start>mdi-chart-line</VIcon>
            Ver cotizaciones
          </VBtn>
          <VBtn :to="localePath('/herramientas')" color="secondary" variant="tonal">
            <VIcon start>mdi-tools</VIcon>
            Herramientas
          </VBtn>
        </div>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { glossary, glossaryByCategory } from '~/utils/glossary'

const localePath = useLocalePath()
const groups = glossaryByCategory()

const canonicalUrl = 'https://cambio-uruguay.com/glosario'

defineOgImageComponent('Cambio', {
  title: 'Glosario financiero y cambiario',
  subtitle: 'Términos del dólar, divisas e impuestos en Uruguay',
  tag: 'GLOSARIO',
})

useSeoMeta({
  title: 'Glosario financiero y cambiario de Uruguay | Cambio Uruguay',
  description:
    'Diccionario de términos del dólar, el cambio de divisas y los impuestos en Uruguay: spread, cotización, billete, cable, IVA, IRPF, UI, BCU y más, explicados en simple.',
  ogTitle: 'Glosario financiero y cambiario de Uruguay',
  ogDescription:
    'Definiciones claras de los términos del dólar, las divisas y los impuestos en Uruguay, con ejemplos locales.',
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DefinedTermSet',
        name: 'Glosario financiero de Cambio Uruguay',
        url: canonicalUrl,
        hasDefinedTerm: glossary.map(t => ({
          '@type': 'DefinedTerm',
          name: t.term,
          url: `https://cambio-uruguay.com/glosario/${t.slug}`,
        })),
      }),
    },
  ],
})
</script>

<style scoped>
.glossary-intro {
  max-width: 760px;
  line-height: 1.7;
}
.term-card {
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.term-card:hover {
  transform: translateY(-3px);
}
.term-desc {
  line-height: 1.55;
}
.cta-glossary {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
