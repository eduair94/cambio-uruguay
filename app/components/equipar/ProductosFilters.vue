<template>
  <CarsFilterPanel
    :mobile="mobile"
    :open="open"
    :total="total"
    noun="aviso"
    noun-plural="avisos"
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
      v-if="!fixedCategoria"
      v-model="draft.categoria"
      :items="categoriaItems"
      label="Categoría"
      density="comfortable"
      variant="outlined"
      hide-details
      @update:model-value="draft.variante = ''"
    />
    <VSelect
      v-if="draft.categoria && (facets.variantes?.length ?? 0) > 0"
      v-model="draft.variante"
      :items="varianteItems"
      label="Tamaño o tipo"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.condicion"
      :items="condicionItems"
      label="Condición"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <div class="eq-filters__pair">
      <VTextField
        v-model="draft.precioMin"
        label="$ mín."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VTextField
        v-model="draft.precioMax"
        label="$ máx."
        inputmode="numeric"
        density="comfortable"
        variant="outlined"
        hide-details
      />
    </div>
    <VSelect
      v-model="draft.marca"
      :items="marcaItems"
      label="Marca"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.fuente"
      :items="fuenteItems"
      label="Fuente"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <VSelect
      v-model="draft.vendedor"
      :items="vendedorItems"
      label="Vendedor"
      density="comfortable"
      variant="outlined"
      hide-details
    />
    <!-- Sólo monopatines: la ficha técnica que declara el vendedor (currency-movilidad-specs). -->
    <fieldset v-if="fichaFacets" class="eq-filters__ficha">
      <legend class="eq-filters__legend">Ficha técnica</legend>
      <VSelect
        v-model="draft.autonomia"
        :items="fichaItems('autonomia', draft.autonomia, monopatinAutonomiaLabel)"
        label="Autonomía declarada"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VSelect
        v-model="draft.velocidad"
        :items="fichaItems('velocidad', draft.velocidad)"
        label="Velocidad máxima"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VSelect
        v-model="draft.potencia"
        :items="fichaItems('potencia', draft.potencia)"
        label="Potencia del motor"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VSelect
        v-model="draft.carga"
        :items="fichaItems('carga', draft.carga, monopatinCargaLabel)"
        label="Peso que soporta"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VSelect
        v-model="draft.peso"
        :items="fichaItems('peso', draft.peso, monopatinPesoLabel)"
        label="Peso del monopatín"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VSelect
        v-model="draft.rueda"
        :items="fichaItems('rueda', draft.rueda)"
        label="Ruedas"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <div
        v-if="rasgoItems.length"
        class="eq-filters__checks"
        role="group"
        aria-label="Características"
      >
        <VCheckbox
          v-for="rasgo in rasgoItems"
          :key="rasgo.value"
          v-model="draft.rasgos"
          :value="rasgo.value"
          :label="rasgo.title"
          density="compact"
          hide-details
        />
      </div>
      <VSwitch
        v-model="draft.soloFicha"
        label="Sólo avisos con ficha técnica"
        color="primary"
        density="compact"
        hide-details
        inset
      />
      <p class="text-caption text-medium-emphasis mb-0">
        La ficha es lo que declara el vendedor.
        <template v-if="total !== null">
          {{ fichaFacets.conFicha.toLocaleString('es-UY') }} de
          {{ total.toLocaleString('es-UY') }} avisos de esta búsqueda la tienen;
        </template>
        un aviso que no declara un dato no cumple ese filtro.
      </p>
    </fieldset>
    <p class="text-caption text-medium-emphasis mb-0">
      Los precios en dólares se filtran por su equivalente en pesos a la cotización del día. Un
      aviso de Marketplace es usado salvo que el vendedor diga que es nuevo.
    </p>
  </CarsFilterPanel>
</template>

<script setup lang="ts">
import {
  monopatinAutonomiaLabel,
  monopatinCargaLabel,
  monopatinFichaPanelVisible,
  monopatinPesoLabel,
} from '~/utils/monopatinFicha'
import {
  EQUIPAR_CONDICION_LABELS,
  EQUIPAR_FUENTE_LABELS,
  equiparProductosNormalize,
  type EquiparProductosFacet,
  type EquiparProductosFacets,
  type EquiparProductosQuery,
  type RetailProductosVertical,
} from '~/utils/equiparProductos'

const props = withDefaults(
  defineProps<{
    query: EquiparProductosQuery
    facets: EquiparProductosFacets
    /** On a per-category page the category comes from the route and is not a field. */
    fixedCategoria?: string
    /** Mobile: a full-height drawer; desktop: the sticky column. Same panel as autos. */
    mobile?: boolean
    open?: boolean
    total?: number | null
    /** Contra qué vocabulario se valida la categoría al aplicar: sin esto, aplicar un filtro en
     * movilidad borraba su propia categoría (el normalizador la validaba contra la de equipar). */
    vertical?: RetailProductosVertical
  }>(),
  { fixedCategoria: '', mobile: false, open: false, total: null, vertical: 'equipar' }
)
const emit = defineEmits<{
  apply: [query: EquiparProductosQuery]
  'update:open': [value: boolean]
}>()

