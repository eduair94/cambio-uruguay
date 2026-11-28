<!--
El directorio navegable: búsqueda, rubros (enlaces a la página de cada rubro), departamento,
orden, «sólo Instagram» y «poco comunes», los destacados de la primera página y la grilla con su
paginado. El estado vive en la URL (lo lee el servidor: un enlace compartido llega filtrado); cada
cambio reemplaza la URL y la página vuelve a pedir el listado.
-->
<template>
  <div class="emp-dir">
    <div class="emp-dir__search">
      <VTextField
        v-model="q"
        :label="
          rubro
            ? `Buscar en ${rubroInfo?.label.toLowerCase()}`
            : 'Buscar: tortas, mates, velas, Pocitos…'
        "
        prepend-inner-icon="mdi-magnify"
        density="comfortable"
        variant="outlined"
        hide-details
        clearable
        class="emp-dir__q"
        @click:clear="setQ('')"
      />
      <VBtn
        variant="tonal"
        color="primary"
        size="large"
        prepend-icon="mdi-dice-5-outline"
        :loading="rolling"
        @click="azar"
      >
        Uno al azar
      </VBtn>
    </div>

    <nav class="emp-dir__rubros" aria-label="Rubros">
      <NuxtLink :to="rubroHref(null)" class="emp-chip" :class="{ 'emp-chip--on': !rubro }">
        Todos
      </NuxtLink>
      <NuxtLink
        v-for="r in rubroChips"
        :key="r.slug"
        :to="rubroHref(r.slug)"
        class="emp-chip"
        :class="{ 'emp-chip--on': rubro === r.slug }"
        :aria-current="rubro === r.slug ? 'page' : undefined"
      >
        <VIcon size="16" aria-hidden="true">{{ r.icon }}</VIcon>
        <span>{{ r.label }}</span>
        <span class="emp-chip__n">{{ r.n }}</span>
      </NuxtLink>
    </nav>

    <div class="emp-dir__filters">
      <VSelect
        :model-value="state.depto"
        :items="deptoItems"
        label="Departamento"
        density="comfortable"
        variant="outlined"
        hide-details
        class="emp-dir__select"
        @update:model-value="v => update({ depto: v ?? null })"
      />
      <VSelect
        :model-value="state.orden"
        :items="ordenItems"
        label="Orden"
        density="comfortable"
        variant="outlined"
        hide-details
        class="emp-dir__select"
        @update:model-value="v => update({ orden: v })"
      />
      <VCheckbox
        :model-value="state.solo"
        :label="`Sólo Instagram (${response.facets.soloInstagram})`"
        density="comfortable"
        hide-details
        @update:model-value="v => update({ solo: !!v })"
      />
      <VCheckbox
        :model-value="state.raros"
        :label="`Poco comunes (${response.facets.raros})`"
        density="comfortable"
        hide-details
        @update:model-value="v => update({ raros: !!v })"
      />
    </div>

    <template v-if="response.destacados">
      <section
        v-if="response.destacados.raros.length"
        class="emp-strip"
        aria-labelledby="emp-raros"
      >
        <h2 id="emp-raros" class="emp-strip__title">
          <VIcon size="22" aria-hidden="true">mdi-star-four-points-outline</VIcon>
          Cosas que no sabías que existían
        </h2>
        <p class="emp-strip__intro">
          Lo que vende poca gente en Uruguay: tarjetas que se despliegan en 3D, figuras pintadas a
          mano, piezas que nadie más hace.
        </p>
        <div class="emp-strip__row">
          <EmprendimientosCard
            v-for="item in response.destacados.raros"
            :key="item.handle"
            :item="item"
            :now="now"
            compact
          />
        </div>
      </section>
      <section
        v-if="response.destacados.joyitas.length"
        class="emp-strip"
        aria-labelledby="emp-joyitas"
      >
        <h2 id="emp-joyitas" class="emp-strip__title">
          <VIcon size="22" aria-hidden="true">mdi-diamond-stone</VIcon>
          Joyitas: cuentas chicas que publican seguido
        </h2>
        <p class="emp-strip__intro">
          Menos de 3.000 seguidores y una publicación en el último mes: las que el algoritmo casi no
          muestra.
        </p>
        <div class="emp-strip__row">
          <EmprendimientosCard
            v-for="item in response.destacados.joyitas"
            :key="item.handle"
            :item="item"
            :now="now"
            compact
          />
        </div>
      </section>
    </template>

    <section id="todos" class="emp-dir__all" aria-labelledby="emp-todos">
      <div class="emp-dir__head">
        <h2 id="emp-todos" class="emp-strip__title">{{ allTitle }}</h2>
        <p class="emp-dir__count" role="status">
          {{ countLine }}
          <NuxtLink v-if="filtered" :to="clearHref" class="emp-dir__clear">
            Sacar los filtros
          </NuxtLink>
        </p>
      </div>
      <div v-if="response.items.length" class="emp-grid">
        <EmprendimientosCard
          v-for="(item, index) in response.items"
          :key="item.handle"
          :item="item"
          :now="now"
          :show-rubro="!rubro"
          :eager="index < 2"
        />
      </div>
      <p v-else class="emp-dir__empty">{{ emptyText }}</p>
      <nav v-if="response.pages > 1" class="emp-pager" aria-label="Páginas">
        <NuxtLink
          v-if="response.page > 1"
          :to="pageHref(response.page - 1)"
          class="emp-pager__link"
          rel="prev"
        >
          <VIcon size="18" aria-hidden="true">mdi-chevron-left</VIcon>
          Anterior
        </NuxtLink>
        <span class="emp-pager__where">Página {{ response.page }} de {{ response.pages }}</span>
        <NuxtLink
          v-if="response.page < response.pages"
          :to="pageHref(response.page + 1)"
          class="emp-pager__link"
          rel="next"
        >
          Siguiente
          <VIcon size="18" aria-hidden="true">mdi-chevron-right</VIcon>
        </NuxtLink>
      </nav>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  EMPRENDIMIENTO_DEPARTAMENTOS,
  EMPRENDIMIENTO_ORDENES,
  EMPRENDIMIENTO_RUBROS,
  EMPRENDIMIENTOS_PATH,
  emprendimientoRubro,
  emprendimientosFiltered,
  emprendimientosQuery,
  type EmprendimientosResponse,
  type EmprendimientosState,
} from '~/utils/emprendimientos'

