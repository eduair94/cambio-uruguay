<!-- Neighbourhood figures vs asking rent per m². Reads the analysis the zone job stores daily. -->
<template>
  <section class="price-impact" :aria-labelledby="headingId" data-testid="rental-zone-impact">
    <h2 :id="headingId">{{ t('title') }}</h2>
    <p v-if="!impact || !current" class="notice">{{ t('unavailable') }}</p>
    <template v-else>
      <p class="intro">
        {{
          t('intro', { zones: number(impact.zones.length), min: number(impact.minimumListings) })
        }}
      </p>
      <div class="controls" role="group" :aria-label="t('choose')">
        <VBtn
          v-for="item in impact.attributes"
          :key="item.attribute"
          :variant="item.attribute === selected ? 'flat' : 'outlined'"
          :color="item.attribute === selected ? 'primary' : undefined"
          :aria-pressed="item.attribute === selected"
          size="small"
          @click="selected = item.attribute"
          >{{ t(`name_${item.attribute}`) }}</VBtn
        >
      </div>
      <p class="verdict" :class="`verdict--${current.verdict}`">{{ sentence(current) }}</p>
      <p class="meta">
        {{
          t('rho', {
            rho: decimal(current.rho, 2),
            low: decimal(current.rhoLow, 2),
            high: decimal(current.rhoHigh, 2),
            zones: number(current.zones),
          })
        }}
      </p>
      <figure class="chart">
        <svg
          ref="svg"
          :viewBox="`0 0 ${W} ${H}`"
          role="img"
          :aria-label="`${t(`axis_${current.attribute}`)} · ${t('yAxis')}`"
          @pointermove="hover"
          @pointerleave="active = null"
        >
          <g class="grid">
            <line
              v-for="tick in yTicks"
              :key="`y${tick}`"
              :x1="M.left"
              :x2="W - M.right"
              :y1="sy(tick)"
              :y2="sy(tick)"
            />
          </g>
          <g class="axis">
            <text
              v-for="tick in yTicks"
              :key="`yl${tick}`"
              :x="M.left - 8"
              :y="sy(tick) + 4"
              text-anchor="end"
            >
              {{ number(tick) }}
            </text>
            <text
              v-for="tick in xTicks"
              :key="`xl${tick}`"
              :x="sx(tick)"
              :y="H - M.bottom + 18"
              text-anchor="middle"
            >
              {{ decimal(tick, 1) }}
            </text>
            <line :x1="M.left" :x2="W - M.right" :y1="H - M.bottom" :y2="H - M.bottom" />
            <text :x="(M.left + W - M.right) / 2" :y="H - 6" text-anchor="middle" class="title">
              {{ t(`axis_${current.attribute}`) }}
            </text>
            <text
              :transform="`translate(14 ${(M.top + H - M.bottom) / 2}) rotate(-90)`"
              text-anchor="middle"
              class="title"
            >
              {{ t('yAxis') }}
            </text>
          </g>
          <polyline class="trend" :points="trend" />
          <g class="dots">
            <circle
              v-for="point in points"
              :key="point.zone"
              :cx="sx(point.x)"
              :cy="sy(point.y)"
              :r="active?.zone === point.zone ? 7 : 5"
            />
          </g>
          <g v-if="active" class="tip" aria-hidden="true">
            <rect :x="tipX" :y="tipY - 22" :width="tipWidth" height="30" rx="6" />
            <text :x="tipX + 10" :y="tipY - 2">{{ label(active) }}</text>
          </g>
        </svg>
        <figcaption class="meta">{{ t('causality') }}</figcaption>
      </figure>
      <p v-if="!impact.attributes.some(item => item.attribute === 'luz')" class="meta">
        {{ t('powerPending') }}
      </p>
      <details class="block">
        <summary>{{ t('summary') }}</summary>
        <table class="table">
          <thead>
            <tr>
              <th scope="col">{{ t('attribute') }}</th>
              <th scope="col">{{ t('effect') }}</th>
              <th scope="col">{{ t('verdict') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in impact.attributes" :key="item.attribute">
              <th scope="row">{{ t(`name_${item.attribute}`) }}</th>
              <td>
                {{ signed(item.pct) }} % ({{
                  t('range', { low: signed(item.pctLow), high: signed(item.pctHigh) })
                }})
              </td>
              <td>{{ verdictLabel(item.verdict) }}</td>
            </tr>
          </tbody>
        </table>
      </details>
      <details v-if="impact.joint" class="block">
        <summary>{{ t('jointTitle') }}</summary>
        <p class="meta">
          {{
            t('jointHint', { r2: decimal(impact.joint.r2, 2), zones: number(impact.joint.zones) })
          }}
        </p>
        <table class="table">
          <thead>
            <tr>
              <th scope="col">{{ t('attribute') }}</th>
              <th scope="col">{{ t('perSd') }}</th>
              <th scope="col">{{ t('interval') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in impact.joint.coefficients" :key="item.attribute">
              <th scope="row">{{ t(`name_${item.attribute}`) }}</th>
              <td>{{ signed(item.pctPerSd) }} %</td>
              <td>{{ t('range', { low: signed(item.low), high: signed(item.high) }) }}</td>
            </tr>
          </tbody>
        </table>
      </details>
      <details class="block">
        <summary>{{ t('tableTitle') }}</summary>
        <table class="table">
          <thead>
            <tr>
              <th scope="col">{{ t('zone') }}</th>
              <th scope="col">{{ t(`name_${current.attribute}`) }}</th>
              <th scope="col">{{ t('rentM2') }}</th>
              <th scope="col">{{ t('listings') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in sortedPoints" :key="point.zone">
              <th scope="row">{{ point.name }}</th>
              <td>{{ decimal(point.x, 1) }}</td>
              <td>$ {{ number(point.y) }}</td>
              <td>{{ number(point.n) }}</td>
            </tr>
          </tbody>
        </table>
      </details>
      <p class="meta">{{ t('updated', { date: date(impact.generatedAt) }) }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { RentalImpactAttribute, RentalZoneImpact } from '~/utils/rentalZoneTypes'
import { rentalZoneImpactMessages } from '~/utils/rentalZoneImpactMessages'

const { t, locale } = useI18n({ useScope: 'local', messages: rentalZoneImpactMessages })
const headingId = useId()
const { data: impact } = await useFetch<RentalZoneImpact>('/api/rentals/zone-impact', {
  key: 'rental-zone-impact',
  default: () => null as unknown as RentalZoneImpact,
})
const PREFERRED: RentalImpactAttribute[] = [
  'luz',
  'agua',
  'saneamiento',
  'limpieza',
  'alumbrado',
  'calles',
  'denuncias',
]
const selected = ref<RentalImpactAttribute>('saneamiento')
watchEffect(() => {
  const available = impact.value?.attributes.map(item => item.attribute) || []
  if (available.length && !available.includes(selected.value))
    selected.value = PREFERRED.find(item => available.includes(item)) || available[0]!
})
const current = computed(
  () => impact.value?.attributes.find(item => item.attribute === selected.value) || null
)
const names = computed(() => new Map((impact.value?.zones || []).map(zone => [zone.zone, zone])))
interface Point {
  zone: string
  name: string
  n: number
  x: number
  y: number
}
const points = computed<Point[]>(() =>
  (current.value?.points || []).map(point => ({
    ...point,
    name: names.value.get(point.zone)?.name || point.zone,
    n: names.value.get(point.zone)?.n || 0,
  }))
)
const sortedPoints = computed(() => [...points.value].sort((a, b) => b.y - a.y))

const W = 640,
  H = 360
const M = { top: 16, right: 16, bottom: 52, left: 64 }
function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) return [min]
  const raw = (max - min) / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(f => f * power).find(s => s >= raw) || raw
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step)
    ticks.push(Math.round(v * 1e6) / 1e6)
  return ticks
}
const xDomain = computed(() => {
  const xs = points.value.map(p => p.x)
  const min = Math.min(0, ...xs),
    max = Math.max(...xs, 1)
  return [min, max + (max - min) * 0.04] as const
})
const yDomain = computed(() => {
  const ys = points.value.map(p => p.y)
  const min = Math.min(...ys),
    max = Math.max(...ys)
  const pad = (max - min) * 0.08 || 50
  return [Math.max(0, min - pad), max + pad] as const
})
const sx = (x: number) =>
  M.left + ((x - xDomain.value[0]) / (xDomain.value[1] - xDomain.value[0])) * (W - M.left - M.right)
const sy = (y: number) =>
  H -
  M.bottom -
  ((y - yDomain.value[0]) / (yDomain.value[1] - yDomain.value[0])) * (H - M.top - M.bottom)
const xTicks = computed(() => niceTicks(xDomain.value[0], xDomain.value[1]))
const yTicks = computed(() => niceTicks(yDomain.value[0], yDomain.value[1]))
/** Least-squares line of log(rent/m²) on the figure, drawn back on the rent scale. */
const trend = computed(() => {
  const list = points.value
  if (list.length < 2) return ''
  const mx = list.reduce((s, p) => s + p.x, 0) / list.length
  const my = list.reduce((s, p) => s + Math.log(p.y), 0) / list.length
  const sxx = list.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  const b = sxx ? list.reduce((s, p) => s + (p.x - mx) * (Math.log(p.y) - my), 0) / sxx : 0
  const xs = list.map(p => p.x)
  const from = Math.min(...xs),
    to = Math.max(...xs)
  return Array.from({ length: 21 }, (_, i) => from + ((to - from) * i) / 20)
    .map(x => `${sx(x).toFixed(1)},${sy(Math.exp(my + b * (x - mx))).toFixed(1)}`)
    .join(' ')
})

const active = ref<Point | null>(null)
const svg = ref<SVGSVGElement>()
function hover(event: PointerEvent) {
  const box = svg.value?.getBoundingClientRect()
  if (!box?.width) return
  const x = ((event.clientX - box.left) / box.width) * W,
    y = ((event.clientY - box.top) / box.height) * H
  let best: Point | null = null,
    distance = 30 ** 2
  for (const point of points.value) {
    const d = (sx(point.x) - x) ** 2 + (sy(point.y) - y) ** 2
    if (d < distance) {
      distance = d
      best = point
    }
  }
  active.value = best
}
const tipWidth = computed(() => Math.min(W - 16, 20 + label(active.value!).length * 6.6))
const tipX = computed(() =>
  active.value
    ? Math.min(Math.max(8, sx(active.value.x) - tipWidth.value / 2), W - tipWidth.value - 8)
    : 0
)
const tipY = computed(() => (active.value ? Math.max(30, sy(active.value.y) - 12) : 0))

const number = (value: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(value)
const decimal = (value: number, digits = 1) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: digits }).format(value)
const signed = (value: number) => `${value > 0 ? '+' : ''}${decimal(value, 1)}`
const date = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'long',
    timeZone: 'America/Montevideo',
  }).format(new Date(value))
function label(point: Point) {
  return point ? t('tooltip', { zone: point.name, x: decimal(point.x, 1), y: number(point.y) }) : ''
}
function verdictLabel(verdict: 'lower' | 'higher' | 'inconclusive') {
  return t(
    verdict === 'lower'
      ? 'verdictLower'
      : verdict === 'higher'
        ? 'verdictHigher'
        : 'verdictInconclusive'
  )
}
function sentence(item: RentalZoneImpact['attributes'][number]) {
  const values = {
    label: t(`label_${item.attribute}`),
    low: decimal(item.xLow, 1),
    high: decimal(item.xHigh, 1),
    pct: decimal(Math.abs(item.pct), 1),
    // The interval keeps its signs: "−15,9 % a +3 %" says the magnitude is uncertain.
    pctLow: signed(item.pctLow),
    pctHigh: signed(item.pctHigh),
  }
  return t(item.verdict, values)
}
</script>

<style scoped>
.price-impact {
  margin-top: 32px;
}
:where(.price-impact) :where(h2, p) {
  margin: 0;
}
h2 {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.intro {
  margin-top: 8px !important;
  max-width: 72ch;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.controls .v-btn {
  min-height: 36px;
}
.verdict {
  margin-top: 16px !important;
  font-weight: 600;
  max-width: 72ch;
}
.meta {
  margin-top: 6px !important;
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.8rem;
  max-width: 72ch;
}
.notice {
  margin-top: 12px !important;
}
.chart {
  margin: 12px 0 0;
  max-width: 760px;
}
svg {
  display: block;
  width: 100%;
  height: auto;
  touch-action: pan-y;
}
.grid line {
  stroke: rgba(var(--v-theme-on-surface), 0.1);
  stroke-width: 1;
}
.axis line {
  stroke: rgba(var(--v-theme-on-surface), 0.35);
}
.axis text {
  fill: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 12px;
}
.axis .title {
  fill: rgba(var(--v-theme-on-surface), 0.86);
  font-size: 12px;
  font-weight: 600;
}
.trend {
  fill: none;
  stroke: rgba(var(--v-theme-on-surface), 0.55);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}
.dots circle {
  fill: rgb(var(--v-theme-primary));
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 2;
  cursor: pointer;
}
.tip rect {
  fill: rgb(var(--v-theme-surface));
  stroke: rgba(var(--v-theme-on-surface), 0.3);
}
.tip text {
  fill: rgb(var(--v-theme-on-surface));
  font-size: 12px;
}
.block {
  margin-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.block summary {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  font-weight: 600;
}
.table {
  width: 100%;
  max-width: 760px;
  border-collapse: collapse;
  font-size: 0.875rem;
  margin-bottom: 8px;
}
.table th,
.table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-variant-numeric: tabular-nums;
}
.table thead th {
  font-weight: 600;
}
.table tbody th {
  font-weight: 500;
}
</style>
