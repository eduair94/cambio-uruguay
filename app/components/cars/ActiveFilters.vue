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
  gap: 6px;
  margin: 10px 0 4px;
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
.car-active :deep(.v-chip__close)::after {
  content: '';
  position: absolute;
  /* El icono mide 18 px; 13 px por lado lo llevan a los 44 del objetivo tactil. */
  inset: -13px;
}
</style>
