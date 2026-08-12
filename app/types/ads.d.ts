// `definePageMeta({ ads: false })` — the per-page opt-out for pages that earn
// nothing from an ad or lose something by carrying one. Route-wide rules live
// in `utils/ads.ts`; this is the escape hatch for the exception.
declare module '#app' {
  interface PageMeta {
    ads?: boolean
  }
}

export {}
