<template>
  <!-- Public page preview and deliberate destination. No background link creation. -->
  <div v-if="targetPath" class="share-buttons">
    <VBtn
      ref="trigger"
      :icon="!label"
      :prepend-icon="label ? 'mdi-share-variant' : undefined"
      :color="color"
      :variant="variant"
      size="small"
      class="font-weight-bold share-trigger"
      :class="{ 'share-trigger--white': color === 'white' && variant === 'flat' }"
      :aria-label="t('share.cta')"
      :title="t('share.cta')"
      @click="openShare"
    >
      <VIcon v-if="!label">mdi-share-variant</VIcon>
      <template v-else>{{ t('share.cta') }}</template>
    </VBtn>

    <VDialog
      v-model="open"
      max-width="520"
      :aria-label="t('share.cta')"
      @after-leave="focusTrigger"
    >
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center pe-2">
          <span class="text-subtitle-1 font-weight-bold">{{ t('share.cta') }}</span>
          <VSpacer />
          <VBtn
            icon="mdi-close"
            variant="text"
            :aria-label="t('panel.close')"
            @click="open = false"
          />
        </VCardTitle>
        <VCardText class="pt-0 share-panel">
          <p class="share-panel__intro">{{ t('panel.invite') }}</p>
          <div v-if="preparing" class="share-panel__loading" role="status">
            <VProgressCircular indeterminate size="20" width="2" />
            <span>{{ t('panel.preparing') }}</span>
          </div>
          <template v-else>
            <img
              v-if="cardUrl"
              :src="cardUrl"
              :alt="shareTitle"
              width="1200"
              height="630"
              class="share-panel__preview"
            />
            <p v-else class="font-weight-bold">{{ shareTitle }}</p>
            <p v-if="notice" class="share-panel__notice" role="status">{{ notice }}</p>
            <VTextField
              :model-value="shareUrl"
              :label="shortened ? t('panel.shortLink') : t('panel.link')"
              readonly
              hide-details
              variant="outlined"
              density="compact"
              class="mt-4"
              @focus="selectLink"
            />
            <p v-if="hasFilters" class="share-panel__hint">{{ t('panel.filters') }}</p>
            <VBtn
              v-if="canNativeShare"
              block
              color="primary"
              variant="flat"
              class="mt-4"
              prepend-icon="mdi-share-variant"
              :loading="sharing"
              @click="nativeShare(false)"
              >{{ t('panel.native') }}</VBtn
            >
            <div class="share-panel__networks">
              <VBtn
                v-for="network in SHARE_NETWORKS"
                :key="network.id"
                :href="links[network.id]"
                :prepend-icon="network.icon"
                target="_blank"
                rel="noopener noreferrer"
                data-external-exit="skip"
                variant="tonal"
                color="link"
                :aria-label="t(network.labelKey)"
                @click="trackShare(network.id)"
                >{{
                  network.id === 'twitter'
                    ? 'X'
                    : network.id === 'whatsapp'
                      ? 'WhatsApp'
                      : network.id === 'telegram'
                        ? 'Telegram'
                        : 'Facebook'
                }}</VBtn
              >
            </div>
            <VBtn
              block
              variant="outlined"
              :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
              @click="copyLink"
            >
              {{ copied ? t('share.copied') : t('share.copy') }}
            </VBtn>
            <div v-if="cardUrl" class="share-panel__card-actions">
              <VBtn
                :href="cardUrl"
                download="cambio-uruguay.png"
                variant="text"
                prepend-icon="mdi-download"
                @click="trackShare('download_card')"
              >
                {{ t('panel.download') }}
              </VBtn>
              <VBtn
                v-if="canShareCard"
                variant="text"
                prepend-icon="mdi-image-outline"
                :loading="sharing"
                @click="nativeShare(true)"
              >
                {{ t('panel.shareCard') }}
              </VBtn>
            </div>
            <p class="share-panel__hint">{{ t('panel.cardHint') }}</p>
            <p class="share-panel__feedback" role="status" aria-live="polite">{{ feedback }}</p>
          </template>
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>

<script setup lang="ts">
import { SHARE_NETWORKS, buildShareLinks } from '~/utils/share'
import { currentSharePath } from '~/utils/shareTarget'
import {
  normalizeShareText,
  SHARED_LINK_TITLE_LENGTH,
  SHARED_LINK_DESCRIPTION_LENGTH,
  type SharedLinkResponse,
} from '~/utils/sharedLinks'
import { renderShareCard } from '~/utils/shareCard'
import { publicShareSummary } from '~/utils/shareSummary'

