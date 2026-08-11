<template>
  <VContainer class="py-6 changes-page">
    <VRow justify="center">
      <VCol cols="12" lg="10">
        <VCard class="overflow-hidden mb-5 changes-hero-card" elevation="4">
          <div class="changes-hero on-dark pa-6 pa-md-8">
            <div class="changes-hero__layout">
              <div class="d-flex align-center ga-4">
                <VAvatar class="changes-hero__icon" size="52">
                  <VIcon color="white" size="28">mdi-swap-horizontal-bold</VIcon>
                </VAvatar>
                <div>
                  <div class="changes-hero__eyebrow mb-2">
                    <span class="changes-hero__pulse" aria-hidden="true" />
                    {{ t('rateChanges.liveNow') }}
                  </div>
                  <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                    {{ t('rateChanges.title') }}
                  </h1>
                  <p class="text-body-1 text-grey-lighten-2 mb-0">
                    {{ t('rateChanges.subtitle') }}
                  </p>
                </div>
              </div>
              <div class="changes-hero__status">
                <span>{{ t('rateChanges.lastCheck') }}</span>
                <strong>{{ data?.asOf ? formatTime(data.asOf) : '—' }}</strong>
                <small>{{ t('rateChanges.live') }}</small>
              </div>
            </div>
          </div>
        </VCard>

        <VCard class="filter-panel pa-4 pa-md-5 mb-5" variant="flat">
          <div class="filter-panel__header mb-4">
            <div>
              <h2 class="text-subtitle-1 font-weight-bold mb-1">
                {{ t('rateChanges.exploreTitle') }}
              </h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                {{ t('rateChanges.exploreSubtitle') }}
              </p>
            </div>
            <VBtn
              :to="localePath('/analiticas')"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-chart-timeline-variant-shimmer"
            >
              {{ t('rateAnalytics.nav') }}
            </VBtn>
          </div>

          <VRow density="comfortable">
            <VCol cols="12" sm="6" md="4">
              <VSelect
                v-model="selectedCategory"
                :items="categoryOptions"
                :label="t('rateChanges.categoryFilter')"
                hide-details
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12" sm="6" md="4">
              <VSelect
                v-model="selectedHouse"
                :items="houseOptions"
                :label="t('rateChanges.houseFilter')"
                clearable
                hide-details
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12" sm="6" md="4">
              <VSelect
                v-model="selectedCurrency"
                :items="currencyOptions"
                :label="t('rateChanges.currencyFilter')"
                clearable
                hide-details
                variant="outlined"
                density="comfortable"
              />
            </VCol>
          </VRow>

          <div class="movement-summary mt-4" aria-live="polite">
            <div>
              <span>{{ t('rateChanges.movements') }}</span>
              <strong>{{ movementSummary.total }}</strong>
            </div>
            <div class="movement-summary__up">
              <VIcon size="17">mdi-trending-up</VIcon>
              <span>{{ t('rateChanges.increases') }}</span>
              <strong>{{ movementSummary.up }}</strong>
            </div>
            <div class="movement-summary__down">
              <VIcon size="17">mdi-trending-down</VIcon>
              <span>{{ t('rateChanges.decreases') }}</span>
              <strong>{{ movementSummary.down }}</strong>
            </div>
            <VProgressCircular v-if="pending" indeterminate size="18" width="2" class="ms-auto" />
          </div>
        </VCard>

        <VAlert
          type="info"
          variant="tonal"
          density="compact"
          icon="mdi-database-check-outline"
          class="mb-5"
        >
          {{ t('rateChanges.changeOnly') }}
        </VAlert>

        <VAlert v-if="error" type="warning" variant="tonal" class="mb-4">
          {{ t('rateChanges.error') }}
        </VAlert>

        <div v-if="filteredChanges.length" class="changes-list">
          <VCard
            v-for="change in filteredChanges"
            :key="`${change.origin}-${change.code}-${change.type}-${change.observedAt}`"
            class="change-card mb-3 pa-4 pa-md-5"
            variant="flat"
          >
            <div class="change-card__header">
              <div class="change-card__identity">
                <NuxtLink
                  :to="localePath(`/casa/${change.origin}`)"
                  class="house-link text-subtitle-1 font-weight-bold"
                >
                  {{ change.houseName }}
                </NuxtLink>
                <div class="change-card__meta">
                  <span>{{ formatDateTime(change.observedAt) }}</span>
                  <span v-if="change.type">{{ change.type }}</span>
                </div>
              </div>
              <div class="change-card__badges">
                <span class="institution-badge">{{ categoryLabel(change.origin) }}</span>
                <span class="currency-badge">
                  <strong>{{ change.code }}</strong>
                  <span>{{ change.name }}</span>
                </span>
              </div>
            </div>

            <VRow density="comfortable" class="mt-4">
              <VCol v-if="change.buyChanged" cols="12" sm="6">
                <div
                  class="rate-transition"
                  :class="directionClass(change.previousBuy, change.buy)"
                >
                  <div class="rate-transition__heading">
                    <span>{{ t('rateChanges.buy') }}</span>
                    <strong>
                      <VIcon size="15">
                        {{ directionIcon(change.previousBuy, change.buy) }}
                      </VIcon>
                      {{ formatPct(rateDeltaPct(change.previousBuy, change.buy)) }}
                    </strong>
                  </div>
                  <div class="rate-transition__values">
                    <span class="old-rate">{{ formatRate(change.previousBuy) }}</span>
                    <VIcon class="rate-transition__arrow" size="17">mdi-arrow-right</VIcon>
                    <span class="new-rate">{{ formatRate(change.buy) }}</span>
                  </div>
                </div>
              </VCol>
              <VCol v-if="change.sellChanged" cols="12" sm="6">
                <div
                  class="rate-transition"
                  :class="directionClass(change.previousSell, change.sell)"
                >
                  <div class="rate-transition__heading">
                    <span>{{ t('rateChanges.sell') }}</span>
                    <strong>
                      <VIcon size="15">
                        {{ directionIcon(change.previousSell, change.sell) }}
                      </VIcon>
                      {{ formatPct(rateDeltaPct(change.previousSell, change.sell)) }}
                    </strong>
                  </div>
                  <div class="rate-transition__values">
                    <span class="old-rate">{{ formatRate(change.previousSell) }}</span>
                    <VIcon class="rate-transition__arrow" size="17">mdi-arrow-right</VIcon>
                    <span class="new-rate">{{ formatRate(change.sell) }}</span>
                  </div>
                </div>
              </VCol>
            </VRow>
          </VCard>
        </div>

        <VCard v-else-if="!pending" class="pa-8 text-center" variant="flat">
          <VIcon size="42" color="medium-emphasis">mdi-timer-sand-empty</VIcon>
          <p class="mt-3 mb-0 text-medium-emphasis">{{ t('rateChanges.empty') }}</p>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { CASAS_REPUTATION } from '~/utils/casasDirectory'

