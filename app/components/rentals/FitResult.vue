<template>
  <article class="fit-result" :data-testid="`fit-result-${index}`">
    <div class="result-heading">
      <span class="rank-number">{{ index + 1 }}</span>
      <strong>{{ t('fitScore', { score: Math.round(result.score) }) }}</strong>
      <VCheckbox
        :model-value="selected"
        :disabled="compareDisabled && !selected"
        :label="t(selected ? 'compared' : 'compare')"
        hide-details
        density="compact"
        @update:model-value="emit('compare')"
      />
    </div>
    <div class="result-main">
      <NuxtLink
        :to="localePath(rentalPropertyPath(result.property.key))"
        target="_blank"
        class="result-photo"
        :aria-label="result.offer.title || result.property.title"
      >
        <img
          v-if="photo && !photoFailed"
          :src="photo"
          :alt="t('sourcePhoto')"
          width="220"
          height="160"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="photoFailed = true"
        />
        <span v-else>{{ t('noPhoto') }}</span>
      </NuxtLink>
      <div class="result-intro">
        <p class="location">
          {{
            [result.property.neighborhood, result.property.department].filter(Boolean).join(' · ')
          }}
        </p>
        <h3>
          <NuxtLink :to="localePath(rentalPropertyPath(result.property.key))" target="_blank">{{
            result.offer.title || result.property.title
          }}</NuxtLink>
        </h3>
        <p>{{ facts }}</p>
      </div>
      <div class="result-cost">
        <strong class="price">{{ money(result.monthlyUyu ?? result.rentUyu) }}</strong>
        <p>{{ t(result.monthlyUyu === null ? 'rent' : 'monthly') }}</p>
        <p v-if="result.monthlyUyu === null" class="missing">{{ t('pendingTotal') }}</p>
        <p v-else class="small">{{ money(result.rentUyu) }} + {{ money(result.expensesUyu!) }}</p>
      </div>
    </div>
    <div v-if="result.warnings.length" class="reasons">
      <span v-for="warning in result.warnings" :key="warning" class="warning">{{
        t(warning)
      }}</span>
    </div>
    <details class="match-details">
      <summary>{{ t('matchDetails') }}</summary>
      <div v-if="result.reasons.length" class="reasons">
        <span v-for="reason in result.reasons" :key="reason" class="reason">{{ t(reason) }}</span>
      </div>
      <p class="small">
        {{ t('updated', { date: rentalDate(result.offer.lastSeen, locale) || t('unknown') }) }}
      </p>
      <dl v-if="result.remainingUyu !== null || result.incomeShare !== null" class="result-balance">
        <div v-if="result.remainingUyu !== null">
          <dt>{{ t('remaining') }}</dt>
          <dd :class="{ negative: result.remainingUyu < 0 }">{{ money(result.remainingUyu) }}</dd>
        </div>
        <div v-if="result.incomeShare !== null">
          <dt>{{ t('share') }}</dt>
          <dd>{{ Math.round(result.incomeShare * 100) }}%</dd>
        </div>
      </dl>
    </details>
    <details v-if="result.trips.length" class="trip-details">
      <summary>{{ t('tripsTitle') }}</summary>
      <ul>
        <li v-for="trip in result.trips" :key="`${trip.personId}:${trip.destinationId}`">
          <div>
            <strong>{{ personName(trip.personId) }}</strong>
            <p>{{ placeName(trip.personId, trip.destinationId) }}</p>
          </div>
          <span>{{
            trip.distanceKm === null
              ? t('unknown')
              : t('distance', { km: trip.distanceKm.toFixed(1) })
          }}</span>
          <VBtn
            v-if="trip.distanceKm !== null && result.point"
            variant="text"
            size="small"
            @click="openRoute(trip.personId, trip.destinationId)"
            >{{ t('route') }}</VBtn
          >
        </li>
      </ul>
      <p v-if="result.weeklyDistanceKm !== null" class="small">
        {{ t('weekly', { km: result.weeklyDistanceKm.toFixed(1) }) }}
      </p>
      <p class="small">{{ t('distanceHint') }}</p>
      <p class="small">{{ t('routePrivacy') }}</p>
    </details>
    <div class="result-actions">
      <VBtn
        :to="localePath(rentalPropertyPath(result.property.key))"
        target="_blank"
        variant="tonal"
        color="primary"
        >{{ t('detail') }}</VBtn
      >
      <a v-if="source" :href="source" target="_blank" rel="noopener noreferrer nofollow">
        <span>{{ t('source') }} · {{ RENTAL_SOURCE_LABEL[result.offer.source] }}</span>
      </a>
    </div>
  </article>
