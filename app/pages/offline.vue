<template>
  <div class="offline-page">
    <VContainer class="fill-height">
      <VRow align="center" justify="center">
        <VCol cols="12" sm="8" md="6">
          <VCard class="pa-8 text-center">
            <VIcon size="80" color="warning" class="mb-4"> mdi-wifi-off </VIcon>

            <h1 class="text-h4 mb-4">
              {{ $t('pwa.offline') || 'Sin conexión a internet' }}
            </h1>

            <p class="text-body-1 mb-6">
              Parece que no tienes conexión a internet. Por favor, verifica tu
              conexión e intenta nuevamente.
            </p>

            <VBtn color="primary" size="large" @click="retry">
              {{ $t('pwa.retry') || 'Reintentar' }}
            </VBtn>

            <VDivider class="my-6"></VDivider>

            <p class="text-caption text-medium-emphasis">
              Algunas funciones pueden estar disponibles sin conexión
            </p>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

// Define layout
definePageMeta({
  layout: 'default',
})

const { t: $t } = useI18n()
const router = useRouter()

// SEO Configuration for offline page
useSeoMeta({
  title: () => $t('seo.offlineTitle'),
  description: () => $t('seo.offlineDescription'),
  robots: 'noindex, nofollow',
  ogTitle: () => $t('seo.offlineTitle'),
  ogDescription: () => $t('seo.offlineDescription'),
  twitterTitle: () => $t('seo.offlineTitle'),
  twitterDescription: () => $t('seo.offlineDescription'),
})

// Methods
const retry = () => {
  if (navigator.onLine) {
    router.push('/')
  } else {
    // Show message that still offline - using a simple alert as fallback
    // In a real app, you might want to use a notification library or custom toast component
    if (import.meta.client) {
      console.warn('Aún no hay conexión a internet')
      // You could also emit an event or use a global state for notifications
    }
  }
}
</script>

<style scoped>
.offline-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
