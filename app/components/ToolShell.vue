<template>
  <div v-if="tool" class="tool-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/herramientas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Herramientas
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-tool pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">{{ tool.icon }}</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">{{ tool.title }}</h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 tool-intro">{{ tool.description }}</p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons :text="tool.title" />
        </div>
      </div>
    </VCard>

    <!-- Calculator -->
    <VRow>
      <VCol cols="12" :md="hasContent ? 7 : 12" :lg="hasContent ? 8 : 12">
        <slot />
      </VCol>

      <!-- Explanatory content / how-it-works -->
      <VCol v-if="hasContent" cols="12" md="5" lg="4">
        <VCard variant="flat" class="tool-aside pa-5 h-100">
          <slot name="content" />
        </VCard>
      </VCol>
    </VRow>

    <!-- Disclaimer -->
    <VAlert
      v-if="!hideDisclaimer"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-information-outline"
    >
      <slot name="disclaimer">
        Los resultados son estimaciones de referencia con fines informativos y educativos. No
        constituyen asesoramiento financiero ni fiscal. Verificá siempre los valores y condiciones
        vigentes con la fuente oficial (DGI, Aduanas, BCU) o tu profesional de confianza antes de
        operar.
      </slot>
    </VAlert>

    <!-- Sources / fuentes -->
    <VCard v-if="sources && sources.length" variant="flat" class="tool-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes y referencias
      </h2>
      <ul class="sources-list">
        <li v-for="(src, i) in sources" :key="i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- FAQ -->
    <VCard v-if="faq && faq.length" variant="flat" class="tool-section mt-6 pa-5">
      <h2 class="text-h6 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="(item, i) in faq" :key="i" :title="item.q">
          <template #text>
            <p class="text-body-2 text-grey-lighten-1" style="line-height: 1.7">{{ item.a }}</p>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>

    <!-- Related tools -->
    <VCard variant="flat" class="tool-section mt-6 pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Más herramientas</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="other in relatedTools"
          :key="other.slug"
          :to="localePath(`/herramientas/${other.slug}`)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">{{ other.icon }}</VIcon>
          {{ other.title }}
        </VChip>
      </div>
    </VCard>

    <!-- CTA -->
    <VCard class="cta-tool mt-6 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">Compará la cotización del dólar hoy</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Mirá el precio de compra y venta en más de 40 casas de cambio de Uruguay, actualizado en
        tiempo real.
      </p>
      <div class="d-flex justify-center flex-wrap ga-2">
        <VBtn :to="localePath('/')" color="primary" variant="elevated">
          <VIcon start>mdi-chart-line</VIcon>
          Ver cotizaciones
        </VBtn>
        <VBtn :to="localePath('/glosario')" color="secondary" variant="tonal">
          <VIcon start>mdi-book-alphabet</VIcon>
          Glosario financiero
        </VBtn>
      </div>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { getTool, tools } from '~/utils/tools'

const props = defineProps<{
  /** Tool slug; everything (title, description, SEO) is derived from the catalogue. */
  slug: string
  /** Optional FAQ rendered as an accordion and emitted as FAQPage JSON-LD. */
  faq?: Array<{ q: string; a: string }>
  /** Hide the default estimator disclaimer (e.g. for non-tax tools). */
  hideDisclaimer?: boolean
  /** Optional list of official sources rendered in a "Fuentes" block. */
  sources?: Array<{ label: string; url: string }>
}>()

const localePath = useLocalePath()
const slots = useSlots()

const tool = computed(() => getTool(props.slug))
const hasContent = computed(() => Boolean(slots.content))

// Related tools: same category first, then fill up to 6 with others.
const relatedTools = computed(() => {
  const current = tool.value
  if (!current) return []
  const sameCat = tools.filter(t => t.category === current.category && t.slug !== current.slug)
  const others = tools.filter(t => t.category !== current.category)
  return [...sameCat, ...others].slice(0, 6)
})

const canonicalUrl = computed(() => `https://cambio-uruguay.com/herramientas/${props.slug}`)

// Branded OG image.
defineOgImageComponent('Cambio', {
  title: () => tool.value?.title ?? 'Herramienta',
  subtitle: () => tool.value?.description ?? '',
  tag: 'HERRAMIENTA',
})

useSeoMeta({
  title: () => `${tool.value?.title ?? 'Herramienta'} | Cambio Uruguay`,
  description: () => tool.value?.description ?? '',
  ogTitle: () => tool.value?.title ?? 'Herramienta',
  ogDescription: () => tool.value?.description ?? '',
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => tool.value?.title ?? 'Herramienta',
  twitterDescription: () => tool.value?.description ?? '',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: tool.value?.keywords?.length
    ? [{ name: 'keywords', content: tool.value.keywords.join(', ') }]
    : [],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'SoftwareApplication',
            name: tool.value?.title,
            description: tool.value?.description,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            url: canonicalUrl.value,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'UYU' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
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
                name: 'Herramientas',
                item: 'https://cambio-uruguay.com/herramientas',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: tool.value?.title,
                item: canonicalUrl.value,
              },
            ],
          },
          ...(props.faq && props.faq.length
            ? [
                {
                  '@type': 'FAQPage',
                  mainEntity: props.faq.map(item => ({
                    '@type': 'Question',
                    name: item.q,
                    acceptedAnswer: { '@type': 'Answer', text: item.a },
                  })),
                },
              ]
            : []),
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bg-gradient-tool {
  background: linear-gradient(135deg, #2f81f7 0%, #16c784 100%);
}

.tool-intro {
  max-width: 760px;
  line-height: 1.6;
}

.tool-aside,
.tool-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.tool-aside :deep(h2) {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.tool-aside :deep(p) {
  line-height: 1.7;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.92rem;
}

.tool-aside :deep(a) {
  color: #64b5f6;
  font-weight: 600;
  text-decoration: none;
}

.tool-aside :deep(a:hover) {
  text-decoration: underline;
}

.sources-list {
  margin: 0;
  padding-left: 1.1rem;
}

.sources-list li {
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
}

.sources-list a {
  color: #64b5f6;
  text-decoration: none;
}

.sources-list a:hover {
  text-decoration: underline;
}

.cta-tool {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
