<template>
  <g
    :transform="`translate(${x}, ${y})`"
    :class="['compare-mark', { 'compare-mark--strong': strong }]"
  >
    <circle v-if="strong" r="11" class="compare-mark__halo" />
    <circle v-if="slot === 0" :r="size" />
    <rect
      v-else-if="slot === 1"
      :x="-size * 0.9"
      :y="-size * 0.9"
      :width="size * 1.8"
      :height="size * 1.8"
      rx="1"
    />
    <path v-else :d="`M0 ${-size * 1.2} ${size * 1.2} 0 0 ${size * 1.2} ${-size * 1.2} 0Z`" />
  </g>
</template>

<script setup lang="ts">
// Un punto de una curva del gráfico, con la forma de la llave de su modelo. El fuerte es el que la
// lente eligió: el año comparado, o el que el presupuesto alcanza.
const props = defineProps<{ index: number; x: number; y: number; strong?: boolean }>()
const slot = computed(() => props.index % 3)
const size = computed(() => (props.strong ? 6 : 3.5))
</script>

<style scoped>
.compare-mark {
  fill: var(--compare-key);
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 1.5;
}
.compare-mark__halo {
  fill: none;
  stroke: var(--compare-key);
  stroke-width: 2;
  opacity: 0.45;
}
</style>
