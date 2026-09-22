<template>
  <component
    :is="mobile ? VDialog : 'div'"
    v-bind="dialogProps"
    @update:model-value="emit('update:open', $event)"
    @after-enter="focusDialogHeading"
    @after-leave="emit('closed')"
  >
    <form
      class="rental-search"
      :class="{ 'rental-search--dialog': mobile, 'rental-search--sidebar': !mobile }"
      :aria-label="t('search')"
      @invalid.capture="revealInvalidField"
      @submit.prevent="submit"
    >
      <header class="rental-search__header">
        <h2 id="rental-filters-title" ref="dialogHeading" tabindex="-1">
          {{ t('mobileFilters') }}
        </h2>
        <VBtn
          v-if="mobile"
          icon="mdi-close"
          variant="text"
          :aria-label="t('closeFilters')"
          data-testid="rental-filters-cancel"
          @click="emit('update:open', false)"
        />
      </header>
      <div class="rental-search__scroll">
        <fieldset class="rental-search__primary">
          <legend>{{ t('whereSearch') }}</legend>
          <div class="rental-search__fields">
            <VSelect
              v-model="draft.department"
              :items="departments"
              :label="t('location')"
              v-bind="field"
              class="rental-search__wide"
              @update:model-value="clearNeighborhoods"
            />
            <VAutocomplete
              v-model="draft.neighborhoods"
              :items="neighborhoods"
              :custom-filter="rentalTextMatches"
              :label="t('neighborhoods')"
              multiple
              chips
              closable-chips
              clear-on-select
              clearable
              v-bind="field"
              class="rental-search__wide"
            />
            <ZonesPicker
              :model-value="directoryZones"
              :department="draft.department"
              directory
              class="rental-search__wide"
              @update:model-value="applyZones"
            />
          </div>
        </fieldset>
        <fieldset>
          <legend>{{ t('rentBudget') }}</legend>
          <div class="rental-search__fields rental-search__price-range">
            <VTextField
              v-model="draft.priceMin"
              :label="t(mobile ? 'priceMinCompact' : 'priceMin')"
              type="number"
              min="0"
              inputmode="numeric"
              clearable
              v-bind="numberField('priceMin')"
              data-testid="rental-filter-priceMin"
            />
            <VTextField
              v-model="draft.priceMax"
              :label="t(mobile ? 'priceMaxCompact' : 'priceMax')"
              type="number"
              min="0"
              inputmode="numeric"
              clearable
              v-bind="numberField('priceMax')"
              data-testid="rental-filter-priceMax"
            />
          </div>
          <p class="rental-search__hint">
            {{ t(mobile ? 'rentBudgetHintCompact' : 'rentBudgetHint') }}
          </p>
        </fieldset>
        <fieldset>
          <legend>{{ t('homeSearch') }}</legend>
          <div class="rental-search__fields">
            <VSelect
              v-model="draft.types"
              :items="typeItems"
              :label="t('type')"
              :placeholder="t('allTypes')"
              multiple
              chips
              closable-chips
              clearable
              v-bind="field"
              class="rental-search__wide"
              data-testid="rental-filter-type"
            />
            <VSelect
              v-model="draft.bedrooms"
              :items="bedroomItems"
              :label="t('bedrooms')"
              v-bind="field"
            />
          </div>
          <VCheckbox
            v-if="draft.bedrooms !== null && draft.bedrooms > 0"
            v-model="draft.bedroomsExact"
            :label="t('exactBedrooms')"
            hide-details
            density="compact"
            color="primary"
          />
          <p v-if="draft.types.includes('vivienda')" class="rental-search__hint">
            {{ t('homesHint') }}
          </p>
        </fieldset>
        <details
          class="rental-search__group"
          :open="costsOpen"
          @toggle="costsOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary data-testid="rental-costs-toggle">
            {{ t('totalAndExpenses') }}
            <span v-if="costSummary" class="rental-search__selected">{{ costSummary }}</span>
          </summary>
          <div class="rental-search__fields">
            <VTextField
              v-model="draft.monthlyMax"
              :label="t('monthlyMax')"
              type="number"
              min="0"
              inputmode="numeric"
              clearable
              v-bind="numberField('monthlyMax')"
              data-testid="rental-filter-monthlyMax"
              class="rental-search__wide"
            />
            <VTextField
              v-model="draft.expensesMax"
              :label="t('expensesMax')"
              type="number"
              min="0"
              inputmode="numeric"
              clearable
              v-bind="numberField('expensesMax')"
              data-testid="rental-filter-expensesMax"
              class="rental-search__wide"
            />
          </div>
          <p class="rental-search__hint">{{ t('monthlyHint') }}</p>
          <VCheckbox
            v-model="noExpenses"
            :label="t('noExpenses')"
            hide-details
            density="compact"
            color="primary"
          />
          <VCheckbox
            v-model="draft.withExpenses"
            :label="t('expensesKnown')"
            hide-details
            density="compact"
            color="primary"
          />
        </details>
        <details
          id="rental-advanced"
          class="rental-search__group"
          :open="advancedOpen"
          @toggle="advancedOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary data-testid="rental-advanced-toggle">
            {{ t('features') }}
            <span v-if="featureSummary" class="rental-search__selected">{{ featureSummary }}</span>
          </summary>
          <div class="rental-search__fields">
            <VSelect
              v-model="draft.bathrooms"
              :items="bathroomItems"
              :label="t('bathrooms')"
              v-bind="field"
              class="rental-search__wide"
            />
            <VTextField
              v-model="draft.areaMin"
              :label="t('areaMin')"
              type="number"
              min="0"
              inputmode="numeric"
              clearable
              v-bind="numberField('areaMin')"
              data-testid="rental-filter-areaMin"
            />
            <VTextField
              v-model="draft.areaMax"
              :label="t('areaMax')"
              type="number"
              min="0"
              inputmode="numeric"
              clearable
              v-bind="numberField('areaMax')"
              data-testid="rental-filter-areaMax"
            />
            <VTextField
              v-model="draft.q"
              :label="t('text')"
              maxlength="80"
              clearable
              v-bind="field"
              class="rental-search__wide"
            />
          </div>
          <div class="rental-search__checks">
            <VCheckbox
              v-model="draft.pets"
              :label="t('pets')"
              hide-details
              density="compact"
              color="primary"
            />
            <VCheckbox
              v-model="draft.parking"
              :label="t('parking')"
              hide-details
              density="compact"
              color="primary"
            /><VCheckbox
              v-model="draft.furnished"
              :label="t('furnished')"
              hide-details
              density="compact"
              color="primary"
            />
          </div>
          <VSelect
            v-model="draft.amenities"
            :items="amenityItems"
            :label="t('amenities')"
            v-bind="field"
            multiple
            chips
            closable-chips
            clearable
            class="mt-2"
            data-testid="rental-filter-amenities"
          />
          <p class="rental-search__hint">{{ t('amenitiesHint') }}</p>
        </details>
        <details
          class="rental-search__group"
          :open="conditionsOpen"
          @toggle="conditionsOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary data-testid="rental-conditions-toggle">
            {{ t('conditions') }}
            <span v-if="conditionSummary" class="rental-search__selected">{{
              conditionSummary
            }}</span>
          </summary>
          <VCheckbox
            v-model="draft.owner"
            :label="t('owner')"
            hide-details
            density="compact"
            color="primary"
          />
          <VSelect
            v-model="draft.guarantees"
            :items="guaranteeItems"
            :label="t('guarantee')"
            v-bind="field"
            multiple
            chips
            closable-chips
            clearable
          />
          <p class="rental-search__hint">{{ t('guaranteeHint') }}</p>
        </details>
        <details
          class="rental-search__group"
          :open="servicesOpen"
          @toggle="servicesOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary data-testid="rental-services-toggle">
            {{ t('neighborhoodServices') }}
            <span v-if="serviceSummary" class="rental-search__selected">{{ serviceSummary }}</span>
          </summary>
          <p class="rental-search__hint rental-search__hint--lead">{{ t('servicesHint') }}</p>
          <ul class="rental-search__services" data-testid="rental-filter-services">
            <li
              v-for="option in serviceOptions"
              :key="option.attribute"
              class="rental-search__service"
              :class="{ 'rental-search__service--off': !serviceRange(option) }"
              :data-testid="`rental-service-${option.attribute}`"
            >
              <div class="rental-search__service-head">
                <span
                  :id="`rental-service-${option.attribute}-name`"
                  class="rental-search__service-name"
                  >{{ t(`service-${option.attribute}`) }}</span
                >
                <span
                  class="rental-search__service-limit"
                  :data-testid="`rental-service-${option.attribute}-limit`"
                  >{{ serviceLimit(option) }}</span
                >
              </div>
              <template v-if="serviceRange(option)">
                <VSlider
                  :model-value="serviceValue(option)"
                  :min="serviceRange(option)!.min"
                  :max="serviceRange(option)!.max"
                  :step="1"
                  :ticks="serviceTicks(option)"
                  show-ticks="always"
                  tick-size="3"
                  track-size="3"
                  thumb-size="16"
                  hide-details
                  density="compact"
                  color="primary"
                  class="rental-search__service-slider"
                  :aria-labelledby="`rental-service-${option.attribute}-name`"
                  :data-testid="`rental-service-${option.attribute}-slider`"
                  @update:model-value="setServiceMax(option, $event)"
                />
                <p class="rental-search__service-note">
                  <span :data-testid="`rental-service-${option.attribute}-keeps`">{{
                    serviceKeeps(option)
                  }}</span>
                  <button
                    v-if="option.low !== null"
                    type="button"
                    class="rental-search__service-third"
                    :data-testid="`rental-service-${option.attribute}-third`"
                    @click="setServiceMax(option, Math.floor(option.low))"
                  >
                    {{ t('serviceThird', { n: serviceNumber(Math.floor(option.low)) }) }}
                  </button>
                </p>
                <p
                  v-if="serviceFootnote(option)"
                  class="rental-search__service-note rental-search__service-note--foot"
                  :data-testid="`rental-service-${option.attribute}-foot`"
                >
                  {{ serviceFootnote(option) }}
                </p>
              </template>
            </li>
          </ul>
          <p v-if="servicesMounted && serviceFilters.error.value" class="rental-search__hint">
            {{ t('servicesUnavailable') }}
          </p>
          <NuxtLink :to="localePath('/barrios-alquileres-uruguay')" class="rental-search__link">{{
            t('servicesMap')
          }}</NuxtLink>
        </details>
        <details
          class="rental-search__group"
          :open="sourceOpen"
          @toggle="sourceOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary data-testid="rental-source-toggle">
            {{ t('sourceAndAvailability') }}
            <span v-if="sourceSummary" class="rental-search__selected">{{ sourceSummary }}</span>
          </summary>
          <PropertyAgencyFilter v-model="draft.agency" />
          <div class="rental-search__fields">
            <VSelect
              v-model="draft.source"
              :items="sourceItems"
              :label="t('source')"
              v-bind="field"
              class="rental-search__wide"
            />
            <VSelect
              v-model="draft.currency"
              :items="currencyItems"
              :label="t('currency')"
              v-bind="field"
              class="rental-search__wide"
            />
            <VSelect
              v-model="draft.availability"
              :items="availabilityItems"
              :label="availabilityCopy.filter"
              v-bind="field"
              class="rental-search__wide"
            />
          </div>
          <p class="rental-search__hint">{{ availabilityCopy.filterHint }}</p>
          <VCheckbox
            v-model="draft.multi"
            :label="t('multi')"
            hide-details
            density="compact"
            color="primary"
          />
        </details>
        <details
          class="rental-search__group"
          :open="nearbyOpen"
          @toggle="nearbyOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary data-testid="rental-nearby-toggle">
            {{ t('nearby') }}
            <span v-if="nearbySummary" class="rental-search__selected">{{ nearbySummary }}</span>
          </summary>
          <div class="rental-search__fields">
            <VSelect
              v-model="institution"
              :items="mutualistaItems"
              :label="t('institution')"
              clearable
              v-bind="field"
              class="rental-search__wide"
              @update:model-value="draft.sedes = []"
            />
            <VSelect
              v-model="draft.sedes"
              :items="sedeItems"
              :label="t('branches')"
              v-bind="field"
              :disabled="!institution"
              multiple
              chips
              closable-chips
              clearable
              class="rental-search__wide"
            />
          </div>
          <VSlider
            v-model="draft.radioKm"
            :label="t('radius', { n: draft.radioKm })"
            :min="0.3"
            :max="5"
            :step="0.1"
            :disabled="!draft.sedes.length"
            hide-details
            class="mt-4"
          />
          <p class="rental-search__hint">{{ t('nearbyHint') }}</p>
        </details>
        <p class="rental-search__hint">{{ t('knownHint') }}</p>
      </div>
      <footer class="rental-search__footer">
        <p v-if="hasErrors" class="rental-search__error" role="alert">{{ t('fixFields') }}</p>
        <VBtn variant="text" data-testid="rental-filters-reset" @click="reset">{{
          t('clearDraft')
        }}</VBtn>
        <VBtn color="primary" type="submit" data-testid="rental-filters-apply" :loading="pending">{{
          t(mobile ? 'applyFilters' : 'search')
        }}</VBtn>
      </footer>
    </form>
  </component>
