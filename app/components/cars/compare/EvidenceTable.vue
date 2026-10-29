<template>
  <table class="evidence" role="table" :style="{ '--evidence-cols': columns.length }">
    <caption class="d-sr-only">
      Comparación de
      {{
        names.join(', ')
      }}: cada fila es un dato y cada columna un modelo; la marca "mejor" señala al que gana con
      diferencia clara.
    </caption>
    <thead class="evidence__head">
      <tr role="row">
        <th class="evidence__corner" scope="col" role="columnheader">
          <span class="d-sr-only">Dato</span>
        </th>
        <th
          v-for="(column, index) in columns"
          :key="column.slug"
          scope="col"
          role="columnheader"
          class="evidence__model"
        >
          <span class="evidence__model-name">
            <CarsCompareKeyMark :index="index" />
            {{ names[index] }}
          </span>
        </th>
      </tr>
    </thead>
    <tbody v-for="group in visibleGroups" :key="group.key" class="evidence__group">
      <tr role="row" class="evidence__group-row">
        <th :colspan="columns.length + 1" scope="colgroup" role="columnheader">
          {{ group.title }}
        </th>
      </tr>
      <tr v-for="row in group.rows" :key="row.key" role="row" class="evidence__row">
        <th scope="row" role="rowheader" class="evidence__label">
          {{ row.label }}
          <span v-if="row.hint" class="evidence__hint">{{ row.hint }}</span>
        </th>
        <td
          v-for="(cell, index) in row.cells"
          :key="index"
          role="cell"
          :class="['evidence__cell', { 'evidence__cell--best': cell.best }]"
        >
          <span class="evidence__value">
            <VIcon v-if="cell.best" icon="mdi-check-circle" size="16" class="evidence__best" />
            <a v-if="cell.href" :href="cell.href" target="_blank" rel="noopener">{{ cell.text }}</a>
            <template v-else>{{ cell.text }}</template>
            <span v-if="cell.best" class="d-sr-only"> (mejor de la fila)</span>
          </span>
          <span v-if="cell.sub" class="evidence__sub">{{ cell.sub }}</span>
        </td>
      </tr>
      <tr v-if="group.note" role="row" class="evidence__note-row">
        <td :colspan="columns.length + 1" role="cell" class="evidence__note">{{ group.note }}</td>
      </tr>
    </tbody>
  </table>
  <p v-if="onlyDiff && hiddenRows" class="evidence__hidden">
    {{ hiddenRows === 1 ? 'Una fila oculta' : `${hiddenRows} filas ocultas` }}: los modelos están
    parejos o dicen lo mismo.
  </p>
</template>

<script setup lang="ts">
// La tabla completa del comparador: la prueba de lo que dice el veredicto. "Mejor" sólo cuando una
// columna le gana a otra por más que el ruido de la fila (utils/carCompare.ts); en móvil cada fila
// pasa a ser un rótulo con las columnas debajo, y los roles explícitos mantienen la tabla para un
// lector de pantalla aunque el CSS la convierta en grilla.
import type { CarCompareColumn, CarCompareGroup, CarCompareRow } from '~/utils/carCompare'

const props = defineProps<{
  columns: CarCompareColumn[]
  names: string[]
  groups: CarCompareGroup[]
  onlyDiff: boolean
}>()

/** Una fila "cambia" si alguien gana, o si es informativa y no dice lo mismo en todas. */
const differs = (row: CarCompareRow): boolean =>
  row.decided || (row.better === null && new Set(row.cells.map(cell => cell.text)).size > 1)

const visibleGroups = computed(() =>
  props.groups
    .map(group => ({
      ...group,
      rows: props.onlyDiff ? group.rows.filter(differs) : group.rows,
    }))
    .filter(group => group.rows.length)
)
const hiddenRows = computed(
  () =>
    props.groups.reduce((sum, group) => sum + group.rows.length, 0) -
    visibleGroups.value.reduce((sum, group) => sum + group.rows.length, 0)
)
</script>

<style scoped>
.evidence {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;
}
.evidence__head th {
  position: sticky;
  /* Debajo del encabezado del sitio, como la barra de filtros del directorio. */
  top: 64px;
  z-index: 2;
  background: rgb(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 12px 16px;
  text-align: left;
  vertical-align: bottom;
}
.evidence__corner {
  width: 32%;
}
.evidence__model-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
}
.evidence__group-row th {
  padding: 40px 16px 8px;
  text-align: left;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.4;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.evidence__group:first-of-type .evidence__group-row th {
  padding-top: 24px;
}
.evidence__row > * {
  padding: 12px 16px;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
  text-align: left;
}
.evidence__label {
  font-size: 0.875rem;
  font-weight: 600;
}
.evidence__hint {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  max-width: 40ch;
}
.evidence__value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.95rem;
  font-weight: 600;
}
.evidence__sub {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.evidence__cell--best {
  background: rgba(var(--v-theme-success), 0.08);
}
.evidence__best {
  color: rgb(var(--v-theme-success));
}
.evidence__note {
  padding: 8px 16px 0;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.evidence__hidden {
  margin: 16px 0 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

@media (max-width: 767.98px) {
  .evidence__head th {
    top: 56px;
  }
}

/* Móvil: el rótulo ocupa su renglón y las columnas van lado a lado debajo. */
@media (max-width: 599.98px) {
  .evidence,
  .evidence__head,
  .evidence__group {
    display: block;
  }
  .evidence__head {
    position: sticky;
    top: 56px;
    z-index: 2;
    background: rgb(var(--v-theme-background));
  }
  .evidence__head {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  /* El borde va en el encabezado entero: en cada celda salía cortado por el hueco entre columnas. */
  .evidence__head th {
    position: static;
    padding: 8px 0;
    border-bottom: 0;
  }
  .evidence tr {
    display: grid;
    grid-template-columns: repeat(var(--evidence-cols), minmax(0, 1fr));
    column-gap: 8px;
  }
  .evidence__corner {
    display: none;
  }
  .evidence__model-name {
    font-size: 0.875rem;
  }
  .evidence__group-row th,
  .evidence__label,
  .evidence__note {
    grid-column: 1 / -1;
  }
  .evidence__group-row th {
    padding: 24px 0 8px;
    font-size: 1rem;
    font-weight: 700;
  }
  .evidence__row > * {
    padding: 8px 0;
    border-bottom: 0;
  }
  .evidence__row {
    border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
    padding-bottom: 8px;
  }
  .evidence__label {
    padding-bottom: 0;
  }
  .evidence__cell {
    padding: 4px 8px;
    border-radius: 8px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .evidence__value {
    font-size: 0.875rem;
  }
  .evidence__note {
    padding: 8px 0 0;
  }
}
</style>
