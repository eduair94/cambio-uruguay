<template>
  <v-banner
    v-show="showInstallBanner"
    color="primary"
    icon="mdi-download"
    single-line
    transition="slide-y-transition"
    class="install-pwa-banner"
  >
    <div class="d-flex align-center justify-space-between w-100">
      <div class="banner-content">
        <span class="font-weight-medium">
          {{ $t('pwa.installTitle') || 'Instalar Cambio Uruguay' }}
        </span>
        <br>
        <span class="text-caption">
          {{ $t('pwa.installDescription') || 'Accede más rápido desde tu pantalla de inicio' }}
        </span>
      </div>
      
      <div class="banner-actions">
        <v-btn
          text
          small
          @click="installApp"
        >
          {{ $t('pwa.install') || 'Instalar' }}
        </v-btn>
        <v-btn
          icon
          small
          @click="dismissBanner"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
    </div>
  </v-banner>
</template>

<script>
import Vue from 'vue'

export default Vue.extend({
  name: 'PWAInstallBanner',
  data() {
    return {
      showInstallBanner: false,
    }
  },
  mounted() {
    this.checkInstallPrompt()
  },
  methods: {
    checkInstallPrompt() {
      // Verificar si se puede instalar y no está ya instalada
      if (process.client && this.$pwaUtils) {
        const isStandalone = this.$pwaUtils.isStandalone
        const canInstall = this.$pwaUtils.canInstall()
        const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed')
        
        // Mostrar banner si se puede instalar, no está en standalone y no ha sido descartado
        this.showInstallBanner = canInstall && !isStandalone && !hasBeenDismissed
      } else {
        // For testing purposes, if pwaUtils is not available
        this.showInstallBanner = false
      }
    },
    async installApp() {
      if (this.$pwaUtils && this.$pwaUtils.install) {
        try {
          await this.$pwaUtils.install()
          this.showInstallBanner = false
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error installing PWA:', error)
        }
      }
    },
    dismissBanner() {
      this.showInstallBanner = false
      localStorage.setItem('pwa-install-dismissed', 'true')
    }
  }
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