</template>

<script setup lang="ts">
import { rentalAvailabilityCopy } from '~/utils/rentalAvailabilityMessages'
import { VDialog } from 'vuetify/components'
import { rentalMessages } from '~/utils/rentalMessages'
import {
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  normalizeRentalQuery,
  rentalTextMatches,
  type RentalFacetValue,
  type RentalQuery,
} from '~/utils/rentals'
import { MUTUALISTA_SEDES, mutualistasConSede } from '~/utils/mutualistaSedes'
import { RENTAL_AMENITIES } from '~/utils/rentalAmenities'
import ZonesPicker from './zones/Picker.vue'
import type {
  RentalServiceFilterOption,
  RentalZonePreferences,
  RentalZoneUtilitiesMeta,
} from '~/utils/rentalZoneTypes'
import {
  RENTAL_POWER_MIN_DAYS,
  RENTAL_POWER_PRELIMINARY_DAYS,
  RENTAL_SERVICE_FILTERS,
  URSEA_URBAN_DENSE_MINUTES_PER_MONTH,
} from '~/utils/rentalZoneServices'

const props = withDefaults(
  defineProps<{
    query: RentalQuery
    departments: RentalFacetValue[]
    neighborhoods: RentalFacetValue[]
    pending: boolean
    mobile?: boolean
    open?: boolean
  }>(),
  { mobile: false, open: false }
)
const emit = defineEmits<{
  search: [query: RentalQuery]
  clear: []
  department: [department: string]
  'update:open': [open: boolean]
  closed: []
}>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalMessages })
const availabilityCopy = computed(() => rentalAvailabilityCopy(locale.value))
const availabilityItems = computed(() =>
  ['all', 'hide_multiple', 'hide_any'].map(value => ({
    value,
    title: availabilityCopy.value[value as 'all' | 'hide_multiple' | 'hide_any'],
  }))
)
const dialogHeading = ref<HTMLElement | null>(null)
const advancedOpen = ref(
  !props.mobile &&
    Boolean(
      props.query.q ||
        props.query.bathrooms !== null ||
        props.query.areaMin !== null ||
        props.query.areaMax !== null ||
        props.query.parking ||
        props.query.furnished ||
        props.query.pets ||
        props.query.amenities.length
    )
)
const costsOpen = ref(
  !props.mobile &&
    (props.query.monthlyMax !== null ||
      props.query.expensesMax !== null ||
      props.query.withExpenses)
)
const conditionsOpen = ref(
  !props.mobile && Boolean(props.query.guarantees.length || props.query.owner)
)
const sourceOpen = ref(
  !props.mobile &&
    Boolean(
      props.query.source ||
        props.query.agency ||
        props.query.currency ||
        props.query.availability !== 'all' ||
        props.query.multi
    )
)
const nearbyOpen = ref(!props.mobile && Boolean(props.query.sedes.length))
const servicesOpen = ref(!props.mobile && Boolean(props.query.servicios?.length))
const localePath = useLocalePath()
// Which neighbourhood-service filters exist right now; loaded on the client, never blocks the form.
const serviceFilters = useFetch<{
  options: RentalServiceFilterOption[]
  meta: RentalZoneUtilitiesMeta | null
}>('/api/rentals/service-filters', { key: 'rental-service-filters', server: false, lazy: true })
// SSR renders every option without its slider; the fetched state only applies after mount, or a
// response that lands before this subtree hydrates would add controls under Vue's feet.
const servicesMounted = ref(false)
onMounted(() => {
  servicesMounted.value = true
})
const serviceOptions = computed<RentalServiceFilterOption[]>(
  () =>
    (servicesMounted.value ? serviceFilters.data.value?.options : undefined) ??
    RENTAL_SERVICE_FILTERS.map(attribute => ({
      attribute,
      available: false,
      status: 'unavailable' as const,
      low: null,
      high: null,
      zones: 0,
      values: [],
    }))
)
const serviceNumber = (value: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)
/**
 * Each attribute is a maximum the listing's official area must stay under, moved on a slider that
 * spans the real spread between areas; parked at the top it means "no limit" and leaves the URL. A
 * checkbox could only offer the best third, which is a bound someone else chose.
 */
