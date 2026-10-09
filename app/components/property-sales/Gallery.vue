<template>
  <PropertyPhotoGrid :photos="media" :title="title" class="sale-gallery">
    <template v-if="sourceName && sourceUrl" #credit>
      {{ $t('photoViewer.credit') }}
      <a :href="sourceUrl" target="_blank" rel="noopener noreferrer nofollow">{{ sourceName }}</a>
    </template>
    <template #empty>
      <VIcon icon="mdi-home-outline" size="52" />
      {{ t('noPhoto') }}
    </template>
  </PropertyPhotoGrid>
</template>
<script setup lang="ts">
import { propertySalesMessages } from '~/utils/propertySalesMessages'
const props = withDefaults(
  defineProps<{ images: string[]; title: string; sourceName?: string; sourceUrl?: string }>(),
  { sourceName: '', sourceUrl: '' }
)
const { t } = useI18n({ useScope: 'local', messages: propertySalesMessages })
// La grilla y el visor a pantalla completa son los de todo el sitio; acá las fotos ya vinieron con
// la ficha, así que no hay nada que pedir: sólo se traducen al formato que esperan.
const media = computed(() =>
  props.images.map((url, i) => ({
    url,
    alt: t('photo', { n: i + 1, total: props.images.length }),
    sourceName: props.sourceName,
    sourceUrl: props.sourceUrl,
  }))
)
</script>
<style scoped>
.sale-gallery :deep(a) {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.sale-gallery :deep(a:focus-visible) {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
</style>
