<template>
  <VMenu location="bottom end">
    <template #activator="{ props }">
      <!-- The locale code is the label, so it needs a spelled-out accessible
           name. The chevron is decorative and drops on phones, where the top bar
           has no room for it. -->
      <VBtn
        color="primary"
        variant="text"
        class="lang-btn px-2 px-sm-3"
        :aria-label="$t('a11y.changeLanguage')"
        :title="$t('a11y.changeLanguage')"
        v-bind="props"
      >
        <span class="lang-btn__code">{{ locale }}</span>
        <VIcon end class="d-none d-sm-inline-flex">mdi-chevron-down</VIcon>
      </VBtn>
    </template>
    <VList>
      <VListItem
        v-for="(item, index) in availableLocales"
        :key="index"
        :to="switchLocalePath(item.code)"
      >
        <VListItemTitle>{{ item.name }}</VListItemTitle>
      </VListItem>
    </VList>
  </VMenu>
</template>

<script setup lang="ts">
// Get i18n instance from global properties
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => {
  return locales.value.filter(i => i.code !== locale.value)
})
</script>

<style scoped>
/* Vuetify's 64px min-width is what pushed this button past the right edge on a
   360px screen; the label is only ever a two-letter locale code. */
.lang-btn {
  min-width: 0;
}

.lang-btn__code {
  text-transform: uppercase;
  font-weight: 700;
}
</style>
