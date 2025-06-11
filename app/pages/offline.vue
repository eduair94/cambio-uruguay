<template>
  <div class="offline-page">
    <v-container class="fill-height">
      <v-row align="center" justify="center">
        <v-col cols="12" sm="8" md="6">
          <v-card class="pa-8 text-center">
            <v-icon size="80" color="warning" class="mb-4">
              mdi-wifi-off
            </v-icon>
            
            <h1 class="headline mb-4">
              {{ $t('pwa.offline') || 'Sin conexión a internet' }}
            </h1>
            
            <p class="body-1 mb-6">
              Parece que no tienes conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.
            </p>
            
            <v-btn
              color="primary"
              large
              @click="retry"
            >
              {{ $t('pwa.retry') || 'Reintentar' }}
            </v-btn>
            
            <v-divider class="my-6"></v-divider>
            
            <p class="caption text--secondary">
              Algunas funciones pueden estar disponibles sin conexión
            </p>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts">
export default {
  layout: 'default',
  methods: {
    retry() {
      if (navigator.onLine) {
        this.$router.push('/')
      } else {
        // Show message that still offline
        this.$nuxt.$emit('showMessage', {
          type: 'warning',
          message: 'Aún no hay conexión a internet'
        })
      }
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
