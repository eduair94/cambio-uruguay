<template>
  <VBtn
    v-if="store.isLoggedIn"
    :color="done ? 'success' : 'primary'"
    variant="tonal"
    size="small"
    :prepend-icon="done ? 'mdi-check' : 'mdi-content-save-outline'"
    :loading="busy"
    @click="save"
  >
    {{ done ? $t('account.saved') : $t('account.save') }}
  </VBtn>
</template>

<script setup lang="ts">
import type { SavedRateRef } from '~/composables/useSavedDrift'

const props = defineProps<{
  kind: 'conversion' | 'tool'
  toolSlug: string
  title: string
  inputs: Record<string, any>
  result: Record<string, any>
  rates: SavedRateRef[]
}>()

const store = useAuthStore()
const { authFetch } = useAuthFetch()
const busy = ref(false)
const done = ref(false)

async function save() {
  busy.value = true
  try {
    await authFetch('/api/me/saved', {
      method: 'POST',
      body: {
        kind: props.kind,
        toolSlug: props.toolSlug,
        title: props.title,
        inputs: props.inputs,
        result: props.result,
        snapshot: { capturedAt: new Date().toISOString(), rates: props.rates },
      },
    })
    done.value = true
    setTimeout(() => (done.value = false), 2500)
  } finally {
    busy.value = false
  }
}
</script>
