<template>
  <div class="subject-filters">
    <VTextField
      :model-value="model.priceMax"
      label="Presupuesto máximo (US$)"
      inputmode="numeric"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="value => set('priceMax', value)"
    />
    <div class="subject-filters__pair">
      <VTextField
        :model-value="model.yearMin"
        label="Año desde"
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
        @update:model-value="value => set('yearMin', value)"
      />
      <VTextField
        :model-value="model.kmMax"
        label="Km máximo"
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
        @update:model-value="value => set('kmMax', value)"
      />
    </div>
    <VSelect
      :model-value="model.fuel"
      :items="fuelItems"
      label="Combustible"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="value => set('fuel', value)"
    />
    <VSelect
      :model-value="model.transmission"
      :items="transmissionItems"
      label="Caja"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="value => set('transmission', value)"
    />
    <VSelect
      :model-value="model.l100Max"
      :items="consumptionItems"
      label="Consumo máximo"
      hint="Del aviso o estimado por modelo"
      persistent-hint
      density="comfortable"
      variant="outlined"
      @update:model-value="value => set('l100Max', value)"
    />
    <VSelect
      :model-value="model.department"
      :items="departmentItems"
      label="Departamento"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="value => set('department', value)"
    />
    <VSelect
      :model-value="model.seller"
      :items="sellerItems"
      label="Vende"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="value => set('seller', value)"
    />
  </div>
</template>

<script setup lang="ts">
// Los filtros sobre el aviso que comparten oportunidades y autos con deuda (`CarSubjectFilters`).
// Un solo formulario para las dos listas: si una suma un filtro, la otra también, y quien filtra por
// consumo en una no descubre que la otra no lo tiene.
import {
  CAR_CONSUMPTION_STEPS,
  CAR_DEPARTMENTS,
  CAR_FUELS,
  CAR_FUEL_LABELS,
  CAR_SELLERS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSIONS,
  CAR_TRANSMISSION_LABELS,
  type CarSubjectDraft,
} from '~/utils/cars'

const model = defineModel<CarSubjectDraft>({ required: true })

function set(key: keyof CarSubjectDraft, value: string | null): void {
  // `clearable` and an emptied field give null; the draft only holds text.
  model.value = { ...model.value, [key]: value ?? '' }
}

const fuelItems = [
  { title: 'Cualquier combustible', value: '' },
  ...CAR_FUELS.map(value => ({ title: CAR_FUEL_LABELS[value], value })),
]
const transmissionItems = [
  { title: 'Cualquier caja', value: '' },
  ...CAR_TRANSMISSIONS.map(value => ({ title: CAR_TRANSMISSION_LABELS[value], value })),
]
const consumptionItems = [
  { title: 'Cualquier consumo', value: '' },
  ...CAR_CONSUMPTION_STEPS.map(value => ({
    title: `Hasta ${value} L/100 km`,
    value: String(value),
  })),
]
const departmentItems = [
  { title: 'Todo el país', value: '' },
  ...CAR_DEPARTMENTS.map(value => ({ title: value, value })),
]
const sellerItems = [
  { title: 'Dueño o automotora', value: '' },
  ...CAR_SELLERS.map(value => ({ title: CAR_SELLER_LABELS[value], value })),
]
</script>

<style scoped>
.subject-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.subject-filters__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
