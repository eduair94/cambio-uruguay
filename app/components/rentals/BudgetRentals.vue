<template>
  <div class="budget-rentals" data-testid="budget-rentals">
    <component
      :is="smAndDown ? VDialog : 'aside'"
      v-bind="dialogProps"
      @update:model-value="open = $event"
      @after-enter="heading?.focus({ preventScroll: true })"
      @after-leave="restoreFocus"
    >
      <form
        class="budget-filters"
        :class="{ 'budget-filters--drawer': smAndDown }"
        @submit.prevent="apply"
      >
        <header>
          <h2 id="budget-filter-heading" ref="heading" tabindex="-1">{{ t('filters') }}</h2>
          <VBtn
            v-if="smAndDown"
            icon="mdi-close"
            variant="text"
            :aria-label="t('close')"
            @click="open = false"
          />
        </header>
        <div class="budget-filters__body">
          <PropertyAgencyFilter v-model="draft.agency" @update:model-value="loadDraftFacets" />
          <VSelect
            v-model="draft.basis"
            :items="basisItems"
            :label="t('basis')"
            v-bind="field"
            @update:model-value="loadDraftFacets"
          />
          <p class="budget-hint">{{ t(draft.basis === 'monthly' ? 'monthlyHint' : 'rentHint') }}</p>
          <VSelect
            v-model="draft.department"
            :items="departmentItems"
            :label="t('department')"
            v-bind="field"
            @update:model-value="changeDepartment"
          />
          <VAutocomplete
            v-model="draft.neighborhood"
            :items="neighborhoodItems"
            :label="t('neighborhood')"
            clearable
            v-bind="field"
          />
          <VSelect
            v-model="draft.type"
            :items="typeItems"
            :label="t('type')"
            v-bind="field"
            @update:model-value="loadDraftFacets"
          />
          <VSelect
            v-model="draft.bedrooms"
            :items="bedroomItems"
            :label="t('bedrooms')"
            v-bind="field"
            @update:model-value="loadDraftFacets"
          />
          <VSelect
            v-model="draft.availability"
            :items="availabilityItems"
            :label="availabilityCopy.filter"
            v-bind="field"
            @update:model-value="loadDraftFacets"
          />
          <p class="budget-hint">{{ availabilityCopy.filterHint }}</p>
          <VCheckbox
            v-model="draft.owner"
            :label="t('owner')"
            hide-details
            color="primary"
            @update:model-value="loadDraftFacets"
          />
        </div>
        <footer>
          <VBtn variant="text" @click="clear">{{ t('clear') }}</VBtn>
          <VBtn color="primary" type="submit" :loading="pending">{{ t('apply') }}</VBtn>
        </footer>
      </form>
    </component>
    <div class="budget-content">
      <div class="budget-toolbar">
        <VBtn
          v-if="smAndDown"
          variant="tonal"
          color="link"
          prepend-icon="mdi-tune-variant"
          data-testid="budget-filter-trigger"
          aria-haspopup="dialog"
          aria-controls="budget-filter-dialog"
          :aria-expanded="open"
          @click="showFilters"
        >
          {{ t('filters') }}<span v-if="chips.length"> ({{ chips.length }})</span>
        </VBtn>
        <VSelect
          :model-value="query.band"
          :items="bandItems"
          :label="t(smAndDown ? 'bandCompact' : 'band')"
          class="budget-toolbar__band"
          v-bind="field"
          @update:model-value="changeBand"
          ><template #selection
            ><span>{{ compactBandLabel(query.band) }}</span></template
          ></VSelect
        >
        <VBtn
          v-if="!smAndDown"
          icon="mdi-share-variant-outline"
          variant="text"
          :aria-label="t('share')"
          @click="share"
        />
      </div>
      <div v-if="chips.length" class="budget-chips" :aria-label="t('activeFilters')">
        <VChip
          v-for="chip in chips"
          :key="chip.key"
          closable
          color="link"
          variant="tonal"
          :close-label="t('remove', { name: chip.label })"
          @click:close="removeFilter(chip.key)"
          >{{ chip.label }}</VChip
        >
      </div>
      <section
        id="budget-results"
        ref="results"
        class="budget-results"
        tabindex="-1"
        :aria-busy="pending"
      >
        <header class="budget-results__heading">
          <h2 role="status" aria-live="polite">
            {{
              pending
                ? t('searching')
                : error
                  ? t('error')
                  : data?.total === 1
                    ? t('oneResult')
                    : t('results', { n: number(data?.total || 0) })
            }}
          </h2>
          <p>
            {{ t(query.basis === 'monthly' ? 'monthly' : 'rent') }} · {{ bandLabel(query.band) }}
          </p>
        </header>
        <VProgressLinear v-if="pending" indeterminate color="primary" />
        <div v-if="error" class="budget-empty" role="alert">
          <p>{{ t('error') }}</p>
          <VBtn variant="tonal" @click="refresh()">{{ t('retry') }}</VBtn>
        </div>
        <template v-else>
          <p v-if="!pending && data?.pendingExpensesCount" class="budget-expenses-note">
            {{ t('unknownExpenses', { n: number(data.pendingExpensesCount) }) }}
          </p>
          <div v-if="!pending && !data?.items.length" class="budget-empty">
            <h3>{{ t('empty') }}</h3>
            <p>{{ t('emptyHint') }}</p>
            <VBtn variant="tonal" @click="clear">{{ t('clear') }}</VBtn>
          </div>
          <div class="budget-list">
            <article
              v-for="item in pending ? [] : data?.items || []"
              :key="item.key"
              class="budget-card"
              data-testid="budget-rental-card"
            >
              <div class="budget-card__intro">
                <NuxtLink
                  :to="localePath(rentalPropertyPath(item.key))"
                  class="budget-card__photo"
                  tabindex="-1"
                  aria-hidden="true"
                >
                  <img
                    v-if="photo(item) && !failedImages.has(item.key)"
                    :src="photo(item)!"
                    alt=""
                    width="300"
                    height="225"
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                    @error="failedImages.add(item.key)"
                  />
                  <span v-else><VIcon icon="mdi-home-outline" size="32" />{{ t('noImage') }}</span>
                </NuxtLink>
                <div>
                  <p class="budget-card__zone">
                    {{ [item.neighborhood, item.department].filter(Boolean).join(' · ') }}
                  </p>
                  <h3>
                    <NuxtLink :to="localePath(rentalPropertyPath(item.key))">{{
                      item.title
                    }}</NuxtLink>
                  </h3>
                  <strong class="budget-card__price">{{ money(item.budget.amountUyu) }}</strong>
                  <p class="budget-card__basis">
                    {{ t(query.basis === 'monthly' ? 'total' : 'rentLabel') }}
                  </p>
                </div>
              </div>
              <div class="budget-card__body">
                <p class="budget-card__specs">{{ specs(item) }}</p>
                <dl class="budget-card__costs">
                  <div>
                    <dt>{{ t('rentLabel') }}</dt>
                    <dd>{{ money(item.budget.rentUyu) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('expenses') }}</dt>
                    <dd>
                      {{
                        item.budget.expensesUyu === null
                          ? t('expensesUnknown')
                          : money(item.budget.expensesUyu)
                      }}
                    </dd>
                  </div>
                  <div v-if="item.budget.monthlyUyu !== null">
                    <dt>{{ t('total') }}</dt>
                    <dd>{{ money(item.budget.monthlyUyu) }}</dd>
                  </div>
                </dl>
                <p class="budget-card__source">{{ t('source', { source: source(item) }) }}</p>
                <p v-if="offer(item)?.currency === 'USD'" class="budget-hint">
                  {{
                    t('originalPrice', { price: rentalMoney(offer(item)!.price, 'USD', locale) })
                  }}
                </p>
                <p class="budget-hint">
                  {{
                    t('read', {
                      date: rentalDate(offer(item)?.lastSeen, locale) || t('unknownDate'),
                    })
                  }}
                </p>
                <RentalsAvailabilityReport
                  :offers="item.offers"
                  :summary="item.availability"
                  :preferred="offer(item)"
                  :title="item.title"
                />
                <div class="budget-card__actions">
                  <VBtn
                    :to="localePath(rentalPropertyPath(item.key))"
                    color="link"
                    variant="tonal"
                    >{{ t('detail') }}</VBtn
                  >
                  <VBtn
                    v-if="original(item)"
                    :href="original(item)!"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    variant="text"
                    append-icon="mdi-open-in-new"
                    >{{ t('original') }}</VBtn
                  >
                </div>
              </div>
            </article>
          </div>
          <nav
            v-if="data && data.pages > 1"
            class="budget-pagination"
            :aria-label="t('page', { n: data.page, pages: data.pages })"
          >
            <VBtn
              variant="outlined"
              :disabled="pending || data.page <= 1"
              @click="changePage(data.page - 1)"
              >{{ t('previous') }}</VBtn
            >
            <span>{{ t('page', { n: data.page, pages: data.pages }) }}</span>
            <VBtn
              variant="outlined"
              :disabled="pending || data.page >= data.pages"
              @click="changePage(data.page + 1)"
              >{{ t('next') }}</VBtn
            >
          </nav>
        </template>
      </section>
      <p class="budget-note">{{ t('eligibility') }}</p>
      <p v-if="data?.usdUyu" class="budget-hint">
        {{ t('currency', { rate: `$ ${exchangeRate(data.usdUyu)}` }) }}
      </p>
      <nav class="budget-links">
        <NuxtLink :to="localePath('/alquileres-uruguay')">{{ t('fullSearch') }}</NuxtLink>
        <NuxtLink
          :to="{
            path: localePath('/oportunidades-inmobiliarias-uruguay'),
            query: { operation: 'sale' },
          }"
          >{{ t('sales') }}</NuxtLink
        >
      </nav>
      <VSnackbar v-model="snackbarOpen" timeout="3500">{{ snackbar }}</VSnackbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VDialog } from 'vuetify/components'
