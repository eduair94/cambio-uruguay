<template>
  <div class="price-moves-chart" role="img" :aria-label="t('porQueDolar.chartTitle')">
    <Line v-if="hasData" class="price-moves-chart__canvas" :data="chartData" :options="options" />
    <div v-else class="price-moves-chart__empty" aria-hidden="true">
      <VIcon icon="mdi-chart-line" size="40" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { format, parseISO } from 'date-fns'
import { Line } from 'vue-chartjs'

// Register only the pieces this single-line chart needs (mirrors the
// historico page's local `ChartJS.register(...)` rather than a global plugin,
// so other charts in the app aren't affected by this component's footprint).
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Filler
)

interface BasePoint {
  date: string
  value: number
}

interface MovePoint {
  date: string
  pctChange: number
  direction: 'up' | 'down' | 'flat'
}

const props = defineProps<{
  base: BasePoint[]
  moves: MovePoint[]
}>()

const emit = defineEmits<{ select: [date: string] }>()

const { t } = useI18n()

// The line gets its own chart-specific blue so it never gets mistaken for the
// app's primary brand blue; the up/down marker colors reuse the exact hex
// pair already established by `Sparkline.vue` for this same analysis feature,
// so a green/red jump reads the same way everywhere on the page.
const LINE_COLOR = '#2f81f7'
const LINE_FILL = 'rgba(47, 129, 247, 0.08)'
const UP_COLOR = '#16c784'
const DOWN_COLOR = '#ea3943'
const AXIS_COLOR = 'rgba(148, 163, 184, 0.85)'
const TOOLTIP_BG = 'rgba(15, 23, 42, 0.94)'
const AXIS_FONT = { family: 'Roboto, sans-serif' }

const hasData = computed(() => props.base.length > 0)

// date -> move, for O(1) lookups while building per-point style arrays.
const moveByDate = computed(() => new Map(props.moves.map(m => [m.date, m])))

const markerColor = (direction: MovePoint['direction']) =>
  direction === 'up' ? UP_COLOR : direction === 'down' ? DOWN_COLOR : LINE_COLOR

const chartData = computed(() => ({
  labels: props.base.map(p => format(parseISO(p.date), 'dd/MM')),
  datasets: [
    {
      data: props.base.map(p => p.value),
      borderColor: LINE_COLOR,
      backgroundColor: LINE_FILL,
      borderWidth: 2,
      tension: 0.25,
      fill: true,
      // Only move days get a visible marker; every other point stays at
      // radius 0 so the line itself carries the trend and the eye lands on
      // the days that actually matter.
      pointRadius: props.base.map(p => (moveByDate.value.has(p.date) ? 5 : 0)),
      // Hover/hit affordance is restricted to move markers only (0 elsewhere).
      // A scalar hit radius made the whole line hoverable + cursor:pointer,
      // implying non-move points were clickable when only markers are.
      pointHoverRadius: props.base.map(p => (moveByDate.value.has(p.date) ? 7 : 0)),
      pointHitRadius: props.base.map(p => (moveByDate.value.has(p.date) ? 6 : 0)),
      pointBackgroundColor: props.base.map(p => {
        const move = moveByDate.value.get(p.date)
        return move ? markerColor(move.direction) : LINE_COLOR
      }),
    },
  ],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: TOOLTIP_BG,
      titleColor: '#ffffff',
      bodyColor: '#e2e8f0',
      cornerRadius: 8,
      padding: 10,
      displayColors: false,
      titleFont: { family: 'Roboto, sans-serif', weight: 'bold' as const },
      bodyFont: AXIS_FONT,
      callbacks: {
        title: (items: any[]) => {
          const i = items[0]?.dataIndex ?? 0
          const d = props.base[i]?.date
          return d ? format(parseISO(d), 'dd/MM/yyyy') : ''
        },
        label: (item: any) => {
          const point = props.base[item.dataIndex]
          const value = typeof item.parsed?.y === 'number' ? item.parsed.y.toFixed(2) : '-'
          const move = point ? moveByDate.value.get(point.date) : undefined
          if (!move) return value
          const arrow = move.direction === 'up' ? '▲' : move.direction === 'down' ? '▼' : '·'
          const pct = `${move.pctChange >= 0 ? '+' : ''}${move.pctChange.toFixed(2)}%`
          return `${value}  ${arrow} ${pct}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: AXIS_COLOR, maxTicksLimit: 8, font: AXIS_FONT },
    },
    y: {
      grid: { display: false },
      ticks: { color: AXIS_COLOR, maxTicksLimit: 6, font: AXIS_FONT },
    },
  },
  onHover: (evt: any, elements: any[]) => {
    // Only the move markers are clickable, so only they get a pointer cursor.
    const target = evt?.native?.target
    if (target) target.style.cursor = elements.length ? 'pointer' : 'default'
  },
  onClick: (evt: any, _elements: any, chart: any) => {
    const hits = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true)
    const index = hits?.[0]?.index
    const date = typeof index === 'number' ? props.base[index]?.date : undefined
    if (date && moveByDate.value.has(date)) emit('select', date)
  },
}))
</script>

<style scoped>
.price-moves-chart {
  position: relative;
  height: 360px;
  width: 100%;
}

.price-moves-chart__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.price-moves-chart__empty {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), 0.35);
}
</style>
