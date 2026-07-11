<template>
  <div class="pfaq-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Salud financiera
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-pfaq pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-comment-question-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Preguntas frecuentes de economía personal en Uruguay
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 pfaq-intro">
              Las dudas que más se repiten sobre plata en Uruguay —vivir solo, alquilar, ahorrar,
              invertir, salir de deudas, sueldos e impuestos— con respuestas prácticas, honestas y
              al grano. {{ PERSONAL_FAQS.length }} preguntas y contando.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons text="Preguntas frecuentes de economía personal en Uruguay" />
        </div>
      </div>
    </VCard>

    <!-- Search -->
    <VTextField
      v-model="q"
      density="comfortable"
      variant="outlined"
      hide-details
      clearable
      class="mb-6"
      placeholder="Buscar una duda (alquiler, dólares, deudas, monotributo...)"
      prepend-inner-icon="mdi-magnify"
    />

    <!-- Results -->
    <template v-if="groups.length">
      <section v-for="group in groups" :key="group.category" class="mb-6">
        <h2 class="text-h6 font-weight-bold mb-3 pfaq-group-title">
          <VIcon start size="small" color="primary">{{ group.icon }}</VIcon>
          {{ group.label }}
          <span class="text-caption text-grey-lighten-1 font-weight-regular ml-1">
            ({{ group.items.length }})
          </span>
        </h2>
        <VExpansionPanels multiple class="pfaq-panels">
          <VExpansionPanel v-for="f in group.items" :key="f.id" eager>
            <VExpansionPanelTitle>
              <div>
                <div class="d-flex align-center ga-2 flex-wrap">
                  <span class="font-weight-bold pfaq-q">{{ f.question }}</span>
                  <VChip
                    v-if="f.howCommon === 'muy_comun'"
                    size="x-small"
                    color="primary"
                    variant="tonal"
                  >
                    Muy frecuente
                  </VChip>
                </div>
                <p class="text-body-2 text-grey-lighten-1 mb-0 mt-1 pfaq-short">
                  {{ f.shortAnswer }}
                </p>
              </div>
            </VExpansionPanelTitle>
            <VExpansionPanelText>
              <p class="pfaq-answer mb-0">{{ f.answer }}</p>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </section>
    </template>

    <VAlert v-else type="info" variant="tonal" class="my-8">
      No encontramos preguntas que coincidan. Probá con otra palabra.
    </VAlert>

    <!-- Disclaimer -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-information-outline"
    >
      Respuestas <strong>informativas y generales</strong>, no asesoramiento financiero. Las cifras,
      tasas y trámites cambian; verificá la información vigente para tu caso puntual.
    </VAlert>

    <!-- Cross-links -->
    <VRow class="my-6">
      <VCol cols="12" md="6">
        <VCard
          :to="localePath('/herramientas/costo-de-vida')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-home-search-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">¿Cuánto necesito para vivir?</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Calculadora de costo de vida: solo, en pareja o compartiendo, con veredicto honesto.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Diagnóstico de tus finanzas + ideas de ingresos extra.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import { PERSONAL_FAQS, faqsByCategory, faqHaystack } from '~/utils/personalFinanceFaq'

const localePath = useLocalePath()

const q = ref('')
const normQuery = computed(() =>
  (q.value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
)
const filtered = computed(() =>
  normQuery.value
    ? PERSONAL_FAQS.filter(f => faqHaystack(f).includes(normQuery.value))
    : PERSONAL_FAQS
)
const groups = computed(() => faqsByCategory(filtered.value))

const canonicalUrl = 'https://cambio-uruguay.com/preguntas-economia-personal'
const title = 'Preguntas frecuentes de economía personal en Uruguay (2026)'
const description =
  'Las dudas que más se repiten sobre finanzas personales en Uruguay: cuánto sueldo para vivir solo, garantías de alquiler, ahorrar en pesos o dólares, en qué invertir con poca plata, salir de deudas, monotributo y más. Respuestas prácticas y honestas.'

defineOgImageComponent('Cambio', {
  title: 'Economía personal: preguntas frecuentes',
  subtitle: 'Vivir solo, alquilar, ahorrar, invertir y más en Uruguay',
  tag: 'FAQ',
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
  meta: [
    {
      name: 'keywords',
      content:
        'economia personal uruguay, finanzas personales uruguay, cuanto sueldo para vivir solo, garantia alquiler uruguay, ahorrar en dolares uruguay, invertir poca plata, salir de deudas, monotributo, preguntas frecuentes dinero',
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
                name: 'Preguntas de economía personal',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: PERSONAL_FAQS.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.pfaq-page {
  max-width: 896px;
  margin-inline: auto;
}
.pfaq-q {
  line-height: 1.35;
}
.pfaq-answer {
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.85);
}
</style>
