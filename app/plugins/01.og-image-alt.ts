import { replaceFloorImageAlt, type OgHeadTag } from '~/utils/ogCardText'

/**
 * og:image:alt / twitter:image:alt that name the page, not the dollar.
 *
 * app.vue gives every page the same floor alt ("Cambio Uruguay: cotización del dólar hoy y
 * comparador de casas de cambio") and only eight pages set their own, so a rental, a guide or an
 * English page described its card as the dollar's. When the floor reaches the head unchanged it is
 * replaced by the page's og:title, which is the card's own title (`replaceFloorImageAlt`).
 *
 * Universal on purpose: unhead resolves the head again in the browser and would put the floor back.
 * The `01.` prefix registers this hook before plugins/auto-translate.ts, so in the machine-translated
 * locales the alt is the og:title's text and is translated with it.
 */
export default defineNuxtPlugin({
  name: 'og-image-alt',
  setup() {
    injectHead().hooks.hook('tags:resolve', (ctx: { tags: OgHeadTag[] }) => {
      replaceFloorImageAlt(ctx.tags)
    })
  },
})
