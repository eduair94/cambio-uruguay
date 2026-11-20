<template>
  <svg
    class="compare-key"
    :class="`compare-key--${slot}`"
    :width="size"
    :height="size"
    viewBox="0 0 12 12"
    aria-hidden="true"
    focusable="false"
  >
    <circle v-if="slot === 0" cx="6" cy="6" r="5" />
    <rect v-else-if="slot === 1" x="1.5" y="1.5" width="9" height="9" rx="1" />
    <path v-else d="M6 0.6 11.4 6 6 11.4 0.6 6Z" />
  </svg>
</template>

<script setup lang="ts">
// La llave de cada modelo del comparador: el mismo color Y la misma forma en el encabezado, el
// gráfico y la tabla, para que la columna se reconozca sin depender del color.
const props = withDefaults(defineProps<{ index: number; size?: number }>(), { size: 12 })
const slot = computed(() => props.index % 3)
</script>

<style scoped>
.compare-key {
  flex: none;
  fill: var(--compare-key);
}
.compare-key--0 {
  --compare-key: var(--compare-key-0);
}
.compare-key--1 {
  --compare-key: var(--compare-key-1);
}
.compare-key--2 {
  --compare-key: var(--compare-key-2);
}
</style>
