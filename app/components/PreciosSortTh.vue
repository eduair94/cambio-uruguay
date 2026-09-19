<template>
  <th scope="col" :class="{ 'text-right': align === 'right' }" :aria-sort="ariaSort">
    <button
      type="button"
      class="precios-sort-btn"
      :class="{ 'is-active': active }"
      :title="title"
      @click="emit('sort', sortKey)"
    >
      <span>{{ label }}</span>
      <VIcon :icon="icon" size="14" aria-hidden="true" class="precios-sort-icon" />
    </button>
  </th>
</template>

<script setup lang="ts">
// Encabezado ordenable de las tablas de precios de supermercado.
//
// Un <button> adentro del <th> y no un @click en el <th>: así se llega con el
// teclado y el lector de pantalla anuncia el orden por `aria-sort`, que va en el
// <th> y no en el botón, porque es la columna la que está ordenada.
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    sortKey: string
    current: string
    dir: 'asc' | 'desc'
    align?: 'left' | 'right'
  }>(),
  { align: 'left' }
)

const emit = defineEmits<{ sort: [key: string] }>()

const active = computed(() => props.current === props.sortKey)

const ariaSort = computed(() =>
  active.value ? (props.dir === 'asc' ? 'ascending' : 'descending') : 'none'
)

const icon = computed(() => {
  if (!active.value) return 'mdi-swap-vertical'
  return props.dir === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'
})

const title = computed(() =>
  active.value
    ? `Ordenado por ${props.label.toLowerCase()}, ${props.dir === 'asc' ? 'de menor a mayor' : 'de mayor a menor'}. Tocá para invertir.`
    : `Ordenar por ${props.label.toLowerCase()}`
)
</script>

<style scoped>
.precios-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-weight: 600;
  color: inherit;
  background: none;
  border: 0;
  padding: 2px 0;
  cursor: pointer;
  white-space: nowrap;
}
.precios-sort-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-radius: 4px;
}
.precios-sort-icon {
  opacity: 0.45;
}
.precios-sort-btn.is-active .precios-sort-icon,
.precios-sort-btn:hover .precios-sort-icon {
  opacity: 1;
}
</style>