// The edge caches /service-filters for minutes: right after a deploy the new page can still get a
// payload without `values`, and that must read as "no slider yet", never as a render error.
const serviceValues = (option: RentalServiceFilterOption): number[] =>
  Array.isArray(option.values) ? option.values : []
const serviceRange = (option: RentalServiceFilterOption) => {
  const values = serviceValues(option)
  return option.available && values.length
    ? { min: Math.floor(values[0]!), max: Math.ceil(values[values.length - 1]!) }
    : null
}
const serviceSelection = (option: RentalServiceFilterOption) =>
  draft.value.servicios?.find(selection => selection.attribute === option.attribute)
/** A bare selection (older link, MCP) sits at the best third's bound, which is what it means. */
const serviceMax = (option: RentalServiceFilterOption) => {
  const selection = serviceSelection(option)
  if (!selection) return null
  if (selection.max !== null) return selection.max
  return option.low !== null ? Math.floor(option.low) : null
}
const serviceValue = (option: RentalServiceFilterOption) => {
  const range = serviceRange(option)
  const max = serviceMax(option)
  if (!range) return 0
  return max === null ? range.max : Math.min(range.max, Math.max(range.min, max))
}
/** Tick marks at the tercile bounds, so the slider still shows where "the best third" ends. */
const serviceTicks = (option: RentalServiceFilterOption) =>
  [option.low, option.high]
    .filter((value): value is number => value !== null)
    .map(value => Math.round(value))
