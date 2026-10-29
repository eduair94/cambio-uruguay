<template>
  <figure class="compare-chart">
    <div class="compare-chart__legend">
      <span v-for="(column, index) in columns" :key="column.slug" class="compare-chart__key">
        <CarsCompareKeyMark :index="index" />
        {{ names[index] }}
        <span class="compare-chart__variant">{{ carCompareVariantLabel(column.variant) }}</span>
      </span>
    </div>

    <div ref="frame" class="compare-chart__frame" :style="{ height: `${height}px` }">
      <svg
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        aria-hidden="true"
        focusable="false"
        class="compare-chart__svg"
      >
        <g class="compare-chart__grid">
          <g v-for="tick in yTicks" :key="`y${tick}`">
            <line :x1="PAD.left" :x2="width - PAD.right" :y1="y(tick)" :y2="y(tick)" />
            <text :x="PAD.left - 8" :y="y(tick)" dy="0.32em" text-anchor="end">
              {{ tickLabel(tick) }}
            </text>
          </g>
          <text
            v-for="year in xLabels"
            :key="`x${year}`"
            :x="x(year)"
            :y="height - 8"
            text-anchor="middle"
          >
            {{ year }}
          </text>
        </g>

        <rect
          v-if="lensYear !== null"
          class="compare-chart__band"
          :x="x(lensYear) - band / 2"
          :y="PAD.top"
          :width="band"
          :height="height - PAD.top - PAD.bottom"
        />
        <line
          v-if="hoverYear !== null && hoverYear !== lensYear"
          class="compare-chart__hover"
          :x1="x(hoverYear)"
          :x2="x(hoverYear)"
          :y1="PAD.top"
          :y2="height - PAD.bottom"
        />

        <g v-for="(line, index) in series" :key="line.slug" :class="`compare-key--${index}`">
          <polyline class="compare-chart__line" :points="line.path" />
          <template v-for="point in line.points" :key="point.year">
            <CarsCompareChartMark
              :index="index"
              :x="x(point.year)"
              :y="y(point.median)"
              :strong="point.year === line.focus"
            />
          </template>
        </g>

        <g v-if="mode === 'plata' && budget !== null" class="compare-chart__budget">
          <line
            :x1="PAD.left"
            :x2="width - HANDLE_INSET"
            :y1="y(budget)"
            :y2="y(budget)"
            class="compare-chart__budget-line"
          />
          <text :x="PAD.left + 4" :y="y(budget) - 8" class="compare-chart__budget-label">
            Tu presupuesto: {{ formatCarUsd(budget) }}
          </text>
        </g>

        <!-- La capa que toma el puntero: tocar elige el año (o el presupuesto), sin robar el scroll. -->
        <rect
          class="compare-chart__hit"
          :x="PAD.left"
          :y="PAD.top"
          :width="Math.max(0, width - PAD.left - PAD.right)"
          :height="Math.max(0, height - PAD.top - PAD.bottom)"
          @pointerdown="onPress"
          @pointerup="onRelease"
          @pointermove="onHover"
          @pointerleave="hoverYear = null"
        />
      </svg>

      <!-- El asa es HTML y no SVG: dentro de un SVG el rol de slider no se anuncia y touch-action no
           vale, así que en el celular arrastrar movía la página. -->
      <button
        v-if="mode === 'plata' && budget !== null"
        type="button"
        role="slider"
        class="compare-chart__handle"
        aria-label="Presupuesto"
        :aria-valuemin="range.min"
        :aria-valuemax="range.max"
        :aria-valuenow="budget"
        :aria-valuetext="valueText"
        :style="{ left: `${width - HANDLE_INSET}px`, top: `${y(budget)}px` }"
        @pointerdown="startDrag"
        @keydown="onKey"
      >
        <span class="compare-chart__handle-dot" aria-hidden="true">
          <VIcon icon="mdi-unfold-more-horizontal" size="16" />
        </span>
      </button>
    </div>
    <p class="d-sr-only">{{ summary }}</p>

    <figcaption class="compare-chart__readout">
      <strong>{{ readout.title }}</strong>
      <span v-for="item in readout.items" :key="item.index" class="compare-chart__reading">
        <CarsCompareKeyMark :index="item.index" :size="10" />
        {{ names[item.index] }} <span class="compare-chart__value">{{ item.text }}</span>
      </span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
