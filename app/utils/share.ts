// Framework-agnostic social-share helpers. PURE module (no Vue/Nuxt runtime) so
// it is unit-tested in plain Node via vitest and shared by the ShareButtons
// component. Drives referral traffic: every share links back to the page.

/** Networks we expose share buttons for, in display order (WhatsApp first — UY). */
export type ShareNetwork = 'whatsapp' | 'twitter' | 'telegram' | 'facebook'

/** What to share: the canonical page URL and a short message. */
export interface ShareTarget {
  url: string
  text: string
}

/** Build the per-network share URLs for a given target. */
export function buildShareLinks(target: ShareTarget): Record<ShareNetwork, string> {
  const url = encodeURIComponent(target.url)
  const text = encodeURIComponent(target.text)
  const textAndUrl = encodeURIComponent(`${target.text} ${target.url}`)
  return {
    // WhatsApp packs text + url in one message (no native url param).
    whatsapp: `https://wa.me/?text=${textAndUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  }
}

/** UI metadata for each network: icon, brand colour and i18n label key. */
export const SHARE_NETWORKS: ReadonlyArray<{
  id: ShareNetwork
  labelKey: string
  icon: string
  color: string
}> = [
  { id: 'whatsapp', labelKey: 'share.whatsapp', icon: 'mdi-whatsapp', color: '#25D366' },
  { id: 'twitter', labelKey: 'share.twitter', icon: 'mdi-twitter', color: '#1DA1F2' },
  { id: 'telegram', labelKey: 'share.telegram', icon: '$telegram', color: '#229ED9' },
  { id: 'facebook', labelKey: 'share.facebook', icon: 'mdi-facebook', color: '#1877F2' },
]
