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

import { GENERATED_NAV } from './generatedPages'

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
        to: '/pizarra',
        labelKey: 'nav.pizarra',
        icon: 'mdi-view-headline',
        priority: 0.9,
        changefreq: 'hourly',
        fresh: true,
        keywords: [
          'pizarra',
          'pizarra dolar',
          'tablero',
          'cotizacion en vivo',
          'sin registro',
          'rapido',
          'simple',
        ],
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
        to: '/cobrar-en-dolares-gastar-en-pesos',
        labelKey: 'nav.cobrarEnDolares',
        icon: 'mdi-swap-horizontal-bold',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'cobro en dolares gasto en pesos',
          'tipo de cambio del banco tarjeta',
          'spread del banco',
          'conviene vender dolares o pagar con tarjeta',
          'rebaja de iva debito',
          'ley 19210 debito',
          'freelance cobra en dolares',
          'sueldo en dolares uruguay',
        ],
      },
      {
        to: '/comparar-plataformas-dolar-uruguay',
        labelKey: 'platformComparison.nav',
        icon: 'mdi-scale-balance',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'Cambio Uruguay vs DolarAhora',
          'comparar plataformas dolar',
          'Dolar Uruguay comparacion',
          'mejor app cotizacion',
          'competidores',
        ],
      },
      {
        to: '/analiticas',
        labelKey: 'rateAnalytics.nav',
        icon: 'mdi-chart-timeline-variant-shimmer',
        priority: 0.9,
        changefreq: 'hourly',
        fresh: true,
        primary: true,
        keywords: [
          'analiticas',
          'cotizaciones por hora',
          'periodo',
          'poder de compra',
          'sucursales',
          'departamento',
        ],
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
        to: '/ultimos-cambios',
        labelKey: 'rateChanges.nav',
        icon: 'mdi-swap-horizontal-bold',
        priority: 0.8,
        changefreq: 'hourly',
        fresh: true,
        keywords: ['ultimos cambios', 'en vivo', 'movimientos', 'cotizaciones', 'alertas'],
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
        to: '/dolar-blue-hoy',
        labelKey: 'nav.dolarBlue',
        icon: 'mdi-swap-horizontal-bold',
        // Daily: both Argentine rates are re-ingested every morning and the
        // Uruguayan ARS board moves with the market, so the page re-prices
        // itself without anyone editing it.
        priority: 0.8,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'dolar blue',
          'dolar blue hoy',
          'blue argentina',
          'dolar paralelo',
          'brecha cambiaria',
          'peso argentino',
          'cambiar pesos argentinos',
          'cruzar a argentina',
        ],
      },
      {
        to: '/cotizaciones-de-la-region',
        labelKey: 'nav.cotizacionesRegion',
        icon: 'mdi-earth',
        // Every 20 minutes: thirteen sources across six countries, and the
        // Argentine and Brazilian legs move through the whole trading day.
        priority: 0.8,
        changefreq: 'hourly',
        fresh: true,
        keywords: [
          'cotizaciones de la region',
          'dolar en argentina',
          'dolar en brasil',
          'dolar en paraguay',
          'dolar en chile',
          'dolar en bolivia',
          'dolar blue',
          'ptax',
          'dolar turismo',
          'guarani',
          'peso chileno',
          'boliviano',
          'cruces',
          'mercosur',
        ],
      },
      {
        to: '/llevar-dolares-o-reales-a-brasil',
        labelKey: 'nav.brasilRuta',
        icon: 'mdi-beach',
        priority: 0.7,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'llevar dolares a brasil',
          'comprar reales',
          'reales o dolares',
          'dolar turismo brasil',
          'cambiar plata en brasil',
          'viajar a brasil',
          'ptax',
          'real brasileño',
        ],
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
        to: '/sucursal',
        labelKey: 'nav.branchDirectory',
        icon: 'mdi-store-marker-outline',
        priority: 0.8,
        changefreq: 'weekly',
        keywords: [
          'sucursal',
          'sucursales',
          'direccion',
          'telefono',
          'horario',
          'donde queda',
          'local',
          'mostrador',
        ],
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
        to: '/casas-de-cambio-abiertas-fin-de-semana',
        labelKey: 'nav.weekendOpen',
        icon: 'mdi-calendar-weekend',
        priority: 0.8,
        changefreq: 'weekly',
        keywords: [
          'abiertas sabado',
          'abierto domingo',
          'fin de semana',
          'horario',
          'horarios',
          'sabado',
          'domingo',
          'que abre hoy',
        ],
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
        to: '/mi-lista',
        labelKey: 'nav.miLista',
        icon: 'mdi-playlist-star',
        priority: 0.8,
        changefreq: 'weekly',
        keywords: [
          'mi lista',
          'lista de seguimiento',
          'seguimiento',
          'watchlist',
          'mis casas',
          'mis tarjetas',
          'mi zona',
          'mi barrio',
          'mi ciudad',
          'interior',
          'personalizado',
          'favoritos cambios',
        ],
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
        to: '/temas',
        labelKey: 'temas.nav',
        icon: 'mdi-shape-outline',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: [
          'temas',
          'guias por tema',
          'alquiler',
          'herencia',
          'sucesion',
          'deudas',
          'credito',
          'sueldo',
          'aguinaldo',
          'jubilacion',
          'invertir',
          'finanzas personales',
          'educacion financiera',
        ],
      },
      {
        to: '/mapa-de-temas',
        labelKey: 'temas.navMapa',
        icon: 'mdi-map-search-outline',
        priority: 0.6,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'mapa de temas',
          'temas consultados',
          'que consultan los uruguayos',
          'temas de dinero',
          'demanda',
          'tendencias',
          'analisis de temas',
          'preguntas frecuentes',
        ],
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
        priority: 0.8,
        changefreq: 'weekly',
        keywords: [
          'economia personal',
          'finanzas personales',
          'vivir solo',
          'garantia alquiler',
          'clearing',
          'prestamos',
          'tarjetas',
          'bancos',
          'irpf',
          'sueldo',
          'inflacion',
          'afap',
          'cripto',
          'ahorrar dolares',
          'invertir poca plata',
          'salir de deudas',
          'monotributo',
          'derechos consumidor',
          'reclamo consumo',
          'empresa cobranza',
          'abogado gratis',
          'consulta laboral',
          'preguntas dinero',
        ],
      },
    ],
  },
  {
    id: 'news',
    titleKey: 'search.section.news',
    entries: [
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
        to: '/temas-de-dinero-reddit',
        labelKey: 'nav.redditTopics',
        icon: 'mdi-reddit',
        priority: 0.6,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'temas de dinero reddit',
          'que pregunta la gente sobre plata',
          'reddit uruguay finanzas',
          'de que habla uruguay dinero',
          'dudas de plata reddit',
          'economia personal reddit',
        ],
      },
      {
        to: '/videos-de-economia-uruguay',
        labelKey: 'nav.videosEconomia',
        icon: 'mdi-youtube',
        priority: 0.8,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'videos de economia',
          'videos economia uruguay',
          'youtube economia uruguay',
          'videos del dolar',
          'videos sobre el dolar uruguay',
          'videos de finanzas personales uruguay',
          'educacion financiera uruguay videos',
          'canales de youtube de economia uruguaya',
          'videos de inversiones uruguay',
          'analisis economico en video',
        ],
      },
      {
        to: '/tendencias-uruguay',
        labelKey: 'nav.tendencias',
        icon: 'mdi-trending-up',
        priority: 0.7,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'tendencias uruguay',
          'que se busca en uruguay',
          'google trends uruguay',
          'tendencias de busqueda uruguay',
          'temas del momento uruguay',
          'de que se habla en uruguay',
          'noticias economia uruguay hoy',
          'trending uruguay',
        ],
      },
      {
        to: '/sillas-escritorio-uruguay',
        labelKey: 'nav.chairTiers',
        icon: 'mdi-chair-rolling',
        priority: 0.7,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'sillas escritorio uruguay',
          'mejores sillas oficina',
          'silla ergonomica uruguay',
          'sillas charruadevs',
          'sillas reddit uruguay',
          'tier list sillas',
          'vigo silla',
        ],
      },
      {
        to: '/sillas-escritorio-uruguay/precios',
        labelKey: 'nav.chairPrices',
        icon: 'mdi-tag-multiple-outline',
        priority: 0.7,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'precios sillas escritorio uruguay',
          'comparar precios sillas',
          'sillas baratas uruguay',
          'silla escritorio mercado libre',
          'cuanto sale una silla de escritorio',
          'directorio de sillas',
          'sillas gamer precio uruguay',
        ],
      },
      {
        to: '/por-que-el-bcu-quiere-mas-pesos',
        labelKey: 'nav.desdolarizacion',
        icon: 'mdi-currency-usd-off',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'desdolarizacion',
          'bimonetarismo',
          'peso uruguayo',
          'banco central',
          'bcu',
          'encajes',
          'ahorro en dolares',
          'credito en pesos',
          'impuesto inflacionario',
        ],
      },
    ],
  },
  {
    id: 'banking',
    titleKey: 'search.section.banking',
    entries: [
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
        to: '/descuentos-con-tarjeta-uruguay',
        labelKey: 'nav.descuentosTarjeta',
        icon: 'mdi-sale',
        priority: 0.8,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'descuentos con tarjeta uruguay',
          'descuentos bancos uruguay',
          'beneficios tarjetas uruguay',
          'mapa de descuentos',
          'descuentos itau brou santander bbva scotiabank oca prex mercado pago',
          'promociones tarjeta credito debito',
          'donde tengo descuento con mi tarjeta',
          'bankos uruguay',
          'reintegros beneficios comercios',
        ],
      },
      {
        to: '/que-banco-tiene-mas-descuentos-uruguay',
        labelKey: 'nav.bancoMasDescuentos',
        icon: 'mdi-chart-bar',
        priority: 0.7,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'que banco tiene mas descuentos uruguay',
          'que tarjeta tiene mas descuentos',
          'comparar descuentos bancos uruguay',
          'mejor banco para descuentos',
          'analisis descuentos bancos',
          'descuentos por rubro supermercado gastronomia',
          'credito o debito descuentos',
          'que banco elegir descuentos',
        ],
      },
      {
        to: '/apps-de-beneficios-uruguay',
        labelKey: 'nav.appsBeneficios',
        icon: 'mdi-ticket-percent-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'apps de beneficios uruguay',
          'programas de fidelidad uruguay',
          'club de beneficios uruguay',
          'tarjeta de puntos uruguay',
          'puntos supermercado uruguay',
          'ta-ta plus puntos',
          'programa puntos tienda inglesa',
          'tarjeta mas disco devoto geant',
          'farmacard farmashop farmapuntos',
          'ancapuntos ducsa',
          'pedidosya plus precio',
          'socio espectacular',
          'abono cultural bps jubilados',
          'club movistar movis',
          'beneficios antel 2x1 cine',
          'club el pais',
          'apps de descuentos uruguay',
        ],
      },
      {
        to: '/alternativa-a-bankos-uruguay',
        labelKey: 'nav.alternativaBankos',
        icon: 'mdi-scale-balance',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: [
          'bankos',
          'bankos uruguay',
          'bankos app',
          'alternativa a bankos',
          'bankos web',
          'app de descuentos uruguay',
          'descuentos con tarjeta sin instalar app',
          'bankos vs',
        ],
      },
      {
        to: '/tarjetas-de-socio-uruguay',
        labelKey: 'nav.tarjetasSocio',
        icon: 'mdi-card-account-details-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'tarjetas de socio uruguay',
          'club el pais beneficios',
          'tarjeta de beneficios uruguay',
          'club de shopping uruguay',
          'socio espectacular',
          'ancapuntos',
          'tarjeta de descuentos sin banco',
          'programas de fidelidad uruguay',
          'como sacar la tarjeta del club',
          'descuentos sin tarjeta de credito',
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
        to: '/tarjetas-de-debito-uruguay',
        labelKey: 'nav.tarjetasDebito',
        icon: 'mdi-credit-card-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'tarjetas de debito uruguay',
          'mejor tarjeta para comprar en dolares',
          'prex comision',
          'prex compra exterior',
          'oca comision dolares',
          'comprar en dolares uruguay',
          'pagar juegos online uruguay',
          'comprar en steam uruguay',
          'comision compra internacional',
          'pagar en dolares con tarjeta',
          'tarjeta prepaga dolares',
          'astropay comision',
        ],
      },
      {
        to: '/cuenta-remunerada-uruguay',
        labelKey: 'nav.cuentaRemunerada',
        icon: 'mdi-chart-line',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'cuenta remunerada uruguay',
          'rendimientos mercado pago uruguay',
          'inversion violeta prex',
          'rendimiento del saldo',
          'interes por tener plata en la cuenta',
          'que rinde la plata quieta',
          'billetera que paga interes uruguay',
          'fondo de liquidez inmediata',
          'bind ahorro pesos',
          'plazo fijo vs rendimiento diario',
        ],
      },
      {
        to: '/comparativas',
        labelKey: 'nav.comparativas',
        icon: 'mdi-compare-horizontal',
        priority: 0.7,
        changefreq: 'weekly',
        keywords: [
          'comparativas',
          'vs',
          'cual conviene',
          'brou vs itau',
          'prex vs mercado pago',
          'comparar bancos',
          'comparar tarjetas',
          'comparar couriers',
          'uno contra uno',
        ],
      },
    ],
  },
  {
    id: 'credit',
    titleKey: 'search.section.credit',
    entries: [
      {
        to: '/mejores-prestamos-uruguay',
        labelKey: 'nav.mejoresPrestamos',
        icon: 'mdi-trophy-outline',
        priority: 0.8,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'mejores prestamos uruguay',
          'donde pedir un prestamo',
          'prestamos sin clearing',
          'prestamos estando en el clearing',
          'prestamos con clearing uruguay',
          'prestamos rapidos uruguay',
          'prestamos urgentes',
          'prestamos online uruguay',
          'prestamos para jubilados',
          'prestamos sin recibo de sueldo',
          'que financiera es mejor',
          'tier list prestamos',
          'ranking prestamos uruguay',
          'prestamos anda creditel pronto',
        ],
      },
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
        to: '/prestamos-p2p-uruguay',
        labelKey: 'nav.prestamosP2p',
        icon: 'mdi-account-switch-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'prestamos peer to peer',
          'p2p lending uruguay',
          'prestamos entre personas',
          'prestapagos',
          'crowdlending',
          'circular 2307',
          'prestar plata con interes',
          'invertir prestando dinero',
          'eappp',
          'financiamiento colectivo',
        ],
      },
      {
        to: '/adelanto-de-efectivo-tarjeta-de-credito',
        labelKey: 'nav.adelantoEfectivo',
        icon: 'mdi-cash-fast',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'adelanto de efectivo',
          'adelanto de efectivo uruguay',
          'avance de efectivo',
          'retiro de efectivo tarjeta de credito',
          'sacar plata con la tarjeta de credito',
          'tasa adelanto de efectivo',
          'intereses retiro efectivo tarjeta',
          'tasa maxima permitida',
          'tope de tasas bcu',
          'ley 18212 usura',
          'comprar cripto con tarjeta uruguay',
          'binance p2p uruguay',
          'quasi cash mcc 6051',
        ],
      },
      {
        to: '/sala-vip-aeropuerto-uruguay',
        labelKey: 'nav.salaVipAeropuerto',
        icon: 'mdi-sofa-single-outline',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'sala vip aeropuerto',
          'sala vip carrasco',
          'sala vip uruguay',
          'como entrar a la sala vip',
          'priority pass uruguay',
          'loungekey uruguay',
          'visa airport companion',
          'mastercard airport experiences',
          'dragonpass',
          'aeropuertos vip club',
          'sala vip punta del este',
          'sala vip arribos',
          'tarjeta con sala vip',
          'lounge aeropuerto montevideo',
        ],
      },
      {
        to: '/conviene-comprar-en-cuotas',
        labelKey: 'nav.cuotasOContado',
        icon: 'mdi-calendar-multiple-check',
        priority: 0.8,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'conviene comprar en cuotas',
          'cuotas o contado',
          'pagar contado o en cuotas',
          '24 cuotas sin recargo',
          'cuotas sin interes conviene',
          'financiar celular uruguay',
          'invertir en vez de pagar contado',
          'precio contado vs financiado',
          'tasa implicita cuotas',
          'antel pce ptf',
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
        to: '/saldar-deudas-uruguay',
        labelKey: 'nav.saldarDeudas',
        icon: 'mdi-handshake-outline',
        keywords: [
          'saldar deudas',
          'chaudeudas',
          'mideuda',
          'negociar deuda',
          'quita',
          'recuperadora',
          'prescripción',
          'refinanciar deuda',
          'historial crediticio',
        ],
        priority: 0.7,
        changefreq: 'monthly',
      },
    ],
  },
  {
    id: 'invest',
    titleKey: 'search.section.invest',
    entries: [
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
          'gletir',
          'gletir global',
        ],
      },
      {
        to: '/declaracion-de-irpf-uruguay',
        labelKey: 'nav.declaracionIrpf',
        icon: 'mdi-file-document-edit-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'declaracion jurada irpf',
          'tengo que declarar irpf',
          'quienes estan obligados irpf',
          'formulario 1102',
          'formulario 1103',
          'formulario 3100',
          'devolucion de irpf cuando cobro',
          'irpf dos empleadores',
          'multa por mora dgi',
          'campaña irpf',
        ],
      },
      {
        to: '/cuanto-me-tienen-que-pagar-uruguay',
        labelKey: 'nav.cuantoMePagan',
        icon: 'mdi-scale-balance',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'cuanto me tienen que pagar',
          'consejo de salarios laudo',
          'minimo por categoria',
          'grupo y subgrupo consejo de salarios',
          'mtss consulta salarial gratis',
          'me pagan menos del laudo',
          'mal categorizado trabajo',
          'salario minimo no es mi minimo',
        ],
      },
      {
        to: '/vivir-con-25000-pesos-uruguay',
        labelKey: 'nav.vivirCon25000',
        icon: 'mdi-clock-alert-outline',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'se puede vivir con 25000 pesos',
          'sueldo de 25000 uruguay',
          '30000 pesos por 9 horas',
          'jornada de 9 horas es legal',
          'tope de 8 horas diarias uruguay',
          'horas extra recargo 100',
          'descanso intermedio media hora',
          'salario minimo nacional 2026',
          'ofertas de trabajo mal pagas',
          'como hacen para vivir con el minimo',
        ],
      },
      {
        to: '/contractor-en-uruguay',
        labelKey: 'nav.contractorUy',
        icon: 'mdi-laptop-account',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'contractor uruguay',
          'contractor o empleado',
          'cuanto facturar para igualar un sueldo',
          'jubilacion contractor',
          'aporte jubilatorio unipersonal',
          'base ficta de contribucion',
          'facturar al exterior',
          'trabajar remoto para el exterior',
        ],
      },
      {
        to: '/desvincularme-de-la-afap-uruguay',
        labelKey: 'nav.desvincularAfap',
        icon: 'mdi-account-arrow-left-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'desvincularme de la afap',
          'como me desvinculo de una afap',
          'desafiliarse de la afap',
          'revocacion articulo 8',
          'revocar afap bps',
          'asesoramiento bps afap',
          'salir de la afap',
          'regimen mixto bps afap',
        ],
      },
      {
        to: '/prescripcion-de-deudas-con-el-estado-uruguay',
        labelKey: 'nav.prescripcionDeudas',
        icon: 'mdi-calendar-remove-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'prescripcion de deudas dgi',
          'prescriben las deudas con el estado',
          'articulo 38 codigo tributario',
          'prescribe la patente',
          'deuda de patente vieja',
          'contribucion inmobiliaria prescripcion',
          'deuda vieja con dgi',
          'prescripcion a peticion de parte',
        ],
      },
      {
        to: '/impuestos-inversiones-uruguay',
        labelKey: 'nav.impuestosInversiones',
        icon: 'mdi-file-percent-outline',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'impuesto a las ganancias',
          'impuesto a las ganancias uruguay',
          'irpf inversiones',
          'irpf categoria 1',
          'rentas de capital',
          'impuestos cripto uruguay',
          'impuestos broker exterior',
          'residencia fiscal uruguay',
          'tax holiday uruguay',
          'impuesto al patrimonio',
          'iass',
          'irnr',
          'declaracion jurada irpf',
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
        to: '/que-empresa-abrir-uruguay',
        labelKey: 'nav.queEmpresaAbrir',
        icon: 'mdi-store-outline',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'que empresa abrir uruguay',
          'monotributo o unipersonal',
          'abrir sas uruguay',
          'literal e',
          'formalizar emprendimiento',
          'unipersonal',
          'srl',
          'sociedad de hecho',
          'monotributo social mides',
          'irpf servicios personales',
        ],
      },
      {
        to: '/facturar-en-monotributo-uruguay',
        labelKey: 'nav.facturarMonotributo',
        icon: 'mdi-receipt-text-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'facturar monotributo',
          'talonario monotributo',
          'talonario de facturas dgi',
          'factura monotributo social mides',
          'factura electronica monotributo obligatoria',
          'imprenta autorizada dgi',
          'constancia impresion documentacion',
          'cai talonario uruguay',
          'como facturar emprendimiento uruguay',
          'boleta consumo final monotributo',
        ],
      },
      {
        to: '/seguro-de-paro-uruguay',
        labelKey: 'nav.seguroDeParo',
        icon: 'mdi-briefcase-off-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'seguro de paro',
          'cuanto cobro de seguro de paro',
          'subsidio por desempleo bps',
          'seguro de paro cuantos meses',
          'por que baja el seguro de paro',
          'tope seguro de paro',
          'seguro de paro por suspension',
          'trabajo reducido bps',
          'complemento cargas familiares seguro de paro',
          'seguro de paro 50 años',
          'requisitos seguro de paro',
          'me quede sin trabajo uruguay',
        ],
      },
      {
        to: '/trabajo-para-menores-de-edad-uruguay',
        labelKey: 'nav.trabajoMenores',
        icon: 'mdi-account-school-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'trabajo para menores de edad',
          'trabajar con 15 anos',
          'como hacer plata con 15 anos',
          'carne de trabajo inau',
          'edad minima para trabajar uruguay',
          'trabajo adolescente uruguay',
          'primer trabajo joven',
          'empleo juvenil ley 19133',
          'cuantas horas puede trabajar un menor',
          'trabajos prohibidos adolescentes',
        ],
      },
      {
        to: '/accidente-de-trabajo-uruguay',
        labelKey: 'nav.accidenteTrabajo',
        icon: 'mdi-medical-bag',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'accidente de trabajo uruguay',
          'bse accidente laboral',
          'denuncia patronal plazo',
          'indemnizacion temporaria dos tercios',
          'ley 16074',
          'me accidente trabajando que hago',
          'la empresa me echa la culpa del accidente',
        ],
      },
      {
        to: '/denunciar-trabajo-en-negro-uruguay',
        labelKey: 'nav.trabajoEnNegro',
        icon: 'mdi-account-alert-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'trabajo en negro',
          'me tienen en negro',
          'denunciar a mi empleador',
          'no me aportan al bps',
          'no figuro en la historia laboral',
          'denuncia anonima inspeccion del trabajo',
          'trabajo sin recibo de sueldo',
          'me pagan una parte por fuera',
          'conciliacion previa mtss',
        ],
      },
      {
        to: '/cambiar-de-mutualista-uruguay',
        labelKey: 'nav.cambiarMutualista',
        icon: 'mdi-hospital-box-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'cambiar de mutualista',
          'corralito mutual',
          'movilidad regulada bps',
          'cambio de prestador de salud',
          'cuando puedo cambiar de mutualista',
          'digito de cedula mutualista',
          'permanencia 23 meses mutualista',
          'junasa cambio de prestador',
        ],
      },
      {
        // Las consultas «devolucion fonasa» / «estoy comprendido fonasa» estaban en las keywords de
        // /cambiar-de-mutualista-uruguay, que las menciona al pasar. Viven acá, que es la página
        // que las contesta.
        to: '/devolucion-fonasa-uruguay',
        labelKey: 'nav.devolucionFonasa',
        icon: 'mdi-cash-refund',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'devolucion fonasa',
          'devolucion fonasa bps',
          'cuando cobro la devolucion fonasa',
          'estoy comprendido fonasa',
          'excedente de aportes fonasa',
          'tope anual fonasa',
          'costo promedio equivalente',
          'cpe fonasa',
          'retencion irpf devolucion fonasa',
          'devolucion fonasa jubilados',
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
    ],
  },
  {
    id: 'imports',
    titleKey: 'search.section.imports',
    entries: [
      {
        to: '/preguntas-frecuentes-aduana-uruguay',
        labelKey: 'nav.aduanaFaq',
        icon: 'mdi-comment-question-outline',
        priority: 0.9,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'preguntas frecuentes aduana uruguay',
          'faq importaciones uruguay',
          'dudas franquicia aduana',
          'paquete retenido',
          'productos prohibidos',
          'preguntas reddit aduana',
          'compras exterior',
          'impuestos courier',
        ],
      },
      {
        to: '/declarar-compra-exterior-uruguay',
        labelKey: 'nav.declararCompraExterior',
        icon: 'mdi-file-sign',
        priority: 0.9,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'declarar compra exterior uruguay',
          'compra exterior sin courier',
          'declarar paquete correo uruguayo',
          'ahiva aduana',
          'amazon global uruguay',
          'temu importacion gestionada',
          'import fees deposit',
          'quien declara aduana',
          'despachante compra exterior',
        ],
      },
      {
        to: '/recibir-regalos-del-exterior-uruguay',
        labelKey: 'nav.recibirRegalos',
        icon: 'mdi-gift-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'recibir regalos del exterior uruguay',
          'mandar regalo a uruguay desde el exterior',
          'obsequio familiar aduana uruguay',
          'carta dentro del paquete uruguay',
          'correspondencia aduana uruguay',
          'declarar obsequio correo uruguayo',
          'accesorios caravanas aduana uruguay',
          'regalo cumpleanos exterior aduana',
        ],
      },
      {
        to: '/donde-te-entregan-el-paquete-uruguay',
        labelKey: 'nav.dondeEntreganPaquete',
        icon: 'mdi-mailbox-open-outline',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'donde me entregan el paquete',
          'retirar paquete en sucursal correo uruguayo',
          'no estaba en casa paquete',
          'aviso de visita correo',
          'entrega en agencia aliexpress',
          'cambiar direccion de entrega paquete',
          'recibir paquete sin domicilio fijo',
          'cuantos dias guardan el paquete',
        ],
      },
      {
        to: '/envio-directo-o-casillero-uruguay',
        labelKey: 'nav.envioDirectoOCasillero',
        icon: 'mdi-airplane-marker',
        priority: 0.9,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'envio directo o casillero uruguay',
          'comprar en ebay desde uruguay',
          'casillero miami o espana',
          'conviene casillero o envio directo',
          'de minimis estados unidos',
          'iva europeo casillero espana',
          'comprar en europa y traer a uruguay',
          'punto mio miami o madrid',
          'ebay envio directo aduana uruguay',
          'redirigir paquete a uruguay',
        ],
      },
      {
        to: '/importar',
        labelKey: 'nav.importarCategorias',
        icon: 'mdi-package-variant-closed',
        priority: 0.9,
        changefreq: 'monthly',
        keywords: [
          'importar por categoria',
          'importar libros a uruguay',
          'importar celulares uruguay',
          'importar medicamentos uruguay',
          'que impuestos paga cada producto',
          'productos exentos de iva importacion',
          'exenciones aduana uruguay',
          'tramites importacion uruguay',
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
        to: '/mudarme-a-uruguay-residencia',
        labelKey: 'nav.mudarmeAUruguay',
        icon: 'mdi-airplane-landing',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'mudarme a uruguay',
          'residencia legal uruguay',
          'residencia mercosur',
          'cuanto ingreso piden para la residencia',
          'medios de vida migracion',
          'vivir en uruguay siendo extranjero',
          'residencia legal vs fiscal',
          'direccion nacional de migracion',
        ],
      },
      {
        to: '/importar-a-uruguay-siendo-extranjero',
        labelKey: 'nav.importarExtranjero',
        icon: 'mdi-passport',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'importar a uruguay siendo extranjero',
          'compras exterior uruguay turista',
          'importar mercosur uruguay',
          'amazon uruguay extranjero',
          'aliexpress uruguay',
          'franquicia sin cedula uruguaya',
          'courier uruguay extranjero',
          'vivir seis meses en uruguay',
        ],
      },
      {
        to: '/problemas-con-la-aduana-uruguay',
        labelKey: 'nav.problemasAduana',
        icon: 'mdi-clipboard-alert-outline',
        priority: 0.8,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'paquete retenido aduana uruguay',
          'aduana no libera el paquete',
          'me cobran de mas courier',
          'franquicia agotada aduana',
          'reclamo aduana uruguay',
          'decomiso aduana uruguay',
          'courier uruguay demora',
          'abandono aduanero uruguay',
          'ursec reclamo postal',
          'me piden factura para no pagar iva',
        ],
      },
      {
        to: '/importar-para-revender-uruguay',
        labelKey: 'nav.importarRevender',
        icon: 'mdi-store-cog-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'importar para revender uruguay',
          'necesito despachante de aduana',
          'importar sin despachante 800 dolares',
          'donde se paga el 60 por ciento aduana',
          'abrir unipersonal para importar',
          'importar accesorios de celular uruguay',
          'ursec homologacion bluetooth',
          'ursea productos electricos importar',
          'power bank courier uruguay',
          'dos dua por año persona fisica',
          'ecommerce uruguay importacion',
        ],
      },
      {
        to: '/franquicia-viajero-uruguay',
        labelKey: 'nav.franquiciaViajero',
        icon: 'mdi-bag-suitcase-outline',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'franquicia equipaje viajero uruguay',
          'franquicia aeropuerto carrasco',
          'cuanto puedo traer sin pagar impuesto uruguay',
          'canal rojo aeropuerto uruguay',
          'declaracion jurada equipaje',
          'equipaje aduana uruguay',
          'uso personal aduana',
          'despachante de aduana equipaje',
        ],
      },
      {
        to: '/declarar-dinero-en-efectivo-uruguay',
        labelKey: 'nav.declararEfectivo',
        icon: 'mdi-cash-multiple',
        priority: 0.8,
        changefreq: 'monthly',
        keywords: [
          'cuanto dinero puedo sacar de uruguay',
          'declarar efectivo uruguay',
          'declarar dolares aeropuerto uruguay',
          'transporte de valores aduana uruguay',
          '10000 dolares frontera uruguay',
          'multa por no declarar dinero uruguay',
          'sacar dolares del pais uruguay',
          'llevar plata a argentina desde uruguay',
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
    ],
  },
  {
    id: 'consumer',
    titleKey: 'search.section.consumer',
    entries: [
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
        to: '/alquileres-uruguay',
        labelKey: 'nav.alquileres',
        icon: 'mdi-home-city-outline',
        // Updated by a cron and re-indexed often: it is the only page here whose CONTENT changes
        // every hour, which is what `changefreq` is for.
        priority: 0.8,
        changefreq: 'daily',
        keywords: [
          'alquileres uruguay',
          'alquileres montevideo',
          'buscar alquiler',
          'apartamentos en alquiler',
          'casas en alquiler uruguay',
          'alquiler pocitos',
          'alquiler cordon',
          'monoambiente en alquiler',
          'alquiler barato montevideo',
          'buscador de alquileres',
        ],
      },
      {
        to: '/por-que-no-baja-el-alquiler-uruguay',
        labelKey: 'nav.porQueNoBajaAlquiler',
        icon: 'mdi-city-variant-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'por que no baja el alquiler',
          'viviendas vacias uruguay',
          'viviendas desocupadas censo 2023',
          'vivienda promovida ley 18795',
          'quien vive en los edificios nuevos',
          'se construye y no baja el alquiler',
          'vacancia montevideo maldonado',
          'exoneracion irpf alquiler 10 años',
          'comprar para alquilar uruguay',
          'burbuja inmobiliaria uruguay',
        ],
      },
      {
        to: '/comprar-o-alquilar-uruguay',
        labelKey: 'nav.comprarOAlquilar',
        icon: 'mdi-home-search-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'comprar o alquilar uruguay',
          'conviene comprar con credito hipotecario',
          'cuota vs alquiler',
          'calculadora credito hipotecario uruguay',
          'costo de oportunidad anticipo',
          'gastos de escrituracion cuanto tardo en cubrirlos',
          'primera cuota casi todo interes',
          'me conviene comprar o seguir alquilando',
          'bhu conviene o no',
        ],
      },
      {
        to: '/alquilar-sin-recibo-de-sueldo',
        labelKey: 'nav.alquilarSinRecibo',
        icon: 'mdi-file-document-alert-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'alquilar sin recibo de sueldo',
          'garantia de alquiler independiente',
          'garantia alquiler monotributista',
          'certificado de ingresos contador alquiler',
          'alquilar siendo freelance uruguay',
          'fga fondo de garantia de alquileres',
          'alquilar sin sueldo montevideo',
        ],
      },
      {
        to: '/alquilar-estando-en-clearing',
        labelKey: 'nav.alquilarClearing',
        icon: 'mdi-home-lock-open',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'alquilar estando en clearing',
          'se puede alquilar en el clearing',
          'garantia de alquiler con clearing',
          'seguro de alquiler chequea clearing',
          'alquilar sin garantia clearing',
          'deposito bhu alquiler',
          'fondo de garantia de alquileres clearing',
          'ley 20212 clearing',
          'alquilar dueño directo clearing',
        ],
      },
      {
        to: '/pensiones-estudiantiles-uruguay',
        labelKey: 'nav.pensionesEstudiantiles',
        icon: 'mdi-bed-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'pension estudiantil montevideo',
          'residencia estudiantil montevideo precio',
          'cuanto sale una pension en montevideo',
          'pension para mujeres montevideo',
          'habitacion individual pension montevideo',
          'hogar estudiantil intendencia',
          'ciudad universitaria inju',
          'beca de alojamiento udelar',
          'alojamiento para estudiantes del interior',
          'donde vivir estudiando en montevideo',
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
      {
        to: '/factura-de-ute-uruguay',
        labelKey: 'nav.facturaUte',
        icon: 'mdi-lightning-bolt-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'factura de ute alta',
          'por que sube la factura de ute',
          'tarifa residencial simple ute',
          'doble horario ute conviene',
          'triple horario ute valle',
          'escalones ute kwh',
          'bajar potencia contratada ute',
          'bonificacion 40 ute jubilados',
          'ute estudiantes fondo de solidaridad',
          'cargo fijo ute iva',
          'factura de ose saneamiento',
          'tarifa ose 2026',
          'luz cara uruguay',
        ],
      },
      {
        to: '/donde-conseguir-monedas-uruguay',
        labelKey: 'nav.monedas',
        icon: 'mdi-hand-coin-outline',
        priority: 0.7,
        changefreq: 'monthly',
        keywords: [
          'monedas',
          'conseguir monedas',
          'cambiar billetes por monedas',
          'sencillo',
          'cambio chico',
          'moneda fraccionaria',
          'canje de monedas',
          'monedas brou',
          'monedas bcu',
          'monedas para comercio',
        ],
      },
      {
        to: '/estafas-uruguay',
        labelKey: 'nav.estafas',
        icon: 'mdi-shield-alert-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'me estafaron uruguay',
          'me clonaron la tarjeta',
          'phishing banco uruguay',
          'transferencia no autorizada',
          'me vaciaron la cuenta',
          'estafa marketplace uruguay',
          'reclamo al banco uruguay',
          'ley 19731',
          'denuncia bcu estafa',
          'que hago si me estafaron',
        ],
      },
      {
        to: '/multas-de-transito-y-patente-uruguay',
        labelKey: 'nav.multasTransito',
        icon: 'mdi-car-brake-alert',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'multas de transito uruguay',
          'descargo multa',
          'apelar multa transito',
          'prescripcion multas de transito',
          'sucive multas',
          'deuda de patente',
          'devolucion multa pagada',
          'me llego una multa que no me corresponde',
        ],
      },
      {
        to: '/comprar-auto-con-deuda-uruguay',
        labelKey: 'nav.comprarAutoConDeuda',
        icon: 'mdi-car-off',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'comprar auto con deuda',
          'auto con deuda de patente',
          'transferir auto con deuda',
          'certificado sucive',
          'consulta deuda sucive',
          'auto endeudado marketplace',
          'que pasa si no pago la patente',
          'multa por circular con patente vencida',
          'camaras deuda de patente',
          'retiro de placas deuda patente',
          'comprar auto usado uruguay',
          'me sacan el auto por deuda',
        ],
      },
      {
        to: '/impuesto-autos-electricos-uruguay',
        labelKey: 'nav.impuestoAutosElectricos',
        icon: 'mdi-car-electric-outline',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'impuesto autos electricos uruguay',
          'imesi autos electricos 2027',
          'imesi hibridos uruguay',
          'decreto 147/026',
          'cuanto aumenta el auto electrico en 2027',
          'valor en aduana auto electrico',
          'que autos electricos pagan imesi',
          'conviene comprar auto electrico antes de 2027',
          'imesi mild hybrid uruguay',
          'tasas imesi categoria f',
        ],
      },
      {
        to: '/denunciar-ruidos-molestos-uruguay',
        labelKey: 'nav.ruidosMolestos',
        icon: 'mdi-volume-off',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'ruidos molestos',
          'denunciar ruidos molestos',
          'ruido vecino',
          'contaminacion acustica uruguay',
          'decibeles permitidos uruguay',
          'denuncia intendencia ruido',
          'musica alta vecino',
          'ruido de boliche',
          'ley 17852',
          'sime intendencia ruido',
        ],
      },
      {
        to: '/me-cobran-algo-que-no-autorice',
        labelKey: 'nav.cobroNoAutorizado',
        icon: 'mdi-credit-card-remove-outline',
        priority: 0.9,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'me cobran algo que no autorice',
          'seguro renovado sin autorizacion',
          'como frenar un cobro recurrente',
          'desconocer un cargo de la tarjeta',
          'cobro indebido uruguay',
          'dar de baja un seguro uruguay',
          'renovacion automatica uruguay',
          'reclamo bcu aseguradora',
          'me siguen cobrando un servicio dado de baja',
          'debito automatico que no para',
        ],
      },
      {
        to: '/a-quien-le-reclamo-uruguay',
        labelKey: 'nav.aQuienLeReclamo',
        icon: 'mdi-gavel',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'a quien le reclamo',
          'defensa del consumidor uruguay',
          'reclamo ursea ute ose',
          'reclamo ursec antel',
          'reclamo bcu banco',
          'denuncia usuario financiero',
          'donde presento un reclamo',
          'organismo que corresponde reclamo',
        ],
      },
      {
        to: '/derechos-consumidor-compras-online',
        labelKey: 'nav.derechosConsumidor',
        icon: 'mdi-cart-check',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'derechos del consumidor uruguay',
          'compre online y no me entregan',
          'defensa del consumidor uruguay',
          'ley 17250',
          'derecho de arrepentimiento',
          'retracto compra web',
          'me cobraron y no entregan',
          'no me devuelven la plata tienda web',
          'cancelar compra online uruguay',
          'publicidad enganosa uruguay',
          'garantia legal uruguay',
          '0800 7005',
        ],
      },
      {
        to: '/defensa-al-consumidor-uruguay',
        labelKey: 'nav.defensaConsumidor',
        icon: 'mdi-scale-balance',
        priority: 0.8,
        changefreq: 'monthly',
        fresh: true,
        keywords: [
          'defensa al consumidor uruguay',
          'area defensa del consumidor mef',
          'como hacer un reclamo defensa del consumidor',
          'defensa del consumidor me devuelve la plata',
          'devolucion en tienda fisica uruguay',
          'el comercio esta obligado a aceptar cambios',
          'vale de cambio vencimiento',
          'cambio por talle uruguay',
          'clausulas abusivas uruguay',
          'audiencia administrativa consumidor',
          'no vino a la audiencia',
        ],
      },
      {
        to: '/advertencias-bcu',
        labelKey: 'nav.advertenciasBcu',
        icon: 'mdi-alert-octagon-outline',
        priority: 0.7,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'advertencias bcu',
          'empresas no autorizadas uruguay',
          'es confiable esta empresa',
          'estafa financiera uruguay',
          'banco central advertencia',
          'ponzi uruguay',
          'registro bcu entidades',
        ],
      },
      // Páginas que creó el pipeline de huecos de Reddit, en su propio archivo para que un job
      // automático nunca tenga que parchear ESTE. Ver app/utils/generatedPages.ts.
      ...GENERATED_NAV,
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
        to: '/api-cotizacion-intradia',
        labelKey: 'intradayApi.nav',
        icon: 'mdi-chart-timeline-variant',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: [
          'intradia',
          'intradía',
          'api intradia',
          'cotizacion intradia',
          'variacion del dia',
          'apertura',
          'endpoint',
          'utec',
        ],
      },
      {
        to: '/api-cotizaciones-regionales',
        labelKey: 'regionalApi.nav',
        icon: 'mdi-earth',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: [
          'api regional',
          'cotizaciones regionales',
          'api dolar argentina',
          'api dolar brasil',
          'ptax api',
          'dolar blue api',
          'series historicas',
          'endpoint',
          'utec',
        ],
      },
      {
        to: '/newsletter',
        labelKey: 'newsletter.nav',
        icon: 'mdi-email-newsletter',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: ['newsletter', 'boletin', 'correo', 'suscribirse', 'email'],
      },
      {
        to: '/newsletter/archivo',
        labelKey: 'newsletterArchive.nav',
        icon: 'mdi-archive-outline',
        // Daily, and the highest-priority entry in this section: it is the hub
        // that every day's new issue hangs off, so it is the one URL a crawler
        // should be re-reading rather than the signup form beside it.
        priority: 0.7,
        changefreq: 'daily',
        keywords: [
          'archivo',
          'ediciones',
          'newsletter',
          'boletin',
          'historico',
          'dolar hoy',
          'resumen diario',
        ],
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
        to: '/estadisticas-del-sitio',
        labelKey: 'siteStats.nav',
        icon: 'mdi-chart-timeline-variant',
        priority: 0.4,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'estadisticas',
          'analiticas del sitio',
          'trafico',
          'visitas',
          'usuarios',
          'google analytics',
          'audiencia',
          'transparencia',
        ],
      },
      {
        to: '/estadisticas-reddit',
        labelKey: 'redditStats.nav',
        icon: 'mdi-reddit',
        priority: 0.4,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'reddit',
          'bot',
          'dudas resueltas',
          'preguntas contestadas',
          'transparencia',
          'estadisticas del bot',
          'r/uruguay',
        ],
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
 * Indexable pages that belong in the XML sitemap but not in any menu. The search landing is
 * reached through the magnifier; incident-specific campaign/case pages are reached from their
 * related guide or a direct link.
 */
