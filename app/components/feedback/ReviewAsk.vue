<!--
  The ask for a public Trustpilot review, after someone answered something. Two strengths, decided by
  reviewAskFor (utils/siteFeedback.ts) from what this browser already did, never from whether the
  answer was positive (that would be review gating):
   - `lead`: the next step after "Sí" or a compliment. Reason first (an independent site, a review
     helps others compare), one button, an honest "Ahora no", and sharing as the alternative.
   - `quiet`: one line after a private message.
  Opening the link or "Ahora no" is remembered, so the ask does not come back for months.
-->
<template>
  <div v-if="!hidden" class="review-ask" :class="`review-ask--${mode}`" data-testid="review-ask">
    <template v-if="opened">
      <p class="review-ask__thanks" role="status">
        <VIcon size="20" aria-hidden="true" class="review-ask__star">mdi-star</VIcon>
        {{ t('review.thanks') }}
      </p>
    </template>
    <template v-else-if="mode === 'lead'">
      <p class="review-ask__title">
        <VIcon size="20" aria-hidden="true" class="review-ask__star">mdi-star</VIcon>
        {{ t('review.leadTitle') }}
      </p>
      <p class="review-ask__text">{{ t('review.leadText') }}</p>
      <div class="review-ask__actions">
        <VBtn
          :href="TRUSTPILOT_REVIEW_URL"
          target="_blank"
          rel="noopener"
          color="primary"
          prepend-icon="mdi-open-in-new"
          data-cta="review_trustpilot"
          :data-cta-trigger="trigger"
          @click="open"
        >
          {{ t('review.cta') }}
        </VBtn>
        <button type="button" class="review-ask__later" @click="dismiss">
          {{ t('review.later') }}
        </button>
      </div>
      <p class="review-ask__share">{{ t('review.share') }}</p>
      <ShareButtons label variant="outlined" color="link" />
    </template>
    <p v-else class="review-ask__quiet">
      {{ t('review.quiet') }}
      <a
        :href="TRUSTPILOT_REVIEW_URL"
        target="_blank"
        rel="noopener"
        data-cta="review_trustpilot"
        :data-cta-trigger="trigger"
        @click="open"
        >{{ t('review.quietCta') }}</a
      >
    </p>
  </div>
</template>

<script setup lang="ts">
import { TRUSTPILOT_REVIEW_URL } from '~/utils/trustpilot'
import { siteFeedbackMessages } from '~/utils/siteFeedbackMessages'

const props = defineProps<{ mode: 'lead' | 'quiet'; trigger: string }>()

const { t } = useI18n({ useScope: 'local', messages: siteFeedbackMessages })
const track = useTrack()
const feedback = useSiteFeedback()
const opened = ref(false)
const hidden = ref(false)

onMounted(() =>
  track('review_ask_view', { review_mode: props.mode, review_trigger: props.trigger })
)

function open() {
  feedback.update(memory => ({ ...memory, reviewOpenedAt: Date.now() }))
  track('review_open', { review_mode: props.mode, review_trigger: props.trigger })
  opened.value = true
}

function dismiss() {
  feedback.update(memory => ({ ...memory, reviewDismissedAt: Date.now() }))
  track('review_dismiss', { review_trigger: props.trigger })
  hidden.value = true
}
</script>

<style scoped>
.review-ask {
  display: grid;
  gap: 10px;
}
.review-ask :is(p) {
  margin: 0;
}
.review-ask--lead {
  padding: 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
}
.review-ask__title,
.review-ask__thanks {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}
.review-ask__star {
  /* amber-signal (DESIGN.md). Decorative: the words next to it carry the meaning. */
  color: #ff8f00;
}
.review-ask__text,
.review-ask__share,
.review-ask__quiet {
  max-width: 65ch;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.review-ask__share {
  margin-top: 4px;
  font-size: 0.875rem;
}
.review-ask__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.review-ask__later {
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  background: none;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font: inherit;
  font-size: 0.9375rem;
  text-decoration: underline;
  cursor: pointer;
}
.review-ask__quiet a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.review-ask__later:focus-visible,
.review-ask__quiet a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
</style>
