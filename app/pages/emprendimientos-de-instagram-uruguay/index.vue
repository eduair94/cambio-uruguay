<!--
THESIS: Hay emprendimientos uruguayos geniales que sólo existen en Instagram, y el algoritmo no te
los muestra si no los seguís. Acá se recorren por rubro y por departamento, al azar o por lo raro.
FIRST VIEWPORT: Migas, título, una bajada con el total, la fecha, la búsqueda con «Uno al azar» y los
rubros. Las fotos arrancan en el primer scroll: es lo que hace que alguien se detenga.
FORM: Exploración. Filtros en la URL (los lee el servidor), destacados en la primera página, grilla
paginada. Al final: sumar una cuenta, cómo cuidarse antes de pagar y cómo se arma la lista.
-->
<template>
  <VContainer class="emp-page py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Emprendimientos de Instagram', disabled: true },
      ]"
      class="emp-crumbs px-0 pb-2"
    />

    <header class="emp-header">
      <h1 class="emp-title">Emprendimientos uruguayos que venden por Instagram</h1>
      <p class="emp-lead">{{ lead }}</p>
      <p v-if="asof" class="emp-asof">{{ asof }}</p>
    </header>

    <EmprendimientosDirectory :response="response" :state="state" :rubro="null" :now="now" />

    <section class="emp-section" aria-labelledby="emp-cuidarse">
      <h2 id="emp-cuidarse" class="emp-section__title">
        Antes de comprarle a una cuenta de Instagram
      </h2>
      <p class="emp-section__intro">
        Estar en esta lista no es una recomendación: no les compramos ni las evaluamos. Lo que sí
        conviene hacer con cualquier cuenta:
      </p>
      <ul class="emp-tips">
        <li>Mirá desde cuándo publica y si la gente comenta y etiqueta lo que compró.</li>
        <li>
          Pedí nombre y cédula o RUT antes de transferir, y preferí pagar al retirar o contra
          entrega.
        </li>
        <li>Desconfiá de un precio muy por debajo del resto o de un apuro para que pagues ya.</li>
        <li>
          Guardá las capturas del chat y del pago. Si algo sale mal,
          <NuxtLink :to="localePath('/estafas-uruguay')">qué hacer si te estafaron</NuxtLink>.
        </li>
      </ul>
    </section>

    <section class="emp-section">
      <EmprendimientosForm mode="sugerir" />
    </section>

    <section class="emp-section" aria-labelledby="emp-metodo">
      <h2 id="emp-metodo" class="emp-section__title">Cómo armamos el directorio</h2>
      <p class="emp-section__intro">
        Las cuentas llegan de cuatro lados: el directorio público de
        <a
          href="https://www.uruguayemprendedor.uy/emprendimientos/"
          target="_blank"
          rel="nofollow noopener"
          >Uruguay Emprendedor</a
        >, los hilos de r/uruguay donde la gente comparte emprendimientos, las cuentas que publican
        en conjunto con otra que ya está en la lista y las que sugieren los lectores. Cada una se
        lee en su perfil público de Instagram y entra sólo si es un emprendimiento, si algo de su
        perfil dice que es de Uruguay y si publicó en los últimos dos años. La descripción y el
        rubro los arma una IA con lo que dice el perfil, y nada más.
      </p>
      <p class="emp-section__intro">
        Quedan afuera las marcas grandes, las cuentas personales y los rubros que no listamos:
        préstamos, inversiones, apuestas, réplicas, tabaco y vapeadores, medicamentos y contenido
        para adultos. Cada cuenta se vuelve a leer cada pocos días; las fotos son las de su perfil y
        llevan a Instagram.
      </p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />

    <div class="emp-share">
      <ShareButtons :text="shareText" variant="tonal" color="primary" />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import {
  EMPRENDIMIENTOS_EMPTY,
  emprendimientosFaq,
  emprendimientosFiltered,
  emprendimientosQuery,
  emprendimientosStateFromQuery,
  type EmprendimientosResponse,
} from '~/utils/emprendimientos'

const localePath = useLocalePath()
const route = useRoute()

