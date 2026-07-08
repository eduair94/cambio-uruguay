<template>
  <VCard class="drivers-panel pa-5" elevation="4">
    <h2 class="text-h6 font-weight-bold d-flex align-center ga-2 mb-1">
      <VIcon size="20" color="primary" icon="mdi-chart-timeline-variant" />
      {{ t('porQueDolar.driversTitle') }}
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      {{ t('porQueDolar.driversHint') }}
    </p>

    <ul class="driver-list">
      <li
        v-for="entry in ranked"
        :key="entry.key"
        class="driver-row"
        :class="{ 'driver-row--empty': entry.n === 0 }"
      >
        <div class="d-flex align-baseline justify-space-between ga-3 mb-1">
          <span class="text-subtitle-2 font-weight-medium">{{ label(entry.key) }}</span>
          <span
            v-if="entry.n > 0"
            class="stat-value text-body-2 font-weight-bold flex-shrink-0"
            :class="entry.r >= 0 ? 'text-success' : 'text-error'"
          >
            {{ signedR(entry.r) }}
          </span>
        </div>

        <template v-if="entry.n > 0">
          <div class="bar-track mb-2" aria-hidden="true">
            <div
              class="bar-fill"
              :class="entry.r >= 0 ? 'bg-success' : 'bg-error'"
              :style="{ width: barPct(entry.r) + '%' }"
            />
          </div>

          <div class="d-flex align-center justify-space-between ga-3 flex-wrap mb-2">
            <div class="d-flex align-center ga-2 flex-wrap">
              <VChip size="x-small" variant="tonal" :color="entry.r >= 0 ? 'success' : 'error'">
                {{ t('porQueDolar.strength.' + strengthLabel(entry.r)) }}
              </VChip>
              <span class="text-caption text-medium-emphasis stat-value">
                {{ t('porQueDolar.sampleSize', { n: entry.n }) }}
              </span>
            </div>
            <div class="spark-wrap">
              <Sparkline :values="driverSeries[entry.key] ?? []" :up="entry.r >= 0" />
            </div>
          </div>

          <p class="text-body-2 text-medium-emphasis mb-0 reading">
            {{ t(readingKeyFor(entry.key, entry.r)) }}
          </p>
        </template>
        <template v-else>
          <span class="text-caption text-medium-emphasis font-italic">
            {{ t('porQueDolar.noData') }}
          </span>
        </template>
      </li>
    </ul>
  </VCard>
</template>

<script setup lang="ts">
import { readingKeyFor, strengthLabel } from '~/utils/driverReadings'

interface Correlation {
  key: string
  r: number
  n: number
}

const props = defineProps<{
  correlations: Correlation[]
  driverLabels: Record<string, string>
  driverSeries: Record<string, number[]>
}>()

const { t } = useI18n()

// n === 0 (no overlapping sample) sorts last regardless of |r|; entries
// with data are ranked by explanatory strength, strongest first.
const ranked = computed(() =>
  [...props.correlations].sort((a, b) => {
    if ((a.n === 0) !== (b.n === 0)) return a.n === 0 ? 1 : -1
    return Math.abs(b.r) - Math.abs(a.r)
  })
)

const barPct = (r: number) => Math.min(100, Math.abs(r) * 100)
const label = (key: string) => props.driverLabels[key] ?? key
const signedR = (r: number) => `${r >= 0 ? '+' : ''}${r.toFixed(2)}`
</script>

<style scoped>
.driver-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.driver-row {
  padding-block: 14px;
}

.driver-row + .driver-row {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.driver-row--empty {
  opacity: 0.55;
}

/* Numeric columns line up like a small data table, reinforcing that this
   panel reflects a measured statistic rather than an editorial ranking. */
.stat-value {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bar-track {
  position: relative;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.spark-wrap {
  width: 100px;
  flex-shrink: 0;
}

.spark-wrap :deep(.sparkline) {
  height: 22px;
}

.reading {
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .bar-fill {
    transition: none;
  }
}
</style>
