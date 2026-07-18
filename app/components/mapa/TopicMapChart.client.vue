<template>
  <VChart
    class="topic-echart"
    :option="option"
    :theme="null"
    autoresize
    role="img"
    aria-label="Mapa de temas consultados: volumen y momentum"
    @click="onClick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart, TreemapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'

// Client-only component (.client.vue) → these run only in the browser, never during SSR.
use([CanvasRenderer, ScatterChart, TreemapChart, GridComponent, TooltipComponent])

export interface MapPoint {
  id: string
  label: string
  total: number
  recent: number
  /** 0 (cooling) → 1 (surging). */
  mo: number
  color: string
}

const props = withDefaults(
  defineProps<{
    points: MapPoint[]
    mode?: 'scatter' | 'treemap'
    dark?: boolean
    selectedId?: string | null
  }>(),
  { mode: 'scatter', dark: true, selectedId: null }
)

const emit = defineEmits<{ (e: 'select', id: string): void }>()

const ink = computed(() => (props.dark ? '#c2cee4' : '#334562'))
const faint = computed(() => (props.dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,40,80,0.12)'))
const tipBg = computed(() => (props.dark ? '#18243c' : '#ffffff'))
const tipBorder = computed(() => (props.dark ? '#263349' : '#d3ddec'))

const symbolSize = (recent: number) => Math.max(20, 12 + Math.sqrt(Math.max(0, recent)) * 3.4)

function scatterOption() {
  return {
    animationDuration: 500,
    grid: { left: 8, right: 22, top: 30, bottom: 44, containLabel: true },
    tooltip: {
      trigger: 'item',
      backgroundColor: tipBg.value,
      borderColor: tipBorder.value,
      textStyle: { color: ink.value, fontSize: 12 },
      formatter: (p: any) => {
        const d = p.data || {}
        return `<b>${d.name}</b><br/>Volumen total: ${d.total}<br/>Últimos 90 días: ${d.recent}<br/>Momentum: ${Math.round((d.mo ?? 0) * 100)} / 100`
      },
    },
    xAxis: {
      type: 'value',
      name: 'Volumen de consultas',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { color: ink.value, fontSize: 11 },
      axisLabel: { color: ink.value, fontSize: 10 },
      axisLine: { lineStyle: { color: faint.value } },
      splitLine: { lineStyle: { color: faint.value, type: 'dashed' } },
    },
    yAxis: {
      type: 'value',
      name: 'Momentum 90d',
      nameTextStyle: { color: ink.value, fontSize: 11, align: 'left' },
      min: 0,
      max: 100,
      axisLabel: { color: ink.value, fontSize: 10, formatter: '{value}' },
      axisLine: { lineStyle: { color: faint.value } },
      splitLine: { lineStyle: { color: faint.value, type: 'dashed' } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (_: any, p: any) => symbolSize(p.data.recent),
        emphasis: { scale: 1.15, focus: 'self' },
        labelLayout: { hideOverlap: true },
        label: {
          show: true,
          position: 'top',
          color: ink.value,
          fontSize: 10,
          formatter: (p: any) => p.data.name,
        },
        data: props.points.map(d => ({
          value: [d.total, Math.round(d.mo * 100)],
          id: d.id,
          name: d.label,
          total: d.total,
          recent: d.recent,
          mo: d.mo,
          itemStyle: {
            color: d.color,
            opacity: props.selectedId && props.selectedId !== d.id ? 0.35 : 0.92,
            borderColor: props.selectedId === d.id ? ink.value : 'transparent',
            borderWidth: props.selectedId === d.id ? 2.5 : 0,
          },
        })),
      },
    ],
  }
}

function treemapOption() {
  return {
    animationDuration: 500,
    tooltip: {
      backgroundColor: tipBg.value,
      borderColor: tipBorder.value,
      textStyle: { color: ink.value, fontSize: 12 },
      formatter: (p: any) => `<b>${p.name}</b><br/>Volumen total: ${p.value}`,
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        width: '100%',
        height: '100%',
        itemStyle: { borderColor: props.dark ? '#0a1020' : '#eef2f8', borderWidth: 2, gapWidth: 2 },
        label: {
          show: true,
          formatter: '{b}',
          color: '#0a1020',
          fontSize: 12,
          fontWeight: 600,
          overflow: 'break',
        },
        data: props.points.map(d => ({
          name: d.label,
          value: d.total,
          id: d.id,
          itemStyle: {
            color: d.color,
            opacity: props.selectedId && props.selectedId !== d.id ? 0.4 : 1,
          },
        })),
      },
    ],
  }
}

const option = computed(() => (props.mode === 'treemap' ? treemapOption() : scatterOption()))

function onClick(p: any) {
  const id = p?.data?.id
  if (id) emit('select', id)
}
</script>

<style scoped>
.topic-echart {
  width: 100%;
  height: 440px;
}
@media (max-width: 600px) {
  .topic-echart {
    height: 360px;
  }
}
</style>
