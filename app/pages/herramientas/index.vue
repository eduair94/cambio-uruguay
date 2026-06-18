<template>
  <div class="tools-hub">
    <VContainer>
      <!-- Header -->
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-tools</VIcon>
          HERRAMIENTAS
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
          Herramientas y calculadoras financieras para Uruguay
        </h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto tools-intro">
          Calculadoras gratuitas para el día a día en Uruguay: impuestos de importación, IVA, IRPF,
          conversor de monedas en vivo, plazo fijo, préstamos, inflación y más. Todas pensadas para
          el mercado uruguayo y actualizadas con datos reales.
        </p>
      </header>

      <!-- Grouped by category -->
      <section v-for="group in groups" :key="group.category" class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4 d-flex align-center">
          <VIcon start color="primary">mdi-folder-outline</VIcon>
          {{ group.label }}
        </h2>
        <VRow>
          <VCol v-for="tool in group.items" :key="tool.slug" cols="12" sm="6" md="4">
            <VCard
              class="tool-card h-100 d-flex flex-column"
              :to="localePath(`/herramientas/${tool.slug}`)"
              elevation="3"
              hover
            >
              <div class="pa-5 d-flex flex-column flex-grow-1">
                <VAvatar size="44" color="primary" variant="tonal" class="mb-3">
                  <VIcon size="24">{{ tool.icon }}</VIcon>
                </VAvatar>
                <h3 class="text-subtitle-1 font-weight-bold mb-2 tool-title">{{ tool.title }}</h3>
                <p class="text-body-2 text-grey-lighten-1 mb-3 tool-desc">{{ tool.description }}</p>
                <div class="mt-auto">
                  <span class="text-caption text-primary font-weight-medium">
                    Abrir herramienta <VIcon size="14">mdi-arrow-right</VIcon>
                  </span>
                </div>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <!-- CTA -->
      <VCard class="cta-tools my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Vas a comprar o vender dólares?</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">
          Compará la cotización en más de 40 casas de cambio antes de operar.
        </p>
        <VBtn :to="localePath('/')" color="primary" variant="elevated">
          <VIcon start>mdi-chart-line</VIcon>
          Ver cotizaciones del dólar
        </VBtn>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { toolsByCategory, tools } from '~/utils/tools'

const localePath = useLocalePath()
const groups = toolsByCategory()

const canonicalUrl = 'https://cambio-uruguay.com/herramientas'

defineOgImageComponent('Cambio', {
  title: 'Herramientas y calculadoras financieras',
  subtitle: 'Impuestos, conversor, plazo fijo, IVA, IRPF y más',
  tag: 'HERRAMIENTAS',
})

useSeoMeta({
  title: 'Herramientas y calculadoras financieras para Uruguay | Cambio Uruguay',
  description:
    'Calculadoras gratuitas para Uruguay: impuestos de importación, IVA 22%, IRPF, conversor de monedas en vivo, plazo fijo, préstamos, inflación y unidad indexada.',
  ogTitle: 'Herramientas y calculadoras financieras para Uruguay',
  ogDescription:
    'Calculadoras gratuitas para Uruguay: impuestos de importación, IVA, IRPF, conversor de monedas, plazo fijo y más.',
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
        '@type': 'ItemList',
        name: 'Herramientas de Cambio Uruguay',
        itemListElement: tools.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://cambio-uruguay.com/herramientas/${t.slug}`,
          name: t.title,
        })),
      }),
    },
  ],
})
</script>

<style scoped>
.tools-intro {
  max-width: 760px;
  line-height: 1.7;
}

.tool-card {
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.tool-card:hover {
  transform: translateY(-3px);
}

.tool-title {
  line-height: 1.4;
}

.tool-desc {
  line-height: 1.6;
}

.cta-tools {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
