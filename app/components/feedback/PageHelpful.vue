<!--
  "¿Te sirvió esta página?" at the end of every content page (layout-tail, before the newsletter
  card). The rental micro-survey taught the shape (components/rentals/feedback/MicroSurvey.vue):
  20 days and zero answers while the tap only revealed an "Enviar", answers as soon as the tap
  itself was the answer. So:
   1. One tap answers and is stored right away (foot in the door: the smallest possible yes).
   2. "Sí" → thanks and, as the next step, the Trustpilot review with its reason (peak moment,
      reciprocity) or sharing. "No" → one optional line of what was missing, the private channel
      first; the review link comes after, quietly. Everyone gets the review link: no gating.
   3. Answered here → not asked on this page for ANSWERED_PATH_DAYS, nor anywhere for
      ANSWERED_ANY_DAYS (utils/siteFeedback.ts). The footer and /contacto stay open any time.
  Client-only (it reads localStorage) and at the bottom of the page: it cannot shift what the
  reader is looking at.
-->
<template>
  <aside v-if="visible" class="page-helpful" :aria-labelledby="titleId" data-testid="page-helpful">
    <div v-if="!noSent" class="page-helpful__row">
      <p :id="titleId" ref="heading" class="page-helpful__q" tabindex="-1">
        <template v-if="answer === 'yes'">
          <VIcon
            icon="mdi-check-circle-outline"
            size="20"
            class="page-helpful__ok"
            aria-hidden="true"
          />
          {{ t('helpful.thanksYes') }}
        </template>
        <template v-else-if="answer === 'no'">{{ t('helpful.thanksNo') }}</template>
        <template v-else>{{ t('helpful.question') }}</template>
      </p>
      <div v-if="!answer" class="page-helpful__choices">
        <button
          type="button"
          class="page-helpful__choice"
          data-cta="helpful_yes"
          :disabled="busy"
          @click="choose('yes')"
        >
          <VIcon size="20" aria-hidden="true">mdi-thumb-up-outline</VIcon>
          {{ t('helpful.yes') }}
        </button>
        <button
          type="button"
          class="page-helpful__choice"
          data-cta="helpful_no"
          :disabled="busy"
          @click="choose('no')"
        >
          <VIcon size="20" aria-hidden="true">mdi-thumb-down-outline</VIcon>
          {{ t('helpful.no') }}
        </button>
      </div>
      <VBtn
        v-else
        icon="mdi-close"
        variant="text"
        size="small"
        class="page-helpful__close"
        :aria-label="t('helpful.dismiss')"
        @click="visible = false"
      />
    </div>

    <FeedbackReviewAsk
      v-if="answer === 'yes' && reviewMode !== 'none'"
      :mode="reviewMode"
      trigger="helpful_yes"
    />

    <template v-if="answer === 'no'">
      <p v-if="!noSent" class="page-helpful__hint">{{ t('helpful.noHint') }}</p>
      <FeedbackForm embedded lock-kind initial-kind="suggestion" autofocus @sent="noSent = true" />
    </template>
  </aside>
</template>

<script setup lang="ts">
import {
  helpfulAllowedForPath,
  reviewAskFor,
  shouldAskHelpful,
  type HelpfulAnswer,
} from '~/utils/siteFeedback'
import { siteFeedbackMessages } from '~/utils/siteFeedbackMessages'

const { t } = useI18n({ useScope: 'local', messages: siteFeedbackMessages })
const route = useRoute()
const track = useTrack()
const feedback = useSiteFeedback()

const titleId = useId()
const visible = ref(false)
const answer = ref<HelpfulAnswer | null>(null)
const busy = ref(false)
const noSent = ref(false)
const reviewMode = ref<'lead' | 'quiet' | 'none'>('none')
const heading = ref<HTMLElement | null>(null)

function evaluate() {
  answer.value = null
  noSent.value = false
  reviewMode.value = 'none'
  visible.value =
    helpfulAllowedForPath(route.path) &&
    shouldAskHelpful(feedback.readMemory(), route.path, Date.now())
}

onMounted(evaluate)
// The layout survives navigation: a new page gets a fresh question (or none).
watch(() => route.path, evaluate)

let viewed = ''
const stopView = watch(visible, show => {
  if (show && viewed !== route.path) {
    viewed = route.path
    track('helpful_view', { content_path: route.path })
  }
})
onScopeDispose(stopView)

async function choose(value: HelpfulAnswer) {
  busy.value = true
  // The tap is the answer: show it at once, store it in the background.
  answer.value = value
  const memory = feedback.remember(route.path)
  reviewMode.value = reviewAskFor(memory, value, Date.now())
  track('helpful_answer', { helpful: value, content_path: route.path })
  feedback.submit({ kind: 'helpful', helpful: value }).catch(() => {
    // A lost vote is not worth an error message; the person already got the next step.
  })
  busy.value = false
  await nextTick()
  if (value === 'yes') heading.value?.focus()
}
</script>

<style scoped>
.page-helpful {
  display: grid;
  gap: 16px;
  margin: 32px 0 8px;
  padding: 16px 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  color: rgb(var(--v-theme-on-surface));
}
.page-helpful :is(p) {
  margin: 0;
}
.page-helpful__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
}
.page-helpful__q {
  flex: 1 1 14rem;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
}
.page-helpful__q:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 4px;
}
.page-helpful__ok {
  color: rgb(var(--v-theme-success));
}
.page-helpful__choices {
  display: flex;
  gap: 8px;
}
.page-helpful__choice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 88px;
  min-height: 44px;
  padding: 0 16px;
  justify-content: center;
  border: 1px solid rgba(var(--v-border-color), 0.28);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;
}
.page-helpful__choice:hover:not(:disabled) {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.page-helpful__choice:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.page-helpful__close {
  flex: none;
  margin: -6px -10px -6px auto;
}
/* Answered: the thanks and the close button share one line at every width. */
.page-helpful__row:has(.page-helpful__close) {
  flex-wrap: nowrap;
  align-items: flex-start;
}
.page-helpful__hint {
  max-width: 65ch;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
@media (max-width: 599px) {
  .page-helpful__choices {
    flex: 1 1 100%;
  }
  .page-helpful__choice {
    flex: 1 1 0;
  }
}
</style>
