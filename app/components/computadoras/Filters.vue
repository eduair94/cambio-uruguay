<template>
  <!-- El mismo panel que autos y motos (columna en escritorio, cajón en el celular, "Ver N avisos"). -->
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
      v-model="draft.tipo"
      :items="tipoItems"
      label="Qué buscás"
      density="comfortable"
      variant="outlined"
      hide-details
      data-testid="filtro-tipo"
    />
    <VSelect
      v-if="(facets.brands?.length ?? 0) > 0"
      v-model="draft.marcaEquipo"
      :items="equipmentBrandItems"
      label="Marca del equipo"
      density="comfortable"
      variant="outlined"
      hide-details
      data-testid="filtro-marca-equipo"
      @update:model-value="draft.linea = ''"
    />
    <!-- La línea sólo con una marca elegida, y sólo la de la marca APLICADA: sin marca serían cien
         opciones, y con la marca a medio cambiar mostraría las líneas de la anterior. -->
    <VSelect
      v-if="draft.marcaEquipo && draft.marcaEquipo === query.marcaEquipo && lineItems.length > 1"
      v-model="draft.linea"
      :items="lineItems"
      label="Línea"
      density="comfortable"
      variant="outlined"
      hide-details
      data-testid="filtro-linea"
    />
    <VSelect
      v-model="draft.marca"
      :items="brandItems"
      label="Marca del procesador"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="draft.familia = ''"
    />
    <VSelect
      v-if="(facets.cpuFamilies?.length ?? 0) > 0"
      v-model="draft.familia"
      :items="familyItems"
      label="Familia del procesador"
      density="comfortable"
      variant="outlined"
      hide-details
      data-testid="filtro-familia"
    />
    <VSelect
      v-model="draft.cpuAnio"
      :items="cpuYearItems"
      label="Qué tan nuevo es el procesador"
      hint="El año en que salió su serie: un «i7» sin modelo no tiene año y no entra"
      persistent-hint
      density="comfortable"
      variant="outlined"
      data-testid="filtro-cpu-anio"
    />
    <VSelect
      v-if="(facets.gpus?.length ?? 0) > 0"
      v-model="draft.placa"
      :items="gpuItems"
      label="Placa de video"
      density="comfortable"
      variant="outlined"
      hide-details
      data-testid="filtro-placa"
    />
    <VCheckbox
      v-model="draft.dedicada"
      label="Sólo con placa de video dedicada"
      density="compact"
      hide-details
    />
    <VSelect
      v-model="draft.ramMin"
      :items="ramItems"
      label="RAM mínima"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VCheckbox v-model="draft.ssd" label="Sólo con disco SSD" density="compact" hide-details />
    <div class="pc-filters__pair">
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
    <VCheckbox
      v-model="draft.oportunidad"
      label="Sólo oportunidades"
      density="compact"
      hide-details
      data-testid="filtro-oportunidad"
    />
    <VCheckbox
      v-model="draft.debajo"
      label="Pide menos de lo que vale"
      density="compact"
      hide-details
      data-testid="filtro-debajo"
    />
    <!--
      Lo de arriba es con lo que se empieza (qué es, qué tiene adentro, cuánto sale). El resto vive
      acá adentro, cerrado y sin montar, como en autos y motos: abre solo si ya hay alguno puesto,
      así un filtro vigente nunca queda escondido.
    -->
    <details
      class="pc-filters__group"
      :open="moreOpen"
      @toggle="moreOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary data-testid="pc-filters-more">
        Más filtros
        <span v-if="moreCount" class="pc-filters__count">({{ moreCount }})</span>
      </summary>
      <div v-if="moreOpen" class="pc-filters__group-fields">
        <VSelect
          v-model="draft.evidencia"
          :items="tierItems"
          label="Evidencia de la oportunidad"
          density="comfortable"
          variant="outlined"
          hide-details
          data-testid="filtro-evidencia"
        />
        <VSelect
          v-model="draft.ramTipo"
          :items="ramTypeItems"
          label="Tipo de RAM"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.discoMin"
          :items="diskItems"
          label="Almacenamiento mínimo"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.pantalla"
          :items="screenItems"
          label="Pantalla"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.vramMin"
          :items="vramItems"
          label="Memoria de la placa de video"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.estado"
          :items="conditionItems"
          label="Estado declarado"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VSelect
          v-model="draft.vendedor"
          :items="sellerItems"
          label="Quién vende"
          hint="Sólo lo sabemos en Mercado Libre: un aviso de Facebook no entra en ninguno de los dos"
          persistent-hint
          density="comfortable"
          variant="outlined"
        />
        <VSelect
          v-model="draft.departamento"
          :items="departmentItems"
          label="Departamento"
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
          label="Publicado"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <VCheckbox
          v-model="draft.conDatos"
          label="Con al menos tres datos leídos"
          density="compact"
          hide-details
        />
        <VCheckbox v-model="draft.monitor" label="Incluye monitor" density="compact" hide-details />
        <VCheckbox
          v-model="draft.sinFallas"
          label="Sin fallas declaradas"
          density="compact"
          hide-details
        />
        <p class="text-caption text-medium-emphasis mb-0">
          «Sin fallas declaradas» quiere decir que el aviso no dice que algo falle, no que la
          máquina ande. «Con al menos tres datos leídos» deja los avisos que dicen, por ejemplo,
          procesador, RAM y disco. «Pide menos de lo que vale» compara una PC contra lo que salen
          hoy sus mismas piezas (sólo si todas tienen precio), y una notebook contra lo que piden
          por notebooks iguales.
        </p>
      </div>
    </details>
  </CarsFilterPanel>
