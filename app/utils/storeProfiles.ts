// Shapes and pure helpers for /tiendas-online-uruguay, the store-by-store directory.
//
// `app/utils` is a FLAT auto-import namespace, so every export here is prefixed `store`/`STORE_` —
// a bare `faq()` or `buyingAdvice()` would be one collision away from shadowing another page's util.
//
// The types below mirror `classes/stores/profile.ts` and `classes/stores/signals/*.ts` field by
// field: app/ is a separate package that cannot import from the repo root (see AGENTS.md), so this
// is a hand-kept copy, not a re-export. `tests/stores/*` and this app's own tests are what keep the
// shapes honest; nothing here talks to Mongo.
//
// NO VERDICT LIVES HERE EITHER. Every function below reports facts with their source and date —
// never "confiable"/"estafa"/"recomendamos"/"evitá" — because a signal here is a dated observation
// (a Trustpilot score, a Reddit mention count), not a rating this site computes.
import { STORE_KIND_LABELS, type StoreKind } from './storeDirectory'

/** Mirrors `classes/stores/profile.ts` `STORE_SIGNAL_MAX_AGE_DAYS`; parity checked alongside
 * `STORE_INDEXABLE_MIN_SIGNALS` in `app/tests/unit/storeConstantsParity.test.ts`. A signal older
 * than this is not shown as if it were current, even though the field is still there (the backend
 * keeps a stale value with its OLD `checkedAt` rather than erase it — see the profile module
 * header). */
export const STORE_SIGNAL_MAX_AGE_DAYS = 60

/** Mirrors `classes/stores/profile.ts` `INDEXABLE_MIN_SIGNALS`; parity checked alongside
 * `STORE_SIGNAL_MAX_AGE_DAYS` in `app/tests/unit/storeConstantsParity.test.ts` (lives in the app
 * suite, not the root one — a root test cannot load an app/ file). A page with fewer fresh
 * signals than this has too little to say to be worth indexing — see {@link storeIndexable}. */
export const STORE_INDEXABLE_MIN_SIGNALS = 3

export interface StoreSitePolicies {
  returns: string | null
  terms: string | null
  privacy: string | null
}

export interface StoreSiteSignal {
  status: 'ok' | 'blocked'
  finalHost: string
  https: boolean
  platform: string
  phone: boolean
  whatsapp: boolean
  email: boolean
  rut: string | null
  address: string | null
  policies: StoreSitePolicies
  payments: string[]
  checkedAt: string
}

export interface StoreAgeSignal {
  since: string
  source: 'crt.sh' | 'wayback'
  checkedAt: string
}

export interface StoreTrustpilotSignal {
  score: number
  reviews: number
  reviewsLast12m: number
  claimed: boolean
  alerts: number
  url: string
  checkedAt: string
}

export interface StoreGoogleSignal {
  rating: number
  reviews: number
  address: string | null
  url: string
  checkedAt: string
}

export interface StoreRedditTone {
  complaints: number
  recommendations: number
  neutral: number
  classified: number
}

export interface StoreRedditThread {
  title: string
  date: string
  url: string
  score: number
}

export interface StoreRedditSignal {
  mentions: number
  byYear: Record<string, number>
  threads: StoreRedditThread[]
  tone: StoreRedditTone | null
  capped: boolean
  checkedAt: string
}

export interface StoreCatalogVertical {
  key: string
  label: string
  url: string
  offers: number
}

export interface StoreCatalogSignal {
  offers: number
  verticals: StoreCatalogVertical[]
  checkedAt: string
}

/** The shape `GET /api/stores/<slug>` publishes — the backend document minus its working state
 * (`toneCache`, `redditMentions`, `redditCursor`, `redditTermsKey`) and Mongo bookkeeping, which no
 * route ever selects (see the model file header on why those exist at all). */
export interface StorePublicProfile {
  key: string
  name: string
  domain: string | null
  kind: StoreKind
  rubros: string[]
  aliases: string[]
  site: StoreSiteSignal | null
  age: StoreAgeSignal | null
  trustpilot: StoreTrustpilotSignal | null
  google: StoreGoogleSignal | null
  reddit: StoreRedditSignal | null
  catalog: StoreCatalogSignal | null
  signals: number
  indexable: boolean
  firstSeen: string
  lastSeen: string
}

/**
 * Whether a single signal's own `checkedAt` is still within `STORE_SIGNAL_MAX_AGE_DAYS` of `now`.
 * Exported (fix round 1) so every place that publishes a raw signal field — the hub's `StoreCard`
 * included — gates it through the exact same rule `storeFreshSignals`/`storeSignalSummary` use,
 * instead of re-deriving (or forgetting) the cutoff locally.
 */
export function storeSignalFresh(
  checkedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!checkedAt) return false
  const at = Date.parse(checkedAt)
  if (Number.isNaN(at)) return false
  return now.getTime() - at <= STORE_SIGNAL_MAX_AGE_DAYS * 86_400_000
}

