<template>
  <div ref="element">
    <div v-if="isVisible">
      <slot />
    </div>
    <div v-else-if="showPlaceholder" class="lazy-placeholder">
      <slot name="placeholder">
        <!-- Default loading placeholder -->
        <div
          class="d-flex justify-center align-center"
          style="min-height: 100px"
        >
          <VProgressCircular indeterminate color="primary" />
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  showPlaceholder?: boolean
  rootMargin?: string
  threshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  showPlaceholder: false,
  rootMargin: '50px',
  threshold: 0.1,
})

const isVisible = ref(false)
const element = ref<HTMLElement>()

const observeElement = () => {
  if (!import.meta.client || !element.value) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true
          observer.unobserve(entry.target)
        }
      })
    },
    {
      rootMargin: props.rootMargin,
      threshold: props.threshold,
    },
  )

  observer.observe(element.value)
}

onMounted(() => {
  observeElement()
})
</script>

<style scoped>
.lazy-placeholder {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}
</style>
