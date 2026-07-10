import { defineNuxtPlugin } from '#app'

interface CurrencyMeta {
  title: string
  description: string
  keywords: string
}

interface StructuredDataItem {
  '@context': string
  '@type': string
  [key: string]: any
}

interface BreadcrumbItem {
  name: string
  url: string
}

interface FAQ {
  question: string
  answer: string
}

export default defineNuxtPlugin(() => {
  // SEO utilities and optimizations
  const seoUtils = {
    // Generate currency-specific meta tags
    generateCurrencyMeta(currency: string = 'USD', location: string = 'TODOS'): CurrencyMeta {
      const currencyNames: { [key: string]: string } = {
        USD: 'Dólares Estadounidenses',
        ARS: 'Pesos Argentinos',
        BRL: 'Reales Brasileños',
        EUR: 'Euros',
        GBP: 'Libras Esterlinas',
      }

      const locationNames: { [key: string]: string } = {
        TODOS: 'Uruguay',
        MONTEVIDEO: 'Montevideo',
        'PUNTA-DEL-ESTE': 'Punta del Este',
        COLONIA: 'Colonia',
        SALTO: 'Salto',
      }

      const currencyName = currencyNames[currency] || currency
      const locationName = locationNames[location] || location

      return {
        title: `Cambio ${currencyName} en ${locationName} - Mejores Cotizaciones`,
        description: `Encuentra las mejores cotizaciones para cambio de ${currencyName} en ${locationName}. Compara precios de más de 40 casas de cambio en tiempo real.`,
        keywords: `cambio ${currency.toLowerCase()}, ${currencyName.toLowerCase()}, cotizaciones ${currency.toLowerCase()}, casas cambio ${locationName.toLowerCase()}`,
      }
    },

    // Generate canonical URL with proper formatting
    generateCanonicalUrl(path: string): string {
      const baseUrl = 'https://cambio-uruguay.com'
      // Ensure no double slashes and proper formatting
      const cleanPath = path.startsWith('/') ? path : `/${path}`
      return `${baseUrl}${cleanPath}`
    },

    // Generate breadcrumb structured data
    generateBreadcrumbData(breadcrumbs: BreadcrumbItem[]): StructuredDataItem {
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }
    },

    // Generate FAQ structured data
    generateFAQData(faqs: FAQ[]): StructuredDataItem {
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }
    },

    // Generate meta tags for Open Graph. Image tags are intentionally NOT
    // included here — nuxt-og-image's defineOgImageComponent (called
    // per-page, see preguntas-frecuentes.vue) is the single source of truth
    // for og:image/twitter:image; setting them here too produced duplicate,
    // competing tags on any page that used both.
    generateOpenGraphMeta(title: string, description: string, url: string): Record<string, string> {
      return {
        'og:type': 'website',
        'og:site_name': 'Cambio Uruguay',
        'og:title': title,
        'og:description': description,
        'og:url': url,
        'og:locale': 'es_ES',
      }
    },

    // Generate Twitter Card meta tags (image handled by nuxt-og-image, see above).
    generateTwitterMeta(title: string, description: string): Record<string, string> {
      return {
        'twitter:card': 'summary_large_image',
        'twitter:site': '@cambio_uruguay',
        'twitter:creator': '@cambio_uruguay',
        'twitter:title': title,
        'twitter:description': description,
      }
    },

    // Generate complete SEO meta setup for a page
    setupPageSEO(options: {
      title: string
      description: string
      keywords?: string
      canonicalUrl: string
      ogImage?: string
      structuredData?: StructuredDataItem[]
      breadcrumbs?: BreadcrumbItem[]
    }) {
      // Set basic meta tags
      useSeoMeta({
        title: options.title,
        description: options.description,
        keywords: options.keywords,
        ...this.generateOpenGraphMeta(options.title, options.description, options.canonicalUrl),
        ...this.generateTwitterMeta(options.title, options.description),
      })

      // Set canonical URL
      useHead({
        link: [
          {
            rel: 'canonical',
            href: options.canonicalUrl,
          },
        ],
      })

      // Add structured data if provided
      if (options.structuredData && options.structuredData.length > 0) {
        useHead({
          script: options.structuredData.map(data => ({
            type: 'application/ld+json',
            innerHTML: JSON.stringify(data),
          })),
        })
      }

      // Add breadcrumb structured data if provided
      if (options.breadcrumbs && options.breadcrumbs.length > 0) {
        useHead({
          script: [
            {
              type: 'application/ld+json',
              innerHTML: JSON.stringify(this.generateBreadcrumbData(options.breadcrumbs)),
            },
          ],
        })
      }
    },
  }

  // Return plugin object for Nuxt 3
  return {
    provide: {
      seo: seoUtils,
    },
  }
})
