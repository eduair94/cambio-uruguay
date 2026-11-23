<template>
  <!-- El mismo panel que autos (columna en escritorio, cajón en el celular, "Ver N avisos"). -->
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
      v-model="draft.marca"
      :items="brandItems"
      label="Marca"
      density="comfortable"
      variant="outlined"
      hide-details
      data-testid="filtro-marca"
      @update:model-value="draft.modelo = ''"
    />
    <VSelect
      v-if="draft.marca && (facets.models?.length ?? 0) > 0"
      v-model="draft.modelo"
      :items="modelItems"
      label="Modelo"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.tipo"
      :items="typeItems"
      label="Tipo"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.cilindrada"
      :items="bandItems"
      label="Cilindrada"
      hint="De la ficha o el título del aviso, o estimada con los demás avisos del mismo modelo"
      persistent-hint
      density="comfortable"
      variant="outlined"
      data-testid="filtro-cilindrada"
    />
    <div class="moto-filters__pair">
      <VTextField
        v-model="draft.ccMin"
        label="cc mín."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VTextField
        v-model="draft.ccMax"
        label="cc máx."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
    </div>
    <div class="moto-filters__pair">
      <VTextField
        v-model="draft.anioDesde"
        label="Año mín."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VTextField
        v-model="draft.anioHasta"
        label="Año máx."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
    </div>
    <div class="moto-filters__pair">
      <VTextField
        v-model="draft.precioMinUsd"
        label="US$ mín."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VTextField
        v-model="draft.precioMaxUsd"
        label="US$ máx."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
        data-testid="filtro-precio"
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
      Lo de arriba es con lo que se empieza (qué moto, de qué cilindrada, de qué año, a qué precio).
      El resto vive acá adentro, cerrado y sin montar, como en autos: abre solo si ya hay alguno
      puesto, así un filtro vigente nunca queda escondido.
    -->
    <details
      class="moto-filters__group"
      :open="moreOpen"
      @toggle="moreOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary data-testid="moto-filters-more">
        Más filtros
        <span v-if="moreCount" class="moto-filters__count">({{ moreCount }})</span>
      </summary>
      <div v-if="moreOpen" class="moto-filters__group-fields">
        <VSelect
          v-model="draft.departamento"
          :items="departmentItems"
          label="Departamento"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.combustible"
          :items="fuelItems"
          label="Motor"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.vendedor"
          :items="sellerItems"
          label="Vende"
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
          v-if="(facets.sources?.length ?? 0) > 1"
          v-model="draft.fuente"
          :items="sourceItems"
          label="Fuente"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.dias"
          :items="sinceItems"
          label="Publicada"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VCheckbox v-model="draft.bajo" label="Bajó de precio" density="compact" hide-details />
        <VCheckbox
          v-model="draft.sinRiesgo"
          label="Sin deuda ni choque declarados"
          density="compact"
          hide-details
        />
        <VCheckbox v-model="draft.unicoDueno" label="Único dueño" density="compact" hide-details />
        <p class="text-caption text-medium-emphasis mb-0">
          Color y único dueño salen de la ficha del aviso; uno que no los declara no aparece cuando
          filtrás por ellos. «Sin deuda ni choque declarados» quiere decir que el vendedor no lo
          menciona, no que la moto esté libre.
        </p>
      </div>
    </details>
  </CarsFilterPanel>
</template>

<script setup lang="ts">
import {
  MOTO_COLORS,
  MOTO_COLOR_LABEL,
  MOTO_DISPLACEMENT_BUCKETS,
  MOTO_FUEL_LABEL,
  MOTO_SELLER_LABEL,
  MOTO_SINCE_STEPS,
  MOTO_TYPE_LABEL,
  motoNormalizeQuery,
  type MotoFacet,
  type MotoFacets,
  type MotoQuery,
} from '~/utils/motos'
import { CAR_DEPARTMENTS } from '~/utils/cars'

const props = withDefaults(
  defineProps<{
    query: MotoQuery
    facets: MotoFacets
    mobile?: boolean
    open?: boolean
    total?: number | null
  }>(),
  { mobile: false, open: false, total: null }
)
const emit = defineEmits<{ apply: [query: MotoQuery]; 'update:open': [value: boolean] }>()

