<template>
  <aside class="assistant-cta" :aria-label="t('aria')" data-testid="assistant-cta">
    <VIcon icon="mdi-chat-processing-outline" size="28" class="assistant-cta__icon" />
    <div class="assistant-cta__body">
      <p class="assistant-cta__title">{{ t(`title.${group}`) }}</p>
      <p class="assistant-cta__text">
        <span class="assistant-cta__long">{{ t(`text.${group}`) }}</span>
        {{ t('free') }}
      </p>
    </div>
    <VBtn
      :to="target"
      color="primary"
      variant="flat"
      prepend-icon="mdi-creation"
      class="assistant-cta__button"
      data-testid="assistant-cta-link"
      @click="onClick"
    >
      {{ t('button') }}
    </VBtn>
  </aside>
</template>

<script setup lang="ts">
import {
  ASSISTANT_CTA_GROUP,
  ASSISTANT_FILTER_TOPICS,
  assistantCtaMessages,
} from '~/utils/assistantCtaMessages'
import { assistantFilterList, assistantLink, type AssistantTopic } from '~/utils/assistantPrompt'

/**
 * «Preguntale a la IA» on a directory: one line of copy and a button that opens /asistente-ia with
 * the question already written, built from the page's own filters. See utils/assistantPrompt.ts for
 * what may and may not travel in that question.
 */
const props = withDefaults(defineProps<{ topic: AssistantTopic; filters?: readonly string[] }>(), {
  filters: () => [],
})

const { t } = useI18n({ useScope: 'local', messages: assistantCtaMessages })
const localePath = useLocalePath()
const route = useRoute()
const track = useTrack()

const group = computed(() => ASSISTANT_CTA_GROUP[props.topic])
const prompt = computed(() => {
  const filters = ASSISTANT_FILTER_TOPICS.has(props.topic) ? assistantFilterList(props.filters) : ''
  return filters ? t(`qf.${props.topic}`, { filters }) : t(`q.${props.topic}`)
})

// The server renders the bare page: crawlers see one URL for the assistant, not one per filter
// combination. The question joins the link once the page is live in the browser.
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const target = computed(() =>
  localePath(mounted.value ? assistantLink(prompt.value) : assistantLink(''))
)

function onClick() {
  track('assistant_cta_click', {
    content_path: route.path,
    assistant_topic: props.topic,
    filter_count: ASSISTANT_FILTER_TOPICS.has(props.topic) ? props.filters.length : 0,
  })
}
</script>

<style scoped>
.assistant-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
  color: rgb(var(--v-theme-on-surface));
}
.assistant-cta__icon {
  color: rgb(var(--v-theme-primary));
  flex: none;
}
.assistant-cta__body {
  flex: 1 1 280px;
  min-width: 0;
}
.assistant-cta__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
}
.assistant-cta__text {
  margin: 2px 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.assistant-cta__button {
  flex: none;
}
/* On a phone the call must not push the results a screen down: title, one line, button. */
@media (max-width: 599px) {
  .assistant-cta {
    padding: 12px 14px;
    gap: 10px;
  }
  .assistant-cta__icon,
  .assistant-cta__long {
    display: none;
  }
  .assistant-cta__button {
    flex: 1 1 100%;
  }
}
</style>
