<template>
  <!-- Un div, nunca un <p>: VChip renderiza un <div> adentro y eso rompe la hidratación
       de la página entera en silencio (app/tests/unit/noChipInsideParagraph.test.ts). -->
  <div
    v-if="chips.length"
    class="car-active"
    aria-label="Filtros activos"
    data-testid="car-active-filters"
  >
    <VChip
      v-for="chip in chips"
      :key="chip.key"
      closable
      size="small"
      variant="tonal"
      color="primary"
      :close-label="`Quitar ${chip.label}`"
      @click:close="emit('remove', chip.keys)"
      >{{ chip.label }}</VChip
    >
    <VBtn variant="text" size="small" data-testid="car-active-clear" @click="emit('clear')">
      Limpiar
    </VBtn>
  </div>
</template>

<script setup lang="ts">
import type { CarFilterChip } from '~/utils/cars'

defineProps<{ chips: CarFilterChip[] }>()
const emit = defineEmits<{ remove: [keys: CarFilterChip['keys']]; clear: [] }>()
</script>

<style scoped>
.car-active :deep(.v-btn) {
  /* Sin versales, como el resto de la barra. */
  text-transform: none;
  letter-spacing: 0;
}
.car-active {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  /* Arranca a la misma altura que el primer campo de la columna de filtros (sin margen
     arriba) y deja un escalon de 12 px antes del encabezado del listado. */
  margin: 0 0 12px;
  min-width: 0;
}
.car-active :deep(.v-chip) {
  max-width: 100%;
}
/* El área de la cruz llega a 44 px sin agrandar el chip: el ícono conserva su tamaño
   y el pseudo-elemento estira sólo la zona que responde al dedo. */
.car-active :deep(.v-chip__close) {
  position: relative;
}
/*
 * 24 x 24 centrados sobre el icono de 18: el minimo de WCAG 2.2 (AA) para un objetivo
 * tactil. NO 44, aunque sea la cifra que se cita de memoria: una cruz de 18 px adentro de
 * un chip de 28 px no puede crecer a 44 sin meterse ADENTRO del chip de al lado, y ahi el
 * area de uno le roba los toques al otro. Medido con `elementFromPoint` a 20 px del centro:
 * con 44 respondia de un solo lado, porque el chip vecino se pinta encima igual. Con 24
 * entra entera adentro del chip y los 8 px de separacion entre chips quedan libres, que es
 * justamente lo que la norma pide cuando los objetivos son chicos.
 */
.car-active :deep(.v-chip__close)::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
}
</style>
