<!--
THESIS: Choose a home around the people sharing it, with a visible reason for every recommendation.
OWN-WORLD: Existing light-first Open Sans/Vuetify controls, blue actions and real advert photos.
STORY: Household budget → each person's recurring places → housing needs → explainable results.
FIRST VIEWPORT: A compact introduction and one manageable step, with no automatic overlays.
FORM: Progressive worksheet; results replace the editor, with a sticky edit/compare toolbar.
The user delegated design choices. The composition study informs hierarchy, never fabricated travel times.
-->
<template>
  <VContainer class="rental-fit-page">
    <header class="page-heading">
      <h1>{{ t('title') }}</h1>
      <p>{{ t('intro') }}</p>
      <NuxtLink :to="localePath('/alquileres-uruguay')">{{ t('explore') }}</NuxtLink>
    </header>
    <div class="fit-private" data-clarity-mask="true">
      <template v-if="editing">
        <nav class="fit-toolbar" :aria-label="t('step', { n: step + 1 })">
          <div class="step-links">
            <button
              v-for="(label, index) in steps"
              :key="label"
              type="button"
              :aria-current="step === index ? 'step' : undefined"
              :class="{ active: step === index }"
              @click="goStep(index)"
            >
              <span>{{ index + 1 }}</span
              >{{ t(label) }}
            </button>
          </div>
          <VBtn
            color="primary"
            :loading="pending"
            data-testid="fit-next"
            @click="step < 2 ? goStep(step + 1) : search()"
            >{{ t(step < 2 ? 'next' : 'rank') }}</VBtn
          >
        </nav>
        <div ref="editor" class="fit-editor">
          <div v-show="step === 0" class="fit-step">
            <h2>{{ t('peopleTitle') }}</h2>
            <p class="section-hint">{{ t('peopleHint') }}</p>
            <section v-for="(person, index) in draft.people" :key="person.id" class="person-card">
              <div class="section-heading">
                <h3>{{ t('person', { n: index + 1 }) }}</h3>
                <VBtn
                  v-if="draft.people.length > 1"
                  icon="mdi-close"
                  variant="text"
                  :aria-label="t('removePerson')"
                  @click="draft.people.splice(index, 1)"
                />
              </div>
              <div class="field-grid">
                <VTextField
                  v-model="person.label"
                  :label="t('alias')"
                  variant="outlined"
                  hide-details
                  maxlength="60"
                  autocomplete="off"
                /><VTextField
                  v-model.number="person.incomeUyu"
                  :label="t('income')"
                  type="number"
                  min="0"
                  max="10000000"
                  variant="outlined"
                  hide-details
                />
              </div>
            </section>
            <VBtn
              v-if="draft.people.length < 8"
              variant="text"
              prepend-icon="mdi-account-plus-outline"
              @click="addPerson"
              >{{ t('addPerson') }}</VBtn
            >
            <section class="budget-section">
              <h2>{{ t('budgetTitle') }}</h2>
              <VTextField
                v-model.number="draft.housingBudgetUyu"
                :label="t('budget')"
                type="number"
                min="1"
                max="10000000"
                variant="outlined"
                hide-details
                data-testid="fit-budget"
              />
              <p class="field-hint">{{ t('budgetHint') }}</p>
              <p v-if="totalIncome" class="income-total">
                {{ t('incomeTotal', { amount: money(totalIncome) }) }}
              </p>
              <details class="expenses-details">
                <summary>{{ t('expensesTitle') }}</summary>
                <div class="field-grid">
                  <VTextField
                    v-model.number="draft.otherExpensesUyu"
                    :label="t('otherExpenses')"
                    type="number"
                    min="0"
                    max="10000000"
                    variant="outlined"
                    hide-details
                  />
                  <VTextField
                    v-model.number="draft.savingsUyu"
                    :label="t('savings')"
                    type="number"
                    min="0"
                    max="10000000"
                    variant="outlined"
                    hide-details
                  />
                  <VTextField
                    v-model.number="draft.transportUyu"
                    :label="t('transport')"
                    type="number"
                    min="0"
                    max="10000000"
                    variant="outlined"
                    hide-details
                  />
                </div>
                <p class="field-hint">{{ t('expensesHint') }}</p>
              </details>
              <p v-if="totalIncome" class="income-total">
                {{ t('available', { amount: money(availableIncome) }) }}
              </p>
              <VAlert
                v-if="totalIncome && Number(draft.housingBudgetUyu) > availableIncome"
                type="warning"
                variant="tonal"
                class="mt-3"
                >{{ t('budgetIncomeWarning') }}</VAlert
              >
            </section>
          </div>
          <div v-show="step === 1" class="fit-step">
            <h2>{{ t('placesTitle') }}</h2>
            <p class="section-hint">{{ t('placesHint') }}</p>
            <section v-for="(person, index) in draft.people" :key="person.id" class="person-card">
              <h3>{{ person.label || t('person', { n: index + 1 }) }}</h3>
              <VTextField
                v-model.number="person.remoteDays"
                :label="t('remoteDays')"
                type="number"
                min="0"
                max="7"
                step="1"
                variant="outlined"
                hide-details
                class="remote-days"
              />
              <p class="field-hint">{{ t('remoteHint') }}</p>
              <RentalsFitDestination
                v-for="(destination, destinationIndex) in person.destinations"
                :key="destination.id"
                v-model="person.destinations[destinationIndex]!"
                :index="destinationIndex"
                @remove="person.destinations.splice(destinationIndex, 1)"
              />
              <p v-if="!person.destinations.length" class="no-places">{{ t('noPlaces') }}</p>
              <VBtn
                v-if="person.destinations.length < 4"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-map-marker-plus-outline"
                class="add-place"
                @click="addDestination(person)"
                >{{ t('addPlace') }}</VBtn
              >
            </section>
            <p class="field-hint">{{ t('placePrivacy') }}</p>
          </div>
          <div v-show="step === 2" class="fit-step">
            <h2>{{ t('housingTitle') }}</h2>
            <div class="housing-fields field-grid">
              <VSelect
                v-model="draft.department"
                :items="departmentItems"
                :label="t('department')"
                variant="outlined"
                hide-details
                class="fit-zone-picker"
              />
              <ZonesPicker
                v-model="draft.zones"
                :department="draft.department"
                class="fit-zone-picker"
                @validity="zonesValid = $event"
              />
              <VSelect
                v-model="draft.types"
                :items="typeItems"
                :label="t('types')"
                multiple
                variant="outlined"
                hide-details
              />
              <VSelect
                v-model="draft.minBedrooms"
                :items="bedroomItems"
                :label="t('bedrooms')"
                variant="outlined"
                hide-details
              />
              <VTextField
                v-model.number="draft.minArea"
                :label="t('area')"
                type="number"
                min="0"
                max="100000"
                variant="outlined"
                hide-details
              />
            </div>
            <div class="housing-options">
              <VCheckbox v-model="draft.pets" :label="t('pets')" hide-details />
              <VCheckbox v-model="draft.parking" :label="t('parking')" hide-details />
              <VCheckbox v-model="draft.furnished" :label="t('furnished')" hide-details />
              <p class="field-hint">{{ t('strictHint') }}</p>
              <VCheckbox v-model="draft.hideReported" :label="t('hideReported')" hide-details />
              <p class="field-hint">{{ t('reportsHint') }}</p>
              <VCheckbox v-model="draft.includeOverBudget" :label="t('overBudget')" hide-details />
            </div>
            <fieldset class="priority-field">
              <legend>{{ t('priorityTitle') }}</legend>
              <VRadioGroup v-model="draft.priority" hide-details>
                <VRadio
                  v-for="choice in priorityItems"
                  :key="choice.value"
                  :value="choice.value"
                  :label="choice.title"
                />
              </VRadioGroup>
            </fieldset>
            <p class="field-hint">{{ t('distanceHint') }}</p>
          </div>
          <VAlert v-if="error" type="error" variant="tonal" role="alert" class="fit-error">{{
            t(error)
          }}</VAlert>
          <p v-if="pending" role="status" class="section-hint">{{ t('loading') }}</p>
          <div class="step-actions">
            <VBtn v-if="step > 0" variant="text" @click="goStep(step - 1)">{{ t('back') }}</VBtn
            ><VBtn
              color="primary"
              :loading="pending"
              @click="step < 2 ? goStep(step + 1) : search()"
              >{{ t(step < 2 ? 'next' : 'rank') }}</VBtn
            >
          </div>
          <p class="privacy-note"><VIcon size="18">mdi-lock-outline</VIcon>{{ t('privacy') }}</p>
        </div>
      </template>
      <template v-else-if="response && submitted">
        <div class="fit-toolbar result-toolbar">
          <VBtn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-tune-variant"
            data-testid="fit-edit"
            @click="editSearch"
            >{{ t('edit') }}</VBtn
          >
          <VBtn
            variant="text"
            :aria-label="`${t('comparison')} (${selected.length}/3)`"
            :disabled="selected.length < 2"
            @click="compareOpen = true"
          >
            <span>{{ t('compare') }} ({{ selected.length }}/3)</span>
          </VBtn>
        </div>
        <section ref="resultsHeading" class="results-heading" tabindex="-1">
          <h2>{{ t('results') }}</h2>
          <p>
            {{ t('resultCount', { matched: response.matched, shown: response.results.length }) }}
          </p>
          <details class="ranking-explanation">
            <summary>{{ t('rankingExplanation') }}</summary>
            <p class="field-hint">
              {{ t('analyzed', { n: response.scanned }) }} {{ t('resultHint') }}
            </p>
            <p v-if="response.incomplete" class="field-hint">
              {{ t('incompleteCount', { n: response.incomplete }) }}
            </p>
            <p class="field-hint">{{ t('scoreHint') }}</p>
          </details>
        </section>
        <div v-if="!response.results.length" class="empty-results" role="status">
          <h3>{{ t('noResults') }}</h3>
          <p>{{ t('noResultsHint') }}</p>
          <VBtn color="primary" @click="editSearch">{{ t('edit') }}</VBtn>
        </div>
        <div class="fit-results">
          <RentalsFitResult
            v-for="(result, index) in response.results"
            :key="result.property.key"
            :result="result"
            :scenario="submitted"
            :index="index"
            :selected="selected.includes(result.property.key)"
            :compare-disabled="selected.length >= 3"
            @compare="toggleCompare(result.property.key)"
          />
        </div>
        <p class="field-hint">{{ t('compareHint') }}</p>
        <p class="field-hint">{{ t('servicesHint') }}</p>
      </template>
      <VBtn variant="text" class="reset-action" @click="resetOpen = true">{{ t('restart') }}</VBtn>
      <VDialog v-model="compareOpen" max-width="1100" scrollable>
        <VCard :title="t('comparison')" data-clarity-mask="true">
          <VCardText
            ><div class="compare-scroll" tabindex="0" :aria-label="t('comparison')">
              <table class="compare-table">
                <thead>
                  <tr>
                    <th scope="col">{{ t('comparisonData') }}</th>
                    <th v-for="result in compared" :key="result.property.key" scope="col">
                      <NuxtLink
                        :to="localePath(rentalPropertyPath(result.property.key))"
                        target="_blank"
                        >{{ result.offer.title }}</NuxtLink
                      >
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in comparisonRows" :key="row.key">
                    <th scope="row">{{ row.label }}</th>
                    <td v-for="result in compared" :key="result.property.key">
                      {{ comparisonValue(result, row.key) }}
                    </td>
                  </tr>
                  <tr
                    v-for="trip in comparisonTrips"
                    :key="`${trip.person.id}:${trip.destination.id}`"
                  >
                    <th scope="row">
                      {{ trip.person.label || t('person', { n: trip.personIndex + 1 }) }} ·
                      {{ trip.destination.label || t(trip.destination.kind) }}
                    </th>
                    <td v-for="result in compared" :key="result.property.key">
                      {{ comparisonDistance(result, trip.person.id, trip.destination.id) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="field-hint">{{ t('distanceHint') }}</p></VCardText
          >
          <VCardActions
            ><VBtn @click="compareOpen = false">{{ t('close') }}</VBtn></VCardActions
          >
        </VCard>
      </VDialog>
      <VDialog v-model="resetOpen" max-width="460">
        <VCard :title="t('resetTitle')">
          <VCardText>{{ t('resetHint') }}</VCardText>
          <VCardActions>
            <VBtn @click="resetOpen = false">{{ t('cancel') }}</VBtn>
            <VBtn color="primary" @click="reset">{{ t('resetConfirm') }}</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </div>
    <details class="method-details">
      <summary>{{ t('method') }}</summary>
      <p>{{ t('methodText') }}</p>
      <p>{{ t('methodMissing') }}</p>
      <p>{{ t('remoteChecklist') }}</p>
      <a href="https://comoir.montevideo.gub.uy/" target="_blank" rel="noopener noreferrer">{{
        t('transitLink')
      }}</a>
    </details>
  </VContainer>
</template>
<script setup lang="ts">
import type { DraftDestination } from '~/components/rentals/FitDestination.vue'
import type {
  FitPerson,
  RentalFitInput,
  RentalFitResponse,
  RentalFitResult,
} from '~/utils/rentalFitTypes'
import { normalizeRentalFitInput } from '~/utils/rentalFit'
import { rentalFitMessages } from '~/utils/rentalFitMessages'
import { rentalMoney, rentalPropertyPath } from '~/utils/rentalPresentation'
import ZonesPicker from '~/components/rentals/zones/Picker.vue'
const { t, locale } = useI18n({ useScope: 'local', messages: rentalFitMessages })
const localePath = useLocalePath()
useSeoMeta({
  title: () => t('title'),
  description: () => t('seo'),
  ogTitle: () => t('title'),
  ogDescription: () => t('seo'),
})
defineOgImageComponent('Cambio', {
  title: 'Tu alquiler ideal',
  subtitle: 'Presupuesto, trabajo y estudio · Uruguay',
})
const canonical = computed(
  () => 'https://cambio-uruguay.com' + localePath('/alquiler-ideal-uruguay')
)
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      // Only the public tool belongs in structured data, never a personal scenario or its results.
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            '@id': `${canonical.value}#application`,
            name: t('title'),
            description: t('seo'),
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web',
            isAccessibleForFree: true,
            inLanguage: locale.value,
            url: canonical.value,
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com' + localePath('/'),
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: t('explore'),
                item: 'https://cambio-uruguay.com' + localePath('/alquileres-uruguay'),
              },
              { '@type': 'ListItem', position: 3, name: t('title'), item: canonical.value },
            ],
          },
        ],
      }).replace(/</g, '\\u003c'),
    },
  ],
}))
type DraftPerson = Omit<FitPerson, 'destinations'> & { destinations: DraftDestination[] }
type DraftInput = Omit<RentalFitInput, 'people'> & { people: DraftPerson[] }
let serial = 0
const newPerson = (): DraftPerson => ({
  id: `person-${++serial}`,
  label: '',
  incomeUyu: 0,
  remoteDays: 0,
  destinations: [],
})
const initial = (): DraftInput => ({
  people: [newPerson()],
  housingBudgetUyu: 20000,
  otherExpensesUyu: 0,
  savingsUyu: 0,
  transportUyu: 0,
  department: '',
  zones: { mode: 'prefer', include: [], exclude: [] },
  types: ['casa', 'apartamento'],
  minBedrooms: 0,
  minArea: 0,
  pets: false,
  parking: false,
  furnished: false,
  hideReported: false,
  includeOverBudget: false,
  priority: 'balanced',
})
const draft = ref<DraftInput>(initial())
const step = ref(0)
const steps = ['household', 'places', 'priorities']
const editing = ref(true)
const pending = ref(false)
const error = ref('')
const editor = ref<HTMLElement>()
const resultsHeading = ref<HTMLElement>()
const response = shallowRef<RentalFitResponse | null>(null)
const submitted = shallowRef<RentalFitInput | null>(null)
const selected = ref<string[]>([])
const compareOpen = ref(false)
const resetOpen = ref(false)
const zonesValid = ref(true)
let request: AbortController | null = null
const money = (value: number) => rentalMoney(value, 'UYU', locale.value)
const totalIncome = computed(() =>
  draft.value.people.reduce((sum, person) => sum + (Number(person.incomeUyu) || 0), 0)
)
const availableIncome = computed(
  () =>
    totalIncome.value -
    Number(draft.value.otherExpensesUyu || 0) -
    Number(draft.value.transportUyu || 0) -
    Number(draft.value.savingsUyu || 0)
)
const departments = [
  'Artigas',
  'Canelones',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Montevideo',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
]
const departmentItems = computed(() => [
  { value: '', title: t('allDepartments') },
  ...departments.map(value => ({ value, title: value })),
])
const typeItems = computed(() => ['casa', 'apartamento'].map(value => ({ value, title: t(value) })))
const bedroomItems = computed(() => [
  { value: 0, title: t('studio') },
  ...[1, 2, 3, 4, 5].map(value => ({ value, title: `${value}+` })),
])
const priorityItems = computed(() => [
  { value: 'balanced', title: t('balanced') },
  { value: 'budget', title: t('budgetPriority') },
  { value: 'commute', title: t('commute') },
])
const compared = computed(
  () => response.value?.results.filter(result => selected.value.includes(result.property.key)) || []
)
const comparisonRows = computed(() =>
  ['monthly', 'rent', 'fees', 'remaining', 'bedrooms', 'area'].map(key => ({
    key,
    label: t(key === 'bedrooms' ? 'bedroomsValue' : key === 'area' ? 'areaValue' : key),
  }))
)
const comparisonTrips = computed(
  () =>
    submitted.value?.people.flatMap((person, personIndex) =>
      person.destinations
        .filter(destination => destination.days > 0)
        .map(destination => ({ person, personIndex, destination }))
    ) || []
)
function comparisonValue(result: RentalFitResult, key: string) {
  const value = (
    {
      monthly: result.monthlyUyu,
      rent: result.rentUyu,
      fees: result.expensesUyu,
      remaining: result.remainingUyu,
      bedrooms: result.property.bedrooms,
      area: result.property.area,
    } as Record<string, number | null>
  )[key]
  return value == null
    ? t('unknown')
    : ['bedrooms', 'area'].includes(key)
      ? String(value)
      : money(value)
}
function comparisonDistance(result: RentalFitResult, person: string, place: string) {
  const value = result.trips.find(
    trip => trip.personId === person && trip.destinationId === place
  )?.distanceKm
  return value == null ? t('unknown') : t('distance', { km: value.toFixed(1) })
}
function addPerson() {
  if (draft.value.people.length < 8) draft.value.people.push(newPerson())
}
function addDestination(person: DraftPerson) {
  if (person.destinations.length < 4)
    person.destinations.push({
      id: `place-${++serial}`,
      label: '',
      kind: 'work',
      lat: null,
      lng: null,
      address: '',
      days: 5,
      mode: 'transit',
      targetKm: 5,
    })
}
async function goStep(index: number) {
  if (pending.value) cancelRequest()
  step.value = index
  error.value = ''
  await nextTick()
  editor.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
}
async function search() {
  if (pending.value) return
  error.value = ''
  if (!zonesValid.value) {
    error.value = 'invalidZones'
    return
  }
  let input: RentalFitInput
  try {
    // No display address, query string or shared Nuxt state carries this personal scenario.
    input = normalizeRentalFitInput({
      ...draft.value,
      otherExpensesUyu: optionalNumber(draft.value.otherExpensesUyu),
      savingsUyu: optionalNumber(draft.value.savingsUyu),
      transportUyu: optionalNumber(draft.value.transportUyu),
      minArea: optionalNumber(draft.value.minArea),
      people: draft.value.people.map(person => ({
        ...person,
        incomeUyu: optionalNumber(person.incomeUyu),
        remoteDays: optionalNumber(person.remoteDays),
        destinations: person.destinations.map(({ address: _address, ...destination }, index) => ({
          ...destination,
          label:
            destination.label.trim() || `${t(destination.kind)} · ${t('place', { n: index + 1 })}`,
        })),
      })),
    })
  } catch {
    error.value = 'invalid'
    return
  }
  const current = new AbortController()
  request?.abort()
  request = current
  pending.value = true
  try {
    const result = await $fetch<RentalFitResponse>('/api/rentals/fit', {
      method: 'POST',
      body: {
        ...input,
        people: input.people.map(person => ({
          ...person,
          label: '',
          destinations: person.destinations.map(destination => ({ ...destination, label: '' })),
        })),
      },
      signal: current.signal,
      retry: 0,
      timeout: 45000,
    })
    if (request !== current) return
    response.value = result
    submitted.value = input
    selected.value = []
    editing.value = false
    await nextTick()
    resultsHeading.value?.focus({ preventScroll: true })
    resultsHeading.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  } catch (cause: unknown) {
    if (request === current && !current.signal.aborted)
      error.value = (cause as { statusCode?: number }).statusCode === 429 ? 'busy' : 'loadError'
  } finally {
    if (request === current) pending.value = false
  }
}
async function editSearch() {
  editing.value = true
  await goStep(2)
}
function toggleCompare(key: string) {
  if (selected.value.includes(key)) selected.value = selected.value.filter(value => value !== key)
  else if (selected.value.length < 3) selected.value.push(key)
}
function reset() {
  request?.abort()
  request = null
  pending.value = false
  draft.value = initial()
  response.value = null
  submitted.value = null
  selected.value = []
  compareOpen.value = false
  resetOpen.value = false
  error.value = ''
  editing.value = true
  void goStep(0)
}
function optionalNumber(value: unknown) {
  return value === '' || value === null || value === undefined ? 0 : value
}
function cancelRequest() {
  request?.abort()
  request = null
  pending.value = false
}
// Edits invalidate an in-flight comparison; a late response must never replace a newer scenario.
watch(
  draft,
  () => {
    if (pending.value) cancelRequest()
  },
  { deep: true }
)
onBeforeUnmount(() => {
  request?.abort()
  request = null
})
</script>
<style scoped>
.rental-fit-page {
  max-width: 1120px;
  padding: 28px 16px 48px;
}
.fit-zone-picker {
  grid-column: 1 / -1;
}
h1,
h2,
h3,
p {
  margin: 0;
}
h1 {
  font-size: clamp(1.65rem, 4vw, 2.4rem);
  line-height: 1.2;
  font-weight: 800;
}
.page-heading {
  margin-bottom: 24px;
}
.page-heading p {
  max-width: 760px;
  margin-top: 12px;
  line-height: 1.55;
}
.page-heading > a {
  display: inline-block;
  padding-block: 12px;
}
h2 {
  font-size: 1.35rem;
  line-height: 1.35;
}
h3 {
  font-size: 1.05rem;
}
.fit-toolbar {
  position: sticky;
  top: 64px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  background: rgb(var(--v-theme-background));
  border-block: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.step-links {
  display: flex;
  gap: 12px;
}
.step-links button {
  appearance: none;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 6px 4px;
  font-size: 0.9rem;
}
.step-links button span {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.step-links .active {
  border-bottom-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}
.step-links .active span {
  color: #fff;
  background: rgb(var(--v-theme-primary));
  border-color: transparent;
}
.fit-editor {
  max-width: 790px;
  margin: 28px auto 0;
  scroll-margin-top: 160px;
}
.section-hint {
  margin-top: 8px;
  margin-bottom: 20px;
  line-height: 1.55;
}
.person-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  padding: 20px;
  margin: 16px 0;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  min-height: 32px;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 16px;
}
.field-grid > * {
  min-width: 0;
}
.budget-section {
  margin-top: 28px;
}
.budget-section > h2 {
  margin-bottom: 24px;
}
.field-hint {
  margin-top: 8px;
  font-size: 0.85rem;
  line-height: 1.55;
}
.income-total {
  margin-top: 12px;
  font-weight: 600;
}
.expenses-details {
  margin-top: 16px;
}
.expenses-details .field-grid {
  margin-top: 16px;
  grid-template-columns: minmax(0, 1fr);
}
summary {
  min-height: 44px;
  padding: 12px 0;
  cursor: pointer;
  font-weight: 600;
}
.remote-days {
  margin-top: 24px;
  max-width: 330px;
}
.no-places {
  margin-top: 20px;
  font-size: 0.9rem;
}
.add-place {
  margin-top: 16px;
  max-width: 100%;
}
.housing-fields {
  margin-top: 28px;
}
.housing-options {
  margin: 20px 0;
}
.priority-field {
  border: 0;
  padding: 0;
  margin-top: 28px;
}
legend {
  font-weight: 700;
  font-size: 1.05rem;
}
.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
}
.privacy-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.8rem;
  line-height: 1.55;
  margin-top: 24px;
}
.privacy-note .v-icon {
  flex-shrink: 0;
  margin-top: 2px;
}
.results-heading {
  padding: 28px 0 22px;
  scroll-margin-top: 142px;
}
.results-heading > p {
  margin-top: 8px;
}
.fit-results {
  display: grid;
  gap: 20px;
}
.empty-results {
  padding: 32px 16px;
  text-align: center;
}
.empty-results p {
  margin: 12px 0 20px;
}
.reset-action {
  margin-top: 20px;
}
.method-details {
  margin-top: 32px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.method-details p {
  margin: 12px 0;
  max-width: 850px;
  line-height: 1.6;
}
.method-details > a {
  display: inline-block;
  padding-block: 12px;
}
.compare-scroll {
  overflow-x: auto;
  max-width: 100%;
}
.compare-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 620px;
  text-align: left;
  font-size: 0.9rem;
}
.compare-table th,
.compare-table td {
  letter-spacing: normal;
  text-transform: none;
  vertical-align: top;
  padding: 14px 12px;
  min-width: 160px;
  max-width: 260px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.compare-table th:first-child {
  position: sticky;
  left: 0;
  background: rgb(var(--v-theme-surface));
  min-width: 130px;
  max-width: 160px;
}
.fit-error {
  margin-top: 24px;
}
:deep(input) {
  font-size: 16px;
}
:deep(.v-label) {
  opacity: 1;
}
.v-btn {
  min-height: 44px;
  text-transform: none;
  letter-spacing: normal;
}
@media (max-width: 599px) {
  .rental-fit-page {
    padding: 20px 12px 36px;
  }
  .fit-toolbar {
    top: 56px;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 0;
  }
  .step-links {
    gap: 8px;
    justify-content: space-between;
    flex: 1;
  }
  .step-links button {
    font-size: 0.8rem;
    gap: 4px;
  }
  .fit-toolbar > .v-btn {
    flex: 1 1 100%;
  }
  .result-toolbar > .v-btn {
    flex: 1 1 auto;
    font-size: 0.8rem;
    padding-inline: 10px;
  }
  .result-toolbar {
    flex-wrap: nowrap;
  }
  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .person-card {
    padding: 16px 12px;
  }
  .fit-editor {
    margin-top: 22px;
    scroll-margin-top: 190px;
  }
  .add-place {
    height: auto;
    min-height: 48px;
    white-space: normal;
  }
  .add-place :deep(.v-btn__content) {
    white-space: normal;
  }
  .results-heading {
    scroll-margin-top: 170px;
  }
}
</style>
