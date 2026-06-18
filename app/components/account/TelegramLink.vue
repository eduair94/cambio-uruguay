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
      <VBtn v-else color="info" variant="tonal" size="small" :loading="busy" @click="startLink">
        {{ $t('tg.link') }}
      </VBtn>
    </div>

    <div v-if="deepLink && !linked" class="mt-3">
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
  </VCard>
</template>

<script setup lang="ts">
const { authFetch } = useAuthFetch()
const linked = ref(false)
const busy = ref(false)
const deepLink = ref('')
let poll: ReturnType<typeof setInterval> | null = null

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
    const r = await authFetch<{ deepLink: string }>('/api/me/telegram/link-code', { method: 'POST' })
    deepLink.value = r.deepLink
    if (!poll) poll = setInterval(refresh, 3000)
  } finally {
    busy.value = false
  }
}

async function unlink() {
  await authFetch('/api/me/telegram', { method: 'DELETE' }).catch(() => {})
  linked.value = false
}

onMounted(refresh)
onBeforeUnmount(() => poll && clearInterval(poll))

defineExpose({ linked })
</script>
