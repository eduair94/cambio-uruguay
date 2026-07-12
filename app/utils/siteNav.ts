// The single source of truth for site navigation, plus the pure search scorer.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be
// unit-tested in plain Node via vitest and imported by the layout, the footer,
// the sitemap route, the search palette, `/buscar` and `/mapa-del-sitio`.
//
// Every public route belongs to exactly one section. The desktop header, the
// mobile drawer, the footer, the HTML sitemap and the XML sitemap are all
// projections of {@link NAV_SECTIONS}: adding a page here makes it reachable
// everywhere at once, and `tests/unit/siteNav-coverage.test.ts` fails the build
// if a page file exists that no projection can reach.
//
// This module deliberately does NOT import the content catalogues (tools,
// glossary, ...). It is loaded on every page by the layout, so it stays cheap;
// the catalogue-backed long tail lives in `searchIndex.ts`, which is only
// imported by the search surfaces.

/** What kind of thing a search result points at. Drives ranking and the type chip. */
export type SearchType =
  | 'page'
  | 'tool'
  | 'currency'
  | 'convert'
  | 'glossary'
  | 'guide'
  | 'indicator'
  | 'casa'
  | 'action'

/** A quick action a search result can perform instead of navigating. */
export interface SearchAction {
  kind: 'theme' | 'lang'
  /** Target locale for `kind: 'lang'`. */
  arg?: string
}

/** One entry in the site navigation model. Either internal (`to`) or external (`href`). */
export interface NavEntry {
  /** App-relative path, pre-`localePath()` (e.g. `/prestamos-uruguay`). */
  to?: string
  /** Absolute URL for external links (ko-fi, Twitter, LinkedIn). */
  href?: string
  /** i18n key resolved through `t()`. Never a raw literal. */
  labelKey: string
  /** MDI icon name. */
  icon: string
  /** Shown inline in the desktop app bar rather than under the "Más" menu. */
  primary?: boolean
  /** Match the route exactly rather than by prefix (only `/`). */
  exact?: boolean
  /** Spanish synonyms and aliases folded into the search haystack. */
  keywords?: readonly string[]
  /** Omit from the XML sitemap (still reachable through in-site links). */
  sitemapExclude?: boolean
  /** XML sitemap priority. Defaults to 0.6. */
  priority?: number
  /** XML sitemap change frequency. Defaults to `weekly`. */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  /** Backed by live data: emit today's `lastmod` as a re-crawl hint. */
  fresh?: boolean
}

/** A titled group of navigation entries. `id` doubles as the search-result group key. */
export interface NavSection {
  id: string
  /** i18n key for the section heading (shared with `search.section.*`). */
  titleKey: string
  entries: readonly NavEntry[]
}

/**
 * The information architecture. Seven sections covering every public route.
 *
 * Only hubs live here — catalogue leaves (individual tools, glossary terms,
 * currencies, casas, ...) are enumerated by `searchIndex.ts` and
 * `/mapa-del-sitio`, never by a menu.
 */
