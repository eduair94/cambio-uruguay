// The structured data for the video pages.
//
// PURE (no Vue/Nuxt imports) so `tests/unit/videoSchema.test.ts` can assert the shape without a
// renderer — which matters more here than usual, because this is the one part of the feature whose
// only consumer is a crawler. A missing `uploadDate` costs a rich result and produces no visible
// bug for anyone to notice.
//
// What we claim and what we don't:
//   - VideoObject is emitted ONLY for videos the page actually renders a player for. The page
//     embeds every video it lists (components/videos/Embed.vue), so the markup describes content
//     that is genuinely on the page — which is the condition Google's video guidelines set.
//   - `duration` is absent on purpose: YouTube's public feed does not carry it, and Google treats
//     it as recommended, not required. Inventing one would be worse than omitting it.
//   - `publisher` is the CHANNEL, never this site. We did not make these videos and the markup
//     says so.

import type { VideoItem } from '~/server/models/VideosSnapshot'

export const SITE_URL = 'https://cambio-uruguay.com'

export interface VideoObjectSchema {
  '@type': 'VideoObject'
  name: string
  description: string
  thumbnailUrl: string[]
  uploadDate: string
  contentUrl: string
  embedUrl: string
  publisher: { '@type': 'Organization'; name: string }
  [key: string]: unknown
}

/**
 * One VideoObject.
 *
 * `description` falls back to the title: Google requires the field, and an empty string is a
 * validation error rather than a graceful omission. YouTube descriptions are frequently blank.
 */
export function buildVideoObject(video: VideoItem): VideoObjectSchema {
  const schema: VideoObjectSchema = {
    '@type': 'VideoObject',
    name: video.title,
    description: video.description || video.title,
    thumbnailUrl: [video.thumbnail],
    uploadDate: video.publishedAt,
    contentUrl: video.url,
    embedUrl: video.embedUrl,
    publisher: { '@type': 'Organization', name: video.channelName },
  }

  // YouTube's own counter, when the feed carried one. Reported as an interaction statistic rather
  // than as a rating: it is a measure of how many people watched, not of whether it is any good.
  if (typeof video.views === 'number' && video.views > 0) {
    schema.interactionStatistic = {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'WatchAction' },
      userInteractionCount: video.views,
    }
  }

  return schema
}

export interface VideoPageSchemaInput {
  url: string
  name: string
  description: string
  videos: VideoItem[]
  /** ISO timestamp of the snapshot. Becomes `dateModified`, the page's freshness claim. */
  capturedAt?: string | null
  /** Extra breadcrumb between the site root and this page. */
  parent?: { name: string; url: string }
  /** Q&A rendered VISIBLY on the page. Omitted entirely when empty — never schema-only. */
  faq?: ReadonlyArray<{ question: string; answer: string }>
}

/**
 * The whole `@graph` for a video listing page.
 *
 * One script tag, one graph: several competing JSON-LD blocks on a page is how the site ends up
 * with two CollectionPage nodes claiming different dateModified values.
 */
export function buildVideoPageSchema(input: VideoPageSchemaInput): Record<string, unknown> {
  const breadcrumbs: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Cambio Uruguay', item: SITE_URL },
  ]
  if (input.parent) {
    breadcrumbs.push({
      '@type': 'ListItem',
      position: 2,
      name: input.parent.name,
      item: input.parent.url,
    })
  }
  breadcrumbs.push({
    '@type': 'ListItem',
    position: breadcrumbs.length + 1,
    name: input.name,
    item: input.url,
  })

  const graph: Array<Record<string, unknown>> = [
    { '@type': 'BreadcrumbList', itemListElement: breadcrumbs },
    {
      '@type': 'CollectionPage',
      name: input.name,
      description: input.description,
      url: input.url,
      inLanguage: 'es-UY',
      isAccessibleForFree: true,
      ...(input.capturedAt ? { dateModified: new Date(input.capturedAt).toISOString() } : {}),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: input.videos.length,
        itemListElement: input.videos.map((video, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: buildVideoObject(video),
        })),
      },
    },
  ]

  if (input.faq && input.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: input.faq.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}
