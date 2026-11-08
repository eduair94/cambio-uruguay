import { OG_IMAGE_META, stripOgImageQuery } from '../utils/ogImageGuard'

/**
 * Card URLs in the page head, without the page's query (utils/ogImageGuard.ts has the why).
 *
 * nuxt-og-image 5.1.6 appends the request query to every card URL it writes, and a page cannot
 * opt out (runtime/app/composables/defineOgImage.js). The endpoint answers such a URL with a
 * redirect now, so a page that still advertised one would send each share preview through an
 * extra hop and its own cache entry; this hook writes the clean URL in the first place. Same
 * unhead hook on both sides of hydration as plugins/auto-translate.ts, and the `01.` prefix
 * registers it before that plugin. Only URLs of the site's own card endpoint change: a portal
 * photo or a static card keeps its query.
 */
type Tag = { tag: string; props: Record<string, unknown> }

export default defineNuxtPlugin({
  name: 'og-image-head',
  setup() {
    injectHead().hooks.hook('tags:resolve', (ctx: { tags: Tag[] }) => {
      for (const tag of ctx.tags) {
        if (tag.tag !== 'meta' || typeof tag.props.content !== 'string') continue
        const name = String(tag.props.property ?? tag.props.name ?? '')
        if (OG_IMAGE_META.has(name)) tag.props.content = stripOgImageQuery(tag.props.content)
      }
    })
  },
})