export const NAV_SECTIONS: readonly NavSection[] = Object.freeze([
  {
    id: 'market',
    titleKey: 'search.section.market',
    entries: [
      {
        to: '/',
        labelKey: 'inicio',
        icon: 'mdi-home',
        priority: 1,
        changefreq: 'hourly',
        fresh: true,
        primary: true,
        exact: true,
        keywords: ['inicio', 'home', 'cotizaciones', 'dolar', 'comparador'],
      },
      {
        to: '/dolar-hoy',
        labelKey: 'dolarHoy.nav',
        icon: 'mdi-trending-up',
        priority: 0.9,
        changefreq: 'hourly',
        fresh: true,
        primary: true,
        keywords: ['dolar hoy', 'subio', 'bajo', 'variacion', 'usd', 'precio dolar'],
      },
      {
        to: '/historico',
        labelKey: 'historico',
        icon: 'mdi-chart-line',
        priority: 0.9,
        changefreq: 'daily',
        fresh: true,
        primary: true,
        keywords: ['historico', 'historia', 'evolucion', 'grafico', 'tendencia', 'serie'],
      },
      {
        to: '/comparar',
        labelKey: 'compare.nav',
        icon: 'mdi-chart-multiple',
        priority: 0.8,
        changefreq: 'daily',
        fresh: true,
        primary: true,
        keywords: ['comparar', 'comparacion', 'versus', 'superponer'],
      },
      {
        to: '/avanzado',
        labelKey: 'avanzado',
        icon: 'mdi-cog',
        priority: 0.9,
        changefreq: 'hourly',
        fresh: true,
        keywords: ['avanzado', 'tabla', 'filtros', 'todas las casas'],
      },
      {
        to: '/por-que-sube-el-dolar',
        labelKey: 'nav.porQueSube',
        icon: 'mdi-help-rhombus-outline',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: ['por que sube', 'por que baja', 'causas', 'correlacion', 'real', 'tasas'],
      },
      {
        to: '/dolar/records',
        labelKey: 'nav.records',
        icon: 'mdi-trophy-outline',
        priority: 0.6,
        changefreq: 'weekly',
        keywords: ['records', 'maximo', 'minimo', 'historico', 'pico', 'techo'],
      },
    ],
  },
  {
    id: 'houses',
    titleKey: 'search.section.houses',
    entries: [
      {
        to: '/sucursales',
        labelKey: 'sucursalesMenu',
        icon: 'mdi-bank-outline',
        priority: 0.9,
        changefreq: 'daily',
        primary: true,
        keywords: ['sucursales', 'locales', 'direcciones', 'horarios'],
      },
      {
        to: '/mapa',
        labelKey: 'map.nav',
        icon: 'mdi-map-marker-radius',
        priority: 0.8,
        changefreq: 'weekly',
        primary: true,
        keywords: ['mapa', 'ubicacion', 'cerca', 'donde', 'sucursal', 'geolocalizacion'],
      },
      {
        to: '/casas-de-cambio',
        labelKey: 'nav.casasDirectory',
        icon: 'mdi-store-outline',
        priority: 0.8,
        changefreq: 'weekly',
        keywords: ['casas de cambio', 'directorio', 'comparativa', 'resenas', 'ranking'],
      },
      {
        to: '/mejor-casa-de-cambio',
        labelKey: 'nav.mejorCasa',
        icon: 'mdi-trophy-outline',
        priority: 0.9,
        changefreq: 'daily',
        // Not `primary`: its label is the widest of the set (~198px) and a 7th
        // top-level button pushed the whole action cluster off the right edge
        // below 1920px. It lives in the "Más" menu instead.
        keywords: [
          'mejor casa de cambio',
          'donde cambiar',
          'dolar mas barato',
          'mas conveniente',
          'cual conviene',
          'ranking',
        ],
      },
      {
        to: '/casa-de-cambio-cerca-de-mi',
        labelKey: 'nav.nearby',
        icon: 'mdi-map-marker-account',
        priority: 0.8,
        changefreq: 'weekly',
        keywords: ['cerca de mi', 'cercana', 'proxima', 'mas cerca', 'ubicacion'],
      },
      {
        to: '/estado',
        labelKey: 'estado.nav',
        icon: 'mdi-heart-pulse',
        sitemapExclude: true,
        keywords: ['estado', 'salud', 'scraper', 'operativo', 'caido', 'health', 'status'],
      },
    ],
  },
  {
    id: 'tools',
    titleKey: 'search.section.tools',
    entries: [
      {
        to: '/herramientas',
        labelKey: 'nav.herramientas',
        icon: 'mdi-tools',
        priority: 0.8,
        changefreq: 'weekly',
        keywords: ['herramientas', 'calculadoras', 'calcular', 'simulador'],
      },
      {
        to: '/convertir',
        labelKey: 'nav.convertir',
        icon: 'mdi-cash-sync',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: ['convertir', 'conversion', 'cuanto es', 'pasar a pesos'],
      },
      {
        to: '/cotizacion',
        labelKey: 'nav.cotizacion',
        icon: 'mdi-cash-multiple',
        priority: 0.8,
        changefreq: 'hourly',
        fresh: true,
        keywords: ['cotizacion', 'cotizaciones', 'monedas', 'divisas', 'precio'],
      },
      {
        to: '/indicadores',
        labelKey: 'nav.indicadores',
        icon: 'mdi-finance',
        priority: 0.8,
        changefreq: 'daily',
        fresh: true,
        keywords: ['indicadores', 'unidad indexada', 'ui', 'ur', 'bpc', 'inflacion'],
      },
      {
        to: '/apps-economia-uruguay',
        labelKey: 'nav.apps',
        icon: 'mdi-cellphone-cog',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'apps',
          'aplicaciones',
          'app dinero',
          'apps bancarias',
          'billeteras',
          'mercado pago',
          'prex',
          'midinero',
          'app brou',
          'directorio apps',
        ],
      },
    ],
  },
  {
    id: 'learn',
    titleKey: 'search.section.learn',
    entries: [
      {
        to: '/guias',
        labelKey: 'guias.nav',
        icon: 'mdi-book-open-variant',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: ['guias', 'tutorial', 'como', 'aprender', 'explicacion'],
      },
      {
        to: '/glosario',
        labelKey: 'nav.glosario',
        icon: 'mdi-book-alphabet',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: ['glosario', 'diccionario', 'terminos', 'definicion', 'que significa'],
      },
      {
        to: '/blog',
        labelKey: 'nav.blog',
        icon: 'mdi-newspaper-variant-multiple',
        priority: 0.8,
        changefreq: 'daily',
        keywords: ['blog', 'analisis', 'posts', 'articulos'],
      },
      {
        to: '/noticias',
        labelKey: 'noticias.nav',
        icon: 'mdi-newspaper-variant-outline',
        priority: 0.7,
        changefreq: 'hourly',
        fresh: true,
        keywords: ['noticias', 'novedades', 'prensa', 'actualidad'],
      },
      {
        to: '/economia-uruguay',
        labelKey: 'economia.nav',
        icon: 'mdi-chart-box-outline',
        priority: 0.7,
        changefreq: 'hourly',
        fresh: true,
        keywords: [
          'economia',
          'economia uruguay',
          'inflacion',
          'empleo',
          'salarios',
          'banco central',
          'bcu',
          'exportaciones',
          'fiscal',
          'ipc',
        ],
      },
      {
        to: '/preguntas-frecuentes',
        labelKey: 'faq.nav',
        icon: 'mdi-frequently-asked-questions',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: ['preguntas frecuentes', 'faq', 'dudas', 'ayuda', 'consultas'],
      },
      {
        to: '/preguntas-economia-personal',
        labelKey: 'nav.faqEconomia',
        icon: 'mdi-comment-question-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'economia personal',
          'finanzas personales',
          'vivir solo',
          'garantia alquiler',
          'ahorrar dolares',
          'invertir poca plata',
          'salir de deudas',
          'monotributo',
          'preguntas dinero',
        ],
      },
    ],
  },
  {
    id: 'services',
    titleKey: 'search.section.services',
    entries: [
      {
        to: '/prestamos-uruguay',
        labelKey: 'nav.prestamos',
        icon: 'mdi-hand-coin-outline',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: [
          'prestamo',
          'prestamos',
          'credito',
          'creditos',
          'financiamiento',
          'cuota',
          'loan',
          'plata prestada',
        ],
      },
      {
        to: '/inversiones-uruguay',
        labelKey: 'nav.inversiones',
        icon: 'mdi-chart-areaspline',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: [
          'inversion',
          'inversiones',
          'invertir',
          'ahorro',
          'fci',
          'bonos',
          'cripto',
          'plazo fijo',
          'afap',
          'broker',
        ],
      },
      {
        to: '/invertir-en-proyectos-uruguayos',
        labelKey: 'nav.proyectos',
        icon: 'mdi-sprout-outline',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: [
          'proyectos uruguayos',
          'crowdfunding uruguay',
          'crowder',
          'obligaciones negociables',
          'fideicomiso',
          'agro',
          'forestacion',
          'startups uruguay',
          'economia real',
          'invertir local',
        ],
      },
      {
        to: '/salud-financiera',
        labelKey: 'nav.saludFinanciera',
        icon: 'mdi-heart-pulse',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'salud financiera',
          'finanzas personales',
          'ingresos extra',
          'ganar dinero extra',
          'presupuesto',
          'fondo de emergencia',
          'monotributo',
          'emprender',
          'ahorro personal',
        ],
      },
      {
        to: '/salir-del-clearing',
        labelKey: 'nav.salirClearing',
        icon: 'mdi-account-alert-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'salir del clearing',
          'clearing de informes',
          'central de riesgos bcu',
          'consultar deuda bcu',
          'cuanto tiempo quedo en el clearing',
          'habeas data',
          'usura',
          'salir de deudas',
          'plan de deudas',
          'estoy en el clearing',
        ],
      },
      {
        to: '/franquicia-aduana-uruguay',
        labelKey: 'nav.franquiciaAduana',
        icon: 'mdi-package-variant-closed-check',
        priority: 0.8,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'franquicia aduana uruguay',
          'comprar en el exterior uruguay',
          'iva compras exterior',
          'courier uruguay impuestos',
          'decreto 50/026',
          'franquicia 800 dolares',
          'vendedor registrado aduana',
          'tiendamia iva',
          'exoneracion iva estados unidos',
          '1 de octubre 2026 aduana',
        ],
      },
      {
        to: '/mejores-bancos-uruguay',
        labelKey: 'nav.mejoresBancos',
        icon: 'mdi-bank-outline',
        priority: 0.8,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'mejores bancos uruguay',
          'peores bancos uruguay',
          'mejor banco uruguay',
          'tier list bancos',
          'ranking bancos uruguay',
          'brou itau santander scotiabank bbva',
          'mercado pago prex astropay takenos',
          'comparar bancos uruguay',
          'que banco elegir uruguay',
          'reseñas bancos uruguay',
        ],
      },
      {
        to: '/tarjetas-de-credito-uruguay',
        labelKey: 'nav.tarjetas',
        icon: 'mdi-credit-card-multiple-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'tarjetas de credito uruguay',
          'puntos tarjeta',
          'beneficios tarjeta',
          'itau volar',
          'scotia puntos',
          'brou recompensa',
          'oca metraje',
          'mejor tarjeta',
          'ranking tarjetas',
          'millas',
        ],
      },
      {
        to: '/pagar-cuentas-con-tarjeta',
        labelKey: 'nav.pagarCuentas',
        icon: 'mdi-credit-card-check-outline',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: [
          'pagar cuentas con tarjeta',
          'totalnet',
          'pagos totalnet',
          'pagar ute con tarjeta',
          'pagar patente con tarjeta',
          'juntar puntos',
          'millas',
          'debito automatico',
        ],
      },
      {
        to: '/alquilar-en-uruguay',
        labelKey: 'nav.alquilar',
        icon: 'mdi-home-search-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'alquilar en uruguay',
          'garantia de alquiler',
          'anda garantia',
          'seguro de fianza porto',
          'cuanto sale alquilar',
          'alquiler por zona',
          'alquiler sin garantia',
          'costo de arranque',
          'estafas alquiler',
        ],
      },
      {
        to: '/couriers-uruguay',
        labelKey: 'nav.couriers',
        icon: 'mdi-truck-fast-outline',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: [
          'courier',
          'couriers',
          'envios',
          'importar',
          'aliexpress',
          'amazon',
          'ebay',
          'compras exterior',
        ],
      },
      {
        to: '/retirar-efectivo-uruguay',
        labelKey: 'nav.retirar',
        icon: 'mdi-cash-multiple',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: ['retirar', 'efectivo', 'cajero', 'atm', 'turista', 'sacar plata', 'redbrou'],
      },
    ],
  },
  {
    id: 'connect',
    titleKey: 'search.section.connect',
    entries: [
      {
        to: '/conectar',
        labelKey: 'conectar.nav',
        icon: 'mdi-connection',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: ['conectar', 'telegram', 'discord', 'bot', 'mcp', 'asistente'],
      },
      {
        to: '/desarrolladores',
        labelKey: 'dev.nav',
        icon: 'mdi-api',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: ['desarrolladores', 'api', 'developers', 'json', 'endpoint', 'open source'],
      },
      {
        to: '/newsletter',
        labelKey: 'newsletter.nav',
        icon: 'mdi-email-newsletter',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: ['newsletter', 'boletin', 'correo', 'suscribirse', 'email'],
      },
    ],
  },
  {
    id: 'site',
    titleKey: 'search.section.site',
    entries: [
      {
        to: '/acerca',
        labelKey: 'acerca.nav',
        icon: 'mdi-information-outline',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: ['acerca', 'sobre', 'metodologia', 'quienes somos', 'fuentes'],
      },
      {
        to: '/contacto',
        labelKey: 'legal.contactNav',
        icon: 'mdi-email-outline',
        priority: 0.5,
        changefreq: 'monthly',
        keywords: ['contacto', 'escribir', 'soporte', 'mail'],
      },
      {
        to: '/mapa-del-sitio',
        labelKey: 'nav.sitemap',
        icon: 'mdi-sitemap-outline',
        priority: 0.5,
        changefreq: 'weekly',
        keywords: ['mapa del sitio', 'sitemap', 'todas las paginas', 'indice'],
      },
      {
        to: '/privacidad',
        labelKey: 'legal.privacyNav',
        icon: 'mdi-shield-lock-outline',
        priority: 0.4,
        changefreq: 'yearly',
        keywords: ['privacidad', 'cookies', 'datos personales'],
      },
      {
        to: '/terminos',
        labelKey: 'legal.termsNav',
        icon: 'mdi-file-document-outline',
        priority: 0.4,
        changefreq: 'yearly',
        keywords: ['terminos', 'condiciones', 'legal'],
      },
      {
        href: 'https://ko-fi.com/cambio_uruguay',
        labelKey: 'donar',
        icon: 'mdi-heart',
        keywords: ['donar', 'apoyar', 'kofi'],
      },
      {
        href: 'https://twitter.com/cambio_uruguay',
        labelKey: 'nav.twitter',
        icon: 'mdi-twitter',
        keywords: ['twitter', 'x'],
      },
      {
        href: 'https://www.linkedin.com/in/eduardo-airaudo/',
        labelKey: 'nav.linkedin',
        icon: 'mdi-account-circle',
        keywords: ['autor', 'linkedin', 'eduardo'],
      },
    ],
  },
])

