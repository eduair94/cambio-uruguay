<template>
  <div class="market-table">
    <VTable density="compact">
      <caption class="text-left text-body-2 text-medium-emphasis pb-2">
        {{
          caption
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Año</th>
          <th v-if="showVersion" scope="col">Versión</th>
          <th scope="col">Avisos</th>
          <th scope="col">Rango central (P25–P75)</th>
          <th scope="col">Mediana</th>
          <th scope="col">Km mediano</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.year}-${row.trim}-${row.engine}-${row.transmission}`">
          <td>{{ row.year }}</td>
          <td v-if="showVersion">{{ versionOf(row) }}</td>
          <td>{{ row.n }}</td>
          <td>{{ formatCarUsd(row.p25) }} – {{ formatCarUsd(row.p75) }}</td>
          <td class="font-weight-bold">{{ formatCarUsd(row.median) }}</td>
          <td>{{ formatCarKm(row.kmMedian) }}</td>
        </tr>
      </tbody>
    </VTable>
  </div>
</template>

<script setup lang="ts">
import { CAR_TRANSMISSION_LABELS, formatCarKm, formatCarUsd } from '~/utils/cars'
import type { PublicCarMarketRow } from '~/utils/carsPublic'

defineProps<{ rows: PublicCarMarketRow[]; caption: string; showVersion?: boolean }>()
const versionOf = (row: PublicCarMarketRow): string =>
  [row.trim, row.engine, row.transmission && CAR_TRANSMISSION_LABELS[row.transmission]]
    .filter(Boolean)
    .join(' · ')
</script>

<style scoped>
.market-table {
  overflow-x: auto;
}
</style>
