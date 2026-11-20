<!--
  La regla de precios de /productos-que-te-cambian-la-vida-uruguay: UNA escala logarítmica para toda
  la página (`productosVidaRulerDomain`), así que bajando de los tuppers al lavavajillas se ve el
  salto sin leer un número. Del p25 al p75 la banda, la mediana como una marca y, con presupuesto,
  la línea del presupuesto.

  Es sólo la pista: los rótulos de la escala ($ 100 … $ 1.000.000) los dibuja UNA vez por panel
  `ProductosVidaAxis`, debajo de todas las variantes. Repetirlos bajo cada variante era un eje
  entero por fila para decir siempre lo mismo.

  Todo sale del servidor como porcentajes en variables CSS: la barra ya está en su lugar en el HTML
  y la caja tiene alto fijo, así que nada se mueve al hidratar. Es `aria-hidden`: el texto de al lado
  dice cada valor que la regla dibuja.
-->
<template>
  <div class="vida-ruler" aria-hidden="true" :style="vars">
    <span class="vida-ruler__track" />
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
const vars = computed(() => ({
  '--from': `${positions.value.from}%`,
  '--to': `${positions.value.to}%`,
  '--mid': `${positions.value.mid}%`,
  '--cap': `${positions.value.cap ?? 0}%`,
}))
</script>

<style scoped>
/* Alto fijo de 16 px y todo centrado en su mitad (8 px): una pista fina de 4, la banda de 8, la
   mediana de 16 y el presupuesto de 24, que sobresale 4 px arriba y abajo sin empujar nada. */
.vida-ruler {
  position: relative;
  height: 16px;
}
.vida-ruler > span {
  position: absolute;
  top: 50%;
}
.vida-ruler__track {
  inset-inline: 0;
  height: 4px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.12);
  transform: translateY(-50%);
}
/* Una marca por potencia de diez, las mismas en todas las filas: con el eje debajo, se leen como
   una grilla. */
.vida-ruler__tick {
  width: 1px;
  height: 8px;
  background: rgba(var(--v-theme-on-surface), 0.32);
  transform: translate(-0.5px, -50%);
}
/* La mitad central de los avisos. El azul de enlace del tema y no el primario: es el que mide ≥ 3:1
   contra la superficie en los dos temas. */
.vida-ruler__band {
  left: var(--from);
  width: max(6px, calc(var(--to) - var(--from)));
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-link), 0.72);
  transform: translateY(-50%);
}
.vida-ruler__mid {
  left: var(--mid);
  width: 2px;
  height: 16px;
  background: rgb(var(--v-theme-on-surface));
  transform: translate(-1px, -50%);
}
/* El presupuesto: ámbar de relleno, nunca de texto. */
.vida-ruler__cap {
  left: var(--cap);
  width: 2px;
  height: 24px;
  background: rgb(var(--v-theme-secondary));
  transform: translate(-1px, -50%);
}
</style>
