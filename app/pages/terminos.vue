<!-- app/pages/terminos.vue -->
<template>
  <div class="legal-page">
    <VContainer>
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-file-document-outline</VIcon>
          {{ t('legal.termsNav') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('legal.terms.h1') }}</h1>
        <p class="text-caption text-grey-darken-1">
          Última actualización: {{ lastUpdatedDisplay }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <section class="mb-8">
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Al usar Cambio Uruguay aceptás estos términos. Si no estás de acuerdo, por favor no
              utilices el sitio.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">1. Qué es Cambio Uruguay</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Cambio Uruguay es una plataforma informativa y gratuita que reúne y compara
              cotizaciones de divisas publicadas por el Banco Central del Uruguay y por casas de
              cambio. No somos una casa de cambio, no operamos divisas ni intermediamos
              transacciones.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">2. Las cotizaciones son informativas</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Las cotizaciones, indicadores y cálculos que mostramos tienen carácter exclusivamente
              informativo y de referencia. Pueden tener demoras o diferencias respecto del precio
              real de cada entidad en el momento de operar. No constituyen asesoramiento financiero,
              de inversión ni de ningún otro tipo. Verificá siempre el precio final directamente con
              la casa de cambio o entidad antes de operar.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">3. Limitación de responsabilidad</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El sitio se ofrece «tal cual». En la medida que la ley lo permita, no nos
              responsabilizamos por decisiones tomadas en base a la información del sitio, ni por
              errores, interrupciones o falta de disponibilidad del servicio.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">4. Uso aceptable</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Te comprometés a no usar el sitio de forma que afecte su funcionamiento, vulnere
              derechos de terceros o infrinja la ley, incluido el raspado masivo que degrade el
              servicio. Para acceso a datos de forma programática ofrecemos una API pública.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">5. Propiedad intelectual</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              La marca, el diseño y el contenido editorial de Cambio Uruguay pertenecen a sus
              autores. Las cotizaciones provienen de sus fuentes respectivas. Podés compartir
              enlaces al sitio y usar nuestro widget de cotización con la atribución
              correspondiente.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">6. Publicidad y enlaces de terceros</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El sitio puede mostrar publicidad (por ejemplo, Google AdSense) y enlaces a sitios de
              terceros. No controlamos ni respaldamos su contenido y no somos responsables de ellos.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">7. Privacidad</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El tratamiento de tus datos se rige por nuestra
              <!-- eslint-disable-next-line vue/max-attributes-per-line -->
              <NuxtLink :to="localePath('/privacidad')" class="legal-link"
                >Política de Privacidad</NuxtLink
              >.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">8. Cambios y ley aplicable</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Podemos actualizar estos términos; los cambios se publican en esta página. Estos
              términos se rigen por las leyes de la República Oriental del Uruguay.
            </p>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const LAST_UPDATED = '2026-06-20'
const lastUpdatedDisplay = computed(() =>
  new Date(LAST_UPDATED).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/terminos'

defineOgImageComponent('Cambio', {
  title: () => t('legal.terms.h1'),
  subtitle: 'Cambio Uruguay',
  tag: 'TERMINOS',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('legal.terms.metaTitle'),
  description: () => t('legal.terms.metaDescription'),
  ogTitle: () => t('legal.terms.metaTitle'),
  ogDescription: () => t('legal.terms.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<style scoped>
.legal-prose {
  line-height: 1.75;
}
.legal-link {
  color: #64b5f6;
  text-decoration: none;
  font-weight: 600;
}
.legal-link:hover {
  text-decoration: underline;
}
</style>
