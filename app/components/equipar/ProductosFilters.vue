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
    <p class="text-caption text-medium-emphasis mb-0">
      Los precios en dólares se filtran por su equivalente en pesos a la cotización del día. Un
      aviso de Marketplace es usado salvo que el vendedor diga que es nuevo.
    </p>
  </CarsFilterPanel>
</template>

<script setup lang="ts">
import {
  EQUIPAR_CONDICION_LABELS,
  EQUIPAR_FUENTE_LABELS,
  equiparProductosNormalize,
  type EquiparProductosFacet,
  type EquiparProductosFacets,
  type EquiparProductosQuery,
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
  }>(),
  { fixedCategoria: '', mobile: false, open: false, total: null }
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

function apply() {
  // VTextField `clearable` sets the model to null; the normalizer only reads strings.
  emit(
    'apply',
    equiparProductosNormalize({
      ...draft,
      q: draft.q ?? '',
      categoria: props.fixedCategoria || draft.categoria,
      orden: props.query.orden,
    })
  )
}
function clear() {
  emit(
    'apply',
    equiparProductosNormalize({ categoria: props.fixedCategoria, orden: props.query.orden })
  )
}
</script>

<style scoped>
.eq-filters__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
