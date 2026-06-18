<template>
  <!-- Social share row. Drives referral traffic + interactions: every target
       links back to this page. WhatsApp first (dominant in Uruguay). On mobile
       the native share sheet is offered; network buttons are always available. -->
  <div class="share-buttons" :aria-label="t('share.aria')">
    <span v-if="label" class="share-buttons__label text-caption">{{ t('share.label') }}</span>

    <VBtn
      v-if="canNativeShare"
      class="share-buttons__native"
      color="primary"
      variant="tonal"
      size="small"
      prepend-icon="mdi-share-variant"
      @click="nativeShare"
    >
      {{ t('share.cta') }}
    </VBtn>

    <VBtn
      v-for="n in SHARE_NETWORKS"
      :key="n.id"
      :href="links[n.id]"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="t(n.labelKey)"
      :title="t(n.labelKey)"
      icon
      size="small"
      variant="text"
      class="share-buttons__net"
      @click="track(n.id)"
    >
      <VIcon :color="n.color">{{ n.icon }}</VIcon>
    </VBtn>

    <VBtn
      :aria-label="copied ? t('share.copied') : t('share.copy')"
      :title="copied ? t('share.copied') : t('share.copy')"
      icon
      size="small"
      variant="text"
      class="share-buttons__net"
      @click="copyLink"
    >
      <VIcon :color="copied ? 'success' : undefined">{{ copied ? 'mdi-check' : 'mdi-link-variant' }}</VIcon>
    </VBtn>
  </div>
</template>

<script setup lang="ts">
import { SHARE_NETWORKS, buildShareLinks, type ShareNetwork } from '~/utils/share'

const props = withDefaults(
  defineProps<{
    /** Canonical page URL to share. Defaults to the current request URL. */
    url?: string
    /** Share message. Defaults to a generic localized line. */
    text?: string
    /** Show the leading "Share:" label. */
    label?: boolean
  }>(),
  { label: true }
)

const { t } = useI18n()
const requestUrl = useRequestURL()

const shareUrl = computed(() => props.url || `${requestUrl.origin}${requestUrl.pathname}`)
const shareText = computed(() => props.text || t('share.defaultText'))
const links = computed(() => buildShareLinks({ url: shareUrl.value, text: shareText.value }))

// navigator.share only exists in the browser (mostly mobile); gate on mount.
const canNativeShare = ref(false)
onMounted(() => {
  canNativeShare.value = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
})

const nativeShare = async () => {
  try {
    await navigator.share({ title: shareText.value, text: shareText.value, url: shareUrl.value })
    track('native')
  } catch {
    // User dismissed the share sheet, or it is unavailable; ignore.
  }
}

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    track('copy')
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Clipboard unavailable (insecure context); no-op.
  }
}
onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})

// Best-effort analytics: GA gtag if present, else silent.
function track(channel: ShareNetwork | 'native' | 'copy') {
  try {
    // @ts-expect-error gtag is injected globally by the analytics plugin.
    if (typeof gtag === 'function') gtag('event', 'share', { method: channel, item_id: shareUrl.value })
  } catch {
    // analytics optional
  }
}
</script>

<style scoped>
.share-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.share-buttons__label {
  color: rgba(255, 255, 255, 0.7);
  margin-right: 0.25rem;
}

.share-buttons__net :deep(.v-icon) {
  transition: transform 0.15s ease;
}

.share-buttons__net:hover :deep(.v-icon) {
  transform: scale(1.15);
}
</style>
