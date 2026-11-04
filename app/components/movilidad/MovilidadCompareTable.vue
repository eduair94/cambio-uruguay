<!--
  La tabla del comparador de modelos de /monopatines-electricos-uruguay/comparar y
  /bicicletas-electricas-uruguay/comparar: una columna por modelo, una fila por dato, el mejor de
  cada fila marcado sólo donde más (o menos) es mejor (las filas las arman utils/monopatinModelos.ts
  y utils/bicicletaModelos.ts).

  En el teléfono no hay desplazamiento lateral (pedido del 4/11/2026: con tres modelos la tabla medía
  488 px en una pantalla de 317 y el primer modelo quedaba tapado por el rótulo fijo). Se reordena en
  vez de achicarse: el rótulo de cada fila pasa ARRIBA, a todo el ancho, y los valores de los modelos
  quedan lado a lado debajo, en columnas iguales; el encabezado con los modelos queda fijo arriba
  mientras se baja, así siempre se sabe qué columna es cuál. Es el patrón de los comparadores de
  producto en el teléfono (GSMArena, Apple), y conserva lo que la tabla tiene de útil: comparar en una
  misma línea. Los roles ARIA explícitos mantienen la semántica de tabla aunque el CSS cambie el
  `display` de filas y celdas (Safari y Chrome la pierden sin ellos).
-->
<template>
  <div class="cmp" :style="{ '--cmp-cols': String(models.length) }">
    <table class="cmp-table" role="table">
      <thead class="cmp-head" role="rowgroup">
        <tr role="row">
          <th scope="col" class="cmp-corner" role="columnheader">
            <span class="d-sr-only">Dato</span>
          </th>
          <th
            v-for="model in models"
            :key="model.slug"
            scope="col"
            class="cmp-model"
            role="columnheader"
          >
            <MovilidadVariantThumb :src="model.image ?? null" :alt="model.name" :icon="icon" />
            <!-- El nombre corto ("Xiaomi 6 Lite", sin la línea "Electric Scooter"): en una columna de
                 100 px el largo se cortaba y los tres modelos de una marca se leían igual. -->
            <NuxtLink :to="`${hub}/${model.slug}`" class="cmp-model__name" :title="model.name">
              {{ model.shortName ?? model.name }}
            </NuxtLink>
            <button
              type="button"
              class="cmp-model__remove"
              :aria-label="`Sacar ${model.name} de la comparación`"
              @click="emit('remove', model.slug)"
            >
              <VIcon icon="mdi-close" size="16" aria-hidden="true" />
              <span class="cmp-model__remove-text">Sacar</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        <tr v-for="row in rows" :key="row.key" class="cmp-row" role="row">
          <th scope="row" class="cmp-label" role="rowheader">{{ row.label }}</th>
          <td
            v-for="(cell, index) in row.cells"
            :key="`${row.key}:${index}`"
            class="cmp-cell"
            :class="{ 'is-best': row.best.includes(index) }"
            role="cell"
          >
            <!-- En el teléfono el encabezado puede quedar lejos: el nombre del modelo viaja con el
                 valor para el lector de pantalla, nunca a la vista. -->
            <span class="d-sr-only">{{ models[index]?.name }}: </span>
            {{ cell ?? '—' }}
            <span v-if="row.best.includes(index)" class="best-tag">Mejor</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { MonopatinCompareRow } from '~/utils/monopatinModelos'

defineProps<{
  models: ReadonlyArray<{ slug: string; name: string; shortName?: string; image?: string | null }>
  rows: readonly MonopatinCompareRow[]
  /** El hub de la categoría: la página de cada modelo es `<hub>/<slug>`. */
  hub: string
  icon: string
}>()
const emit = defineEmits<{ remove: [slug: string] }>()
</script>

<style scoped>
.cmp {
  margin-top: 24px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
}
.cmp-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-variant-numeric: tabular-nums;
}
.cmp-table th,
.cmp-table td {
  padding: 12px 16px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.18);
  overflow-wrap: anywhere;
}
.cmp-table tbody tr:last-child th,
.cmp-table tbody tr:last-child td {
  border-bottom: 0;
}
.cmp-corner,
.cmp-label {
  width: 26%;
}
.cmp-label {
  font-weight: 600;
}
.cmp-model__name {
  display: block;
  margin-top: 8px;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.cmp-model__remove {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  margin-top: 4px;
  font-size: 0.875rem;
  opacity: 0.8;
}
.cmp-model__remove:hover,
.cmp-model__remove:focus-visible {
  opacity: 1;
  text-decoration: underline;
}
.is-best {
  font-weight: 700;
  background: rgba(var(--v-theme-success), 0.1);
}
.best-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgb(var(--v-theme-success));
}

/* ── Teléfono: el rótulo arriba, los valores lado a lado, el encabezado fijo ─────────────── */
@media (max-width: 599.98px) {
  .cmp-table,
  .cmp-table tbody {
    display: block;
    font-size: 0.875rem;
  }
  .cmp-head {
    display: block;
    position: sticky;
    /* Debajo de la barra de la app (VAppBar, 64 px). */
    top: 64px;
    z-index: 2;
    background: rgb(var(--v-theme-surface));
    border-bottom: 1px solid rgba(var(--v-border-color), 0.25);
    border-radius: 12px 12px 0 0;
  }
  .cmp-table tr {
    display: grid;
    grid-template-columns: repeat(var(--cmp-cols, 2), minmax(0, 1fr));
  }
  .cmp-table th,
  .cmp-table td {
    padding: 8px 10px;
    border-bottom: 0;
  }
  .cmp-corner {
    display: none;
  }
  .cmp-model {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding-right: 30px !important;
    font-size: 0.8125rem;
  }
  .cmp-model :deep(.mv-thumb) {
    width: 40px;
    height: 40px;
  }
  .cmp-model__name {
    display: -webkit-box;
    margin-top: 6px;
    line-height: 1.25;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* "Sacar" queda como un botón de 32 px arriba a la derecha de su columna. */
  .cmp-model__remove {
    position: absolute;
    top: 4px;
    right: 2px;
    justify-content: center;
    width: 32px;
    min-height: 32px;
    margin: 0;
  }
  .cmp-model__remove-text {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .cmp-row {
    border-top: 1px solid rgba(var(--v-border-color), 0.18);
  }
  .cmp-row:first-child {
    border-top: 0;
  }
  .cmp-label {
    grid-column: 1 / -1;
    width: auto;
    padding-bottom: 0 !important;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    opacity: 0.75;
  }
  .best-tag {
    display: block;
    margin: 2px 0 0;
    padding: 0;
  }
}
</style>
