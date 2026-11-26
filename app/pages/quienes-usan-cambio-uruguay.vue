<template>
  <VContainer class="showcase py-6 py-md-10">
    <header class="mb-8">
      <p class="showcase__eyebrow">Casos reales · verificados</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
        Quién usa las cotizaciones de Cambio Uruguay
      </h1>
      <p class="text-body-1 showcase__lead mb-4">
        Diarios, sitios de noticias, apps y paneles muestran las cotizaciones que publicamos. Acá
        están los que se pueden ir a ver, con lo que dicen de su fuente, y lo que muestran los
        registros de la API sin poner nombres. Si querés lo mismo en tu sitio, el widget y la API
        son gratis y sin registro.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :to="localePath('/herramientas/widget-dolar')"
          color="primary"
          variant="flat"
          prepend-icon="mdi-code-tags"
        >
          Poné las cotizaciones en tu sitio
        </VBtn>
        <VBtn :to="localePath('/desarrolladores')" variant="outlined" prepend-icon="mdi-api">
          API pública
        </VBtn>
        <VBtn
          :to="localePath('/datos-abiertos-uruguay')"
          variant="text"
          prepend-icon="mdi-database-export-outline"
        >
          Datos abiertos
        </VBtn>
      </div>
    </header>

    <!-- 1. Públicos, con su pie textual -->
    <section class="mb-10" aria-labelledby="publicos-title">
      <h2 id="publicos-title" class="text-h5 font-weight-bold mb-1">
        En sitios que se pueden visitar
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4 showcase__lead">
        Cada uno muestra nuestras cotizaciones y lo dice. La cita es el pie que escribieron ellos,
        tal cual; la fecha es la del día en que lo vimos publicado.
      </p>
      <VRow>
        <VCol v-for="u in PUBLIC_USES" :key="u.id" cols="12" md="4">
          <SurfaceCard class="h-100 d-flex flex-column">
            <h3 class="text-subtitle-1 font-weight-bold mb-0">
              <a :href="u.url" target="_blank" rel="noopener" class="showcase__name">{{
                u.name
              }}</a>
            </h3>
            <p class="text-caption text-medium-emphasis mb-3">{{ u.kind }}</p>
            <p class="text-body-2 mb-3">{{ u.what }}</p>
            <figure class="showcase__quote mb-3">
              <blockquote>
                <p class="mb-0">«{{ u.quote }}»</p>
              </blockquote>
              <figcaption class="text-caption text-medium-emphasis">
                Pie en su sitio · visto el
                <time :datetime="u.verifiedAt">{{ formatDate(u.verifiedAt) }}</time>
              </figcaption>
            </figure>
            <p class="text-body-2 mb-0 mt-auto"><strong>Qué usa:</strong> {{ u.uses }}</p>
          </SurfaceCard>
        </VCol>
      </VRow>
    </section>

    <!-- 2. Integraciones sin nombre -->
    <section class="mb-10" aria-labelledby="integraciones-title">
      <h2 id="integraciones-title" class="text-h5 font-weight-bold mb-1">
        Integraciones que no muestran su nombre
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4 showcase__lead">
        Entre el {{ formatDate(INTEGRATIONS_WINDOW.from) }} y el
        {{ formatDate(INTEGRATIONS_WINDOW.to) }}, los registros del servidor de la API mostraron
        estos usos, además de los de arriba. No los nombramos: no nos citan en público y no nos toca
        anunciarlo a nosotros. Si alguno es tuyo y querés aparecer con nombre, escribinos.
      </p>
      <SurfaceCard>
        <ul class="showcase__list">
          <li v-for="i in INTEGRATIONS" :key="i.id">
            <span class="text-body-2">{{ i.what }}</span>
            <code class="showcase__endpoint">{{ i.endpoint }}</code>
          </li>
        </ul>
      </SurfaceCard>
    </section>

    <!-- 3. El widget, en vivo -->
    <section class="mb-10" aria-labelledby="widget-title">
      <h2 id="widget-title" class="text-h5 font-weight-bold mb-1">
        Las cotizaciones del día en tu sitio
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4 showcase__lead">
        Lo que hacen a mano los diarios de arriba, en una línea de código: un recuadro que se
        actualiza solo cada 10 minutos, con el mejor precio del mercado o la pizarra del Banco
        República, y el dólar, el euro, el real y el peso argentino que elijas. Así se ven dos de
        las opciones:
      </p>
      <VRow>
        <VCol v-for="w in WIDGET_EXAMPLES" :key="w.label" cols="12" md="6">
          <SurfaceCard class="h-100">
            <p class="text-subtitle-2 font-weight-bold mb-2">{{ w.label }}</p>
            <div class="showcase__stage">
              <iframe
                :src="w.src"
                :width="w.width"
                :height="w.height"
                :title="`Ejemplo del widget: ${w.label}`"
                loading="lazy"
                class="showcase__frame"
              />
            </div>
          </SurfaceCard>
        </VCol>
      </VRow>
      <div class="mt-4">
        <VBtn
          :to="localePath('/herramientas/widget-dolar')"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-tune-variant"
        >
          Elegir monedas, tema y copiar el código
        </VBtn>
      </div>
    </section>

    <!-- 4. Catálogos -->
    <section class="mb-10" aria-labelledby="catalogos-title">
      <h2 id="catalogos-title" class="text-h5 font-weight-bold mb-1">
        Catálogos que listan la API
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4 showcase__lead">
        Directorios de APIs que la revisaron y la sumaron.
      </p>
      <SurfaceCard>
        <ul class="showcase__list">
          <li v-for="c in CATALOGS" :key="c.id">
            <span class="text-body-2">
              <a :href="c.url" target="_blank" rel="noopener" class="showcase__name">{{
                c.name
              }}</a>
              — {{ c.what }}
            </span>
          </li>
        </ul>
      </SurfaceCard>
    </section>

    <!-- 5. Sumarse -->
    <section aria-labelledby="sumarse-title">
      <SurfaceCard>
        <h2 id="sumarse-title" class="text-h6 font-weight-bold mb-2">¿Usás nuestros datos?</h2>
        <p class="text-body-2 mb-2">
          Mandanos el enlace a la página donde se ven y la sumamos acá, con un enlace a tu sitio. Es
          gratis y no te pedimos nada a cambio más que citar la fuente.
        </p>
        <p class="text-body-2 mb-0">
          Correo: <strong>admin@cambio-uruguay.com</strong> (<a
            href="mailto:admin@cambio-uruguay.com?subject=Usamos%20sus%20cotizaciones"
            >escribir</a
          >)
        </p>
      </SurfaceCard>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