/**
 * Routes that exist as pages but must never appear in navigation, search or the
 * XML sitemap: the PWA offline fallback, the embeddable widget and the
 * auth-gated account area.
 */
export const EXCLUDED_ROUTES: readonly string[] = Object.freeze(['/offline', '/widget', '/cuenta'])

/**
 * Indexable pages that belong in the XML sitemap but not in any menu: the search
 * landing is reached through the magnifier and the SearchAction, not a nav link.
 */
export const UNLISTED_ROUTES: ReadonlyArray<{ to: string; priority: number; changefreq: string }> =
  Object.freeze([{ to: '/buscar', priority: 0.5, changefreq: 'monthly' }])

/**
 * Directory keys of dynamic (bracketed) page files, mapped to the hub whose
 * section they inherit. The coverage test asserts this set matches the
 * filesystem exactly, so a new dynamic route cannot be silently orphaned.
 */
export const DYNAMIC_ROUTE_KEYS: Readonly<Record<string, string>> = Object.freeze({
  'blog/[slug]': 'learn',
  'casa/[origin]': 'houses',
  'convertir/[slug]': 'tools',
  'cotizacion/[moneda]': 'tools',
  'dolar/[departamento]': 'market',
  'glosario/[termino]': 'learn',
  'guias/[slug]': 'learn',
  'historico/[origin]/index': 'market',
  'historico/[origin]/[currency]/[[type]]': 'market',
  'indicadores/[indicador]': 'tools',
  'sucursales/[origin]/[[location]]': 'houses',
})

