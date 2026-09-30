<template>
  <span class="ua-icon" :style="{ width: `${size}px`, height: `${size}px` }">
    <img
      v-if="src && !failed"
      ref="image"
      :src="src"
      alt=""
      :width="size"
      :height="size"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else class="ua-icon__mono" aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<script setup lang="ts">
// El ícono sale de la CDN de la tienda (lo trae el job semanal). Es decorativo: el nombre de la
// app está al lado, así que alt vacío. Si la imagen no carga —el desarrollador cambió el ícono y la
// URL vieja murió— queda un monograma. Un error ANTES de hidratar no dispara @error (el listener
// todavía no existe), por eso onMounted mira si la imagen quedó rota.
import { usefulAppInitials } from '~/utils/usefulApps'

const props = withDefaults(defineProps<{ name: string; src?: string | null; size?: number }>(), {
  src: null,
  size: 48,
})

const failed = ref(false)
const image = ref<HTMLImageElement | null>(null)
const initials = computed(() => usefulAppInitials(props.name))

watch(
  () => props.src,
  () => {
    failed.value = false
  }
)

onMounted(() => {
  const el = image.value
  if (el && el.complete && el.naturalWidth === 0) failed.value = true
})
</script>

<style scoped>
.ua-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.ua-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ua-icon__mono {
  display: inline-flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>
