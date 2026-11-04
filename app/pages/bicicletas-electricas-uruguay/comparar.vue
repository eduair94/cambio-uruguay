<!--
THESIS: El lector ya tiene dos o tres bicis candidatas y quiere ver en qué se diferencian: precio de
hoy, rodado, autonomía (la declarada y la de la calle), potencia, batería, peso, carga que soporta.
Fila por fila, con el mejor marcado sólo donde más (o menos) es mejor.
OWN-WORLD: Mismo esqueleto que /monopatines-electricos-uruguay/comparar, con las filas de una bici.
FIRST VIEWPORT: el H1, el selector y la tabla con los modelos de la URL.
-->
<template>
  <VContainer class="comparar-page py-6 py-md-10">
    <VBreadcrumbs :items="crumbs" class="px-0 mb-2" />

    <header>
      <h1 class="comparar-title">Comparar bicicletas eléctricas</h1>
      <p class="lead">
        Hasta {{ MONOPATIN_COMPARE_MAX }} modelos lado a lado, con lo que declaran sus fichas y el
        precio más bajo de hoy en Uruguay. Marcamos el mejor de cada fila sólo donde más (o menos)
        es mejor: el rodado y la velocidad no se premian, porque una rueda más grande es otra bici,
        no una mejor.
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
      <NuxtLink to="/bicicletas-electricas-uruguay#modelos-title" class="cat-link">
        tabla de modelos</NuxtLink
      >.
    </p>

    <div v-if="chosen.length" class="compare-scroll">
      <table class="compare-table">
        <thead>
          <tr>
            <th scope="col" class="compare-table__corner"><span class="d-sr-only">Dato</span></th>
            <th v-for="model in chosen" :key="model.slug" scope="col" class="compare-table__model">
              <MovilidadVariantThumb
                :src="model.image ?? null"
                :alt="model.name"
                icon="mdi-bicycle-electric"
              />
              <NuxtLink :to="`/bicicletas-electricas-uruguay/${model.slug}`" class="cat-link">
                {{ model.name }}
              </NuxtLink>
              <button
                type="button"
                class="compare-table__remove"
                :aria-label="`Sacar ${model.name} de la comparación`"
                @click="remove(model.slug)"
              >
                <VIcon icon="mdi-close" size="16" aria-hidden="true" />
                Sacar
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <th scope="row">{{ row.label }}</th>
            <td
              v-for="(cell, index) in row.cells"
              :key="`${row.key}:${index}`"
              :class="{ 'is-best': row.best.includes(index) }"
            >
              {{ cell ?? '—' }}
              <span v-if="row.best.includes(index)" class="best-tag">Mejor</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
  monopatinCompareSlugs,
  type MonopatinModelListResponse,
  type MonopatinModelSummary,
} from '~/utils/monopatinModelos'
import { bicicletaCompareRows } from '~/utils/bicicletaModelos'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const { data } = await useFetch<MonopatinModelListResponse>('/api/movilidad/modelos', {
  key: 'bicicleta-modelos',
  query: { categoria: 'bicicleta-electrica' },
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
const rows = computed(() => bicicletaCompareRows(chosen.value))

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
  { title: 'Bicicletas eléctricas', to: '/bicicletas-electricas-uruguay' },
  { title: 'Comparar', disabled: true },
])

const description =
  'Compará hasta tres bicicletas eléctricas lado a lado: precio de hoy en Uruguay, rodado, autonomía, potencia, batería, peso y carga que soportan.'

useSeoMeta({
  title: 'Comparar bicicletas eléctricas | Cambio Uruguay',
  description,
  ogTitle: 'Comparar bicicletas eléctricas',
  ogDescription: description,
  // Cada combinación de modelos la elige el lector: un conjunto infinito de copias de lo mismo.
  robots: 'noindex, follow',
})
useHead({
  link: [
    {
      rel: 'canonical',
      href: 'https://cambio-uruguay.com/bicicletas-electricas-uruguay/comparar',
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
.compare-scroll {
  margin-top: 24px;
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
}
.compare-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.compare-table th,
.compare-table td {
  padding: 12px 16px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.18);
}
.compare-table tbody tr:last-child th,
.compare-table tbody tr:last-child td {
  border-bottom: 0;
}
.compare-table tbody th {
  position: sticky;
  left: 0;
  z-index: 1;
  width: 28%;
  font-weight: 600;
  background: rgb(var(--v-theme-surface));
}
.compare-table__corner {
  position: sticky;
  left: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}
.compare-table__model {
  min-width: 160px;
}
.compare-table__model .cat-link {
  display: block;
  margin-top: 8px;
}
.compare-table__remove {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  margin-top: 4px;
  font-size: 0.875rem;
  opacity: 0.8;
}
.compare-table__remove:hover,
.compare-table__remove:focus-visible {
  opacity: 1;
  text-decoration: underline;
}
.is-best {
  font-weight: 700;
  background: rgba(var(--v-theme-success), 0.1);
}
.best-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgb(var(--v-theme-success));
}
.notes {
  margin-top: 24px !important;
}
</style>
