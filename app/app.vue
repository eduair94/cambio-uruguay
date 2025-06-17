<template>
  <div>
    <!-- Main App -->
    <NuxtLoadingIndicator />
    <NuxtLayout name="default">
      <NuxtPage />
    </NuxtLayout>

    <!-- PWA Network Status - Client Only -->
    <ClientOnly>
      <PWANetworkStatus />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// Handle hydration and errors
onErrorCaptured((error) => {
  console.error('App error captured:', error)
  return false
})

// Global error handling
onErrorCaptured((error) => {
  console.error('Global error captured:', error)
  // You can add Sentry error reporting here if needed
  return false
})
</script>