/** Curated suggestions shown in the palette's empty state. */
export const POPULAR: readonly string[] = Object.freeze([
  '/dolar-hoy',
  '/historico',
  '/cotizacion/dolar',
  '/herramientas/conversor-de-monedas',
  '/comparar',
])

/** Every internal `to` in the navigation model, in section order. */
export function navRoutes(): string[] {
  return NAV_SECTIONS.flatMap(s => s.entries.filter(e => e.to).map(e => e.to as string))
}

/** Resolve an entry's visible label. Every entry carries an i18n key — no raw literals. */
export function navLabel(entry: NavEntry, t: (key: string) => string): string {
  return t(entry.labelKey)
}

// ---------------------------------------------------------------------------
// Search: document shape + the scorer
// ---------------------------------------------------------------------------

/**
 * One searchable thing. The `_`-prefixed fields are folded (accent-stripped,
 * lowercased) haystacks precomputed once at index-build time so scoring a
 * keystroke is a linear scan of plain string comparisons.
 */
export interface SearchDoc {
  /** Stable unique key, e.g. `page:/historico`, `tool:calculadora-iva`, `casa:brou`. */
  id: string
  type: SearchType
  /** Owning {@link NavSection} id; groups the results. */
  section: string
  title: string
  description: string
  icon: string
  /** Internal route, pre-`localePath()`. Absent for external links and actions. */
  to?: string
  /** External URL. */
  href?: string
  /** Quick action to run instead of navigating. */
  action?: SearchAction
  keywords: readonly string[]
  /** Folded last path segment. */
  _slug: string
  /** Folded title. */
  _title: string
  /** Folded `title + description + keywords`. */
  _hay: string
}

