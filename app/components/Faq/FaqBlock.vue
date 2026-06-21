<!--
  Reusable FAQ block. Renders a visible accordion AND injects matching FAQPage
  JSON-LD via the existing $seo.generateFAQData. Visible text === schema text
  because both come from the same `items` prop. Answers are plain text.
-->
<template>
  <section class="faq-block py-8" data-testid="faq-block">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <h2 v-if="heading" class="text-h5 font-weight-bold mb-4">{{ heading }}</h2>

          <!-- Expanded: answers in always-visible plain HTML (best for AI/A
               Overview extraction). Used on the dedicated FAQ page. -->
          <dl v-if="expanded" class="faq-dl">
            <div v-for="item in items" :key="item.id" :data-faq-id="item.id" class="faq-dl-item">
              <dt class="text-subtitle-1 font-weight-bold mb-1">{{ item.question }}</dt>
              <dd class="text-body-2 text-grey-lighten-1 mb-5">{{ item.answer }}</dd>
            </div>
          </dl>

          <!-- Default: accordion (compact UX, e.g. embedded on the homepage). -->
          <VExpansionPanels v-else variant="accordion">
            <VExpansionPanel v-for="item in items" :key="item.id" :data-faq-id="item.id">
              <VExpansionPanelTitle>{{ item.question }}</VExpansionPanelTitle>
              <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </VCol>
      </VRow>
    </VContainer>
  </section>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'

const props = withDefaults(
  defineProps<{ items: FaqItem[]; heading?: string; emitSchema?: boolean; expanded?: boolean }>(),
  { heading: '', emitSchema: true, expanded: false }
)

const { $seo } = useNuxtApp()

useHead(() => {
  if (!props.emitSchema || !props.items.length) return {}
  return {
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(
          $seo.generateFAQData(props.items.map(i => ({ question: i.question, answer: i.answer })))
        ),
      },
    ],
  }
})
</script>
