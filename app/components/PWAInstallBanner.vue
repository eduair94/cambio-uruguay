<template>
  <div>
    <!-- PWA Install Banner -->
    <v-snackbar
      v-model="showInstallPrompt"
      :timeout="-1"
      color="primary"
      bottom
      left
      multi-line
      class="pwa-install-banner"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-3">mdi-download</v-icon>
        <div>
          <div class="font-weight-medium">{{ $t('pwa.installTitle') }}</div>
          <div class="text-caption">{{ $t('pwa.installSubtitle') }}</div>
        </div>
      </div>
      <template #actions="{ isActive }">
        <v-btn color="white" text @click="installPWA">
          {{ $t('pwa.install') }}
        </v-btn>
        <v-btn color="white" text v-bind="isActive" @click="dismissInstallPrompt">
          {{ $t('pwa.dismiss') }}
        </v-btn>
      </template>
    </v-snackbar>

    <!-- PWA Update Available Banner -->
    <v-snackbar v-model="showUpdatePrompt" :timeout="-1" color="info" bottom right>
      {{ $t('pwa.updateAvailable') }}
      <template #actions="{ isActive }">
        <v-btn color="white" text @click="updatePWA">
          {{ $t('pwa.update') }}
        </v-btn>
        <v-btn color="white" text v-bind="isActive" @click="showUpdatePrompt = false">
          {{ $t('pwa.dismiss') }}
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
// Reactive state
const showInstallPrompt = ref(false)
const showUpdatePrompt = ref(false)
const needRefresh = ref(false)
let deferredPrompt: any = null

// Check if in standalone mode
const isStandalone = computed(() => {
  if (import.meta.client) {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )
  }
  return false
})

// PWA update detection - using custom service worker detection
onMounted(() => {
  if (import.meta.client && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              needRefresh.value = true
              showUpdatePrompt.value = true
            }
          })
        }
      })
    })
  }

  // Listen for beforeinstallprompt event - only on client
  if (import.meta.client) {
    window.addEventListener('beforeinstallprompt', e => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      deferredPrompt = e

      // Check if already dismissed or in standalone mode
      const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed')
      if (!hasBeenDismissed && !isStandalone.value) {
        showInstallPrompt.value = true
      }
    })

    // Listen for successful app installation
    window.addEventListener('appinstalled', () => {
      showInstallPrompt.value = false
      deferredPrompt = null
    })
  }
})

// Methods
const installPWA = async () => {
  try {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt()
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      deferredPrompt = null
      showInstallPrompt.value = false
    }
  } catch (error) {
    console.error('Error installing PWA:', error)
  }
}

const dismissInstallPrompt = () => {
  showInstallPrompt.value = false
  deferredPrompt = null
  localStorage.setItem('pwa-install-dismissed', 'true')
}

const updatePWA = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      } else {
        window.location.reload()
      }
    } else {
      window.location.reload()
    }
    showUpdatePrompt.value = false
  } catch (error) {
    console.error('Error updating PWA:', error)
    // Fallback to page reload
    window.location.reload()
  }
}
</script>

<style scoped>
.pwa-install-banner {
  z-index: 9999;
}
</style>