function setServiceMax(option: RentalServiceFilterOption, value: number) {
  const range = serviceRange(option)
  if (!range) return
  const rest = (draft.value.servicios ?? []).filter(
    selection => selection.attribute !== option.attribute
  )
  const bounded = Math.round(value)
  draft.value.servicios =
    bounded >= range.max
      ? rest
      : RENTAL_SERVICE_FILTERS.flatMap(attribute =>
          attribute === option.attribute
            ? [{ attribute, max: Math.max(range.min, bounded) }]
            : rest.filter(selection => selection.attribute === attribute)
        )
}
/** What the current bound reads as: the exact limit with its unit, or that there is none. */
function serviceLimit(option: RentalServiceFilterOption) {
  if (option.attribute === 'luz' && option.status === 'collecting' && powerCollecting.value)
    return t('serviceMeasuring', powerCollecting.value)
  if (!serviceRange(option)) return t('serviceNoData')
  const max = serviceMax(option)
  return max === null
    ? t('serviceUnlimited')
    : t(`serviceLimit-${option.attribute}`, { n: serviceNumber(max) })
}
/** How many areas the bound keeps, counted on the same values the server filters by. */
function serviceKeeps(option: RentalServiceFilterOption) {
  const range = serviceRange(option)
  const max = serviceMax(option)
  const values = serviceValues(option)
  if (!range) return ''
  if (max === null)
    return t('serviceRange', {
      min: serviceNumber(values[0]!),
      max: serviceNumber(values[values.length - 1]!),
      zones: values.length,
    })
  return t('serviceKeeps', {
    kept: values.filter(value => value <= max).length,
    zones: values.length,
  })
}
/**
 * Power is the one layer with a provisional stage (our own ledger, published from a few days with a
 * label) and the one with a public benchmark: URSEA's semester target for dense urban areas, so the
 * reader can tell whether "12 min a month" is a lot. Nobody publishes cuts per barrio (2026-09-21).
 */
