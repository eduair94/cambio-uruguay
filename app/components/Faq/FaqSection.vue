<!--
  FAQ block that keeps the width of the page it sits in.

  `FaqBlock` mounts its own `<VContainer>` and clamps to `md=10 / lg=8`, which is right for the
  home embed and the FAQ hub but wrong inside a page that already has a container: the questions
  end up visibly narrower than every section above them. This variant renders no container and no
  column, so it inherits whatever width its parent section uses.

  Same markup contract as FaqBlock otherwise (`data-faq-id`, `.faq-dl-item`, dt/dd or accordion)
  and the same FAQPage JSON-LD via `useFaqSchema`, so extractors and the e2e selectors see no
  difference.
-->
<template>
  <section class="faq-section" data-testid="faq-block">
    <h2 v-if="heading" class="text-h6 font-weight-medium mb-3">{{ heading }}</h2>

    <!-- Expanded: answers always in the DOM (best for AI Overviews and for reading). -->
    <dl v-if="expanded" class="faq-dl">
      <div v-for="item in items" :key="item.id" :data-faq-id="item.id" class="faq-dl-item">
        <dt class="text-subtitle-1 font-weight-bold mb-1">{{ item.question }}</dt>
        <dd class="text-body-2 mb-5">{{ item.answer }}</dd>
      </div>
    </dl>

    <!-- Compact accordion, for pages that only want the questions visible. -->
    <VExpansionPanels v-else variant="accordion">
      <VExpansionPanel v-for="item in items" :key="item.id" :data-faq-id="item.id">
        <VExpansionPanelTitle>{{ item.question }}</VExpansionPanelTitle>
        <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>
  </section>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'

const props = withDefaults(
  defineProps<{ items: FaqItem[]; heading?: string; emitSchema?: boolean; expanded?: boolean }>(),
  { heading: '', emitSchema: true, expanded: false }
)

useFaqSchema(
  () => props.items,
  () => props.emitSchema
)
</script>

<style scoped>
/* Separación superior propia. FaqBlock la trae en su `py-8`; esta variante no renderiza container
   ni columna, así que sin esto el <h2> queda pegado al bloque anterior (era el caso en las 6
   páginas que la usan, y una de ellas ya lo parchaba con un `mt-8` local).
   40px = spacing.xl de DESIGN.md, un escalón por encima del `mt-8` (32px) que separa las secciones
   internas: el FAQ cierra la página, no es una sección más. Es `margin`, no `padding`, para que
   colapse con el margen inferior del hermano anterior y nunca sume el doble. */
.faq-section {
  margin-block-start: 40px;
}
@media (max-width: 599.98px) {
  .faq-section {
    margin-block-start: 32px;
  }
}

/* Browsers indent <dd> by ~40px by default, which reads as a broken hanging indent next to the
   questions. The answer belongs at the same left edge as its question. */
.faq-dl {
  margin: 0;
}
.faq-dl-item dd {
  margin-inline-start: 0;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
</style>
