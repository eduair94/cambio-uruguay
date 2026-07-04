<template>
  <div v-if="term" class="term-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <!-- Breadcrumb -->
          <div class="mb-4">
            <VBtn :to="localePath('/glosario')" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Glosario
            </VBtn>
          </div>

          <!-- Header -->
          <header class="mb-5">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              {{ categoryLabel }}
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ term.term }}</h1>
            <p class="text-body-1 text-grey-lighten-1 term-lead">{{ term.short }}</p>
          </header>

          <VDivider class="mb-5" />

          <!-- Definition -->
          <article class="term-article">
            <h2 class="text-h6 font-weight-bold mb-3">Definición</h2>
            <p class="text-body-1 text-grey-lighten-1 term-prose">{{ term.body }}</p>

            <VCard v-if="term.example" variant="flat" class="example-box pa-4 my-5">
              <div class="text-overline text-primary mb-1">Ejemplo</div>
              <p class="text-body-2 mb-0">{{ term.example }}</p>
            </VCard>
          </article>

          <!-- Related terms -->
          <VCard v-if="related.length" variant="flat" class="related-box pa-5 mt-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Términos relacionados</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-for="rel in related"
                :key="rel.slug"
                :to="localePath(`/glosario/${rel.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                {{ rel.term }}
              </VChip>
            </div>
          </VCard>

          <!-- CTA -->
          <VCard class="cta-term my-8 pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">Aplicá lo que aprendiste</h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              Compará la cotización del dólar en más de 40 casas de cambio o usá nuestras
              calculadoras.
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
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getTerm, glossarySlugs, relatedTerms, GLOSSARY_CATEGORIES } from '~/utils/glossary'

definePageMeta({
  validate: route => glossarySlugs().includes(String(route.params.termino ?? '')),
})

const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.termino ?? ''))
const term = computed(() => getTerm(slug.value))

if (!term.value) {
  throw createError({ statusCode: 404, statusMessage: 'Término no encontrado' })
}

const related = computed(() => (term.value ? relatedTerms(term.value) : []))
const categoryLabel = computed(() => (term.value ? GLOSSARY_CATEGORIES[term.value.category] : ''))
const canonicalUrl = computed(() => `https://cambio-uruguay.com/glosario/${slug.value}`)

defineOgImageComponent('Cambio', {
  title: () => term.value?.term ?? 'Glosario',
  subtitle: () => term.value?.short ?? '',
  tag: 'GLOSARIO',
})

useSeoMeta({
  title: () => `${term.value?.term ?? 'Glosario'}: qué es y definición | Cambio Uruguay`,
  description: () => term.value?.short ?? '',
  ogTitle: () => `${term.value?.term}: qué es y definición`,
  ogDescription: () => term.value?.short ?? '',
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => term.value?.term ?? 'Glosario',
  twitterDescription: () => term.value?.short ?? '',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'DefinedTerm',
              name: term.value?.term,
              description: term.value?.body,
              inDefinedTermSet: {
                '@type': 'DefinedTermSet',
                name: 'Glosario financiero de Cambio Uruguay',
                url: 'https://cambio-uruguay.com/glosario',
              },
              url: canonicalUrl.value,
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
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Glosario',
                  item: 'https://cambio-uruguay.com/glosario',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: term.value?.term,
                  item: canonicalUrl.value,
                },
              ],
            },
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.term-lead {
  line-height: 1.7;
  font-size: 1.05rem;
}
.term-prose {
  line-height: 1.8;
}
.example-box {
  background: rgba(33, 150, 243, 0.08);
  border: 1px solid rgba(33, 150, 243, 0.24);
  border-radius: 10px;
}
/* The primary "Ejemplo" overline sits on the pale-blue example card; in light
   mode #1976d2 on that tint is only 3.95:1. Darken it to clear AA. */
.v-theme--light .example-box .text-overline {
  color: #0d47a1 !important;
}
.related-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.cta-term {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
