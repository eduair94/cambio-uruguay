<!--
  /publicidad — el media kit: a quién llega el sitio, qué formatos se venden y con qué reglas.

  THESIS: una página de condiciones, no un folleto. Un anunciante tiene que poder leer en dos
  minutos qué compra, qué no compra y por qué el orden de las cotizaciones no está en venta.
  FORM: prosa y tarjetas, sin cifras (el repo es público; los números se mandan por mail con
  fecha). El contenido sale de `utils/mediaKit.ts`; el chrome de i18n.
-->
<template>
  <div class="publicidad-page">
    <VContainer>
      <header class="text-center pt-2 pb-6 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-bullhorn-outline</VIcon>
          {{ t('publicidad.tag') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('publicidad.h1') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto publicidad-intro">
          {{ t('publicidad.intro') }}
        </p>
        <p class="text-caption text-grey-darken-1 mt-4">
          {{ t('publicidad.lastReviewed', { date: lastReviewedDisplay }) }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <!-- La regla primero: es lo que un anunciante pregunta y lo que un lector necesita saber. -->
          <VAlert type="info" variant="tonal" class="mb-8" :title="t('publicidad.pledgeTitle')">
            {{ t('publicidad.pledgeText') }}
            <NuxtLink :to="localePath('/acerca')" class="publicidad-link">
              {{ t('publicidad.aboutLink') }}
            </NuxtLink>
          </VAlert>

          <!-- A quién llega -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('publicidad.audienceTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 publicidad-prose">
              {{ t('publicidad.audienceIntro') }}
            </p>
            <VRow class="mt-1">
              <VCol v-for="group in audience" :key="group.id" cols="12" md="4">
                <VCard variant="outlined" class="pa-4 h-100 publicidad-card">
                  <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ group.title }}</h3>
                  <p class="text-body-2 text-grey-lighten-1 mb-3 publicidad-card__text">
                    {{ group.text }}
                  </p>
                  <div class="d-flex flex-wrap ga-1">
                    <VChip
                      v-for="route in group.routes"
                      :key="route"
                      :to="localePath(route)"
                      size="x-small"
                      variant="tonal"
                      color="primary"
                      link
                    >
                      {{ route }}
                    </VChip>
                  </div>
                </VCard>
              </VCol>
            </VRow>
          </section>

          <!-- Formatos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('publicidad.formatsTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 publicidad-prose">
              {{ t('publicidad.formatsIntro') }}
            </p>
            <VCard
              v-for="format in formats"
              :key="format.id"
              variant="flat"
              class="pa-5 mt-4 publicidad-format"
            >
              <div class="d-flex flex-wrap align-center ga-2 mb-2">
                <h3 class="text-h6 font-weight-bold mb-0">{{ format.title }}</h3>
                <VChip size="x-small" variant="flat" color="primary">
                  {{ t(SPONSORED_LABEL_KEY) }}
                </VChip>
                <VChip size="x-small" variant="outlined">rel="{{ format.rel }}"</VChip>
              </div>
              <dl class="publicidad-format__facts">
                <dt>{{ t('publicidad.formatWhere') }}</dt>
                <dd>{{ format.where }}</dd>
                <dt>{{ t('publicidad.formatWhat') }}</dt>
                <dd>{{ format.what }}</dd>
                <dt>{{ t('publicidad.formatFits') }}</dt>
                <dd>{{ format.fitsFor }}</dd>
              </dl>
              <VBtn
                v-if="format.route"
                :to="localePath(format.route)"
                variant="text"
                size="small"
                color="primary"
                class="mt-2 cu-btn-flush"
              >
                {{ t('publicidad.formatSee') }}
                <VIcon end size="small">mdi-arrow-right</VIcon>
              </VBtn>
            </VCard>
          </section>

          <!-- Lo que no se vende -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('publicidad.notSoldTitle') }}</h2>
            <ul class="publicidad-list">
              <li v-for="item in notSold" :key="item">{{ item }}</li>
            </ul>
          </section>

          <!-- Reglas -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('publicidad.rulesTitle') }}</h2>
            <div v-for="rule in rules" :key="rule.id" class="publicidad-rule">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ rule.title }}</h3>
              <p class="text-body-2 text-grey-lighten-1 publicidad-rule__text">{{ rule.text }}</p>
            </div>
          </section>

          <!-- Quién nos citó: la prueba social que ya existe, sin escribirla de nuevo. -->
          <PressMentions page="/publicidad" class="mb-8" />

          <!-- Contacto -->
          <VCard class="pa-6 text-center publicidad-contact" variant="tonal" color="primary">
            <h2 class="text-h6 font-weight-bold mb-2">{{ t('publicidad.contactTitle') }}</h2>
            <p class="text-body-2 mb-4 publicidad-contact__text">
              {{ t('publicidad.contactText') }}
            </p>
            <a
              class="publicidad-contact__mail text-h6"
              :href="`mailto:${contactEmail}?subject=${encodeURIComponent(t('publicidad.contactSubject'))}`"
              data-cta="publicidad-contacto"
            >
              {{ contactEmail }}
            </a>
            <p class="text-caption mt-3 mb-0 publicidad-contact__note">
              {{ t('publicidad.contactNote') }}
            </p>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { ORGANIZATION_ID } from '~/utils/authorEntity'
