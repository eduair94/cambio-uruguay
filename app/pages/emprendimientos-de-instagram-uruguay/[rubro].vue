<!--
THESIS: Un rubro del directorio de emprendimientos de Instagram — "Impresión 3D y corte láser por
Instagram en Uruguay" — con lo raro y lo chico arriba y todas las cuentas abajo.
FIRST VIEWPORT: Migas, título del rubro, cuántas hay, la búsqueda y los rubros (el actual marcado).
FORM: La misma exploración que la portada, con el rubro fijo en la ruta. Se indexa con 5 cuentas o
más (EMPRENDIMIENTOS_RUBRO_MIN_INDEX) y sin filtros; el sitemap aplica la misma regla.
-->
<template>
  <VContainer class="emp-page py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Emprendimientos de Instagram', to: localePath(EMPRENDIMIENTOS_PATH) },
        { title: rubroInfo.label, disabled: true },
      ]"
      class="emp-crumbs px-0 pb-2"
    />

    <header class="emp-header">
      <h1 class="emp-title">{{ rubroInfo.title }} por Instagram en Uruguay</h1>
      <p class="emp-lead">{{ lead }}</p>
    </header>

    <EmprendimientosDirectory
      :response="response"
      :state="state"
      :rubro="rubroInfo.slug"
      :now="now"
    />

    <section class="emp-section">
      <EmprendimientosForm mode="sugerir" />
    </section>

    <section class="emp-section" aria-labelledby="emp-cuidarse">
      <h2 id="emp-cuidarse" class="emp-section__title">Antes de pagar</h2>
      <p class="emp-section__intro">
        Estar en esta lista no es una recomendación. Antes de transferir, pedí nombre y cédula o
        RUT, preferí pagar al retirar o contra entrega, y desconfiá de un precio muy por debajo del
        resto.
        <NuxtLink :to="localePath(EMPRENDIMIENTOS_PATH)">Cómo armamos el directorio</NuxtLink>.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  EMPRENDIMIENTOS_EMPTY,
  EMPRENDIMIENTOS_PATH,
  EMPRENDIMIENTOS_RUBRO_MIN_INDEX,
  emprendimientoRubro,
  emprendimientosFiltered,
  emprendimientosQuery,
  emprendimientosStateFromQuery,
  type EmprendimientosResponse,
} from '~/utils/emprendimientos'

// Un rubro fuera de la taxonomía es 404 de verdad. `validate` se extrae en build: sólo puede usar
// una función importada.
definePageMeta({
  validate: async route => {
    const catalogue = await import('~/utils/emprendimientos')
    return catalogue.isEmprendimientoRubro(String(route.params.rubro ?? ''))
  },
})

const localePath = useLocalePath()
const route = useRoute()
const initial = emprendimientoRubro(String(route.params.rubro ?? ''))
if (!initial)
  throw createError({ statusCode: 404, statusMessage: 'Rubro no encontrado', fatal: true })
const rubroInfo = computed(() => emprendimientoRubro(String(route.params.rubro ?? '')) ?? initial)

const now = useState('emprendimientos-now', () => Date.now())
const state = computed(() =>
  emprendimientosStateFromQuery(route.query as Record<string, unknown>, rubroInfo.value.slug)
)
const { data, error } = await useFetch<EmprendimientosResponse>('/api/emprendimientos', {
  query: computed(() => emprendimientosQuery(state.value)),
  default: () => EMPRENDIMIENTOS_EMPTY,
})
const response = computed<EmprendimientosResponse>(() =>
  error.value
    ? { ...EMPRENDIMIENTOS_EMPTY, unavailable: true }
    : (data.value ?? EMPRENDIMIENTOS_EMPTY)
)

const inRubro = computed(() => response.value.facets.rubros[rubroInfo.value.slug] ?? 0)
const lead = computed(() => {
  const n = inRubro.value
  const what = rubroInfo.value.title.toLowerCase()
  return n
    ? `${n.toLocaleString('es-UY')} ${n === 1 ? 'emprendimiento uruguayo' : 'emprendimientos uruguayos'} de ${what} que venden por Instagram. Filtrá por departamento, buscá por producto o abrí uno al azar.`
    : `Emprendimientos uruguayos de ${what} que venden por Instagram. Todavía no hay cuentas en este rubro: sumá una al final de la página.`
})

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com/emprendimientos-de-instagram-uruguay/${rubroInfo.value.slug}`
)
const title = computed(() => `${rubroInfo.value.title} por Instagram en Uruguay`)
const description = computed(
  () =>
    `Emprendimientos uruguayos de ${rubroInfo.value.title.toLowerCase()} que venden por Instagram, por departamento, con sus fotos y cuándo publicaron por última vez.`
)
const indexable = computed(
  () =>
    inRubro.value >= EMPRENDIMIENTOS_RUBRO_MIN_INDEX &&
    !emprendimientosFiltered(state.value, true) &&
    state.value.pagina === 1 &&
    state.value.orden === 'descubrir'
)

defineOgImageComponent('Cambio', {
  title: initial.title,
  subtitle: 'Emprendimientos uruguayos que venden por Instagram',
  tag: 'DIRECTORIO',
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  robots: () => (indexable.value ? 'index, follow' : 'noindex, follow'),
})

useHead({
  link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
  script: [
    {
      key: 'emprendimientos-rubro-ld',
      type: 'application/ld+json',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Cambio Uruguay',
              item: 'https://cambio-uruguay.com/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Emprendimientos de Instagram',
              item: 'https://cambio-uruguay.com/emprendimientos-de-instagram-uruguay',
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: rubroInfo.value.label,
              item: canonicalUrl.value,
            },
          ],
        }),
    },
  ],
})
</script>

<style scoped>
.emp-page {
  display: grid;
  gap: 28px;
}
:where(.emp-page) :where(h1, h2, p) {
  margin: 0;
}
.emp-header {
  display: grid;
  gap: 10px;
}
.emp-title {
  max-width: 28ch;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-wrap: balance;
}
.emp-lead {
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 1.075rem;
  line-height: 1.65;
}
.emp-section {
  display: grid;
  gap: 10px;
  padding-top: 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.emp-section__title {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.emp-section__intro {
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), 0.82);
  line-height: 1.6;
}
</style>
