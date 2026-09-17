<template>
  <form class="car-filters" @submit.prevent="apply">
    <VTextField
      v-model="draft.q"
      label="Buscar en el título"
      density="comfortable"
      variant="outlined"
      hide-details
      clearable
    />
    <VSelect
      v-model="draft.brand"
      :items="brandItems"
      label="Marca"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="draft.model = ''"
    />
    <VSelect
      v-if="draft.brand && facets.models.length"
      v-model="draft.model"
      :items="modelItems"
      label="Modelo"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <div class="car-filters__pair">
      <VTextField
        v-model="draft.yearMin"
        label="Año desde"
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VTextField
        v-model="draft.yearMax"
        label="Año hasta"
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
    </div>
    <div class="car-filters__pair">
      <VTextField
        v-model="draft.priceMin"
        label="US$ desde"
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VTextField
        v-model="draft.priceMax"
        label="US$ hasta"
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
    </div>
    <VTextField
      v-model="draft.kmMax"
      label="Km máximo"
      inputmode="numeric"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.fuel"
      :items="fuelItems"
      label="Combustible"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.transmission"
      :items="transmissionItems"
      label="Caja"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.department"
      :items="departmentItems"
      label="Departamento"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.seller"
      :items="sellerItems"
      label="Vende"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <div class="car-filters__actions">
      <VBtn type="submit" color="primary" block>Aplicar</VBtn>
      <VBtn variant="text" block @click="clear">Limpiar filtros</VBtn>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  CAR_DEPARTMENTS,
  CAR_FUELS,
  CAR_FUEL_LABELS,
  CAR_SELLERS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSIONS,
  CAR_TRANSMISSION_LABELS,
  normalizeCarsQuery,
  type CarFacet,
  type CarsQuery,
} from '~/utils/cars'

const props = defineProps<{
  query: CarsQuery
  facets: { brands: CarFacet[]; models: CarFacet[]; departments: CarFacet[] }
}>()
const emit = defineEmits<{ apply: [query: CarsQuery] }>()

const toDraft = (query: CarsQuery) => ({
  q: query.q as string | null,
  brand: query.brand,
  model: query.model,
  yearMin: query.yearMin?.toString() ?? '',
  yearMax: query.yearMax?.toString() ?? '',
  priceMin: query.priceMin?.toString() ?? '',
  priceMax: query.priceMax?.toString() ?? '',
  kmMax: query.kmMax?.toString() ?? '',
  fuel: query.fuel as string,
  transmission: query.transmission as string,
  department: query.department,
  seller: query.seller as string,
})
const draft = reactive(toDraft(props.query))
watch(
  () => props.query,
  next => Object.assign(draft, toDraft(next))
)

const brandItems = computed(() => [
  { title: 'Todas las marcas', value: '' },
  ...props.facets.brands.map(brand => ({
    title: `${brand.name} (${brand.count})`,
    value: brand.slug,
  })),
])
const modelItems = computed(() => [
  { title: 'Todos los modelos', value: '' },
  ...props.facets.models.map(model => ({
    title: `${model.name} (${model.count})`,
    value: model.slug,
  })),
])
const fuelItems = [
  { title: 'Cualquier combustible', value: '' },
  ...CAR_FUELS.map(value => ({ title: CAR_FUEL_LABELS[value], value })),
]
const transmissionItems = [
  { title: 'Cualquier caja', value: '' },
  ...CAR_TRANSMISSIONS.map(value => ({ title: CAR_TRANSMISSION_LABELS[value], value })),
]
const departmentItems = [
  { title: 'Todo el país', value: '' },
  ...CAR_DEPARTMENTS.map(value => ({ title: value, value })),
]
const sellerItems = [
  { title: 'Dueño o automotora', value: '' },
  ...CAR_SELLERS.map(value => ({ title: CAR_SELLER_LABELS[value], value })),
]

function apply() {
  // VTextField `clearable` sets the model to null; the query normalizer only accepts strings.
  emit('apply', normalizeCarsQuery({ ...draft, q: draft.q ?? '', sort: props.query.sort }))
}
function clear() {
  emit('apply', normalizeCarsQuery({ sort: props.query.sort }))
}
</script>

<style scoped>
.car-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.car-filters__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.car-filters__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
