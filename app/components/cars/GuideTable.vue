<template>
  <div class="guide-table">
    <VTable class="cu-mobile-cards" density="compact">
      <caption class="text-left text-body-2 text-medium-emphasis pb-2">
        Guía de precios de Mercado Libre{{
          updatedAt ? `, leída el ${formatCarDate(updatedAt)}` : ''
        }}. Se calcula con los mismos avisos de Mercado Libre: sirve de segunda opinión, no de
        tasación.
      </caption>
      <thead>
        <tr>
          <th scope="col">Año</th>
          <th scope="col">Promedio</th>
          <th scope="col">Por versión</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.year">
          <td data-label="">{{ row.year }}</td>
          <td data-label="Promedio">
            {{ row.averageUsd === null ? '—' : formatCarUsd(row.averageUsd) }}
          </td>
          <td data-label="Por versión">{{ versionsOf(row) }}</td>
        </tr>
      </tbody>
    </VTable>
  </div>
</template>

<script setup lang="ts">
import { formatCarDate, formatCarUsd } from '~/utils/cars'
import type { PublicCarGuideYear } from '~/utils/carsPublic'

defineProps<{ rows: PublicCarGuideYear[]; updatedAt: string | null }>()
const versionsOf = (row: PublicCarGuideYear): string =>
  row.versions.map(version => `${version.name} ${formatCarUsd(version.priceUsd)}`).join(' · ') ||
  '—'
</script>

<style scoped>
.guide-table {
  overflow-x: auto;
}
</style>