</template>

<script setup lang="ts">
import {
  COMPUTER_CONDITION_LABEL,
  COMPUTER_CPU_YEAR_STEPS,
  COMPUTER_DISK_STEPS,
  COMPUTER_KIND_LABEL,
  COMPUTER_MACHINE_KINDS,
  COMPUTER_PART_KINDS,
  COMPUTER_RAM_STEPS,
  COMPUTER_RAM_TYPES,
  COMPUTER_SCREEN_SIZES,
  COMPUTER_SELLER_LABEL,
  COMPUTER_SINCE_STEPS,
  COMPUTER_TIER_LABEL,
  COMPUTER_VRAM_STEPS,
  computerGbLabel,
  computerNormalizeQuery,
  type ComputerFacet,
  type ComputerFacets,
  type ComputerQuery,
} from '~/utils/computadoras'
import { CAR_DEPARTMENTS } from '~/utils/cars'

const props = withDefaults(
  defineProps<{
    query: ComputerQuery
    facets: ComputerFacets
    mobile?: boolean
    open?: boolean
    total?: number | null
  }>(),
  { mobile: false, open: false, total: null }
)
const emit = defineEmits<{ apply: [query: ComputerQuery]; 'update:open': [value: boolean] }>()

const text = (value: number | null) => (value == null ? '' : String(value))
const toDraft = (query: ComputerQuery) => ({
  q: query.q as string | null,
  tipo: query.tipo as string,
  marcaEquipo: query.marcaEquipo,
  linea: query.linea,
  marca: query.marca as string,
  familia: query.familia,
  cpuAnio: text(query.cpuAnio),
  placa: query.placa,
  dedicada: query.dedicada,
  ramMin: text(query.ramMin),
  ssd: query.ssd,
  precioMinUsd: text(query.precioMinUsd),
  precioMaxUsd: text(query.precioMaxUsd),
  oportunidad: query.oportunidad,
  debajo: query.debajo,
  evidencia: query.evidencia as string,
  ramTipo: query.ramTipo as string,
  discoMin: text(query.discoMin),
  pantalla: query.pantalla as string,
  vramMin: text(query.vramMin),
  estado: query.estado as string,
  vendedor: query.vendedor as string,
  departamento: query.departamento,
  fuente: query.fuente as string,
  dias: text(query.dias),
  conDatos: query.conDatos,
  monitor: query.monitor,
  sinFallas: query.sinFallas,
})
const draft = reactive(toDraft(props.query))
watch(
  () => props.query,
  next => Object.assign(draft, toDraft(next))
)