const text = (value: number | null) => (value == null ? '' : String(value))
const toDraft = (query: MotoQuery) => ({
  q: query.q as string | null,
  marca: query.marca,
  modelo: query.modelo,
  tipo: query.tipo,
  cilindrada: query.cilindrada,
  ccMin: text(query.ccMin),
  ccMax: text(query.ccMax),
  anioDesde: text(query.anioDesde),
  anioHasta: text(query.anioHasta),
  precioMinUsd: text(query.precioMinUsd),
  precioMaxUsd: text(query.precioMaxUsd),
  kmMax: text(query.kmMax),
  departamento: query.departamento,
  combustible: query.combustible,
  vendedor: query.vendedor,
  color: query.color,
  dias: text(query.dias),
  bajo: query.bajo,
  sinRiesgo: query.sinRiesgo,
  unicoDueno: query.unicoDueno,
  fuente: query.fuente,
})
const draft = reactive(toDraft(props.query))
watch(
  () => props.query,
  next => Object.assign(draft, toDraft(next))
)

const moreCount = computed(
  () =>
    [
      draft.departamento,
      draft.combustible,
      draft.vendedor,
      draft.color,
      draft.dias,
      draft.fuente,
    ].filter(Boolean).length +
    [draft.bajo, draft.sinRiesgo, draft.unicoDueno].filter(Boolean).length
)
const moreOpen = ref(moreCount.value > 0)
watch(moreCount, count => {
  if (count > 0) moreOpen.value = true
})

/*
 * Toda faceta se lee con `?? []`: durante una ventana de despliegue el navegador puede tener el JS
 * nuevo y la API contestar el JSON viejo, sin la faceta recién agregada (medido en autos con
 * `bodies`: el panel no abría y no había error).
 */
const facet = (rows: MotoFacet[] | undefined) =>
  (rows ?? []).map(row => ({ title: `${row.label} (${row.count})`, value: row.value }))

const brandItems = computed(() => [
  { title: 'Todas las marcas', value: '' },
  ...facet(props.facets.brands),
])
const modelItems = computed(() => [
  { title: 'Todos los modelos', value: '' },
  ...facet(props.facets.models),
])
const typeItems = computed(() => [
  { title: 'Cualquier tipo', value: '' },
  ...(props.facets.types?.length
    ? facet(props.facets.types)
    : Object.entries(MOTO_TYPE_LABEL).map(([value, title]) => ({ title, value }))),
])
const bandItems = computed(() => [
  { title: 'Cualquier cilindrada', value: '' },
  ...(props.facets.bands?.length
    ? facet(props.facets.bands)
    : MOTO_DISPLACEMENT_BUCKETS.map(bucket => ({ title: bucket.label, value: bucket.id }))),
])
const departmentItems = computed(() => [
  { title: 'Todo el país', value: '' },
  ...(props.facets.departments?.length
    ? facet(props.facets.departments)
    : CAR_DEPARTMENTS.map(value => ({ title: value, value }))),
])
const fuelItems = [
  { title: 'Cualquier motor', value: '' },
  ...Object.entries(MOTO_FUEL_LABEL).map(([value, title]) => ({ title, value })),
]
const sellerItems = [
  { title: 'Agencia o particular', value: '' },
  ...Object.entries(MOTO_SELLER_LABEL).map(([value, title]) => ({ title, value })),
]
const colorItems = computed(() => [
  { title: 'Cualquier color', value: '' },
  ...(props.facets.colors?.length
    ? facet(props.facets.colors)
    : MOTO_COLORS.map(value => ({ title: MOTO_COLOR_LABEL[value] ?? value, value }))),
])
const sourceItems = computed(() => [
  { title: 'Todas las fuentes', value: '' },
  ...facet(props.facets.sources),
])
const sinceItems = [
  { title: 'Cuando sea', value: '' },
  ...MOTO_SINCE_STEPS.map(value => ({
    title: value === 1 ? 'Hoy' : `En los últimos ${value} días`,
    value: String(value),
  })),
]

function apply() {
  // `clearable` deja el texto en null; los interruptores viajan como "1".
  emit(
    'apply',
    motoNormalizeQuery({
      ...draft,
      q: draft.q ?? '',
      bajo: draft.bajo ? '1' : '',
      sinRiesgo: draft.sinRiesgo ? '1' : '',
      unicoDueno: draft.unicoDueno ? '1' : '',
      sort: props.query.sort,
    })
  )
}
function clear() {
  emit('apply', motoNormalizeQuery({ sort: props.query.sort }))
}
</script>

<style scoped>
.moto-filters__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.moto-filters__group {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin-top: 4px;
}
.moto-filters__group > summary {
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
.moto-filters__group > summary::-webkit-details-marker {
  display: none;
}
.moto-filters__group > summary::after {
  content: '';
  margin-left: auto;
  width: 9px;
  height: 9px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-2px) rotate(45deg);
  transition: transform 150ms ease;
}
.moto-filters__group[open] > summary::after {
  transform: translateY(2px) rotate(225deg);
}
@media (prefers-reduced-motion: reduce) {
  .moto-filters__group > summary::after {
    transition: none;
  }
}
.moto-filters__group > summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.moto-filters__count {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.moto-filters__group-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}
</style>
