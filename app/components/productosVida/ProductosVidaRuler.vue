<!--
  La regla de precios de /productos-que-te-cambian-la-vida-uruguay: UNA escala logarítmica para toda
  la página (`productosVidaRulerDomain`), así que bajando de los tuppers al lavavajillas se ve el
  salto sin leer un número. Del p25 al p75 la banda, la mediana como una marca y, con presupuesto,
  la línea del presupuesto.

  Todo sale del servidor como porcentajes en variables CSS: la barra ya está en su lugar en el HTML
  y la caja tiene alto fijo, así que nada se mueve al hidratar. Es `aria-hidden`: el texto de arriba
  dice cada valor que la regla dibuja.
-->
<template>
  <div class="vida-ruler" aria-hidden="true" :style="vars">
    <div class="vida-ruler__track">
      <span
        v-for="tick in domain.ticks"
        :key="tick.value"
        class="vida-ruler__tick"
        :style="{ left: `${tick.pct}%` }"
      />
      <span class="vida-ruler__band" />
      <span class="vida-ruler__mid" />
      <span v-if="positions.cap !== null" class="vida-ruler__cap" />
    </div>
    <span
      v-for="(tick, index) in labelled"
      :key="tick.value"
      class="vida-ruler__label"
      :class="{
        'vida-ruler__label--first': index === 0 && tick.pct === 0,
        'vida-ruler__label--last': tick.pct === 100,
      }"
      :style="{ left: `${tick.pct}%` }"
    >
      {{ tick.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import {
  productosVidaRulerPositions,
  type ProductosVidaBand,
  type ProductosVidaRulerDomain,
} from '~/utils/productosVida'

const props = defineProps<{
  band: ProductosVidaBand
  domain: ProductosVidaRulerDomain
  hasta: number | null
}>()

const positions = computed(() => productosVidaRulerPositions(props.band, props.domain, props.hasta))
const labelled = computed(() => props.domain.ticks.filter(tick => tick.label !== null))
const vars = computed(() => ({
  '--from': `${positions.value.from}%`,
  '--to': `${positions.value.to}%`,
  '--mid': `${positions.value.mid}%`,
  '--cap': `${positions.value.cap ?? 0}%`,
}))
</script>

<style scoped>
/* Alto fijo (32 = 18 de barra con sus marcas + 14 de rótulos): la caja existe entera en el HTML del
   servidor y no empuja nada al hidratar. */
.vida-ruler {
  position: relative;
  height: 32px;
}
.vida-ruler__track {
  position: absolute;
  inset: 4px 0 auto;
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}
.vida-ruler__tick {
  position: absolute;
  top: 0;
  width: 1px;
  height: 8px;
  background: rgba(var(--v-theme-on-surface), 0.3);
  transform: translateX(-0.5px);
}
.vida-ruler__band {
  position: absolute;
  top: 0;
  left: var(--from);
  width: max(4px, calc(var(--to) - var(--from)));
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.45);
}
/* La mediana: 2 × 14 px centrada sobre la barra (−3 px arriba y abajo). */
.vida-ruler__mid {
  position: absolute;
  top: -3px;
  left: var(--mid);
  width: 2px;
  height: 14px;
  background: rgb(var(--v-theme-on-surface));
  transform: translateX(-1px);
}
/* El presupuesto: ámbar de relleno, nunca de texto. 2 × 20 px centrada sobre la barra. */
.vida-ruler__cap {
  position: absolute;
  top: -6px;
  left: var(--cap);
  width: 2px;
  height: 20px;
  background: rgb(var(--v-theme-secondary));
  transform: translateX(-1px);
}
.vida-ruler__label {
  position: absolute;
  top: 18px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 14px;
  white-space: nowrap;
  transform: translateX(-50%);
}
.vida-ruler__label--first {
  transform: none;
}
.vida-ruler__label--last {
  transform: translateX(-100%);
}
</style>
