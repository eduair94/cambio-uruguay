<!-- Power, water and complaint figures of the official area a listing is in. Read-only, lazy. -->
<template>
  <section class="zone-services" data-testid="rental-zone-services">
    <h3>{{ t('panelTitle', { name: zone.name }) }}</h3>
    <p class="meta">{{ t(`evidence_${zone.evidence}`) }}</p>
    <!-- The profile is fetched only in the browser: its loading state must not be part of the SSR HTML. -->
    <ClientOnly>
      <p v-if="pending" class="meta" role="status">{{ t('loading') }}</p>
      <p v-else-if="error || !profile" class="meta">{{ t('unavailableSnapshot') }}</p>
      <dl v-else class="rows">
        <div>
          <dt>{{ t('power') }}</dt>
          <dd v-if="profile.utilities.power && profile.utilities.power.geography === 'zone'">
            {{ t('powerMinutes', { n: decimal(profile.utilities.power.unplannedMinutes) }) }}
            <span v-if="levels.luz" class="level" :class="`level--${levels.luz}`">{{
              t(levelKey(levels.luz))
            }}</span>
            <span v-if="profile.meta?.power?.status === 'preliminary'" class="muted">
              ·
              {{
                t('powerPreliminaryShort', { days: Math.floor(profile.meta.power.observedDays) })
              }}
            </span>
          </dd>
          <dd v-else-if="profile.meta?.power?.status === 'collecting'" class="muted">
            {{ t('powerCollectingShort', { date: date(profile.meta.power.observedFrom) }) }}
          </dd>
          <dd v-else class="muted">{{ t('noData') }}</dd>
        </div>
        <div>
          <dt>{{ t('waterStat') }}</dt>
          <dd v-if="profile.utilities.water && profile.utilities.water.geography === 'zone'">
            {{ t('waterNotices', { n: number(profile.utilities.water.notices) }) }}
            <span v-if="levels.agua" class="level" :class="`level--${levels.agua}`">{{
              t(levelKey(levels.agua))
            }}</span>
          </dd>
          <dd v-else class="muted">{{ t('noData') }}</dd>
        </div>
        <div v-for="category in claimCategories" :key="category">
          <dt>{{ t(`claim_${category}`) }}</dt>
          <dd v-if="profile.utilities.claims?.perThousand">
            {{ t('perThousand', { n: decimal(profile.utilities.claims.perThousand[category]) }) }}
            <span v-if="levels[category]" class="level" :class="`level--${levels[category]}`">{{
              t(levelKey(levels[category]!))
            }}</span>
          </dd>
          <dd v-else class="muted">
            {{ profile.department === 'Montevideo' ? t('noData') : t('claimsMontevideo') }}
          </dd>
        </div>
        <div v-if="profile.crime">
          <dt>{{ t('crime') }}</dt>
          <dd>{{ t('complaints', { n: number(profile.crime.total) }) }}</dd>
        </div>
      </dl>
      <template #fallback>
        <p class="meta" role="status">{{ t('loading') }}</p>
      </template>
    </ClientOnly>
    <p class="meta">{{ t('panelHint') }}</p>
    <NuxtLink :to="localePath('/barrios-alquileres-uruguay')" class="link">{{
      t('panelLink')
    }}</NuxtLink>
  </section>
</template>

<script setup lang="ts">
import type {
  RentalClaimCategory,
  RentalServiceLevel,
  RentalZoneUtilities,
  RentalZoneUtilitiesMeta,
} from '~/utils/rentalZoneTypes'
import type { RentalOfficialZone } from '~/utils/rentals'
import { rentalZoneMessages } from '~/utils/rentalZoneMessages'

const props = defineProps<{ zone: RentalOfficialZone }>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalZoneMessages })
const localePath = useLocalePath()
const {
  data: profile,
  pending,
  error,
} = useFetch<{
  zone: string
  name: string
  department: string
  utilities: RentalZoneUtilities
  meta: RentalZoneUtilitiesMeta | null
  crime: { total: number; periodFrom: string; periodTo: string } | null
}>('/api/rentals/zone-profile', {
  query: computed(() => ({ zone: props.zone.zone, department: props.zone.department })),
  server: false,
  lazy: true,
})
const claimCategories: RentalClaimCategory[] = ['alumbrado', 'saneamiento', 'limpieza']
const levels = computed(() => profile.value?.utilities.levels ?? {})
const levelKey = (value: RentalServiceLevel) =>
  value === 'low' ? 'levelLow' : value === 'mid' ? 'levelMid' : 'levelHigh'
const number = (value: number) => new Intl.NumberFormat(locale.value).format(value)
const decimal = (value: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(value)
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(dateLocale(locale.value), {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(new Date(value))
    : ''
</script>

<style scoped>
.zone-services {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
:where(.zone-services) :where(h3, p, dl, dd) {
  margin: 0;
}
h3 {
  font-size: 1.075rem;
  font-weight: 700;
}
.meta,
.muted {
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.8rem;
}
.meta {
  margin-top: 4px !important;
}
.rows {
  display: grid;
  gap: 8px;
  margin-block: 12px !important;
}
.rows > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 16px;
  align-items: baseline;
  font-size: 0.875rem;
}
dd {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.level {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.level--low {
  background: rgba(var(--v-theme-success), 0.16);
}
.level--high {
  background: rgba(var(--v-theme-error), 0.14);
}
.link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
}
@media (max-width: 599px) {
  .rows > div {
    grid-template-columns: minmax(0, 1fr);
  }
  dd {
    text-align: left;
  }
}
</style>
