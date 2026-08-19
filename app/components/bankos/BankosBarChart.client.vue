<template>
  <VChart
    class="bankos-echart"
    :option="option"
    :theme="null"
    autoresize
    role="img"
    :aria-label="ariaLabel"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'

// Client-only component (.client.vue) → ECharts never runs during SSR.
use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent])

export interface BarRow {
  label: string
  value: number
  color: string
  /** Optional second value for a stacked/grouped comparison. */
  value2?: number
}

const props = withDefaults(
  defineProps<{
    rows: BarRow[]
    ariaLabel: string
    seriesName?: string
    series2Name?: string
    dark?: boolean
    /** Suffix appended in the tooltip (e.g. "marcas"). */
    unit?: string
  }>(),
  { seriesName: '', series2Name: '', dark: true, unit: '' }
)

const axisColor = computed(() => (props.dark ? '#9aa4b2' : '#5b6472'))
const splitColor = computed(() => (props.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'))

const option = computed(() => {
  // Horizontal bars: ECharts draws the first category at the bottom, so reverse for
  // "biggest first" reading order.
  const rows = [...props.rows].reverse()
  const grouped = rows.some(r => typeof r.value2 === 'number')
  return {
    grid: { left: 4, right: 16, top: grouped ? 30 : 8, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v: number) => `${v}${props.unit ? ' ' + props.unit : ''}`,
    },
    legend: grouped
      ? {
          show: true,
          top: 0,
          textStyle: { color: axisColor.value },
          data: [props.seriesName, props.series2Name],
        }
      : { show: false },
    xAxis: {
      type: 'value',
      axisLabel: { color: axisColor.value },
      splitLine: { lineStyle: { color: splitColor.value } },
    },
    yAxis: {
      type: 'category',
      data: rows.map(r => r.label),
      axisLabel: { color: axisColor.value },
      axisLine: { lineStyle: { color: splitColor.value } },
      axisTick: { show: false },
    },
    series: grouped
      ? [
          {
            name: props.seriesName,
            type: 'bar',
            data: rows.map(r => ({
              value: r.value,
              itemStyle: { color: r.color, borderRadius: [0, 3, 3, 0] },
            })),
          },
          {
            name: props.series2Name,
            type: 'bar',
            data: rows.map(r => ({
              value: r.value2 ?? 0,
              itemStyle: { color: r.color, opacity: 0.45, borderRadius: [0, 3, 3, 0] },
            })),
          },
        ]
      : [
          {
            name: props.seriesName || 'Total',
            type: 'bar',
            data: rows.map(r => ({
              value: r.value,
              itemStyle: { color: r.color, borderRadius: [0, 3, 3, 0] },
            })),
            label: { show: true, position: 'right', color: axisColor.value },
          },
        ],
  }
})
</script>

<style scoped>
.bankos-echart {
  width: 100%;
  height: 100%;
  min-height: 260px;
}
</style>
