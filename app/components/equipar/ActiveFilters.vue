<template>
  <!-- Un div, nunca un <p>: VChip renderiza un <div> adentro y eso rompe la hidratación
       de la página entera en silencio (app/tests/unit/noChipInsideParagraph.test.ts). -->
  <div
    v-if="chips.length"
    class="eq-active"
    aria-label="Filtros activos"
    data-testid="equipar-active-filters"
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
    <VBtn variant="text" size="small" data-testid="equipar-active-clear" @click="emit('clear')">
      Limpiar
    </VBtn>
  </div>
</template>

<script setup lang="ts">
import type { EquiparFilterChip } from '~/utils/equiparProductos'

defineProps<{ chips: EquiparFilterChip[] }>()
const emit = defineEmits<{ remove: [keys: EquiparFilterChip['keys']]; clear: [] }>()
</script>

<style scoped>
/* Mismas medidas que components/cars/ActiveFilters.vue, incluido el área táctil de 24 px de la cruz. */
.eq-active :deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
.eq-active {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  min-width: 0;
}
.eq-active :deep(.v-chip) {
  max-width: 100%;
}
.eq-active :deep(.v-chip__close) {
  position: relative;
}
.eq-active :deep(.v-chip__close)::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
}
</style>
