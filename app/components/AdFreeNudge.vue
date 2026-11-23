<template>
  <!-- The offer to browse without ads, where the closing ad goes: the moment a reader is looking
       at an ad is the moment "sin anuncios" means something. Only on pages that carry ads, only
       for viewers who get them, and site UI, never styled like the ad next to it. -->
  <aside
    v-if="variant"
    ref="root"
    class="ad-free-nudge"
    :class="`ad-free-nudge--${variant}`"
    aria-label="Navegar sin anuncios"
  >
    <template v-if="variant === 'card'">
      <div class="ad-free-nudge__copy">
        <p class="ad-free-nudge__title">¿Preferís leer sin anuncios?</p>
        <p class="ad-free-nudge__text">
          Con un aporte único desde <strong>{{ fromAmount }}</strong
          >, tu cuenta queda sin anuncios {{ AD_FREE_MONTHS }} meses en todos tus dispositivos. Sin
          suscripción.
        </p>
      </div>
      <div class="ad-free-nudge__actions">
        <VBtn
          color="primary"
          variant="flat"
          class="text-none ad-free-nudge__cta"
          :to="offerPath"
          @click="select"
        >
          Quitar anuncios
        </VBtn>
        <VBtn variant="text" size="small" class="text-none" @click="dismiss">Ahora no</VBtn>
      </div>
    </template>
    <NuxtLink v-else :to="offerPath" class="ad-free-nudge__link" @click="select">
      <VIcon size="16">mdi-cancel</VIcon>
      Navegá sin anuncios
    </NuxtLink>
  </aside>
</template>

<script setup lang="ts">
import {
  AD_FREE_AMOUNTS,
  AD_FREE_MONTHS,
  formatAdFreeAmount,
  viewerLoadsAdsense,
} from '~/utils/adFree'
import {
  NUDGE_DISMISS_KEY,
  NUDGE_PAGEVIEWS_KEY,
  NUDGE_SESSION_KEY,
  adFreeOffered,
  nudgeVariant,
  promotionParams,
  type AdFreeSlot,
} from '~/utils/adFreeFunnel'
import { observeFirstImpression } from '~/utils/newsletterFunnel'

const route = useRoute()
const localePath = useLocalePath()
const track = useTrack()
const viewer = useAdFreeViewer()
const { scriptAllowed } = useAds()
const configured = (useRuntimeConfig().public.adFree ?? {}) as {
  mercadopago?: boolean
  paypal?: boolean
}

const offerPath = computed(() => localePath('/cuenta/sin-publicidad'))
// "desde $ 200": the smallest suggestion of the first medium offered.
const fromAmount = computed(() => {
  const limits = configured.mercadopago ? AD_FREE_AMOUNTS.mercadopago : AD_FREE_AMOUNTS.paypal
  return formatAdFreeAmount(limits.suggested[0]!, limits.currency)
})

const decided = ref<'card' | 'link' | null>(null)
const dismissed = ref(false)
// Nothing for a donor, a page without ads, or a site with no payment medium configured.
const eligible = computed(
  () => scriptAllowed.value && viewerLoadsAdsense(viewer.value) && adFreeOffered(configured)
)
const variant = computed(() => (!eligible.value || dismissed.value ? null : decided.value))
const slot = computed<AdFreeSlot>(() =>
  variant.value === 'card' ? 'content-end' : 'content-end-link'
)

function storage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

const root = ref<HTMLElement | null>(null)
let stop: (() => void) | null = null

function onVisible() {
  const session = storage('session')
  if (variant.value === 'card') session?.setItem(NUDGE_SESSION_KEY, '1')
  // The quiet link is reported once per session: one impression per page would only add noise.
  if (variant.value === 'link') {
    if (session?.getItem(`${NUDGE_SESSION_KEY}:link`) === '1') return
    session?.setItem(`${NUDGE_SESSION_KEY}:link`, '1')
  }
  track('view_promotion', { ...promotionParams(slot.value), content_path: route.path })
}

function select() {
  track('select_promotion', { ...promotionParams(slot.value), content_path: route.path })
}

function dismiss() {
  dismissed.value = true
  try {
    storage('local')?.setItem(NUDGE_DISMISS_KEY, String(Date.now()))
  } catch {
    // The refusal still holds for this page.
  }
  track('ad_free_nudge_dismiss', { content_path: route.path })
}

// Decided once per page, when the viewer turns out to get ads on it (right after hydration, or a
// few seconds later for a signed-in visitor the server had to answer about).
function decide() {
  // One page with ads seen in this browser, by a viewer who gets ads: donors and pages without
  // ads do not count toward the card.
  const local = storage('local')
  let pageViews = 1
  try {
    pageViews = Math.min(9999, (Number(local?.getItem(NUDGE_PAGEVIEWS_KEY)) || 0) + 1)
    local?.setItem(NUDGE_PAGEVIEWS_KEY, String(pageViews))
  } catch {
    // Without storage every page is a first page: the quiet link only.
  }
  const dismissedAt = Number(local?.getItem(NUDGE_DISMISS_KEY)) || null
  decided.value = nudgeVariant({
    pageViews,
    dismissedAt,
    cardShownThisSession: storage('session')?.getItem(NUDGE_SESSION_KEY) === '1',
    now: Date.now(),
  })
}

onMounted(() => {
  const stopWatching = watch(
    eligible,
    ok => {
      if (!ok || decided.value) return
      decide()
      queueMicrotask(() => stopWatching())
    },
    { immediate: true }
  )
})

watch(root, el => {
  stop?.()
  stop = el ? observeFirstImpression(el, onVisible) : null
})
onBeforeUnmount(() => stop?.())
</script>

<style scoped>
.ad-free-nudge {
  margin-block: 16px 8px;
}

.ad-free-nudge--card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 16px 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.ad-free-nudge__copy {
  flex: 1 1 320px;
  min-width: 0;
}

.ad-free-nudge__title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
}

.ad-free-nudge__text {
  margin: 0;
  max-width: 62ch;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.ad-free-nudge__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.ad-free-nudge__cta {
  min-height: 44px;
  font-weight: 700;
}

.ad-free-nudge--link {
  display: flex;
  justify-content: flex-end;
}

.ad-free-nudge__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 4px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  text-underline-offset: 3px;
}

.ad-free-nudge__link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

@media print {
  .ad-free-nudge {
    display: none;
  }
}
</style>
