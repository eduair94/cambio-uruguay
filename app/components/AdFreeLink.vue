<template>
  <!-- The offer to browse without ads as a quiet, persistent entry (a donation widget, the footer).
       Nothing for a donor or while no payment medium is configured; GA4 sees it as a promotion. -->
  <span v-if="shown" ref="root" class="ad-free-link" :class="`ad-free-link--${variant}`">
    <VBtn
      v-if="variant === 'button'"
      :to="localePath('/cuenta/sin-publicidad')"
      variant="flat"
      color="primary"
      size="small"
      prepend-icon="mdi-cancel"
      class="text-none ad-free-link__btn"
      @click="select"
    >
      {{ label }}
    </VBtn>
    <NuxtLink
      v-else
      :to="localePath('/cuenta/sin-publicidad')"
      class="ad-free-link__a"
      @click="select"
    >
      <VIcon size="18" aria-hidden="true">mdi-cancel</VIcon>
      {{ label }}
    </NuxtLink>
  </span>
</template>

<script setup lang="ts">
import { viewerShowsAds } from '~/utils/adFree'
import { adFreeOffered, promotionParams, type AdFreeSlot } from '~/utils/adFreeFunnel'
import { isExtraLocale } from '~/utils/locales'
import { observeFirstImpression } from '~/utils/newsletterFunnel'

const props = withDefaults(defineProps<{ placement: AdFreeSlot; variant?: 'button' | 'link' }>(), {
  variant: 'link',
})

const localePath = useLocalePath()
const { locale } = useI18n()
const track = useTrack()
const viewer = useAdFreeViewer()
const offered = adFreeOffered(
  useRuntimeConfig().public.adFree as { mercadopago?: boolean; paypal?: boolean }
)
// `unknown` (SSR, hydration) keeps it: hiding it for everyone until the answer would move the page.
const shown = computed(() => offered && viewerShowsAds(viewer.value))

// Inline like AccountMenu's copy; the machine-translated locales read English.
const label = computed(() => {
  if (locale.value === 'pt') return 'Navegar sem anúncios'
  if (locale.value === 'en' || isExtraLocale(locale.value)) return 'Browse without ads'
  return 'Navegá sin anuncios'
})

function select() {
  track('select_promotion', promotionParams(props.placement))
}

const root = ref<HTMLElement | null>(null)
let stop: (() => void) | null = null
const sessionKey = computed(() => `cu_adfree_promo_seen:${props.placement}`)

function onVisible() {
  // One impression per slot and session: the footer is on every page.
  try {
    if (window.sessionStorage.getItem(sessionKey.value)) return
    window.sessionStorage.setItem(sessionKey.value, '1')
  } catch {
    // Without storage, report it anyway.
  }
  track('view_promotion', promotionParams(props.placement))
}

watch(root, el => {
  stop?.()
  stop = el ? observeFirstImpression(el, onVisible) : null
})
onBeforeUnmount(() => stop?.())
</script>

<style scoped>
.ad-free-link__a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  color: inherit;
  font-size: 0.875rem;
  text-underline-offset: 3px;
}

.ad-free-link__a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

.ad-free-link__btn {
  font-weight: 700;
}
</style>
