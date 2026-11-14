<template>
  <ClientOnly>
    <aside
      v-if="visible"
      ref="card"
      class="nl-capture"
      :aria-label="t('capture.aria')"
      data-testid="newsletter-invitation"
    >
      <VCard class="nl-capture-card pa-5 pa-md-6" variant="flat">
        <VBtn
          class="nl-capture-close"
          icon="mdi-close"
          size="small"
          variant="text"
          :aria-label="t('capture.dismiss')"
          @click="dismiss"
        />
        <div class="nl-capture-head d-flex align-start ga-3 mb-3">
          <VIcon color="primary" size="28">mdi-email-fast-outline</VIcon>
          <div class="nl-capture-text">
            <h2 class="text-subtitle-1 font-weight-bold mb-1">{{ t('capture.title') }}</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ t('capture.lead') }}</p>
          </div>
        </div>
        <div class="nl-capture-form">
          <NewsletterSignup @subscribed="onSubscribed" />
          <NuxtLink
            :to="localePath('/newsletter/archivo')"
            class="nl-capture-preview"
            @click="engage('preview')"
          >
            {{ t('readerFollowUp.preview') }}
          </NuxtLink>
        </div>
      </VCard>
    </aside>
  </ClientOnly>
</template>

<script setup lang="ts">
// The end-of-article ask, rendered by the layout on long reads only.
//
// Deliberately <ClientOnly>: whether to show it depends on two localStorage
// flags, and a form has no SEO value to trade for the hydration mismatch that
// server-rendering a browser-dependent decision would cause.
//
// It listens for the form's `subscribed` event rather than owning a form, so the
// existing <NewsletterSignup /> — honeypot, GA4 key event and all — stays the one
// implementation of subscribing.
import {
  CAPTURE_DISMISS_KEY,
  CAPTURE_DONE_KEY,
  captureAllowedForPath,
  shouldAskForEmail,
} from '~/utils/capture'
import { createNewsletterViewReporter, observeFirstImpression } from '~/utils/newsletterFunnel'

const route = useRoute()
const { t } = useI18n()
const track = useTrack()
const localePath = useLocalePath()
const auth = useAuthStore()
const configured = Boolean(useRuntimeConfig().public.firebase?.apiKey)
const { authFetch } = useAuthFetch()
const {
  allowed: attentionAllowed,
  element,
  dismiss: dismissInvitation,
  engage,
} = useEngagementPrompt('newsletter')
const accountSubscribed = ref(false)
const checkingAccount = ref(false)

const dismissed = ref(false)
const remembered = ref(true) // assume "already handled" until localStorage says otherwise
const justSubscribed = ref(false)

const allowed = computed(() => captureAllowedForPath(route.path))
// `justSubscribed` keeps the card mounted after a successful signup so the form's
// own success alert is actually readable; `remembered` still hides it everywhere else.
const visible = computed(
  () =>
    allowed.value &&
    attentionAllowed.value &&
    (!configured || auth.ready) &&
    !dismissed.value &&
    !checkingAccount.value &&
    !accountSubscribed.value &&
    (!remembered.value || justSubscribed.value)
)

function readMemory(): void {
  try {
    const done = localStorage.getItem(CAPTURE_DONE_KEY) === '1'
    const raw = localStorage.getItem(CAPTURE_DISMISS_KEY)
    const dismissedAt = raw ? Number(raw) : null
    remembered.value = !shouldAskForEmail({
      allowed: true,
      done,
      dismissedAt: Number.isFinite(dismissedAt) ? dismissedAt : null,
      now: Date.now(),
    })
  } catch {
    // Private mode or storage disabled: ask, and simply forget the answer.
    remembered.value = false
  }
}

function dismiss(): void {
  dismissInvitation()
  dismissed.value = true
  try {
    localStorage.setItem(CAPTURE_DISMISS_KEY, String(Date.now()))
  } catch {
    // nothing to do — the card is closed for this page view either way
  }
  track('newsletter_dismiss', { content_path: route.path })
}

function onSubscribed(): void {
  try {
    localStorage.setItem(CAPTURE_DONE_KEY, '1')
  } catch {
    // Private mode: the card stays for this page view, which is harmless — the
    // subscribe endpoint is idempotent.
  }
  justSubscribed.value = true
  remembered.value = true
}

onMounted(readMemory)
watch(
  () => auth.user?.uid,
  async uid => {
    accountSubscribed.value = false
    if (!uid) {
      checkingAccount.value = false
      return
    }
    checkingAccount.value = true
    try {
      const prefs = await authFetch<{ email: boolean; publicEmailSubscribed?: boolean }>(
        '/api/me/newsletter'
      )
      if (auth.user?.uid === uid)
        accountSubscribed.value = prefs.email || !!prefs.publicEmailSubscribed
    } catch {
      // Unknown preferences are not an invitation to ask a signed-in reader again.
      if (auth.user?.uid === uid) accountSubscribed.value = true
    } finally {
      if (auth.user?.uid === uid) checkingAccount.value = false
    }
  },
  { immediate: true }
)

// The card lives in the layout, so it is never remounted by a route change: the
// "keep showing the success alert" exception has to be cleared by hand, or a
// reader who subscribes once keeps seeing the card for the rest of the session.
watch(
  () => route.path,
  () => {
    justSubscribed.value = false
  }
)

// La vista se emitía en un `watch(visible)`, y `remembered` arranca en `true`:
// el onMounted lo bajaba, el watch corría y el evento salía con la tarjeta recién
// insertada en el DOM, a pantallas de distancia del lector. Por eso el pico del
// 17-08 dejó 1.274 `newsletter_capture_view` que no se pueden comparar con nada.
// Ahora la vista la declara el observador, una sola vez por sesión.
const card = ref<HTMLElement | null>(null)
const viewReporter = createNewsletterViewReporter({ track, contentPath: () => route.path })
let stopObserving: (() => void) | null = null

watch(card, el => {
  element.value = el
  stopObserving?.()
  stopObserving = el ? observeFirstImpression(el, () => viewReporter.report()) : null
})

onBeforeUnmount(() => stopObserving?.())
</script>

<style scoped>
.nl-capture {
  margin: 2rem 0 0.5rem;
}
.nl-capture-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.v-theme--light .nl-capture-card {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.1);
}
.nl-capture-close {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
}
.nl-capture-form {
  max-width: 26rem;
}
.nl-capture-preview {
  display: inline-block;
  margin-top: 16px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
}
.nl-capture-text {
  padding-right: 24px;
}
.nl-capture-text h2 {
  margin-top: 0;
}
.nl-capture-text p {
  margin-top: 8px;
}
/* Auto Ads llegó a meter su unidad como primer hijo de esta fila (medido el 2026-09-19 en /acerca,
   /privacidad, /terminos, /pensiones-estudiantiles-uruguay…): sin envolver, la unidad le quitaba
   656 px y el ícono y el texto quedaban apretados a la derecha. Con wrap la unidad ocupa su propia
   línea, entera, y el ícono y el texto siguen juntos debajo. */
.nl-capture-head {
  flex-wrap: wrap;
}
.nl-capture-text {
  flex: 1 1 0;
  min-width: 0;
}
</style>
