<template>
  <v-chip class="mt-2 mt-md-0" :color="freshnessColor" size="small" :title="absoluteTime">
    <v-icon start size="small">mdi-clock-outline</v-icon>
    {{ $t('historical.updated') }}: {{ relativeTime }}
  </v-chip>
</template>

<script setup lang="ts">
const { getHealthStatus } = useApiService()
const { locale } = useI18n()

// Use server-side data fetching with automatic hydration
const { data: healthData, error: _error } = await useLazyAsyncData('health-status', async () => {
  const { data, error } = await getHealthStatus()

  if (error || !data) {
    console.error('Failed to fetch health status:', error)
    return null
  }

  return data
})

// Tick so relative time stays accurate while the page is open
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 60_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

// Prod /health nests the timestamp under `sync` (with a server-computed minutesAgo);
// fall back to a legacy top-level `lastSync` for safety.
const lastSyncIso = computed(
  () => healthData.value?.sync?.lastSync ?? healthData.value?.lastSync ?? null
)

const lastSyncDate = computed<Date | null>(() => {
  if (!lastSyncIso.value) return null
  const d = new Date(lastSyncIso.value)
  return isNaN(d.getTime()) ? null : d
})

const minutesAgo = computed(() => {
  // Prefer the server-computed value; recompute locally as the page stays open.
  const serverMins = healthData.value?.sync?.minutesAgo
  if (!lastSyncDate.value) {
    return typeof serverMins === 'number' ? serverMins : null
  }
  return Math.max(0, Math.round((now.value - lastSyncDate.value.getTime()) / 60_000))
})

// Locale-aware "5 minutes ago" via native Intl (no extra deps or i18n keys)
const relativeTime = computed(() => {
  const mins = minutesAgo.value
  if (mins === null) return 'N/A'
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  if (mins < 60) return rtf.format(-mins, 'minute')
  const hours = Math.round(mins / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  return rtf.format(-Math.round(hours / 24), 'day')
})

const absoluteTime = computed(() =>
  lastSyncDate.value ? lastSyncDate.value.toLocaleString() : 'N/A'
)

// Green when fresh, amber when aging, red when clearly stale / unknown
const freshnessColor = computed(() => {
  const mins = minutesAgo.value
  if (mins === null) return 'error'
  if (mins <= 30) return 'success'
  if (mins <= 120) return 'warning'
  return 'error'
})
</script>
