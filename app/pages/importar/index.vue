<template>
  <div class="import-hub-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <!-- Encabezado -->
          <VCard class="overflow-hidden mb-6" elevation="8">
            <div class="bg-gradient-tool pa-6 on-dark">
              <div class="d-flex align-center ga-4 flex-wrap">
                <VAvatar size="56" class="d-none d-md-flex bg-white">
                  <VIcon size="32" color="primary">mdi-package-variant-closed</VIcon>
                </VAvatar>
                <div>
                  <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                    Importar a Uruguay según qué compres
                  </h1>
                  <p class="text-body-1 text-grey-lighten-2 mb-0 hub-lead">
                    El régimen postal es el mismo para todos, pero lo que pagás depende de la
                    mercadería: hay artículos exentos de IVA, otros con tasa mínima, otros que
                    necesitan permiso de otro organismo y otros que directamente quedan fuera.
                  </p>
                </div>
              </div>
              <div class="d-flex justify-start justify-md-end mt-3">
                <ShareButtons text="Importar a Uruguay según qué compres" />
              </div>
            </div>
          </VCard>

          <!-- Lo común a todas las categorías -->
          <VCard variant="flat" class="hub-frame pa-5 mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Lo que vale para cualquier envío</h2>
            <ul class="hub-list">
              <li>
                <strong>Franquicia anual:</strong> hasta US$ {{ FRANCHISE_ANNUAL_USD }} por año en
                un máximo de {{ FRANCHISE_MAX_SHIPMENTS }} envíos, exenta de aranceles. El IVA sigue
                corriendo según la mercadería — y ahí es donde cambia todo.
              </li>
              <li>
                <strong>Prestación única:</strong> {{ SIMPLIFIED_RATE_PCT }}% del valor con un
                mínimo de US$ {{ SIMPLIFIED_MIN_USD }} por envío, en sustitución de todo tributo. Es
                una <em>opción</em>, no un castigo automático.
              </li>
              <li>
                <strong>Los dos topes del régimen postal:</strong> US$ {{ FRANCHISE_ANNUAL_USD }} de
                factura y {{ MAX_WEIGHT_KG }} kg por envío. Pasarse de uno alcanza para caer en el
                régimen general, con DUA y despachante.
              </li>
              <li>
                <strong>Los dos regímenes son excluyentes:</strong> un envío entra por uno o por el
                otro, nunca partido entre los dos.
              </li>
            </ul>
            <div class="d-flex flex-wrap ga-2 mt-4">
              <VChip
                :to="localePath('/herramientas/calculadora-impuestos-importacion')"
                color="primary"
                variant="flat"
                size="small"
                link
              >
                <VIcon start size="small">mdi-calculator-variant-outline</VIcon>
                Calculadora de impuestos
              </VChip>
              <VChip
                :to="localePath('/franquicia-aduana-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-package-variant-closed-check</VIcon>
                Franquicia y aduana
              </VChip>
              <VChip
                :to="localePath('/declarar-compra-exterior-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-file-sign</VIcon>
                Cómo se declara
              </VChip>
            </div>
          </VCard>

          <!-- El catálogo -->
          <h2 class="text-h6 font-weight-bold mb-3">Elegí qué vas a importar</h2>
          <div class="category-grid mb-8">
            <VCard
              v-for="category in categories"
              :key="category.slug"
              :to="localePath(`/importar/${category.slug}`)"
              variant="flat"
              class="category-card pa-4"
              link
            >
              <div class="d-flex align-center ga-3 mb-2">
                <VAvatar size="36" class="category-avatar">
                  <VIcon size="20" color="primary">{{ category.icon }}</VIcon>
                </VAvatar>
                <span class="text-subtitle-2 font-weight-bold">{{ category.navLabel }}</span>
              </div>
              <p class="text-body-2 text-grey-lighten-1 category-desc mb-3">
                {{ category.description }}
              </p>
              <VChip
                size="x-small"
                variant="tonal"
                :color="TONE_COLOR[category.regimes.franquicia.tone]"
              >
                {{ category.regimes.franquicia.verdict }}
              </VChip>
            </VCard>
          </div>

          <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-information-outline">
            Las fichas son de referencia y las listas no son taxativas: la propia Aduana aclara que
            su enumeración de mercadería controlada es "de carácter no taxativo". Confirmá con la
            Dirección Nacional de Aduanas y con el organismo que corresponda antes de comprar.
          </VAlert>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { IMPORT_CATEGORIES, type RegimeOutcome } from '~/utils/importCategories'
import {
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  MAX_WEIGHT_KG,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
} from '~/utils/importRules'

const localePath = useLocalePath()

const categories = computed(() => IMPORT_CATEGORIES)

const TONE_COLOR: Record<RegimeOutcome['tone'], string> = {
  good: 'success',
  warn: 'warning',
  bad: 'error',
}

const canonicalUrl = 'https://cambio-uruguay.com/importar'
const description =
  'Qué impuestos paga cada tipo de artículo al importarlo a Uruguay: libros y material impreso exentos de IVA, medicamentos con tasa mínima, electrónica, ropa, alimentos y más, con los trámites y cómo declararlo.'

defineOgImageComponent('Cambio', {
  title: 'Importar a Uruguay según qué compres',
  subtitle: 'Impuestos, exenciones y trámites por categoría de producto',
  tag: 'IMPORTAR',
})

useSeoMeta({
  title: 'Importar a Uruguay: impuestos por categoría',
  description,
  ogTitle: 'Importar a Uruguay según qué compres',
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Importar a Uruguay por categoría de producto',
          itemListElement: IMPORT_CATEGORIES.map((category, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: category.title,
            url: `https://cambio-uruguay.com/importar/${category.slug}`,
          })),
        })
      ),
    },
  ],
})
</script>

<style scoped>
.hub-lead,
.category-desc {
  line-height: 1.7;
}

.hub-frame,
.category-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.hub-list {
  padding-left: 1.1rem;
  line-height: 1.75;
  margin: 0;
}

.hub-list li + li {
  margin-top: 8px;
}

.category-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}

@media (min-width: 600px) {
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.category-avatar {
  background: rgba(var(--v-theme-primary), 0.12);
}
</style>
