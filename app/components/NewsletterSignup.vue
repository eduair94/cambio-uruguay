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

import { runNewsletterSubmit } from '~/utils/newsletterFunnel'

// Emitted once the subscribe request succeeds, so a host (the end-of-article
// capture card) can stop asking. The form stays the single implementation of
// subscribing — honeypot, GA4 key event and all.
const emit = defineEmits<{ subscribed: [] }>()

const { locale } = useI18n()
const route = useRoute()
const track = useTrack()
const email = ref('')
const website = ref('') // honeypot
const state = ref<'idle' | 'submitting' | 'sent' | 'error'>('idle')

// Los tres momentos van separados porque un éxito sin denominador no es una tasa:
// hasta ahora sólo salía `newsletter_signup`, así que 40 altas podían ser 40 de 45
// o 40 de 4.000, y nadie podía decir si un cambio en la tarjeta había servido.
// `runNewsletterSubmit` fija el orden: intención antes del pedido, resultado
// después de que resuelve.
async function submit(): Promise<void> {
  if (state.value === 'submitting' || state.value === 'sent') return
  state.value = 'submitting'
  // La carga va escrita entera en cada uno y no en una constante: `ga4-key-events`
  // lee el archivo como texto y comprueba que la conversión lleve `source` al lado.
  state.value = await runNewsletterSubmit({
    post: () =>
      $fetch('/api/newsletter/subscribe', {
        method: 'POST',
        body: { email: email.value, locale: locale.value, website: website.value },
      }),
    onSubmit: () => track('newsletter_submit', { source: route.path, locale: locale.value }),
    // A GA4 key event: the signup is one of the two conversions that tell us an
    // organic landing page earned a returning visitor. `source` is the landing
    // path so we can attribute it to the page type in an Exploration.
    onSuccess: () => track('newsletter_signup', { source: route.path, locale: locale.value }),
    onError: () => track('newsletter_error', { source: route.path, locale: locale.value }),
  })
  if (state.value === 'sent') emit('subscribed')
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
