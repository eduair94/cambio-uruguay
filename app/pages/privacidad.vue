<!-- app/pages/privacidad.vue -->
<template>
  <div class="legal-page">
    <VContainer>
      <header class="text-center pt-2 pb-6 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-shield-lock-outline</VIcon>
          {{ t('legal.privacyNav') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('legal.privacy.h1') }}</h1>
        <p class="text-caption text-grey-darken-1">
          Última actualización: {{ lastUpdatedDisplay }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <section class="mb-8">
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              En Cambio Uruguay respetamos tu privacidad. Esta política explica qué datos
              recopilamos, con qué fin, con quién los compartimos y qué opciones tenés sobre ellos.
              Cambio Uruguay es un servicio informativo y gratuito; no vendemos divisas ni operamos
              cuentas bancarias.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">1. Responsable</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El responsable del sitio es el equipo de Cambio Uruguay. Para cualquier consulta sobre
              privacidad podés escribirnos a
              <!-- eslint-disable-next-line vue/max-attributes-per-line -->
              <a class="legal-link" href="mailto:admin@cambio-uruguay.com"
                >admin@cambio-uruguay.com</a
              >.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">2. Datos que recopilamos</h2>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>
                <strong>Datos de uso y dispositivo:</strong> páginas visitadas, tiempo en el sitio,
                tipo de navegador, sistema operativo, idioma y país aproximado, recogidos de forma
                agregada mediante herramientas de analítica.
              </li>
              <li><strong>Cookies y tecnologías similares:</strong> ver la sección 4.</li>
              <li>
                <strong>Datos de cuenta (opcional):</strong> si iniciás sesión (Google, correo,
                enlace mágico o Discord), guardamos un identificador y los datos mínimos para
                ofrecerte favoritos y alertas de cotización. La autenticación se gestiona con
                Firebase (Google).
              </li>
              <li>
                <strong>Datos que nos envías:</strong> si nos escribís por correo, conservamos tu
                mensaje para responderte.
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">3. Cómo usamos los datos</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Usamos la información para operar y mejorar el sitio, medir su audiencia de forma
              agregada, personalizar contenido y mostrar publicidad, recordar tus preferencias (como
              el idioma y tu elección de cookies) y, si tenés cuenta, brindarte favoritos y alertas.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">4. Cookies y servicios de terceros</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mb-3">
              Usamos cookies propias (por ejemplo, para recordar tu idioma y tu decisión sobre
              cookies) y de terceros con fines de analítica y publicidad. Los principales terceros
              son:
            </p>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li><strong>Google Analytics (GA4):</strong> métricas de audiencia agregadas.</li>
              <li>
                <strong>Google AdSense:</strong> publicidad. Proveedores externos, incluido Google,
                usan cookies para mostrar anuncios según tus visitas a este y otros sitios.
              </li>
              <li><strong>Google Ads:</strong> medición de campañas y conversiones.</li>
              <li>
                <strong>Firebase (Google):</strong> autenticación y notificaciones, solo si usás
                esas funciones.
              </li>
            </ul>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-3 legal-prose">
              Aplicamos el Modo de Consentimiento de Google (Consent Mode v2): hasta que aceptás,
              las cookies de analítica y publicidad permanecen desactivadas. Podés cambiar tu
              elección en cualquier momento desde el enlace «Configurar cookies» del pie de página.
            </VAlert>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mt-3">
              Más información sobre cómo Google usa los datos:
              <a
                class="legal-link"
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
              >
                policies.google.com/technologies/partner-sites </a
              >. Podés gestionar la personalización de anuncios en
              <a
                class="legal-link"
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
              >
                google.com/settings/ads </a
              >.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">5. Base legal y conservación</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Tratamos los datos sobre la base de tu consentimiento (cookies de analítica y
              publicidad) y de nuestro interés legítimo en operar el sitio. Conservamos los datos
              solo el tiempo necesario para los fines descritos o el que exija la ley.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">6. Tus derechos y opciones</h2>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>Aceptar o rechazar cookies desde el banner o el enlace «Configurar cookies».</li>
              <li>Bloquear o borrar cookies desde la configuración de tu navegador.</li>
              <li>
                Solicitar acceso, rectificación o eliminación de tus datos escribiendo a
                <!-- eslint-disable-next-line vue/max-attributes-per-line -->
                <a class="legal-link" href="mailto:admin@cambio-uruguay.com"
                  >admin@cambio-uruguay.com</a
                >.
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">7. Menores</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El sitio no está dirigido a menores de 13 años y no recopilamos datos de ellos de
              forma consciente.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">8. Cambios</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Podemos actualizar esta política. Publicaremos los cambios en esta página con su nueva
              fecha de actualización.
            </p>
          </section>

          <VCard class="legal-cta pa-6 text-center" variant="flat">
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              ¿Dudas sobre tus datos? Escribinos y te respondemos.
            </p>
            <VBtn :to="localePath('/contacto')" color="primary" variant="elevated">
              <VIcon start>mdi-email-outline</VIcon>
              {{ t('legal.contactNav') }}
            </VBtn>
          </VCard>
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

const canonicalUrl = 'https://cambio-uruguay.com/privacidad'

defineOgImageComponent('Cambio', {
  title: () => t('legal.privacy.h1'),
  subtitle: 'Cambio Uruguay',
  tag: 'PRIVACIDAD',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('legal.privacy.metaTitle'),
  description: () => t('legal.privacy.metaDescription'),
  ogTitle: () => t('legal.privacy.metaTitle'),
  ogDescription: () => t('legal.privacy.metaDescription'),
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
.legal-list {
  line-height: 1.8;
  padding-left: 1.2rem;
}
.legal-list li {
  margin: 0.5rem 0;
}
.legal-link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.legal-link:hover {
  text-decoration: underline;
}
.legal-cta {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
