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

interface CurrencyData {
  currency: string
  rate: number
  exchangeHouse: string
}

export default defineNuxtPlugin(() => {
  // SEO utilities and optimizations
  const seoUtils = {
    // Generate currency-specific meta tags
    generateCurrencyMeta(
      currency: string = 'USD',
      location: string = 'TODOS',
    ): CurrencyMeta {
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

    // Generate structured data for currency exchange
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    generateCurrencyStructuredData(
      currency: string,
      rate: number,
      location: string,
    ): StructuredDataItem {
      return {
        '@context': 'https://schema.org',
        '@type': 'ExchangeRateSpecification',
        currency,
        currentExchangeRate: {
          '@type': 'UnitPriceSpecification',
          price: rate,
          priceCurrency: 'UYU',
        },
        validFrom: new Date().toISOString(),
        validThrough: new Date(Date.now() + 3600000).toISOString(), // Valid for 1 hour
        areaServed: {
          '@type': 'Country',
          name: 'Uruguay',
        },
      }
    },

    // Optimize images for better SEO
    optimizeImage(src: string, alt: string, width?: number, height?: number) {
      return {
        src,
        alt,
        loading: 'lazy' as const,
        width,
        height,
        sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      }
    },

    // Generate breadcrumb structured data
    generateBreadcrumbs(items: BreadcrumbItem[]): StructuredDataItem {
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }
    },

    // Generate FAQ structured data
    generateFAQ(faqs: FAQ[]): StructuredDataItem {
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }
    },

    // Performance optimization: preload critical resources
    preloadCriticalResources(): void {
      if (process.client) {
        // Preload API endpoints
        const link1 = document.createElement('link')
        link1.rel = 'dns-prefetch'
        link1.href = 'https://api.cambio-uruguay.com'
        document.head.appendChild(link1)

        // Preload critical CSS
        const link2 = document.createElement('link')
        link2.rel = 'preload'
        link2.href = '/css/critical.css'
        link2.as = 'style'
        document.head.appendChild(link2)
      }
    },

    // Update canonical URL based on current route
    updateCanonical(route: any): void {
      if (process.client) {
        let canonical = document.querySelector('link[rel="canonical"]')
        if (!canonical) {
          canonical = document.createElement('link')
          canonical.setAttribute('rel', 'canonical')
          document.head.appendChild(canonical)
        }
        canonical.setAttribute(
          'href',
          `https://cambio-uruguay.com${route.fullPath}`,
        )
      }
    },

    // Generate rich snippets for currency comparison
    generateComparisonStructuredData(
      currencies: CurrencyData[],
      location: string,
    ): StructuredDataItem {
      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `Comparación de Cotizaciones de Cambio en ${location}`,
        description:
          'Compara las mejores cotizaciones de cambio de divisas en Uruguay',
        category: 'Financial Services',
        offers: currencies.map((curr) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: `Cambio de ${curr.currency}`,
            description: `Servicio de cambio de ${curr.currency} en ${location}`,
          },
          price: curr.rate,
          priceCurrency: 'UYU',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: curr.exchangeHouse,
          },
        })),
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
