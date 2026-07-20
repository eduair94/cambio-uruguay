<template>
  <!-- Sends a GENERATED message (a rental post, a customs claim, a reclamo) to its recipient:
       an authority inbox, a Facebook group, WhatsApp… A companion to the plain "Copiar" button —
       the reader still gets the text, but also a one-click route to where it should go. -->
  <div class="send-message d-inline-flex">
    <VBtn
      :color="triggerColor"
      :variant="triggerVariant"
      :size="size"
      :disabled="disabled || !text"
      prepend-icon="mdi-send-outline"
      class="font-weight-bold"
      @click="open = true"
    >
      {{ triggerLabel }}
    </VBtn>

    <VDialog v-model="open" max-width="460" :aria-label="dialogTitle">
      <VCard rounded="lg">
        <VCardTitle id="send-msg-title" class="d-flex align-center pe-2">
          <VIcon start color="primary">mdi-send-outline</VIcon>
          <span class="text-subtitle-1 font-weight-bold">{{ dialogTitle }}</span>
          <VSpacer />
          <VBtn icon variant="text" size="small" aria-label="Cerrar" @click="open = false">
            <VIcon>mdi-close</VIcon>
          </VBtn>
        </VCardTitle>

        <VCardText class="pt-0">
          <p v-if="intro" class="text-body-2 text-medium-emphasis mb-3">{{ intro }}</p>

          <VBtn
            v-if="canNativeShare"
            block
            color="primary"
            variant="flat"
            class="mb-3"
            prepend-icon="mdi-cellphone-link"
            @click="doNative"
          >
            Compartir…
          </VBtn>

          <VList class="py-0" lines="two" bg-color="transparent">
            <VListItem
              v-for="(a, i) in resolved"
              :key="i"
              :href="a.href"
              :target="a.href && isWebLink(a.href) ? '_blank' : undefined"
              :rel="a.href && isWebLink(a.href) ? 'noopener noreferrer' : undefined"
              class="send-row px-2"
              rounded="lg"
              @click="onPick(a)"
            >
              <template #prepend>
                <VAvatar :color="a.color || 'primary'" size="36" class="me-1">
                  <VIcon color="white" size="20">{{ a.icon || 'mdi-send' }}</VIcon>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-medium">{{ a.label }}</VListItemTitle>
              <VListItemSubtitle v-if="a.note" class="send-note">{{ a.note }}</VListItemSubtitle>
            </VListItem>

            <!-- Always offer plain copy as the reliable fallback. -->
            <VListItem class="send-row px-2" rounded="lg" @click="doCopy">
              <template #prepend>
                <VAvatar :color="copied ? 'success' : 'grey-darken-2'" size="36" class="me-1">
                  <VIcon color="white" size="20">{{
                    copied ? 'mdi-check' : 'mdi-content-copy'
                  }}</VIcon>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-medium">
                {{ copied ? 'Texto copiado' : 'Copiar el texto' }}
              </VListItemTitle>
            </VListItem>
          </VList>

          <VAlert
            v-if="toast"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-3"
            icon="mdi-clipboard-check-outline"
          >
            {{ toast }}
          </VAlert>
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>

<script setup lang="ts">
import {
  bodyTooLongForMailto,
  encodeMailto,
  facebookShare,
  telegramShare,
  whatsappShare,
  type SendAction,
} from '~/utils/messageChannels'

// `redditSubmit` and other builders are used by pages to construct `openUrl`s; the component only
// needs the four builders above plus the raw `openUrl`.

const props = withDefaults(
  defineProps<{
    /** The generated message body to send. */
    text: string
    /** Routing options; the page owns the recipient logic. */
    actions: SendAction[]
    /** Trigger button label. */
    triggerLabel?: string
    /** Dialog title. */
    dialogTitle?: string
    /** Short intro line inside the dialog (e.g. "Elegí a dónde enviarlo"). */
    intro?: string
    triggerColor?: string
    triggerVariant?: 'flat' | 'text' | 'tonal' | 'outlined' | 'elevated' | 'plain'
    size?: string
    disabled?: boolean
  }>(),
  {
    triggerLabel: 'Enviar',
    dialogTitle: 'Enviar el mensaje',
    intro: '',
    triggerColor: 'primary',
    triggerVariant: 'tonal',
    size: 'small',
  }
)

