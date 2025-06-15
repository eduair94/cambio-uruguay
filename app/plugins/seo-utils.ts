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

    // Generate WebApplication structured data for homepage
    generateWebApplicationData(): StructuredDataItem {
      return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Cambio Uruguay',
        description:
          'Plataforma para comparar cotizaciones de cambio de divisas en Uruguay',
        url: 'https://cambio-uruguay.com',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'All',
        browserRequirements: 'HTML5, CSS3, JavaScript',
        softwareVersion: '2.0.0',
        offers: {
          '@type': 'Offer',
          description: 'Comparación gratuita de más de 40 casas de cambio',
          price: '0',
          priceCurrency: 'USD',
        },
        author: {
          '@type': 'Organization',
          name: 'Cambio Uruguay',
          url: 'https://cambio-uruguay.com',
        },
        creator: {
          '@type': 'Person',
          name: 'Eduardo Airaudo',
          url: 'https://www.linkedin.com/in/eduardo-airaudo/',
          jobTitle: 'Developer & Founder',
        },
        featureList: [
          'Comparación de cotizaciones en tiempo real',
          'Más de 40 casas de cambio',
          'Filtros por ubicación',
          'Histórico de cotizaciones',
          'Notificaciones de cambios',
        ],
        screenshot: 'https://cambio-uruguay.com/img/banner.png',
      }
    },

    // Generate exchange house specific structured data
    generateExchangeHouseData(
      houseName: string,
      currencies: CurrencyData[],
    ): StructuredDataItem {
      return {
        '@context': 'https://schema.org',
        '@type': 'FinancialService',
        name: houseName,
        serviceType: 'Currency Exchange',
        areaServed: 'Uruguay',
        currenciesAccepted: currencies.map((curr) => curr.currency),
        offers: currencies.map((curr) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'ExchangeRateSpecification',
            currency: curr.currency,
            currentExchangeRate: {
              '@type': 'UnitPriceSpecification',
              price: curr.rate,
              priceCurrency: 'UYU',
            },
          },
        })),
      }
    },

    // Generate meta tags for Open Graph
    generateOpenGraphMeta(
      title: string,
      description: string,
      url: string,
      image?: string,
    ): Record<string, string> {
      return {
        'og:type': 'website',
        'og:site_name': 'Cambio Uruguay',
        'og:title': title,
        'og:description': description,
        'og:url': url,
        'og:image': image || 'https://cambio-uruguay.com/img/banner.png',
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:alt': title,
        'og:locale': 'es_ES',
      }
    },

    // Generate Twitter Card meta tags
    generateTwitterMeta(
      title: string,
      description: string,
      image?: string,
    ): Record<string, string> {
      return {
        'twitter:card': 'summary_large_image',
        'twitter:site': '@cambio_uruguay',
        'twitter:creator': '@cambio_uruguay',
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': image || 'https://cambio-uruguay.com/img/banner.png',
        'twitter:image:alt': title,
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
        ...this.generateOpenGraphMeta(
          options.title,
          options.description,
          options.canonicalUrl,
          options.ogImage,
        ),
        ...this.generateTwitterMeta(
          options.title,
          options.description,
          options.ogImage,
        ),
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
          script: options.structuredData.map((data) => ({
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
              innerHTML: JSON.stringify(
                this.generateBreadcrumbData(options.breadcrumbs),
              ),
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