const toDraft = (query: EquiparProductosQuery) => ({
  q: query.q as string | null,
  categoria: query.categoria,
  variante: query.variante,
  condicion: query.condicion as string,
  fuente: query.fuente as string,
  vendedor: query.vendedor,
  marca: query.marca,
  precioMin: query.precioMin?.toString() ?? '',
  precioMax: query.precioMax?.toString() ?? '',
  autonomia: query.ficha?.autonomia?.toString() ?? '',
  velocidad: query.ficha?.velocidad ?? '',
  potencia: query.ficha?.potencia ?? '',
  // Sin campo propio en el panel: la pide el asesor, y aplicar otro filtro no la tiene que perder.
  potenciaMin: query.ficha?.potenciaMin?.toString() ?? '',
  carga: query.ficha?.carga?.toString() ?? '',
  peso: query.ficha?.peso?.toString() ?? '',
  rueda: query.ficha?.rueda ?? '',
  rasgos: [...(query.ficha?.rasgos ?? [])] as string[],
  soloFicha: query.ficha?.soloFicha ?? false,
})
const draft = reactive(toDraft(props.query))
watch(
  () => props.query,
  next => Object.assign(draft, toDraft(next))
)

/*
 * Every facet is read with `?? []`: during a deploy the browser can already run the new JS while
 * the API still answers the old JSON without a facet — `facets.x.length` then kills the panel's
 * render and the drawer never opens (measured on autos with `bodies`).
 */
const facet = (rows: EquiparProductosFacet[] | undefined) =>
  (rows ?? []).map(row => ({ title: `${row.name} (${row.count})`, value: row.slug }))

const categoriaItems = computed(() => [
  { title: 'Todas las categorías', value: '' },
  ...facet(props.facets.categorias),
])
const varianteItems = computed(() => [
  { title: 'Cualquier tamaño', value: '' },
  ...facet(props.facets.variantes),
])
const condicionItems = computed(() => [
  { title: 'Nuevo y usado', value: '' },
  ...(props.facets.condiciones?.length
    ? facet(props.facets.condiciones)
    : Object.entries(EQUIPAR_CONDICION_LABELS).map(([value, title]) => ({ title, value }))),
])
const fuenteItems = computed(() => [
  { title: 'Todas las fuentes', value: '' },
  ...(props.facets.fuentes?.length
    ? facet(props.facets.fuentes)
    : Object.entries(EQUIPAR_FUENTE_LABELS).map(([value, title]) => ({ title, value }))),
])
const marcaItems = computed(() => [
  { title: 'Todas las marcas', value: '' },
  ...facet(props.facets.marcas),
])
const vendedorItems = computed(() => [
  { title: 'Todos los vendedores', value: '' },
  ...facet(props.facets.vendedores),
])

type FichaFacetKey = 'autonomia' | 'velocidad' | 'potencia' | 'carga' | 'peso' | 'rueda'

const fichaFacets = computed(() =>
  monopatinFichaPanelVisible(props.facets.ficha, props.query.ficha) ? props.facets.ficha! : null
)

/**
 * Las opciones de una faceta de ficha con su conteo. Un valor que pidió el asesor y no está entre
 * las opciones del panel (16 km) se agrega, para que el campo no se vea vacío con el filtro puesto.
 */
function fichaItems(key: FichaFacetKey, current: string, label?: (value: number) => string) {
  const rows = (fichaFacets.value?.[key] ?? []).map(row => ({
    title: `${row.name} (${row.count})`,
    value: row.slug,
  }))
  if (current && !rows.some(row => row.value === current)) {
    rows.unshift({ title: label ? label(Number(current)) : current, value: current })
  }
  return [{ title: 'Cualquiera', value: '' }, ...rows]
}

const rasgoItems = computed(() =>
  (fichaFacets.value?.rasgos ?? []).map(row => ({
    title: `${row.name} (${row.count})`,
    value: row.slug,
  }))
)

function apply() {
  // VTextField `clearable` sets the model to null; the normalizer only reads strings.
  emit(
    'apply',
    equiparProductosNormalize(
      {
        ...draft,
        rasgos: draft.rasgos.join(','),
        ficha: draft.soloFicha ? '1' : '',
        q: draft.q ?? '',
        categoria: props.fixedCategoria || draft.categoria,
        orden: props.query.orden,
      },
      props.vertical
    )
  )
}
function clear() {
  emit(
    'apply',
    equiparProductosNormalize(
      { categoria: props.fixedCategoria, orden: props.query.orden },
      props.vertical
    )
  )
}
</script>

<style scoped>
.eq-filters__ficha {
  display: grid;
  gap: 12px;
  margin: 8px 0 0;
  padding: 0;
  border: 0;
}
/* La leyenda no es un hijo del grid del fieldset: su separación va declarada (DESIGN.md). */
.eq-filters__legend {
  margin-bottom: 4px;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.8;
}
.eq-filters__checks {
  display: grid;
  gap: 0;
}
.eq-filters__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