const open = ref(false)
const copied = ref(false)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

/** Concrete rows: resolve each action's href + whether the body must be pasted (mailto ceiling). */
const resolved = computed(() =>
  props.actions.map(a => {
    let href: string | undefined
    let note = a.note
    // `mustPaste` = the chosen channel CANNOT carry the body, so we stage it on the clipboard and
    // tell the user to paste. It must reflect what actually happens, not a static flag: a mailto
    // that fits its body, or a wa.me/telegram link, carries the text — telling the user to paste
    // then would contradict itself. So we derive it per channel from whether the body was dropped.
    let mustPaste = false

    if (a.channel === 'email') {
      href = encodeMailto({ to: a.to, subject: a.subject, body: props.text })
      // Only ask to paste when the body did NOT fit into the mailto (over the ceiling → dropped).
      mustPaste = bodyTooLongForMailto(props.text)
      if (mustPaste)
        note =
          note ||
          'El correo es largo: te copiamos el texto para que lo pegues en el cuerpo del mensaje.'
    } else if (a.channel === 'whatsapp') {
      href = a.openUrl || whatsappShare(props.text) // carries the text in the URL — no paste
    } else if (a.channel === 'telegram') {
      href = a.openUrl || telegramShare(props.text) // carries the text in the URL — no paste
    } else if (a.channel === 'facebook') {
      href = a.openUrl || facebookShare(a.to || '')
      if (a.openUrl) {
        mustPaste = true // a group: Facebook can't prefill the post, so paste it
        note = note || 'Facebook no deja pre-cargar el texto: te lo copiamos, pegalo en el grupo.'
      }
    } else if (a.channel === 'link') {
      href = a.openUrl
      mustPaste = a.copyFirst ?? false // a login-gated form / Reddit body can't carry the text
    }
    return { ...a, href, note, mustPaste }
  })
)

/** http(s) links open in a new tab; mailto:/tel: must NOT (they'd leave a blank tab). */
function isWebLink(href: string): boolean {
  return /^https?:/i.test(href)
}

const canNativeShare = ref(false)
onMounted(() => {
  canNativeShare.value = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
})

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 4000)
}

async function copyBody(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(props.text)
    return true
  } catch {
    return false
  }
}

// Row click: the <a href> navigates natively (no popup block). We copy the body first when the
// channel can't carry it (email over the limit, or a Facebook group). Copy is fired inside the
// same user gesture, which the clipboard API allows.
function onPick(a: (typeof resolved.value)[number]) {
  track(a.channel)
  if (a.mustPaste) {
    void copyBody().then(ok => {
      if (ok) showToast('Texto copiado. Pegalo (Ctrl/Cmd+V) en el mensaje.')
    })
  }
  // Leave the dialog open briefly so the toast is visible; the anchor already navigated.
}

async function doCopy() {
  copied.value = await copyBody()
  track('copy')
  if (copied.value) setTimeout(() => (copied.value = false), 2000)
}

async function doNative() {
  try {
    await navigator.share({ text: props.text })
    track('native')
    open.value = false
  } catch {
    // dismissed or unavailable — keep the dialog open
  }
}

function track(channel: string) {
  try {
    // @ts-expect-error gtag injected globally by the analytics plugin
    if (typeof gtag === 'function') gtag('event', 'send_message', { method: channel })
  } catch {
    // analytics optional
  }
}

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.send-row {
  transition: background-color 0.15s ease;
}
.send-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
.send-note {
  white-space: normal;
  line-height: 1.35;
  opacity: 0.85;
}
</style>
