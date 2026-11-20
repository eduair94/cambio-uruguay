/**
 * Where to send a search the site index cannot answer.
 *
 * The header search indexes pages, guides, currencies and casas, never a car, motorbike or phone
 * model: "hyundai creta" typed on the Hyundai Creta price page dead-ended (GA4, 28 days: 54
 * `search_no_results` against 42 `search_select`, 12 of them from car price pages). The
 * directories that do list those models already filter by the URL, so the dead end only has to
 * hand the query over.
 *
 * Pure and deterministic: the palette (client) and `/buscar` (SSR) render the same links.
 *
 * Only the directory the query names is offered — three unrelated directories under every dead
 * end is noise. The order of evidence: words of the query (brands, models, product words), then
 * the page the search was opened on. With neither, nothing is offered: a currency typo on the
 * home page (17 of the 54 dead ends started on `/`) has no directory to go to. `basis` says which
 * of the two decided, so a caller can also show the links under a "¿Quisiste decir…?": a single
 * word like "impreza" is rescued into an unrelated page before it ever reaches the empty state.
 *
 * What each directory accepts, read from its normalizer, not assumed:
 * - `/autos-usados-uruguay?q=` — `normalizeCarsQuery`, 80 characters, regex over the title.
 * - `/alquileres-uruguay?q=` — `normalizeRentalQuery`, 80 characters.
 * - `/equipar-casa-uruguay/productos?q=` — `normalizeEquiparProductosQuery`.
 * - `/motos-usadas-uruguay?marca=` — no free text; `marca` is the catalogue `brandSlug`.
 * - `/celulares-uruguay?marca=` — no free text; `marca` is the phone brand id.
 * The brand slugs below are the ones the live catalogues published on 2026-11-20
 * (`/api/motos` facets, `/api/phones` brands); a brand with no listing is not linked.
 */
import { tokenize } from '~/utils/siteNav'

export type DirectoryId = 'autos' | 'motos' | 'celulares' | 'alquileres' | 'equipar'

/** `query`: the typed text goes in `?q=`; `brand`: filtered by `?marca=`; `browse`: the bare hub. */
export type DirectoryLinkKind = 'query' | 'brand' | 'browse'

export interface DirectoryLink {
  id: DirectoryId
  kind: DirectoryLinkKind
  /** Route without locale prefix; the caller wraps it in `localePath`. */
  path: string
  /** `''` or `?…`, already encoded. */
  search: string
  /** `path + search`, for tests and tracking. */
  to: string
  /** The query as it will travel (trimmed, spaces collapsed, capped). */
  q: string
  /** Display name of the brand, for `kind: 'brand'`. */
  brandLabel?: string
}

/** What decided the links: the words of the query, the page it was typed on, or nothing. */
export type DirectoryBasis = 'query' | 'page' | 'none'

export interface DirectorySearch {
  basis: DirectoryBasis
  links: DirectoryLink[]
}

/** The car and rental normalizers cut at 80; longer text would be truncated there anyway. */
export const DIRECTORY_Q_MAX = 80

const words = (list: string) => new Set(list.split(/\s+/).filter(Boolean))

/** Makes that are cars (and only cars, in the Uruguayan market). */
const CAR_BRANDS = words(`
  hyundai chevrolet chevy volkswagen vw fiat renault peugeot toyota ford nissan kia citroen chery
  byd jeep mitsubishi subaru audi mercedes mercedes-benz geely jac haval mazda volvo porsche lexus
  dodge chrysler dfsk baic jetour omoda changan jaguar alfa skoda opel tesla
`)

/**
 * Models people type. Spanish or English words that are also model names ("uno", "up", "alto",
 * "rio", "ka", "fit", "spin", "toro", "polo", "march") are left out: a dead end on "alquiler alto"
 * must not send anyone to used cars.
 */
const CAR_MODELS = words(`
  creta hb20 tucson santa-fe i10 i30 accent elantra gol onix prisma cruze tracker s10 montana
  hilux corolla etios yaris sw4 rav4 duster sandero logan kwid clio kangoo oroch captur
  partner fiesta ecosport ranger focus territory versa sentra frontier palio mobi argo
  cronos strada fiorino pulse virtus voyage saveiro amarok golf vento tiggo compass renegade
  impreza wrx sti forester outback lancer l200 outlander picanto sportage cerato seltos swift
  vitara celerio civic corolla-cross hr-v crv cr-v berlingo c3 c4 cactus cooper ibiza
`)