/**
 * How many of a profile's signals are both present and no older than `STORE_SIGNAL_MAX_AGE_DAYS`,
 * mirroring `classes/stores/profile.ts` `countFreshSignals` field by field (a signal that exists but
 * says nothing — a site read as blocked, a Reddit search with zero mentions, a catalogue presence
 * with zero offers — does not count there either). The backend recomputes this at write time, but a
 * profile is only rewritten when at least one outside source answered that week; if every source was
 * down, the stored `signals`/`indexable` fields keep aging past what is actually still true. Calling
 * this instead of trusting `profile.signals` is what makes the page's own "señales" honest against
 * `now`, not against whenever the document last happened to be saved.
 */
export function storeFreshSignals(profile: StorePublicProfile, now: Date = new Date()): number {
  let count = 0
  if (profile.site && profile.site.status === 'ok' && storeSignalFresh(profile.site.checkedAt, now))
    count++
  if (profile.age && storeSignalFresh(profile.age.checkedAt, now)) count++
  if (profile.trustpilot && storeSignalFresh(profile.trustpilot.checkedAt, now)) count++
  if (profile.google && storeSignalFresh(profile.google.checkedAt, now)) count++
  if (
    profile.reddit &&
    profile.reddit.mentions > 0 &&
    storeSignalFresh(profile.reddit.checkedAt, now)
  )
    count++
  if (
    profile.catalog &&
    profile.catalog.offers > 0 &&
    storeSignalFresh(profile.catalog.checkedAt, now)
  )
    count++
  return count
}

/**
 * Whether a store page currently has enough to say to be worth indexing, mirroring
 * `classes/stores/profile.ts`'s `count >= INDEXABLE_MIN_SIGNALS` at write time — recomputed against
 * `now` for the same reason {@link storeFreshSignals} is: the stored `indexable` field is a snapshot
 * from whenever the backend last wrote the document, and a store that has since gone stale (every
 * outside source down for two months, nothing to trigger a rewrite) must not keep reading as
 * indexable just because nobody wrote it down again.
 */
export function storeIndexable(profile: StorePublicProfile, now: Date = new Date()): boolean {
  return storeFreshSignals(profile, now) >= STORE_INDEXABLE_MIN_SIGNALS
}

/** `1.4` -> `"1,4"`. Deliberately not `toLocaleString`: a score out of 5 always fits one decimal
 * digit, and fixing it avoids any ICU-driven rounding surprise on a number this small. */
function esDecimal(value: number): string {
  return value.toFixed(1).replace('.', ',')
}

/** `12345` -> `"12.345"` — the codebase's own grouping convention (`equiparMoney`,
 * `app/utils/equipar.ts`) for an integer count: a review/mention/offer total can run into the
 * thousands (Trustpilot, Google Maps), and an ungrouped run of digits reads as a typo. */
function esCount(value: number): string {
  return value.toLocaleString('es-UY')
}

/**
 * The dated facts a profile can show right now, oldest logic shared by `storeSignalSummary` and the
 * "¿es confiable?" FAQ answer: only signals that pass {@link storeFreshSignals}'s own freshness rule
 * make the list, field by field, so a Trustpilot score from 61 days ago simply is not one of the
 * sentences — not relabelled, not marked "desactualizado", just absent, the same rule the count uses.
 */
function signalFacts(profile: StorePublicProfile, now: Date): string[] {
  const facts: string[] = []
  if (profile.trustpilot && storeSignalFresh(profile.trustpilot.checkedAt, now)) {
    const t = profile.trustpilot
    facts.push(`Trustpilot: ${esDecimal(t.score)} sobre 5 en ${esCount(t.reviews)} reseñas`)
  }
  if (profile.google && storeSignalFresh(profile.google.checkedAt, now)) {
    const g = profile.google
    facts.push(`Google Maps: ${esDecimal(g.rating)} sobre 5 en ${esCount(g.reviews)} reseñas`)
  }
  if (profile.age && storeSignalFresh(profile.age.checkedAt, now)) {
    facts.push(`dominio registrado desde ${profile.age.since}`)
  }
  if (
    profile.site &&
    profile.site.status === 'ok' &&
    storeSignalFresh(profile.site.checkedAt, now)
  ) {
    facts.push(`sitio propio verificado el ${profile.site.checkedAt.slice(0, 10)}`)
  }
  if (
    profile.reddit &&
    profile.reddit.mentions > 0 &&
    storeSignalFresh(profile.reddit.checkedAt, now)
  ) {
    facts.push(`${esCount(profile.reddit.mentions)} menciones en r/uruguay y r/montevideo`)
  }
  if (
    profile.catalog &&
    profile.catalog.offers > 0 &&
    storeSignalFresh(profile.catalog.checkedAt, now)
  ) {
    facts.push(`${esCount(profile.catalog.offers)} ofertas relevadas en nuestro propio catálogo`)
  }
  return facts
}

/**
 * One factual sentence, no adjectives, built only from signals {@link storeFreshSignals} still
 * counts as fresh. Never contains a verdict word ("confiable", "estafa", "recomendamos", "evitá") —
 * `tests/unit/storeProfiles.test.ts` checks this directly, and it is the whole point of the page: a
 * number and where it comes from, not a score this site invented.
 */
