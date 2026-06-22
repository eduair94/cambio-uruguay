<template>
  <!-- A single "Share" button that opens a dialog with the channels. Drives
       referral traffic + interactions; WhatsApp first (dominant in Uruguay). -->
  <div class="share-buttons">
    <VBtn
      :icon="!label"
      :prepend-icon="label ? 'mdi-share-variant' : undefined"
      color="white"
      variant="flat"
      size="small"
      class="share-trigger font-weight-bold"
      :aria-label="t('share.cta')"
      :title="t('share.cta')"
      @click="open = true"
    >
      <VIcon v-if="!label">mdi-share-variant</VIcon>
      <template v-else>{{ t('share.cta') }}</template>
    </VBtn>

    <VDialog v-model="open" max-width="400">
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center pe-2">
          <VIcon start color="primary">mdi-share-variant</VIcon>
          <span class="text-subtitle-1 font-weight-bold">{{ t('share.cta') }}</span>
          <VSpacer />
          <VBtn
            icon
            variant="text"
            size="small"
            :aria-label="t('a11y.close')"
            @click="open = false"
          >
            <VIcon>mdi-close</VIcon>
          </VBtn>
        </VCardTitle>

        <VCardText class="pt-0">
          <VBtn
            v-if="canNativeShare"
            block
            color="primary"
            variant="flat"
            class="mb-3"
            prepend-icon="mdi-cellphone-link"
            @click="nativeShare"
          >
            {{ t('share.cta') }}…
          </VBtn>

          <VList class="py-0" lines="one" bg-color="transparent">
            <VListItem
              v-for="n in SHARE_NETWORKS"
              :key="n.id"
              :href="links[n.id]"
              target="_blank"
              rel="noopener noreferrer"
              class="share-row px-2"
              rounded="lg"
              @click="onPick(n.id)"
            >
              <template #prepend>
                <VAvatar :color="n.color" size="36" class="me-1">
                  <VIcon color="white" size="20">{{ n.icon }}</VIcon>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-medium">{{ t(n.labelKey) }}</VListItemTitle>
            </VListItem>

            <VListItem class="share-row px-2" rounded="lg" @click="copyLink">
              <template #prepend>
                <VAvatar :color="copied ? 'success' : 'grey-darken-2'" size="36" class="me-1">
                  <VIcon color="white" size="20">{{
                    copied ? 'mdi-check' : 'mdi-link-variant'
                  }}</VIcon>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-medium">
                {{ copied ? t('share.copied') : t('share.copy') }}
              </VListItemTitle>
            </VListItem>
          </VList>
        </VCardText>
      </VCard>
    </VDialog>
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
    /** Show the trigger button's text label (else icon-only). */
    label?: boolean
  }>(),
  { label: true }
)

const { t } = useI18n()
const requestUrl = useRequestURL()

const open = ref(false)
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
    open.value = false
  } catch {
    // User dismissed the share sheet, or it is unavailable; keep the dialog open.
  }
}

const onPick = (id: ShareNetwork) => {
  track(id)
  open.value = false
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
    if (typeof gtag === 'function')
      gtag('event', 'share', { method: channel, item_id: shareUrl.value })
  } catch {
    // analytics optional
  }
}
</script>

<style scoped>
/* High-contrast trigger so it reads on the coloured tool/header gradients. */
.share-trigger {
  color: #1a1a1a !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}

.share-row {
  transition: background-color 0.15s ease;
}

.share-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