import { useDisplay } from 'vuetify'
import { rentalBudgetMessages } from '~/utils/rentalBudgetMessages'
import { rentalAvailabilityCopy } from '~/utils/rentalAvailabilityMessages'
import {
  RENTAL_BUDGET_BANDS,
  normalizeRentalBudgetQuery,
  rentalBudgetQueryToParams,
  type RentalBudgetBand,
  type RentalBudgetQuery,
  type RentalBudgetProperty,
  type RentalBudgetResponse,
} from '~/utils/rentalBudget'
import { RENTAL_SOURCE_LABEL } from '~/utils/rentals'
import { rentalDate, rentalMoney, rentalPropertyPath } from '~/utils/rentalPresentation'
import { rentalSavedSafeUrl } from '~/utils/rentalSaved'

const { t, locale } = useI18n({ useScope: 'local', messages: rentalBudgetMessages })
const { smAndDown } = useDisplay()
const route = useRoute(),
  router = useRouter(),
  localePath = useLocalePath()
const availability = useRentalAvailability()
const availabilityCopy = computed(() => rentalAvailabilityCopy(locale.value))
const query = computed(() => normalizeRentalBudgetQuery(route.query))
const agencyName = useAgencySelection(() => query.value.agency)
const params = computed(() => rentalBudgetQueryToParams(query.value))
const requestKey = computed(() => JSON.stringify(params.value))
const { data, pending, error, refresh } = await useAsyncData<RentalBudgetResponse>(
  'rental-budget',
  () => $fetch('/api/rentals/budget', { query: availability.withRevision(params.value) }),
  { watch: [requestKey] }
)
const open = ref(false),
  draft = ref({ ...query.value })
