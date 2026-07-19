// app/composables/useRedditSentiment.ts
// One shared reader for the daily Reddit sentiment snapshot (/api/reddit-sentiment).
//
// Three pages quote Reddit — the bank tier list, the debit-card ranking and the
// credit-card ranking. They all go through this composable so:
//   - there is ONE request (stable `key`), not one per page/component;
//   - the "has Reddit actually judged this?" rule lives in one place;
//   - the colour/label helpers can't drift between pages.
//
// The snapshot is a daily MongoDB read — never a live Reddit call from the browser.

export interface RedditQuote {
  text: string
  permalink: string
  date: string
  score: number
  sub: string
  polarity: number
}

export interface RedditEntitySentiment {
  id: string
  name: string
  mentions: number
  positive: number
  negative: number
  neutral: number
  /** positive + negative — the only mentions that can move `net`. */
  opinions: number
  /** Weighted net sentiment over the opinions, −100 … +100. */
  net: number
  label: string
  themes: { theme: string; count: number }[]
  quotes: RedditQuote[]
  summary: string | null
  latestMentionDate: string | null
}

export interface RedditSnapshot {
  entities: RedditEntitySentiment[]
  asOf: string | null
  empty: boolean
  subs: string[]
  minSample: number
}

/** Theme ids the scorer emits → what we call them on screen. */
export const REDDIT_THEME_LABELS: Readonly<Record<string, string>> = Object.freeze({
  app: 'App',
  comisiones: 'Comisiones',
  atencion: 'Atención',
  usd: 'Dólares',
  productos: 'Productos',
  cobertura: 'Cobertura',
})

/** Sentiment band → a class, so the colour can differ per theme. */
export const netClass = (net: number): 'pos' | 'mix' | 'neg' =>
  net >= 15 ? 'pos' : net > -15 ? 'mix' : 'neg'

/** Sentiment band → a Vuetify colour token. */
export const netColor = (net: number): string =>
  net >= 15 ? 'success' : net > -15 ? 'warning' : 'error'

/** Sentiment band → a raw hue, for the bars we draw ourselves. */
export const netHue = (net: number): string =>
  net >= 15 ? '#16a34a' : net > -15 ? '#ca8a04' : '#dc2626'

export function useRedditSentiment() {
  // Client-only: the snapshot is not worth blocking SSR for, and a stable key
  // means the three pages (and every component inside them) share one payload.
  const { data, pending } = useLazyFetch<RedditSnapshot>('/api/reddit-sentiment', {
    key: 'reddit-sentiment',
    server: false,
  })

  const entities = computed(() => data.value?.entities ?? [])
  const minSample = computed(() => data.value?.minSample ?? 5)
  const subs = computed(() =>
    (data.value?.subs ?? ['uruguay', 'Burises', 'UruguayFinanzas']).map(s => `r/${s}`).join(', ')
  )
  const asOf = computed(() => {
    const iso = data.value?.asOf
    if (!iso) return ''
    const d = new Date(iso)
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
  })

  /** The raw entity, judged or not. */
  function byId(id: string): RedditEntitySentiment | null {
    return entities.value.find(e => e.id === id) ?? null
  }

  /**
   * The Reddit verdict for an entity, or null when Reddit hasn't actually judged
   * it. Silence is not a verdict: too few opinions (or no quotes to show) means
   * we render nothing rather than implying a score.
   */
  function judged(id: string | null | undefined): RedditEntitySentiment | null {
    if (!id) return null
    const e = byId(id)
    return e && e.label !== 'sin datos' && e.quotes.length ? e : null
  }

  /** Entities Reddit judged, busiest first — optionally restricted to `ids`. */
  function judgedList(ids?: readonly string[]): RedditEntitySentiment[] {
    const pool = ids?.length
      ? ids.map(id => judged(id)).filter((e): e is RedditEntitySentiment => !!e)
      : entities.value.filter(e => e.label !== 'sin datos' && e.quotes.length)
    // de-dupe: several cards can point at the same issuer (Itaú débito + Itaú crédito)
    const seen = new Set<string>()
    return pool
      .filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      .sort((a, b) => b.opinions - a.opinions)
  }

  /** Named in the corpus but under the sample floor — we say so instead of inventing. */
  function unjudgedList(ids?: readonly string[]): RedditEntitySentiment[] {
    const pool = entities.value.filter(e => e.label === 'sin datos' && e.mentions > 0)
    const wanted = ids?.length ? pool.filter(e => ids.includes(e.id)) : pool
    const seen = new Set<string>()
    return wanted.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)))
  }

  return {
    snapshot: data,
    pending,
    entities,
    minSample,
    subs,
    asOf,
    byId,
    judged,
    judgedList,
    unjudgedList,
  }
}
