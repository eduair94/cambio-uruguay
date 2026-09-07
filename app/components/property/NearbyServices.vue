<!--
THESIS: Help a visitor assess daily errands using identifiable places and honest distances.
OWN-WORLD: Inherit the property dossier's paper/navy surfaces, readable type and blue links.
STORY: Scan the nearest service, open walking directions, inspect alternatives and coverage.
FIRST VIEWPORT: Below the location, six compact rows with a category, place and distance.
FORM: A service list; alternatives expand in place without a modal or extra map download.
-->
<script setup lang="ts">
import type { PropertyNearbyResponse } from '~/utils/propertyNearby'
import { propertyExperienceMessages } from '~/utils/propertyExperienceMessages'

const props = defineProps<{ operation: 'rent' | 'sale'; propertyKey: string }>()
const { t, locale } = useI18n({ useScope: 'local', messages: propertyExperienceMessages })
const { data, status, error, refresh } = useFetch<PropertyNearbyResponse>(
  () => `/api/property-nearby/${props.operation}/${encodeURIComponent(props.propertyKey)}`,
  { server: false, lazy: true }
)
const available = computed(() => data.value?.status === 'ready' || data.value?.status === 'stale')
const alternatives = computed(() =>
  (data.value?.categories ?? []).filter(category => category.items.length > 1)
)
const recorded = computed(() =>
  (data.value?.categories ?? []).filter(category => category.items.length)
)
const icons: Record<string, string> = {
  supermarket: 'mdi-cart-outline',
  grocery: 'mdi-store-outline',
  pharmacy: 'mdi-medical-bag',
  healthcare: 'mdi-hospital-building',
  transit: 'mdi-bus',
  education: 'mdi-school-outline',
}
const dataDate = computed(() => {
  const date = new Date(data.value?.dataAsOf || '')
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
    : ''
})
// Do not imply metre-level precision from an approximate source point.
const distance = (value: number) =>
  new Intl.NumberFormat(locale.value).format(Math.max(25, Math.round(value / 25) * 25))
</script>

<template>
  <section class="nearby-services" data-testid="property-nearby" :aria-label="t('nearbyTitle')">
    <h2>{{ t('nearbyTitle') }}</h2>
    <p class="nearby-services__intro">{{ t('nearbyIntro') }}</p>
    <p v-if="status === 'pending' || status === 'idle'" role="status">{{ t('nearbyLoading') }}</p>
    <div v-else-if="error || !data || data.status === 'unavailable'" role="status">
      <p>{{ t('nearbyUnavailable') }}</p>
      <VBtn variant="text" prepend-icon="mdi-refresh" @click="refresh()">{{ t('retry') }}</VBtn>
    </div>
    <p v-else-if="data.status === 'unlocated'">{{ t('nearbyUnlocated') }}</p>
    <template v-else-if="available">
      <p v-if="data.status === 'stale'" class="nearby-services__notice" role="status">
        {{ t('nearbyStale') }}
      </p>
      <ul class="nearby-services__list">
        <li v-for="category in data.categories" :key="category.id" class="nearby-services__row">
          <div class="nearby-services__category">
            <VIcon :icon="icons[category.id]" size="20" aria-hidden="true" />
            <h3>{{ t(category.id) }}</h3>
          </div>
          <div v-if="category.items[0]" class="nearby-services__place">
            <div class="nearby-services__name">
              <span>{{ category.items[0].name || t('unnamed') }}</span>
              <strong>{{
                t('distance', { distance: distance(category.items[0].distanceM) })
              }}</strong>
            </div>
            <a
              :href="category.items[0].walkingUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="t('walkingTo', { name: category.items[0].name || t(category.id) })"
              :title="category.items[0].pointKind === 'area_center' ? t('areaCenter') : undefined"
            >
              {{ t('walking') }}
              <VIcon icon="mdi-arrow-top-right" size="16" aria-hidden="true" />
            </a>
          </div>
          <p v-else class="nearby-services__empty">{{ t('noneRecorded') }}</p>
        </li>
      </ul>
      <details v-if="alternatives.length" class="nearby-services__alternatives">
        <summary>{{ t('morePlaces') }}</summary>
        <div v-for="category in alternatives" :key="category.id">
          <h3>{{ t(category.id) }}</h3>
          <ul>
            <li v-for="place in category.items.slice(1)" :key="place.id">
              <a :href="place.walkingUrl" target="_blank" rel="noopener noreferrer">
                <span>{{ place.name || t('unnamed') }}</span>
                <span>{{ t('distance', { distance: distance(place.distanceM) }) }}</span>
                <span class="nearby-services__route">{{ t('walking') }}</span>
              </a>
            </li>
          </ul>
        </div>
      </details>
      <p class="nearby-services__note">{{ t('nearbyCaveat') }}</p>
      <details class="nearby-services__attribution">
        <summary>
          © OpenStreetMap <span v-if="dataDate">· {{ t('nearbyData', { date: dataDate }) }}</span>
        </summary>
        <p>{{ t('nearbyCoverage') }}</p>
        <p>{{ t('areaCenter') }}</p>
        <template v-if="recorded.length">
          <h3 class="nearby-services__evidence-title">{{ t('osmEvidence') }}</h3>
          <ul>
            <li v-for="category in recorded" :key="category.id">
              <a :href="category.items[0]!.osmUrl" target="_blank" rel="noopener noreferrer">
                {{ t(category.id) }}: {{ category.items[0]!.name || t('unnamed') }}
              </a>
            </li>
          </ul>
        </template>
        <p>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            © OpenStreetMap contributors · ODbL
          </a>
          ·
          <a
            href="https://download.geofabrik.de/south-america/uruguay.html"
            target="_blank"
            rel="noopener noreferrer"
            >Geofabrik</a
          >
        </p>
      </details>
    </template>
  </section>