export function storeSignalSummary(profile: StorePublicProfile, now: Date = new Date()): string {
  const facts = signalFacts(profile, now)
  if (!facts.length) return `Todavía no hay señales verificadas de ${profile.name}.`
  return `${facts.join('. ')}.`
}

interface StoreFaqItem {
  question: string
  answer: string
}

/** Google's listing first (it is checked against the store's own domain — see
 * `classes/stores/signals/google.ts`'s `sameSite`), the site's own JSON-LD `PostalAddress` second. */
function storeAddress(profile: StorePublicProfile): { address: string; source: string } | null {
  if (profile.google?.address) return { address: profile.google.address, source: 'Google Maps' }
  if (profile.site?.address)
    return { address: profile.site.address, source: 'el sitio de la tienda' }
  return null
}

/**
 * The three FAQs every store page asks, plus a fourth about card discounts when `bankosBrandSlug`
 * resolved one (Task 8's `GET /api/stores/<slug>` finds it by matching the store's name/aliases
 * against Bankos' own brand slugs — see the route). Every answer is built from `profile`, never
 * phrased as a verdict.
 */
export function storeFaq(
  profile: StorePublicProfile,
  bankosBrandSlug: string | null
): StoreFaqItem[] {
  const now = new Date()
  const facts = signalFacts(profile, now)
  const confiableBody = facts.length
    ? `${facts.join('. ')}.`
    : `Todavía no hay señales verificadas de ${profile.name}.`

  const address = storeAddress(profile)

  const faqs: StoreFaqItem[] = [
    {
      question: `¿${profile.name} es confiable?`,
      answer: `${confiableBody} No es una calificación nuestra: cada dato dice de dónde sale.`,
    },
    {
      question: `¿${profile.name} tiene local físico?`,
      answer: address
        ? `Sí: ${address.address}, según ${address.source}.`
        : 'No encontramos una dirección publicada.',
    },
    {
      question: `¿Cómo le reclamo a ${profile.name}?`,
      answer:
        `Reclamale primero directo a ${profile.name}, por escrito y con fecha (mail, WhatsApp o el ` +
        'canal que publique en su sitio). Si no responde o no resuelve, el reclamo es gratis ante el ' +
        'Área de Defensa del Consumidor del Ministerio de Economía y Finanzas (0800 7005).',
    },
  ]

  faqs.push({
    question: `¿${profile.name} tiene descuentos con tarjeta?`,
    answer: bankosBrandSlug
      ? `Sí, tiene descuentos publicados en /descuentos-con-tarjeta-uruguay/marca/${bankosBrandSlug}.`
      : `${profile.name} no tiene una página propia de descuentos con tarjeta en el sitio.`,
  })

  return faqs
}

export interface StoreBuyingAdviceItem {
  text: string
  to?: string
}

export interface StoreBuyingAdvice {
  title: string
  items: StoreBuyingAdviceItem[]
}

/**
 * What to check before buying, by store kind — links only, never a verdict on the store itself. A
 * `compra-exterior` store (Temu, Shein, AliExpress, Amazon, eBay, Tiendamia) is bought under the
 * customs regime, so the advice is about the franchise/IVA/customs, not consumer law; everything
 * bought in Uruguay (`tienda-uy` and `marketplace`, i.e. Mercado Libre) falls under the Ley 17.250
 * consumer-rights regime instead. Text kept consistent with `app/utils/consumerRights.ts`'s own
 * wording of the art. 16 arrepentimiento (5 días hábiles).
 */
export function storeBuyingAdvice(kind: StoreKind): StoreBuyingAdvice {
  if (kind === 'compra-exterior') {
    return {
      title: 'Antes de comprar en el exterior',
      items: [
        {
          text: 'Revisá la franquicia de aduana vigente y cuánto de tu cupo anual de US$ 800 ya usaste.',
          to: '/franquicia-aduana-uruguay',
        },
        {
          text: 'Mirá cuánto IVA pagás y cuándo te lo cobran, con la guía del impuesto Temu.',
          to: '/guias/impuesto-temu-uruguay',
        },
        {
          text: 'Si el paquete queda retenido o la liquidación no cierra, así se resuelve un problema con la Aduana.',
          to: '/problemas-con-la-aduana-uruguay',
        },
      ],
    }
  }

  return {
    title: `Tus derechos al comprar en ${STORE_KIND_LABELS[kind].toLowerCase()}`,
    items: [
      {
        text:
          'Tenés derecho de arrepentimiento de 5 días hábiles en las compras a distancia, sin dar ' +
          'motivo (Ley 17.250 art. 16).',
        to: '/derechos-consumidor-compras-online',
      },
      {
        text:
          'Si no cumplen o no te responden, el reclamo es gratis ante el Área de Defensa del ' +
          'Consumidor del Ministerio de Economía y Finanzas.',
        to: '/defensa-al-consumidor-uruguay',
      },
    ],
  }
}
