<template>
  <!--
    Una tabla del informe de notebooks: cada fila es una mediana con su muestra y su rango central,
    y lleva a los avisos que la forman. Vive en su propio contenedor con scroll horizontal: en el
    celular cinco columnas no entran y la página nunca puede scrollear de costado.
  -->
  <div class="nb-table-scroll">
    <table class="nb-table">
      <thead>
        <tr>
          <th scope="col">{{ firstColumn }}</th>
          <th scope="col" class="num">Mediana</th>
          <th scope="col" class="num">La mitad del medio</th>
          <th scope="col" class="num">Avisos</th>
          <th scope="col" class="nb-table__bar-col">
            <span class="nb-table__sr">Mediana comparada</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <th scope="row">
            <NuxtLink v-if="link" :to="localePath(link(row))">{{ row.label }}</NuxtLink>
            <template v-else>{{ row.label }}</template>
          </th>
          <td class="num">
            <strong>{{ computerUsd(row.medianUsd) }}</strong>
          </td>
          <td class="num">{{ computerUsd(row.p25Usd) }} a {{ computerUsd(row.p75Usd) }}</td>
          <td class="num">{{ row.n.toLocaleString('es-UY') }}</td>
          <td class="nb-table__bar-col">
            <span
              class="nb-table__bar"
              :style="{ width: `${(row.medianUsd / maxMedian) * 100}%` }"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts" generic="Row extends ComputerPublicReportCell">
import { computerUsd } from '~/utils/computadoras'
import type { ComputerPublicReportCell } from '~/utils/computadorasPublic'

const props = defineProps<{
  rows: readonly Row[]
  firstColumn: string
  /** A dónde lleva cada fila (el directorio con los filtros de esa fila). */
  link?: (row: Row) => string | { path: string; query: Record<string, string> }
}>()
const localePath = useLocalePath()
const maxMedian = computed(() => Math.max(1, ...props.rows.map(row => row.medianUsd)))
</script>

<style scoped>
.nb-table-scroll {
  /* El texto para lectores de pantalla va en posición absoluta: sin este ancla se ubica contra
     la página entera, se escapa del scroll y la ensancha (medido: 461 px en un celular de 400). */
  position: relative;
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.nb-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.nb-table th,
.nb-table td {
  padding: 8px 12px;
  text-align: left;
  vertical-align: middle;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.nb-table thead th {
  border-top: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.nb-table tbody th {
  font-weight: 600;
}
.nb-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.nb-table__bar-col {
  width: 28%;
}
.nb-table__bar {
  display: block;
  height: 10px;
  min-width: 2px;
  border-radius: 8px;
  background: rgb(var(--v-theme-primary));
}
.nb-table__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