</template>

<style scoped>
.nearby-services {
  padding-block: 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  scroll-margin-top: 100px;
}
.nearby-services :is(h2, h3, p, ul) {
  margin: 0;
}
.nearby-services h2 {
  font-size: 1.25rem;
  line-height: 1.35;
  font-weight: 700;
}
.nearby-services .nearby-services__intro {
  margin-block: 8px 16px;
}
.nearby-services h3 {
  font-size: 0.9rem;
  font-weight: 600;
}
.nearby-services ul {
  list-style: none;
  padding: 0;
}
.nearby-services__row {
  padding-block: 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.nearby-services__category {
  display: flex;
  gap: 8px;
  align-items: center;
}
.nearby-services__category .v-icon {
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.nearby-services__place {
  display: flex;
  gap: 8px 16px;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.nearby-services__name {
  min-width: 0;
  display: grid;
  gap: 2px;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}
.nearby-services__name strong {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.nearby-services a,
.nearby-services summary {
  color: rgb(var(--v-theme-link));
  min-height: 44px;
}
.nearby-services a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-underline-offset: 3px;
  font-size: 0.85rem;
}
.nearby-services__place > a {
  flex-shrink: 0;
}
.nearby-services summary {
  padding-block: 12px;
  cursor: pointer;
  font-size: 0.85rem;
}
.nearby-services .nearby-services__empty {
  margin-top: 4px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.74);
}
.nearby-services .nearby-services__note {
  margin-top: 16px;
  font-size: 0.85rem;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.nearby-services .nearby-services__notice {
  margin-bottom: 8px;
  font-size: 0.85rem;
}
.nearby-services__attribution {
  font-size: 0.8rem;
  line-height: 1.5;
}
.nearby-services__attribution summary {
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.nearby-services__attribution p + p {
  margin-top: 8px;
}
.nearby-services__alternatives h3 {
  margin-top: 12px;
}
.nearby-services .nearby-services__evidence-title {
  margin-top: 16px;
}
.nearby-services__alternatives a {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding-block: 8px;
}
.nearby-services__route {
  text-decoration: underline;
}
.nearby-services :is(a, summary):focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (max-width: 380px) {
  .nearby-services__place {
    display: block;
  }
}
</style>
