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
    <VList class="lang-list" density="compact">
      <VListItem v-for="item in availableLocales" :key="item.code" :to="item.to" :lang="item.lang">
        <VListItemTitle>{{ item.name }}</VListItemTitle>
      </VListItem>
    </VList>
  </VMenu>
</template>

<script setup lang="ts">
// Get i18n instance from global properties
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

// Only the languages this page exists in: the extra locales cover a handful of routes
// (utils/locales.ts), and `switchLocalePath` answers '' where the route has no such page.
const availableLocales = computed(() =>
  locales.value
    .filter(item => item.code !== locale.value)
    .map(item => ({
      code: item.code,
      name: item.name ?? item.code,
      lang: item.language ?? item.code,
      to: switchLocalePath(item.code),
    }))
    .filter(item => item.to)
)
</script>

<style scoped>
/* Vuetify's 64px min-width is what pushed this button past the right edge on a
   360px screen; the label is only ever a two-letter locale code. */
.lang-btn {
  min-width: 0;
}

/* 30+ languages on the translated pages: scroll inside the menu, never past the screen. */
.lang-list {
  max-height: min(70vh, 32rem);
  overflow-y: auto;
}

.lang-btn__code {
  text-transform: uppercase;
  font-weight: 700;
}
</style>