const props = defineProps<{
  response: EmprendimientosResponse
  state: EmprendimientosState
  /** El rubro de la ruta (/emprendimientos-de-instagram-uruguay/<rubro>), o null en la portada. */
  rubro: string | null
  now: number
}>()

const localePath = useLocalePath()
const router = useRouter()
const rubroInfo = computed(() => emprendimientoRubro(props.rubro))
const basePath = computed(() =>
  localePath(props.rubro ? `${EMPRENDIMIENTOS_PATH}/${props.rubro}` : EMPRENDIMIENTOS_PATH)
)

function update(patch: Partial<EmprendimientosState>) {
  const next = { ...props.state, ...patch, pagina: patch.pagina ?? 1 }
  router.replace({
    path: basePath.value,
    query: emprendimientosQuery(next, true),
    hash: next.pagina > 1 ? '#todos' : undefined,
  })
}

// La búsqueda se escribe en la URL 400 ms después de la última tecla.
const q = ref(props.state.q)
watch(
  () => props.state.q,
  value => {
    if (value !== q.value) q.value = value
  }
)
let timer: ReturnType<typeof setTimeout> | null = null
watch(q, value => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => setQ(value ?? ''), 400)
})
function setQ(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, 60)
  if (clean !== props.state.q) update({ q: clean })
}
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

