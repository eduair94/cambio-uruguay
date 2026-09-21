<template>
  <div class="car-toolbar" data-testid="car-toolbar">
    <VBtn
      class="car-toolbar__filters"
      color="primary"
      variant="tonal"
      prepend-icon="mdi-tune-variant"
      aria-haspopup="dialog"
      aria-controls="car-mobile-filters-dialog"
      :aria-expanded="open"
      data-testid="car-filters-trigger"
      @click="emit('open')"
    >
      Filtros<span v-if="activeCount" class="car-toolbar__count">({{ activeCount }})</span>
    </VBtn>
    <VMenu>
      <template #activator="{ props: menuProps }">
        <VBtn
          v-bind="menuProps"
          class="car-toolbar__sort"
          variant="text"
          append-icon="mdi-chevron-down"
          data-testid="car-sort-trigger"
        >
          <VIcon start icon="mdi-swap-vertical" aria-hidden="true" />
          <span class="car-toolbar__sort-label">{{ sortLabel }}</span>
        </VBtn>
      </template>
      <VList density="comfortable" :selected="[sort]" data-testid="car-sort-menu">
        <VListItem
          v-for="item in items"
          :key="item.value"
          :value="item.value"
          :active="item.value === sort"
          @click="emit('update:sort', item.value)"
        >
          <VListItemTitle>{{ item.title }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** El valor de orden vigente, tal cual viaja en la URL. */
  sort: string
  items: ReadonlyArray<{ title: string; value: string; short?: string }>
  activeCount: number
  open: boolean
}>()
const emit = defineEmits<{ open: []; 'update:sort': [value: string] }>()

// El menú dice qué orden rige. Un VSelect acá mostraba "Vistos más recientem…" cortado:
// el texto largo es el valor, no la etiqueta, y en 390 px no entra. El botón usa la forma
// corta cuando la hay; el menú, siempre la larga, que es la que explica qué ordena.
const sortLabel = computed(() => {
  const item = props.items.find(entry => entry.value === props.sort)
  return item?.short ?? item?.title ?? 'Ordenar'
})
</script>

<style scoped>
.car-toolbar {
  position: sticky;
  /* Debajo del encabezado del sitio, como la barra de /alquileres-uruguay. */
  top: 64px;
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  background: rgb(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.car-toolbar :deep(.v-btn) {
  min-height: 44px;
  height: 44px;
  /* Vuetify pone los botones en versales. Acá el rotulo es una FRASE variable
     ("Vistos mas recientemente"), y en versales ocupa mas y se corta antes. */
  text-transform: none;
}
.car-toolbar__filters {
  padding-inline: 16px;
  letter-spacing: 0;
  font-size: 0.875rem;
  font-weight: 700;
}
.car-toolbar__count {
  /* El espacio del template lo come el compilador y quedaba "Filtros(1)". */
  margin-left: 5px;
}
.car-toolbar__sort {
  /* Empuja el orden contra el borde derecho; los filtros quedan bajo el pulgar. */
  margin-left: auto;
  min-width: 0;
  padding-inline: 10px;
  letter-spacing: 0;
  font-size: 0.875rem;
}
.car-toolbar__sort-label {
  display: block;
  min-width: 0;
  max-width: 42vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