type InstitutionCategory = 'all' | 'casa' | 'banco' | 'fintech'

interface RateChange {
  origin: string
  houseName: string
  code: string
  type: string
  name: string
  previousBuy: number
  previousSell: number
  buy: number
  sell: number
  buyChanged: boolean
  sellChanged: boolean
  observedAt: string
}

interface RateChangesResponse {
  asOf: string
  changes: RateChange[]
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const selectedCategory = ref<InstitutionCategory>('all')
const selectedHouse = ref<string | null>(null)
const selectedCurrency = ref<string | null>(null)

const { data, pending, error, refresh } = await useFetch<RateChangesResponse>('/api/rate-changes', {
  query: { limit: 100 },
})

const changes = computed(() => data.value?.changes ?? [])
const institutionCategories = new Map(
  CASAS_REPUTATION.map(institution => [institution.code, institution.category])
)
const institutionCategory = (origin: string) => institutionCategories.get(origin) ?? 'casa'
const categoryOptions = computed(() => [
  { title: t('rateChanges.categoryAll'), value: 'all' },
  { title: t('rateChanges.categoryCasa'), value: 'casa' },
  { title: t('rateChanges.categoryBanco'), value: 'banco' },
  { title: t('rateChanges.categoryFintech'), value: 'fintech' },
])
const categoryLabel = (origin: string) => {
  const category = institutionCategory(origin)
  const suffix = `${category.charAt(0).toUpperCase()}${category.slice(1)}`
  return t(`rateChanges.category${suffix}`)
}
const houseOptions = computed(() =>
  [
    ...new Set(
      changes.value
        .filter(
          change =>
            selectedCategory.value === 'all' ||
            institutionCategory(change.origin) === selectedCategory.value
        )
        .map(change => change.houseName)
    ),
  ].sort((a, b) => a.localeCompare(b))
)
const currencyOptions = computed(() =>
  [...new Set(changes.value.map(change => change.code))].sort()
)
const filteredChanges = computed(() =>
  changes.value.filter(
    change =>
      (selectedCategory.value === 'all' ||
        institutionCategory(change.origin) === selectedCategory.value) &&
      (!selectedHouse.value || change.houseName === selectedHouse.value) &&
      (!selectedCurrency.value || change.code === selectedCurrency.value)
  )
)
watch(selectedCategory, () => {
  if (!houseOptions.value.includes(selectedHouse.value ?? '')) selectedHouse.value = null
})

const movementSummary = computed(() => {
  let up = 0
  let down = 0
  for (const change of filteredChanges.value) {
    if (change.buyChanged) {
      if (change.buy > change.previousBuy) up++
      else down++
    }
    if (change.sellChanged) {
      if (change.sell > change.previousSell) up++
      else down++
    }
  }
  return { total: up + down, up, down }
})

const numberFormatter = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: 'UYU',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
)
const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Montevideo',
    })
)
const timeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      timeStyle: 'medium',
      timeZone: 'America/Montevideo',
    })
)

