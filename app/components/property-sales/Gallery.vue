<template>
  <section class="sale-gallery" :aria-label="t('photos')">
    <button
      v-if="images.length"
      ref="trigger"
      class="sale-gallery__main"
      :aria-label="t('openPhotos')"
      @click="open = true"
    >
      <img
        v-if="!failed.has(images[index]!)"
        :src="images[index]"
        :alt="title"
        width="1000"
        height="650"
        fetchpriority="high"
        referrerpolicy="no-referrer"
        @error="failed.add(images[index]!)"
      />
      <span v-else>{{ t('noPhoto') }}</span>
      <span class="sale-gallery__count">
        <VIcon icon="mdi-image-multiple-outline" size="18" />
        {{ index + 1 }} / {{ images.length }}
      </span>
    </button>
    <div v-else class="sale-gallery__empty">
      <VIcon icon="mdi-home-outline" size="52" />
      {{ t('noPhoto') }}
    </div>
    <div v-if="images.length > 1" class="sale-gallery__thumbs">
      <button
        v-for="(url, i) in images"
        :key="url"
        :aria-label="t('photo', { n: i + 1, total: images.length })"
        :aria-pressed="index === i"
        @click="index = i"
      >
        <img :src="url" alt="" loading="lazy" width="90" height="64" referrerpolicy="no-referrer" />
      </button>
    </div>
    <MediaPhotoViewer
      v-model="open"
      :photos="media"
      :title="title"
      :start-index="index"
      referrer-policy="no-referrer"
    />
  </section>
</template>
<script setup lang="ts">
import { propertySalesMessages } from '~/utils/propertySalesMessages'
const props = withDefaults(
  defineProps<{ images: string[]; title: string; sourceName?: string; sourceUrl?: string }>(),
  { sourceName: '', sourceUrl: '' }
)
const { t } = useI18n({ useScope: 'local', messages: propertySalesMessages })
// El visor a pantalla completa es el mismo de todo el sitio; acá las fotos ya estan en la ficha,
// asi que no hay nada que pedir: solo se traducen al formato que espera.
const media = computed(() =>
  props.images.map((url, i) => ({
    url,
    alt: t('photo', { n: i + 1, total: props.images.length }),
    sourceName: props.sourceName,
    sourceUrl: props.sourceUrl,
  }))
)
const index = ref(0)
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const failed = reactive(new Set<string>())
watch(
  () => props.images,
  () => {
    index.value = 0
  }
)
// Al cerrar el visor el foco vuelve a la foto que lo abrio, no al principio de la pagina.
watch(open, isOpen => {
  if (!isOpen) void nextTick(() => trigger.value?.focus({ preventScroll: true }))
})
</script>
<style scoped>
.sale-gallery__main {
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16/10;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.sale-gallery__main > img {
  height: 100%;
  width: 100%;
  object-fit: contain;
}
.sale-gallery__count {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  gap: 6px;
}
.sale-gallery__empty {
  min-height: 260px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 14px;
}
.sale-gallery__thumbs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 2px;
}
.sale-gallery__thumbs button {
  flex: none;
  width: 90px;
  height: 64px;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
}
.sale-gallery__thumbs button[aria-pressed='true'] {
  border-color: rgb(var(--v-theme-primary));
}
.sale-gallery__thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sale-gallery button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
