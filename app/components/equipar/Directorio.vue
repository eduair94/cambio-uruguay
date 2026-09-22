<template>
  <div>
    <!--
      On mobile the filters are a drawer that teleports to the body, so it lives OUTSIDE the grid:
      inside the layout cell, the dialog's vnode patched against a cell that mobile does not
      render and Vue died in `shouldUpdateComponent` (measured on /autos-usados-uruguay). There
      are never two: either the drawer or the column.
    -->
    <EquiparProductosFilters
      v-if="smAndDown"
      v-model:open="filtersOpen"
      :query="query"
      :facets="facets"
      :fixed-categoria="fixedCategoria"
      mobile
      :total="data?.total ?? null"
      @apply="apply"
    />

    <CarsSidebarLayout>
      <template #filters>
        <EquiparProductosFilters
          v-if="!smAndDown"
          :query="query"
          :facets="facets"
          :fixed-categoria="fixedCategoria"
          :total="data?.total ?? null"
          @apply="apply"
        />
      </template>
      <template #default>
        <CarsToolbar
          v-if="smAndDown"
          :sort="query.orden"
          :items="EQUIPAR_PRODUCTOS_SORT_ITEMS"
          :active-count="chips.length"
          :open="filtersOpen"
          @open="filtersOpen = true"
          @update:sort="
            value => emit('update', { ...query, orden: value as EquiparProductosSort, page: 1 })
          "
        />
        <EquiparActiveFilters
          :chips="chips"
          @remove="keys => emit('remove', keys)"
          @clear="emit('clear')"
        />
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
          <h2 :id="anchorId" class="text-h6 mb-0 eq-anchor">
            {{ data ? `${data.total.toLocaleString('es-UY')} avisos` : 'Avisos' }}
            <span v-if="data?.suspect" class="text-caption text-medium-emphasis eq-suspect">
              (+{{ data.suspect }} con precio dudoso, fuera de la lista)
            </span>
          </h2>
          <VSelect
            v-if="!smAndDown"
            :model-value="query.orden"
            :items="EQUIPAR_PRODUCTOS_SORT_ITEMS"
            label="Ordenar"
            density="compact"
            variant="outlined"
            hide-details
            class="eq-sort"
            @update:model-value="value => emit('update', { ...query, orden: value, page: 1 })"
          />
        </div>

        <VAlert v-if="error" type="warning" variant="outlined" class="mb-4">
          El directorio se está actualizando. Probá de nuevo en unos minutos.
        </VAlert>
        <p v-else-if="data && !data.items.length" class="text-body-1">
          No hay avisos con esos filtros. Probá sacar la marca, ampliar el precio o mirar nuevo y
          usado a la vez.
        </p>

        <div v-if="data?.items.length" class="eq-grid">
          <EquiparListingCard
            v-for="producto in data.items"
            :key="producto.listingId"
            :producto="producto"
            :in-list="!hideList && lista.has(producto.listingId)"
            :hide-category="Boolean(fixedCategoria) || hideCategory"
            :hide-list="hideList"
            @toggle="toggle"
          />
        </div>
        <p
          v-if="!hideList && lista.limited.value"
          class="text-caption text-medium-emphasis mt-2"
          role="status"
        >
          La lista llegó a {{ EQUIPAR_LISTA_MAX }} ítems. Sacá alguno para agregar otro.
        </p>

        <VPagination
          v-if="data && data.total > data.perPage"
          :model-value="query.page"
          :length="Math.min(500, Math.ceil(data.total / data.perPage))"
          :total-visible="3"
          class="mt-6"
          @update:model-value="page => changePage(page)"
        />
      </template>
    </CarsSidebarLayout>
  </div>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import {
  EQUIPAR_LISTA_MAX,
  EQUIPAR_PRODUCTOS_SORT_ITEMS,
  equiparListaFromProducto,
  type EquiparFilterChip,
  type EquiparProductoPublic,
  type EquiparProductosFacets,
  type EquiparProductosQuery,
  type EquiparProductosResponse,
  type EquiparProductosSort,
} from '~/utils/equiparProductos'

const props = withDefaults(
  defineProps<{
    query: EquiparProductosQuery
    data: EquiparProductosResponse | null
    error: unknown
    facets: EquiparProductosFacets
    chips: EquiparFilterChip[]
    fixedCategoria?: string
    /** The results heading's id: paginating scrolls back to it. */
    anchorId?: string
    /**
     * "Mi lista" es de equipar una casa: el directorio de movilidad usa esta misma grilla sin ella
     * (ver `ListingCard.hideList`), así que tampoco muestra el aviso de tope de la lista.
     */
    hideList?: boolean
    /** La etiqueta de categoría no agrega nada cuando la página entera ES la categoría. */
    hideCategory?: boolean
  }>(),
  { fixedCategoria: '', anchorId: 'equipar-resultados', hideList: false, hideCategory: false }
)
const emit = defineEmits<{
  update: [query: EquiparProductosQuery]
  remove: [keys: ReadonlyArray<keyof EquiparProductosQuery>]
  clear: []
}>()

const { smAndDown } = useDisplay()
const filtersOpen = ref(false)
// The drawer is mobile-only: if the window grows with it open, the column already shows the filters.
watch(smAndDown, mobile => {
  if (!mobile) filtersOpen.value = false
})

const lista = useEquiparLista()
const toggle = (producto: EquiparProductoPublic) => {
  if (props.hideList) return
  lista.toggle(equiparListaFromProducto(producto))
}

function apply(next: EquiparProductosQuery) {
  filtersOpen.value = false
  emit('update', next)
}

/** Changing page also scrolls back to the top of the list; see utils/paginationScroll.ts. */
function changePage(page: number) {
  emit('update', { ...props.query, page })
  scrollToPageTop(props.anchorId)
}
</script>

<style scoped>
.eq-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .eq-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px;
  }
}
.eq-sort {
  max-width: 240px;
}
.eq-anchor {
  /* The site bar is fixed (65 px): without this the list heading hides right after paginating. */
  scroll-margin-top: 84px;
}
.eq-suspect {
  font-weight: 400;
  display: inline-block;
}
</style>
