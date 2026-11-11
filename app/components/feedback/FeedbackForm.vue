<!--
  The suggestion box and the bug report, one form. Lives on /contacto (#sugerencias, `?tipo=bug`
  preselects the report) and inside the end-of-page question after a "No". No modal: nothing here
  needs to interrupt the page or trap focus, and a link to /contacto#sugerencias works without JS.

  Three kinds as a radio group (native inputs, so arrows/space work and a screen reader announces
  "1 de 3"), one textarea whose label and example change with the kind, an optional email (Reply-To
  of the mail the owner receives) and, only for a bug, a checked box that attaches the technical
  data — listed in the hint, nothing hidden. Sent → thanks in place, focus moves to it, and the
  Trustpilot link for everyone who wrote (see reviewAskFor in utils/siteFeedback.ts: no gating).
-->
<template>
  <section
    :id="anchorId"
    class="feedback-form"
    :class="{ 'feedback-form--embedded': embedded }"
    :aria-labelledby="titleId"
    data-testid="feedback-form"
  >
    <template v-if="sent">
      <p :id="titleId" ref="thanks" class="feedback-form__title" tabindex="-1">
        <VIcon
          icon="mdi-check-circle-outline"
          size="22"
          class="feedback-form__ok"
          aria-hidden="true"
        />
        {{ t('form.sentTitle') }}
      </p>
      <p class="feedback-form__text">
        {{ t('form.sentText') }}
        <template v-if="sentEmail">{{ t('form.sentWithEmail', { email: sentEmail }) }}</template>
      </p>
      <FeedbackReviewAsk
        v-if="reviewMode !== 'none'"
        :mode="reviewMode"
        :trigger="`form_${sentKind}`"
      />
      <button type="button" class="feedback-form__again" @click="reset">
        {{ t('form.another') }}
      </button>
    </template>

    <form v-else class="feedback-form__form" novalidate @submit.prevent="send">
      <div v-if="!embedded" class="feedback-form__head">
        <h2 :id="titleId" class="feedback-form__h">{{ t('form.title') }}</h2>
        <p class="feedback-form__text">{{ t('form.intro') }}</p>
      </div>
      <p v-else :id="titleId" class="sr-only">{{ t('form.title') }}</p>

      <fieldset v-if="!lockKind" class="feedback-form__kinds">
        <legend class="feedback-form__legend">{{ t('form.kindLegend') }}</legend>
        <div class="feedback-form__kind-row">
          <label
            v-for="option in kindOptions"
            :key="option.value"
            class="feedback-form__kind"
            :class="{ 'is-on': kind === option.value }"
          >
            <input
              v-model="kind"
              type="radio"
              :name="`${uid}-kind`"
              :value="option.value"
              class="feedback-form__radio"
            />
            <VIcon size="20" aria-hidden="true">{{ option.icon }}</VIcon>
            <span>{{ t(`form.kinds.${option.value}`) }}</span>
          </label>
        </div>
      </fieldset>

      <VTextarea
        v-model="message"
        :label="t(`form.messageLabel.${kind}`)"
        :placeholder="t(`form.messagePlaceholder.${kind}`)"
        :counter="MESSAGE_MAX"
        :maxlength="MESSAGE_MAX"
        :error-messages="errorField === 'message' ? [t('form.errors.message')] : []"
        rows="4"
        auto-grow
        variant="outlined"
        persistent-placeholder
        hide-details="auto"
        :autofocus="autofocus"
        data-testid="feedback-message"
        @update:model-value="errorField === 'message' && (errorField = null)"
      />

      <VTextField
        v-model="email"
        :label="t('form.emailLabel')"
        :hint="t('form.emailHint')"
        :error-messages="errorField === 'email' ? [t('form.errors.email')] : []"
        type="email"
        inputmode="email"
        autocomplete="email"
        variant="outlined"
        persistent-hint
        hide-details="auto"
        data-testid="feedback-email"
        @update:model-value="errorField === 'email' && (errorField = null)"
      />

      <label v-if="kind === 'bug'" class="feedback-form__tech">
        <input v-model="includeTech" type="checkbox" />
        <span>
          <strong>{{ t('form.techLabel') }}</strong>
          <span class="feedback-form__tech-hint">{{ t('form.techHint') }}</span>
        </span>
      </label>

      <!-- Honeypot: off-screen, unlabeled for people, skipped by tab. -->
      <div class="feedback-form__trap" aria-hidden="true">
        <label>
          Website
          <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" />
        </label>
      </div>

      <p v-if="errorText" class="feedback-form__error" role="alert">{{ errorText }}</p>

      <div class="feedback-form__actions">
        <VBtn
          type="submit"
          color="primary"
          size="large"
          :loading="sending"
          :disabled="sending"
          data-cta="feedback_send"
          :data-cta-kind="kind"
        >
          {{ t('form.send') }}
          <template #loader>{{ t('form.sending') }}</template>
        </VBtn>
        <p class="feedback-form__privacy">
          {{ t('form.privacy') }}
          <NuxtLink :to="localePath('/privacidad')">{{ t('form.privacyLink') }}</NuxtLink
          >.
        </p>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { MESSAGE_MAX, MESSAGE_MIN, reviewAskFor, type FormKind } from '~/utils/siteFeedback'