const heading = ref<HTMLElement | null>(null),
  results = ref<HTMLElement | null>(null)
const failedImages = ref(new Set<string>())
const field = { variant: 'outlined' as const, density: 'comfortable' as const, hideDetails: true }
let activator: HTMLElement | null = null,
  returnScroll = 0,
  applied = false,
  facetRequest = 0
const facetOverride = ref<RentalBudgetResponse['facets'] | null>(null)
const viewport = ref<{ height: number; top: number } | null>(null)
const money = (amount: number) => rentalMoney(amount, 'UYU', locale.value)
const number = (amount: number) => new Intl.NumberFormat(locale.value).format(amount)
const exchangeRate = (amount: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 4 }).format(amount)
const offer = (item: RentalBudgetProperty) => item.matchingOffer || item.offers[0]
const source = (item: RentalBudgetProperty) =>
  offer(item) ? RENTAL_SOURCE_LABEL[offer(item)!.source] : ''
const photo = (item: RentalBudgetProperty) => rentalSavedSafeUrl(offer(item)?.image)
const original = (item: RentalBudgetProperty) => rentalSavedSafeUrl(offer(item)?.url)
const specs = (item: RentalBudgetProperty) =>
  [
    item.bedrooms === 0
      ? t('studio')
      : item.bedrooms === null
        ? ''
        : t('beds', { n: item.bedrooms }),
    item.bathrooms === null ? '' : t('baths', { n: item.bathrooms }),
    item.area ? t('area', { n: item.area }) : '',
  ]
    .filter(Boolean)
    .join(' · ')
