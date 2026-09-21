<template>
  <CarsFilterPanel
    :mobile="mobile"
    :open="open"
    :total="total"
    @apply="apply"
    @clear="clear"
    @update:open="emit('update:open', $event)"
  >
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
      v-if="draft.brand && facets.models?.length"
      v-model="draft.model"
      :items="modelItems"
      label="Modelo"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.body"
      :items="bodyItems"
      label="Carrocería"
      hint="Del aviso o de los demás avisos del mismo modelo"
      persistent-hint
      density="comfortable"
      variant="outlined"
    />
    <div class="car-filters__pair">
      <VTextField
        v-model="draft.yearMin"
        label="Año mín."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VTextField
        v-model="draft.yearMax"
        label="Año máx."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
    </div>
    <div class="car-filters__pair">
      <VTextField
        v-model="draft.priceMin"
        label="US$ mín."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VTextField
        v-model="draft.priceMax"
        label="US$ máx."
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
    <!--
      Marca, carrocería, año, precio y kilómetros son con los que se empieza. El resto vive acá
      adentro para que el cajón de mobile se pueda recorrer de una: son doce campos más y
      empujaban lo importante fuera de la primera pantalla. Se abre solo si ya hay alguno puesto,
      así un filtro vigente nunca queda escondido.
    -->
    <details
      class="car-filters__group"
      :open="moreOpen"
      @toggle="moreOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary data-testid="car-filters-more">
        Más filtros
        <span v-if="moreCount" class="car-filters__count">({{ moreCount }})</span>
      </summary>
      <div class="car-filters__group-fields">
        <VSelect
          v-model="draft.fuel"
          :items="fuelItems"
          label="Combustible"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.l100Max"
          :items="consumptionItems"
          label="Consumo máximo"
          hint="Del aviso o estimado por modelo"
          persistent-hint
          density="comfortable"
          variant="outlined"
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
          v-model="draft.doors"
          :items="doorItems"
          label="Puertas"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.color"
          :items="colorItems"
          label="Color"
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
        <VSelect
          v-model="draft.sinceDays"
          :items="sinceItems"
          label="Publicado"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-if="(facets.sources?.length ?? 0) > 1"
          v-model="draft.source"
          :items="sourceItems"
          label="Fuente"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VCheckbox
          v-model="draft.priceDrop"
          label="Bajó de precio"
          density="compact"
          hide-details
        />
        <VCheckbox
          v-model="draft.opportunity"
          label="Sólo oportunidades"
          density="compact"
          hide-details
        />
        <VCheckbox
          v-model="draft.noRisk"
          label="Sin deuda ni choque declarados"
          density="compact"
          hide-details
        />
        <p class="text-caption text-medium-emphasis mb-0">
          Puertas y color salen de la ficha del aviso; un aviso que no los declara no aparece cuando
          filtrás por ellos. «Sin deuda ni choque declarados» quiere decir que el vendedor no lo
          menciona, no que el auto esté libre.
        </p>
      </div>
    </details>
  </CarsFilterPanel>
</template>

<script setup lang="ts">
import {
  CAR_BODY_LABELS,
  CAR_COLORS,
  CAR_COLOR_LABELS,
  CAR_DEPARTMENTS,
  CAR_DOOR_OPTIONS,
  CAR_FUELS,
  CAR_FUEL_LABELS,
  CAR_CONSUMPTION_STEPS,
  CAR_SELLERS,
  CAR_SELLER_LABELS,
  CAR_SINCE_STEPS,
  CAR_TRANSMISSIONS,
  CAR_TRANSMISSION_LABELS,
  normalizeCarsQuery,
  type CarFacet,
  type CarsQuery,
} from '~/utils/cars'

const props = withDefaults(
  defineProps<{
    query: CarsQuery
    facets: {
      brands: CarFacet[]
      models: CarFacet[]
      departments: CarFacet[]
      sources: CarFacet[]
      bodies: CarFacet[]
    }
    /** En mobile los filtros son un cajón a pantalla completa; en desktop, la columna de siempre. */
    mobile?: boolean
    open?: boolean
    total?: number | null
  }>(),
  { mobile: false, open: false, total: null }
)
const emit = defineEmits<{ apply: [query: CarsQuery]; 'update:open': [value: boolean] }>()

const toDraft = (query: CarsQuery) => ({
  q: query.q as string | null,
  brand: query.brand,
  model: query.model,
  yearMin: query.yearMin?.toString() ?? '',
  yearMax: query.yearMax?.toString() ?? '',
  priceMin: query.priceMin?.toString() ?? '',
  priceMax: query.priceMax?.toString() ?? '',
  kmMax: query.kmMax?.toString() ?? '',
  l100Max: query.l100Max?.toString() ?? '',
  fuel: query.fuel as string,
  transmission: query.transmission as string,
  body: query.body as string,
  doors: query.doors?.toString() ?? '',
  color: query.color,
  department: query.department,
  seller: query.seller as string,
  source: query.source as string,
  priceDrop: query.priceDrop,
  opportunity: query.opportunity,
  noRisk: query.noRisk,
  sinceDays: query.sinceDays?.toString() ?? '',
})
const draft = reactive(toDraft(props.query))
watch(
  () => props.query,
  next => Object.assign(draft, toDraft(next))
)