import { siteFeedbackMessages } from '~/utils/siteFeedbackMessages'

const props = withDefaults(
  defineProps<{
    initialKind?: FormKind
    /** Inside another card (the end-of-page question): no heading, no frame. */
    embedded?: boolean
    /** Hides the kind picker (the end-of-page "No" is always a suggestion). */
    lockKind?: boolean
    autofocus?: boolean
    anchorId?: string
  }>(),
  {
    initialKind: 'suggestion',
    embedded: false,
    lockKind: false,
    autofocus: false,
    anchorId: undefined,
  }
)
const emit = defineEmits<{ sent: [kind: FormKind] }>()

const { t } = useI18n({ useScope: 'local', messages: siteFeedbackMessages })
const localePath = useLocalePath()
const track = useTrack()
const feedback = useSiteFeedback()
const route = useRoute()

const uid = useId()
const titleId = `${uid}-title`
const kindOptions = [
  { value: 'suggestion', icon: 'mdi-lightbulb-on-outline' },
  { value: 'bug', icon: 'mdi-bug-outline' },
  { value: 'praise', icon: 'mdi-heart-outline' },
] as const

const kind = ref<FormKind>(props.initialKind)
watch(
  () => props.initialKind,
  value => (kind.value = value)
)
const message = ref('')
const email = ref('')
const includeTech = ref(true)
const website = ref('')
const sending = ref(false)
const sent = ref(false)
const sentKind = ref<FormKind>('suggestion')
const sentEmail = ref('')
const errorField = ref<'message' | 'email' | null>(null)
const errorText = ref('')
const reviewMode = ref<'lead' | 'quiet' | 'none'>('none')
const thanks = ref<HTMLElement | null>(null)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

async function send() {
  errorText.value = ''
  if (message.value.trim().length < MESSAGE_MIN) {
    errorField.value = 'message'
    return
  }
  if (email.value.trim() && !EMAIL_RE.test(email.value.trim())) {
    errorField.value = 'email'
    return
  }
  errorField.value = null
  sending.value = true
  try {
    await feedback.submit({
      kind: kind.value,
      message: message.value.trim(),
      email: email.value.trim() || undefined,
      includeTech: kind.value === 'bug' && includeTech.value,
      website: website.value,
    })
    sentKind.value = kind.value
    sentEmail.value = email.value.trim()
    const memory = feedback.remember(route.path)
    reviewMode.value = reviewAskFor(memory, kind.value, Date.now())
    sent.value = true
    track('feedback_sent', { feedback_kind: kind.value, has_email: Boolean(sentEmail.value) })
    emit('sent', kind.value)
    await nextTick()
    thanks.value?.focus()
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode
    errorText.value = status === 429 ? t('form.errors.rate') : t('form.errors.generic', { at: '@' })
  } finally {
    sending.value = false
  }
}

function reset() {
  sent.value = false
  message.value = ''
  reviewMode.value = 'none'
}
</script>

<style scoped>
.feedback-form {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  color: rgb(var(--v-theme-on-surface));
  scroll-margin-top: 88px;
}
.feedback-form--embedded {
  padding: 0;
  border: 0;
  background: none;
}
.feedback-form :is(p, h2, fieldset, legend) {
  margin: 0;
}
.feedback-form__form {
  display: grid;
  gap: 20px;
}
.feedback-form__head {
  display: grid;
  gap: 6px;
}
.feedback-form__h {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
}
.feedback-form__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  font-weight: 700;
}
.feedback-form__title:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 4px;
}
.feedback-form__ok {
  color: rgb(var(--v-theme-success));
}
.feedback-form__text {
  max-width: 65ch;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.feedback-form__kinds {
  border: 0;
  padding: 0;
  min-width: 0;
}
.feedback-form__legend {
  margin-bottom: 8px !important;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 700;
}
.feedback-form__kind-row {
  /* Three equal columns at every width: stacked full-width rows took a whole phone screen. */
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  max-width: 520px;
}
.feedback-form__kind {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 64px;
  padding: 8px 6px;
  text-align: center;
  line-height: 1.25;
  border: 1px solid rgba(var(--v-border-color), 0.28);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;
}
.feedback-form__kind:hover {
  border-color: rgb(var(--v-theme-primary));
}
.feedback-form__kind.is-on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.14);
}
.feedback-form__kind:has(:focus-visible) {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.feedback-form__radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.feedback-form__tech {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9375rem;
  line-height: 1.45;
  cursor: pointer;
}
.feedback-form__tech input {
  flex: none;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  accent-color: rgb(var(--v-theme-primary));
}
.feedback-form__tech-hint {
  display: block;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.feedback-form__trap {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.feedback-form__error {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-error), 0.12);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
}
.feedback-form__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}
.feedback-form__privacy {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.feedback-form__privacy a,
.feedback-form__again {
  color: rgb(var(--v-theme-link));
}
.feedback-form__again {
  justify-self: start;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.9375rem;
  text-decoration: underline;
  cursor: pointer;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