// El gráfico del comparador: lo que se pide por cada año de cada modelo (la mediana de su variante),
// con la lente dibujada encima. "Con la misma plata" es una línea horizontal que se arrastra: donde
// cada curva la cruza está el año que esa plata compra, y el veredicto se recalcula en el acto.
// "Al mismo año" es una banda vertical. SVG propio, sin librería: son tres líneas y una regla.
import type { CarCompareColumn, CarCompareMode, CarComparePoint } from '~/utils/carCompare'
import { carCompareVariantLabel } from '~/utils/carCompare'
import { formatCarUsd } from '~/utils/cars'

const props = defineProps<{
  columns: CarCompareColumn[]
  names: string[]
  points: CarComparePoint[]
  mode: CarCompareMode
  year: number | null
  budget: number | null
  range: { min: number; max: number }
}>()
const emit = defineEmits<{ year: [number]; budget: [number] }>()

// El asa del presupuesto vive en el margen derecho, fuera del trazado: adentro tapaba el punto del
// año más nuevo, que es justo donde suele caer el que más alcanza.
const PAD = { top: 16, right: 44, bottom: 28, left: 64 }
const HANDLE_INSET = 20
// El ancho real del contenedor: con un viewBox fijo, en 390 px los años se leían a 6 px.
const frame = ref<HTMLElement | null>(null)
const width = ref(720)
const height = computed(() => (width.value < 600 ? 248 : 300))
let observer: ResizeObserver | null = null
onMounted(() => {
  if (!frame.value) return
  width.value = Math.round(frame.value.clientWidth) || 720
  observer = new ResizeObserver(entries => {
    const next = Math.round(entries[0]?.contentRect.width ?? 0)
    if (next) width.value = next
  })
  observer.observe(frame.value)
})
onBeforeUnmount(() => observer?.disconnect())

/** Los años del eje: los últimos 18 con avisos, estirados si la lente cae más atrás. */
const years = computed(() => {
  const all = props.columns.flatMap(column => column.variant.years.map(row => row.year))
  if (!all.length) return { min: 2010, max: 2025 }
  const max = Math.max(...all)
  const focus = props.points.map(point => point.row?.year).filter((v): v is number => !!v)
  const min = Math.min(Math.max(Math.min(...all), max - 17), ...focus)
  return { min, max: Math.max(max, min + 1) }
})

// Las filas que entran en el eje, aparte de las curvas: el dominio de precios sale de acá y las
// curvas necesitan ese dominio para dibujarse.
const visible = computed(() =>
  props.columns.map(column =>
    column.variant.years.filter(row => row.year >= years.value.min && row.year <= years.value.max)
  )
)

const series = computed(() =>
  props.columns.map((column, index) => {
    const points = visible.value[index] ?? []
    return {
      slug: column.slug,
      points,
      path: points.map(row => `${x(row.year)},${y(row.median)}`).join(' '),
      focus: props.points[index]?.row?.year ?? null,
    }
  })
)

const prices = computed(() => {
  const values = visible.value.flatMap(rows => rows.map(row => row.median))
  // Con la misma plata el eje baja hasta el cuarto más barato de los años a la vista: si no, el
  // asa no podía bajar del borde del gráfico aunque hubiera años más baratos.
  if (props.mode === 'plata') {
    values.push(...visible.value.flatMap(rows => rows.map(row => row.p25)))
    if (props.budget !== null) values.push(props.budget)
  }
  if (!values.length) return { min: 0, max: 10_000 }
  return { min: Math.min(...values), max: Math.max(...values) }
})

const STEPS = [500, 1_000, 2_000, 2_500, 5_000, 10_000, 20_000, 25_000, 50_000, 100_000]
const liveTicks = computed(() => {
  const span = Math.max(1, prices.value.max - prices.value.min)
  const step = STEPS.find(candidate => span / candidate <= 5) ?? 100_000
  const start = Math.floor((prices.value.min * 0.96) / step) * step
  const end = Math.ceil((prices.value.max * 1.03) / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + 1e-6; value += step) ticks.push(value)
  return ticks
})
// Mientras se arrastra, el eje queda quieto, marcas incluidas: el presupuesto es parte del dominio, y
// recalcularlo bajo el dedo movía la línea sola (un píxel de temblor saltaba de US$ 5.500 a 1.500).
const frozen = ref<number[] | null>(null)
const yTicks = computed(() => frozen.value ?? liveTicks.value)
const yDomain = computed(() => ({
  min: yTicks.value[0] ?? 0,
  max: yTicks.value[yTicks.value.length - 1] ?? 1,
}))