/** Cuántos de los campos de "Más filtros" están puestos: el grupo se abre solo si hay alguno. */
const moreCount = computed(
  () =>
    [
      draft.fuel,
      draft.l100Max,
      draft.transmission,
      draft.doors,
      draft.color,
      draft.department,
      draft.seller,
      draft.sinceDays,
      draft.source,
    ].filter(Boolean).length +
    [draft.priceDrop, draft.opportunity, draft.noRisk].filter(Boolean).length
)
const moreOpen = ref(moreCount.value > 0)
watch(moreCount, count => {
  if (count > 0) moreOpen.value = true
})

/*
 * Toda faceta se lee con `?? []`. No es paranoia de tipos: durante una ventana de despliegue
 * el navegador ya tiene el JS nuevo y la API todavía contesta el JSON viejo, sin la faceta
 * recién agregada. Medido con `bodies`: `facets.bodies.length` tiraba
 * "Cannot read properties of undefined (reading 'length')", el render del panel moría y el
 * cajón de filtros no abría nunca — el botón no hacía nada y no había error al tocarlo.
 */
const facet = (rows: CarFacet[] | undefined) =>
  (rows ?? []).map(row => ({ title: `${row.name} (${row.count})`, value: row.slug }))

const brandItems = computed(() => [
  { title: 'Todas las marcas', value: '' },
  ...facet(props.facets.brands),
])
const modelItems = computed(() => [
  { title: 'Todos los modelos', value: '' },
  ...facet(props.facets.models),
])
// La lista sale de la faceta —cuenta los avisos que hay con los demás filtros puestos— y cae a las
// etiquetas completas cuando todavía no llegó la respuesta.
const bodyItems = computed(() => [
  { title: 'Cualquier carrocería', value: '' },
  ...(props.facets.bodies?.length
    ? facet(props.facets.bodies)
    : Object.entries(CAR_BODY_LABELS).map(([value, title]) => ({ title, value }))),
])
const fuelItems = [
  { title: 'Cualquier combustible', value: '' },
  ...CAR_FUELS.map(value => ({ title: CAR_FUEL_LABELS[value], value })),
]
const consumptionItems = [
  { title: 'Cualquier consumo', value: '' },
  ...CAR_CONSUMPTION_STEPS.map(value => ({
    title: `Hasta ${value} L/100 km`,
    value: String(value),
  })),
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
const doorItems = [
  { title: 'Cualquier cantidad', value: '' },
  ...CAR_DOOR_OPTIONS.map(value => ({ title: `${value} puertas`, value: String(value) })),
]
const colorItems = [
  { title: 'Cualquier color', value: '' },
  ...CAR_COLORS.map(value => ({ title: CAR_COLOR_LABELS[value] ?? value, value })),
]
const sinceItems = [
  { title: 'Cuando sea', value: '' },
  ...CAR_SINCE_STEPS.map(value => ({
    title: value === 1 ? 'Hoy' : `En los últimos ${value} días`,
    value: String(value),
  })),
]

const sourceItems = computed(() => [
  { title: 'Todas las fuentes', value: '' },
  ...facet(props.facets.sources),
])

function apply() {
  // VTextField `clearable` sets the model to null; the query normalizer only accepts strings.
  // Los interruptores viajan como "1" porque es lo único que el normalizador acepta como encendido.
  emit(
    'apply',
    normalizeCarsQuery({
      ...draft,
      q: draft.q ?? '',
      priceDrop: draft.priceDrop ? '1' : '',
      opportunity: draft.opportunity ? '1' : '',
      noRisk: draft.noRisk ? '1' : '',
      sort: props.query.sort,
    })
  )
}
function clear() {
  emit('apply', normalizeCarsQuery({ sort: props.query.sort }))
}
</script>

<style scoped>
.car-filters__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.car-filters__group {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin-top: 4px;
}
.car-filters__group > summary {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-block: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.875rem;
  list-style: none;
}
.car-filters__group > summary::-webkit-details-marker {
  display: none;
}
/* El signo de que esto abre y cierra. Gira cuando el grupo queda abierto. */
.car-filters__group > summary::after {
  content: '';
  margin-left: auto;
  width: 9px;
  height: 9px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-2px) rotate(45deg);
  transition: transform 150ms ease;
}
.car-filters__group[open] > summary::after {
  transform: translateY(2px) rotate(225deg);
}
@media (prefers-reduced-motion: reduce) {
  .car-filters__group > summary::after {
    transition: none;
  }
}
.car-filters__group > summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.car-filters__count {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.car-filters__group-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}
</style>