function bandLabel(id: RentalBudgetBand) {
  const band = RENTAL_BUDGET_BANDS.find(band => band.id === id)!
  return t(band.minExclusive ? 'between' : 'under', {
    min: money(band.minExclusive),
    max: money(band.maxInclusive),
  })
}
function compactBandLabel(id: RentalBudgetBand) {
  const band = RENTAL_BUDGET_BANDS.find(band => band.id === id)!
  return band.minExclusive
    ? `${number(band.minExclusive)}–${number(band.maxInclusive)}`
    : t('under', { max: number(band.maxInclusive) })
}
const bandItems = computed(() =>
  RENTAL_BUDGET_BANDS.map(band => {
    const count = data.value?.bands.find(row => row.id === band.id)?.count
    return {
      value: band.id,
      title: `${bandLabel(band.id)}${count === undefined || pending.value || error.value ? '' : ` · ${number(count)}`}`,
    }
  })
)
const basisItems = computed(() => [
  { value: 'rent', title: t('rent') },
  { value: 'monthly', title: t('monthly') },
])
const departmentItems = computed(() => [
  { value: '', title: t('allZones') },
  ...[
    ...new Set(
      [
        draft.value.department,
        ...(facetOverride.value?.departments || data.value?.facets.departments || []),
      ].filter(Boolean)
    ),
  ].map(value => ({ value, title: value })),
])
const neighborhoodItems = computed(() => [
  ...new Set(
    [
      draft.value.neighborhood,
      ...(facetOverride.value?.neighborhoods || data.value?.facets.neighborhoods || []),
    ].filter(Boolean)
  ),
])
const typeItems = computed(() => [
  { value: 'all', title: t('anyType') },
  { value: 'casa', title: t('house') },
  { value: 'apartamento', title: t('apartment') },
])
const bedroomItems = computed(() => [
  { value: '', title: t('any') },
  ...Array.from({ length: 11 }, (_, n) => ({ value: n, title: n ? String(n) : t('studio') })),
])
const availabilityItems = computed(() =>
  (['all', 'hide_multiple', 'hide_any'] as const).map(value => ({
    value,
    title: availabilityCopy.value[value],
  }))
)
type FilterKey =
  | 'department'
  | 'neighborhood'
  | 'type'
  | 'bedrooms'
  | 'availability'
  | 'agency'
  | 'owner'
