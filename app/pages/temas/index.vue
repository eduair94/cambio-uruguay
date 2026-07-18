<template>
  <div class="temas-page">
    <VContainer>
      <!-- Header -->
      <header class="text-center pt-2 pb-6 py-md-10">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-shape-outline</VIcon>
          TEMAS
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
          Educación financiera para Uruguay, por tema
        </h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto temas-intro">
          Reunimos nuestras guías en temas para que encuentres rápido lo que necesitás: alquiler y
          vivienda, herencias, deudas y crédito, sueldo e impuestos, ahorro e inversión, y más.
          Elegí un tema y accedé a todas las respuestas, con información práctica y fuentes
          oficiales.
        </p>
      </header>

      <!-- Hubs grid -->
      <VRow data-testid="temas-list">
        <VCol v-for="hub in guideHubs" :key="hub.slug" cols="12" sm="6" md="4">
          <VCard
            class="tema-card h-100 d-flex flex-column"
            :to="localePath(`/temas/${hub.slug}`)"
            elevation="3"
            hover
            data-testid="tema-card"
          >
            <div class="pa-5 d-flex flex-column flex-grow-1">
              <div class="d-flex align-center justify-space-between mb-3">
                <VAvatar size="40" color="primary" variant="tonal">
                  <VIcon>{{ hub.icon }}</VIcon>
                </VAvatar>
                <VChip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                  {{ hub.guideSlugs.length }} guías
                </VChip>
              </div>
              <h2 class="text-h6 font-weight-bold mb-2 tema-title">{{ hub.title }}</h2>
              <p class="text-body-2 text-grey-lighten-1 mb-4 tema-desc">{{ hub.description }}</p>
              <div class="mt-auto">
                <span class="text-caption text-link font-weight-medium">
                  Ver el tema
                  <VIcon size="14">mdi-arrow-right</VIcon>
                </span>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- CTA -->
      <VCard class="cta-temas my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Preferís ver todas las guías?</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">
          Accedé al listado completo de guías o compará las cotizaciones del dólar en el comparador.
        </p>
        <div class="d-flex justify-center flex-wrap ga-3">
          <VBtn :to="localePath('/guias')" color="primary" variant="elevated">
            <VIcon start>mdi-book-open-variant</VIcon>
            Todas las guías
          </VBtn>
          <VBtn :to="localePath('/')" variant="outlined">
            <VIcon start>mdi-chart-line</VIcon>
            Comparar dólar
          </VBtn>
        </div>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { guideHubs } from '~/utils/guideHubs'

const localePath = useLocalePath()

const canonicalUrl = 'https://cambio-uruguay.com/temas'
const metaTitle = 'Temas de educación financiera en Uruguay | Cambio Uruguay'
const metaDescription =
  'Guías de economía y finanzas para Uruguay organizadas por tema: alquiler y vivienda, herencias, deudas y crédito, sueldo e impuestos, ahorro e inversión y más.'

defineOgImageComponent('Cambio', {
  title: 'Temas de educación financiera',
  subtitle: 'Alquiler, herencias, crédito, sueldo, inversión y más',
  tag: 'TEMAS',
})

useSeoMeta({
  title: metaTitle,
  description: metaDescription,
  ogTitle: metaTitle,
  ogDescription: metaDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: metaTitle,
  twitterDescription: metaDescription,
})

// ItemList JSON-LD of the hubs for rich results.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Temas de educación financiera de Cambio Uruguay',
        itemListElement: guideHubs.map((h, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://cambio-uruguay.com/temas/${h.slug}`,
          name: h.title,
        })),
      }),
    },
  ],
})
</script>

<style scoped>
.temas-intro {
  max-width: 760px;
  line-height: 1.7;
}
.tema-card {
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.tema-card:hover {
  transform: translateY(-3px);
}
.tema-title {
  line-height: 1.4;
}
.tema-desc {
  line-height: 1.6;
}
.cta-temas {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