/**
 * Car words that are also something else: years ("crisis 2008"), sizes ("mini heladera"), English.
 * They count only next to a car word that stands on its own ("peugeot 2008", "mini cooper").
 */
const WEAK_CAR = words('mini seat 208 2008 308 3008 5008')

const CAR_WORDS = words(`
  auto autos coche coches carro carros camioneta camionetas pickup pick-up sedan suv 4x4
  automotora automotoras
`)

/** Makes that build both cars and motorbikes: the rest of the query decides the order. */
const SHARED_BRANDS: Readonly<Record<string, string>> = {
  honda: 'honda',
  suzuki: 'suzuki',
  bmw: 'bmw',
}

/** Motorbike makes → the `brandSlug` of `/motos-usadas-uruguay?marca=`. */
const MOTO_BRANDS: Readonly<Record<string, string>> = {
  yamaha: 'yamaha',
  ktm: 'ktm',
  kawasaki: 'kawasaki',
  yumbo: 'yumbo',
  zanella: 'zanella',
  bajaj: 'bajaj',
  baccio: 'baccio',
  husqvarna: 'husqvarna',
  benelli: 'benelli',
  harley: 'harley-davidson',
  'harley-davidson': 'harley-davidson',
  keeway: 'keeway',
  ducati: 'ducati',
  cfmoto: 'cfmoto',
  triumph: 'triumph',
  vespa: 'vespa',
  motomel: 'motomel',
  aprilia: 'aprilia',
  zontes: 'zontes',
  voge: 'voge',
}

/** A moto make that is also an English word: counts only next to another motorbike word. */
const WEAK_MOTO: Readonly<Record<string, string>> = { winner: 'winner' }

/** Two-word makes, matched on adjacent tokens. */
const MOTO_BRAND_PAIRS: Readonly<Record<string, string>> = {
  'royal enfield': 'royal-enfield',
  'harley davidson': 'harley-davidson',
}

/**
 * Motorbike models, so a make that also builds cars orders by the model: "honda wave" is a bike.
 * Spanish and Portuguese words are left out ("tornado", "pulsar", "dominar", "fazer").
 */
const MOTO_MODELS = words(`
  wave biz cg titan xr xre cbr cb190 nmax ybr crypton xtz fz gixxer duke sapucai rouser
`)

const MOTO_WORDS = words('moto motos motocicleta motocicletas scooter scooters ciclomotor')

/** Phone brand words → the brand id `/celulares-uruguay?marca=` filters by. */
const PHONE_BRANDS: Readonly<Record<string, string>> = {
  iphone: 'apple',
  apple: 'apple',
  samsung: 'samsung',
  galaxy: 'samsung',
  motorola: 'motorola',
  razr: 'motorola',
  xiaomi: 'xiaomi',
  redmi: 'xiaomi',
  oppo: 'oppo',
  tcl: 'tcl',
}

/** A phone make that is also a word ("honor y gloria"): only next to a phone word or model. */
const WEAK_PHONE: Readonly<Record<string, string>> = { honor: 'honor' }

/** A phone model token: "x8", "90", "x7b", "magic5". */
const PHONE_MODEL = /^(?:[a-z]{0,5}\d{1,3}[a-z]?|magic\d*)$/

/** Labels as `/api/phones` publishes them. */
const PHONE_BRAND_LABEL: Readonly<Record<string, string>> = {
  apple: 'Apple',
  samsung: 'Samsung',
  motorola: 'Motorola',
  xiaomi: 'Xiaomi',
  honor: 'Honor',
  oppo: 'Oppo',
  tcl: 'TCL',
}

const PHONE_WORDS = words('celular celulares telefono telefonos smartphone smartphones')

/** "moto g54", "moto e22", "moto edge": Motorola's own line names, not a motorbike. */
const MOTOROLA_LINE = /^(?:[ge]\d{1,3}[a-z]?|edge)$/

const RENTAL_WORDS = words(`
  alquiler alquileres alquilar alquilo arriendo arrendamiento apartamento apartamentos apto aptos
  monoambiente monoambientes dormitorio dormitorios garantia inquilino inquilinos
`)