// /quienes-usan-cambio-uruguay — los usos reales de las cotizaciones, como prueba para quien está
// por sumar el widget o la API. Los datos y sus reglas (qué entra con nombre y qué no) viven en
// utils/dataShowcase.ts.
import { CATALOGS, INTEGRATIONS, INTEGRATIONS_WINDOW, PUBLIC_USES } from '~/utils/dataShowcase'
import { widgetHeight, widgetSrc } from '~/utils/widgetEmbed'

const SITE = 'https://cambio-uruguay.com'
const PAGE = `${SITE}/quienes-usan-cambio-uruguay`
const localePath = useLocalePath()

// Same origin as the page, so the examples also work on localhost.
const siteOrigin = useRequestURL().origin
const WIDGET_EXAMPLES = [
  {
    label: 'El dólar, mejor precio del mercado',
    src: widgetSrc({ theme: 'dark', baseUrl: siteOrigin }),
    width: 320,
    height: widgetHeight(['USD'], 'mejor'),
  },
  {
    label: 'Pizarra del BROU, cuatro monedas',
    src: widgetSrc({
      theme: 'light',
      baseUrl: siteOrigin,
      currencies: ['USD', 'EUR', 'BRL', 'ARS'],
      origin: 'brou',
    }),
    width: 360,
    height: widgetHeight(['USD', 'EUR', 'BRL', 'ARS'], 'brou'),
  },
]

/** 2026-11-25 → "25 de noviembre de 2026", sin depender de la zona del servidor. */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-UY', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00Z`))
}

const title = 'Quién usa nuestras cotizaciones'
const description =
  'Diarios, sitios de noticias, apps y paneles que muestran las cotizaciones de Cambio Uruguay, cómo lo hacen y cómo sumar el widget gratis a tu sitio.'

defineOgImageComponent('Cambio', {
  title: 'Quién usa nuestras cotizaciones',
  subtitle: 'Diarios, sitios y apps que muestran los datos de Cambio Uruguay',
  tag: 'CASOS REALES',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: PAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: PAGE }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Cambio Uruguay', item: SITE },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Desarrolladores',
            item: `${SITE}/desarrolladores`,
          },
          { '@type': 'ListItem', position: 3, name: title, item: PAGE },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.showcase__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 8px;
}

.showcase__lead {
  max-width: 72ch;
}

.showcase__name {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}

.showcase__name:hover,
.showcase__name:focus-visible {
  text-decoration: underline;
}

/* <figure> trae 40 px de margen por lado del navegador: la cita quedaba angosta y corrida. */
.showcase__quote {
  margin-inline: 0;
}

.showcase__quote blockquote {
  margin: 0;
  padding: 8px 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
  font-style: italic;
}

.showcase__quote figcaption {
  margin-top: 4px;
}

.showcase__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.showcase__list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
  padding: 10px 0;
}

.showcase__list li + li {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.showcase__endpoint {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;
}

.showcase__stage {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  overflow-x: auto;
}

.showcase__frame {
  border: 0;
  border-radius: 12px;
  max-width: 100%;
}
</style>
