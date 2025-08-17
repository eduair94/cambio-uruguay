<template>
  <v-chip class="mt-2 mt-md-0" color="success" size="small">
    <v-icon start size="small">mdi-clock-outline</v-icon>
    {{ $t('historical.updated') }}: {{ lastUpdate }}
  </v-chip>
</template>

<script setup lang="ts">
const { getHealthStatus } = useApiService()

// Use server-side data fetching with automatic hydration
const { data: healthData, error: _error } = await useLazyAsyncData(
  'health-status',
  async () => {
    const { data, error } = await getHealthStatus()

    if (error || !data) {
      console.error('Failed to fetch health status:', error)
      return null
    }

    return data
  },
)

// Computed property to format the lastUpdate
const lastUpdate = computed(() => {
  if (!healthData.value?.lastSync) {
    return 'N/A'
  }

  try {
    const date = new Date(healthData.value.lastSync)
    return date.toLocaleString()
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'N/A'
  }
})
</script>