</template>
<script setup lang="ts">
import type { RentalFitInput, RentalFitResult } from '~/utils/rentalFitTypes'
import { rentalFitMessages } from '~/utils/rentalFitMessages'
import { rentalDate, rentalMoney, rentalPropertyPath } from '~/utils/rentalPresentation'
import { rentalSavedSafeUrl } from '~/utils/rentalSaved'
import { RENTAL_SOURCE_LABEL } from '~/utils/rentals'
const props = defineProps<{
  result: RentalFitResult
  scenario: RentalFitInput
  index: number
  selected: boolean
  compareDisabled: boolean
}>()
const emit = defineEmits<{ compare: [] }>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalFitMessages })
const localePath = useLocalePath()
const photoFailed = ref(false)
const photo = computed(() => rentalSavedSafeUrl(props.result.offer.image))
const source = computed(() => rentalSavedSafeUrl(props.result.offer.url))
const money = (value: number) => rentalMoney(value, 'UYU', locale.value)
const facts = computed(() =>
  [
    t(props.result.property.propertyType),
    props.result.property.bedrooms !== null
      ? t('bedroomsFact', { n: props.result.property.bedrooms })
      : '',
    props.result.property.area ? t('areaFact', { n: props.result.property.area }) : '',
  ]
    .filter(Boolean)
    .join(' · ')
)
function personName(id: string) {
  const index = props.scenario.people.findIndex(p => p.id === id)
  return props.scenario.people[index]?.label || t('person', { n: index + 1 })
}
function placeName(personId: string, destinationId: string) {
  const person = props.scenario.people.find(p => p.id === personId)
  const place = person?.destinations.find(d => d.id === destinationId)
  return place?.label || (place ? t(place.kind) : '')
}
function openRoute(personId: string, destinationId: string) {
  const destination = props.scenario.people
    .find(p => p.id === personId)
    ?.destinations.find(d => d.id === destinationId)
  if (!destination || !props.result.point) return
  const query = new URLSearchParams({
    api: '1',
    origin: `${props.result.point.lat},${props.result.point.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: destination.mode,
  })
  // Deliberate click only: no personal destination in the DOM or outbound-click analytics.
  window.open(`https://www.google.com/maps/dir/?${query}`, '_blank', 'noopener,noreferrer')
}
</script>
<style scoped>
.fit-result {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  padding: 20px;
  min-width: 0;
}
p,
h3,
dl,
dd {
  margin: 0;
}
.result-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.rank-number {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: rgb(var(--v-theme-primary));
  color: #fff;
  border-radius: 4px;
  font-weight: 700;
}
.result-heading > .v-checkbox {
  margin-left: auto;
  flex: 0 0 auto;
}
.result-heading > strong {
  font-size: 0.85rem;
}
.result-main {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) minmax(170px, auto);
  gap: 20px;
}
.result-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.05);
  height: 124px;
  border-radius: 8px;
  overflow: hidden;
}
.result-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.result-intro {
  min-width: 0;
}
.location {
  font-size: 0.85rem;
  margin-bottom: 6px;
}
h3 {
  font-size: 1.05rem;
  line-height: 1.4;
  margin-bottom: 8px;
  overflow-wrap: anywhere;
}
h3 a {
  color: inherit;
  text-decoration: none;
}
h3 a:hover {
  text-decoration: underline;
}
.result-intro > p + p {
  margin-top: 8px;
}
.result-cost p {
  margin-top: 4px;
  font-size: 0.85rem;
}
.price {
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  line-height: 1.3;
  white-space: nowrap;
}
.small {
  font-size: 0.8rem;
  line-height: 1.5;
}
.missing,
.negative {
  color: rgb(var(--v-theme-error));
}
.reasons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 18px;
}
.reason,
.warning {
  font-size: 0.8rem;
  line-height: 1.4;
  padding: 5px 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.09);
}
.warning {
  background: rgba(var(--v-theme-warning), 0.12);
}
.result-balance {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
dt {
  font-size: 0.8rem;
}
dd {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 4px;
}
.trip-details {
  margin-top: 14px;
}
.match-details {
  margin-top: 12px;
}
.match-details .reasons {
  margin-top: 4px;
}
.match-details > p {
  margin-top: 12px;
}
summary {
  min-height: 44px;
  cursor: pointer;
  padding: 12px 0;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.trip-details ul {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}
.trip-details li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.trip-details li > div {
  flex: 1;
  min-width: 120px;
  overflow-wrap: anywhere;
}
.trip-details li p {
  font-size: 0.85rem;
}
.trip-details > p {
  margin-top: 8px;
}
.result-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.result-actions a {
  font-size: 0.85rem;
  padding-block: 12px;
}
.v-btn {
  min-height: 44px;
  text-transform: none;
  letter-spacing: normal;
}
@media (max-width: 700px) {
  .result-main {
    grid-template-columns: 88px minmax(0, 1fr);
    grid-template-areas: 'photo cost' 'intro intro';
    gap: 12px;
  }
  .result-photo {
    grid-area: photo;
    height: 88px;
  }
  .result-intro {
    grid-area: intro;
  }
  .result-intro h3 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .result-cost {
    grid-area: cost;
  }
  .fit-result {
    padding: 14px;
  }
  .result-heading {
    flex-wrap: nowrap;
    gap: 6px;
  }
  .result-heading > strong,
  .result-heading :deep(.v-label) {
    font-size: 0.8rem;
  }
  .result-actions > .v-btn {
    flex: 1;
  }
}
</style>