function x(year: number): number {
  const { min, max } = years.value
  const inner = width.value - PAD.left - PAD.right
  return PAD.left + ((year - min) / Math.max(1, max - min)) * inner
}
function y(price: number): number {
  const { min, max } = yDomain.value
  const inner = height.value - PAD.top - PAD.bottom
  return PAD.top + (1 - (price - min) / Math.max(1, max - min)) * inner
}
const band = computed(() =>
  Math.max(8, (width.value - PAD.left - PAD.right) / Math.max(1, years.value.max - years.value.min))
)

const xLabels = computed(() => {
  const { min, max } = years.value
  const span = max - min
  const room = (width.value - PAD.left - PAD.right) / Math.max(1, span)
  const every = room >= 40 ? 1 : room >= 20 ? 2 : 5
  const labels: number[] = []
  for (let year = min; year <= max; year++) if ((max - year) % every === 0) labels.push(year)
  return labels
})

const tickLabel = (value: number): string =>
  value >= 1_000 ? `US$ ${String(value / 1_000).replace('.', ',')} mil` : `US$ ${value}`

const lensYear = computed(() => (props.mode === 'anio' ? props.year : null))

// -- Puntero ---------------------------------------------------------------------------------------
const hoverYear = ref<number | null>(null)
let press: { x: number; y: number } | null = null

function local(event: PointerEvent): { px: number; py: number } {
  const box = frame.value!.getBoundingClientRect()
  return { px: event.clientX - box.left, py: event.clientY - box.top }
}
/** Los años que alguna columna tiene: tocar un hueco del eje no elige un año sin avisos. */
const known = computed(() => [
  ...new Set(props.columns.flatMap(column => column.variant.years.map(row => row.year))),
])
const yearAt = (px: number): number | null => {
  const { min, max } = years.value
  const inner = width.value - PAD.left - PAD.right
  const raw = min + ((px - PAD.left) / Math.max(1, inner)) * (max - min)
  const nearest = [...known.value].sort((a, b) => Math.abs(a - raw) - Math.abs(b - raw))[0]
  return nearest === undefined || Math.abs(nearest - raw) > 0.75 ? null : nearest
}
const priceAt = (py: number): number => {
  const { min, max } = yDomain.value
  const inner = height.value - PAD.top - PAD.bottom
  const raw = min + (1 - (py - PAD.top) / Math.max(1, inner)) * (max - min)
  const rounded = Math.round(raw / 500) * 500
  const floor = Math.max(props.range.min, min)
  const ceiling = Math.min(props.range.max, max)
  return Math.min(ceiling, Math.max(floor, rounded))
}

function onPress(event: PointerEvent) {
  press = { x: event.clientX, y: event.clientY }
}
function onRelease(event: PointerEvent) {
  if (!press) return
  const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y)
  press = null
  if (moved > 8) return
  const { px, py } = local(event)
  if (props.mode === 'plata') emit('budget', priceAt(py))
  else {
    const year = yearAt(px)
    if (year !== null) emit('year', year)
  }
}
function onHover(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  hoverYear.value = yearAt(local(event).px)
}

function startDrag(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture?.(event.pointerId)
  frozen.value = [...liveTicks.value]
  const move = (next: PointerEvent) => emit('budget', priceAt(local(next).py))
  const stop = () => {
    frozen.value = null
    target.removeEventListener('pointermove', move as EventListener)
    target.removeEventListener('pointerup', stop)
    target.removeEventListener('pointercancel', stop)
  }
  target.addEventListener('pointermove', move as EventListener)
  target.addEventListener('pointerup', stop)
  target.addEventListener('pointercancel', stop)
}

