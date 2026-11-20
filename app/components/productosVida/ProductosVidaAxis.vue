<!--
  Los rótulos de la escala de /productos-que-te-cambian-la-vida-uruguay, UNA vez por panel, debajo
  de las reglas de todas sus variantes (`ProductosVidaRuler`, que sólo dibuja la pista). Las marcas
  de la pista y estos rótulos salen del mismo `domain`, así que caen en la misma vertical.

  `aria-hidden` como la regla: los montos de cada variante ya están escritos al lado.
-->
<template>
  <div class="vida-axis" aria-hidden="true">
    <span
      v-for="(tick, index) in labelled"
      :key="tick.value"
      class="vida-axis__label"
      :class="{
        'vida-axis__label--first': index === 0 && tick.pct === 0,
        'vida-axis__label--last': tick.pct === 100,
      }"
      :style="{ left: `${tick.pct}%` }"
    >
      {{ tick.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { ProductosVidaRulerDomain } from '~/utils/productosVida'

const props = defineProps<{ domain: ProductosVidaRulerDomain }>()

const labelled = computed(() => props.domain.ticks.filter(tick => tick.label !== null))
</script>

<style scoped>
/* Alto fijo (16 = el renglón de 0,75rem): la caja existe entera en el HTML del servidor. */
.vida-axis {
  position: relative;
  height: 16px;
}
.vida-axis__label {
  position: absolute;
  top: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
  white-space: nowrap;
  transform: translateX(-50%);
}
.vida-axis__label--first {
  transform: none;
}
.vida-axis__label--last {
  transform: translateX(-100%);
}
</style>
