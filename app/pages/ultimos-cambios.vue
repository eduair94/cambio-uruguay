<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" lg="9">
        <VCard class="overflow-hidden mb-5" elevation="8">
          <div class="changes-hero on-dark pa-6 pa-md-8">
            <div class="d-flex align-center ga-4">
              <VAvatar color="white" size="54">
                <VIcon color="primary" size="30">mdi-swap-horizontal-bold</VIcon>
              </VAvatar>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                  {{ t('rateChanges.title') }}
                </h1>
                <p class="text-body-1 text-grey-lighten-2 mb-0">
                  {{ t('rateChanges.subtitle') }}
                </p>
              </div>
            </div>
          </div>
        </VCard>

        <VAlert type="info" variant="tonal" icon="mdi-database-check-outline" class="mb-5">
          {{ t('rateChanges.changeOnly') }}
        </VAlert>

        <div class="d-flex justify-end mb-5">
          <VBtn
            :to="localePath('/analiticas')"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-chart-timeline-variant-shimmer"
          >
            {{ t('rateAnalytics.nav') }}
          </VBtn>
        </div>

        <VCard class="pa-4 mb-5">
          <VRow dense>
            <VCol cols="12" sm="6">
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
            <VCol cols="12" sm="6">
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
          <div class="d-flex align-center ga-2 mt-3 text-caption text-medium-emphasis">
            <VIcon size="16" color="success">mdi-access-point</VIcon>
            <span>{{ t('rateChanges.live') }}</span>
            <span v-if="data?.asOf">· {{ formatTime(data.asOf) }}</span>
            <VProgressCircular v-if="pending" indeterminate size="14" width="2" class="ms-1" />
          </div>
        </VCard>

        <VAlert v-if="error" type="warning" variant="tonal" class="mb-4">
          {{ t('rateChanges.error') }}
        </VAlert>

        <div v-if="filteredChanges.length" class="changes-list">
          <VCard
            v-for="change in filteredChanges"
            :key="`${change.origin}-${change.code}-${change.type}-${change.observedAt}`"
            class="change-card mb-3 pa-4"
            variant="flat"
          >
            <div class="d-flex align-start justify-space-between ga-3 flex-wrap">
              <div>
                <NuxtLink
                  :to="localePath(`/casa/${change.origin}`)"
                  class="house-link text-subtitle-1 font-weight-bold"
                >
                  {{ change.houseName }}
                </NuxtLink>
                <div class="text-caption text-medium-emphasis">
                  {{ change.code }}
                  <span v-if="change.type">· {{ change.type }}</span>
                  · {{ formatDateTime(change.observedAt) }}
                </div>
              </div>
              <VChip size="small" color="primary" variant="tonal">
                {{ change.name }}
              </VChip>
            </div>

            <VRow dense class="mt-3">
              <VCol v-if="change.buyChanged" cols="12" sm="6">
                <div class="rate-box">
                  <span class="text-caption text-medium-emphasis">
                    {{ t('rateChanges.buy') }}
                  </span>
                  <div class="d-flex align-center ga-2 font-weight-bold">
                    <span class="old-rate">{{ formatRate(change.previousBuy) }}</span>
                    <VIcon size="18" :color="directionColor(change.previousBuy, change.buy)">
                      {{ directionIcon(change.previousBuy, change.buy) }}
                    </VIcon>
                    <span :class="directionClass(change.previousBuy, change.buy)">
                      {{ formatRate(change.buy) }}
                    </span>
                  </div>
                </div>
              </VCol>
              <VCol v-if="change.sellChanged" cols="12" sm="6">
                <div class="rate-box">
                  <span class="text-caption text-medium-emphasis">
                    {{ t('rateChanges.sell') }}
                  </span>
                  <div class="d-flex align-center ga-2 font-weight-bold">
                    <span class="old-rate">{{ formatRate(change.previousSell) }}</span>
                    <VIcon size="18" :color="directionColor(change.previousSell, change.sell)">
                      {{ directionIcon(change.previousSell, change.sell) }}
                    </VIcon>
                    <span :class="directionClass(change.previousSell, change.sell)">
                      {{ formatRate(change.sell) }}
                    </span>
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
const selectedHouse = ref<string | null>(null)
const selectedCurrency = ref<string | null>(null)

const { data, pending, error, refresh } = await useFetch<RateChangesResponse>('/api/rate-changes', {
  query: { limit: 100 },
})

const changes = computed(() => data.value?.changes ?? [])
const houseOptions = computed(() =>
  [...new Set(changes.value.map(change => change.houseName))].sort((a, b) => a.localeCompare(b))
)
const currencyOptions = computed(() =>
  [...new Set(changes.value.map(change => change.code))].sort()
)
const filteredChanges = computed(() =>
  changes.value.filter(
    change =>
      (!selectedHouse.value || change.houseName === selectedHouse.value) &&
      (!selectedCurrency.value || change.code === selectedCurrency.value)
  )
)

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
const directionColor = (previous: number, current: number) =>
  current > previous ? 'success' : 'error'
const directionIcon = (previous: number, current: number) =>
  current > previous ? 'mdi-arrow-up' : 'mdi-arrow-down'
const directionClass = (previous: number, current: number) =>
  current > previous ? 'text-success' : 'text-error'

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
.changes-hero {
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.18), transparent 28%),
    linear-gradient(135deg, #1b4f72 0%, #177e89 54%, #16a085 100%);
}

.change-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rate-box {
  border-radius: 12px;
  background: rgba(var(--v-theme-surface-variant), 0.45);
  padding: 12px 14px;
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
  opacity: 0.58;
  text-decoration: line-through;
}
</style>