const props = withDefaults(
  defineProps<{
    url?: string
    text?: string
    description?: string
    label?: boolean
    variant?: 'flat' | 'text' | 'tonal' | 'outlined' | 'elevated' | 'plain'
    color?: string
    placement?: string
  }>(),
  { label: true, variant: 'flat', color: 'white', placement: 'page' }
)

const { t, locale } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      panel: {
        close: 'Cerrar',
        invite: '¿A quién le serviría esto? Mandale la página para decidir juntos.',
        preparing: 'Preparando enlace y tarjeta…',
        shortLink: 'Enlace corto',
        link: 'Enlace para compartir',
        filters:
          'El enlace conserva los filtros públicos. Los resultados se actualizan al abrirlo.',
        native: 'Compartir con una app',
        download: 'Descargar tarjeta',
        shareCard: 'Compartir imagen',
        cardHint: 'La tarjeta incluye el enlace. Los precios y la disponibilidad pueden cambiar.',
        fallback:
          'No pudimos crear el enlace corto. Podés compartir el enlace completo o volver a intentarlo.',
        copyError: 'No se pudo copiar automáticamente. Seleccioná el enlace y copialo.',
        shareError: 'No se pudo abrir la app. Probá con WhatsApp o copiá el enlace.',
        cardError: 'La tarjeta no está disponible. Podés compartir el enlace.',
        footer: 'Abrí el enlace para ver la información actualizada.',
      },
    },
    en: {
      panel: {
        close: 'Close',
        invite: 'Who would find this useful? Send them the page and decide together.',
        preparing: 'Preparing link and card…',
        shortLink: 'Short link',
        link: 'Share link',
        filters: 'The link keeps public filters. Results update when opened.',
        native: 'Share with an app',
        download: 'Download card',
        shareCard: 'Share image',
        cardHint: 'The card includes the link. Prices and availability may change.',
        fallback: 'The short link could not be created. Share the full link or try again.',
        copyError: 'Automatic copying failed. Select the link and copy it.',
        shareError: 'The app could not be opened. Try WhatsApp or copy the link.',
        cardError: 'The card is unavailable. You can still share the link.',
        footer: 'Open the link for up-to-date information.',
      },
    },
    pt: {
      panel: {
        close: 'Fechar',
        invite: 'Para quem isso seria útil? Envie a página para decidirem juntos.',
        preparing: 'Preparando link e cartão…',
        shortLink: 'Link curto',
        link: 'Link para compartilhar',
        filters: 'O link mantém os filtros públicos. Os resultados são atualizados ao abrir.',
        native: 'Compartilhar com um app',
        download: 'Baixar cartão',
        shareCard: 'Compartilhar imagem',
        cardHint: 'O cartão inclui o link. Preços e disponibilidade podem mudar.',
        fallback:
          'Não foi possível criar o link curto. Compartilhe o link completo ou tente novamente.',
        copyError: 'Não foi possível copiar automaticamente. Selecione o link e copie.',
        shareError: 'Não foi possível abrir o app. Tente o WhatsApp ou copie o link.',
        cardError: 'O cartão não está disponível. Você pode compartilhar o link.',
        footer: 'Abra o link para ver as informações atualizadas.',
      },
    },
  },
})
const route = useRoute()
const track = useTrack()
const targetPath = computed(() => currentSharePath(route.fullPath, props.url))
const open = ref(false)
const trigger = ref<{ $el?: HTMLElement } | null>(null)
let openedPath = ''
const preparing = ref(false)
const sharing = ref(false)
const shareUrl = ref('')
const shareTitle = ref('')
const shareDescription = ref('')
const shortened = ref(false)
const hasFilters = ref(false)
const notice = ref('')
const feedback = ref('')
const copied = ref(false)
const canNativeShare = ref(false)
const canShareCard = ref(false)
const cardUrl = ref('')
let cardFile: File | null = null
let generation = 0
const links = computed(() => buildShareLinks({ url: shareUrl.value, text: shareTitle.value }))

function clearCard() {
  if (cardUrl.value) URL.revokeObjectURL(cardUrl.value)
  cardUrl.value = ''
  cardFile = null
  canShareCard.value = false
}

