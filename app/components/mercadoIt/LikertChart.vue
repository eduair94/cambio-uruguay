<template>
  <div class="likert" :style="{ height: `${rows.length * 44 + 56}px` }">
    <ClientOnly>
      <BarChart :key="dark ? 'd' : 'l'" :chart-data="chartData" :options="options" />
      <template #fallback>
        <VSkeletonLoader type="image" height="100%" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
// Explícito: components/charts/ no se auto-importa plano (el nombre sería `ChartsBarChart`), así
// que <BarChart> quedaría como elemento desconocido, en silencio.
import BarChart from '~/components/charts/BarChart.vue'
import { STANCE_META } from '~/utils/charruadevs'

interface LikertRow {
  label: string
  dist: Record<string, number | null>
  n: number | null
}

const props = defineProps<{ rows: LikertRow[] }>()

const theme = useTheme()
const dark = computed(() => theme.current.value.dark)
const axis = computed(() => (dark.value ? '#b8c1cc' : '#536170'))
const grid = computed(() => (dark.value ? 'rgba(255,255,255,0.08)' : 'rgba(20,45,70,0.10)'))

const meta = (v: number) => STANCE_META.find(s => s.value === v)!
function share(r: LikertRow, k: string): number {
  const n = r.n || 0
  return n ? ((r.dist[k] ?? 0) / n) * 100 : 0
}

// Diverging: lo negativo a la izquierda del cero, lo positivo a la derecha y lo neutral partido al
// medio. Chart.js apila los valores negativos hacia afuera en el orden de los datasets, así que el
// orden de abajo (neutral, −1, −2 | neutral, +1, +2) es el que dibuja la escala de adentro hacia afuera.
const chartData = computed(() => {
  const ds = (label: string, color: string, data: number[]) => ({
    label,
    data,
    backgroundColor: color,
    borderColor: dark.value ? '#0a0e1a' : '#ffffff',
    borderWidth: 1,
    borderSkipped: false,
    barThickness: 24,
  })
  const neutral = meta(0)
  return {
    labels: props.rows.map(r => r.label),
    datasets: [
      ds(
        neutral.label,
        neutral.color,
        props.rows.map(r => -share(r, '0') / 2)
      ),
      ds(
        meta(-1).label,
        meta(-1).color,
        props.rows.map(r => -share(r, '-1'))
      ),
      ds(
        meta(-2).label,
        meta(-2).color,
        props.rows.map(r => -share(r, '-2'))
      ),
      ds(
        `${neutral.label} `,
        neutral.color,
        props.rows.map(r => share(r, '0') / 2)
      ),
      ds(
        meta(1).label,
        meta(1).color,
        props.rows.map(r => share(r, '1'))
      ),
      ds(
        meta(2).label,
        meta(2).color,
        props.rows.map(r => share(r, '2'))
      ),
    ],
  }
})

const limit = computed(() => {
  const ext = Math.max(
    10,
    ...props.rows.map(r =>
      Math.max(
        share(r, '-2') + share(r, '-1') + share(r, '0') / 2,
        share(r, '2') + share(r, '1') + share(r, '0') / 2
      )
    )
  )
  return Math.ceil(ext / 10) * 10
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  animation: false as const,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
          const name = (ctx.dataset.label || '').trim()
          const v = Math.abs(Number(ctx.raw)) * (name === meta(0).label ? 2 : 1)
          return `${name}: ${Math.round(v)} %`
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      min: -limit.value,
      max: limit.value,
      ticks: { color: axis.value, callback: (v: number | string) => `${Math.abs(Number(v))} %` },
      grid: { color: grid.value },
    },
    y: {
      stacked: true,
      ticks: { color: axis.value, font: { weight: 'bold' as const } },
      grid: { display: false },
    },
  },
}))
</script>

<style scoped>
.likert {
  position: relative;
  width: 100%;
}
</style>