import {
  MEDIA_KIT_AUDIENCE,
  MEDIA_KIT_CONTACT_EMAIL,
  MEDIA_KIT_FORMATS,
  MEDIA_KIT_LAST_REVIEWED,
  MEDIA_KIT_NOT_SOLD,
  MEDIA_KIT_RULES,
  SPONSORED_LABEL_KEY,
} from '~/utils/mediaKit'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const audience = MEDIA_KIT_AUDIENCE
const formats = MEDIA_KIT_FORMATS
const notSold = MEDIA_KIT_NOT_SOLD
const rules = MEDIA_KIT_RULES
const contactEmail = MEDIA_KIT_CONTACT_EMAIL

const lastReviewedDisplay = computed(() =>
  new Date(MEDIA_KIT_LAST_REVIEWED).toLocaleDateString(dateLocale(locale.value), {
    timeZone: siteTimeZone(MEDIA_KIT_LAST_REVIEWED),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/publicidad'

defineOgImageComponent('Cambio', {
  title: () => t('publicidad.h1'),
  subtitle: () => t('publicidad.ogSubtitle'),
  tag: 'PUBLICIDAD',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('publicidad.metaTitle'),
  description: () => t('publicidad.metaDescription'),
  ogTitle: () => t('publicidad.metaTitle'),
  ogDescription: () => t('publicidad.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('publicidad.metaTitle'),
  twitterDescription: () => t('publicidad.metaDescription'),
})

// WebPage + BreadcrumbList. El `about` apunta a la Organization #identity del layout: es la
// misma entidad que /acerca describe y la que firma estas condiciones.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            url: canonicalUrl,
            name: 'Publicidad en Cambio Uruguay: formatos y condiciones',
            description:
              'Media kit de Cambio Uruguay: a quién llega el sitio, los formatos patrocinados que se venden y las reglas de independencia que no se negocian.',
            dateModified: MEDIA_KIT_LAST_REVIEWED,
            inLanguage: 'es-UY',
            isPartOf: { '@id': 'https://cambio-uruguay.com/#website' },
            about: { '@id': ORGANIZATION_ID },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: 'Publicidad', item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.publicidad-intro {
  max-width: 640px;
  line-height: 1.7;
}

.publicidad-prose {
  line-height: 1.7;
}

.publicidad-link {
  color: inherit;
  text-decoration: underline;
  font-weight: 600;
}

.publicidad-card {
  border-radius: 12px;
}

.publicidad-card__text {
  margin-top: 0;
  line-height: 1.6;
}

.publicidad-format {
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.publicidad-format__facts {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  line-height: 1.6;
}

.publicidad-format__facts dt {
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.publicidad-format__facts dd {
  margin: 0;
}

.publicidad-list {
  padding-left: 1.25rem;
  line-height: 1.7;
}

.publicidad-list li {
  margin-top: 6px;
}

.publicidad-rule {
  margin-top: 16px;
}

.publicidad-rule__text {
  margin-top: 0;
  line-height: 1.6;
}

.publicidad-contact {
  border-radius: 12px;
}

.publicidad-contact__text,
.publicidad-contact__note {
  margin-top: 0;
}

.publicidad-contact__mail {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 700;
  word-break: break-all;
}

.publicidad-contact__mail:hover {
  text-decoration: underline;
}

@media (max-width: 599.98px) {
  .publicidad-format__facts {
    grid-template-columns: 1fr;
    gap: 2px 0;
  }

  .publicidad-format__facts dd {
    margin-bottom: 8px;
  }
}
</style>
