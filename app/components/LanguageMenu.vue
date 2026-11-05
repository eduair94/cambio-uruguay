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
    <VList class="lang-list" density="compact" translate="no">
      <VListItem v-for="item in availableLocales" :key="item.code" :to="item.to" :lang="item.lang">
        <VListItemTitle>{{ item.name }}</VListItemTitle>
      </VListItem>
    </VList>
  </VMenu>
</template>

<script setup lang="ts">
import { announcedLocales } from '~/utils/autoTranslate'
import { splitLocalePath } from '~/utils/localizedRoutes'

const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
// Written by plugins/auto-translate.ts: which locales this page is machine-translated into.
const translation = useState<{ translated: string[]; embargoed: boolean } | null>('auto-translate')

// Every page answers in every locale (compact routes), so the menu offers only the languages
// the page is announced in — the same rule as its hreflang (utils/autoTranslate.ts): English
// and Portuguese everywhere, another language where the page has its copy in it.
const availableLocales = computed(() => {
  const path = splitLocalePath(route.path).path.replace(/(.)\/+$/, '$1') || '/'
  const announced = new Set([
    'es',
    ...announcedLocales(path, translation.value ?? { translated: [], embargoed: false }),
  ])
  return locales.value
    .filter(item => item.code !== locale.value && announced.has(item.code))
    .map(item => ({
      code: item.code,
      name: item.name ?? item.code,
      lang: item.language ?? item.code,
      to: switchLocalePath(item.code),
    }))
    .filter(item => item.to)
})
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
