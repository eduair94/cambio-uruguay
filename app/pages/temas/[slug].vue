<template>
  <div v-if="hub" class="hub-detail-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <!-- Breadcrumb -->
          <div class="mb-4">
            <VBtn :to="localePath('/temas')" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Todos los temas
            </VBtn>
          </div>

          <!-- Header -->
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">{{ hub.icon }}</VIcon>
              {{ hub.tag }}
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ hub.title }}</h1>
            <p class="text-body-1 text-grey-lighten-1 hub-lead">{{ hub.description }}</p>
            <ShareButtons class="mt-4 mb-2" :url="canonicalUrl" :text="hub.title" />
          </header>

          <VDivider class="mb-6" />

          <!-- Intro -->
          <p class="text-body-1 text-grey-lighten-1 hub-intro mb-6">{{ hub.intro }}</p>

          <!-- Guides in this hub -->
          <h2 class="text-h5 font-weight-bold mb-4">{{ guides.length }} guías sobre este tema</h2>
          <VRow class="mb-4" data-testid="hub-guides">
            <VCol v-for="guide in guides" :key="guide.slug" cols="12" sm="6">
              <VCard
                :to="localePath(`/guias/${guide.slug}`)"
                class="hub-guide-card pa-4 h-100"
                hover
                variant="flat"
              >
                <VChip size="x-small" color="primary" variant="tonal" class="mb-2">
                  {{ guide.tag }}
                </VChip>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ guide.title }}</h3>
                <p class="text-body-2 text-grey-lighten-1 mb-0">{{ guide.description }}</p>
              </VCard>
            </VCol>
          </VRow>

          <!-- Related tools / pages -->
          <template v-if="hub.resources?.length">
            <h2 class="text-h6 font-weight-bold mb-3 mt-2">Herramientas y páginas del tema</h2>
            <VRow class="mb-4" data-testid="hub-resources">
              <VCol v-for="res in hub.resources" :key="res.to" cols="12" sm="6">
                <VCard
                  :to="localePath(res.to)"
                  class="hub-resource-card pa-4 h-100 d-flex align-start ga-3"
                  hover
                  variant="flat"
                >
                  <VIcon color="primary" class="mt-1">mdi-arrow-right-circle-outline</VIcon>
                  <div>
                    <h3 class="text-subtitle-2 font-weight-bold mb-1">{{ res.label }}</h3>
                    <p class="text-body-2 text-grey-lighten-1 mb-0">{{ res.description }}</p>
                  </div>
                </VCard>
              </VCol>
            </VRow>
          </template>

          <!-- Other hubs -->
          <VCard v-if="relatedHubs.length" variant="flat" class="hub-related pa-5 mb-4">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Otros temas para explorar</h2>
            <VRow>
              <VCol v-for="other in relatedHubs" :key="other.slug" cols="12" sm="6">
                <VCard
                  :to="localePath(`/temas/${other.slug}`)"
                  class="hub-guide-card pa-4 h-100"
                  hover
                  variant="flat"
                >
                  <VIcon color="primary" class="mb-2">{{ other.icon }}</VIcon>
                  <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ other.title }}</h3>
                  <p class="text-body-2 text-grey-lighten-1 mb-0">{{ other.description }}</p>
                </VCard>
              </VCol>
            </VRow>
          </VCard>

          <!-- CTA -->
          <VCard class="cta-hub my-8 pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">
              Educá tus finanzas, paso a paso
            </h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              Explorá todas las guías y temas para tomar mejores decisiones con tu dinero en
              Uruguay.
            </p>
            <div class="d-flex justify-center flex-wrap ga-3">
              <VBtn :to="localePath('/guias')" color="primary" variant="elevated">
                <VIcon start>mdi-book-open-variant</VIcon>
                Ver todas las guías
              </VBtn>
              <VBtn :to="localePath('/temas')" variant="outlined">
                <VIcon start>mdi-shape-outline</VIcon>
                Explorar temas
              </VBtn>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { getHub, hubGuides, hubSlugs } from '~/utils/guideHubs'

// Reject unknown slugs at the route guard so they 404 without partially
// rendering. The hub catalogue is static/framework-agnostic. NOTE: `validate` is
// extracted at build time, so editing this list needs a dev-server restart.
definePageMeta({
  validate: route => hubSlugs().includes(String(route.params.slug ?? '')),
})

const localePath = useLocalePath()
const route = useRoute()

const slug = computed(() => String(route.params.slug ?? ''))
const hub = computed(() => getHub(slug.value))

if (!hub.value) {
  throw createError({ statusCode: 404, statusMessage: 'Tema no encontrado' })
}

const guides = computed(() => (hub.value ? hubGuides(hub.value) : []))
const relatedHubs = computed(() =>
  (hub.value?.relatedHubs ?? []).map(getHub).filter((h): h is NonNullable<typeof h> => Boolean(h))
)

const canonicalUrl = computed(() => `https://cambio-uruguay.com/temas/${slug.value}`)

// Branded OG image: per-hub title + description.
defineOgImageComponent('Cambio', {
  title: () => hub.value?.title ?? 'Tema',
  subtitle: () => hub.value?.description ?? '',
  tag: 'GUÍAS',
})

useSeoMeta({
  title: () => `${hub.value?.seoTitle ?? 'Tema'} | Cambio Uruguay`,
  description: () => hub.value?.description ?? '',
  ogTitle: () => hub.value?.seoTitle ?? 'Tema',
  ogDescription: () => hub.value?.description ?? '',
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => hub.value?.seoTitle ?? 'Tema',
  twitterDescription: () => hub.value?.description ?? '',
})

// CollectionPage + ItemList (the guides) + BreadcrumbList JSON-LD, so search
// engines read the hub as a curated collection and can surface its guides.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              name: hub.value?.title,
              description: hub.value?.description,
              inLanguage: 'es-UY',
              url: canonicalUrl.value,
              mainEntity: {
                '@type': 'ItemList',
                itemListElement: guides.value.map((g, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  name: g.title,
                  url: `https://cambio-uruguay.com/guias/${g.slug}`,
                })),
              },
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
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Temas',
                  item: 'https://cambio-uruguay.com/temas',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: hub.value?.title,
                  item: canonicalUrl.value,
                },
              ],
            },
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.hub-lead {
  line-height: 1.7;
}
.hub-intro {
  line-height: 1.8;
}
.hub-guide-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: border-color 0.2s ease;
}
.hub-guide-card:hover {
  border-color: rgba(33, 150, 243, 0.4);
}
.hub-resource-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: border-color 0.2s ease;
}
.hub-resource-card:hover {
  border-color: rgba(33, 150, 243, 0.4);
}
.v-theme--light .hub-resource-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.v-theme--light .hub-guide-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.hub-related {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.v-theme--light .hub-related {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.cta-hub {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