/** A scored hit. `suggestion` marks a "did you mean" fallback row. */
export interface SearchResult {
  doc: SearchDoc
  score: number
  suggestion?: boolean
}

/** Strip diacritics and lowercase, so `Histórico` and `historico` match. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Fold, then split on whitespace. `'  100  USD '` -> `['100', 'usd']`. */
export function tokenize(q: string): string[] {
  return fold(q).split(/\s+/).filter(Boolean)
}

/** True when any whitespace/hyphen-delimited word of `hay` starts with `token`. */
function wordStarts(hay: string, token: string): boolean {
  return hay.split(/[\s-]+/).some(w => w.startsWith(token))
}

/**
 * Levenshtein distance, bounded: returns `max + 1` as soon as every cell in a
 * row exceeds `max`, so a hopeless comparison costs O(max * len) not O(n * m).
 */
export function levenshtein(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const v = Math.min(
        (curr[j - 1] as number) + 1,
        (prev[j] as number) + 1,
        (prev[j - 1] as number) + cost
      )
      curr[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prev = curr
  }
  return prev[b.length] as number
}

/**
 * Relevance bonus per result type. Applied only AFTER a doc has cleared the
 * textual/alias gate, so a boost can never rescue a doc nothing matched.
 */
const TYPE_BOOST: Readonly<Record<SearchType, number>> = Object.freeze({
  action: 15,
  page: 12,
  tool: 10,
  currency: 9,
  convert: 8,
  indicator: 7,
  guide: 6,
  glossary: 5,
  casa: 4,
})

