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
    <VDialog
      v-model="open"
      fullscreen
      :aria-label="t('photos')"
      @after-leave="trigger?.focus({ preventScroll: true })"
    >
      <section
        class="sale-gallery__dialog"
        @keydown.left.prevent="step(-1)"
        @keydown.right.prevent="step(1)"
      >
        <header>
          <p>{{ t('photo', { n: index + 1, total: images.length }) }}</p>
          <VBtn
            icon="mdi-close"
            :aria-label="t('close')"
            variant="text"
            autofocus
            @click="open = false"
          />
        </header>
        <div class="sale-gallery__stage">
          <img
            v-if="images[index] && !failed.has(images[index]!)"
            :src="images[index]"
            :alt="title"
            referrerpolicy="no-referrer"
            @error="failed.add(images[index]!)"
          />
          <p v-else>{{ t('noPhoto') }}</p>
        </div>
        <footer>
          <VBtn prepend-icon="mdi-chevron-left" :disabled="images.length < 2" @click="step(-1)">
            {{ t('previous') }}
          </VBtn>
          <VBtn append-icon="mdi-chevron-right" :disabled="images.length < 2" @click="step(1)">
            {{ t('next') }}
          </VBtn>
        </footer>
      </section>
    </VDialog>
  </section>
</template>
<script setup lang="ts">
import { propertySalesMessages } from '~/utils/propertySalesMessages'
const props = defineProps<{ images: string[]; title: string }>()
const { t } = useI18n({ useScope: 'local', messages: propertySalesMessages })
const index = ref(0)
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const failed = reactive(new Set<string>())
const step = (amount: number) => {
  if (props.images.length)
    index.value = (index.value + amount + props.images.length) % props.images.length
}
watch(
  () => props.images,
  () => {
    index.value = 0
  }
)
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
.sale-gallery__dialog {
  height: 100dvh;
  background: rgb(var(--v-theme-background));
  display: flex;
  flex-direction: column;
  color: rgb(var(--v-theme-on-background));
}
.sale-gallery__dialog header,
.sale-gallery__dialog footer {
  padding: 12px max(12px, env(safe-area-inset-right));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: none;
}
.sale-gallery__dialog header p {
  margin: 0;
}
.sale-gallery__dialog footer {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
.sale-gallery__stage {
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sale-gallery__stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