const chips = computed(() => {
  const q = query.value,
    rows: { key: FilterKey; label: string }[] = []
  if (q.department) rows.push({ key: 'department', label: q.department })
  if (q.agency) rows.push({ key: 'agency', label: agencyName.value || t('selectedAgency') })
  if (q.owner) rows.push({ key: 'owner', label: t('owner') })
  if (q.neighborhood) rows.push({ key: 'neighborhood', label: q.neighborhood })
  if (q.type !== 'all')
    rows.push({ key: 'type', label: t(q.type === 'casa' ? 'house' : 'apartment') })
  if (q.bedrooms !== '')
    rows.push({
      key: 'bedrooms',
      label: q.bedrooms === 0 ? t('studio') : t('beds', { n: q.bedrooms }),
    })
  if (q.availability !== 'all')
    rows.push({
      key: 'availability',
      label: availabilityCopy.value[q.availability === 'hide_any' ? 'chipAny' : 'chipMultiple'],
    })
  return rows
})
const dialogProps = computed(() =>
  smAndDown.value
    ? {
        modelValue: open.value,
        id: 'budget-filter-dialog',
        'aria-labelledby': 'budget-filter-heading',
        contentProps: {
          style: {
            width: 'min(420px, calc(100vw - 16px))',
            maxWidth: 'calc(100vw - 16px)',
            height: viewport.value ? `${viewport.value.height}px` : '100dvh',
            maxHeight: '100%',
            top: `${viewport.value?.top || 0}px`,
            right: 0,
            left: 'auto',
            margin: 0,
            overflow: 'hidden',
          },
        },
      }
    : { class: 'budget-sidebar' }
)
function showFilters(event: MouseEvent) {
  activator = event.currentTarget as HTMLElement
  returnScroll = window.scrollY
  applied = false
  open.value = true
}
async function focusResults() {
  await nextTick()
  results.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  results.value?.focus({ preventScroll: true })
}
async function restoreFocus() {
  facetRequest++
  facetOverride.value = null
  await nextTick()
  if (applied) await focusResults()
  else if (activator?.isConnected) {
    activator.focus({ preventScroll: true })
    window.scrollTo({ top: returnScroll, behavior: 'instant' })
  }
}
async function update(next: RentalBudgetQuery) {
  await router.push({
    path: route.path,
    query: { operation: 'rent', mode: 'budget', ...rentalBudgetQueryToParams(next) },
  })
}
async function apply() {
  applied = true
  await update({ ...draft.value, neighborhood: draft.value.neighborhood || '', page: 1 })
  open.value = false
  if (!smAndDown.value) await focusResults()
}
async function clear() {
  draft.value = normalizeRentalBudgetQuery({})
  await apply()
}
async function changeBand(band: RentalBudgetBand) {
  await update({ ...query.value, band, page: 1 })
  await focusResults()
}
async function changePage(page: number) {
  await update({ ...query.value, page })
  await focusResults()
}
async function removeFilter(key: FilterKey) {
  const defaults = normalizeRentalBudgetQuery({})
  await update({
    ...query.value,
    [key]: defaults[key],
    ...(key === 'department' ? { neighborhood: '' } : {}),
    page: 1,
  })
}
async function changeDepartment(department: string) {
  draft.value.department = department
  draft.value.neighborhood = ''
  await loadDraftFacets()
}
async function loadDraftFacets() {
  const id = ++facetRequest
  facetOverride.value = {
    departments: facetOverride.value?.departments || data.value?.facets.departments || [],
    neighborhoods: [],
  }
  try {
    const response = await $fetch<RentalBudgetResponse>('/api/rentals/budget', {
      query: availability.withRevision(
        rentalBudgetQueryToParams({
          ...draft.value,
          neighborhood: '',
          page: 1,
          perPage: 1,
        })
      ),
    })
    if (id === facetRequest) facetOverride.value = response.facets
  } catch {
    if (id === facetRequest) facetOverride.value = { departments: [], neighborhoods: [] }
  }
}
function syncViewport() {
  viewport.value = {
    height: window.visualViewport?.height || innerHeight,
    top: window.visualViewport?.offsetTop || 0,
  }
}
function stopViewport() {
  if (!import.meta.client) return
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
  window.removeEventListener('resize', syncViewport)
}
watch([query, open], () => {
  draft.value = { ...query.value }
  facetOverride.value = null
  facetRequest++
})
watch(open, value => {
  stopViewport()
  if (value) {
    syncViewport()
    window.visualViewport?.addEventListener('resize', syncViewport)
    window.visualViewport?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)
  }
})
watch(smAndDown, value => {
  if (!value) open.value = false
})
onBeforeUnmount(() => {
  facetRequest++
  stopViewport()
})
availability.watchChanges(async () => {
  await refresh()
  if (query.value.availability !== 'all') await focusResults()
})
const snackbarOpen = ref(false),
  snackbar = ref('')
async function share() {
  try {
    if (navigator.share) await navigator.share({ title: t('title'), url: window.location.href })
    else {
      await navigator.clipboard.writeText(window.location.href)
      snackbar.value = t('copied')
      snackbarOpen.value = true
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      snackbar.value = t('shareError')
      snackbarOpen.value = true
    }
  }
}
</script>