/** Deterministic tie-break order (same ranking as the boost). */
const TYPE_ORDER: Readonly<Record<SearchType, number>> = Object.freeze({
  action: 0,
  page: 1,
  tool: 2,
  currency: 3,
  convert: 4,
  indicator: 5,
  guide: 6,
  glossary: 7,
  casa: 8,
})

/** Runs only when the tiered pass finds nothing: a bounded single-typo rescue. */
function didYouMean(tokens: string[], docs: readonly SearchDoc[]): SearchResult[] {
  const q = tokens.reduce((longest, t) => (t.length > longest.length ? t : longest), '')
  if (q.length < 4) return []
  const out: SearchResult[] = []
  for (const doc of docs) {
    let best = 3
    for (const word of doc._title.split(/[\s-]+/)) {
      const d = levenshtein(q, word, 2)
      if (d < best) best = d
    }
    if (best <= 2) out.push({ doc, score: 2 - best, suggestion: true })
  }
  return out
    .sort((a, b) => b.score - a.score || TYPE_ORDER[a.doc.type] - TYPE_ORDER[b.doc.type])
    .slice(0, 5)
}

/**
 * Score `query` against `docs` and return the hits, best first.
 *
 * Tiers are mutually exclusive and descend by specificity: an exact slug match
 * beats an exact title, which beats a title prefix, and so on. A keyword/alias
 * hit adds a flat bonus on top (this is what lets `usd` find the dollar page
 * and `tema` find the theme action). Docs with no textual and no alias signal
 * are dropped before the type boost is applied, so the boost re-ranks matches
 * rather than inventing them.
 *
 * When nothing matches at all, fall back to a bounded single-typo pass.
 */
