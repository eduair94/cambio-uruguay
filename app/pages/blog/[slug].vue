<!-- eslint-disable vue/no-v-html -->
<template>
  <div v-if="post" class="blog-post">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <div class="mb-4">
            <VBtn :to="localePath('/blog')" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Blog
            </VBtn>
          </div>

          <header class="mb-5">
            <div class="d-flex align-center ga-2 mb-3 flex-wrap">
              <VChip color="primary" size="small" variant="tonal">{{ meta.tag }}</VChip>
              <span class="text-caption text-grey-lighten-1">{{ formatDate(post.date) }}</span>
            </div>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ post.title }}</h1>
            <p class="text-body-1 text-grey-lighten-1 post-lead">{{ post.summary }}</p>
          </header>

          <VDivider class="mb-5" />

          <!-- Body (sanitized markdown) -->
          <article class="post-body" v-html="bodyHtml" />

          <!-- Sources -->
          <VCard v-if="post.headlines.length" variant="flat" class="sources-box pa-5 mt-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
              Titulares en los que se basa
            </h2>
            <ul class="sources-list">
              <li v-for="(h, i) in post.headlines" :key="i">
                <a :href="h.link" target="_blank" rel="noopener noreferrer nofollow">{{
                  h.title
                }}</a>
                <span class="text-grey"> — {{ h.source }}</span>
              </li>
            </ul>
          </VCard>

          <p class="text-caption text-grey mt-4">
            Análisis informativo generado con asistencia de inteligencia artificial a partir de
            titulares públicos y datos de mercado. No constituye asesoramiento financiero.
          </p>

          <!-- Related posts -->
          <VCard v-if="related.length" variant="flat" class="related-box pa-5 mt-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Más análisis</h2>
            <div class="d-flex flex-column ga-2">
              <NuxtLink
                v-for="r in related"
                :key="r.slug"
                :to="localePath(`/blog/${r.slug}`)"
                class="related-link"
              >
                {{ metaFor(r.category).tag }} · {{ r.title }}
              </NuxtLink>
            </div>
          </VCard>

          <!-- CTA -->
          <VCard class="cta-post my-8 pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">Cotización del dólar en vivo</h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              Compará compra y venta en más de 40 casas de cambio de Uruguay.
            </p>
            <VBtn :to="localePath('/')" color="primary" variant="elevated">
              <VIcon start>mdi-chart-line</VIcon>
              Ver cotizaciones
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import {
  BLOG_CATEGORY_META,
  parseBlogSlug,
  type BlogCategory,
  type BlogPost,
  type BlogPostSummary,
} from '~/utils/blog'

const localePath = useLocalePath()
const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

definePageMeta({
  validate: route => parseBlogSlug(String(route.params.slug ?? '')) !== null,
})

const { data: post, error } = await useAsyncData(`blog-${slug.value}`, () =>
  $fetch<BlogPost>(`/api/blog/${slug.value}`)
)

// Force the HTTP 404 status on SSR (a thrown error alone renders the error view
// but can leave the status at 200 for a dynamic route).
if (error.value || !post.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
  throw createError({ statusCode: 404, statusMessage: 'Post no encontrado', fatal: true })
}

const meta = computed(() => BLOG_CATEGORY_META[post.value!.category])
const metaFor = (c: BlogCategory) => BLOG_CATEGORY_META[c]

// Related: latest posts excluding this one.
const { data: list } = await useAsyncData('blog-related', () =>
  $fetch<{ posts: BlogPostSummary[] }>('/api/blog', { query: { limit: 7 } }).catch(() => ({
    posts: [] as BlogPostSummary[],
  }))
)
const related = computed(() =>
  (list.value?.posts ?? []).filter(p => p.slug !== slug.value).slice(0, 5)
)

marked.setOptions({ breaks: true, gfm: true })
const bodyHtml = computed(() => {
  const html = marked.parse(post.value?.body ?? '') as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'p',
      'br',
      'hr',
      'strong',
      'em',
      'b',
      'i',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
})

const formatDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const canonicalUrl = computed(() => `https://cambio-uruguay.com/blog/${slug.value}`)

defineOgImageComponent('Cambio', {
  title: () => post.value?.title ?? 'Blog',
  subtitle: () => post.value?.summary ?? '',
  tag: () => meta.value?.tag ?? 'BLOG',
})

useSeoMeta({
  title: () => `${post.value?.title ?? 'Blog'} | Cambio Uruguay`,
  description: () => post.value?.summary ?? '',
  ogTitle: () => post.value?.title ?? 'Blog',
  ogDescription: () => post.value?.summary ?? '',
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => post.value?.title ?? 'Blog',
})

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
              '@type': 'BlogPosting',
              headline: post.value?.title,
              description: post.value?.summary,
              datePublished: post.value?.createdAt,
              dateModified: post.value?.createdAt,
              inLanguage: 'es-UY',
              mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
              author: { '@type': 'Organization', name: 'Cambio Uruguay' },
              publisher: {
                '@type': 'Organization',
                name: 'Cambio Uruguay',
                logo: { '@type': 'ImageObject', url: 'https://cambio-uruguay.com/img/logo.png' },
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
                  name: 'Blog',
                  item: 'https://cambio-uruguay.com/blog',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: post.value?.title,
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
.post-lead {
  line-height: 1.7;
  font-size: 1.05rem;
}
.post-body {
  line-height: 1.8;
}
.post-body :deep(h2) {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
}
.post-body :deep(h3) {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 1.25rem 0 0.5rem;
}
.post-body :deep(p) {
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.85);
}
.post-body :deep(ul),
.post-body :deep(ol) {
  margin: 0 0 1rem 1.25rem;
}
.post-body :deep(li) {
  margin-bottom: 0.4rem;
}
.post-body :deep(a) {
  color: #64b5f6;
  text-decoration: none;
}
.post-body :deep(a:hover) {
  text-decoration: underline;
}
.sources-box,
.related-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.sources-list {
  margin: 0;
  padding-left: 1.1rem;
}
.sources-list li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}
.sources-list a {
  color: #64b5f6;
  text-decoration: none;
}
.sources-list a:hover {
  text-decoration: underline;
}
.related-link {
  color: #64b5f6;
  text-decoration: none;
  font-size: 0.92rem;
}
.related-link:hover {
  text-decoration: underline;
}
.cta-post {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