function onKey(event: KeyboardEvent) {
  if (props.budget === null) return
  const steps: Record<string, number> = {
    ArrowUp: 500,
    ArrowRight: 500,
    ArrowDown: -500,
    ArrowLeft: -500,
    PageUp: 2_500,
    PageDown: -2_500,
  }
  let next: number | null = null
  if (event.key in steps) next = props.budget + steps[event.key]!
  if (event.key === 'Home') next = props.range.min
  if (event.key === 'End') next = props.range.max
  if (next === null) return
  event.preventDefault()
  emit('budget', Math.min(props.range.max, Math.max(props.range.min, next)))
}

// -- Lectura ---------------------------------------------------------------------------------------
const readout = computed(() => {
  const shown = hoverYear.value ?? (props.mode === 'anio' ? props.year : null)
  if (shown !== null && (hoverYear.value !== null || props.mode === 'anio')) {
    return {
      title: `${shown}:`,
      items: props.columns.map((column, index) => {
        const row = column.variant.years.find(item => item.year === shown)
        return { index, text: row ? formatCarUsd(row.median) : 'sin avisos suficientes' }
      }),
    }
  }
  return {
    title: props.budget !== null ? `Con ${formatCarUsd(props.budget)}:` : '',
    items: props.points.map((point, index) => ({
      index,
      text: point.row ? `un ${point.row.year}` : 'no alcanza',
    })),
  }
})

const valueText = computed(
  () =>
    `${formatCarUsd(props.budget ?? 0)}: ${props.points
      .map((point, index) => `${props.names[index]} ${point.row ? point.row.year : 'no alcanza'}`)
      .join(', ')}`
)

const summary = computed(() =>
  `Precio pedido por año de ${props.names.join(', ')}. ${readout.value.title} ${readout.value.items
    .map(item => `${props.names[item.index]} ${item.text}`)
    .join(', ')}.`.trim()
)
</script>

<style scoped>
.compare-chart {
  margin: 0;
}
.compare-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-bottom: 8px;
  font-size: 0.875rem;
  font-weight: 600;
}
.compare-chart__key {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.compare-chart__variant {
  font-weight: 400;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.compare-chart__frame {
  position: relative;
  width: 100%;
  min-width: 0;
}
.compare-chart__svg {
  display: block;
  /* El servidor no sabe el ancho y dibuja 720 px: sin esto el HTML desbordaba el celular hasta hidratar. */
  max-width: 100%;
  overflow: visible;
  font-variant-numeric: tabular-nums;
}
.compare-chart__grid line {
  stroke: rgba(var(--v-border-color), var(--v-border-opacity));
  stroke-width: 1;
}
.compare-chart__grid text {
  fill: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
}
.compare-chart__band {
  fill: rgba(var(--v-theme-on-surface), 0.06);
}
.compare-chart__hover {
  stroke: rgba(var(--v-theme-on-surface), 0.24);
  stroke-dasharray: 2 3;
}
.compare-chart__line {
  fill: none;
  stroke: var(--compare-key);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.compare-key--0 {
  --compare-key: var(--compare-key-0);
}
.compare-key--1 {
  --compare-key: var(--compare-key-1);
}
.compare-key--2 {
  --compare-key: var(--compare-key-2);
}
.compare-chart__budget-line {
  stroke: rgb(var(--v-theme-on-surface));
  stroke-width: 1.5;
  stroke-dasharray: 6 4;
}
.compare-chart__budget-label {
  fill: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  font-weight: 700;
  paint-order: stroke;
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 4px;
  stroke-linejoin: round;
}
.compare-chart__hit {
  fill: transparent;
  cursor: crosshair;
}
.compare-chart__handle {
  position: absolute;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: ns-resize;
  /* Arrastrar el asa mueve el presupuesto, no la página. */
  touch-action: none;
}
.compare-chart__handle-dot {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: rgb(var(--v-theme-surface));
  background: rgb(var(--v-theme-on-surface));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: transform 150ms ease-out;
}
.compare-chart__handle:hover .compare-chart__handle-dot,
.compare-chart__handle:focus-visible .compare-chart__handle-dot {
  transform: scale(1.15);
}
.compare-chart__readout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 8px;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}
.compare-chart__reading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.compare-chart__value {
  font-weight: 700;
}
</style>
