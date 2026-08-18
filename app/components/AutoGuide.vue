<template>
  <VContainer class="autoguide-page py-8 py-md-12">
    <header class="mb-10">
      <VChip class="mb-3" color="primary" size="small" variant="tonal">
        <VIcon start size="small">{{ guide.icon }}</VIcon>
        {{ guide.topicLabel }}
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ guide.title }}</h1>
      <p class="lead mb-4">{{ guide.intro }}</p>
      <ShareButtons class="mt-4" :url="canonicalUrl" :text="guide.title" />
      <p class="text-caption text-medium-emphasis mt-3">
        Escrita el {{ fmtDate(guide.createdAt) }} a partir de {{ guide.sources.length }} fuentes
        verificadas, listadas al final.
      </p>
    </header>

    <!-- The first screen. Somebody arriving from a Reddit comment has one thing they want to know;
         answering it here is what decides whether the rest gets read. -->
    <section v-if="guide.verdicts.length" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">La respuesta corta</h2>
      <VRow>
        <VCol
          v-for="v in guide.verdicts"
          :key="v.claim"
          cols="12"
          :md="guide.verdicts.length > 1 ? 6 : 12"
        >
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ v.claim }}</h3>
            <p class="text-medium-emphasis mb-0">{{ v.answer }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section v-for="section in guide.sections" :key="section.heading" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-3">{{ section.heading }}</h2>
      <p v-for="(paragraph, i) in section.body" :key="i" class="text-body-1 autoguide-prose mb-3">
        {{ paragraph }}
      </p>
    </section>

    <section v-if="guide.steps.length" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Paso a paso</h2>
      <ol class="autoguide-steps">
        <li v-for="(step, i) in guide.steps" :key="i" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ step.title }}</h3>
          <p class="text-body-2 autoguide-prose mb-0">{{ step.detail }}</p>
        </li>
      </ol>
    </section>

    <!-- Kept visible on purpose: the honest limit of what the sources establish is more useful to
         a reader than a gap quietly rounded into a claim. -->
    <section v-if="guide.notConfirmed.length" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-3">Lo que no pudimos confirmar</h2>
      <VAlert type="info" variant="tonal" density="comfortable">
        <p v-for="(item, i) in guide.notConfirmed" :key="i" class="mb-2 last-mb-0">{{ item }}</p>
      </VAlert>
    </section>

    <section v-if="guide.faqs.length" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="faq in guide.faqs" :key="faq.question">
          <VExpansionPanelTitle class="font-weight-medium">{{ faq.question }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 autoguide-prose mb-0">{{ faq.answer }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Answering one question usually creates the next one. Sending the reader to a page that
         already exists is worth more than another paragraph — and it keeps a new page from being
         an orphan with nothing linking out of it. -->
    <section v-if="related.length" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-4">Seguí por acá</h2>
      <VRow>
        <VCol v-for="link in related" :key="link.to" cols="12" sm="6">
          <VCard :to="link.to" variant="flat" class="plain-card pa-4 h-100">
            <div class="d-flex align-center ga-3">
              <VIcon :icon="link.icon" size="small" color="primary" />
              <span class="text-body-2 font-weight-medium">{{ link.label }}</span>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="mb-4">
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <ul class="autoguide-sources">
        <li v-for="source in guide.sources" :key="source.url" class="mb-2">
          <a :href="source.url" target="_blank" rel="noopener nofollow">{{ source.title }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3">
        Cada cifra de esta página aparece en el texto de una de esas páginas, descargado y
        verificado automáticamente. Si encontrás algo que no cierra,
        <NuxtLink to="/contacto">escribinos</NuxtLink> y lo corregimos.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
/**
 * Renderer for the pages the Reddit gap pipeline writes.
 *
 * It exists so a generated page is a data file plus a fifteen-line wrapper. Everything that is easy
 * to get subtly wrong — the SEO block, the OG image, the breadcrumb and FAQ schema, the heading
 * hierarchy — lives here, written once by a person, instead of being re-emitted by a model on every
 * page where a stray quote would break the build.
 */
import type { GeneratedGuide } from '~/utils/generatedGuide'
import { NAV_SECTIONS } from '~/utils/siteNav'

const props = defineProps<{ guide: GeneratedGuide }>()

const canonicalUrl = `https://cambio-uruguay.com/${props.guide.slug}`

const { t } = useI18n()

/**
 * Resolve the internal links against the nav, so the card shows the page's real name and icon.
 *
 * A route the nav does not know is dropped rather than rendered with a guessed label: the generator
 * already validated these against the real page files, so a miss here means the page exists but is
 * unregistered, and a card with a made-up name is worse than no card.
 */
const related = computed(() =>
  props.guide.related
    .map(to => {
      const entry = NAV_SECTIONS.flatMap(section => section.entries).find(e => e.to === to)
      return entry ? { to, label: t(entry.labelKey), icon: entry.icon } : null
    })
    .filter((x): x is { to: string; label: string; icon: string } => x !== null)
)

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
}

defineOgImageComponent('Cambio', {
  title: props.guide.navLabel,
  subtitle: props.guide.description.slice(0, 110),
  tag: props.guide.topicLabel.toUpperCase(),
})

useSeoMeta({
  title: () => `${props.guide.title} | Cambio Uruguay`,
  description: props.guide.description,
  ogTitle: props.guide.title,
  ogDescription: props.guide.description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: props.guide.title,
  twitterDescription: props.guide.description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [{ name: 'keywords', content: props.guide.keywords.join(', ') }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: props.guide.navLabel, item: canonicalUrl },
            ],
          },
          ...(props.guide.faqs.length
            ? [
                {
                  '@type': 'FAQPage',
                  mainEntity: props.guide.faqs.map(f => ({
                    '@type': 'Question',
                    name: f.question,
                    acceptedAnswer: { '@type': 'Answer', text: f.answer },
                  })),
                },
              ]
            : []),
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.autoguide-page {
  max-width: 900px;
}
.lead {
  font-size: 1.08rem;
  line-height: 1.75;
}
.autoguide-prose {
  line-height: 1.75;
}
.autoguide-steps {
  padding-left: 1.2rem;
}
.autoguide-sources {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.9rem;
}
.last-mb-0:last-child {
  margin-bottom: 0 !important;
}
</style>