function serviceFootnote(option: RentalServiceFilterOption) {
  if (option.attribute !== 'luz') return ''
  const power = servicesMounted.value ? serviceFilters.data.value?.meta?.power : undefined
  return [
    option.status === 'preliminary' && power
      ? t('serviceProvisional', {
          days: serviceNumber(Math.floor(power.observedDays)),
          min: RENTAL_POWER_MIN_DAYS,
        })
      : '',
    t('serviceLuzBenchmark', { n: URSEA_URBAN_DENSE_MINUTES_PER_MONTH }),
  ]
    .filter(Boolean)
    .join(' · ')
}
const powerCollecting = computed(() => {
  const power = servicesMounted.value ? serviceFilters.data.value?.meta?.power : undefined
  return power?.status === 'collecting' && power.observedFrom
    ? {
        date: new Intl.DateTimeFormat(dateLocale(locale.value), {
          dateStyle: 'long',
          timeZone: 'UTC',
        }).format(new Date(power.observedFrom)),
        days: serviceNumber(Math.floor(power.observedDays)),
        // The slider unlocks on the provisional threshold, so that is the wait worth announcing.
        min: RENTAL_POWER_PRELIMINARY_DAYS,
      }
    : null
})
const viewportHeight = ref<number | null>(null)
const viewportTop = ref(0)
const dialogProps = computed(() =>
  props.mobile
    ? {
        modelValue: props.open,
        transition: 'rental-drawer-transition',
        class: 'rental-filters-drawer',
        id: 'rental-mobile-filters-dialog',
        'data-testid': 'rental-mobile-filters-dialog',
        'aria-labelledby': 'rental-filters-title',
        contentProps: {
          style: {
            width: 'min(420px, calc(100vw - 24px))',
            maxWidth: 'calc(100vw - 24px)',
            height: viewportHeight.value ? `${viewportHeight.value}px` : '100dvh',
            maxHeight: '100%',
            top: `${viewportTop.value}px`,
            right: 0,
            left: 'auto',
            margin: 0,
            overflow: 'hidden',
          },
        },
      }
    : {}
)
function syncViewport() {
  viewportHeight.value = window.visualViewport?.height ?? window.innerHeight
  viewportTop.value = window.visualViewport?.offsetTop ?? 0
}
function stopViewport() {
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
  window.removeEventListener('resize', syncViewport)
}
function focusDialogHeading() {
  if (dialogHeading.value?.closest('form')?.contains(document.activeElement)) return
  dialogHeading.value?.focus({ preventScroll: true })
}
const copy = (query: RentalQuery): RentalQuery => ({
  ...query,
  types: [...query.types],
  neighborhoods: [...query.neighborhoods],
  guarantees: [...query.guarantees],
  amenities: [...query.amenities],
  sedes: [...query.sedes],
  servicios: (query.servicios ?? []).map(selection => ({ ...selection })),
})
const draft = ref(copy(props.query))
const directoryZones = computed<RentalZonePreferences>(() => ({
  mode: 'only',
  include: draft.value.department
    ? draft.value.neighborhoods.map(neighborhood => ({
        department: draft.value.department,
        neighborhood,
      }))
    : [],
  exclude: [],
}))
function applyZones(zones: RentalZonePreferences) {
  if (zones.include.length) draft.value.department = zones.include[0]!.department
  draft.value.neighborhoods = zones.include.map(zone => zone.neighborhood)
  draft.value.neighborhood = zones.include.length === 1 ? zones.include[0]!.neighborhood : ''
}
const institution = ref(
  MUTUALISTA_SEDES.find(s => s.osmId === props.query.sedes[0])?.mutualista || ''
)
watch(
  () => props.open,
  open => {
    if (!import.meta.client) return
    stopViewport()
    if (!open) return
    draft.value = copy(props.query)
    // Keep the user's disclosure state. Active criteria remain visible in each summary.
    institution.value =
      MUTUALISTA_SEDES.find(s => s.osmId === props.query.sedes[0])?.mutualista || ''
    syncViewport()
    window.visualViewport?.addEventListener('resize', syncViewport)
    window.visualViewport?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)
  }
)
onBeforeUnmount(() => {
  if (import.meta.client) stopViewport()
})
watch(
  () => props.query,
  query => {
    draft.value = copy(query)
    institution.value = MUTUALISTA_SEDES.find(s => s.osmId === query.sedes[0])?.mutualista || ''
  }
)
watch(
  () => draft.value.department,
  department => emit('department', department)
)
const field = { variant: 'outlined', density: 'comfortable', hideDetails: true } as const
const departments = computed(() => [
  { title: t('country'), value: '' },
  ...Array.from(
    new Set([...props.departments.map(f => f.value), draft.value.department].filter(Boolean))
  ).map(value => ({ title: value, value })),
])
const neighborhoods = computed(() =>
  Array.from(new Set([...props.neighborhoods.map(f => f.value), ...draft.value.neighborhoods])).map(
    value => ({ title: value, value })
  )
)
const typeItems = computed(() => [
  { title: t('homes'), value: 'vivienda' },
  { title: t('offices'), value: 'oficina' },
  { title: t('commercials'), value: 'local' },
  { title: t('garages'), value: 'garaje' },
  ...Object.entries({
    apartamento: 'apartment',
    casa: 'house',
    habitacion: 'room',
    terreno: 'land',
    otro: 'other',
  }).map(([value, label]) => ({ title: t(label), value })),
])
const bedroomItems = computed(() => [
  { title: t('any'), value: null },
  { title: t('studio'), value: 0 },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => ({
    title: draft.value.bedroomsExact ? String(value) : t('atLeast', { n: value }),
    value,
  })),
])
const bathroomItems = computed(() => [
  { title: t('any'), value: null },
  ...[1, 2, 3].map(value => ({ title: t('atLeast', { n: value }), value })),
])
const currencyItems = computed(() => [
  { title: t('any'), value: '' },
  { title: t('uyu'), value: 'UYU' },
  { title: t('usd'), value: 'USD' },
])
const sourceItems = computed(() => [
  { title: t('allSources'), value: '' },
  ...Object.entries(RENTAL_SOURCE_LABEL).map(([value, title]) => ({ title, value })),
])
const guaranteeItems = computed(() =>
  RENTAL_GUARANTEE_PUBLISHED.map(value => ({ title: t(value), value }))
)
const amenityItems = computed(() =>
  RENTAL_AMENITIES.map(value => ({ title: t(`amenity-${value}`), value }))
)
const mutualistaItems = mutualistasConSede()
const sedeItems = computed(() =>
  MUTUALISTA_SEDES.filter(s => s.mutualista === institution.value).map(s => ({
    title: `${s.nombre}${s.direccion ? ` · ${s.direccion}` : ''}`,
    value: s.osmId,
  }))
)
const noExpenses = computed({
  get: () => String(draft.value.expensesMax) === '0',
  set: value => {
    draft.value.expensesMax = value ? 0 : null
  },
})
const numericKeys = [
  'priceMin',
  'priceMax',
  'monthlyMax',
  'expensesMax',
  'areaMin',
  'areaMax',
] as const
type NumericKey = (typeof numericKeys)[number]
const present = (value: unknown) => value !== null && value !== undefined && value !== ''
const errors = computed(() => {
  const result: Partial<Record<NumericKey, string>> = {}
  for (const key of numericKeys) {
    const value = draft.value[key]
    if (
      present(value) &&
      (!/^\d+(?:\.\d+)?$/.test(String(value)) ||
        !Number.isFinite(Number(value)) ||
        Number(value) > Number.MAX_SAFE_INTEGER)
    )
      result[key] = t('invalidNumber')
    if (
      present(value) &&
      ['priceMax', 'monthlyMax', 'areaMax'].includes(key) &&
      Number(value) === 0
    )
      result[key] = t('positiveMaximum')
  }
  for (const [min, max] of [
    ['priceMin', 'priceMax'],
    ['areaMin', 'areaMax'],
  ] as const) {
    if (
      present(draft.value[min]) &&
      present(draft.value[max]) &&
      Number(draft.value[min]) > Number(draft.value[max])
    )
      result[max] = t('invalidRange')
  }
  return result
})
const hasErrors = computed(() => Object.keys(errors.value).length > 0)
const numberField = (key: NumericKey) => ({
  ...field,
  step: 'any',
  hideDetails: 'auto' as const,
  errorMessages: errors.value[key] || [],
})
const summary = (values: (string | false)[]) => values.filter(Boolean).join(' · ')
const amountSummary = (key: NumericKey) =>
  present(draft.value[key]) && `${t(key)}: ${draft.value[key]}`
