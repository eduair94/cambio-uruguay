<template>
  <div>
    <v-snackbar v-model="showOfflineSnackbar" :timeout="-1" color="error" bottom left>
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-wifi-off</v-icon>
        <div>
          <div>{{ savedAtLabel ? $t('pwa.showingSavedData') : $t('pwa.offline') }}</div>
          <div v-if="savedAtLabel" class="text-caption">{{ savedAtLabel }}</div>
        </div>
      </div>
      <template #actions="{ isActive }">
        <v-btn color="white" text v-bind="isActive" @click="showOfflineSnackbar = false">
          {{ $t('pwa.dismiss') }}
        </v-btn>
      </template>
    </v-snackbar>

    <v-snackbar v-model="showOnlineSnackbar" :timeout="3000" color="success" bottom left>
      {{ $t('pwa.onlineAgain') || 'Estás conectado nuevamente' }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { loadSnapshot, snapshotAgeLabel } from '~/utils/ratesSnapshot'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Reactive state
const showOfflineSnackbar = ref(false)
const showOnlineSnackbar = ref(false)
const savedAtLabel = ref('')

const refreshSavedLabel = () => {
  const snap = loadSnapshot()
  savedAtLabel.value = snap ? t('pwa.savedDataAt', { time: snapshotAgeLabel(snap.ts) }) : ''
}

// Methods
const handleOnline = () => {
  showOfflineSnackbar.value = false
  showOnlineSnackbar.value = true
}

const handleOffline = () => {
  showOnlineSnackbar.value = false
  refreshSavedLabel()
  showOfflineSnackbar.value = true
}

const setupNetworkListeners = () => {
  if (import.meta.client) {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial status only on client side
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      refreshSavedLabel()
      showOfflineSnackbar.value = true
    }
  }
}

// Lifecycle
onMounted(() => {
  setupNetworkListeners()
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
})
</script>