// Literal y absoluta: /en/ y /pt/ apuntan a la misma canonical, y seoContract sólo comprueba que
// apunte a sí misma si es un `const` de este archivo.
const canonicalUrl = 'https://cambio-uruguay.com/emprendimientos-de-instagram-uruguay'

// El reloj de las fechas relativas ("publicó hace 3 días") es el del servidor, y viaja al cliente.
const now = useState('emprendimientos-now', () => Date.now())
const state = computed(() => emprendimientosStateFromQuery(route.query as Record<string, unknown>))
const { data, error } = await useFetch<EmprendimientosResponse>('/api/emprendimientos', {
  query: computed(() => emprendimientosQuery(state.value)),
  default: () => EMPRENDIMIENTOS_EMPTY,
})
const response = computed<EmprendimientosResponse>(() =>
  error.value
    ? { ...EMPRENDIMIENTOS_EMPTY, unavailable: true }
    : (data.value ?? EMPRENDIMIENTOS_EMPTY)
)

const total = computed(() => response.value.total)
const lead = computed(() =>
  total.value
    ? `${total.value.toLocaleString('es-UY')} emprendimientos de todo el país, por rubro y por departamento: lo que el algoritmo de Instagram no te muestra porque todavía no los seguís.`
    : 'Emprendimientos de todo el país, por rubro y por departamento: lo que el algoritmo de Instagram no te muestra porque todavía no los seguís.'
)
const asof = computed(() => {
  const at = response.value.generatedAt
  if (!at) return null
  const date = new Date(at).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Montevideo',
  })
  return `Actualizado el ${date}. Cada cuenta se vuelve a leer cada pocos días.`
})
const faq = computed(() => emprendimientosFaq(total.value))
const shareText = 'Emprendimientos uruguayos que venden por Instagram, por rubro y por departamento'

const TITLE = 'Emprendimientos de Instagram en Uruguay'
const DESCRIPTION =
  'Emprendimientos uruguayos que venden por Instagram, por rubro y departamento: tortas, mates, impresión 3D, tarjetas pop-up y lo que no te aparece.'
const OG_TITLE = 'Emprendimientos uruguayos que venden por Instagram'

defineOgImageComponent('Cambio', {
  title: 'Emprendimientos de Instagram',
  subtitle: 'Lo que el algoritmo no te muestra, por rubro y por departamento',
  tag: 'DIRECTORIO',
})

useSeoMeta({
  title: () => `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: OG_TITLE,
  ogDescription: DESCRIPTION,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: OG_TITLE,
  twitterDescription: DESCRIPTION,
  // Una búsqueda, un filtro o la página 2 son la misma lista recortada: no se indexan.
  robots: () =>
    emprendimientosFiltered(state.value) ||
    state.value.pagina > 1 ||
    state.value.orden !== 'descubrir'
      ? 'noindex, follow'
      : 'index, follow',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      key: 'emprendimientos-ld',
      type: 'application/ld+json',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Cambio Uruguay',
                  item: 'https://cambio-uruguay.com/',
                },
                directoriosHubListItem(2),
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: 'Emprendimientos de Instagram',
                  item: canonicalUrl,
                },
              ],
            },
            {
              '@type': 'ItemList',
              name: 'Emprendimientos uruguayos que venden por Instagram',
              numberOfItems: response.value.matched,
              itemListElement: response.value.items.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.name,
                url: `${canonicalUrl}/cuenta/${item.handle}`,
              })),
            },
          ],
        }),
    },
  ],
})

useSchemaOrg([
  defineWebPage({
    dateModified: () => response.value.generatedAt ?? undefined,
  }),
])
</script>

<style scoped>
.emp-page {
  display: grid;
  gap: 28px;
}
:where(.emp-page) :where(h1, h2, p, ul) {
  margin: 0;
}
.emp-header {
  display: grid;
  gap: 10px;
}
.emp-title {
  max-width: 30ch;
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
.emp-asof {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
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
.emp-tips {
  display: grid;
  gap: 6px;
  max-width: 72ch;
  padding-left: 1.2em;
  line-height: 1.55;
}
.emp-share {
  display: flex;
  justify-content: center;
}
</style>