const costSummary = computed(() =>
  summary([
    amountSummary('monthlyMax'),
    noExpenses.value ? t('noExpenses') : amountSummary('expensesMax'),
    draft.value.withExpenses && t('expensesKnown'),
  ])
)
const featureSummary = computed(() =>
  summary([
    draft.value.pets && t('pets'),
    draft.value.parking && t('parking'),
    draft.value.furnished && t('furnished'),
    ...draft.value.amenities.map(value => t(`amenity-${value}`)),
    present(draft.value.bathrooms) &&
      `${t('bathrooms')}: ${t('atLeast', { n: draft.value.bathrooms })}`,
    amountSummary('areaMin'),
    amountSummary('areaMax'),
    draft.value.q && `${t('text')}: ${draft.value.q}`,
  ])
)
const conditionSummary = computed(() =>
  summary([draft.value.owner && t('owner'), ...draft.value.guarantees.map(value => t(value))])
)
const sourceSummary = computed(() =>
  summary([
    draft.value.agency && t('selectedAgency'),
    draft.value.source && RENTAL_SOURCE_LABEL[draft.value.source],
    draft.value.currency,
    draft.value.availability !== 'all' && availabilityCopy.value[draft.value.availability],
    draft.value.multi && t('multi'),
  ])
)
const serviceSummary = computed(() =>
  summary(
    (draft.value.servicios ?? []).map(({ attribute, max }) =>
      max === null
        ? t('serviceThirdChip', { item: t(`serviceChip-${attribute}`) })
        : t(`serviceMax-${attribute}`, { n: serviceNumber(max) })
    )
  )
)
const nearbySummary = computed(() =>
  draft.value.sedes.length
    ? `${t('branches')}: ${draft.value.sedes.length} · ${t('radius', { n: draft.value.radioKm })}`
    : ''
)
function revealInvalidField(event: Event) {
  // Native number validation runs before submit. Open synchronously so the browser
  // can focus a negative or incomplete numeric value even in a collapsed group.
  const input = event.target as HTMLInputElement
  const group = input.closest<HTMLDetailsElement>('details')
  if (!group) return
  if (group.id === 'rental-advanced') advancedOpen.value = true
  else costsOpen.value = true
  group.open = true
}
async function submit() {
  if (hasErrors.value) {
    const first = numericKeys.find(key => errors.value[key])
    // A collapsed invalid field must become reachable before moving focus to it.
    if (first === 'monthlyMax' || first === 'expensesMax') costsOpen.value = true
    if (first === 'areaMin' || first === 'areaMax') advancedOpen.value = true
    await nextTick()
    document
      .querySelector<HTMLInputElement>(`[data-testid="rental-filter-${first}"] input`)
      ?.focus()
    return
  }
  emit('search', copy(draft.value))
}
function reset() {
  draft.value = normalizeRentalQuery()
  institution.value = ''
  advancedOpen.value =
    costsOpen.value =
    conditionsOpen.value =
    servicesOpen.value =
    sourceOpen.value =
    nearbyOpen.value =
      false
  if (!props.mobile) emit('clear')
}
function clearNeighborhoods() {
  draft.value.neighborhoods = []
  draft.value.neighborhood = ''
}
</script>

