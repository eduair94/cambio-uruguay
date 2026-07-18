<template>
  <VChart
    class="ranking-echart"
    :option="option"
    :theme="null"
    autoresize
    role="img"
    aria-label="Ranking de temas por consultas de los últimos 90 días"
    @click="onClick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent])

export interface RankPoint {
  id: string
  label: string
  recent: number
  color: string
}

const props = withDefaults(defineProps<{ points: RankPoint[]; dark?: boolean }>(), { dark: true })
const emit = defineEmits<{ (e: 'select', id: string): void }>()

const ink = computed(() => (props.dark ? '#c2cee4' : '#334562'))
const faint = computed(() => (props.dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,40,80,0.12)'))
const tipBg = computed(() => (props.dark ? '#18243c' : '#ffffff'))
const tipBorder = computed(() => (props.dark ? '#263349' : '#d3ddec'))

// ECharts category axis draws bottom→top; reverse so the highest-demand topic sits on top.
const ordered = computed(() => [...props.points].reverse())

const option = computed(() => ({
  animationDuration: 500,
  grid: { left: 8, right: 44, top: 6, bottom: 6, containLabel: true },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: tipBg.value,
    borderColor: tipBorder.value,
    textStyle: { color: ink.value, fontSize: 12 },
    formatter: (ps: any) => {
      const p = Array.isArray(ps) ? ps[0] : ps
      return `<b>${p.name}</b><br/>Consultas 90 días: ${p.value}`
    },
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: ink.value, fontSize: 10 },
    axisLine: { show: false },
    splitLine: { lineStyle: { color: faint.value, type: 'dashed' } },
  },
  yAxis: {
    type: 'category',
    data: ordered.value.map(d => d.label),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: faint.value } },
    axisLabel: { color: ink.value, fontSize: 11 },
  },
  series: [
    {
      type: 'bar',
      barWidth: '62%',
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: {
        show: true,
        position: 'right',
        color: ink.value,
        fontSize: 10,
        formatter: '{c}',
      },
      data: ordered.value.map(d => ({ value: d.recent, id: d.id, itemStyle: { color: d.color } })),
    },
  ],
}))

function onClick(p: any) {
  const id = p?.data?.id
  if (id) emit('select', id)
}
</script>

<style scoped>
.ranking-echart {
  width: 100%;
  height: 460px;
}
</style>