export function scoreDocs(query: string, docs: readonly SearchDoc[]): SearchResult[] {
  const raw = fold(query).replace(/\s+/g, ' ')
  if (!raw) return []
  const tokens = tokenize(query)
  const dashed = raw.replace(/ /g, '-')
  const hits: SearchResult[] = []

  for (const doc of docs) {
    let score = 0
    if (doc._slug === raw || doc._slug === dashed) score = 100
    else if (doc._title === raw) score = 92
    else if (doc._title.startsWith(raw)) score = 74
    else if (tokens.every(t => wordStarts(doc._title, t))) score = 56
    else if (doc._title.includes(raw)) score = 40
    else if (tokens.every(t => doc._hay.includes(t))) score = 26

    if (tokens.some(t => doc.keywords.includes(t))) score += 30
    if (score === 0) continue

    hits.push({ doc, score: score + TYPE_BOOST[doc.type] })
  }

  if (!hits.length) return didYouMean(tokens, docs)

  return hits.sort(
    (a, b) =>
      b.score - a.score ||
      TYPE_ORDER[a.doc.type] - TYPE_ORDER[b.doc.type] ||
      a.doc._title.localeCompare(b.doc._title)
  )
}

/** A rendered result row. `idx` is its position in top-to-bottom reading order. */
export interface ResultRow {
  doc: SearchDoc
  idx: number
}

/** A section heading with its rows, ready to render. */
export interface ResultGroup {
  id: string
  items: ResultRow[]
}

/**
 * Flatten scored results into rows, strictly best-first.
 *
 * The palette uses this rather than {@link buildResultGroups}: grouping reorders
 * rows to keep sections contiguous, so searching "dolar" would push the
 * high-scoring "Dólar hoy" page below the exotic "Dólar Australiano" quote
 * merely because another currency headed its section. In a keyboard-driven
 * palette the first row must be the best match. Each row's type chip supplies
 * the context the section heading would have.
 */
export function flattenResults(
  results: readonly SearchResult[],
  limit: number
): { rows: ResultRow[]; docs: SearchDoc[] } {
  const docs = results.slice(0, limit).map(r => r.doc)
  return { rows: docs.map((doc, idx) => ({ doc, idx })), docs }
}

