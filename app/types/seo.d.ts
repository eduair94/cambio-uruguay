// TypeScript declarations for SEO utilities
declare module 'vue/types/vue' {
  interface Vue {
    $seo: {
      generateCurrencyMeta(
        currency?: string,
        location?: string
      ): {
        title: string
        description: string
        keywords: string
      }
      generateCurrencyStructuredData(currency: string, rate: number, location: string): any
      optimizeImage(src: string, alt: string, width?: number, height?: number): any
      generateBreadcrumbs(items: { name: string; url: string }[]): any
      generateFAQ(faqs: { question: string; answer: string }[]): any
      preloadCriticalResources(): void
      updateCanonical(route: any): void
      generateComparisonStructuredData(currencies: any[], location: string): any
    }
  }
}

declare module '@nuxt/types' {
  interface Context {
    $seo: {
      generateCurrencyMeta(
        currency?: string,
        location?: string
      ): {
        title: string
        description: string
        keywords: string
      }
      generateCurrencyStructuredData(currency: string, rate: number, location: string): any
      optimizeImage(src: string, alt: string, width?: number, height?: number): any
      generateBreadcrumbs(items: { name: string; url: string }[]): any
      generateFAQ(faqs: { question: string; answer: string }[]): any
      preloadCriticalResources(): void
      updateCanonical(route: any): void
      generateComparisonStructuredData(currencies: any[], location: string): any
    }
  }
}

export {}
