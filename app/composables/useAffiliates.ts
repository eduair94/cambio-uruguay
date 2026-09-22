// app/composables/useAffiliates.ts
import { affiliateLink, resolveAffiliateUrl, type AffiliateLinkModel } from '~/utils/affiliates'

/**
 * La mitad Nuxt del registro de afiliados: lee `runtimeConfig.public.affiliates` y le pasa las
 * URLs al módulo puro. Mismo contrato que `useAds`: con la config vacía, `canRender` es false y
 * `AffiliateLink` no dibuja nada. Las URLs viven en el entorno del build (`NUXT_PUBLIC_AFFILIATES_<ID>`)
 * porque el repo es público y un enlace de afiliado es media credencial.
 */
export function useAffiliates() {
  const publicConfig = useRuntimeConfig().public
  const overrides = (publicConfig.affiliates ?? {}) as Readonly<Record<string, unknown>>

  const urlFor = (id: string) => resolveAffiliateUrl(id, overrides)
  const canRender = (id: string) => urlFor(id) !== ''
  /** El modelo que dibuja `AffiliateLink`, con la ruta actual como `utm_content`. */
  const linkFor = (id: string, content?: string): AffiliateLinkModel | null =>
    affiliateLink(id, overrides, content)

  return { urlFor, canRender, linkFor }
}
