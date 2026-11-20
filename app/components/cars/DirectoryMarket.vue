<template>
  <div>
    <section v-if="summary" class="mt-10">
      <h2 class="text-h5 mb-3">Cuánto sale un auto usado en Uruguay</h2>
      <p class="text-body-1 mb-4">
        {{ formatCarUsd(summary.price.median) }} es la mediana de lo que se pide por un auto usado.
        {{ carsDirectoryProfile(summary) }} Sale de {{ carsDirectoryCount(summary.adverts) }} avisos
        publicados en dólares, de {{ summary.brands }} marcas, medidos el
        <time :datetime="summary.generatedAt">{{ formatCarDate(summary.generatedAt) }}</time
        >.
      </p>

      <template v-if="summary.bands.length">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Avisos por franja de precio</h3>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Precio pedido</th>
              <th scope="col">Avisos</th>
              <th scope="col">Parte del total</th>
              <th scope="col"><span class="d-sr-only">Abrir en el buscador</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="band in summary.bands" :key="band.from">
              <td data-label="Precio pedido">{{ carsDirectoryBandLabel(band) }}</td>
              <td data-label="Avisos">{{ carsDirectoryCount(band.adverts) }}</td>
              <td data-label="Parte del total">{{ carReportPercent(band.share, 1) }}</td>
              <td data-label="">
                <button
                  type="button"
                  class="market-shortcut"
                  :aria-label="`Ver avisos de ${carsDirectoryBandLabel(band)}`"
                  @click="emit('apply', carsDirectoryBandParams(band))"
                >
                  Ver avisos
                </button>
              </td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2 text-medium-emphasis mt-2 mb-6">
          La tabla cuenta los avisos publicados en dólares. El buscador suma los publicados en
          pesos, pasados a dólares con la cotización del día, y los de Facebook con la moneda
          estimada, así que al abrir una franja el número de avisos no coincide con el de la tabla.
        </p>
      </template>

      <template v-if="summary.budgets.length">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Qué se compra con cada presupuesto</h3>
        <ul class="text-body-1 pl-5 mb-6">
          <li v-for="tier in summary.budgets" :key="tier.maxUsd" class="mb-1">
            <!-- Ruta cruda, sin localePath: las páginas por presupuesto existen sólo en español. -->
            <template v-if="tier.hasPage"
              ><NuxtLink :to="carBudgetPath(tier.maxUsd)">{{
                budgetLabel(tier)
              }}</NuxtLink></template
            ><template v-else>{{ budgetLabel(tier) }}</template
            >: {{ carsDirectoryBudgetLine(tier) }}
          </li>
        </ul>
      </template>

      <template v-if="summary.brandsTop.length">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Precio mediano por marca</h3>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Marca</th>
              <th scope="col">Avisos</th>
              <th scope="col">Precio mediano</th>
              <th scope="col">Año mediano</th>
              <th scope="col"><span class="d-sr-only">Abrir en el buscador</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="brand in summary.brandsTop" :key="brand.slug">
              <td data-label="">{{ brand.name }}</td>
              <td data-label="Avisos">{{ carsDirectoryCount(brand.adverts) }}</td>
              <td data-label="Precio mediano">{{ formatCarUsd(brand.medianUsd) }}</td>
              <td data-label="Año mediano">{{ brand.medianYear }}</td>
              <td data-label="">
                <button
                  type="button"
                  class="market-shortcut"
                  :aria-label="`Ver avisos de ${brand.name}`"
                  @click="emit('apply', { brand: brand.slug })"
                >
                  Ver avisos
                </button>
              </td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2 text-medium-emphasis mt-2">
          Las diez marcas con más avisos publicados en dólares. El detalle por modelo, con cuánto
          pierde cada uno por año, está en el
          <NuxtLink :to="localePath(CAR_REPORT_PATH)">informe del mercado</NuxtLink>.
        </p>
      </template>
    </section>

    <section v-if="browse" class="mt-10">
      <h2 class="text-h5 mb-3">Autos usados por departamento y por tipo</h2>
      <p class="text-body-2 mb-3">
        Cuántos<template v-if="total !== null"> de los {{ carsDirectoryCount(total) }}</template>
        avisos vigentes hay en cada departamento y de cada carrocería (los que no informan el dato
        no entran en ninguno). Tocá uno para filtrar el buscador.
      </p>
      <template v-if="browse.departments.length">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Por departamento</h3>
        <ul class="market-facets mb-4">
          <li v-for="facet in browse.departments" :key="facet.slug">
            <button
              type="button"
              class="market-facet"
              @click="emit('apply', { department: facet.slug })"
            >
              {{ facet.name }} ({{ carsDirectoryCount(facet.count) }})
            </button>
          </li>
        </ul>
      </template>
      <template v-if="browse.bodies.length">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Por tipo de auto</h3>
        <ul class="market-facets mb-2">
          <li v-for="facet in browse.bodies" :key="facet.slug">
            <button type="button" class="market-facet" @click="emit('apply', { body: facet.slug })">
              {{ facet.name }} ({{ carsDirectoryCount(facet.count) }})
            </button>
          </li>
        </ul>
        <p class="text-body-2 text-medium-emphasis">
          La carrocería sale del aviso o de los demás avisos del mismo modelo; un aviso sin ese dato
          no entra en ningún tipo.
        </p>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
// El mercado en números dentro del directorio de autos: cifras del informe
// (/mercado-de-autos-usados-uruguay) y atajos a los filtros. Los atajos son botones y no enlaces a
// propósito: las URLs con filtros van noindex, el directorio existe en muchos idiomas y cada una
// cuesta varias agregaciones en Mongo, así que un enlace rastreable por atajo sólo traería bots.
import { computed } from 'vue'
import { formatCarDate, formatCarUsd, type CarsResponse } from '~/utils/cars'
import { carBudgetPath } from '~/utils/carBudget'
import { CAR_REPORT_PATH, carReportPercent } from '~/utils/carsReport'
import {
  carsDirectoryBandLabel,
  carsDirectoryBandParams,
  carsDirectoryBrowse,
  carsDirectoryBudgetLine,
  carsDirectoryCount,
  carsDirectoryProfile,
  type CarsDirectoryBudget,
  type CarsDirectorySummary,
} from '~/utils/carsDirectorySummary'

const props = defineProps<{
  summary: CarsDirectorySummary | null
  facets: Pick<CarsResponse['facets'], 'departments' | 'bodies'> | null
  total: number | null
}>()
const emit = defineEmits<{ apply: [params: Record<string, string>] }>()

const localePath = useLocalePath()
const browse = computed(() => carsDirectoryBrowse(props.facets))
const budgetLabel = (tier: CarsDirectoryBudget): string => `Con ${formatCarUsd(tier.maxUsd)}`
</script>

<style scoped>
.market-shortcut {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  font: inherit;
  padding: 0.25rem 0;
  min-height: 32px;
  cursor: pointer;
  white-space: nowrap;
}
.market-facets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
}
.market-facet {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
  border-radius: 16px;
  padding: 0.35rem 0.85rem;
  min-height: 36px;
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  color: inherit;
  background: transparent;
  max-width: 100%;
  text-align: left;
}
.market-facet:hover,
.market-facet:focus-visible {
  border-color: rgb(var(--v-theme-primary));
}
</style>