const EQUIPAR_WORDS = words(`
  heladera heladeras freezer lavarropas secarropas lavavajillas colchon colchones sommier
  sommiers televisor televisores tv microondas aspiradora aspiradoras cafetera cafeteras calefon
  calefones termotanque estufa estufas sofa sofas sillon ropero roperos placard impresora
  impresoras tostadora tostadoras plancha planchas olla ollas sarten sartenes vajilla cubiertos
  almohada almohadas acolchado acolchados sabanas toallas pava pavas mixer deshumidificador
  deshumidificadores acondicionado split horno
`)

/** Makes whose name is not the title-cased slug. */
const MOTO_BRAND_LABEL: Readonly<Record<string, string>> = {
  bmw: 'BMW',
  ktm: 'KTM',
  cfmoto: 'CFMoto',
  'harley-davidson': 'Harley-Davidson',
}

const TITLE_CASE = (slug: string) =>
  MOTO_BRAND_LABEL[slug] ??
  slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

/** The directory whose hub the current page belongs to, from its path (any locale prefix). */
const PATH_FAMILY: ReadonlyArray<[RegExp, DirectoryId]> = [
  [/(?:^|\/)autos-usados-uruguay(?:\/|$)/, 'autos'],
  [/(?:^|\/)motos-usadas-uruguay(?:\/|$)/, 'motos'],
  [/(?:^|\/)celulares-uruguay(?:\/|$)/, 'celulares'],
  [/(?:^|\/)alquileres-uruguay(?:\/|$)/, 'alquileres'],
  [/(?:^|\/)equipar-casa-uruguay(?:\/|$)/, 'equipar'],
]

/** Tie-break order. */
const ORDER: readonly DirectoryId[] = ['autos', 'motos', 'celulares', 'alquileres', 'equipar']

const PATHS: Readonly<Record<DirectoryId, string>> = {
  autos: '/autos-usados-uruguay',
  motos: '/motos-usadas-uruguay',
  celulares: '/celulares-uruguay',
  alquileres: '/alquileres-uruguay',
  equipar: '/equipar-casa-uruguay/productos',
}

interface Signals {
  score: Record<DirectoryId, number>
  motoBrand?: string
  phoneBrand?: string
}

function readSignals(tokens: string[]): Signals {
  const score: Record<DirectoryId, number> = {
    autos: 0,
    motos: 0,
    celulares: 0,
    alquileres: 0,
    equipar: 0,
  }
  const out: Signals = { score }
  const motorolaLine = tokens.includes('moto') && tokens.some(t => MOTOROLA_LINE.test(t))

  // A word that names the kind of thing ("moto", "heladera", "alquiler") weighs more than a
  // brand, which several directories share: "samsung heladera" is a fridge, "honda moto" a bike.
  const KIND = 2
  tokens.forEach((t, i) => {
    const pair = i + 1 < tokens.length ? `${t} ${tokens[i + 1]}` : ''
    if (pair && MOTO_BRAND_PAIRS[pair]) {
      score.motos += 2
      out.motoBrand ??= MOTO_BRAND_PAIRS[pair]
    }
    if (CAR_BRANDS.has(t) || CAR_MODELS.has(t)) score.autos++
    if (CAR_WORDS.has(t)) score.autos += KIND
    if (SHARED_BRANDS[t]) {
      score.autos++
      score.motos++
      out.motoBrand ??= SHARED_BRANDS[t]
    }
    if (MOTO_BRANDS[t]) {
      score.motos++
      out.motoBrand ??= MOTO_BRANDS[t]
    }
    if (MOTO_MODELS.has(t)) score.motos++
    if (t === 'moto' && motorolaLine) {
      score.celulares++
      out.phoneBrand ??= 'motorola'
    } else if (MOTO_WORDS.has(t)) score.motos += KIND
    if (PHONE_BRANDS[t]) {
      score.celulares++
      out.phoneBrand ??= PHONE_BRANDS[t]
    }
    if (PHONE_WORDS.has(t)) score.celulares += KIND
    if (RENTAL_WORDS.has(t)) score.alquileres += KIND
    if (EQUIPAR_WORDS.has(t)) score.equipar += KIND
  })

  // Words that only mean a car, a bike or a phone next to another word that already says so.
  if (score.autos > 0 && tokens.some(t => WEAK_CAR.has(t))) score.autos++
  const weakMoto = tokens.find(t => WEAK_MOTO[t])
  if (weakMoto && score.motos > 0) {
    score.motos++
    out.motoBrand ??= WEAK_MOTO[weakMoto]
  }
  const weakPhone = tokens.find(t => WEAK_PHONE[t])
  if (
    weakPhone &&
    (score.celulares > 0 || tokens.some(t => t !== weakPhone && PHONE_MODEL.test(t)))
  ) {
    score.celulares++
    out.phoneBrand ??= WEAK_PHONE[weakPhone]
  }
  return out
}

