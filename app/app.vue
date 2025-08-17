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

const hideFeedback = () => {
  document.head.insertAdjacentHTML(
    'beforeend',
    `<style type="text/css" class="custom_style_list">
                    ._hj_feedback_container {
                      display:none!important;
                    }
            </style>`,
  )
}

const hideWidgets = (att = 0) => {
  const t = (window as any).Tawk_API
  if (t?.hideWidget) {
    localStorage.setItem('hideWidgets', '1')
    t.hideWidget()
    hideFeedback()
  } else {
    nextTick(() => {
      att++
      if (att === 10) {
        console.log('hide widget', att)
        return
      }
      hideWidgets(att)
    })
  }
}

onMounted(() => {
  // This is a good place to initialize any global state or perform actions
  const hasToHideWidgets = localStorage.getItem('hideWidgets')
  if (hasToHideWidgets === 'true') {
    hideWidgets()
  }
})
</script>
