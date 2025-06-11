<template>
    <div>
  <v-snackbar
    v-model="showOfflineSnackbar"
    :timeout="-1"
    color="error"
    bottom
    left
  >
    {{ $t('pwa.offline') || 'Estás sin conexión' }}
    <template #action="{ attrs }">
      <v-btn
        color="white"
        text
        v-bind="attrs"
        @click="showOfflineSnackbar = false"
      >
        {{ $t('pwa.dismiss') || 'Cerrar' }}
      </v-btn>
    </template>
  </v-snackbar>

  <v-snackbar
    v-model="showOnlineSnackbar"
    :timeout="3000"
    color="success"
    bottom
    left
  >
    {{ $t('pwa.onlineAgain') || 'Estás conectado nuevamente' }}
  </v-snackbar>
  </div>
</template>

<script lang="ts">
export default {
  name: 'PWANetworkStatus',
  data() {
    return {
      showOfflineSnackbar: false,
      showOnlineSnackbar: false
    }
  },
  mounted() {
      this.setupNetworkListeners()
  },
  beforeDestroy() {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
  },
  methods: {
    setupNetworkListeners() {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
      // Check initial status
      if (!navigator.onLine) {
        this.showOfflineSnackbar = true
      }
    },
    handleOnline() {
      this.showOfflineSnackbar = false
      this.showOnlineSnackbar = true
    },
    handleOffline() {
      this.showOnlineSnackbar = false
      this.showOfflineSnackbar = true
    }
  }
}
</script>
