<script setup lang="ts">
/**
 * StatTile — etiqueta, número y nota al pie, con el ritmo de DESIGN.md ya resuelto.
 *
 * POR QUÉ EXISTE: el trío "label / value / note" ya venía repetido a mano en más de una docena de
 * páginas, y cada copia elegía sus propios tamaños. DESIGN.md fija los pasos ("The Four Steps
 * Rule" y "The Stat Step"): label 0.75rem/700, stat 1.5rem/700 con cifras tabulares, meta 0.8rem.
 * Reescribirlos a mano es justamente cómo aparece el quinto paso que la regla prohíbe.
 *
 * Lo otro que resuelve: las tres líneas se separan con `gap` en un grid, no con márgenes de
 * `<div>`, así que no hay nada que colapsar ni que el navegador pueda decidir por nosotros. Y el
 * `min-width: 0` evita que un importe largo ensanche la fila (DESIGN.md, "The Min-Width Zero
 * Rule").
 */
withDefaults(
  defineProps<{
    label: string
    value: string
    note?: string
    /** Alinea la cifra a la derecha cuando la teja vive en una columna numérica. */
    align?: 'start' | 'end'
  }>(),
  { note: undefined, align: 'start' }
)
</script>

<template>
  <div class="stat-tile" :class="`stat-tile--${align}`">
    <div class="stat-tile__label">{{ label }}</div>
    <div class="stat-tile__value">
      <slot name="value">{{ value }}</slot>
    </div>
    <div v-if="note || $slots.note" class="stat-tile__note">
      <slot name="note">{{ note }}</slot>
    </div>
  </div>
</template>

<style scoped>
.stat-tile {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.stat-tile--end {
  justify-items: end;
  text-align: right;
}

.stat-tile__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  line-height: 1.4;
  opacity: 0.7;
}
.stat-tile__value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  /* Un importe largo se achica antes de romper la grilla. */
  overflow-wrap: anywhere;
}
.stat-tile__note {
  font-size: 0.8rem;
  line-height: 1.35;
  opacity: 0.7;
}
</style>
