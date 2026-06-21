<!-- app/pages/contacto.vue -->
<template>
  <div class="legal-page">
    <VContainer>
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-email-outline</VIcon>
          {{ t('legal.contactNav') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('legal.contact.h1') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto contact-intro">
          {{ t('legal.contact.intro') }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="8" lg="6">
          <VCard class="pa-6 mb-6" variant="tonal" color="primary">
            <h2 class="text-h6 font-weight-bold mb-2">{{ t('legal.contact.emailTitle') }}</h2>
            <!-- eslint-disable-next-line vue/max-attributes-per-line -->
            <a class="contact-email text-h6" href="mailto:admin@cambio-uruguay.com">
              admin@cambio-uruguay.com
            </a>
          </VCard>

          <VCard class="pa-6" variant="outlined">
            <h2 class="text-h6 font-weight-bold mb-4">{{ t('legal.contact.socialTitle') }}</h2>
            <div class="d-flex flex-wrap ga-2">
              <VBtn
                v-for="s in socials"
                :key="s.label"
                :href="s.href"
                target="_blank"
                rel="noopener noreferrer"
                variant="tonal"
                color="primary"
              >
                <VIcon start>{{ s.icon }}</VIcon>
                {{ s.label }}
              </VBtn>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

const socials = [
  { label: 'Twitter / X', icon: 'mdi-twitter', href: 'https://twitter.com/cambio_uruguay' },
  { label: 'Telegram', icon: 'mdi-telegram', href: 'https://t.me/cambio_uruguay' },
  {
    label: 'LinkedIn',
    icon: 'mdi-linkedin',
    href: 'https://www.linkedin.com/company/cambio-uruguay/',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/contacto'

defineOgImageComponent('Cambio', {
  title: () => t('legal.contact.h1'),
  subtitle: 'Cambio Uruguay',
  tag: 'CONTACTO',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('legal.contact.metaTitle'),
  description: () => t('legal.contact.metaDescription'),
  ogTitle: () => t('legal.contact.metaTitle'),
  ogDescription: () => t('legal.contact.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        url: canonicalUrl,
        name: 'Contacto - Cambio Uruguay',
        inLanguage: 'es-UY',
        isPartOf: { '@type': 'WebSite', name: 'Cambio Uruguay', url: 'https://cambio-uruguay.com' },
        mainEntity: {
          '@type': 'Organization',
          name: 'Cambio Uruguay',
          email: 'admin@cambio-uruguay.com',
          url: 'https://cambio-uruguay.com',
        },
      }),
    },
  ],
})
</script>

<style scoped>
.contact-intro {
  max-width: 640px;
  line-height: 1.7;
}
.contact-email {
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  word-break: break-all;
}
.contact-email:hover {
  text-decoration: underline;
}
</style>
