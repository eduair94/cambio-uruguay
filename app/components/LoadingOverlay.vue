<template>
  <ClientOnly>
    <Teleport v-if="isMounted" to="body">
      <v-overlay
        v-model="showOverlay"
        persistent
        class="loading-overlay"
        :opacity="0.8"
        :scroll-strategy="scrollStrategy"
        :z-index="9999"
      >
        <div class="loading-content">
          <v-progress-circular
            indeterminate
            size="64"
            width="6"
            color="primary"
            class="mb-4"
          />
          <div class="loading-text">
            <h3 class="text-h6 text-white text-center mb-2">
              {{ loadingMessage }}
            </h3>
            <v-progress-linear
              v-if="routeChanging"
              indeterminate
              color="primary"
              class="loading-bar"
            />
          </div>
        </div>
      </v-overlay>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useLoadingStore } from '~/stores/loading'

const loadingStore = useLoadingStore()
const isMounted = ref(false)

const showOverlay = computed(() => loadingStore.showOverlay)
const loadingMessage = computed(() => loadingStore.getLoadingMessage)
const routeChanging = computed(() => loadingStore.getRouteChanging)

// Safe scroll strategy that checks for DOM availability
const scrollStrategy = computed(() => {
  if (typeof document !== 'undefined' && document.body) {
    return 'block'
  }
  return 'reposition'
})

// Ensure component only renders after mount
onMounted(() => {
  isMounted.value = true
})

onBeforeUnmount(() => {
  isMounted.value = false
})
</script>

<style scoped>
.loading-overlay {
  z-index: 9999 !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  width: 100vw;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(2px);
}

.loading-text {
  min-width: 200px;
}

.loading-bar {
  max-width: 250px;
  border-radius: 4px;
}

/* Animations */
.loading-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Ensure overlay is above everything */
:deep(.v-overlay__content) {
  z-index: 9999 !important;
}

/* Prevent body scroll when overlay is active */
:deep(.v-overlay--active) {
  overflow: hidden !important;
}
</style>
