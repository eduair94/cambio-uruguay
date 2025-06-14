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
      <template #actions="{ isActive }">
        <v-btn
          color="white"
          text
          v-bind="isActive"
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

<script setup lang="ts">
// Use i18n
const { t } = useI18n()

// Reactive state
const showOfflineSnackbar = ref(false)
const showOnlineSnackbar = ref(false)

// Methods
const handleOnline = () => {
  showOfflineSnackbar.value = false
  showOnlineSnackbar.value = true
}

const handleOffline = () => {
  showOnlineSnackbar.value = false
  showOfflineSnackbar.value = true
}

const setupNetworkListeners = () => {
  if (process.client) {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial status
    if (!navigator.onLine) {
      showOfflineSnackbar.value = true
    }
  }
}

// Lifecycle
onMounted(() => {
  setupNetworkListeners()
})

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
})
</script>
