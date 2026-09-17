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
          <td data-label="Por versión">
            <span class="guide-versions">
              <template v-if="row.versions.length">
                <span v-for="version in row.versions" :key="version.name" class="guide-version">
                  {{ version.name }} {{ formatCarUsd(version.priceUsd) }}
                </span>
              </template>
              <template v-else>—</template>
            </span>
          </td>
        </tr>
      </tbody>
    </VTable>
  </div>
</template>

<script setup lang="ts">
import { formatCarDate, formatCarUsd } from '~/utils/cars'
import type { PublicCarGuideYear } from '~/utils/carsPublic'

defineProps<{ rows: PublicCarGuideYear[]; updatedAt: string | null }>()
</script>

<style scoped>
.guide-table {
  overflow-x: auto;
}
/* One box for all versions: the mobile card layout spreads every direct child of a cell. */
.guide-versions {
  text-align: right;
}
/* One version and its price never break apart ("US$" alone at the end of a line). */
.guide-version {
  white-space: nowrap;
}
.guide-version + .guide-version::before {
  content: ' · ';
}
</style>
