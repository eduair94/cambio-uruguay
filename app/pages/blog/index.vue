<template>
  <div class="blog-hub">
    <VContainer>
      <header class="text-center pt-2 pb-6 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-newspaper-variant-multiple</VIcon>
          BLOG DIARIO
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
          Blog del dólar: análisis diario de noticias
        </h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto blog-intro">
          Cada día resumimos las noticias del mundo que pueden mover el dólar y las novedades
          locales que afectan al peso uruguayo y la cotización en Uruguay. Análisis generado con IA,
          revisado y aterrizado en datos de mercado reales.
        </p>
      </header>

      <!-- Category legend -->
      <div class="d-flex justify-center flex-wrap ga-2 mb-8">
        <VChip
          v-for="meta in categoryMetas"
          :key="meta.category"
          color="primary"
          variant="tonal"
          size="small"
        >
          <VIcon start size="small">{{ meta.icon }}</VIcon>
          {{ meta.label }}
        </VChip>
      </div>

      <!-- Posts -->
      <VRow v-if="posts.length" data-testid="blog-list">
        <VCol v-for="post in posts" :key="post.slug" cols="12" sm="6" md="4">
          <VCard
            class="post-card h-100 d-flex flex-column"
            :to="localePath(`/blog/${post.slug}`)"
            elevation="3"
            hover
            data-testid="blog-card"
          >
            <div class="pa-5 d-flex flex-column flex-grow-1">
              <div class="d-flex align-center justify-space-between mb-3">
                <VChip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                  {{ metaFor(post.category).tag }}
                </VChip>
                <span class="text-caption text-grey-lighten-1">{{ formatDate(post.date) }}</span>
              </div>
              <h2 class="text-subtitle-1 font-weight-bold mb-2 post-title">{{ post.title }}</h2>
              <p class="text-body-2 text-grey-lighten-1 mb-3 post-summary">{{ post.summary }}</p>
              <div class="mt-auto">
                <span class="text-caption text-link font-weight-medium">
                  Leer análisis <VIcon size="14">mdi-arrow-right</VIcon>
                </span>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- Empty state -->
      <VCard v-else variant="flat" class="text-center pa-10 empty-box">
        <VIcon size="64" color="grey-lighten-1" class="mb-4">mdi-newspaper-variant-outline</VIcon>
        <h2 class="text-h6 mb-2">El blog se está poniendo al día</h2>
        <p class="text-body-2 text-grey-lighten-1">
          Los análisis diarios aparecerán aquí. Volvé en unos minutos.
        </p>
      </VCard>

      <!-- Cross-link to our evergreen SEO articles on Medium (locale-aware:
           shows the matching-language post, always links the profile). -->
      <VCard class="medium-section my-8 pa-6" variant="flat">
        <div class="d-flex align-center ga-2 mb-2">
          <VIcon color="white">$medium</VIcon>
          <h2 class="text-h6 font-weight-bold text-white mb-0">{{ $t('mediumPosts.title') }}</h2>
        </div>
        <p class="text-body-2 text-grey-lighten-1 mb-4">{{ $t('mediumPosts.subtitle') }}</p>
        <div class="d-flex flex-wrap ga-2">
          <VBtn
            v-if="mediumPost"
            :href="mediumPost.url"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="elevated"
          >
            <VIcon start>$medium</VIcon>
            {{ $t('mediumPosts.cta') }}
          </VBtn>
          <VBtn
            :href="mediumProfile"
            target="_blank"
            rel="noopener noreferrer"
            color="white"
            variant="outlined"
          >
            {{ $t('mediumPosts.profile') }}
          </VBtn>
        </div>
      </VCard>

      <!-- CTA -->
      <VCard class="cta-blog my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">Mirá la cotización en tiempo real</h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">
          Compará el dólar en más de 40 casas de cambio o leé las noticias del día.
        </p>
        <div class="d-flex justify-center flex-wrap ga-2">
          <VBtn :to="localePath('/')" color="primary" variant="elevated">
            <VIcon start>mdi-chart-line</VIcon>
            Ver cotizaciones
          </VBtn>
          <VBtn :to="localePath('/noticias')" color="secondary" variant="tonal">
            <VIcon start>mdi-newspaper-variant-outline</VIcon>
            Noticias del dólar
          </VBtn>
        </div>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  BLOG_CATEGORY_META,
  blogCategories,
  isBlogCategory,
  type BlogCategory,
  type BlogPostSummary,
} from '~/utils/blog'
import { MEDIUM_PROFILE, mediumPostFor } from '~/utils/medium'

const localePath = useLocalePath()
const { locale } = useI18n()
const mediumProfile = MEDIUM_PROFILE
const mediumPost = computed(() => mediumPostFor(locale.value))
const categoryMetas = blogCategories().map(c => BLOG_CATEGORY_META[c])
const metaFor = (c: BlogCategory) => BLOG_CATEGORY_META[c]

const { data } = await useAsyncData('blog-index', () =>
  $fetch<{ posts: BlogPostSummary[] }>('/api/blog', { query: { limit: 60 } }).catch(() => ({
    posts: [] as BlogPostSummary[],
  }))
)

const posts = computed<BlogPostSummary[]>(() =>
  (data.value?.posts ?? []).filter(p => isBlogCategory(p.category))
)

const formatDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const canonicalUrl = 'https://cambio-uruguay.com/blog'

defineOgImageComponent('Cambio', {
  title: 'Blog del dólar: análisis diario',
  subtitle: 'Noticias del mundo y de Uruguay que mueven el dólar',
  tag: 'BLOG',
})

useSeoMeta({
  title: 'Blog del dólar: análisis diario de noticias | Cambio Uruguay',
  description:
    'Análisis diario de las noticias del mundo que mueven el dólar y de las novedades locales que afectan al peso uruguayo y la cotización en Uruguay.',
  ogTitle: 'Blog del dólar: análisis diario de noticias',
  ogDescription:
    'Resumen diario de noticias globales y locales que afectan la cotización del dólar en Uruguay.',
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Blog del dólar — Cambio Uruguay',
          url: canonicalUrl,
          inLanguage: 'es-UY',
          blogPost: posts.value.slice(0, 20).map(p => ({
            '@type': 'BlogPosting',
            headline: p.title,
            datePublished: p.createdAt,
            url: `https://cambio-uruguay.com/blog/${p.slug}`,
          })),
        })
      ),
    },
  ],
})
</script>

<style scoped>
.blog-intro {
  max-width: 760px;
  line-height: 1.7;
}
.post-card {
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.post-card:hover {
  transform: translateY(-3px);
}
.post-title {
  line-height: 1.4;
}
.post-summary {
  line-height: 1.6;
}
.empty-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.cta-blog {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
.medium-section {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
}
</style>
