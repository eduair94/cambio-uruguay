<template>
  <section class="ua-filters" aria-label="Buscar y filtrar apps">
    <VTextField
      :model-value="state.q"
      label="Buscá una app o un trámite"
      placeholder="ómnibus, luz, BPS, cédula…"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      hide-details
      class="ua-filters__search"
      :maxlength="USEFUL_APPS_MAX_QUERY"
      @update:model-value="onQuery"
    />

    <button
      type="button"
      class="ua-filters__toggle"
      :aria-expanded="open ? 'true' : 'false'"
      aria-controls="ua-more-filters"
      @click="open = !open"
    >
      <VIcon size="20" aria-hidden="true">mdi-tune-variant</VIcon>
      Más filtros<span v-if="moreCount"> ({{ moreCount }})</span>
      <VIcon class="ua-filters__chevron" size="20" aria-hidden="true">mdi-chevron-down</VIcon>
    </button>

    <div id="ua-more-filters" class="ua-filters__more" :class="{ 'ua-filters__more--open': open }">
      <div class="ua-filter">
        <span id="ua-filter-tipo" class="ua-filter__label">Quién la hace</span>
        <VBtnToggle
          :model-value="state.tipo"
          mandatory
          variant="outlined"
          color="primary"
          density="comfortable"
          class="cu-btn-grid"
          aria-labelledby="ua-filter-tipo"
          @update:model-value="onTipo"
        >
          <VBtn v-for="option in USEFUL_APPS_KIND_FILTERS" :key="option.id" :value="option.id">
            {{ option.label }}
          </VBtn>
        </VBtnToggle>
      </div>
      <div class="ua-filter">
        <span id="ua-filter-plataforma" class="ua-filter__label">Tu celular</span>
        <VBtnToggle
          :model-value="state.plataforma"
          mandatory
          variant="outlined"
          color="primary"
          density="comfortable"
          class="cu-btn-grid"
          aria-labelledby="ua-filter-plataforma"
          @update:model-value="onPlataforma"
        >
          <VBtn value="todas">Cualquiera</VBtn>
          <VBtn value="android" prepend-icon="mdi-android">Android</VBtn>
          <VBtn value="ios" prepend-icon="mdi-apple">iPhone</VBtn>
        </VBtnToggle>
      </div>
      <VSelect
        :model-value="state.depto || ALL_COUNTRY"
        :items="departmentItems"
        label="Dónde vivís"
        variant="outlined"
        density="comfortable"
        hide-details
        class="ua-filter__select"
        @update:model-value="onDepto"
      />
      <VSelect
        :model-value="state.orden"
        :items="sortItems"
        label="Ordenar"
        variant="outlined"
        density="comfortable"
        hide-details
        class="ua-filter__select"
        @update:model-value="onOrden"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
// Los controles de Vuetify emiten al montar: cada handler compara con el estado actual y sólo
// avisa un cambio de verdad, así el eco del montaje no reescribe la URL ni resetea nada.
import {
  USEFUL_APPS_KIND_FILTERS,
  USEFUL_APPS_MAX_QUERY,
  USEFUL_APPS_SORTS,
  type UsefulAppDepartment,
  type UsefulAppsKindFilter,
  type UsefulAppsSort,
  type UsefulAppsState,
  usefulAppsActiveFilterCount,
} from '~/utils/usefulApps'

const props = defineProps<{ state: UsefulAppsState; departments: readonly UsefulAppDepartment[] }>()
const emit = defineEmits<{ update: [patch: Partial<UsefulAppsState>] }>()

const ALL_COUNTRY = 'todo-el-pais'
const open = ref(false)

const moreCount = computed(
  () => usefulAppsActiveFilterCount(props.state) - (props.state.q.trim() ? 1 : 0)
)
const departmentItems = computed(() => [
  { title: 'Todo el país', value: ALL_COUNTRY },
  ...props.departments.map(d => ({ title: d, value: d })),
])
const sortItems = USEFUL_APPS_SORTS.map(sort => ({ title: sort.label, value: sort.id }))

function onQuery(value: string | null) {
  const q = (value ?? '').slice(0, USEFUL_APPS_MAX_QUERY)
  if (q !== props.state.q) emit('update', { q })
}
function onTipo(value: unknown) {
  if (typeof value === 'string' && value !== props.state.tipo) {
    emit('update', { tipo: value as UsefulAppsKindFilter })
  }
}
function onPlataforma(value: unknown) {
  if (
    (value === 'todas' || value === 'android' || value === 'ios') &&
    value !== props.state.plataforma
  ) {
    emit('update', { plataforma: value })
  }
}
function onDepto(value: unknown) {
  const depto =
    value === ALL_COUNTRY || typeof value !== 'string' ? '' : (value as UsefulAppDepartment)
  if (depto !== props.state.depto) emit('update', { depto })
}
function onOrden(value: unknown) {
  if (typeof value === 'string' && value !== props.state.orden) {
    emit('update', { orden: value as UsefulAppsSort })
  }
}
</script>

<style scoped>
.ua-filters {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.ua-filters__toggle {
  display: none;
  gap: 8px;
  align-items: center;
  justify-self: start;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
}
.ua-filters__toggle[aria-expanded='true'] .ua-filters__chevron {
  transform: rotate(180deg);
}
.ua-filters__more {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: flex-end;
}
.ua-filter {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.ua-filter__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.75;
}
.ua-filter__select {
  flex: 1 1 200px;
  max-width: 260px;
}
@media (max-width: 959px) {
  .ua-filters__toggle {
    display: inline-flex;
  }
  .ua-filters__more {
    display: none;
  }
  .ua-filters__more--open {
    display: grid;
    gap: 24px;
  }
  .ua-filter__select {
    max-width: none;
  }
}
</style>
