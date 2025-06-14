<template>
  <VBanner
    v-if="showInstallBanner"
    color="primary"
    icon="mdi-download"
    lines="one"
    class="install-pwa-banner"
  >
    <div class="d-flex align-center justify-space-between w-100">
      <div class="banner-content">
        <span class="font-weight-medium"> Instalar Cambio Uruguay </span>
        <br />
        <span class="text-caption">
          {{ $t('accedeRapido') }}
        </span>
      </div>

      <div class="banner-actions">
        <VBtn variant="text" size="small" @click="installApp"> Instalar </VBtn>
        <VBtn icon="mdi-close" size="small" @click="dismissBanner"> </VBtn>
      </div>
    </div>
  </VBanner>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const showInstallBanner = ref(false)

const checkInstallPrompt = () => {
  // Check if it can be installed and is not already installed
  if (process.client) {
    try {
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)',
      ).matches
      const canInstall = !!(window as any).deferredPrompt
      const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed')

      // Show banner if can install, not in standalone and hasn't been dismissed
      showInstallBanner.value = canInstall && !isStandalone && !hasBeenDismissed
    } catch (error) {
      console.error('Error checking install prompt:', error)
      showInstallBanner.value = false
    }
  }
}

const installApp = async () => {
  const deferredPrompt = (window as any).deferredPrompt
  if (deferredPrompt) {
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        ;(window as any).deferredPrompt = null
        showInstallBanner.value = false
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }
  }
}

const dismissBanner = () => {
  showInstallBanner.value = false
  localStorage.setItem('pwa-install-dismissed', 'true')
}

onMounted(() => {
  checkInstallPrompt()

  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    ;(window as any).deferredPrompt = e
    checkInstallPrompt()
  })
})
</script>

<style scoped>
.install-pwa-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
}

.banner-content {
  flex: 1;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 600px) {
  .banner-content .text-caption {
    display: none;
  }
}
</style>
