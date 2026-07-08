<template>
  <VCard class="why-today-card pa-5" :class="moodClass" elevation="4">
    <h2 class="text-h6 font-weight-bold d-flex align-center ga-2 mb-4">
      <VIcon size="20" color="primary" icon="mdi-help-circle-outline" />
      {{ t('porQueDolar.todayTitle') }}
    </h2>

    <div v-if="summary.date === null" class="d-flex align-center ga-2">
      <VIcon icon="mdi-calendar-remove-outline" size="20" color="grey" />
      <span class="text-body-2 text-medium-emphasis font-italic">
        {{ t('porQueDolar.todayNoData') }}
      </span>
    </div>

    <div v-else>
      <VChip
        size="large"
        variant="tonal"
        :color="chipColor"
        :prepend-icon="chipIcon"
        class="headline-chip mb-4"
      >
        {{ headlineText }}
      </VChip>

      <template v-if="summary.top">
        <p class="text-subtitle-2 font-weight-medium mb-1">
          {{ t('porQueDolar.todayTopDriver', { driver: topDriverLabel }) }}
        </p>
        <p class="text-body-2 text-medium-emphasis reading mb-4">
          {{ t(readingKeyFor(summary.top.key, summary.top.r)) }}
        </p>
      </template>

      <VChip
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-newspaper-variant-outline"
      >
        {{ t('porQueDolar.todayHeadlines', { count: headlineCount }) }}
      </VChip>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import type { TodaySummary } from '~/utils/attribution'
import { readingKeyFor } from '~/utils/driverReadings'

const props = defineProps<{
  summary: TodaySummary
  driverLabels: Record<string, string>
  headlineCount: number
}>()

const { t } = useI18n()

const pct = computed(() => Math.abs(props.summary.pctChange).toFixed(2))

// Mirrors dolar-hoy.vue's chipColor/chipIcon so an "up" day reads identically
// across the whole site, not just on this page.
const chipColor = computed(() =>
  props.summary.direction === 'up'
    ? 'success'
    : props.summary.direction === 'down'
      ? 'error'
      : 'grey'
)
const chipIcon = computed(() =>
  props.summary.direction === 'up'
    ? 'mdi-trending-up'
    : props.summary.direction === 'down'
      ? 'mdi-trending-down'
      : 'mdi-trending-neutral'
)

// Card background gets a whisper-quiet tint of today's direction — the one
// accent this "hero" card allows itself, so the day's mood registers before
// any text is read, without competing with the driver panels below it.
const moodClass = computed(() =>
  props.summary.date === null
    ? ''
    : props.summary.direction === 'up'
      ? 'why-today-card--up'
      : props.summary.direction === 'down'
        ? 'why-today-card--down'
        : ''
)

const headlineText = computed(() => {
  const s = props.summary
  if (s.direction === 'up') return t('porQueDolar.todayUp', { pct: pct.value })
  if (s.direction === 'down') return t('porQueDolar.todayDown', { pct: pct.value })
  return t('porQueDolar.todayFlat')
})

const topDriverLabel = computed(() => {
  const top = props.summary.top
  if (!top) return ''
  return props.driverLabels[top.key] ?? top.key
})
</script>

<style scoped>
.why-today-card {
  position: relative;
  overflow: hidden;
}

.why-today-card--up {
  background: linear-gradient(180deg, rgba(var(--v-theme-success), 0.07), transparent 65%);
}

.why-today-card--down {
  background: linear-gradient(180deg, rgba(var(--v-theme-error), 0.07), transparent 65%);
}

.headline-chip {
  font-size: 1rem;
  font-weight: 700;
  height: auto;
  padding-block: 10px;
}

.reading {
  line-height: 1.5;
}
</style>
