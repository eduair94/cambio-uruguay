<!-- Existing rental comparison surface: public neighbourhood evidence, optional explicit selection. -->
<template>
  <VContainer class="rental-zones-page">
    <header class="page-heading">
      <h1>{{ t('title') }}</h1>
      <p>{{ t('intro') }}</p>
      <nav>
        <NuxtLink :to="localePath('/alquileres-uruguay')">{{ t('rentalsShort') }}</NuxtLink
        ><NuxtLink :to="localePath('/alquiler-ideal-uruguay')">{{ t('plannerShort') }}</NuxtLink>
      </nav>
    </header>
    <ZoneExplorer
      :initial="initial"
      directory
      @apply="apply"
      @cancel="navigateTo(localePath('/alquileres-uruguay'))"
    />
  </VContainer>
</template>
<script setup lang="ts">
import type { RentalZonePreferences } from '~/utils/rentalZoneTypes'
import { rentalZoneMessages } from '~/utils/rentalZoneMessages'
import { normalizeRentalQuery, rentalQueryToParams } from '~/utils/rentals'
import ZoneExplorer from '~/components/rentals/zones/Explorer.vue'
const { t, locale } = useI18n({ useScope: 'local', messages: rentalZoneMessages })
const localePath = useLocalePath()
const initial: RentalZonePreferences = { mode: 'only', include: [], exclude: [] }
const canonical = computed(
  () => `https://cambio-uruguay.com${localePath('/barrios-alquileres-uruguay')}`
)
useSeoMeta({
  title: () => t('title'),
  description: () => t('seo'),
  ogTitle: () => t('title'),
  ogDescription: () => t('seo'),
})
defineOgImageComponent('Cambio', {
  title: 'Compará barrios para alquilar',
  subtitle: 'Precios, servicios y fuentes · Uruguay',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${canonical.value}#application`,
        name: t('title'),
        description: t('seo'),
        url: canonical.value,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        isAccessibleForFree: true,
        inLanguage: locale.value,
      }).replace(/</g, '\\u003c'),
    },
  ],
}))
function apply(zones: RentalZonePreferences) {
  const query = normalizeRentalQuery({
    department: zones.include[0]?.department || '',
    neighborhoods: zones.include.map(zone => zone.neighborhood),
    type: 'vivienda',
  })
  return navigateTo({ path: localePath('/alquileres-uruguay'), query: rentalQueryToParams(query) })
}
</script>
<style scoped>
.rental-zones-page {
  max-width: 1240px;
  padding: 28px 16px 48px;
}
.page-heading {
  margin-bottom: 24px;
}
.page-heading h1 {
  margin: 0;
  font-size: clamp(1.65rem, 4vw, 2.4rem);
  font-weight: 800;
  line-height: 1.2;
}
.page-heading p {
  margin: 12px 0 0;
  max-width: 760px;
  line-height: 1.6;
}
.page-heading nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 12px;
}
.page-heading a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
}
.rental-zones-page :deep(.explorer-scroll) {
  padding: 0;
  overflow: visible;
}
.rental-zones-page :deep(.explorer-footer) {
  margin-top: 24px;
  position: sticky;
  bottom: 0;
  z-index: 2;
}
</style>