export const UNLISTED_ROUTES: ReadonlyArray<{ to: string; priority: number; changefreq: string }> =
  Object.freeze([
    { to: '/buscar', priority: 0.5, changefreq: 'monthly' },
    { to: '/reclamo-sodimac-compra-cancelada', priority: 0.7, changefreq: 'weekly' },
  ])

/**
 * Directory keys of dynamic (bracketed) page files, mapped to the hub whose
 * section they inherit. The coverage test asserts this set matches the
 * filesystem exactly, so a new dynamic route cannot be silently orphaned.
 */
export const DYNAMIC_ROUTE_KEYS: Readonly<Record<string, string>> = Object.freeze({
  'blog/[slug]': 'news',
  'casa/[origin]/index': 'houses',
  'casa/[origin]/[intent]': 'houses',
  'comparativas/[familia]/index': 'banking',
  'comparativas/[familia]/[par]': 'banking',
  'casas-de-cambio/[tipo]': 'houses',
  'convertir/[slug]': 'tools',
  // Las páginas individuales de descuentos: una por emisor y una por rubro, ambas alimentadas por
  // el mismo catálogo de Bankos que el mapa de /descuentos-con-tarjeta-uruguay.
  'descuentos-con-tarjeta-uruguay/[banco]': 'banking',
  'descuentos-con-tarjeta-uruguay/rubro/[rubro]': 'banking',
  'cotizacion/[moneda]': 'tools',
  'dolar/[departamento]': 'market',
  'frontera/[ruta]': 'houses',
  'glosario/[termino]': 'learn',
  'guias/[slug]': 'learn',
  'importar/[categoria]': 'imports',
  'historico/[origin]/index': 'market',
  'historico/[origin]/[currency]/[[type]]': 'market',
  'indicadores/[indicador]': 'tools',
  'newsletter/[fecha]': 'news',
  'sucursal/[slug]': 'houses',
  'sucursales/[origin]/[[location]]': 'houses',
  'sillas-escritorio-uruguay/[slug]': 'news',
  'temas/[slug]': 'learn',
  'videos-de-economia-uruguay/[tema]': 'news',
})

/** Curated suggestions shown in the palette's empty state. */
export const POPULAR: readonly string[] = Object.freeze([
  '/dolar-hoy',
  '/historico',
  '/cotizacion/dolar',
  '/herramientas/conversor-de-monedas',
  '/comparar',
  '/analiticas',
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
