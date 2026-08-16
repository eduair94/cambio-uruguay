<template>
  <article class="longform-article">
    <!-- Body sections -->
    <section v-for="(section, i) in doc.sections" :key="`s-${i}`" class="mb-6">
      <h2 class="text-h5 font-weight-bold mb-3">{{ section.heading }}</h2>
      <p class="text-body-1 longform-prose">{{ section.body }}</p>

      <ul v-if="section.bullets?.length" class="longform-bullets mt-3">
        <li v-for="(bullet, bi) in section.bullets" :key="bi">{{ bullet }}</li>
      </ul>

      <div v-if="section.table" class="table-scroll mt-3">
        <table class="longform-table cu-mobile-cards">
          <thead>
            <tr>
              <th v-for="(header, hi) in section.table.headers" :key="hi">{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in section.table.rows" :key="ri">
              <td
                v-for="(cell, ci) in row"
                :key="ci"
                :data-label="ci === 0 ? '' : section.table.headers[ci]"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Contextual links: the page this very section talks about, clickable
           where the reader is reading about it (the body itself is plain text). -->
      <div v-if="section.links?.length" class="d-flex flex-wrap ga-2 mt-3">
        <VChip
          v-for="link in section.links"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">mdi-arrow-right-circle-outline</VIcon>
          {{ link.label }}
        </VChip>
      </div>
    </section>

    <!-- Extra blocks a family renders between the prose and the steps -->
    <slot name="after-sections" />

    <!-- Procedural steps (also emitted as HowTo schema by the page) -->
    <section v-if="doc.steps?.length" class="mb-6">
      <h2 class="text-h5 font-weight-bold mb-3">Paso a paso</h2>
      <ol class="longform-steps">
        <li v-for="(step, i) in doc.steps" :key="i" class="mb-3">
          <span class="font-weight-bold">{{ step.name }}.</span>
          <span class="longform-prose">{{ ' ' + step.text }}</span>
        </li>
      </ol>
    </section>

    <!-- FAQ (also emitted as FAQPage schema by the page) -->
    <section v-if="doc.faqs?.length" class="mb-6">
      <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="longform-faq-panels">
        <VExpansionPanel v-for="(faq, i) in doc.faqs" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">{{ faq.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-1 longform-prose mb-0">{{ faq.a }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Sources: primary references for any legal or numeric claim above -->
    <VCard v-if="doc.sources?.length" variant="flat" class="longform-sources mt-8 pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes
      </h2>
      <ul class="longform-sources-list">
        <li v-for="(source, i) in doc.sources" :key="i">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
          <span v-if="source.publisher" class="source-publisher"> — {{ source.publisher }}</span>
        </li>
      </ul>
    </VCard>

    <!-- Related links: family defaults are passed in by the page -->
    <VCard v-if="allRelated.length" variant="flat" class="longform-related mt-6 pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="link in allRelated"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">mdi-link-variant</VIcon>
          {{ link.label }}
        </VChip>
      </div>
    </VCard>
  </article>
</template>

<script setup lang="ts">
import type { LongformDoc, LongformLink } from '~/utils/longform'

const props = withDefaults(
  defineProps<{
    /** The document to render. */
    doc: LongformDoc
    /** Family-level links appended after the document's own `related` chips. */
    defaultRelated?: readonly LongformLink[]
  }>(),
  { defaultRelated: () => [] }
)

const localePath = useLocalePath()

/**
 * Document links first, then the family defaults — deduped by `to` so a page
 * that already points at the comparator does not show the chip twice.
 */
const allRelated = computed<LongformLink[]>(() => {
  const seen = new Set<string>()
  const out: LongformLink[] = []
  for (const link of [...(props.doc.related ?? []), ...props.defaultRelated]) {
    if (seen.has(link.to)) continue
    seen.add(link.to)
    out.push(link)
  }
  return out
})
</script>

<style scoped>
.longform-prose {
  line-height: 1.8;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.longform-bullets {
  padding-left: 1.15rem;
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}
.longform-bullets li {
  margin-bottom: 0.35rem;
}

.longform-steps {
  padding-left: 1.25rem;
  line-height: 1.7;
}
.longform-steps li {
  padding-left: 0.25rem;
}

/* Multi-line FAQ titles are cramped at Vuetify's default title line-height. */
.longform-faq-panels :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}

.table-scroll {
  overflow-x: auto;
}
.longform-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.longform-table th,
.longform-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.longform-table thead th {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.longform-table tbody td:first-child {
  font-weight: 600;
}

.longform-sources,
.longform-related {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}
.longform-sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  line-height: 1.5;
}
.longform-sources-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.longform-sources-list a:hover {
  text-decoration: underline;
}
.source-publisher {
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
