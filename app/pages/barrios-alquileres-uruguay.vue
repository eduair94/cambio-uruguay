<!-- Existing rental comparison surface: public neighbourhood evidence, optional explicit selection. -->
<template>
  <VContainer class="rental-zones-page">
    <header class="page-heading">
      <h1>{{ t('title') }}</h1>
    </header>
    <ZoneExplorer
      :initial="initial"
      directory
      standalone
      @apply="apply"
      @cancel="navigateTo(localePath('/alquileres-uruguay'))"
    />
    <section v-if="barrioGroups.length" class="barrio-pages" aria-labelledby="barrio-pages-title">
      <h2 id="barrio-pages-title">{{ t('barrioPagesTitle') }}</h2>
      <p class="barrio-pages-intro">{{ t('barrioPagesIntro') }}</p>
      <div v-for="group in barrioGroups" :key="group.department" class="barrio-pages-group">
        <h3>{{ group.department }}</h3>
        <ul>
          <li v-for="item in group.barrios" :key="item.path">
            <!-- Ruta cruda, sin localePath: las páginas de barrio existen sólo en español. -->
            <NuxtLink :to="item.path">{{ item.neighborhood }}</NuxtLink>
            <span class="barrio-pages-count"> ({{ count(item.listings) }})</span>
          </li>
        </ul>
      </div>
    </section>
    <ZonePriceImpact id="servicios-y-alquiler" />
  </VContainer>
</template>
<script setup lang="ts">
import type { RentalZonePreferences } from '~/utils/rentalZoneTypes'
import type { RentalBarrioSummary } from '~/utils/rentalBarrio'
import { rentalZoneMessages } from '~/utils/rentalZoneMessages'
import { normalizeRentalQuery, rentalQueryToParams } from '~/utils/rentals'
import ZoneExplorer from '~/components/rentals/zones/Explorer.vue'
import ZonePriceImpact from '~/components/rentals/zones/PriceImpact.vue'
const { t, locale } = useI18n({ useScope: 'local', messages: rentalZoneMessages })
// Los rótulos del rastro son de navegación y viven en el catálogo global; el `t` de arriba es de
// alcance local y sólo resuelve `rentalZoneMessages`. Mismo idioma que `alquileres-uruguay.vue`.
const { t: globalT } = useI18n({ useScope: 'global' })
const localePath = useLocalePath()
const initial: RentalZonePreferences = { mode: 'only', include: [], exclude: [] }
// Enlazado SSR a las páginas de barrio indexables. Lista vacía o caída = la sección no existe.
// `lazy` igual se resuelve en el servidor (onServerPrefetch); sólo no frena una navegación.
type RentalBarrioListItem = Pick<
  RentalBarrioSummary,
  'department' | 'neighborhood' | 'path' | 'listings'
>
const { data: rentalBarrios } = useAsyncData(
  'rental-barrios',
  () =>
    $fetch<{ barrios: RentalBarrioListItem[] }>('/api/rentals/barrios').catch(() => ({
      barrios: [] as RentalBarrioListItem[],
    })),
  { default: () => ({ barrios: [] as RentalBarrioListItem[] }), lazy: true }
)
const barrioGroups = computed(() => {
  const groups = new Map<string, RentalBarrioListItem[]>()
  for (const item of rentalBarrios.value?.barrios ?? []) {
    groups.set(item.department, [...(groups.get(item.department) ?? []), item])
  }
  // Montevideo primero (es la mayoría de los avisos), después alfabético; dentro, el orden de la
  // API (más avisos primero).
  return [...groups]
    .sort(
      ([a], [b]) =>
        Number(b === 'Montevideo') - Number(a === 'Montevideo') || a.localeCompare(b, 'es')
    )
    .map(([department, barrios]) => ({ department, barrios }))
})
const count = (value: number) => new Intl.NumberFormat(locale.value).format(value)
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
  subtitle: 'Precios, luz, agua y servicios · Uruguay',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Cambio Uruguay',
            item: `https://cambio-uruguay.com${localePath('/')}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            // El directorio al que esta página vuelve cuando el visitante cancela, que es el padre
            // que ya le muestra: no hay ninguno inventado acá.
            name: globalT('nav.alquileres'),
            item: `https://cambio-uruguay.com${localePath('/alquileres-uruguay')}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: globalT('nav.rentalZones'),
            item: canonical.value,
          },
        ],
      }).replace(/</g, '\\u003c'),
    },
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
  padding: 20px 16px 32px;
}
.page-heading {
  margin-bottom: 12px;
}
.page-heading h1 {
  margin: 0;
  font-size: clamp(1.45rem, 4vw, 2.15rem);
  font-weight: 800;
  line-height: 1.2;
}
.barrio-pages {
  margin-top: 32px;
}
.barrio-pages h2 {
  margin: 0 0 8px;
  font-size: 1.35rem;
  font-weight: 700;
}
.barrio-pages-intro {
  margin: 0 0 16px;
  max-width: 72ch;
}
.barrio-pages-group + .barrio-pages-group {
  margin-top: 20px;
}
.barrio-pages h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
  font-weight: 700;
}
.barrio-pages ul {
  margin: 0;
  padding: 0;
  list-style: none;
  columns: 4 200px;
  column-gap: 24px;
}
.barrio-pages li {
  break-inside: avoid;
  padding: 3px 0;
}
.barrio-pages-count {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
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
@media (max-width: 959px) {
  .rental-zones-page :deep(.zone-toolbar) {
    top: 64px;
  }
}
</style>