const formatRate = (value: number) => numberFormatter.value.format(value)
const formatDateTime = (value: string) => dateFormatter.value.format(new Date(value))
const formatTime = (value: string) => timeFormatter.value.format(new Date(value))
const rateDeltaPct = (previous: number, current: number) =>
  previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0
const formatPct = (value: number) => {
  const absolute = Math.abs(value)
  const digits = absolute === 0 || absolute >= 0.01 ? 2 : absolute >= 0.0001 ? 4 : 6
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`
}
const directionIcon = (previous: number, current: number) =>
  current > previous ? 'mdi-arrow-up' : 'mdi-arrow-down'
const directionClass = (previous: number, current: number) =>
  current > previous ? 'rate-transition--up' : 'rate-transition--down'

let refreshTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  refreshTimer = setInterval(() => void refresh(), 15_000)
})
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const canonical = 'https://cambio-uruguay.com/ultimos-cambios'
useSeoMeta({
  title: () => t('rateChanges.metaTitle'),
  description: () => t('rateChanges.metaDescription'),
  ogTitle: () => t('rateChanges.metaTitle'),
  ogDescription: () => t('rateChanges.metaDescription'),
  ogType: 'website',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
defineOgImageComponent('Cambio', {
  title: () => t('rateChanges.title'),
  subtitle: () => t('rateChanges.subtitle'),
  tag: 'EN VIVO',
})
</script>

<style scoped>
.changes-page {
  max-width: 1120px;
}

.changes-hero-card {
  border: 1px solid rgba(184, 243, 230, 0.16);
}

.changes-hero {
  background:
    radial-gradient(circle at 88% 12%, rgba(30, 194, 160, 0.24), transparent 30%),
    linear-gradient(135deg, #102a43 0%, #144e68 58%, #11695d 100%);
}

.changes-hero__layout,
.filter-panel__header,
.change-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.changes-hero__icon {
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(6, 26, 42, 0.38);
}

.changes-hero__eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b8f3e6;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.changes-hero__pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5ee0b7;
}

.changes-hero__status {
  min-width: 180px;
  padding-inline-start: 22px;
  border-inline-start: 1px solid rgba(184, 243, 230, 0.22);
}

.changes-hero__status span,
.changes-hero__status strong,
.changes-hero__status small {
  display: block;
}

.changes-hero__status span,
.changes-hero__status small {
  color: rgba(231, 250, 246, 0.7);
  font-size: 0.75rem;
}

.changes-hero__status strong {
  margin-block: 2px;
  color: #fff;
  font-family: ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.filter-panel,
.change-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

.movement-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.movement-summary > div {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.045);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
}

.movement-summary strong {
  font-variant-numeric: tabular-nums;
}

.movement-summary__up {
  color: rgb(var(--v-theme-success)) !important;
}

.movement-summary__down {
  color: rgb(var(--v-theme-error)) !important;
}

.change-card {
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}

.change-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.42);
  transform: translateY(-1px);
}

.change-card__identity {
  min-width: 0;
}

.change-card__meta,
.change-card__badges,
.currency-badge {
  display: flex;
  align-items: center;
}

.change-card__meta {
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
}

.change-card__meta span + span::before {
  content: '·';
  margin-inline-end: 10px;
}

.change-card__badges {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.institution-badge {
  padding: 5px 8px;
  border: 1px solid rgba(var(--v-theme-primary), 0.26);
  border-radius: 8px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}

.currency-badge {
  gap: 7px;
  padding: 5px 9px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
}

.currency-badge span {
  overflow: hidden;
  max-width: 150px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rate-transition {
  --movement-color: var(--v-theme-success);
  min-height: 84px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--movement-color), 0.24);
  border-radius: 12px;
  background: rgba(var(--movement-color), 0.055);
}

.rate-transition--down {
  --movement-color: var(--v-theme-error);
}

.rate-transition__heading,
.rate-transition__values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rate-transition__heading {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.rate-transition__heading strong {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: rgb(var(--movement-color));
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.rate-transition__values {
  justify-content: flex-start;
  margin-top: 8px;
  font-family: ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: clamp(0.88rem, 2vw, 1rem);
  font-variant-numeric: tabular-nums;
}

.rate-transition__arrow {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.new-rate {
  color: rgb(var(--movement-color));
  font-weight: 800;
}

.house-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.house-link:hover {
  text-decoration: underline;
}

.old-rate {
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.52;
  text-decoration: line-through;
}

@media (max-width: 700px) {
  .changes-page {
    padding-inline: 12px !important;
  }

  .changes-hero__layout,
  .filter-panel__header,
  .change-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .changes-hero__status {
    width: 100%;
    padding-block-start: 14px;
    padding-inline-start: 0;
    border-block-start: 1px solid rgba(184, 243, 230, 0.22);
    border-inline-start: 0;
  }

  .filter-panel__header .v-btn {
    width: 100%;
  }

  .movement-summary {
    flex-wrap: wrap;
  }

  .change-card__badges {
    justify-content: flex-start;
  }

  .rate-transition {
    min-height: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .change-card {
    transition: none;
  }
}
</style>