const rubroChips = computed(() =>
  EMPRENDIMIENTO_RUBROS.map(r => ({ ...r, n: props.response.facets.rubros[r.slug] ?? 0 })).filter(
    r => r.n > 0 || r.slug === props.rubro
  )
)
function rubroHref(slug: string | null) {
  const query = emprendimientosQuery(
    { ...props.state, rubro: null, pagina: 1, orden: props.state.orden },
    true
  )
  return {
    path: localePath(slug ? `${EMPRENDIMIENTOS_PATH}/${slug}` : EMPRENDIMIENTOS_PATH),
    query,
  }
}
const deptoItems = computed(() => [
  { title: 'Todo el país', value: null },
  ...EMPRENDIMIENTO_DEPARTAMENTOS.filter(
    d => (props.response.facets.departamentos[d.slug] ?? 0) > 0 || d.slug === props.state.depto
  ).map(d => ({
    title: `${d.label} (${props.response.facets.departamentos[d.slug] ?? 0})`,
    value: d.slug,
  })),
])
const ordenItems = EMPRENDIMIENTO_ORDENES.map(o => ({ title: o.label, value: o.id }))

const filtered = computed(() => emprendimientosFiltered(props.state, true))
const clearHref = computed(() => ({ path: basePath.value }))
const pageHref = (page: number) => ({
  path: basePath.value,
  query: emprendimientosQuery({ ...props.state, pagina: page }, true),
  hash: '#todos',
})

const allTitle = computed(() =>
  props.rubro ? `Todos en ${rubroInfo.value?.label.toLowerCase()}` : 'Todos los emprendimientos'
)
const countLine = computed(() => {
  const n = props.response.matched
  if (!n) return 'Ningún emprendimiento con estos filtros.'
  return n === 1 ? '1 emprendimiento.' : `${n.toLocaleString('es-UY')} emprendimientos.`
})
const emptyText = computed(() =>
  props.response.unavailable
    ? 'No pudimos leer el directorio en este momento. Probá de nuevo en un rato.'
    : props.response.total === 0
      ? 'Todavía estamos armando el directorio: las primeras cuentas aparecen en las próximas horas.'
      : 'Probá con otra palabra, otro departamento o sacando un filtro.'
)

const rolling = ref(false)
async function azar() {
  rolling.value = true
  try {
    const res = await $fetch<{ handle: string | null }>('/api/emprendimientos/azar', {
      query: props.rubro ? { rubro: props.rubro } : {},
    })
    if (res.handle) await navigateTo(localePath(`${EMPRENDIMIENTOS_PATH}/cuenta/${res.handle}`))
  } finally {
    rolling.value = false
  }
}
</script>

<style scoped>
.emp-dir {
  display: grid;
  gap: 20px;
}
@layer vuetify-overrides.cu-reset {
  :where(.emp-dir) :where(h2, p) {
    margin: 0;
  }
}
.emp-dir__search {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  align-items: center;
}
.emp-dir__q {
  flex: 1 1 280px;
}
.emp-dir__rubros {
  display: flex;
  gap: 8px;
  margin-inline: -4px;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.emp-chip {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 999px;
  color: rgba(var(--v-theme-on-surface), 0.87);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.emp-chip:hover {
  border-color: rgba(var(--v-theme-primary), 0.6);
}
.emp-chip--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: #fff;
}
.emp-chip__n {
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}
.emp-dir__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
}
.emp-dir__select {
  flex: 0 1 240px;
  min-width: 200px;
}
.emp-strip {
  display: grid;
  gap: 8px;
}
.emp-strip__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.emp-strip__intro {
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.95rem;
}
.emp-strip__row {
  display: grid;
  grid-auto-columns: minmax(180px, 220px);
  grid-auto-flow: column;
  gap: 12px;
  margin-inline: -4px;
  padding: 4px 4px 10px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}
.emp-strip__row > * {
  scroll-snap-align: start;
}
.emp-dir__all {
  display: grid;
  gap: 12px;
}
.emp-dir__head {
  display: grid;
  gap: 4px;
}
.emp-dir__count {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.95rem;
}
.emp-dir__clear {
  margin-left: 8px;
  color: rgb(var(--v-theme-link));
}
.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 16px;
}
.emp-dir__empty {
  padding: 32px 16px;
  border: 1px dashed rgba(var(--v-border-color), 0.24);
  border-radius: 12px;
  color: rgba(var(--v-theme-on-surface), 0.76);
  text-align: center;
}
.emp-pager {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
}
.emp-pager__link {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.emp-pager__where {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
}
</style>
