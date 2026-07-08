<template>
  <VCard class="moves-timeline pa-5" elevation="4">
    <h2 class="text-h6 font-weight-bold mb-4">{{ t('porQueDolar.timelineTitle') }}</h2>

    <ul class="timeline-list">
      <li
        v-for="move in ordered"
        :key="move.date"
        class="timeline-item"
        :class="{ 'timeline-item--selected': move.date === selectedDate }"
      >
        <div class="timeline-rail" aria-hidden="true">
          <span class="timeline-dot" :class="dotClass(move.direction)" />
          <span class="timeline-line" />
        </div>

        <div class="timeline-content">
          <button
            type="button"
            class="timeline-header"
            :aria-label="`${t('porQueDolar.timelineSelectMove')} ${formatDate(move.date)}, ${signedPct(move.pctChange)}`"
            @click="emit('select', move.date)"
          >
            <span class="text-subtitle-2 font-weight-medium">{{ formatDate(move.date) }}</span>
            <span class="stat-value text-body-2 font-weight-bold" :class="pctClass(move.direction)">
              {{ signedPct(move.pctChange) }}
            </span>
          </button>

          <p class="text-caption text-medium-emphasis mb-1 mt-2">
            {{ t('porQueDolar.timelineAttribution') }}
          </p>
          <div class="d-flex flex-wrap ga-2 mb-3">
            <VChip
              v-for="a in attribution(move.date)"
              :key="a.key"
              size="x-small"
              variant="tonal"
              :color="a.dayMovePct >= 0 ? 'success' : 'error'"
            >
              {{ chipLabel(a) }}
            </VChip>
          </div>

          <p v-if="move.narrative" class="text-body-2 mb-2">{{ move.narrative }}</p>

          <div v-if="move.headlines.length" class="headline-list">
            <a
              v-for="(headline, i) in move.headlines"
              :key="i"
              :href="headline.link"
              target="_blank"
              rel="noopener noreferrer"
              class="headline-link d-block text-body-2"
            >
              {{ headline.title }}
              <span class="text-caption text-medium-emphasis">— {{ headline.source }}</span>
            </a>
          </div>
          <p v-else-if="!move.narrative" class="text-caption text-medium-emphasis font-italic mb-0">
            {{ t('porQueDolar.timelineNoNews') }}
          </p>
        </div>
      </li>
    </ul>
  </VCard>
</template>

<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { attributeMove, type DriverDayMove } from '~/utils/attribution'

const props = defineProps<{
  moves: {
    date: string
    pctChange: number
    direction: 'up' | 'down' | 'flat'
    headlines: { title: string; source: string; link: string }[]
    narrative: string | null
  }[]
  driverSeries: { key: string; points: { date: string; value: number }[] }[]
  driverLabels: Record<string, string>
  selectedDate: string | null
}>()

const emit = defineEmits<{ select: [date: string] }>()

const { t } = useI18n()

const ordered = computed(() => [...props.moves].sort((a, b) => b.date.localeCompare(a.date)))

const attribution = (date: string) => attributeMove(date, props.driverSeries).slice(0, 3)

const formatDate = (date: string) => format(parseISO(date), 'dd/MM/yyyy')

const signedPct = (pctChange: number) => `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`

const chipLabel = (a: DriverDayMove) => {
  const label = props.driverLabels[a.key] ?? a.key
  return `${label} ${a.dayMovePct >= 0 ? '+' : ''}${a.dayMovePct.toFixed(1)}%`
}

const dotClass = (direction: 'up' | 'down' | 'flat') =>
  direction === 'up' ? 'bg-success' : direction === 'down' ? 'bg-error' : 'bg-grey'

const pctClass = (direction: 'up' | 'down' | 'flat') =>
  direction === 'up' ? 'text-success' : direction === 'down' ? 'text-error' : 'text-medium-emphasis'
</script>

<style scoped>
/* A true chronological rail: order is real information here (this is a
   timeline of dated events), unlike the plain bordered rows used for the
   ranked driver list elsewhere on this page. */
.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.timeline-item {
  display: flex;
  gap: 14px;
}

.timeline-item--selected .timeline-content {
  background: rgba(var(--v-theme-primary), 0.07);
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
}

.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 18px;
  flex-shrink: 0;
}

.timeline-line {
  width: 2px;
  flex: 1;
  margin-top: 4px;
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.timeline-item:last-child .timeline-line {
  visibility: hidden;
}

.timeline-content {
  flex: 1;
  min-width: 0;
  padding: 10px 12px 18px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.timeline-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.stat-value {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.headline-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.headline-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.headline-link:hover,
.headline-link:focus-visible {
  text-decoration: underline;
}

@media (prefers-reduced-motion: reduce) {
  .timeline-content {
    transition: none;
  }
}
</style>
