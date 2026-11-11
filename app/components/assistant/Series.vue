<template>
  <section v-if="geometry" class="series" :aria-label="`Historia de ${block.title}`">
    <header class="series-head">
      <VIcon icon="mdi-chart-line" size="20" class="series-icon" />
      <h3 class="series-title">{{ block.title }}</h3>
      <VSpacer />
      <a
        v-if="block.moreUrl"
        :href="block.moreUrl"
        target="_blank"
        rel="noopener"
        class="more"
        data-link-area="assistant_cards"
      >
        Histórico
        <VIcon icon="mdi-arrow-top-right" size="16" />
      </a>
    </header>

    <div class="legend">
      <span v-if="geometry.sell" class="key sell">
        <span class="swatch" />
        Venta <strong>$ {{ rate(geometry.sell.last) }}</strong>
        <span class="change">{{ changeLabel(geometry.sell.first, geometry.sell.last) }}</span>
      </span>
      <span v-if="geometry.buy" class="key buy">
        <span class="swatch" />
        Compra <strong>$ {{ rate(geometry.buy.last) }}</strong>
        <span class="change">{{ changeLabel(geometry.buy.first, geometry.buy.last) }}</span>
      </span>
    </div>

    <svg
      class="chart"
      :viewBox="`0 0 ${geometry.width} ${geometry.height}`"
      preserveAspectRatio="none"
      role="img"
      :aria-label="summary"
    >
      <path v-if="geometry.band" class="area" :d="geometry.band" />
      <path v-else-if="geometry.sell" class="area" :d="geometry.sell.area" />
      <path v-if="geometry.buy" class="line buy" :d="geometry.buy.line" />
      <path v-if="geometry.sell" class="line sell" :d="geometry.sell.line" />
    </svg>
    <div class="axis">
      <span class="axis-end">{{ day(geometry.firstDate) }}</span>
      <span v-if="geometry.band">sombreado: la diferencia entre compra y venta</span>
      <span v-else-if="geometry.sell">
        venta entre $ {{ rate(geometry.sell.min) }} y $ {{ rate(geometry.sell.max) }}
      </span>
      <span class="axis-end">{{ day(geometry.lastDate) }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { changeLabel, seriesGeometry } from '~/utils/chatCharts'
import { rate, type SeriesBlock } from '~/utils/chatResults'

const props = defineProps<{ block: SeriesBlock }>()

const geometry = computed(() => seriesGeometry(props.block.points, 320, 96))

const day = (iso: string) => {
  const time = Date.parse(iso)
  return Number.isFinite(time)
    ? new Date(time).toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'short',
        timeZone: 'America/Montevideo',
      })
    : ''
}

const summary = computed(() => {
  const g = geometry.value
  if (!g?.sell) return `Historia de ${props.block.title}`
  return (
    `${props.block.title}: la venta pasó de $ ${rate(g.sell.first)} el ${day(g.firstDate)} ` +
    `a $ ${rate(g.sell.last)} el ${day(g.lastDate)}, entre $ ${rate(g.sell.min)} y $ ${rate(g.sell.max)}.`
  )
})
</script>

<style scoped>
.series {
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.series-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.series-icon {
  color: rgb(var(--v-theme-link));
}
.series-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 8px 0;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.key {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.swatch {
  width: 16px;
  height: 3px;
  border-radius: 999px;
}
.key.sell .swatch {
  background: rgb(var(--v-theme-primary));
}
.key.buy .swatch {
  background: rgb(var(--v-theme-info));
}
.change {
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.chart {
  display: block;
  width: 100%;
  height: 96px;
  overflow: visible;
}
.line {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.line.sell {
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2.5;
}
.line.buy {
  stroke: rgb(var(--v-theme-info));
  stroke-width: 2;
}
.area {
  fill: rgba(var(--v-theme-primary), 0.08);
}
.axis {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-variant-numeric: tabular-nums;
}
.axis > :not(.axis-end) {
  text-align: center;
}
.axis-end {
  white-space: nowrap;
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 4px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}
.more:hover {
  text-decoration: underline;
}
</style>