const moreCount = computed(
  () =>
    [
      draft.evidencia,
      draft.ramTipo,
      draft.discoMin,
      draft.pantalla,
      draft.vramMin,
      draft.estado,
      draft.vendedor,
      draft.departamento,
      draft.fuente,
      draft.dias,
    ].filter(Boolean).length +
    [draft.conDatos, draft.monitor, draft.sinFallas].filter(Boolean).length
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
const facet = (rows: ComputerFacet[] | undefined) =>
  (rows ?? []).map(row => ({ title: `${row.label} (${row.count})`, value: row.value }))
const kindCount = (kind: string) => props.facets.kinds?.find(row => row.value === kind)?.count

/** El tipo en dos grupos (computadoras y piezas), cada uno con su «todas»: el valor vacío es la
 * vista por defecto, que son las computadoras enteras. */
const tipoItems = computed(() => {
  const withCount = (kind: string) => {
    const count = kindCount(kind)
    const label = COMPUTER_KIND_LABEL[kind as keyof typeof COMPUTER_KIND_LABEL] ?? kind
    return { title: count != null ? `${label} (${count})` : label, value: kind }
  }
  return [
    { title: 'Computadoras (todas)', value: '' },
    ...COMPUTER_MACHINE_KINDS.map(withCount),
    { title: 'Piezas sueltas (todas)', value: 'piezas' },
    ...COMPUTER_PART_KINDS.map(withCount),
    { title: 'Computadoras y piezas', value: 'todos' },
  ]
})
const equipmentBrandItems = computed(() => [
  { title: 'Cualquier marca', value: '' },
  ...facet(props.facets.brands),
])
const lineItems = computed(() => [
  { title: 'Cualquier línea', value: '' },
  ...facet(props.facets.lines),
])
const brandItems = computed(() => [
  { title: 'Cualquier marca', value: '' },
  ...(props.facets.cpuBrands?.length
    ? facet(props.facets.cpuBrands)
    : [
        { title: 'Intel', value: 'intel' },
        { title: 'AMD', value: 'amd' },
        { title: 'Apple', value: 'apple' },
      ]),
])
const familyItems = computed(() => [
  { title: 'Cualquier familia', value: '' },
  ...facet(props.facets.cpuFamilies),
])
const cpuYearItems = [
  { title: 'Cualquiera', value: '' },
  ...[...COMPUTER_CPU_YEAR_STEPS]
    .reverse()
    .map(year => ({ title: `Procesador de ${year} o más nuevo`, value: String(year) })),
]
const gpuItems = computed(() => [
  { title: 'Cualquier placa', value: '' },
  ...facet(props.facets.gpus),
])
const ramItems = computed(() => [
  { title: 'Cualquier cantidad', value: '' },
  ...COMPUTER_RAM_STEPS.map(step => {
    const count = props.facets.rams?.find(row => row.value === String(step))?.count
    return {
      title: count != null ? `${step} GB o más (${count})` : `${step} GB o más`,
      value: String(step),
    }
  }),
])
const tierItems = [
  { title: 'Cualquiera', value: '' },
  ...Object.entries(COMPUTER_TIER_LABEL).map(([value, title]) => ({ title, value })),
]
const ramTypeItems = [
  { title: 'Cualquiera', value: '' },
  ...COMPUTER_RAM_TYPES.map(value => ({ title: value.toUpperCase(), value })),
]
const diskItems = [
  { title: 'Cualquiera', value: '' },
  ...COMPUTER_DISK_STEPS.map(gb => ({ title: `${computerGbLabel(gb)} o más`, value: String(gb) })),
]
const screenItems = [
  { title: 'Cualquier tamaño', value: '' },
  ...Object.entries(COMPUTER_SCREEN_SIZES).map(([value, size]) => ({ title: size.label, value })),
]
const vramItems = [
  { title: 'Cualquiera', value: '' },
  ...COMPUTER_VRAM_STEPS.map(gb => ({ title: `${gb} GB o más`, value: String(gb) })),
]
const conditionItems = [
  { title: 'Cualquiera', value: '' },
  ...Object.entries(COMPUTER_CONDITION_LABEL).map(([value, title]) => ({ title, value })),
]
const sellerItems = [
  { title: 'Tienda o particular', value: '' },
  ...Object.entries(COMPUTER_SELLER_LABEL).map(([value, title]) => ({ title, value })),
]
const departmentItems = computed(() => [
  { title: 'Todo el país', value: '' },
  ...(props.facets.departments?.length
    ? facet(props.facets.departments)
    : CAR_DEPARTMENTS.map(value => ({ title: value, value }))),
])
const sourceItems = computed(() => [
  { title: 'Todas las fuentes', value: '' },
  ...facet(props.facets.sources),
])
const sinceItems = [
  { title: 'Cuando sea', value: '' },
  ...COMPUTER_SINCE_STEPS.map(value => ({
    title: value === 1 ? 'Hoy' : `En los últimos ${value} días`,
    value: String(value),
  })),
]

function apply() {
  // `clearable` deja el texto en null; los interruptores viajan como "1".
  emit(
    'apply',
    computerNormalizeQuery({
      ...draft,
      q: draft.q ?? '',
      // El procesador exacto llega sólo por enlace (la tabla de componentes) y no tiene control
      // propio: se conserva mientras la marca y la familia no cambien.
      procesador:
        draft.marca === props.query.marca && draft.familia === props.query.familia
          ? props.query.procesador
          : '',
      dedicada: draft.dedicada ? '1' : '',
      ssd: draft.ssd ? '1' : '',
      sinFallas: draft.sinFallas ? '1' : '',
      debajo: draft.debajo ? '1' : '',
      oportunidad: draft.oportunidad ? '1' : '',
      conDatos: draft.conDatos ? '1' : '',
      monitor: draft.monitor ? '1' : '',
      orden: props.query.orden,
    })
  )
}
function clear() {
  emit('apply', computerNormalizeQuery({ orden: props.query.orden }))
}
</script>

<style scoped>
.pc-filters__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.pc-filters__group {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  margin-top: 4px;
}
.pc-filters__group > summary {
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
.pc-filters__group > summary::-webkit-details-marker {
  display: none;
}
.pc-filters__group > summary::after {
  content: '';
  margin-left: auto;
  width: 9px;
  height: 9px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-2px) rotate(45deg);
  transition: transform 150ms ease;
}
.pc-filters__group[open] > summary::after {
  transform: translateY(2px) rotate(225deg);
}
@media (prefers-reduced-motion: reduce) {
  .pc-filters__group > summary::after {
    transition: none;
  }
}
.pc-filters__group > summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.pc-filters__count {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-filters__group-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}
</style>