<style scoped>
.budget-rentals {
  display: grid;
  grid-template-columns: 282px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.budget-sidebar {
  position: sticky;
  top: 130px;
  min-width: 0;
}
.budget-filters {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 150px);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.budget-filters--drawer {
  height: 100%;
  max-height: 100%;
  border: 0;
  border-radius: 0;
}
.budget-filters header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 8px;
}
.budget-filters h2 {
  margin: 0;
  font-size: 1.15rem;
}
.budget-filters__body {
  display: grid;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  padding: 16px;
}
.budget-filters footer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: 8px;
  flex: 0 0 auto;
  padding: 8px 12px max(8px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.budget-filters .v-btn {
  min-height: 44px;
}
.budget-filters footer .v-btn {
  height: auto;
  min-width: 0;
  padding-block: 10px;
}
.budget-filters footer :deep(.v-btn__content) {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.3;
}
.budget-filters :deep(input),
.budget-filters :deep(.v-select__selection),
.budget-toolbar :deep(input),
.budget-toolbar :deep(.v-select__selection) {
  font-size: 16px;
}
.budget-filters :deep(.v-field-label:not(.v-field-label--floating)) {
  font-size: 14px;
}
.budget-content {
  min-width: 0;
}
.budget-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}
.budget-toolbar__band {
  min-width: 0;
  flex: 1 1 auto;
}
.budget-toolbar .v-btn {
  min-height: 44px;
}
.budget-results {
  scroll-margin-top: 128px;
}
.budget-results:focus {
  outline: none;
}
.budget-results__heading {
  margin: 12px 0;
}
.budget-results h2 {
  margin: 0;
  font-size: 1.2rem;
}
.budget-results__heading p {
  margin: 4px 0 0;
  font-size: 0.875rem;
}
.budget-hint {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.budget-expenses-note {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 12px 0 18px;
}
.budget-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0;
}
.budget-chips :deep(.v-chip) {
  min-height: 44px;
  flex: none;
}
.budget-chips :deep(.v-chip__close) {
  min-width: 44px;
  min-height: 44px;
}
.budget-list {
  display: grid;
  gap: 16px;
}
.budget-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.budget-card__intro {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 16px;
  padding: 16px 16px 0;
}
.budget-card__photo {
  display: flex;
  min-height: 132px;
  align-items: stretch;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.budget-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.budget-card__photo span {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  text-align: center;
  font-size: 0.75rem;
}
.budget-card h3 {
  margin: 4px 0 8px;
  font-size: 1.05rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.budget-card h3 a {
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
}
.budget-card h3 a:hover {
  text-decoration: underline;
}
.budget-card__zone {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.budget-card__price {
  font-size: 1.5rem;
}
.budget-card__basis {
  margin: 0;
  font-size: 0.75rem;
}
.budget-card__body {
  padding: 12px 16px 16px;
}
.budget-card__specs {
  margin: 0 0 12px;
  font-size: 0.875rem;
}
.budget-card__costs {
  margin: 0 0 12px;
  font-size: 0.875rem;
}
.budget-card__costs > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
}
.budget-card__costs dd {
  margin: 0;
  text-align: end;
  font-weight: 700;
}
.budget-card__source {
  margin: 0 0 4px;
  font-size: 0.875rem;
  font-weight: 700;
}
.budget-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.budget-card__actions .v-btn {
  min-height: 44px;
}
.budget-empty {
  padding: 24px 0;
}
.budget-empty h3 {
  font-size: 1.15rem;
  margin: 0;
}
.budget-note {
  margin: 24px 0 8px;
  line-height: 1.6;
  font-size: 0.875rem;
}
.budget-links {
  display: flex;
  gap: 8px 20px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.budget-links a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-link));
}
.budget-pagination {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin: 24px 0;
  font-size: 0.8rem;
}
.budget-pagination .v-btn {
  min-height: 44px;
}
@media (max-width: 959px) {
  .budget-rentals {
    display: block;
  }
  .budget-toolbar {
    position: sticky;
    top: 64px;
    z-index: 8;
    margin-bottom: 8px;
    background: rgb(var(--v-theme-background));
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  .budget-toolbar > .v-btn {
    padding-inline: 8px;
    font-size: 0.75rem;
    letter-spacing: 0;
  }
  .budget-toolbar__band :deep(.v-field-label:not(.v-field-label--floating)) {
    font-size: 12px;
  }
  .budget-toolbar__band :deep(.v-select__selection) {
    font-size: 14px;
  }
  .budget-card__intro {
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 12px;
    padding: 12px 12px 0;
  }
  .budget-card h3 {
    font-size: 0.95rem;
  }
  .budget-card__body {
    padding: 12px;
  }
  .budget-card__photo {
    min-height: 120px;
  }
  .budget-filters header {
    padding-block: 8px;
  }
  .budget-filters__body {
    gap: 12px;
  }
}
</style>