async function openShare() {
  // Some catalogues update history without Vue Router to avoid scrolling on each filter edit.
  const path = currentSharePath(`${window.location.pathname}${window.location.search}`, props.url)
  if (!path) return
  openedPath = route.path
  const request = ++generation
  clearCard()
  open.value = true
  preparing.value = true
  shortened.value = false
  feedback.value = ''
  notice.value = ''
  copied.value = false
  hasFilters.value = path.includes('?')
  shareUrl.value = `https://cambio-uruguay.com${path}`
  shareTitle.value = normalizeShareText(
    props.text || document.title || t('share.defaultText'),
    SHARED_LINK_TITLE_LENGTH
  )
  shareDescription.value = normalizeShareText(
    props.description ||
      publicShareSummary(path, locale.value) ||
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
      '',
    SHARED_LINK_DESCRIPTION_LENGTH
  )
  track('share_open', {
    content_path: route.path,
    has_filters: hasFilters.value,
    share_placement: props.placement,
  })
  try {
    // Saving is explicit. Ordinary public articles already have short canonical URLs.
    if (hasFilters.value) {
      const saved = await $fetch<SharedLinkResponse>('/api/share-links', {
        method: 'POST',
        // Only the destination: the server writes the link's title and description itself.
        body: { path },
        timeout: 10000,
      })
      if (request !== generation) return
      shareUrl.value = saved.url
      shortened.value = true
    }
  } catch {
    if (request !== generation) return
    notice.value = t('panel.fallback')
  }
  if (request !== generation) return
  const payload = { title: shareTitle.value, url: shareUrl.value }
  canNativeShare.value =
    window.isSecureContext &&
    typeof navigator.share === 'function' &&
    (typeof navigator.canShare !== 'function' || navigator.canShare(payload))
  try {
    const blob = await renderShareCard({
      ...payload,
      description: shareDescription.value,
      footer: t('panel.footer'),
    })
    if (request !== generation) return
    cardFile = new File([blob], 'cambio-uruguay.png', { type: 'image/png' })
    cardUrl.value = URL.createObjectURL(blob)
    canShareCard.value =
      canNativeShare.value &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [cardFile] })
  } catch {
    if (request === generation) feedback.value = t('panel.cardError')
  } finally {
    if (request === generation) preparing.value = false
  }
}

async function nativeShare(withCard: boolean) {
  if (sharing.value) return
  sharing.value = true
  feedback.value = ''
  try {
    // No async preparation before share(): preserve transient user activation.
    await navigator.share({
      title: shareTitle.value,
      text: shareTitle.value,
      url: shareUrl.value,
      ...(withCard && cardFile ? { files: [cardFile] } : {}),
    })
    trackShare(withCard ? 'native_card' : 'native')
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError'))
      feedback.value = t('panel.shareError')
  } finally {
    sharing.value = false
  }
}

async function copyLink() {
  feedback.value = ''
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    feedback.value = t('share.copied')
    trackShare('copy')
  } catch {
    copied.value = false
    feedback.value = t('panel.copyError')
  }
}

function selectLink(event: FocusEvent) {
  if (event.target instanceof HTMLInputElement) event.target.select()
}
function focusTrigger() {
  if (route.path === openedPath) trigger.value?.$el?.focus()
}
function trackShare(method: string) {
  // No filters, captions or arbitrary query strings in analytics.
  track('share', {
    method,
    content_type: 'page',
    item_id: route.path,
    short_link: shortened.value,
    share_placement: props.placement,
  })
}
watch(
  () => route.fullPath,
  () => {
    open.value = false
  }
)
watch(open, value => {
  if (!value) {
    generation++
    clearCard()
    preparing.value = false
  }
})
onBeforeUnmount(() => {
  generation++
  clearCard()
})
</script>

<style scoped>
.share-trigger {
  min-height: 44px;
  min-width: 44px;
}
.share-trigger--white {
  color: #121a2e !important;
}
.share-panel__intro {
  margin: 0 0 16px;
  line-height: 1.5;
}
.share-panel__preview {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
}
.share-panel__loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
}
.share-panel__networks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 16px 0;
}
.share-panel__networks :deep(.v-btn) {
  min-height: 44px;
}
.share-panel :deep(.v-btn) {
  min-height: 44px;
}
.share-panel__card-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin-top: 12px;
}
.share-panel__hint {
  font-size: 0.8rem;
  line-height: 1.5;
  margin: 8px 0 0;
}
.share-panel__notice {
  font-size: 0.875rem;
  margin: 12px 0;
}
.share-panel__feedback {
  font-size: 0.875rem;
  margin: 8px 0 0;
  min-height: 1.5em;
}
@media (max-width: 380px) {
  .share-panel__networks {
    grid-template-columns: 1fr;
  }
}
</style>
