<template>
  <section class="fit-destination" :aria-label="t('place', { n: index + 1 })">
    <div class="destination-heading">
      <h4>{{ t('place', { n: index + 1 }) }}</h4>
      <VBtn
        icon="mdi-close"
        variant="text"
        :aria-label="t('removePlace')"
        @click="emit('remove')"
      />
    </div>
    <div class="fit-fields">
      <VSelect
        v-model="model.kind"
        :items="kinds"
        :label="t('kind')"
        variant="outlined"
        hide-details
      />
    </div>
    <div v-if="model.lat !== null && model.lng !== null" class="confirmed-point" role="status">
      <VIcon color="primary" size="20">mdi-map-marker-check-outline</VIcon>
      <div>
        <strong>{{ t('selectedPoint') }}</strong>
        <p>{{ model.address || t('mapPoint') }}</p>
      </div>
      <VBtn
        variant="text"
        icon="mdi-pencil-outline"
        :aria-label="t('change')"
        :title="t('change')"
        @click="clearPoint"
      />
    </div>
    <template v-else>
      <RentalsReferenceAddress compact @select="selectAddress" />
      <VBtn variant="text" prepend-icon="mdi-map-marker-outline" @click="mapOpen = true">{{
        t('map')
      }}</VBtn>
    </template>
    <details class="destination-options">
      <summary>
        <span>{{ t('travelOptions') }}</span
        ><small
          >{{ t('visitsSummary', { n: model.days }) }} · {{ t(model.mode) }} ·
          {{ t('targetSummary', { km: model.targetKm }) }}</small
        >
      </summary>
      <div class="fit-fields">
        <VTextField
          v-model="model.label"
          :label="t('placeName')"
          variant="outlined"
          hide-details
          maxlength="60"
          autocomplete="off"
        />
        <VTextField
          v-model.number="model.days"
          :label="t('days')"
          type="number"
          min="0"
          max="7"
          step="1"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="model.mode"
          :items="modes"
          :label="t('mode')"
          variant="outlined"
          hide-details
        />
        <VTextField
          v-model.number="model.targetKm"
          :label="t('target')"
          type="number"
          min="0.1"
          max="300"
          step="0.5"
          variant="outlined"
          hide-details
        />
      </div>
      <p class="field-hint">{{ t('targetHint') }}</p>
    </details>
    <VDialog v-model="mapOpen" max-width="720" scrollable>
      <VCard :title="t('map')" data-clarity-mask="true">
        <VCardText>
          <RentalsFitPointMap v-if="mapOpen" @select="selectMap" />
        </VCardText>
        <VCardActions
          ><VBtn @click="mapOpen = false">{{ t('cancel') }}</VBtn></VCardActions
        >
      </VCard>
    </VDialog>
  </section>
</template>
<script setup lang="ts">
import type { FitDestination } from '~/utils/rentalFitTypes'
import type { RentalGeocodeItem } from '~/utils/rentalGeocode'
import { rentalFitMessages } from '~/utils/rentalFitMessages'
export type DraftDestination = Omit<FitDestination, 'lat' | 'lng'> & {
  lat: number | null
  lng: number | null
  address: string
}
const model = defineModel<DraftDestination>({ required: true })
defineProps<{ index: number }>()
const emit = defineEmits<{ remove: [] }>()
const { t } = useI18n({ useScope: 'local', messages: rentalFitMessages })
const mapOpen = ref(false)
const kinds = computed(() => ['work', 'study', 'other'].map(value => ({ value, title: t(value) })))
const modes = computed(() =>
  ['walking', 'bicycling', 'transit', 'driving'].map(value => ({ value, title: t(value) }))
)
function selectAddress(point: RentalGeocodeItem) {
  model.value.lat = point.lat
  model.value.lng = point.lng
  model.value.address = point.label
}
function selectMap(point: { lat: number; lng: number }) {
  model.value.lat = point.lat
  model.value.lng = point.lng
  model.value.address = t('mapPoint')
  mapOpen.value = false
}
function clearPoint() {
  model.value.lat = null
  model.value.lng = null
  model.value.address = ''
}
</script>
<style scoped>
.fit-destination {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 12px;
  margin-top: 20px;
}
.destination-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
h4,
p {
  margin: 0;
}
.fit-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.fit-fields > * {
  min-width: 0;
}
.confirmed-point {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 16px 0;
}
.confirmed-point > div {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.confirmed-point p,
.field-hint {
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 4px 0 0;
}
.destination-options {
  margin: 12px 0 0;
}
.destination-options summary {
  min-height: 44px;
  padding: 10px 0;
  cursor: pointer;
  font-weight: 600;
}
.destination-options summary small {
  display: block;
  margin: 4px 0 0 16px;
  font-size: 0.8rem;
  font-weight: 400;
  line-height: 1.5;
}
.destination-options[open] .fit-fields {
  margin-top: 16px;
}
.field-hint {
  margin-top: 10px;
}
:deep(input) {
  font-size: 16px;
}
.v-btn {
  min-height: 44px;
  text-transform: none;
  letter-spacing: normal;
}
@media (max-width: 599px) {
  .fit-fields {
    grid-template-columns: minmax(0, 1fr);
  }
  .confirmed-point {
    flex-wrap: wrap;
  }
}
</style>