/**
 * Lay scored results out as sections for the `/buscar` page: bucket them by
 * section, order the sections by their best hit, and number the rows in reading
 * order.
 *
 * Ordering sections by score (rather than by the fixed `NAV_SECTIONS` order)
 * matters: searching "prestamo" scores `/prestamos-uruguay` highest, but its
 * section sorts last, so a fixed order would bury the best match under two
 * weaker ones.
 *
 * `docs` is the same rows flattened, so `docs[idx]` is always row `idx`.
 */
export function buildResultGroups(
  results: readonly SearchResult[],
  limit: number
): { groups: ResultGroup[]; docs: SearchDoc[] } {
  const sectionOrder = new Map(NAV_SECTIONS.map((s, i) => [s.id, i]))
  const byId = new Map<string, SearchResult[]>()
  for (const result of results.slice(0, limit)) {
    const list = byId.get(result.doc.section)
    if (list) list.push(result)
    else byId.set(result.doc.section, [result])
  }

  // `results` arrives score-sorted, so each bucket's first item is its best.
  const ordered = [...byId.entries()].sort(
    ([aId, a], [bId, b]) =>
      (b[0] as SearchResult).score - (a[0] as SearchResult).score ||
      (sectionOrder.get(aId) ?? 0) - (sectionOrder.get(bId) ?? 0)
  )

  const docs: SearchDoc[] = []
  const groups = ordered.map(([id, items]) => ({
    id,
    items: items.map(result => {
      docs.push(result.doc)
      return { doc: result.doc, idx: docs.length - 1 }
    }),
  }))

  return { groups, docs }
}

/** Build a {@link SearchDoc}, precomputing the folded haystacks. */
export function makeDoc(doc: Omit<SearchDoc, '_slug' | '_title' | '_hay'>): SearchDoc {
  const path = doc.to ?? ''
  const lastSegment = path.slice(path.lastIndexOf('/') + 1)
  const keywords = doc.keywords.map(fold)
  return {
    ...doc,
    keywords,
    _slug: fold(lastSegment),
    _title: fold(doc.title),
    _hay: fold(`${doc.title} ${doc.description} ${keywords.join(' ')}`),
  }
}

/**
 * Turn the navigation model into search documents: one per internal route, plus
 * the theme and language quick actions. External links are omitted (the palette
 * navigates within the site).
 */
export function navToDocs(
  t: (key: string, params?: Record<string, unknown>) => string,
  locale: string,
  themeMode = 'dark'
): SearchDoc[] {
  const docs: SearchDoc[] = []

  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      if (!entry.to) continue
      docs.push(
        makeDoc({
          id: `page:${entry.to}`,
          type: 'page',
          section: section.id,
          title: t(entry.labelKey),
          description: '',
          icon: entry.icon,
          to: entry.to,
          keywords: entry.keywords ?? [],
        })
      )
    }
  }

  docs.push(
    makeDoc({
      id: 'action:theme',
      type: 'action',
      section: 'site',
      title: t('search.action.theme', { mode: t(`theme.${themeMode}`) }),
      description: '',
      icon: 'mdi-theme-light-dark',
      action: { kind: 'theme' },
      keywords: ['tema', 'theme', 'oscuro', 'claro', 'modo', 'dark', 'light', 'noche'],
    })
  )

  const LOCALE_NAMES: Record<string, string> = { es: 'Español', en: 'English', pt: 'Português' }
  const LOCALE_ALIASES: Record<string, string[]> = {
    es: ['espanol', 'castellano', 'es', 'spanish'],
    en: ['ingles', 'english', 'en'],
    pt: ['portugues', 'portuguese', 'pt', 'brasil'],
  }
  for (const code of ['es', 'en', 'pt']) {
    if (code === locale) continue
    docs.push(
      makeDoc({
        id: `action:lang:${code}`,
        type: 'action',
        section: 'site',
        title: t('search.action.lang', { lang: LOCALE_NAMES[code] as string }),
        description: '',
        icon: 'mdi-translate',
        action: { kind: 'lang', arg: code },
        keywords: ['idioma', 'language', 'lengua', ...(LOCALE_ALIASES[code] as string[])],
      })
    )
  }

  return docs
}
