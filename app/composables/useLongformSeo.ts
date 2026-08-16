import type { LongformDoc } from '~/utils/longform'

/** Where a long-form family lives, for canonical URLs and breadcrumbs. */
export interface LongformFamily {
  /** Base path with no trailing slash, e.g. `'/preguntas'`. */
  basePath: string
  /** Breadcrumb label for the family index, e.g. `'Preguntas'`. */
  breadcrumbLabel: string
  /** Uppercase label burned into the OG image, e.g. `'PREGUNTA'`. */
  ogTag: string
}

const SITE = 'https://cambio-uruguay.com'

/**
 * Canonical URL, SEO meta, OG image and JSON-LD for one long-form document.
 *
 * Every programmatic family renders the same document shape, so the schema graph
 * is built once here rather than copy-pasted per family — which is how the
 * guides page ended up being the only one emitting `speakable` and HowTo.
 *
 * The graph always carries Article + BreadcrumbList, and adds HowTo when the doc
 * has `steps` and FAQPage when it has `faqs`, so AI Overviews can extract steps
 * and answers from any family without extra per-page wiring.
 */
export function useLongformSeo(
  doc: Ref<LongformDoc | undefined>,
  family: LongformFamily
): { canonicalUrl: ComputedRef<string>; updatedDisplay: ComputedRef<string> } {
  const { locale } = useI18n()

  const canonicalUrl = computed(() => `${SITE}${family.basePath}/${doc.value?.slug ?? ''}`)

  const updatedDisplay = computed(() =>
    doc.value
      ? new Date(doc.value.updatedAt).toLocaleDateString(locale.value, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : ''
  )

  defineOgImageComponent('Cambio', {
    title: () => doc.value?.title ?? '',
    subtitle: () => doc.value?.description ?? '',
    tag: family.ogTag,
  })

  useSeoMeta({
    title: () => `${doc.value?.title ?? ''} | Cambio Uruguay`,
    description: () => doc.value?.description ?? '',
    ogTitle: () => doc.value?.title ?? '',
    ogDescription: () => doc.value?.description ?? '',
    ogType: 'article',
    ogUrl: () => canonicalUrl.value,
    twitterCard: 'summary_large_image',
    twitterTitle: () => doc.value?.title ?? '',
    twitterDescription: () => doc.value?.description ?? '',
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
                '@type': 'Article',
                headline: doc.value?.title,
                description: doc.value?.description,
                image: `${SITE}/__og-image__/image${family.basePath}/${doc.value?.slug ?? ''}/og.png`,
                datePublished: doc.value?.updatedAt,
                dateModified: doc.value?.updatedAt,
                inLanguage: 'es-UY',
                mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
                speakable: {
                  '@type': 'SpeakableSpecification',
                  cssSelector: ['.longform-lead', '.longform-prose'],
                },
                author: {
                  '@type': 'Person',
                  name: 'Eduardo Airaudo',
                  url: 'https://www.linkedin.com/in/eduardo-airaudo/',
                },
                publisher: {
                  '@type': 'Organization',
                  name: 'Cambio Uruguay',
                  logo: { '@type': 'ImageObject', url: `${SITE}/img/logo.png` },
                },
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Cambio Uruguay', item: SITE },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: family.breadcrumbLabel,
                    item: `${SITE}${family.basePath}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: doc.value?.title,
                    item: canonicalUrl.value,
                  },
                ],
              },
              ...(doc.value?.steps?.length
                ? [
                    {
                      '@type': 'HowTo',
                      name: doc.value.title,
                      description: doc.value.description,
                      step: doc.value.steps.map((step, i) => ({
                        '@type': 'HowToStep',
                        position: i + 1,
                        name: step.name,
                        text: step.text,
                      })),
                    },
                  ]
                : []),
              ...(doc.value?.faqs?.length
                ? [
                    {
                      '@type': 'FAQPage',
                      mainEntity: doc.value.faqs.map(faq => ({
                        '@type': 'Question',
                        name: faq.q,
                        acceptedAnswer: { '@type': 'Answer', text: faq.a },
                      })),
                    },
                  ]
                : []),
            ],
          })
        ),
      },
    ],
  })

  return { canonicalUrl, updatedDisplay }
}