<style scoped>
.rental-search__wide {
  grid-column: 1 / -1;
}
.rental-search .rental-search__primary {
  border-top: 0;
}
.rental-search__group {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin-top: 16px;
}
.rental-search__group > summary {
  min-height: 48px;
  padding-block: 12px;
  cursor: pointer;
  font-weight: 700;
}
.rental-search__selected {
  display: block;
  margin-top: 4px;
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.5;
  overflow-wrap: anywhere;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.rental-search__group > summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.rental-search__group[open] {
  padding-bottom: 8px;
}
.rental-search__group[open] > summary {
  margin-bottom: 8px;
}
.rental-search {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-width: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}
.rental-search--sidebar {
  max-height: calc(100dvh - 160px);
}
.rental-search__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
}
.rental-search__hint {
  margin: 12px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.8rem;
  line-height: 1.5;
}
.rental-search__hint--lead {
  margin: 0 0 8px;
}
.rental-search__services {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.rental-search__service {
  display: grid;
  gap: 0;
  padding-block: 8px 4px;
  line-height: 1.35;
}
.rental-search__service--off {
  padding-block: 8px;
}
.rental-search__service-head {
  display: grid;
  gap: 1px;
}
.rental-search__service-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}
.rental-search__service--off .rental-search__service-name {
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.rental-search__service-limit {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-search__service-slider {
  /* The label lives in the head above; the control only needs its 44 px touch band. */
  margin-inline: 4px;
}
.rental-search__service-slider :deep(.v-slider-track__tick) {
  background: rgba(var(--v-theme-on-surface), 0.42);
}
/* The marks show where the terciles end; their numbers would sit on top of the note below. */
.rental-search__service-slider :deep(.v-slider-track__tick-label) {
  display: none;
}
.rental-search__service-note {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 2px 12px;
  font-size: 0.75rem;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-search__service-note--foot {
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.rental-search__service-third {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: rgb(var(--v-theme-link));
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  min-height: 24px;
}
.rental-search__checks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 24px;
}
fieldset {
  border: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 20px 0 8px;
  margin: 12px 0 0;
  min-width: 0;
}
legend {
  margin-bottom: 12px;
  padding-right: 12px;
  font-weight: 700;
}
.rental-search__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.rental-search--dialog {
  height: 100%;
  border: 0;
  border-radius: 0;
}
.rental-search--dialog .rental-search__scroll {
  padding: 14px 16px 16px;
}
.rental-search--dialog fieldset {
  padding-top: 14px;
  margin-top: 8px;
}
.rental-search--dialog .rental-search__footer {
  padding-top: 8px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}
.rental-search--dialog .rental-search__footer > .v-btn {
  min-height: 44px;
}
.rental-search__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px
    max(16px, env(safe-area-inset-left));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-search__header h2 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
}
.rental-search--sidebar .rental-search__header {
  padding: 16px;
}
.rental-search__scroll {
  flex: 1 1 auto;
  min-height: 0;
  padding: 20px max(16px, env(safe-area-inset-right)) 24px max(16px, env(safe-area-inset-left));
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  scroll-padding-block: 16px;
}
.rental-search--sidebar .rental-search__fields {
  grid-template-columns: minmax(0, 1fr);
}
.rental-search--sidebar .rental-search__checks {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}
.rental-search :deep(input) {
  font-size: 16px;
}
.rental-search :deep(.v-selection-control) {
  min-height: 44px;
}
.rental-search :deep(.v-autocomplete .v-field input) {
  /* Keep the search row stable when a tap moves focus to the next filter. */
  min-width: 64px;
}
.rental-search :deep(.v-autocomplete--chips .v-autocomplete__selection) {
  /* Let each row contain its 44px chip instead of Vuetify's fixed 24px box. */
  height: auto;
}
.rental-search :deep(.v-chip) {
  min-height: 44px;
}
.rental-search :deep(.v-chip__close) {
  flex: 0 0 44px;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  max-width: 44px;
  max-height: 44px;
}
.rental-search :deep(.v-selection-control .v-label) {
  white-space: normal;
  overflow-wrap: anywhere;
}
.rental-search__footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 12px max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-left));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
.rental-search__footer > .v-btn {
  min-height: 48px;
}
.rental-search--sidebar .rental-search__footer {
  padding: 12px;
}
.rental-search__error {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgb(var(--v-theme-error));
}
@media (max-width: 599px) {
  .rental-search__fields {
    grid-template-columns: 1fr;
  }
  .rental-search--dialog .rental-search__price-range {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}
@media (max-width: 360px) {
  .rental-search--dialog :deep(.v-field-label:not(.v-field-label--floating)) {
    font-size: 14px;
  }
}
</style>

<style>
/* Keep Vuetify's focus trap, scroll lock and nested select menus in a side drawer. */
.rental-filters-drawer > .v-overlay__content.rental-drawer-transition-enter-active,
.rental-filters-drawer > .v-overlay__content.rental-drawer-transition-leave-active {
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.rental-filters-drawer > .v-overlay__content.rental-drawer-transition-enter-from,
.rental-filters-drawer > .v-overlay__content.rental-drawer-transition-leave-to {
  transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
  .rental-filters-drawer > .v-overlay__content {
    transition: none !important;
  }
}
</style>
