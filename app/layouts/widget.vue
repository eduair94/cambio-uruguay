<template>
  <!-- Bare, full-bleed layout for the embeddable /widget iframe. No VAppBar,
       drawer or Footer so it renders chrome-free inside third-party pages. -->
  <VApp class="widget-layout">
    <VMain>
      <slot />
    </VMain>
  </VApp>
</template>

<script setup lang="ts">
// hreflang alternates are still useful here so the embeddable page advertises
// its localized variants; reuse the same i18n head wiring as the default layout.
const i18nHead = useLocaleHead()
useHead(() => ({
  htmlAttrs: i18nHead.value.htmlAttrs ?? {},
  link: i18nHead.value.link ?? [],
  meta: i18nHead.value.meta ?? [],
}))
</script>

<style scoped>
.widget-layout {
  background: transparent;
}

.widget-layout :deep(.v-main) {
  padding: 0 !important;
}
</style>
