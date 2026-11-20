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
    <!-- Sólo movilidad (monopatines y bicicletas): la ficha técnica que declara el vendedor
         (currency-movilidad-specs). Lo que cambia entre las dos sale de `movilidadFichaPerfil`. -->
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
        :label="`Peso ${perfil.delAparato}`"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VSelect
        v-if="perfil.ruedaClave === 'rodado'"
        v-model="draft.rodado"
        :items="fichaItems('rodado', draft.rodado)"
        label="Rodado"
        density="comfortable"
        variant="outlined"
        hide-details
      />
      <VSelect
        v-else
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
    <!-- Equipar: la ficha técnica de heladeras, lavarropas, televisores y aires
         (currency-equipar-specs). Los grupos y sus opciones son datos: utils/equiparFicha.ts. -->
    <fieldset v-if="eqFacets" class="eq-filters__ficha">
      <legend class="eq-filters__legend">Ficha técnica</legend>
      <template v-for="grupo in eqFacets.grupos" :key="grupo.key">
        <div
          v-if="grupo.multi && grupo.opciones.length"
          class="eq-filters__checks"
          role="group"
          :aria-label="grupo.label"
        >
          <VCheckbox
            v-for="opcion in grupo.opciones"
            :key="opcion.slug"
            v-model="eqDraft[grupo.key]"
            :value="opcion.slug"
            :label="`${opcion.name} (${opcion.count})`"
            density="compact"
            hide-details
          />
        </div>
        <VSelect
          v-else-if="!grupo.multi"
          v-model="eqDraft[grupo.key]"
          :items="eqSelectItems(grupo)"
          :label="grupo.label"
          density="comfortable"
          variant="outlined"
          hide-details
        />
      </template>
      <p class="text-caption text-medium-emphasis mb-0">
        La ficha es lo que declara el vendedor.
        <template v-if="total !== null">
          {{ eqFacets.conFicha.toLocaleString('es-UY') }} de
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
  EQUIPAR_FICHA_FILTROS,
  equiparFichaActive,
  equiparFichaParams,
  equiparFichaValorLabel,
  isEquiparFichaCategoria,
  type EquiparFichaFaceta,
} from '~/utils/equiparFicha'
import {
  monopatinAutonomiaLabel,
  monopatinCargaLabel,
  monopatinFichaPanelVisible,
  movilidadFichaPerfil,
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
  rodado: query.ficha?.rodado ?? '',
  rasgos: [...(query.ficha?.rasgos ?? [])] as string[],
  soloFicha: query.ficha?.soloFicha ?? false,
})
const draft = reactive(toDraft(props.query))

// Equipar: un borrador aparte para los grupos de ficha, porque sus claves (`carga`, `rasgos`) son
// otras que las de movilidad aunque se llamen igual.
const toEqDraft = (query: EquiparProductosQuery): Record<string, string | string[]> =>
  Object.fromEntries(
    Object.entries(query.eqficha ?? {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ])
  )
const eqDraft = ref<Record<string, string | string[]>>(toEqDraft(props.query))
watch(
  () => props.query,
  next => {
    eqDraft.value = toEqDraft(next)
  }
)
// Las facetas de ficha son de la categoría de la consulta: si el lector cambia la categoría en el
// panel, los grupos de la anterior se esconden y no viajan al aplicar (un `rasgos=inverter` de
// heladera sobreviviría callado al pasar a lavarropas).
const eqSameCategoria = computed(
  () => (props.fixedCategoria || draft.categoria) === props.query.categoria
)
const eqFacets = computed(() => {
  const facets = props.facets.eqficha
  if (!facets || !eqSameCategoria.value) return null
  return facets.conFicha > 0 || equiparFichaActive(props.query.eqficha) ? facets : null
})
/** Las opciones del grupo, y el tamaño libre que trajo el asesor (`desde-390`) si es lo puesto. */
function eqSelectItems(grupo: EquiparFichaFaceta) {
  const items = [
    { title: 'Cualquiera', value: '' },
    ...grupo.opciones.map(opcion => ({
      title: `${opcion.name} (${opcion.count})`,
      value: opcion.slug,
    })),
  ]
  const current = eqDraft.value[grupo.key]
  const categoria = props.query.categoria
  if (
    typeof current === 'string' &&
    current &&
    !grupo.opciones.some(opcion => opcion.slug === current) &&
    isEquiparFichaCategoria(categoria)
  ) {
    const def = EQUIPAR_FICHA_FILTROS[categoria].find(g => g.key === grupo.key)
    const label = def ? equiparFichaValorLabel(def, current) : null
    if (label) items.splice(1, 0, { title: label, value: current })
  }
  return items
}
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

type FichaFacetKey = 'autonomia' | 'velocidad' | 'potencia' | 'carga' | 'peso' | 'rueda' | 'rodado'

/** Monopatín o bicicleta: qué ruedas se filtran y cómo se nombra el aparato. */
const perfil = computed(() => movilidadFichaPerfil(props.fixedCategoria || props.query.categoria))

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
        // Equipar: los grupos de ficha pisan las claves homónimas de movilidad (vacías acá).
        ...(props.vertical === 'equipar' && eqSameCategoria.value
          ? equiparFichaParams(eqDraft.value)
          : {}),
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
