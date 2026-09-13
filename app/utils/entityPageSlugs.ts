// URL slugs for the three per-entity page families:
//
//   /couriers-uruguay/<courier>             one page per courier in utils/courierShipping.ts
//   /tarjetas-de-credito-uruguay/<programa> one page per programme in utils/cardRewards.ts
//   /tarjetas-de-debito-uruguay/<tarjeta>   one page per card in utils/debitCards.ts
//
// IMPORT-FREE on purpose. The index pages link every row to its detail page, the route guards
// resolve a slug and the sitemap lists every URL, and none of them needs a catalogue to know which
// slug belongs to which id. Importing the catalogues for that would pull the whole card and courier
// copy into every bundle that renders a link: /couriers-uruguay would ship both card catalogues.
// Same trade-off as `BANKOS_BANK_BY_CREDIT_PROGRAM` in utils/bankos.ts.
//
// The ids are therefore repeated here as plain strings. `tests/unit/entityPages.test.ts` pins each
// map against its catalogue in BOTH directions, so an id added without a slug, or a slug left
// behind by a removed id, turns CI red.
//
// A slug is how people search, not how the catalogue keys its row: "usx cargo" is typed with a
// space, so the courier keyed `usxcargo` lives at `usx-cargo`, and the OCA programme keyed
// `oca-oca-blue` is the Metraje, so it lives at `oca-metraje`. Once published a slug is a URL:
// never rename one.

/** The three families, keyed like their `/comparativas/<familia>` counterparts. */
export type EntityPageFamily = 'couriers' | 'tarjetas-de-credito' | 'tarjetas-de-debito'

export const ENTITY_PAGE_FAMILIES: readonly EntityPageFamily[] = Object.freeze([
  'couriers',
  'tarjetas-de-credito',
  'tarjetas-de-debito',
])

/** Courier id in `utils/courierShipping.ts` → URL slug. */
export const COURIER_PAGE_SLUGS: Readonly<Record<string, string>> = Object.freeze({
  gripper: 'gripper',
  soycourier: 'soy-courier',
  uruguaycargo: 'uruguay-cargo',
  enviamicompra: 'envia-mi-compra',
  aerobox: 'aerobox',
  casillamia: 'casilla-mia',
  puntomio: 'punto-mio',
  usxcargo: 'usx-cargo',
  urubox: 'urubox',
  starbox: 'starbox',
  buybox: 'buybox',
  grinbox: 'grinbox',
  glic: 'glic',
  'miami-box': 'miami-box',
  exur: 'exur',
})

/** Programme id in `utils/cardRewards.ts` → URL slug. */
export const CARD_PROGRAM_PAGE_SLUGS: Readonly<Record<string, string>> = Object.freeze({
  'brou-recompensa': 'brou-recompensa',
  'club-tienda-inglesa-puntos': 'tienda-inglesa-puntos',
  'scotia-puntos': 'scotia-puntos',
  'santander-soy-santander-puntos': 'soy-santander-puntos',
  'bbva-puntos-bbva': 'puntos-bbva',
  'bbva-comunidad-plus': 'bbva-comunidad-plus',
  'itau-volar': 'itau-volar',
  'itau-volar-platinum': 'itau-volar-platinum',
  'itau-latam-pass-platinum': 'itau-latam-pass-platinum',
  'itau-volar-black': 'itau-volar-black',
  'scotia-puntos-american-express': 'scotiabank-american-express',
  'scotia-connectmiles': 'copa-connectmiles',
  'itau-latam-pass-internacional': 'itau-latam-pass-internacional',
  'oca-oca-blue': 'oca-metraje',
  'scotia-club-card-tienda-inglesa': 'club-card-tienda-inglesa',
  'pronto-visa': 'pronto-visa',
  'mas-grupo-disco-sumaclub': 'hipermas-programa-mas',
  'creditel-credipuntos': 'creditel-credipuntos',
  'passcard-puntos-pass': 'passcard',
  'tarjeta-anda': 'tarjeta-anda',
  'cabal-uruguay': 'cabal',
  'tarjeta-lider': 'tarjeta-lider',
  'btg-uruguay-tdc': 'btg-pactual',
})

/** Card id in `utils/debitCards.ts` → URL slug. The ids already read the way people search. */
export const DEBIT_CARD_PAGE_SLUGS: Readonly<Record<string, string>> = Object.freeze({
  prex: 'prex',
  'oca-blue': 'oca-blue',
  'itau-debito': 'itau-debito',
  'bbva-debito': 'bbva-debito',
  midinero: 'midinero',
  'brou-debito': 'brou-debito',
  'scotiabank-debito': 'scotiabank-debito',
  'santander-debito': 'santander-debito',
  'mercado-pago': 'mercado-pago',
})

/** Where a family lives: its index page, the index's breadcrumb name and its slug map. */
export interface EntityPageRoute {
  index: string
  /** The name the index page gives itself in its own BreadcrumbList. */
  label: string
  slugs: Readonly<Record<string, string>>
}

export const ENTITY_PAGE_ROUTES: Readonly<Record<EntityPageFamily, EntityPageRoute>> =
  Object.freeze({
    couriers: {
      index: '/couriers-uruguay',
      label: 'Couriers en Uruguay',
      slugs: COURIER_PAGE_SLUGS,
    },
    'tarjetas-de-credito': {
      index: '/tarjetas-de-credito-uruguay',
      label: 'Tarjetas de crédito en Uruguay',
      slugs: CARD_PROGRAM_PAGE_SLUGS,
    },
    'tarjetas-de-debito': {
      index: '/tarjetas-de-debito-uruguay',
      label: 'Tarjetas de débito para comprar en dólares',
      slugs: DEBIT_CARD_PAGE_SLUGS,
    },
  })

/** Detail-page path for a catalogue id, or `undefined` when the id has no page. */
export function entityPagePath(family: EntityPageFamily, id: string): string | undefined {
  const route = ENTITY_PAGE_ROUTES[family]
  // `hasOwn`, not `slugs[id]`: a plain object answers `constructor` with a function.
  if (!route || !Object.hasOwn(route.slugs, id)) return undefined
  return `${route.index}/${route.slugs[id]}`
}

/** Catalogue id behind a slug, or `undefined` for an unknown one: the route guard's 404. */
export function entityIdForSlug(family: EntityPageFamily, slug: string): string | undefined {
  const slugs = ENTITY_PAGE_ROUTES[family]?.slugs
  if (!slugs) return undefined
  for (const [id, candidate] of Object.entries(slugs)) {
    if (candidate === slug) return id
  }
  return undefined
}

/** Every slug of a family, in catalogue order: what the sitemap submits. */
export function entityPageSlugs(family: EntityPageFamily): string[] {
  return Object.values(ENTITY_PAGE_ROUTES[family].slugs)
}

/** Every detail-page path of a family. */
export function entityPagePaths(family: EntityPageFamily): string[] {
  const route = ENTITY_PAGE_ROUTES[family]
  return entityPageSlugs(family).map(slug => `${route.index}/${slug}`)
}

/** `/couriers-uruguay/<slug>` for a courier id. */
export function courierPagePath(id: string): string | undefined {
  return entityPagePath('couriers', id)
}

/** `/tarjetas-de-credito-uruguay/<slug>` for a programme id. */
export function cardProgramPagePath(id: string): string | undefined {
  return entityPagePath('tarjetas-de-credito', id)
}

/** `/tarjetas-de-debito-uruguay/<slug>` for a debit-card id. */
export function debitCardPagePath(id: string): string | undefined {
  return entityPagePath('tarjetas-de-debito', id)
}
