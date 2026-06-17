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
          <VExpansionPanels variant="accordion">
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
  defineProps<{ items: FaqItem[]; heading?: string; emitSchema?: boolean }>(),
  { heading: '', emitSchema: true }
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
