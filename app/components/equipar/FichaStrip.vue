<!--
  La franja de ficha técnica de una heladera, un lavarropas, un televisor o un aire: lo principal en
  negrita (litros, kilos, pulgadas, BTU) y lo que sigue en una segunda línea. Es lo que DECLARA el
  vendedor: cuando sólo salió del título, la franja lo dice. Ver utils/equiparFicha.ts.
-->
<template>
  <div v-if="strip.main.length || strip.extra.length" class="eq-strip">
    <p v-if="strip.main.length" class="eq-strip__main">{{ strip.main.join(' · ') }}</p>
    <p v-if="strip.extra.length" class="eq-strip__extra">{{ strip.extra.join(' · ') }}</p>
    <p v-if="!ficha.fromFicha" class="eq-strip__source">Según el título del aviso</p>
  </div>
</template>

<script setup lang="ts">
import { equiparFichaStrip, type EquiparFichaPublic } from '~/utils/equiparFicha'

const props = defineProps<{ ficha: EquiparFichaPublic; categoria: string }>()
const strip = computed(() => equiparFichaStrip(props.ficha, props.categoria))
</script>

<style scoped>
.eq-strip {
  margin-top: 6px;
}
.eq-strip__main {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.eq-strip__extra,
.eq-strip__source {
  margin: 4px 0 0;
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.8;
}
.eq-strip__source {
  font-style: italic;
}
</style>
