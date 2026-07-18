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
      <div class="bg-gradient-tool pa-6 on-dark">
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

    <!-- Calculator + explainer. Two layouts:
         - aside (default): explainer is a right sidebar. Good when it's short
           enough to roughly match the calculator's height.
         - below: centered calculator, full-width editorial explainer beneath.
           Use for article-length explainers that would otherwise leave a tall
           column of dead space next to a short calculator. -->
    <VRow v-if="asideLayout">
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

    <template v-else>
      <!-- Calculator left; optional short tips/disclaimers as the right column. -->
      <VRow v-if="hasTips">
        <VCol cols="12" md="8">
          <slot />
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="tool-aside tool-tips pa-5">
            <slot name="tips" />
          </VCard>
        </VCol>
      </VRow>
      <div v-else class="tool-stack-calc">
        <slot />
      </div>

      <!-- Long, article-length explainer: full width beneath, two editorial columns. -->
      <VCard v-if="hasContent" variant="flat" class="tool-section tool-article mt-6 pa-5 pa-md-8">
        <slot name="content" />
      </VCard>
    </template>

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
  /**
   * Where the `#content` explainer goes:
   * - `aside` (default): narrow right sidebar next to the calculator.
   * - `below`: full-width editorial section under a centered calculator —
   *   for long, article-length explainers.
   */
  contentLayout?: 'aside' | 'below'
}>()

const localePath = useLocalePath()
const slots = useSlots()

const tool = computed(() => getTool(props.slug))
const hasContent = computed(() => Boolean(slots.content))
const hasTips = computed(() => Boolean(slots.tips))
const asideLayout = computed(() => props.contentLayout !== 'below')

// Related tools: same category first, then fill up to 6 with others.
const relatedTools = computed(() => {
  const current = tool.value
  if (!current) return []
  const sameCat = tools.filter(t => t.category === current.category && t.slug !== current.slug)
  const others = tools.filter(t => t.category !== current.category)
  return [...sameCat, ...others].slice(0, 6)
})

// Which calculators actually get used (GA4 `tool_view`) — tells us which tools
// to invest in vs. prune.
const track = useTrack()
onMounted(() => track('tool_view', { tool: props.slug, category: tool.value?.category }))

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
            // No `offers`: a free calculator sells nothing, and a $0 Offer only
            // buys a Product snippet on the SERP (see pages/index.vue).
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
  color: rgb(var(--v-theme-link));
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
  color: rgb(var(--v-theme-link));
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

/* Light mode: the aside/section surfaces are near-transparent white overlays
   that stay pale on the light canvas, so the 0.78-white slot paragraphs are
   unreadable. Re-ink to a dark muted tone. */
.v-theme--light .tool-aside :deep(p) {
  color: rgba(0, 0, 0, 0.78);
}

/* ── Stacked layout (contentLayout="below") ─────────────────────────────
   The calculator spans the full container width (matching the header and the
   explainer below it); the explainer sits beneath as an editorial two-column
   read. No max-width cap — the card lines up edge-to-edge with the header. */
.tool-stack-calc {
  width: 100%;
}

/* Short tips / disclaimers card sitting to the right of the calculator. Reuses
   the .tool-aside surface + heading; adds a compact bullet list. It stays its
   natural (short) height at the top of the column — the tall calculator drives
   the row, so there's no dead space under the primary content. */
.tool-tips :deep(ul) {
  margin: 0;
  padding-left: 1.15rem;
}
.tool-tips :deep(li) {
  line-height: 1.65;
  margin-bottom: 0.95rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}
.tool-tips :deep(li:last-child) {
  margin-bottom: 0;
}
.tool-tips :deep(li strong) {
  color: rgba(255, 255, 255, 0.95);
}
.v-theme--light .tool-tips :deep(li) {
  color: rgba(0, 0, 0, 0.78);
}
.v-theme--light .tool-tips :deep(li strong) {
  color: rgba(0, 0, 0, 0.92);
}

/* Each top-level <section> of the explainer becomes one column; they wrap to a
   single column below ~700px. Column-gap is generous so the two reads stay
   visually distinct without a rule between them. */
.tool-article :deep(.tool-article-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem 3.5rem;
  align-items: start;
}

.tool-article :deep(h2) {
  position: relative;
  padding-left: 0.85rem;
  font-size: 1.15rem;
  font-weight: 700;
  margin: 1.75rem 0 0.85rem;
}
/* First heading in a column shouldn't push down from the card's top padding. */
.tool-article :deep(section > h2:first-child) {
  margin-top: 0;
}
/* Gradient accent bar echoing the page header — the one quiet flourish. */
.tool-article :deep(h2)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.2em;
  bottom: 0.1em;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, #2f81f7 0%, #16c784 100%);
}

.tool-article :deep(p),
.tool-article :deep(li) {
  line-height: 1.7;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
}
.tool-article :deep(p) {
  margin-bottom: 0.9rem;
}
.tool-article :deep(ul) {
  margin: 0 0 0.9rem;
  padding-left: 1.2rem;
}
.tool-article :deep(li) {
  margin-bottom: 0.55rem;
}
.tool-article :deep(a) {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.tool-article :deep(a:hover) {
  text-decoration: underline;
}

.v-theme--light .tool-article :deep(p),
.v-theme--light .tool-article :deep(li) {
  color: rgba(0, 0, 0, 0.78);
}
</style>

<!--
  Shared design primitives for the herramientas/* slot content.
  Global (unscoped) but namespaced under .tool-page so they never leak to
  other pages. Every tool uses these instead of redefining them per file,
  keeping the calculators visually consistent with the import calculator
  (the design reference).
-->
<style>
/* Comfortable row-gap for stacked input rows */
.tool-page .g-input {
  row-gap: 10px;
}

/* Full-width segmented control for mode / régimen selectors */
.tool-page .seg-toggle {
  width: 100%;
  height: auto;
}
.tool-page .seg-toggle .seg-btn {
  flex: 1 1 0;
  min-height: 52px;
  min-width: 0;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  padding-inline: 16px;
}

/* Result summary cards */
.tool-page .result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}
.tool-page .result-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 18px 18px;
}

/* Highlighted secondary panel (e.g. estimate-by-weight) and its inner row */
.tool-page .tool-info-box {
  background: rgba(33, 150, 243, 0.06);
  border: 1px solid rgba(33, 150, 243, 0.22);
  border-radius: 12px;
}
.tool-page .tool-info-row {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

/* Breakdown / detail tables — a touch more row height so multi-line labels
   don't feel cramped. */
.tool-page .breakdown-table td,
.tool-page .breakdown-table th {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 10px;
  padding-bottom: 10px;
  line-height: 1.45;
}
.tool-page .breakdown-table .total-row td {
  border-top: 2px solid rgba(255, 255, 255, 0.15);
}

/* Inline text links inside the calculator card */
.tool-page .tool-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.tool-page .tool-link:hover {
  text-decoration: underline;
}
</style>
