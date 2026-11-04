<!--
THESIS: El lector ya tiene dos o tres candidatos y quiere ver en qué se diferencian: precio de hoy,
autonomía (la declarada y la de la calle), potencia, peso, carga que soporta. Fila por fila, con el
mejor marcado sólo donde más (o menos) es mejor.
OWN-WORLD: Misma familia que /monopatines-electricos-uruguay y sus páginas de modelo.
FIRST VIEWPORT: el H1, el selector y la tabla con los modelos de la URL.
-->
<template>
  <VContainer class="comparar-page py-6 py-md-10">
    <VBreadcrumbs :items="crumbs" class="px-0 mb-2" />

    <header>
      <h1 class="comparar-title">Comparar monopatines eléctricos</h1>
      <p class="lead">
        Hasta {{ MONOPATIN_COMPARE_MAX }} modelos lado a lado, con lo que declaran sus fichas y el
        precio más bajo de hoy en Uruguay. Marcamos el mejor de cada fila sólo donde más (o menos)
        es mejor: la velocidad no se premia, porque en Montevideo y San José el máximo es 25 km/h.
      </p>
    </header>

    <div v-if="chosen.length < MONOPATIN_COMPARE_MAX && options.length" class="picker">
      <VAutocomplete
        :model-value="null"
        :items="options"
        item-title="name"
        item-value="slug"
        label="Agregar un modelo"
        prepend-inner-icon="mdi-plus"
        density="comfortable"
        variant="outlined"
        hide-details
        @update:model-value="add"
      />
    </div>

    <p v-if="chosen.length < 2" class="empty-note">
      {{
        chosen.length
          ? 'Agregá otro modelo para compararlo.'
          : 'Elegí al menos dos modelos para compararlos.'
      }}
      También podés marcarlos en la
      <NuxtLink to="/monopatines-electricos-uruguay#modelos-title" class="cat-link">
        tabla de modelos</NuxtLink
      >.
    </p>

    <MovilidadCompareTable
      v-if="chosen.length"
      :models="tableModels"
      :rows="rows"
      hub="/monopatines-electricos-uruguay"
      icon="mdi-scooter-electric"
      @remove="remove"
    />

    <p class="section-intro notes">
      "Autonomía estimada en la calle" es el 65 % de la declarada: con un adulto, alguna subida y la
      velocidad máxima. Los datos de ficha son los que declaran los vendedores en sus avisos de
      Mercado Libre y de tiendas uruguayas; cuando no coinciden entre sí, la página de cada modelo
      muestra el rango.
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import {
  MONOPATIN_COMPARE_MAX,
  monopatinCompareRows,
  monopatinCompareSlugs,
  monopatinModelShortName,
  type MonopatinModelListResponse,
  type MonopatinModelSummary,
} from '~/utils/monopatinModelos'

// Sólo español, como la página de cada modelo.
defineI18nRoute({ locales: ['es'] })

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const { data } = await useFetch<MonopatinModelListResponse>('/api/movilidad/modelos', {
  key: 'monopatin-modelos',
})
const all = computed<MonopatinModelSummary[]>(() => data.value?.models ?? [])
const known = computed(() => new Set(all.value.map(model => model.slug)))
const slugs = computed(() => monopatinCompareSlugs(route.query.m, known.value))
const chosen = computed(() =>
  slugs.value
    .map(slug => all.value.find(model => model.slug === slug))
    .filter((model): model is MonopatinModelSummary => Boolean(model))
)
const options = computed(() => all.value.filter(model => !slugs.value.includes(model.slug)))
const rows = computed(() => monopatinCompareRows(chosen.value))
const tableModels = computed(() =>
  chosen.value.map(model => ({ ...model, shortName: monopatinModelShortName(model) }))
)

function setSlugs(next: string[]) {
  router.replace({ query: next.length ? { m: next.join(',') } : {} })
}
function add(slug: string | null) {
  if (slug && !slugs.value.includes(slug)) setSlugs([...slugs.value, slug])
}
function remove(slug: string) {
  setSlugs(slugs.value.filter(value => value !== slug))
}

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Monopatines eléctricos', to: '/monopatines-electricos-uruguay' },
  { title: 'Comparar', disabled: true },
])

const description =
  'Compará hasta tres monopatines eléctricos lado a lado: precio de hoy en Uruguay, autonomía, potencia, peso y carga que soportan.'

useSeoMeta({
  title: 'Comparar monopatines eléctricos | Cambio Uruguay',
  description,
  ogTitle: 'Comparar monopatines eléctricos',
  ogDescription: description,
  // Cada combinación de modelos la elige el lector: un conjunto infinito de copias de lo mismo.
  robots: 'noindex, follow',
})
useHead({
  link: [
    {
      rel: 'canonical',
      href: 'https://cambio-uruguay.com/monopatines-electricos-uruguay/comparar',
    },
  ],
})
</script>

<style scoped>
.comparar-page {
  max-width: 1120px;
}
.comparar-page p {
  margin: 12px 0 0;
}
.comparar-title {
  margin: 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.lead {
  max-width: 72ch;
  font-size: 1.075rem;
}
.section-intro {
  max-width: 72ch;
  font-size: 0.95rem;
  opacity: 0.88;
}
.cat-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.picker {
  max-width: 420px;
  margin-top: 24px;
}
.empty-note {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.95rem;
}
.notes {
  margin-top: 24px !important;
}
</style>
