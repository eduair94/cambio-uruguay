<template>
  <VCard variant="outlined" class="pa-4 mb-4">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
      <div class="d-flex align-center ga-2">
        <VIcon color="info">mdi-send-circle</VIcon>
        <span class="text-subtitle-2 font-weight-bold">{{ $t('tg.title') }}</span>
      </div>
      <template v-if="linked">
        <div class="d-flex align-center ga-1">
          <VChip color="success" size="small" variant="tonal" prepend-icon="mdi-check">
            {{ $t('tg.linked') }}
          </VChip>
          <VBtn size="small" variant="text" color="error" @click="unlink">
            {{ $t('tg.unlink') }}
          </VBtn>
        </div>
      </template>
      <div v-else class="d-flex flex-column ga-2" style="min-width: 220px">
        <div class="text-caption text-grey">{{ $t('tg.widgetHint') }}</div>
        <ClientOnly>
          <div ref="tgWidget" class="tg-widget" />
        </ClientOnly>
        <VBtn
          variant="text"
          size="small"
          color="info"
          class="align-self-start px-1"
          @click="toggleCode"
        >
          {{ $t('tg.useCode') }}
        </VBtn>
        <div v-if="showCode">
          <VBtn color="info" variant="tonal" size="small" :loading="busy" @click="startLink">
            {{ $t('tg.link') }}
          </VBtn>
          <div v-if="deepLink" class="mt-3">
            <VBtn
              :href="deepLink"
              target="_blank"
              color="info"
              variant="flat"
              size="small"
              prepend-icon="mdi-open-in-new"
            >
              {{ $t('tg.open') }}
            </VBtn>
            <div class="text-caption text-grey mt-2 d-flex align-center">
              <VProgressCircular indeterminate size="14" width="2" class="me-2" />
              {{ $t('tg.waiting') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
const { authFetch } = useAuthFetch()
const linked = ref(false)
const busy = ref(false)
const deepLink = ref('')
let poll: ReturnType<typeof setInterval> | null = null

const config = useRuntimeConfig().public as { telegramBotUsername?: string }
const tgWidget = ref<HTMLElement | null>(null)
const showCode = ref(false)
function toggleCode() {
  showCode.value = !showCode.value
}

// Telegram Login Widget: inject the script with our bot + an onauth callback.
function mountWidget() {
  if (!import.meta.client) return
  const username = config.telegramBotUsername
  if (!username || !tgWidget.value || tgWidget.value.childElementCount > 0) return
  ;(window as any).onTelegramAuth = async (user: Record<string, unknown>) => {
    try {
      await authFetch('/api/me/telegram/link-widget', { method: 'POST', body: user })
      await refresh()
    } catch {
      /* keep the card unlinked; the user can retry or use the code flow */
    }
  }

  const s = document.createElement('script')
  s.async = true
  s.src = 'https://telegram.org/js/telegram-widget.js?22'
  s.setAttribute('data-telegram-login', username)
  s.setAttribute('data-size', 'large')
  s.setAttribute('data-radius', '8')
  s.setAttribute('data-request-access', 'write')
  s.setAttribute('data-onauth', 'onTelegramAuth(user)')
  tgWidget.value.appendChild(s)
}

async function refresh() {
  const r = await authFetch<{ linked: boolean }>('/api/me/telegram/status').catch(() => ({
    linked: false,
  }))
  linked.value = r.linked
  if (linked.value && poll) {
    clearInterval(poll)
    poll = null
    deepLink.value = ''
  }
}

async function startLink() {
  busy.value = true
  try {
    const r = await authFetch<{ deepLink: string }>('/api/me/telegram/link-code', {
      method: 'POST',
    })
    deepLink.value = r.deepLink
    if (!poll) poll = setInterval(refresh, 3000)
  } finally {
    busy.value = false
  }
}

async function unlink() {
  await authFetch('/api/me/telegram', { method: 'DELETE' }).catch(() => {})
  linked.value = false
  if (import.meta.client && tgWidget.value) tgWidget.value.innerHTML = ''
}

watch([linked, tgWidget], () => {
  if (!linked.value) mountWidget()
})

onMounted(async () => {
  await refresh()
  mountWidget()
})
onBeforeUnmount(() => {
  poll && clearInterval(poll)
  if (import.meta.client) delete (window as any).onTelegramAuth
})

defineExpose({ linked })
</script>

<style scoped>
.tg-widget {
  min-height: 40px;
}
</style>