/**
 * `fromPath` without query and hash, as-is and without its first segment: `/en/motos-usadas-uruguay`
 * gives both `/en/motos-usadas-uruguay` and `/motos-usadas-uruguay`. A first segment that is not a
 * locale never leaves a directory path behind, so trying both needs no list of locales.
 */
function pathsOf(fromPath: string): string[] {
  const path = fromPath.split(/[?#]/)[0] ?? ''
  return [path, path.replace(/^\/[^/]+(?=\/)/, '')]
}

function familyOf(fromPath: string | undefined): DirectoryId | null {
  if (!fromPath) return null
  const [path = ''] = pathsOf(fromPath)
  for (const [re, id] of PATH_FAMILY) if (re.test(path)) return id
  return null
}

const paramsKey = (search: string) =>
  [...new URLSearchParams(search)]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('&')

/** True when the link would only reload the page the search was opened on. */
function isHere(link: DirectoryLink, fromPath: string | undefined): boolean {
  if (!fromPath) return false
  const search = fromPath.split('#')[0]!.split('?')[1] ?? ''
  return pathsOf(fromPath).includes(link.path) && paramsKey(search) === paramsKey(link.search)
}

function linkFor(id: DirectoryId, q: string, signals: Signals): DirectoryLink {
  const path = PATHS[id]
  const make = (kind: DirectoryLinkKind, search: string, brandLabel?: string): DirectoryLink => ({
    id,
    kind,
    path,
    search,
    to: path + search,
    q,
    ...(brandLabel ? { brandLabel } : {}),
  })
  if (id === 'motos') {
    const slug = signals.motoBrand
    return slug
      ? make('brand', `?marca=${encodeURIComponent(slug)}`, TITLE_CASE(slug))
      : make('browse', '')
  }
  if (id === 'celulares') {
    const brand = signals.phoneBrand
    return brand
      ? make('brand', `?marca=${encodeURIComponent(brand)}`, PHONE_BRAND_LABEL[brand])
      : make('browse', '')
  }
  return make('query', `?q=${encodeURIComponent(q)}`)
}

/**
 * The query as it travels: trimmed, spaces collapsed, cut at 80 CODE POINTS. Cutting UTF-16 units
 * can split an emoji, and `encodeURIComponent` throws on the lone surrogate left behind (a crafted
 * `/buscar?q=` would then fail while the server renders it).
 */
export function directoryQuery(rawQuery: string): string {
  const q = rawQuery.trim().replace(/\s+/g, ' ')
  return Array.from(q).slice(0, DIRECTORY_Q_MAX).join('').trimEnd()
}

/**
 * The directories that can answer `rawQuery`, best first, and what chose them.
 * `fromPath` is the route the search was opened on, query string included (the palette passes
 * it; `/buscar` does not). A link that would only reload that same page is dropped.
 */
export function directorySearch(rawQuery: string, fromPath?: string): DirectorySearch {
  const q = directoryQuery(rawQuery)
  if (!q) return { basis: 'none', links: [] }
  // Punctuation is not part of a model: "creta?" and "iphone,13" keep their signal.
  const signals = readSignals(tokenize(q.replace(/[^\p{L}\p{N}\s-]+/gu, ' ')))

  let basis: DirectoryBasis = 'query'
  let ids = ORDER.filter(id => signals.score[id] > 0).sort(
    (a, b) => signals.score[b] - signals.score[a] || ORDER.indexOf(a) - ORDER.indexOf(b)
  )
  if (!ids.length) {
    const family = familyOf(fromPath)
    if (!family) return { basis: 'none', links: [] }
    basis = 'page'
    ids = [family]
  }
  const links = ids.map(id => linkFor(id, q, signals)).filter(l => !isHere(l, fromPath))
  return links.length ? { basis, links } : { basis: 'none', links: [] }
}

/** Just the links of `directorySearch`. */
export function directorySearchLinks(rawQuery: string, fromPath?: string): DirectoryLink[] {
  return directorySearch(rawQuery, fromPath).links
}
