// Cross-links to our evergreen SEO articles on Medium (one per language).
// Surfaced on the blog hub and via the Organization `sameAs` schema so search
// engines associate the Medium profile with the brand.

export const MEDIUM_PROFILE = 'https://medium.com/@cambio-uruguay'

export interface MediumPost {
  locale: 'es' | 'en' | 'pt'
  url: string
  title: string
}

// NOTE: pt is pending publication (Medium caps newer authors at 2 stories per
// 24h). Add its entry here once live — the blog hub falls back to the profile
// link for locales without a matching post.
export const MEDIUM_POSTS: MediumPost[] = [
  {
    locale: 'es',
    url: 'https://cambio-uruguay.medium.com/c%C3%B3mo-saber-el-mejor-precio-del-d%C3%B3lar-en-uruguay-hoy-sin-recorrer-casas-de-cambio-27d3669d3839',
    title: 'Cómo saber el mejor precio del dólar en Uruguay hoy',
  },
  {
    locale: 'en',
    url: 'https://cambio-uruguay.medium.com/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-3a5fd46e3fc4',
    title: 'Currency Exchange in Uruguay: How to Find the Best Rate',
  },
]

export function mediumPostFor(locale: string): MediumPost | undefined {
  return MEDIUM_POSTS.find(p => p.locale === locale)
}
