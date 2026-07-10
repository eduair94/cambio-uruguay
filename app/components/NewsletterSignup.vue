<template>
  <form class="newsletter-signup" novalidate @submit.prevent="submit">
    <VTextField
      v-model="email"
      :label="$t('newsletter.emailLabel')"
      :placeholder="$t('newsletter.emailPlaceholder')"
      type="email"
      autocomplete="email"
      variant="outlined"
      density="comfortable"
      prepend-inner-icon="mdi-email-outline"
      :disabled="state === 'submitting' || state === 'sent'"
      :error-messages="state === 'error' ? $t('newsletter.error') : undefined"
      hide-details="auto"
      data-testid="newsletter-email"
    />

    <!-- Honeypot: hidden from humans, bots tend to fill it. -->
    <input
      v-model="website"
      type="text"
      name="website"
      tabindex="-1"
      autocomplete="off"
      aria-hidden="true"
      class="newsletter-hp"
    />

    <VBtn
      type="submit"
      color="primary"
      :loading="state === 'submitting'"
      :disabled="state === 'sent'"
      block
      class="mt-3"
      data-testid="newsletter-submit"
    >
      {{ $t('newsletter.subscribe') }}
    </VBtn>

    <VAlert v-if="state === 'sent'" type="success" variant="tonal" density="compact" class="mt-3">
      {{ $t('newsletter.sent') }}
    </VAlert>

    <p class="text-caption text-medium-emphasis mt-3 mb-0">{{ $t('newsletter.consent') }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const route = useRoute()
const track = useTrack()
const email = ref('')
const website = ref('') // honeypot
const state = ref<'idle' | 'submitting' | 'sent' | 'error'>('idle')

async function submit(): Promise<void> {
  if (state.value === 'submitting' || state.value === 'sent') return
  state.value = 'submitting'
  try {
    await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: email.value, locale: locale.value, website: website.value },
    })
    state.value = 'sent'
    // A GA4 key event: the signup is one of the two conversions that tell us an
    // organic landing page earned a returning visitor. `source` is the landing
    // path so we can attribute it to the page type in an Exploration.
    track('newsletter_signup', { source: route.path, locale: locale.value })
  } catch {
    state.value = 'error'
  }
}
</script>

<style scoped>
.newsletter-hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}
</style>
