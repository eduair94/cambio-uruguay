// Data + helpers for the /casas-de-cambio directory/comparison page.
// PURE (no Vue/Nuxt imports) so unit tests and server code can import freely.

/** Date the reputation snapshot (ratings, press, strengths) was researched. */
export const CASAS_LAST_RESEARCHED = '2026-07-04'

export const CASAS_PATH = '/casas-de-cambio'

export interface UsdRateRow {
  origin: string
  code: string
  type?: string | null
  buy: number
  sell: number
  isInterBank?: boolean
}

export interface UsdComparisonEntry {
  origin: string
  buy: number
  sell: number
  type: string
  /** Buy/sell spread as % of the midpoint — lower = cheaper round trip. */
  spreadPct: number
  /** How much more expensive this house's sell is vs the best sell (%; 0 = best). */
  gapSellPct: number
  /** How much less this house pays on buy vs the best buy (%; 0 = best). */
  gapBuyPct: number
}

/**
 * Type preference when a house quotes USD several ways: the plain cash quote
 * (`''`) is the walk-in rate, `BILLETE` is the bank equivalent, anything else
 * (EBROU, ewallet promos, ...) only applies under conditions, so it ranks last.
 */
const typeRank = (t: string): number => (t === '' ? 0 : t === 'BILLETE' ? 1 : 2)

/**
 * Reduce processed exchange rows to one USD cash quote per origin, with
 * spread and gap-to-best metrics for the comparison table.
 */
export function buildUsdComparison(rows: UsdRateRow[]): UsdComparisonEntry[] {
  const byOrigin = new Map<string, UsdRateRow & { type: string }>()
  for (const r of rows) {
    if (r.code !== 'USD' || r.isInterBank || !(r.buy > 0) || !(r.sell > 0)) continue
    const t = r.type ?? ''
    const prev = byOrigin.get(r.origin)
    if (
      !prev ||
      typeRank(t) < typeRank(prev.type) ||
      (typeRank(t) === typeRank(prev.type) && r.sell < prev.sell)
    ) {
      byOrigin.set(r.origin, { ...r, type: t })
    }
  }
  const picked = [...byOrigin.values()]
  if (picked.length === 0) return []
  const bestSell = Math.min(...picked.map(r => r.sell))
  const bestBuy = Math.max(...picked.map(r => r.buy))
  return picked.map(r => ({
    origin: r.origin,
    buy: r.buy,
    sell: r.sell,
    type: r.type,
    spreadPct: ((r.sell - r.buy) / ((r.sell + r.buy) / 2)) * 100,
    gapSellPct: ((r.sell - bestSell) / bestSell) * 100,
    gapBuyPct: ((bestBuy - r.buy) / bestBuy) * 100,
  }))
}

// --- Reputation snapshot ------------------------------------------------------

/** A citation backing a reputation claim (Google listing, press article, ...). */
export interface ReviewRef {
  label: string
  url: string
}

export interface CasaReputation {
  code: string
  /** Display name (fallback when the live localData payload is unavailable). */
  name: string
  category: 'casa' | 'banco' | 'fintech'
  /** Google Maps stars (1-5) of the flagship listing; null = no verifiable data. */
  googleRating: number | null
  googleReviewCount: number | null
  /** URL where the rating was observed. Required whenever googleRating is set. */
  ratingSource: string | null
  /** Spanish note when branches rate very differently. */
  branchNote: string | null
  founded: string | null
  services: string[]
  strengths: string[]
  weaknesses: string[]
  press: ReviewRef[]
  sources: ReviewRef[]
}

/**
 * Rough "digital experience" score: how many of a house's listed services are
 * digital-channel ones (app, online ordering, delivery, web quotes). Used only
 * to pick the "best digital" highlight — data-driven, not editorial.
 */
export function digitalScore(services: string[]): number {
  return services.filter(s => /app|online|delivery|env[ií]o|digital|web|24/i.test(s)).length
}

/**
 * Reputation snapshot researched on LAST_RESEARCHED via public web sources
 * (Google Maps listings, official sites, BCU registry, Uruguayan press), with
 * every Google rating independently re-verified. Ratings are omitted (null)
 * when no directly verifiable Google listing was found.
 */
export const CASAS_REPUTATION: CasaReputation[] = [
  {
    code: 'aeromar',
    name: 'Aeromar',
    category: 'casa',
    googleRating: 3.3,
    googleReviewCount: 16,
    ratingSource: 'https://www.google.com/maps/place/?q=place_id:ChIJX7EYNG0FdZURv3fDIWxCNcI',
    branchNote:
      'Ratings solo visibles vía el directorio SmartServices (aparente espejo de reseñas de Google): casa central "Cambio Aeromar" (Gorlero y 31) 3.5★ con 13 votos; sucursal Redpagos Aeromar (Av. Aparicio Saravia) 3.8★ con 5 votos.',
    founded: '2011',
    services: [
      'compra/venta de monedas',
      'cotizaciones consultando a operadores',
      'giros internacionales Western Union',
      'giros nacionales vía Redpagos',
      'local Redpagos: cobros, retiros y depósitos',
      'corresponsal financiero',
    ],
    strengths: [
      'Regulada por el BCU desde 2011 (DALMATEN S.A., institución nº 2465)',
      'Red de ~6 sucursales en Punta del Este y Maldonado según registro BCU',
      'Agente Western Union: giros internacionales de envío y recepción',
      'Amplia gama de servicios complementarios (Redpagos, cheques americanos, reimpresión de facturas, cajero BROU)',
    ],
    weaknesses: [
      'Valoración media-baja del local principal (3.5★, 13 votos, directorio SmartServices)',
      'Score bajo en el directorio Cybo (2.5)',
      'Reseñas mencionan tasas a veces poco competitivas',
      'Quejas puntuales por atención al cliente en la sucursal de Aparicio Saravia (reseñas en SmartServices)',
    ],
    press: [],
    sources: [
      {
        label: 'Sitio oficial Aeromar (servicios, cotizaciones, horarios, sucursales)',
        url: 'https://aeromar.com.uy/',
      },
      {
        label: 'Aeromar - Transferencias internacionales (Western Union, Redpagos, cheques…',
        url: 'https://aeromar.com.uy/transferencias.php',
      },
      {
        label: 'Aeromar - Compra y venta de monedas',
        url: 'https://aeromar.com.uy/compra-venta-monedas.php',
      },
      {
        label: 'BCU - Información de institución nº 2465 (DALMATEN S.A. / aeromar…',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2465',
      },
    ],
  },
  {
    code: 'alter_cambio',
    name: 'Alter Cambio',
    category: 'casa',
    googleRating: 4.2,
    googleReviewCount: 10,
    ratingSource: 'https://www.google.com/maps/search/Alter+Cambio+Montevideo?hl=es',
    branchNote:
      'La casa central (Misiones 1375, Ciudad Vieja) tiene 4,2★ con 10 reseñas (8 de 5★ y 2 de 1★). La sucursal Carrasco figura como "Redpagos Altercambio" (Av. Alfredo Arocena 2005) y no tiene reseñas ni calificación en Google.',
    founded: null,
    services: [
      'cotización online',
      'convertidor de monedas online',
      'compra y venta de moneda extranjera y arbitraje',
      'cobranzas, giros, lista de casamientos y entradas UTS vía',
      'formulario web de consultas y reclamos',
    ],
    strengths: [
      'Buena calificación en Google (4,2★, 10 reseñas, casa central Misiones 1375)',
      'Reseñas destacan mejores precios de USD y atención personalizada (8 de 10 reseñas con 5★)',
      'Casa de cambio autorizada y supervisada por el BCU, estado activa (inst. Nº 2589)',
      'Pizarra de cotizaciones y convertidor de monedas en su sitio web',
    ],
    weaknesses: [
      'Multa del BCU en 2024 (162.500 UI, ~US$ 24.600) por debilidades en debida diligencia antilavado',
      'Pocas reseñas en Google (solo 10, con 2 de 1★); sucursal Carrasco sin reseñas',
      'Horario limitado: lunes a viernes 9:30–18:00, cierra fines de semana',
      'Sin app móvil, sin pedidos online ni delivery según su propio sitio web',
    ],
    press: [
      {
        label: 'Banco Central multó a una casa de cambios por más de US$ 24 mil (El Observador…',
        url: 'https://www.elobservador.com.uy/nota/banco-central-multo-a-una-casa-de-cambios-por-mas-de-us-24-mil-2024222181540',
      },
    ],
    sources: [
      {
        label: 'Google Maps — ficha Alter Cambio (4,2★, 10 reseñas, Misiones 1375)',
        url: 'https://www.google.com/maps/search/Alter+Cambio+Montevideo?hl=es',
      },
      {
        label: 'Google Maps — ficha Redpagos Altercambio Carrasco (sin reseñas, Arocena…',
        url: 'https://www.google.com/maps/search/%22Alter+Cambio%22+Arocena+2005?hl=es',
      },
      {
        label: 'Sitio oficial Alter Cambio (servicios, sucursales, horarios)',
        url: 'https://altercambio.com.uy/',
      },
      {
        label: 'Pizarra de cotizaciones online de Alter Cambio',
        url: 'https://altercambio.com.uy/pizarra/',
      },
    ],
  },
  {
    code: 'brou',
    name: 'BROU (Banco República)',
    category: 'banco',
    googleRating: 4,
    googleReviewCount: 184,
    ratingSource:
      'https://www.google.com/maps/place/Banco+Rep%C3%BAblica/data=!4m7!3m6!1s0x959f7f86a4136c29:0x3c53586bbc4f37dc!8m2!3d-34.9051552!4d-56.2088595!16s%2Fg%2F11b809hpzl',
    branchNote: 'BROU tiene decenas de fichas separadas en Google Maps (una por sucursal).',
    founded: '1896',
    services: [
      'Cotización online diaria de múltiples monedas en',
      'Compra/venta de dólares 100% online 24 h vía eBROU con',
      'App móvil eBROU',
      'Transferencias internacionales',
      'Red de sucursales en los 19 departamentos',
      'Horario típico de sucursales 13:00-18:00',
    ],
    strengths: [
      'Banco estatal más grande de Uruguay con sucursales en los 19 departamentos',
      'Casa Central bien valorada en Google Maps (4,0★, 184 reseñas)',
      'Cambio de dólares online 24 h con cotización preferencial (Dólar eBROU) sin ir a sucursal',
      'Reconocido banco N°1 de Uruguay por The Banker y Banco del Año 2017 por LatinFinance',
    ],
    weaknesses: [
      'Calificaciones bajas en varias sucursales por esperas y atención (Sucursal Centro 2,7★/63; Herrera 2,9★/168)',
      'Fuerte disparidad de reseñas entre sucursales (rango 2,7–4,0★ en Google Maps)',
      'Horario de atención en sucursales acotado (típicamente 13 a 18 h)',
      'Cotización de pizarra en sucursal menos conveniente que el canal online, según el propio banco',
    ],
    press: [
      {
        label: 'Asaltaron una sucursal del BROU en Malvín: se llevaron más de 1 millón de pesos y…',
        url: 'https://www.subrayado.com.uy/asaltaron-una-sucursal-del-brou-malvin-se-llevaron-mas-1-millon-pesos-y-80000-dolares-n922644',
      },
      {
        label:
          'Delincuentes robaron sucursal del BROU de Punta de Rieles, dos heridos con roce de…',
        url: 'https://www.subrayado.com.uy/delincuentes-robaron-sucursal-del-brou-punta-rieles-dos-heridos-roce-bala-n552336',
      },
    ],
    sources: [
      {
        label: 'Google Maps - Banco República Casa Central (4,0★, 184 reseñas, observado…',
        url: 'https://www.google.com/maps/place/Banco+Rep%C3%BAblica/data=!4m7!3m6!1s0x959f7f86a4136c29:0x3c53586bbc4f37dc!8m2!3d-34.9051552!4d-56.2088595!16s%2Fg%2F11b809hpzl',
      },
      {
        label: 'Google Maps - búsqueda de sucursales BROU (rango de ratings por sucursal)',
        url: 'https://www.google.com/maps/search/Banco+Rep%C3%BAblica+BROU/@-34.9,-56.16,12z?hl=es',
      },
      {
        label: 'BROU - Historia / Creación del Banco (fundación 1896)',
        url: 'https://www.brou.com.uy/institucional/el-banco/creacion-del-banco',
      },
      {
        label: 'Wikipedia - Banco de la República Oriental del Uruguay',
        url: 'https://en.wikipedia.org/wiki/Banco_de_la_Rep%C3%BAblica_Oriental_del_Uruguay',
      },
    ],
  },
  {
    code: 'cambial',
    name: 'Cambial',
    category: 'casa',
    googleRating: 4.7,
    googleReviewCount: 6,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Cambial/@-30.8961148,-55.537064,17z/data=!3m1!4b1!4m6!3m5!1s0x95a9fef7c04d6b7d:0x50c74afc42fe9c71!8m2!3d-30.8961148!4d-55.537064!16s%2Fg%2F11cjw7hjjp',
    branchNote:
      'Única ficha de Google Maps encontrada (casa matriz, Av. Sarandí 301, Rivera): 4,7★ con 6 reseñas (4 de 5★ y 2 de 4★). No se hallaron fichas de otras sucursales.',
    founded: '1993',
    services: [
      'cotización online',
      'compra y venta de divisas',
      'arbitraje de divisas',
      'transferencias',
      'agente de Western Union',
      'código de buenas prácticas y políticas de prevención',
    ],
    strengths: [
      'Muy buena valoración en Google (4,7★, 6 reseñas)',
      "Reseñas destacan buen tipo de cambio fronterizo ('el mejor cambio de la frontera')",
      'Larga trayectoria: opera desde 1993, autorizada por el BCU (MERYLCO S.A., estado activa)',
      'Agente de Western Union además del cambio de divisas',
    ],
    weaknesses: [
      'Base de reseñas muy pequeña en Google (solo 6 opiniones)',
      'Presencia solo en Rivera, una única sucursal (Av. Sarandí 301)',
      'Ficha de Google sin reclamar: sin teléfono ni sitio web cargados en Maps',
      'Sin valoraciones en Facebook, Trustpilot, TripAdvisor ni Foursquare',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps – Cambio Cambial Rivera (4,7★, 6 reseñas, observado…',
        url: 'https://www.google.com/maps/place/Cambio+Cambial/@-30.8961148,-55.537064,17z/data=!3m1!4b1!4m6!3m5!1s0x95a9fef7c04d6b7d:0x50c74afc42fe9c71!8m2!3d-30.8961148!4d-55.537064!16s%2Fg%2F11cjw7hjjp',
      },
      {
        label: 'Sitio oficial – home (pizarra de cotizaciones, Western Union, contacto)',
        url: 'https://cambialcasadecambios.com.uy/',
      },
      {
        label: 'Sitio oficial – Empresa (historia: inicio de actividades 1/4/1993…',
        url: 'https://cambialcasadecambios.com.uy/empresa/',
      },
      {
        label: 'Sitio oficial – Sucursales (única dirección: Sarandí 301, Rivera)',
        url: 'https://cambialcasadecambios.com.uy/sucursales/',
      },
    ],
  },
  {
    code: 'cambilex',
    name: 'Cambilex',
    category: 'casa',
    googleRating: 2.2,
    googleReviewCount: 20,
    ratingSource:
      'https://www.google.com/maps/place/Cambilex/@-34.9056273,-56.2115208,17z/data=!3m1!4b1!4m6!3m5!1s0x959f7f7ef0524185:0x28d7fb717d397ecc!8m2!3d-34.9056273!4d-56.2115208!16s%2Fg%2F11g0nmsgp3?hl=es',
    branchNote:
      'Cada local tiene ficha propia en Google con pocas reseñas; el más reseñado es el del Mercado del Puerto (Pérez Castellano 1599): 2,2★ con 20 reseñas (13 de 1★, 4 de 5★). El rango en Montevideo va de 1,8★ (D. A.',
    founded: '2003',
    services: [
      'Cotizaciones del día y conversor de monedas online',
      'Cambio de divisas en +200 corresponsales en locales Abitab',
      'Cambio a bordo de la flota Buquebus',
      'Descuento/adelanto de cheques diferidos para empresas',
      'Factoring y líneas de crédito preferenciales para mipymes',
      'Asesoramiento financiero personalizado y tipo de cambio',
    ],
    strengths: [
      'La mayor red de puntos de cambio del país: +230 corresponsales Abitab en todos los departamentos (InfoNegocios 2025)',
      'Respaldo del Grupo Abitab (accionista único) y supervisión del BCU',
      '+20 años de trayectoria (fundada en 2003) y +1 millón de operaciones anuales',
      'Única casa de cambio a bordo de Buquebus con tipo de cambio "no turístico" (El Observador 2022)',
    ],
    weaknesses: [
      'Listado de Google más reseñado con nota baja: 2,2★ (20 reseñas) en Mercado del Puerto, 13 reseñas de 1★',
      'Quejas por cobros/comisiones elevadas en montos chicos (reseña 2026: cotización "el doble" por 400 pesos)',
      'Queja por cerrar antes del horario publicado en la web (reseña en Google)',
      'Reseñas escasas y dispersas por sucursal (la mayoría con <10 opiniones); fichas de Google desactualizadas (un local señalado como convertido a Abitab)',
    ],
    press: [
      {
        label:
          'Empezó como casa de cambio, tiene más de 200 puntos de venta y ahora navega el Río…',
        url: 'https://www.elobservador.com.uy/nota/empezo-como-casa-de-cambio-tiene-mas-de-200-puntos-de-venta-y-ahora-navega-el-rio-de-la-plata-con-buquebus-2022715500',
      },
      {
        label:
          'Cambilex inyectó más de 40 millones de dólares en la economía uruguaya financiando…',
        url: 'https://infonegocios.biz/nota-principal/cambilex-inyecto-mas-de-40-millones-de-dolares-en-la-economia-uruguaya-financiando-empresas',
      },
    ],
    sources: [
      {
        label: 'Google Maps — ficha Cambilex Pérez Castellano 1599 (2,2★, 20 reseñas…',
        url: 'https://www.google.com/maps/place/Cambilex/@-34.9056273,-56.2115208,17z/data=!3m1!4b1!4m6!3m5!1s0x959f7f7ef0524185:0x28d7fb717d397ecc!8m2!3d-34.9056273!4d-56.2115208!16s%2Fg%2F11g0nmsgp3?hl=es',
      },
      {
        label: "Google Maps — búsqueda 'Cambilex' Montevideo (rango 1,8–5,0★ por sucursal)",
        url: 'https://www.google.com/maps/search/Cambilex?hl=es',
      },
      {
        label: 'Google Maps — casa central Fernández Crespo 2149 (5,0★, 3 reseñas)',
        url: 'https://www.google.com/maps/search/Cambilex+Fernandez+Crespo+2149+Montevideo?hl=es',
      },
      {
        label: 'Cambilex — Institucional (misión, +20 años, +200 corresponsales, BCU)',
        url: 'https://cambilex.com.uy/institucional/',
      },
    ],
  },
  {
    code: 'cambio18',
    name: 'Cambio 18',
    category: 'casa',
    googleRating: 3.2,
    googleReviewCount: 50,
    ratingSource: 'https://www.google.com/maps/search/Cambio+18+Uruguay?hl=es',
    branchNote:
      'Las valoraciones en Google Maps varían bastante entre sucursales (observadas directamente el 2026-07-04): Cordón/Av. 18 de Julio 1701 (la más reseñada) 3,2★ (50); Pocitos/Casa Central 26 de Marzo 3508 3,6★ (19); Ejido 2,8★ (16); Arenal Grande 2,8★ (16);',
    founded: '1976',
    services: [
      'cotización online en la web',
      'cambio online por transferencia bancaria',
      'atención por WhatsApp',
      'compra/venta de monedas y lingotes de oro',
      'cofres fort',
      'agencia Western Union',
    ],
    strengths: [
      'Trayectoria desde 1976 (48+ años) como Almar S.A., regulada por el BCU',
      'Red de 11 sucursales en Montevideo, Punta del Este, La Barra y Atlántida',
      'Cambio online por transferencia bancaria con cotización personalizada por WhatsApp',
      'Servicios complementarios: oro, cofres fort, Western Union y Redpagos',
    ],
    weaknesses: [
      'Valoración mediocre de la sucursal principal en Google (3,2★, 50 reseñas)',
      'Sucursales Ejido y Arenal Grande con notas bajas (2,8★, 16 reseñas c/u)',
      'Quejas puntuales por atención al cliente y horarios desactualizados en reseñas (Pocitos: "pobre servicio"; Gorlero)',
      'Sin app móvil ni delivery; el canal online depende de WhatsApp/Instagram',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps – búsqueda Cambio 18 Uruguay (ratings Cordón 3,2★/50 y Pocitos…',
        url: 'https://www.google.com/maps/search/Cambio+18+Uruguay?hl=es',
      },
      {
        label: 'Google Maps – barrido Montevideo (Ejido 2,8★, Arenal 2,8★, Redpagos 2,9★…',
        url: 'https://www.google.com/maps/search/Cambio+18/@-34.88,-56.16,12z?hl=es',
      },
      {
        label: 'Google Maps – Punta del Este (Gorlero 4,0★/16, Península 3,0★/2, texto de…',
        url: 'https://www.google.com/maps/search/Cambio+18+Punta+del+Este?hl=es',
      },
      {
        label: 'Sitio oficial Cambio 18 (Almar S.A., desde 1976, servicios, BCU)',
        url: 'https://www.cambio18.com/',
      },
    ],
  },
  {
    code: 'cambio_3',
    name: 'Cambio 3',
    category: 'casa',
    googleRating: 4.6,
    googleReviewCount: 20,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+3/@-33.6931942,-53.4554636,17z/data=!3m1!4b1!4m6!3m5!1s0x950cde609d7d6665:0x7af98c16b3ea252f!8m2!3d-33.6931942!4d-53.4554636!16s%2Fg%2F11g68wm2_2?hl=es',
    branchNote:
      'Ficha única en Google Maps (Av. Gral. Artigas 120, Chuy, Rocha): 4,6★ con 20 reseñas (14 de 5★, 5 de 4★, 1 de 2★). No se hallaron otras sucursales con ficha propia; la agencia Redpagos opera en el mismo local.',
    founded: '2004',
    services: [
      'cotización online en tiempo real',
      'conversor de divisas online',
      'histórico de cotizaciones en la web',
      'agencia Redpagos en el mismo local',
      'canal de reclamos/sugerencias en la web',
      'horario L-V 8:30-18, sáb 9-12',
    ],
    strengths: [
      'Alta valoración en Google (4,6★, 20 reseñas)',
      'Reseñas destacan atención rápida y personalizada ("Excelente atención al cliente", "Atención rápida y eficaz")',
      'Trayectoria desde 2004; Transa S.A. autorizada y certificada por el BCU',
      'Cotizaciones en tiempo real y conversor en su sitio web',
    ],
    weaknesses: [
      'Base de reseñas pequeña (solo 20 opiniones en Google)',
      'Queja puntual por "poco personal para la cantidad de gente que concurre" (reseña 4★)',
      'Una sola sucursal, en Chuy; sin cobertura en el resto de Rocha ni el país',
      'Sin reserva/pedido online, app móvil, delivery ni Western Union/MoneyGram según su web',
    ],
    press: [],
    sources: [
      {
        label: 'Sitio oficial Cambio 3 - Transa S.A. (cotizaciones, servicios)',
        url: 'https://www.cambio3.com.uy/',
      },
      {
        label: 'La empresa (fundación 2004, historia, BCU)',
        url: 'https://cambio3.com.uy/empresa.php',
      },
      {
        label: 'Contacto (dirección Gral. Artigas 120, Chuy, tel. 4474 2707)',
        url: 'https://cambio3.com.uy/contacto.php',
      },
      {
        label: 'Google Maps - Cambio 3 Chuy (4,6★, 20 reseñas, horarios)',
        url: 'https://www.google.com/maps/place/Cambio+3/@-33.6931942,-53.4554636,17z/data=!3m1!4b1!4m6!3m5!1s0x950cde609d7d6665:0x7af98c16b3ea252f!8m2!3d-33.6931942!4d-53.4554636!16s%2Fg%2F11g68wm2_2?hl=es',
      },
    ],
  },
  {
    code: 'cambio_aguerrebere',
    name: 'Cambio Aguerrebere',
    category: 'casa',
    googleRating: 4.7,
    googleReviewCount: 70,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Aguerrebere/data=!4m7!3m6!1s0x95a31262e3fddf0f:0x98f36d44530629e!8m2!3d-34.4617561!4d-57.8385691!16s%2Fg%2F11h4612dcd',
    branchNote:
      'Ratings de Google Maps por sucursal: Colonia del Sacramento (Aparicio Saravia 651, la más reseñada) 4,7★ con 70 reseñas; Colonia Centro (Gral. Flores 222) 4,1★ con 7 reseñas; Minas (18 de Julio) 3,7★ con 3 reseñas.',
    founded: '2006',
    services: [
      'cotización online en su web',
      'agencia Western Union',
      'Red Pagos: pago de facturas y giros',
      'cofres de seguridad tipo fort',
      'horario extendido en sucursal Colonia Centro',
    ],
    strengths: [
      'Excelente valoración en Google en su sucursal insignia de Colonia (4,7★, 70 reseñas)',
      'Más de 20 años en el mercado cambiario según su web; autorizada y supervisada por el BCU desde 2006',
      'Red de 5 sucursales en 4 departamentos (Minas, Durazno, Colonia x2, Río Branco) + punto registrado en Montevideo ante el BCU',
      'Servicios complementarios: Western Union, Red Pagos y cofres de seguridad en Colonia',
    ],
    weaknesses: [
      'Valoración dispar entre sucursales: casa central de Minas apenas 3,7★ (solo 3 reseñas en Google)',
      'Pocas reseñas fuera de Colonia (7 y 3 reseñas en los otros listados)',
      'Sin app móvil, sin pedido/reserva online ni delivery según su web',
      'Sin presencia verificable en Trustpilot, TripAdvisor ni Foursquare',
    ],
    press: [],
    sources: [
      { label: 'Sitio oficial Cambio Aguerrebere', url: 'https://cambioaguerrebere.com/' },
      {
        label: 'Cotizaciones online (sitio oficial)',
        url: 'https://cambioaguerrebere.com/cotizaciones/',
      },
      { label: 'Sucursales (sitio oficial)', url: 'https://cambioaguerrebere.com/sucursales/' },
      {
        label: 'Google Maps - listado Colonia 4,7★ (70) / búsqueda con 3 listados',
        url: 'https://www.google.com/maps/search/%22Cambio+Aguerrebere%22+Uruguay?hl=es',
      },
    ],
  },
  {
    code: 'cambio_argentino',
    name: 'Cambio Argentino',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'No existe ficha propia de "Cambio Argentino" en Google Maps (búsquedas por nombre, por dirección de casa central y por la sucursal Almenara, verificadas el 2026-07-04, no arrojan ningún listado con ese nombre). En su casa central (Av.',
    founded: '1981',
    services: [
      'cambio de divisas en mostrador',
      'giros Western Union',
      'transferencias nacionales e internacionales',
      'cobranzas y venta de entradas de espectáculos',
      'formulario web de sugerencias y reclamos',
      "en su web solo mostraba la 'Cotización Oficial BROU', no",
    ],
    strengths: [
      'Larga trayectoria: opera desde 1981 (Cambiox Casa de Cambio S.A., perfil EMIS)',
      'Autorizada y supervisada por el Banco Central del Uruguay (institución nº 2555)',
      'Ubicación céntrica: casa central en Av. 18 de Julio 975 y sucursal en Almenara Mall (Canelones)',
      'Ofrecía giros Western Union además del cambio de divisas (sitio archivado 2023)',
    ],
    weaknesses: [
      "Sin ficha ni reseñas propias en Google Maps; su local de casa central figura como 'Abitab 46-00' (2,9★, 10 reseñas)",
      'Sitio web oficial fuera de línea (cambioargentino.uy no resuelve DNS, verificado 2026-07-04; última captura en Wayback: abril 2024)',
      'Sin presencia verificable en Facebook, Trustpilot, TripAdvisor ni Foursquare',
      'No publicaba cotizaciones propias: su web mostraba la cotización oficial del BROU',
    ],
    press: [],
    sources: [
      {
        label: 'Perfil EMIS de Cambiox Casa de Cambio S.A. (fundación 1981, dirección…',
        url: 'https://www.emis.com/php/company-profile/UY/Cambiox_Casa_de_Cambio_SA__Montevideo__es_3545738.html',
      },
      {
        label: 'Sitio archivado - Contáctenos (sucursales 18 de Julio 975 y Almenara Mall…',
        url: 'https://web.archive.org/web/20230331162513/http://cambioargentino.uy/contactenos.html',
      },
      {
        label: 'Sitio archivado - Locales comerciales (Casa Central y Suc. Almenara Mall)',
        url: 'https://web.archive.org/web/20230331165600/http://cambioargentino.uy/locales.html',
      },
      {
        label: 'Sitio archivado - página Western Union (giros internacionales)',
        url: 'https://web.archive.org/web/20230331160251/http://cambioargentino.uy/western.html',
      },
    ],
  },
  {
    code: 'cambio_federal',
    name: 'Cambio Federal',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Solo se encontró ficha de Google para la casa central de Atlántida (3,4★, cantidad de reseñas no visible en la vista consultada). La sucursal de Av. Brasil 2557 (Montevideo) no tiene ficha de Google identificable por separado.',
    founded: null,
    services: [
      'compra y venta de monedas extranjeras',
      'horario extendido 7 días',
      'agencia Redpagos en el local',
      'local dentro del supermercado Disco N°19 de Atlántida',
      'acceso para silla de ruedas',
      'sin cotización online propia',
    ],
    strengths: [
      'Horario extendido todos los días, inusual en el rubro (8:00–22:00 lun a dom según su web)',
      'Ubicación conveniente dentro del supermercado Disco de Atlántida',
      'Reseñas destacan atención "rápida y efectiva" (SmartServices, 3,6★/5 votos)',
      'Local accesible con silla de ruedas',
    ],
    weaknesses: [
      'Calificación Google moderada (3,4★ en la ficha de Atlántida)',
      'Muy pocas reseñas públicas: evidencia de reputación escasa (5 votos en SmartServices)',
      'Queja puntual: dejan de atender antes del horario publicado',
      'Queja por retiro del cajero Redpagos del local',
    ],
    press: [],
    sources: [
      {
        label: 'Ficha Google Maps de Cambio Federal (3,4★, Atlántida, en Disco)',
        url: 'https://www.google.com/maps/place/Cambio+Federal/@-34.7714632,-55.7611413,17z/data=!3m1!4b1!4m6!3m5!1s0x959ff5b673c4627d:0x6d73c58135f46a1a!8m2!3d-34.7714632!4d-55.7611413!16s%2Fg%2F11fhws6310?hl=es',
      },
      {
        label: "Sitio oficial Cambio Federal (servicios, valores, '+10 años en el rubro'…",
        url: 'https://cambiofederal.com.uy/',
      },
      {
        label: 'SmartServices.uy – calificación 3,6/5 (5 votos) y comentarios',
        url: 'https://www.smartservices.uy/institucion-financiera/atlantida/cambio-federal-atlantida_221968.php',
      },
      {
        label: 'Directorio de sucursales (casa central Atlántida + Av. Brasil 2557…',
        url: 'https://cambio-uruguay.com/sucursales/cambio_federal',
      },
    ],
  },
  {
    code: 'cambio_fenix',
    name: 'Cambio Fénix',
    category: 'casa',
    googleRating: 4.9,
    googleReviewCount: 145,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Fenix+-+Redpagos+Agencia+296/@-30.8968939,-55.5355358,17z/data=!4m6!3m5!1s0x95a9ffb1fcccb647:0x36820655ec7a438e!8m2!3d-30.8968939!4d-55.5355358!16s%2Fg%2F11fhws8g6n',
    branchNote:
      'Única sucursal (Casa Central, Blv. 33 Orientales 1184, Rivera); un solo listado en Google Maps ("Cambio Fenix - Redpagos Agencia 296"), sin otras sucursales según el registro del BCU.',
    founded: '2004',
    services: [
      'cotizaciones publicadas en la web',
      'cotización al instante por WhatsApp',
      'compra y venta de moneda extranjera',
      'arbitraje de divisas',
      'operaciones de canje',
      'compra y venta de metales preciosos',
    ],
    strengths: [
      'Excelente valoración en Google (4.9★, 145 opiniones)',
      'Reseñas destacan respuesta rápida por WhatsApp y cotización al instante',
      "Cotización 'diferenciada'/competitiva en la frontera según reseñas",
      'Más de 20 años de trayectoria en Rivera (autorizada por BCU desde 2004)',
    ],
    weaknesses: [
      'Multa del BCU en 2024 (325.000 UI ≈ US$50.000) por deficiencias en prevención de lavado de activos',
      'Presencia limitada: una única sucursal, solo en Rivera',
      'Sin app móvil, delivery ni pedido/reserva online (solo WhatsApp y mostrador)',
    ],
    press: [
      {
        label: 'Ya son cuatro los requeridos por el tiroteo y robo al cambio de Rivera (Subrayado…',
        url: 'https://www.subrayado.com.uy/ya-son-cuatro-los-requeridos-el-tiroteo-y-robo-al-cambio-rivera-n63492',
      },
      {
        label: 'El BCU multó por más de US$ 100.000 a dos casas de cambio (Ámbito, 05/06/2024)',
        url: 'https://www.ambito.com/uruguay/el-bcu-multo-mas-us-100000-dos-casas-cambio-n6010093',
      },
    ],
    sources: [
      {
        label: 'Google Maps - Cambio Fenix Redpagos Agencia 296 (4.9★, 145 opiniones)',
        url: 'https://www.google.com/maps/place/Cambio+Fenix+-+Redpagos+Agencia+296/@-30.8968939,-55.5355358,17z/data=!4m6!3m5!1s0x95a9ffb1fcccb647:0x36820655ec7a438e!8m2!3d-30.8968939!4d-55.5355358!16s%2Fg%2F11fhws8g6n',
      },
      {
        label: 'Sitio oficial - inicio (cotizaciones, servicios, horarios)',
        url: 'https://cambiofenix.com/',
      },
      { label: 'Sitio oficial - servicios', url: 'https://cambiofenix.com/our-story/' },
      { label: 'Sitio oficial - contacto', url: 'https://cambiofenix.com/contact-us/' },
    ],
  },
  {
    code: 'cambio_ingles',
    name: 'Cambio Inglés',
    category: 'casa',
    googleRating: 2,
    googleReviewCount: 9,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Ingles/@-34.8894629,-56.1604682,17z/data=!4m6!3m5!1s0x959f805642267bc9:0x8fc4cce3d768beda!8m2!3d-34.8894629!4d-56.1604682!16s%2Fg%2F11hbfhn4qc?hl=es',
    branchNote:
      'Solo se encontró una ficha de Google Maps con reseñas: la sucursal de Av. 8 de Octubre 2681 (dentro de Fresh Market Disco, Tres Cruces) con 2,0★ y 9 reseñas (1×5★, 1×4★, 1×3★, 0×2★, 6×1★).',
    founded: '2017',
    services: [
      'cotizaciones del día en la web',
      'cambio de monedas',
      'centro de cobranzas',
      'remesas desde y hacia el exterior',
      'venta de entradas a eventos culturales y deportivos',
      'punto de retiro y depósitos bancarios',
    ],
    strengths: [
      'Horario extendido único: todos los días de 8 a 22 h, incluidos domingos',
      'Sucursales dentro de supermercados Disco (conveniencia al hacer las compras)',
      'Servicios adicionales: cobranzas, remesas internacionales, entradas a eventos y retiros/depósitos bancarios',
      'Cotizaciones del día publicadas en su web',
    ],
    weaknesses: [
      'Calificación muy baja en Google (2,0★ con 9 reseñas; 6 de ellas de 1★)',
      'Quejas por poco personal y filas largas ("4 ventanillas y funciona 1 o 2") en la sucursal 8 de Octubre',
      'Queja histórica por no respetar la cotización publicada en su web',
      'Queja por vuelto mal entregado en caja',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps – Cambio Ingles (2,0★, 9 reseñas, Av. 8 de Octubre 2681)',
        url: 'https://www.google.com/maps/place/Cambio+Ingles/@-34.8894629,-56.1604682,17z/data=!4m6!3m5!1s0x959f805642267bc9:0x8fc4cce3d768beda!8m2!3d-34.8894629!4d-56.1604682!16s%2Fg%2F11hbfhn4qc?hl=es',
      },
      {
        label: 'Sitio oficial Cambio Inglés Uruguay (servicios y cotizaciones)',
        url: 'https://www.cambioingles.com.uy/',
      },
      {
        label: 'Sitio oficial – Nuestros Locales (horarios y sucursales)',
        url: 'https://www.cambioingles.com.uy/locales/',
      },
      {
        label: 'BCU – Información de institución Cambio Inglés S.A. (autorización…',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2695',
      },
    ],
  },
  {
    code: 'cambio_maiorano',
    name: 'Cambio Maiorano',
    category: 'casa',
    googleRating: 4.5,
    googleReviewCount: 13,
    ratingSource:
      'https://www.google.com/maps/search/?api=1&query=Cambio+Maiorano,+Maldonado,+Departamento+de+Maldonado&query_place_id=ChIJHc45yoIadZURVvnJwmFAn-s',
    branchNote:
      'La ficha más reseñada (Florida, Maldonado) tiene 4.5★ (13 opiniones: 10 de 5★, 2 de 4★, 1 de 1★). Google muestra otra ficha "Cambio Maiorano" en Maldonado con 3.6★ (12 opiniones); rango observado entre sucursales: 3.6–4.5★.',
    founded: '1989',
    services: [
      'cambio de divisas',
      'transferencias internacionales vía Western Union',
      'giros nacionales',
      'pagos de facturas',
      'depósitos y retiros de efectivo en todos los bancos de plaza',
      'horario extendido lunes a sábado',
    ],
    strengths: [
      'Buena valoración en Google en su ficha principal (4.5★, 13 opiniones)',
      'Larga trayectoria: fundado en 1989, empresa familiar con más de 35 años en Maldonado',
      'Red amplia: 16 sucursales en Maldonado, Rocha, Montevideo, Young y Salto',
      'Horario extendido incluidos sábados (algunas sucursales hasta 20:00)',
    ],
    weaknesses: [
      'Bajo volumen de reseñas en Google (13 en la ficha principal)',
      'Otra ficha de Google en Maldonado con valoración menor (3.6★, 12 opiniones)',
      'Quejas puntuales por pocas cajas/ventanillas abiertas y esperas (reseñas en SmartServices: 3.7★ suc. Joaquín de Viana)',
      'Sin app móvil, sin reserva/pedido online ni delivery; la pizarra de cotizaciones de su web mostraba valores en 0',
    ],
    press: [
      {
        label: 'Prisión preventiva para los dos detenidos por el asalto al cambio Maiorano de la…',
        url: 'https://correopuntadeleste.com/prision-preventiva-para-los-dos-detenidos-por-el-asalto-al-cambio-maiorano-de-la-avenida-aigua/',
      },
      {
        label: 'Cobro de pasividades en Cambio Maiorano (La Paloma Hoy, 25/02/2017)',
        url: 'https://lapalomahoy.uy/nota/2913/cobro-de-pasividades-en-cambio-maiorano',
      },
    ],
    sources: [
      { label: 'Sitio oficial Cambio Maiorano', url: 'https://cambiomaiorano.com/' },
      {
        label: 'Acerca de (historia, fundación 1989, 16 casas)',
        url: 'https://cambiomaiorano.com/about/',
      },
      {
        label: 'Servicios (cambio, facturas, Western Union)',
        url: 'https://cambiomaiorano.com/servicios/',
      },
      { label: 'Sucursales y horarios', url: 'https://cambiomaiorano.com/sucursales/' },
    ],
  },
  {
    code: 'cambio_minas',
    name: 'Cambio Minas',
    category: 'casa',
    googleRating: 4.4,
    googleReviewCount: 170,
    ratingSource:
      'https://www.google.com/maps/place/Abitab+y+Cambio+Minas/@-34.3739872,-55.2324477,17z',
    branchNote:
      'Hay 5 fichas en Google Maps, la mayoría combinadas con su agencia Abitab, con rango 3,1–4,4★: la más reseñada es "Abitab y Cambio Minas" (Varela 802, Minas) 4,4★ (170); la casa central (25 de Mayo 496, "Abitab 18/05 y Cambio Minas") tiene 3,8★ (21);',
    founded: '2006',
    services: [
      'cotización online en su web',
      'operaciones por WhatsApp: servicio DolarBank',
      'pago de facturas como agente Abitab',
      'cotización preferencial para clientes BROU',
      'horario extendido: casa central lun-sáb 8:00-21:00 y',
      'red de 8 sucursales/corresponsales en Lavalleja',
    ],
    strengths: [
      'Sucursal más reseñada bien valorada (4,4★, 170 opiniones en Google, Varela 802)',
      'Casa de cambio regulada por el BCU desde 2006 (PININOS S.A.)',
      'Horario muy extendido, incluye domingos en casa central (9-21h)',
      'Red de 8 sucursales/corresponsales en Lavalleja, Maldonado y Montevideo',
    ],
    weaknesses: [
      'Casa central con valoración media (3,8★, 21 reseñas) y quejas puntuales por mala atención al cliente en reseñas de Google',
      "Ficha 'Cambio Minas' en Punta del Este con baja valoración (3,1★, 15 reseñas)",
      'Sin transferencias internacionales, Western Union, MoneyGram, delivery ni app propia según su web',
      'Web con poca información institucional (sin página de historia detallada)',
    ],
    press: [],
    sources: [
      {
        label: 'Sitio oficial Cambio Minas (cotizaciones, DolarBank, 17 años de…',
        url: 'https://cambiominas.com.uy/',
      },
      {
        label: 'Sucursales Cambio Minas (8 locales y horarios)',
        url: 'https://cambiominas.com.uy/sucursales/',
      },
      {
        label: 'Servicios Cambio Minas (cambio + Abitab)',
        url: 'https://cambiominas.com.uy/servicios/',
      },
      {
        label: 'Registro BCU: PININOS S.A. / CAMBIO MINAS, autorizada 28/07/2006',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2371',
      },
    ],
  },
  {
    code: 'cambio_misiones',
    name: 'Cambio Misiones',
    category: 'casa',
    googleRating: 4.5,
    googleReviewCount: 17,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Misiones/@-34.9062642,-56.2066454,17z/data=!3m1!4b1!4m6!3m5!1s0x959f7f8128ac4a4d:0x2a36663e4197adec!8m2!3d-34.9062642!4d-56.2066454!16s%2Fg%2F11c5s9nkll',
    branchNote:
      'Única sucursal (Casa Central, 25 de Mayo 452 esq. Misiones, Ciudad Vieja); un solo listado en Google Maps. Desglose: 12×5★, 4×4★, 0×3★, 0×2★, 1×1★.',
    founded: '2013',
    services: [
      'Cotización online en su web',
      'Compra y venta de moneda extranjera',
      'Envío y recepción de giros vía Western Union',
      'Pago de facturas',
      'Venta de entradas',
      'Corresponsal habilitado para recepción de fondos',
    ],
    strengths: [
      'Buena reputación en Google (4,5★, 17 reseñas; 16 de 17 con 4-5★)',
      'Reseñas elogian atención amable y buen precio (ej. mejor cotización en reales y recompra parcial al mismo valor)',
      'Regulada y supervisada por el BCU desde 2013 (LERTAMI S.A.)',
      'Agente Western Union más servicios de cobranza (Red Pagos) y entradas',
    ],
    weaknesses: [
      'Pocas reseñas en Google (solo 17), muestra chica',
      'Una sola sucursal (Ciudad Vieja); sin aeropuerto ni interior',
      'Horario limitado: lunes a viernes 9:30-18:00/18:30, cierra fines de semana',
      'Sin app móvil, delivery ni reserva online',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps — ficha de Cambio Misiones (4,5★, 17 reseñas, observado…',
        url: 'https://www.google.com/maps/place/Cambio+Misiones/@-34.9062642,-56.2066454,17z/data=!3m1!4b1!4m6!3m5!1s0x959f7f8128ac4a4d:0x2a36663e4197adec!8m2!3d-34.9062642!4d-56.2066454!16s%2Fg%2F11c5s9nkll',
      },
      {
        label: 'Sitio oficial — portada con cotizaciones y dirección',
        url: 'https://www.cambiomisiones.com.uy/',
      },
      {
        label: 'Sitio oficial — Nuestra Empresa (LERTAMI S.A., autorización BCU 2013…',
        url: 'https://www.cambiomisiones.com.uy/nuestra_empresa.php',
      },
      {
        label: 'Sitio oficial — Servicios (Western Union, Red Pagos, Red UTS, compra/venta…',
        url: 'https://www.cambiomisiones.com.uy/servicios.php',
      },
    ],
  },
  {
    code: 'cambio_obelisco',
    name: 'Cambio Obelisco',
    category: 'casa',
    googleRating: 2,
    googleReviewCount: 42,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Obelisco/@-34.8997243,-56.1706665,17z/data=!3m1!4b1!4m6!3m5!1s0x959f81b2b0813f7d:0xa6ad3c1eb6c8f61e!8m2!3d-34.8997243!4d-56.1706665!16s%2Fg%2F11gfnhlcz4',
    branchNote:
      'Una sola sucursal (casa central en Av. 18 de Julio 2063, Cordón) y un único listado en Google Maps; no hay rango entre sucursales. Distribución de reseñas: 28 de 1★, 3 de 2★, 0 de 3★, 3 de 4★ y 8 de 5★.',
    founded: '1991',
    services: [
      'cotización online en su web',
      'cambio de moneda extranjera',
      'giros al exterior e interior del país',
      'agente Western Union',
      'RedPagos',
      'travellers cheques y cheques de pensiones',
    ],
    strengths: [
      'Larga trayectoria: casa de cambio autorizada por el BCU desde 1991 (Bribil S.A.)',
      'Horario extendido (lun-vie 8 a 20 h, sábados hasta 14 h)',
      'Multiservicio en un solo local céntrico: Western Union, RedPagos, giros, cajeros BROU, lotería',
      'Atención telefónica con servicios sin moverse de casa',
    ],
    weaknesses: [
      'Calificación muy baja en Google (2,0★, 42 reseñas; 28 son de 1★)',
      'Quejas reiteradas por mala atención y trato descortés del personal (mostrador RedPagos incluido)',
      'Reseñas reportan sistema caído con frecuencia y demoras/aperturas tardías',
      'Comentarios que aconsejan verificar el conteo del dinero por errores señalados por clientes',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps - Cambio Obelisco (2,0★, 42 reseñas, observado 2026-07-04)',
        url: 'https://www.google.com/maps/place/Cambio+Obelisco/@-34.8997243,-56.1706665,17z/data=!3m1!4b1!4m6!3m5!1s0x959f81b2b0813f7d:0xa6ad3c1eb6c8f61e!8m2!3d-34.8997243!4d-56.1706665!16s%2Fg%2F11gfnhlcz4',
      },
      {
        label: 'BCU - Información de institución Bribil S.A. (Cambio Obelisco)…',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2458',
      },
      {
        label: 'Sitio oficial Cambio Obelisco - inicio (cotizaciones, Bribil S.A.)',
        url: 'https://cambioobelisco.com.uy/',
      },
      {
        label: 'Sitio oficial Cambio Obelisco - página de servicios',
        url: 'https://cambioobelisco.com.uy/index.php?option=com_content&view=article&id=44&Itemid=60',
      },
    ],
  },
  {
    code: 'cambio_openn',
    name: 'Cambio Openn',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'No existe ficha de Google Maps a nombre de "Cambio Openn"/"Openn" en Río Branco (búsquedas directas en Maps solo devuelven Cambilex, Redpagos Cambio Centro y Redpagos el Dorado).',
    founded: null,
    services: [
      'Cotización online en su web',
      'Cambio de monedas extranjeras',
      'Giros internacionales Western Union',
      'Agente Redpagos',
      'Agente Abitab',
      'Mi Dinero',
    ],
    strengths: [
      'Casa cambiaria autorizada y supervisada por el BCU (Orpen S.A.)',
      '3 sucursales en Río Branco, incl. zona de free shops fronteriza',
      'Horario extendido y atención dominical (suc. Panda é tudo, L-S 10-20, dom 10-14)',
      'Servicios múltiples en un solo local: Western Union, Redpagos, Abitab, Mi Dinero y pagos',
    ],
    weaknesses: [
      'Sin ficha propia en Google Maps: no hay rating ni reseñas verificables a su nombre',
      'Sin reseñas públicas en Trustpilot, TripAdvisor ni Foursquare',
      'Listado Google asociado a su suc. El Dorado (marca Redpagos) apenas 3,5★ con 4 reseñas',
      'Cobertura limitada: solo opera en Río Branco (no en Melo ni resto del país)',
    ],
    press: [
      {
        label: 'Intento de robo a cambio de la zona comercial de Río Branco fue frustrado (Cerro…',
        url: 'https://www.facebook.com/cerrolargotv/posts/923713347255110/',
      },
    ],
    sources: [
      { label: 'Sitio oficial Cambio Openn (inicio)', url: 'https://cambioopenn.com.uy/' },
      {
        label: 'Cambio Openn - Empresa (Orpen S.A., autorización BCU)',
        url: 'https://cambioopenn.com.uy/empresa/',
      },
      {
        label: 'Cambio Openn - Locales (3 sucursales Río Branco, horarios)',
        url: 'https://cambioopenn.com.uy/locales/',
      },
      {
        label: 'Cambio Openn - Servicios (WU, Redpagos, Abitab, Mi Dinero, pagos)',
        url: 'https://cambioopenn.com.uy/servicios/',
      },
    ],
  },
  {
    code: 'cambio_oriental',
    name: 'Cambio Oriental',
    category: 'casa',
    googleRating: 4.5,
    googleReviewCount: 8,
    ratingSource:
      'https://www.google.com/maps/place/CAMBIO+ORIENTAL+-+RIVERA/@-30.8970592,-55.5351433,17z',
    branchNote:
      'Tres fichas de Google con pocas reseñas cada una: Rivera 4,5★ (8 reseñas, la más reseñada), Artigas 4,4★ (7) y la casa central de Treinta y Tres solo 2,0★ (4). En total ~19 reseñas entre las tres sucursales.',
    founded: '2014',
    services: [
      'Cotizaciones online en su web',
      'Compra y venta de moneda extranjera y arbitraje',
      'Servicio en la empresa del cliente',
      'Atención por WhatsApp por sucursal',
      'Horario extendido: L-V 8:00-20:00 y sábados; corresponsal',
      'Red de sucursales y corresponsales en Treinta y Tres',
    ],
    strengths: [
      'Buenas valoraciones en sucursales fronterizas (Google: Rivera 4,5★ con 8 reseñas; Artigas 4,4★ con 7)',
      'Reseñas destacan buen trato, rapidez y tasas competitivas (smartservices.uy 4,8/5, 4 votos)',
      'Autorizada y supervisada por el BCU desde 2014, sin sanciones registradas en su ficha',
      'Horario extendido inusual para el interior (L-V 8:00-20:00; corresponsal TATA todos los días hasta las 22:00)',
    ],
    weaknesses: [
      'Casa central de Treinta y Tres con baja valoración en Google (2,0★, 4 reseñas)',
      'Reputación online poco consolidada: ~19 reseñas de Google en total entre las 3 sucursales',
      'Sin app, delivery, reserva/pedido online ni giros internacionales (Western Union/MoneyGram) según su web',
      'Web básica sin página institucional de historia ("quiénes somos") y sin presencia en Trustpilot/TripAdvisor',
    ],
    press: [],
    sources: [
      {
        label: 'Sitio oficial Cambio Oriental (sucursales, horarios, cotizaciones)',
        url: 'https://www.cambiooriental.com/',
      },
      {
        label: 'Cambio Oriental - Nuestros Servicios',
        url: 'https://www.cambiooriental.com/servicios.html',
      },
      {
        label: 'BCU - Ficha institucional Cambio Oriental S.A. (autorización 20/11/2014…',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2428',
      },
      {
        label: 'Google Maps - CAMBIO ORIENTAL - RIVERA (4,5★, 8 reseñas)',
        url: 'https://www.google.com/maps/place/CAMBIO+ORIENTAL+-+RIVERA/@-30.8970592,-55.5351433,17z',
      },
    ],
  },
  {
    code: 'cambio_pando',
    name: 'Cambio Pando',
    category: 'casa',
    googleRating: 5,
    googleReviewCount: 4,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Pando/@-34.7205619,-55.9605446,17z/data=!3m1!4b1!4m6!3m5!1s0x95a02698d2da6a29:0xd73debaf907b9471!8m2!3d-34.7205619!4d-55.9605446!16s%2Fg%2F11flzhbwtw',
    branchNote:
      'Sucursal única en Pando (Av. Artigas 1056); una sola ficha de Google Maps, sin otras sucursales listadas.',
    founded: null,
    services: [
      'cotizaciones actualizadas publicadas en su web',
      'compra y venta de USD, EUR, BRL y ARS',
      'transferencias nacionales e internacionales por redes',
      'horario extendido entre semana',
    ],
    strengths: [
      'Calificación perfecta en Google (5,0★, aunque solo 4 reseñas)',
      'Reseñas elogian el trato: “Excelente servicio, muy amables”',
      'Mejor puntuada que la competencia local de Pando (Cambio Iberia 3,8★, 17 reseñas)',
      'Autorizada y regulada por el BCU (opera como Fortimax S.A.)',
    ],
    weaknesses: [
      'Muestra muy chica de reseñas (solo 4 opiniones en Google)',
      'Una sola sucursal, sin presencia fuera de Pando',
      'Sin reserva/pedido online, delivery ni app según su web',
      'No ofrece Western Union ni MoneyGram según su web',
    ],
    press: [],
    sources: [
      {
        label: 'Ficha de Google Maps de Cambio Pando (5,0★, 4 reseñas)',
        url: 'https://www.google.com/maps/place/Cambio+Pando/@-34.7205619,-55.9605446,17z/data=!3m1!4b1!4m6!3m5!1s0x95a02698d2da6a29:0xd73debaf907b9471!8m2!3d-34.7205619!4d-55.9605446!16s%2Fg%2F11flzhbwtw',
      },
      {
        label: 'Sitio oficial Cambio Pando (inicio, cotizaciones, horario)',
        url: 'https://www.cambiopando.com.uy/',
      },
      {
        label: 'Sitio oficial - Servicios (monedas y transferencias)',
        url: 'https://www.cambiopando.com.uy/servicios/',
      },
      {
        label: 'Sitio oficial - Documentos (referencia resolución BCU 2017-154)',
        url: 'https://www.cambiopando.com.uy/documentos/',
      },
    ],
  },
  {
    code: 'cambio_pernas',
    name: 'Cambio Pernas',
    category: 'casa',
    googleRating: 4.1,
    googleReviewCount: 44,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Pernas/@-34.8771489,-56.1439104,17z/data=!4m6!3m5!1s0x959f81710a9de9f9:0x7d7d921ab1f1bdb1!8m2!3d-34.8771489!4d-56.1439104!16s%2Fg%2F11fhwp9rql',
    branchNote:
      'Se encontró una única ficha de Google Maps a nombre de Cambio Pernas: la casa central (Av. 8 de Octubre 3602, Unión) con 4,1★ y 44 reseñas (27 de 5★, 5 de 1★).',
    founded: '2002',
    services: [
      'Compra y venta de divisas',
      'Transferencias internacionales Western Union',
      'Cobranzas y pagos vía Redpagos',
      'Cotizaciones e historial de cotizaciones publicados en su',
      'Red de ~80 corresponsalías Redpagos/Abitab en todo el país',
      'Punto de atención en el Aeropuerto Internacional de Carrasco',
    ],
    strengths: [
      'Buena reputación en Google (4,1★, 44 reseñas; 27 de 5★)',
      'Reseñas destacan atención rápida y amable, incluso telefónica',
      'Más de 20 años operando, autorizado y supervisado por el BCU (Monelar S.A., desde 2002)',
      'Amplia red de corresponsalías Redpagos/Abitab en todo el país, incl. Aeropuerto de Carrasco',
    ],
    weaknesses: [
      '5 de 44 reseñas de Google son de 1★ (quejas puntuales: cierre antes del horario publicado, mala atención)',
      'Sin app móvil, pedido/reserva online ni delivery según su web',
      'Opera solo 4 monedas (USD, EUR, ARS, BRL): oferta de divisas limitada',
      'Web institucional básica, sin cotización transaccional en línea',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps - Cambio Pernas (4,1★, 44 reseñas, observado 2026-07-04)',
        url: 'https://www.google.com/maps/place/Cambio+Pernas/@-34.8771489,-56.1439104,17z/data=!4m6!3m5!1s0x959f81710a9de9f9:0x7d7d921ab1f1bdb1!8m2!3d-34.8771489!4d-56.1439104!16s%2Fg%2F11fhwp9rql',
      },
      {
        label: 'Sitio oficial Cambio Pernas (servicios, monedas, Western Union, Redpagos)',
        url: 'https://cambiopernas.com.uy',
      },
      {
        label: 'Cambio Pernas - Empresa (Monelar S.A., opera desde 2002 con autorización…',
        url: 'https://cambiopernas.com.uy/empresa.php',
      },
      { label: 'Cambio Pernas - Servicios', url: 'https://cambiopernas.com.uy/servicios.php' },
    ],
  },
  {
    code: 'cambio_principal',
    name: 'Cambio Principal',
    category: 'casa',
    googleRating: 4.7,
    googleReviewCount: 47,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Principal/@-30.8964413,-55.5364056,17z/data=!4m6!3m5!1s0x95a9fef7d064ab71:0x2f62638403fd4ce2!8m2!3d-30.8964413!4d-55.5364056!16s%2Fg%2F11c0ptcg4_?hl=es',
    branchNote:
      'Única ficha de Google Maps detectada (casa matriz en Blv. 33 Orientales 1146, Rivera); no se encontraron otras sucursales con listados separados. Distribución: 39 reseñas de 5★, 4 de 4★, 2 de 3★, 1 de 2★ y 1 de 1★.',
    founded: null,
    services: [
      'Compra y venta de divisas',
      'Pizarra de cotizaciones publicada en su sitio web',
      'Facturación electrónica',
      'Horario de sábado por la mañana',
      'Formularios y debida diligencia descargables',
    ],
    strengths: [
      'Excelente reputación en Google (4,7★, 47 reseñas; 39 de 5★)',
      'Reseñas repiten que tiene una de las mejores cotizaciones de Rivera ("mejor cotización en la ciudad", "me dieron el mejor cambio")',
      'Atención rápida y amable según reseñas, con clientes fieles de larga data ("hace 9 años que soy cliente")',
      'El propietario responde activamente a las reseñas en Google',
    ],
    weaknesses: [
      'Queja puntual reciente (reseña 2025, traducida del portugués) por entrega de menos dinero en transacciones',
      'Colas largas en horas pico según reseñas ("gran flujo de clientes que siempre están en la fila")',
      'Sin servicios digitales: no ofrece reserva/pedido online, delivery, app ni transferencias internacionales (Western Union/MoneyGram no mencionados)',
      'Presencia solo en Rivera (una sucursal céntrica); sin sucursales en aeropuertos u otras ciudades',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps — ficha Cambio Principal Rivera (4,7★, 47 reseñas, reseñas…',
        url: 'https://www.google.com/maps/place/Cambio+Principal/@-30.8964413,-55.5364056,17z/data=!4m6!3m5!1s0x95a9fef7d064ab71:0x2f62638403fd4ce2!8m2!3d-30.8964413!4d-55.5364056!16s%2Fg%2F11c0ptcg4_?hl=es',
      },
      {
        label: 'Sitio oficial — Cambio Principal / Cambitel S.A. (cotizaciones, dirección…',
        url: 'https://cambioprincipal.com.uy/',
      },
      {
        label: 'Sitio oficial — Quiénes Somos (misión, valores; sin año de fundación)',
        url: 'https://cambioprincipal.com.uy/quienes-somos/',
      },
      {
        label: 'Sitio oficial — Contacto (dirección y teléfono)',
        url: 'https://cambioprincipal.com.uy/contacto/',
      },
    ],
  },
  {
    code: 'cambio_regul',
    name: 'Cambio Regul',
    category: 'casa',
    googleRating: 4.2,
    googleReviewCount: 220,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Regul/data=!4m7!3m6!1s0x959f80eeac13941b:0xa9c942a5dade29e9!8m2!3d-34.87594!4d-56.142464!16s%2Fg%2F11cjp68_f_',
    branchNote:
      'Dos fichas en Google Maps con brecha notable: la sucursal Unión (Av. 8 de Octubre 3671) tiene 4,2★ (220 reseñas), mientras que la casa central "Cambio Regul SA Redpagos" (Av. 18 de Julio 1126) tiene 2,9★ (74 reseñas).',
    founded: null,
    services: [
      'Cotizaciones publicadas en su sitio web',
      'Agencia Redpagos: pago de facturas/cobranzas y giros',
      'Dos sucursales: Centro',
      'Formulario de quejas online; entidad supervisada por el BCU',
    ],
    strengths: [
      'Buena valoración en Google en sucursal Unión (4,2★, 220 reseñas)',
      'Atención amable y rápida según reseñas recientes',
      'Servicios complementarios Redpagos (pagos de facturas y giros) en ambas sucursales',
      'Autorizada y supervisada por el BCU, con formulario de quejas en su web',
    ],
    weaknesses: [
      'Casa central (18 de Julio 1126) mal valorada: 2,9★ con 74 reseñas en Google',
      'Quejas por horarios publicados inconsistentes (figura abierto estando cerrado)',
      'Reclamos puntuales por vueltos/cambio mal entregado en caja',
      'Web propia muy básica: sin reserva online, delivery, app ni transferencias internacionales',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps – búsqueda "Cambio Regul" Montevideo (ambas fichas con rating…',
        url: 'https://www.google.com/maps/search/%22Cambio+Regul%22+Montevideo?hl=es',
      },
      {
        label: 'Google Maps – ficha Cambio Regul SA Redpagos (2,9★, 74 reseñas)',
        url: 'https://www.google.com/maps/place/Cambio+Regul+SA+Redpagos/data=!4m7!3m6!1s0x959f81cd54a317b3:0xc9b66b4b142ea177!8m2!3d-34.9060962!4d-56.1920916!16s%2Fg%2F11c55rrm5f',
      },
      {
        label: 'Sitio oficial Cambio Regul S.A. (cotizaciones, sucursales, supervisión…',
        url: 'https://cambioregulsa.com/',
      },
      {
        label: 'opina.com.uy – Cambio Regul (4,2/5, 213 votos, reseñas de clientes)',
        url: 'https://www.opina.com.uy/institucion-financiera/montevideo/cambio-regul-montevideo_157725.php',
      },
    ],
  },
  {
    code: 'cambio_romantico',
    name: 'Cambio Romántico',
    category: 'casa',
    googleRating: 4.4,
    googleReviewCount: 18,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Y+Tienda+Romantico/@-34.8583849,-56.2177926,17z/data=!3m1!4b1!4m6!3m5!1s0x95a1d546f9d4efe1:0xcdf1d5403c64f464!8m2!3d-34.8583849!4d-56.2177926!16s%2Fg%2F11hb39g9tc?hl=es',
    branchNote:
      'Dos fichas en Google Maps, ambas con 4,4★: "Cambio Y Tienda Romantico" (Av. Agraciada, Paso Molino, 18 reseñas) y "Cambio Romántico" (Club Olimpia, Av. Gral. Eugenio Garzón 1923, Colón, 15 reseñas).',
    founded: '1993',
    services: [
      'Compra y venta de moneda extranjera en 3 locales',
      'Giros internacionales como agente Western Union',
      'Pago de facturas/cobranzas y agencia de lotería y quiniela',
      'Canal de quejas por email y Código de Buenas Prácticas',
      'Publicaba cotizaciones en su web',
    ],
    strengths: [
      'Buena reputación en Google Maps: 4,4★ en sus dos fichas (18 y 15 reseñas)',
      'Reseñas destacan cotización competitiva y atención rápida y cordial',
      'Más de 30 años de trayectoria (opera desde 1993)',
      'Regulado por el BCU, sin sanciones registradas en su ficha institucional y ausente de las sanciones BCU 2025 reportadas por prensa',
    ],
    weaknesses: [
      'Volumen bajo de reseñas (~33 en total entre ambas fichas de Google)',
      'Quejas puntuales en Google: mal trato al público y fallas de equipamiento al cobrar giros (ficha Agraciada)',
      'Sitio web propio fuera de servicio: no publica cotizaciones online actualmente',
      'Presencia digital mínima: sin app, sin redes sociales verificables y ficha de Google sin reclamar',
    ],
    press: [
      {
        label:
          'Debilidad en sistema de prevención contra lavado: BCU dispuso 15 sanciones a casas…',
        url: 'https://www.elobservador.com.uy/economia-y-empresas/debilidad-sistema-prevencion-contra-lavado-y-otras-omisiones-bcu-dispuso-15-sanciones-casas-cambio-el-ano-n6015583',
      },
    ],
    sources: [
      {
        label: "Google Maps - búsqueda 'Cambio Romántico' Montevideo (ambas fichas con…",
        url: 'https://www.google.com/maps/search/%22Cambio+Rom%C3%A1ntico%22+Montevideo?hl=es',
      },
      {
        label: 'Google Maps - ficha Cambio Y Tienda Romantico (4,4★, 18 reseñas)',
        url: 'https://www.google.com/maps/place/Cambio+Y+Tienda+Romantico/@-34.8583849,-56.2177926,17z/data=!3m1!4b1!4m6!3m5!1s0x95a1d546f9d4efe1:0xcdf1d5403c64f464!8m2!3d-34.8583849!4d-56.2177926!16s%2Fg%2F11hb39g9tc?hl=es',
      },
      {
        label: 'BCU - ficha institucional Cambio Romántico S.A. (autorización 22/12/2004…',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2474',
      },
      {
        label: 'Sitio propio archivado - portada/principal (Western Union, BCU) - Wayback…',
        url: 'https://web.archive.org/web/20250417214800/http://cambioromantico.com/',
      },
    ],
  },
  {
    code: 'cambio_rynder',
    name: 'Rynder Cambio',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'No se encontró ficha de Google Maps para ninguna de sus dos sucursales: búsquedas directas en Maps por "Rynder" en Echevarriarza 3263 (Montevideo) y Gastón Arimón 112 (Chuy) devuelven solo casas competidoras (Cambilex, Cambio 3, Nixus, Val, Wef Urupago), nunca a Rynder.',
    founded: '2017',
    services: [
      'cotización online en su web',
      'compra y venta de monedas y metales preciosos',
      'giros y transferencias internacionales',
      'agente RedPagos',
      'venta de tickets RED UTS y Tickantel',
      'mini ATM en local',
    ],
    strengths: [
      'Casa cambiaria autorizada y supervisada por el BCU (según su sitio oficial)',
      'Cotizaciones online publicadas en tiempo real en su web (USD, ARS, BRL, EUR)',
      'Horario extendido en casa central de Pocitos (lun-vie 9:30 a 20:00)',
      'Servicios complementarios: RedPagos, giros internacionales, metales preciosos, tickets RED UTS/Tickantel, mini ATM',
    ],
    weaknesses: [
      'Sin ficha de Google Maps localizable: cero reseñas públicas verificables en ambas sucursales',
      'Sin presencia detectable en Facebook, Trustpilot, TripAdvisor ni Foursquare',
      'Red muy chica: solo 2 locales (casa central Montevideo y corresponsalía Chuy)',
      'Empresa relativamente nueva (registrada en 2017 según EMIS)',
    ],
    press: [],
    sources: [
      { label: 'Sitio oficial Rynder (servicios y cotizaciones)', url: 'https://rynder.com.uy/' },
      { label: 'Rynder - Locales y horarios', url: 'https://rynder.com.uy/locales/' },
      { label: 'Rynder - Contacto', url: 'https://rynder.com.uy/contacto/' },
      {
        label: 'Rynder - Sitemap (sin página quiénes somos)',
        url: 'https://rynder.com.uy/page-sitemap.xml',
      },
    ],
  },
  {
    code: 'cambio_sicurezza',
    name: 'Cambio Sicurezza',
    category: 'casa',
    googleRating: 4,
    googleReviewCount: 1,
    ratingSource: 'https://www.google.com/maps?cid=8384205824503042874',
    branchNote:
      'Única sucursal (San Quintín 4296, Paso Molino, Montevideo) con un solo listado en Google Maps; la única reseña existente es de 4 estrellas.',
    founded: '2012',
    services: [
      'cotización online en su web',
      'horario extendido: lunes a viernes 8 a 21 h',
      'atención fines de semana: sábados y domingos 8:30 a 13:30',
      'formulario online de reclamos y sugerencias',
    ],
    strengths: [
      'Horario muy extendido: L-V 8 a 21 h y abre sábados y domingos (según su web)',
      'Autorizada y supervisada por el BCU desde 2012 (código de institución 2640)',
      'Publica cotizaciones online de USD, EUR, ARS y BRL en su sitio',
      'Sin incidentes, sanciones ni quejas hallados en prensa uruguaya',
    ],
    weaknesses: [
      "Figura 'En proceso de Baja' en el registro del BCU (posible cese de actividad)",
      'Reputación online casi inexistente: una sola reseña en Google Maps',
      'Sitio web deteriorado: portada muestra página por defecto del servidor y certificado SSL vencido',
      'Una única sucursal (Paso Molino); sin presencia en aeropuertos ni otras zonas',
    ],
    press: [],
    sources: [
      {
        label: 'Google Maps — Cambio Sicurezza (4,0★, 1 reseña)',
        url: 'https://www.google.com/maps?cid=8384205824503042874',
      },
      {
        label: "BCU — Información de institución 2640 (Sicurezza Casa Cambiaria S.A., 'En…",
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2640',
      },
      {
        label: 'Sitio oficial — dirección, horarios, autorización BCU 14/9/2012, RUT',
        url: 'http://www.sicurezza.uy/index.html',
      },
      {
        label: 'Sitio oficial — tabla de cotizaciones online (feed activo)',
        url: 'http://www.sicurezza.uy/xml/xml.php',
      },
    ],
  },
  {
    code: 'cambio_sir',
    name: 'Cambio Sir',
    category: 'casa',
    googleRating: 4.1,
    googleReviewCount: 299,
    ratingSource:
      'https://www.google.com/maps/search/Redpagos+Cambio+Sir+Av.+Agraciada+4176+Montevideo?hl=es',
    branchNote:
      'Cada sucursal tiene ficha propia en Google Maps y las notas varían mucho: la más reseñada es "Redpagos Cambio Sir" de Av. Agraciada 4176 (Paso Molino) con 4,1★ (299 reseñas, agencia Redpagos co-marcada); la casa de cambio insignia de Av.',
    founded: '1999',
    services: [
      'Pizarra de cotizaciones online en su web',
      'Compra/venta de divisas sin ir a sucursal por medios',
      'Red de cobranzas y pagos Redpagos',
      'Transferencias internacionales vía More Money Transfers y',
      'Tarjeta prepaga internacional MiDinero',
      'Venta de entradas',
    ],
    strengths: [
      'Trayectoria desde 1999 y habilitación BCU (Riocenter S.A.) sin sanciones en su ficha',
      'Red amplia: casa central + 10 sucursales y corresponsalías en 4 departamentos',
      'Horario extendido único: Radisson abre hasta las 3-4 a.m. y shoppings hasta las 22:00',
      'Sucursal Redpagos Paso Molino bien valorada (4,1★, 299 reseñas en Google)',
    ],
    weaknesses: [
      'Reseñas Google flojas en varias sucursales (Redpagos Géant 1,9★/15, Costa Urbana 2,3★/24)',
      'Calificación muy dispar entre sucursales (de 1,9★ a 4,1★)',
      'Quejas puntuales por esperas y cierres antes del horario publicado en reseñas',
      'Sin app móvil, sin venta online de divisas ni delivery a domicilio',
    ],
    press: [
      {
        label: 'El equipo de Cambio Sir (InfoNegocios, 24/03/2014)',
        url: 'https://infonegocios.biz/hay-equipo-2/el-equipo-de-cambio-sir',
      },
      {
        label: 'Las sucursales y servicios de Cambio SIR (dnegocios.uy, 17/11/2022)',
        url: 'https://dnegocios.uy/las-sucursales-y-servicios-de-cambio-sir/',
      },
    ],
    sources: [
      {
        label: 'Sitio oficial Cambio Sir (servicios, sucursales, horarios)',
        url: 'https://www.cambiosir.com.uy/',
      },
      {
        label: 'Cambio Sir - Empresa (Desde 1999, valores, BCU)',
        url: 'https://www.cambiosir.com.uy/empresa',
      },
      {
        label: 'BCU - Ficha de Riocenter S.A. (Cambio Sir), autorizada 29/08/2011 como…',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2557',
      },
      {
        label: "Google Maps - búsqueda 'Cambio Sir' Montevideo (ratings por sucursal…",
        url: 'https://www.google.com/maps/search/Cambio+Sir/@-34.9011,-56.1645,12z?hl=es',
      },
    ],
  },
  {
    code: 'cambio_young',
    name: 'Cambio Young',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote: null,
    founded: '2007',
    services: [
      'cotización online en su web',
      'agencia Western Union',
      'local Redpagos',
      'giros y transferencias nacionales e internacionales',
      'depósitos en todos los bancos del país',
      'venta de entradas para espectáculos',
    ],
    strengths: [
      'Única casa de cambio autorizada por el BCU en Young ("tu único cambio oficial en Young")',
      'Trayectoria de ~19 años (opera desde marzo de 2007)',
      'Servicios diversificados: Western Union, Redpagos, giros, depósitos bancarios, entradas y recargas',
      'Publica cotizaciones online en su sitio web',
    ],
    weaknesses: [
      'Sin calificación de Google Maps localizable ni reseñas públicas significativas',
      'Quejas puntuales por la mala ubicación del local (3.3/5 en SmartServices, 6 votos)',
      'Una sola sucursal, solo en la ciudad de Young',
      'Presencia digital limitada: sin app, sin pedidos online ni delivery',
    ],
    press: [],
    sources: [
      {
        label: 'Sitio oficial Young en Cambio (cotizaciones, servicios, contacto)',
        url: 'https://youngencambio.com/',
      },
      {
        label: 'Young en Cambio - Nosotros (fundación marzo 2007, historia)',
        url: 'https://youngencambio.com/nosotros',
      },
      {
        label: 'Young en Cambio - Servicios (Western Union, Redpagos, giros, UTS, recargas)',
        url: 'https://youngencambio.com/servicios/',
      },
      {
        label: 'SmartServices.uy - Redpagos Young en Cambio (3.3/5, 6 votos, quejas por…',
        url: 'https://www.smartservices.uy/institucion-financiera/young/redpagos-young-en-cambio-young_221729.php',
      },
    ],
  },
  {
    code: 'fortex',
    name: 'Fortex',
    category: 'casa',
    googleRating: 3.6,
    googleReviewCount: 75,
    ratingSource: 'https://maps.google.com/?cid=7526133302740660359',
    branchNote:
      'Dos listados en Google Maps: Sucursal Cordón "Fortex" (Av. 18 de Julio 2013) 3,6★ con 75 reseñas (34×5★, 16×1★) y Casa Central "Fortex Servicios Financieros" (Misiones 1385) 3,4★ con 31 reseñas; rango 3,4–3,6★.',
    founded: '2006',
    services: [
      'cotización y solicitud de cambio online',
      'envío de dinero a domicilio',
      'retiro del pedido en sucursal',
      'apertura de cuenta 100% online',
      'pagos/transferencias internacionales',
      'pago vía transferencia o depósito bancario',
    ],
    strengths: [
      'Plataforma digital pionera: pedido de cambio online 24/7 con delivery a domicilio o retiro en sucursal',
      'Regulada y supervisada por BCU (FORTIGOLD S.A., código 2452)',
      'Reseñas positivas por buena atención y buen precio (34 de 75 reseñas con 5★ en Cordón; "mejor precio para comprar reales")',
      'Cambio preferencial para usuarios de tarjeta Prex',
    ],
    weaknesses: [
      'Calificación Google media-baja (3,4–3,6★ según sucursal)',
      '21% de reseñas de 1★ en la sucursal Cordón (16/75), con quejas por malos modos y restricciones de billetes',
      'Quejas recurrentes por lentitud en la atención ("amables aunque muy lentos")',
      'Red física chica: solo 2 sucursales, ambas en Montevideo',
    ],
    press: [],
    sources: [
      { label: 'Sitio oficial Fortex (home, Fortex Digital)', url: 'https://www.fortex.com.uy/' },
      {
        label: 'Fortex - Sucursales (direcciones, horarios, links a Google Maps)',
        url: 'https://www.fortex.com.uy/sucursales',
      },
      {
        label: 'Fortex - Preguntas Frecuentes (delivery, retiro, pagos, cuentas BROU)',
        url: 'https://www.fortex.com.uy/preguntas-frecuentes',
      },
      {
        label: 'Fortex Digital (plataforma online 24/7)',
        url: 'https://www.fortex.com.uy/fortex-digital',
      },
    ],
  },
  {
    code: 'gales',
    name: 'Cambio Gales',
    category: 'casa',
    googleRating: 4,
    googleReviewCount: 47,
    ratingSource:
      'https://www.google.com/maps/place/GALES+Servicios+Financieros/data=!4m7!3m6!1s0x959f81195cffdb01:0xd11fb65bf7f2cec1!8m2!3d-34.9047295!4d-56.1369281!16s%2Fg%2F1pp2x74rh',
    branchNote:
      'Rating de Google varía por sucursal (observado en Google Maps 2026-07-04): Casa Central WTC 4,0★ (47), Pocitos 21 de Setiembre 3,7★ (52, la más reseñada), Centro 18 de Julio 4,0★ (41), Ciudad Vieja 4,8★ (9), Carrasco 4,5★ (16), Punta del Este Gorlero 4,0★ (21) y 3,7★ (6), Portal Américas 3,3★ (3), Reus 3,0★ (1).',
    founded: '1976',
    services: [
      'cotización online y conversor de monedas en gales.com.uy',
      'cambio de las principales monedas convertibles',
      'agente autorizado de Western Union desde 1993',
      'giros y transferencias internacionales',
      'Redpagos: pago de +100 facturas y cobro de pasividades',
      'compra/venta de oro, plata, monedas y medallas',
    ],
    strengths: [
      'Casa central (WTC) bien valorada en Google: 4,0★ con 47 reseñas; promedio ~4,0★ en ~196 reseñas totales',
      'Trayectoria de 50 años en el mercado (opera desde 1976), empresa familiar regulada por el BCU',
      'Agente autorizado de Western Union desde 1993 con 200+ subagentes en todo el país',
      'Oferta muy diversificada: oro y metales, cofres fort, Redpagos, tarjeta prepaga EFECTIVA, PIX, remesas',
    ],
    weaknesses: [
      'Sucursal Pocitos, la más reseñada, con rating medio (3,7★, 52 reseñas)',
      'Sucursales chicas con notas bajas puntuales (Portal Américas 3,3★ con 3 reseñas; Reus 3,0★ con 1)',
      "Quejas aisladas por tipo de cambio desfavorable y esperas ('siempre hay gente') en reseñas de directorios",
      'Sin app móvil ni pedido/reserva online de divisas ni delivery según su web',
    ],
    press: [
      {
        label: 'Detuvieron a menor que robó Cambio Gales (Montevideo Portal, 2010)',
        url: 'https://www.montevideo.com.uy/Noticias/Detuvieron-a-menor-que-robo-Cambio-Gales-uc121289',
      },
      {
        label: 'En qué anda Cambio Gales (InfoNegocios, 2010)',
        url: 'https://infonegocios.biz/nota-principal/en-que-anda-cambio-gales',
      },
    ],
    sources: [
      {
        label: "Google Maps – búsqueda 'Cambio Gales' (ratings por sucursal, observado…",
        url: 'https://www.google.com/maps/search/Cambio+Gales?hl=es',
      },
      {
        label: "Sitio oficial Gales Servicios Financieros (servicios, '50 años', WU desde…",
        url: 'https://www.gales.com.uy/',
      },
      { label: 'Gales – Sucursales y horarios', url: 'https://gales.com.uy/sucursales/' },
      {
        label: 'Pasaporte News – perfil de empresa (fundación 19/10/1976)',
        url: 'https://pasaportenews.com/pasaportes/empresas/467-gales-servicios-financieros',
      },
    ],
  },
  {
    code: 'indumex',
    name: 'Indumex',
    category: 'casa',
    googleRating: 2.5,
    googleReviewCount: 34,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Indumex/data=!4m7!3m6!1s0x959f8053c6739ecd:0x7a29b75dcced06db!8m2!3d-34.893986!4d-56.1664475!16s%2Fg%2F11fzfc59k1',
    branchNote:
      'Cada sucursal tiene ficha propia en Google Maps con notas dispares (observadas directamente el 2026-07-04, sucursales de Montevideo): Tres Cruces 2,5★ (34 reseñas, la más reseñada), Nuevocentro 2,4★ (12), Montevideo Shopping 2,9★ (14), Portones 2,3★ (22), Redpagos Cambio Indumex Tres Cruces 1,8★ (25) y Casa Central Ciudad Vieja (Rincón 473) 4,0★ (solo 4 reseñas).',
    founded: '1981',
    services: [
      'cotización online',
      'Indumex GO: cambio de moneda a distancia',
      'transferencias internacionales en múltiples monedas a los',
      'agente Western Union',
      'tarjeta prepaga MoneyCard',
      'cobranza de facturas',
    ],
    strengths: [
      'Trayectoria larga: constituida en 1981, 45 años en el mercado (EMIS/InfoNegocios)',
      'Red amplia: 17 sucursales en 6 departamentos según el BCU, mayormente en shoppings',
      'Horario extendido: sucursales de shopping atienden hasta las 22-23 h (Google Maps)',
      'Portafolio amplio: Western Union, transferencias internacionales, tarjeta prepaga, cobranzas y pago de sueldos',
    ],
    weaknesses: [
      'Calificaciones bajas en Google Maps: 1,8-2,9★ en 5 de las 6 fichas de Montevideo (promedio ponderado ≈2,4★)',
      "Quejas recurrentes por exigencia estricta con el estado de los billetes ('como si fueran el FBI', según reseñas)",
      'Reseñas reportan diferencias entre la cotización publicada en la web y la aplicada en mostrador',
      'Quejas por atención poco empática y trato descortés en sucursales (reseñas Google/SmartServices)',
    ],
    press: [
      { label: 'Caso Peirano (Wikipedia)', url: 'https://es.wikipedia.org/wiki/Caso_Peirano' },
      {
        label: 'En qué anda Indumex (InfoNegocios, 24/06/2010)',
        url: 'https://infonegocios.biz/plus/en-que-anda-indumex',
      },
    ],
    sources: [
      {
        label: 'Google Maps: fichas de Cambio Indumex en Montevideo (ratings observados en…',
        url: 'https://www.google.com/maps/search/Cambio+Indumex+Uruguay?hl=es',
      },
      {
        label: 'Google Maps: ficha Cambio Indumex Tres Cruces (2,5★, 34 reseñas, la más…',
        url: 'https://www.google.com/maps/place/Cambio+Indumex/data=!4m7!3m6!1s0x959f8053c6739ecd:0x7a29b75dcced06db!8m2!3d-34.893986!4d-56.1664475!16s%2Fg%2F11fzfc59k1',
      },
      {
        label: 'Sitio oficial Indumex (servicios, sucursales, regulación BCU)',
        url: 'https://www.indumex.com/',
      },
      {
        label: 'Indumex - Productos (Western Union, transferencias, MoneyCard, seguros de…',
        url: 'https://www.indumex.com/productos',
      },
    ],
  },
  {
    code: 'itau',
    name: 'Banco Itaú',
    category: 'banco',
    googleRating: 3.7,
    googleReviewCount: 111,
    ratingSource:
      'https://www.google.com/maps/place/Banco+Ita%C3%BA,+Agencia+Roosevelt/@-34.9373734,-54.9370635,17z/data=!3m1!4b1!4m6!3m5!1s0x957505364d9d832b:0xdeb738e341aeb74b!8m2!3d-34.9373734!4d-54.9370635!16s%2Fg%2F11c2kgpc1z',
    branchNote:
      'Cada sucursal tiene ficha propia en Google Maps y las notas varían: la más reseñada es Agencia Roosevelt (Punta del Este) 3,7★ (111); Millán 3,6★ (96), Tres Cruces 3,4★ (98), Aguada 3,4★ (58), Casa Central/Ciudad Vieja 3,3★ (82), Av.',
    founded: '1978',
    services: [
      'cotizaciones online en su web',
      'app móvil',
      'billetera digital Itaú Pagos',
      'lobbies de autoservicio con horario extendido',
      'atención telefónica 1784',
      'red de ~20 sucursales en Montevideo e interior',
    ],
    strengths: [
      'Elegido "Mejor Banco de Uruguay" por Euromoney 4 años consecutivos (2025) y por Global Finance 3 años consecutivos',
      'Mayor banco privado del país: +616.000 clientes y ~20 sucursales en Montevideo e interior',
      'Canales digitales fuertes: App Itaú, banca web 24/7, billetera Itaú Pagos y cotizaciones online',
      'Lobbies de autoservicio con horario extendido hasta 19-20 h',
    ],
    weaknesses: [
      'Reseñas Google mediocres en varias agencias (3,0–3,4★ en Tres Cruces, Ciudad Vieja, Aguada, Av. Italia y Gorlero)',
      'Ficha corporativa "Itaú" en Google Maps con 1,9★ (33 reseñas)',
      'Quejas por esperas y atención lenta en Casa Central y llamadas comerciales insistentes según reseñas',
      'Horario de caja acotado (10 a 14 h desde dic. 2025), cambio criticado por AEBU',
    ],
    press: [
      {
        label: 'Itaú fue reconocido como Mejor Banco de Uruguay por Euromoney (4º año consecutivo…',
        url: 'https://www.cronicas.com.uy/empresas-negocios/itau-fue-reconocido-como-mejor-banco-de-uruguay-por-euromoney/',
      },
      {
        label: 'Itaú fue elegido como Mejor Banco de Uruguay por Global Finance, por tercer año…',
        url: 'https://helvecia.com.uy/2025/05/27/itau-fue-elegido-como-mejor-banco-de-uruguay-por-global-finance-por-tercer-ano-consecutivo/',
      },
    ],
    sources: [
      {
        label: 'Google Maps - Banco Itaú Agencia Roosevelt (3,7★, 111 reseñas)',
        url: 'https://www.google.com/maps/place/Banco+Ita%C3%BA,+Agencia+Roosevelt/@-34.9373734,-54.9370635,17z/data=!3m1!4b1!4m6!3m5!1s0x957505364d9d832b:0xdeb738e341aeb74b!8m2!3d-34.9373734!4d-54.9370635!16s%2Fg%2F11c2kgpc1z',
      },
      {
        label: 'Google Maps - Banco Itaú Agencia Ciudad Vieja / Casa Central (3,3★, 82…',
        url: 'https://www.google.com/maps/place/Banco+Ita%C3%BA,+Agencia+Ciudad+Vieja/@-34.9063619,-56.2078986,17z/data=!3m1!4b1!4m6!3m5!1s0x959f7f814974aaad:0x4ef42cc3e1669e86!8m2!3d-34.9063619!4d-56.2078986!16s%2Fg%2F1tl_mx2y',
      },
      {
        label: 'Google Maps - Banco Itaú Agencia Tres Cruces (3,4★, 98 reseñas)',
        url: 'https://www.google.com/maps/place/Banco+Ita%C3%BA,+Agencia+Tres+Cruces/@-34.8925898,-56.1648125,17z/data=!3m1!4b1!4m6!3m5!1s0x959f8053fe019b45:0xc8a57e930efca36c!8m2!3d-34.8925898!4d-56.1648125!16s%2Fg%2F1ydpvcc7b',
      },
      {
        label: 'Wikipedia - Banco Itaú (Uruguay): historia y fundación 1978',
        url: 'https://es.wikipedia.org/wiki/Banco_Ita%C3%BA_(Uruguay)',
      },
    ],
  },
  {
    code: 'la_favorita',
    name: 'Cambio La Favorita',
    category: 'casa',
    googleRating: 3.5,
    googleReviewCount: 31,
    ratingSource:
      'https://www.google.com/maps/place/La+Favorita+SF+-+Casa+Central/data=!4m7!3m6!1s0x959f81cae67f5e1b:0x819e03ff12657f95!8m2!3d-34.9046677!4d-56.1834933!16s%2Fg%2F11bxd8xkmc',
    branchNote:
      'Cada sucursal tiene ficha propia en Google Maps (verificado en vivo 2026-07-04): Casa Central 3,5★ (31, la más reseñada), Villa Biarritz 4,6★ (11), Ciudad de la Costa 4,4★ (29), Pocitos 4,3★ (6), Ejido 4,2★ (11), Zito 4,1★ (15). Rango 3,5–4,6★;',
    founded: '1939',
    services: [
      'cotización online en su web',
      'suscripción diaria de cotizaciones por WhatsApp',
      'compra/venta y arbitraje de divisas',
      'compra/venta de oro',
      'depósitos y retiros bancarios',
      'agente Western Union',
    ],
    strengths: [
      'Larga trayectoria: fundada en 1939, +85 años en el mercado cambiario uruguayo',
      'Sucursales bien valoradas en Google: Villa Biarritz 4,6★, C. de la Costa 4,4★ (29 op.)',
      'Horario extendido hasta las 22:00 entre semana, destacado por reseñas',
      'Servicios amplios: Western Union, giros Abitab, oro y depósitos bancarios',
    ],
    weaknesses: [
      'Casa Central con rating bajo en Google (3,5★, 31 reseñas)',
      'Quejas reiteradas por mala atención en el turno nocturno y sobre la hora de cierre en Casa Central',
      'Queja puntual por tasa desfavorable en pesos argentinos',
      'Sin app móvil, delivery, reserva online ni sucursales en aeropuerto',
    ],
    press: [],
    sources: [
      {
        label: "Google Maps - búsqueda 'Cambio La Favorita Montevideo' (ratings de las 5…",
        url: 'https://www.google.com/maps/search/Cambio+La+Favorita+Montevideo?hl=es',
      },
      {
        label: 'Google Maps - ficha Casa Central 3,5★ (31 reseñas) con reseñas citadas',
        url: 'https://www.google.com/maps/place/La+Favorita+SF+-+Casa+Central/data=!4m7!3m6!1s0x959f81cae67f5e1b:0x819e03ff12657f95!8m2!3d-34.9046677!4d-56.1834933!16s%2Fg%2F11bxd8xkmc',
      },
      {
        label: 'Google Maps - sucursal Ciudad de la Costa 4,4★ (29 reseñas)',
        url: 'https://www.google.com/maps/search/La+Favorita+SF+Giannattasio+Ciudad+de+la+Costa?hl=es',
      },
      {
        label: 'Sitio oficial La Favorita SF - servicios, horarios y sucursales',
        url: 'https://lafavorita.com.uy/',
      },
    ],
  },
  {
    code: 'matriz',
    name: 'Cambio Matriz',
    category: 'casa',
    googleRating: 3,
    googleReviewCount: 31,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Matriz/@-34.907176,-56.2036474,17z/data=!3m1!4b1!4m6!3m5!1s0x959f817244c44541:0xc330fbf46f286ad!8m2!3d-34.907176!4d-56.2036474!16s%2Fg%2F11gxjs_0w2?hl=es',
    branchNote:
      'Tres fichas de Google con nombres distintos: "Cambio Matriz" (casa central, Sarandí 556, Ciudad Vieja) 3,0★ con 31 reseñas (13 de 5★ y 13 de 1★, muy polarizada); "Redpagos Cambio Matríz" (Cordón, 18 de Julio 1581) 3,9★ con 216 reseñas;',
    founded: null,
    services: [
      'cotización online de múltiples monedas en su web',
      'conversor de monedas online',
      'cotización preferencial vía WhatsApp',
      'giros y transferencias internacionales',
      'agente Redpagos',
      'horario extendido en Pocitos',
    ],
    strengths: [
      'Sucursal Pocitos bien valorada (4,3★, 352 reseñas en Google como Red Pagos Matriz)',
      'Horario extendido inusual: Pocitos hasta las 22:00 y abre fines de semana',
      "Agente MoneyGram (reseña: 'únicos con Money Gram y los domingos está abierto')",
      'Cotización preferencial por WhatsApp y cotizaciones online en su web',
    ],
    weaknesses: [
      'Casa central (Sarandí 556) con rating bajo y polarizado en Google (3,0★, 31 reseñas; 13 de 1★)',
      'Quejas reiteradas por trato descortés del personal en casa central y Pocitos',
      'Queja por diferencia entre cotización dada por teléfono y la ofrecida en persona',
      'Queja por cierre antes del horario publicado en sucursal Cordón',
    ],
    press: [],
    sources: [
      {
        label: 'Ficha Google Maps casa central Cambio Matriz (3,0★, 31 reseñas, desglose y…',
        url: 'https://www.google.com/maps/place/Cambio+Matriz/@-34.907176,-56.2036474,17z/data=!3m1!4b1!4m6!3m5!1s0x959f817244c44541:0xc330fbf46f286ad!8m2!3d-34.907176!4d-56.2036474!16s%2Fg%2F11gxjs_0w2?hl=es',
      },
      {
        label: 'Búsqueda Google Maps donde se observaron Red Pagos Matriz Pocitos 4,3★…',
        url: 'https://www.google.com/maps/search/Cambio+Matriz+Juan+B.+Blanco+898+Montevideo?hl=es',
      },
      {
        label: 'SmartServices.uy: 3,1/5 (27 votos, 18 comentarios), quejas de atención y…',
        url: 'https://www.smartservices.uy/institucion-financiera/montevideo/cambio-matriz-montevideo_226133.php',
      },
      {
        label: 'BCU - BLEIS S.A. (Cambio Matriz): institución activa, casa central y 2…',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2467',
      },
    ],
  },
  {
    code: 'oca',
    name: 'OCA',
    category: 'fintech',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'OCA tiene una red amplia de locales de atención en Montevideo y el interior. Cada local mantiene su propia ficha pública; no usamos una única sucursal como reputación global de toda la institución.',
    founded: null,
    services: [
      'cotización de dólar para clientes en Mi Cuenta',
      'gestión digital desde OCA App',
      'cuenta OCA Blue y tarjeta internacional',
      'tarjetas de crédito y beneficios',
      'préstamos y financiación',
      'red de locales de atención en Montevideo e interior',
    ],
    strengths: [
      'Publica una cotización oficial de compra y venta de USD dentro de Mi Cuenta',
      'Combina canales digitales con una red física extensa en buena parte del país',
      'OCA App centraliza tarjetas, estados de cuenta, pagos, beneficios y OCA Blue',
      'La cotización se releva desde la fuente autenticada de la propia institución',
    ],
    weaknesses: [
      'La cotización no es pública: requiere ser cliente e iniciar sesión en Mi Cuenta',
      'No es una casa de cambio abierta al público; la operativa depende de los productos OCA',
      'Las reseñas están fragmentadas entre numerosos locales y no hay una ficha única representativa',
    ],
    press: [],
    sources: [
      {
        label: 'OCA — sitio oficial',
        url: 'https://oca.uy/',
      },
      {
        label: 'OCA — acceso oficial a Mi Cuenta',
        url: 'https://micuentanuevo.oca.com.uy/trx/login',
      },
      {
        label: 'BCU — información oficial sobre OCA',
        url: 'https://www.bcu.gub.uy/Sistema-de-Pagos/Paginas/ocade.aspx',
      },
    ],
  },
  {
    code: 'prex',
    name: 'Prex',
    category: 'fintech',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Prex es 100% digital y no tiene ficha propia en Google Maps (su sede legal en Tomás de Tezanos 1263 figura "sin atención al público").',
    founded: '2015',
    services: [
      'cambio de divisas 100% digital en la app',
      'cuenta digital gratuita + tarjeta prepaga Mastercard',
      'app móvil',
      'transferencias instantáneas 24/7',
      'envío de tarjeta a domicilio o retiro en Abitab, Fortex o',
      'pago de facturas y recargas de celular',
    ],
    strengths: [
      'App muy bien valorada (4,8★ con ~80.000 calificaciones en App Store; 4,3★ con ~27.000 en Google Play)',
      'Cambio de dólares 100% digital 24/7 desde la app, sin ir a una sucursal',
      'Cuenta y tarjeta Mastercard internacional gratuitas, reguladas por el BCU (Econstar S.A.)',
      'Respaldo institucional: Itaú Unibanco posee 30% del capital desde 2022',
    ],
    weaknesses: [
      'Muy mala reputación en Trustpilot (2,0★, ~69 opiniones): bloqueos de cuenta sin aviso, incluso durante viajes',
      'Quejas recurrentes por atención al cliente (sin teléfono ni atención presencial; solo vía app) y demoras en acreditar transferencias',
      'Caso de phishing difundido en prensa (2023) en el que la empresa no reintegró los fondos al usuario',
      'No maneja efectivo ni tiene sucursales propias: retiros/cargas dependen de redes de terceros (Abitab, Fortex, Correo)',
    ],
    press: [
      {
        label: 'Banco Itaú adquiere participación en las fintech uruguayas Prex y Paigo (El…',
        url: 'https://www.elobservador.com.uy/nota/banco-itau-adquiere-participacion-en-las-fintech-uruguayas-prex-y-paigo-2022314193251',
      },
      {
        label:
          'Banco Itaú adquirió participación en dos fintech uruguayas: Prex y Paigo (Montevideo…',
        url: 'https://www.montevideo.com.uy/Negocios-y-Tendencias/Banco-Itau-adquirio-participacion-en-dos-fintech-uruguayas-Prex-y-Paigo-uc815760',
      },
    ],
    sources: [
      {
        label: 'Sitio oficial Prex (servicios, cuenta, cambio de divisas, regulación BCU)',
        url: 'https://www.prexcard.com',
      },
      {
        label: 'Prex — Solicitar tarjeta (retiro en Abitab/Fortex/Correo o envío a…',
        url: 'https://www.prexcard.com/solicitarapp',
      },
      {
        label: 'Trustpilot — Prex Uruguay (2,0/5, 69 opiniones)',
        url: 'https://www.trustpilot.com/review/www.prexcard.com',
      },
      {
        label: 'AppBrain — Prex Uruguay Android (4,31/5, ~27.000 calificaciones)',
        url: 'https://www.appbrain.com/app/prex-uruguay/air.Prex',
      },
    ],
  },
  {
    code: 'santander',
    name: 'Santander',
    category: 'banco',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Santander opera múltiples sucursales y puntos de atención en Montevideo y el interior. Las reseñas públicas corresponden a locales individuales, por lo que no atribuimos la nota de una sola sucursal a todo el banco.',
    founded: null,
    services: [
      'cotización de dólar para clientes en Supernet',
      'compra y venta de moneda entre cuentas',
      'banca web y app móvil',
      'transferencias nacionales e internacionales',
      'cuentas, tarjetas, préstamos e inversiones',
      'red de sucursales y puntos de atención',
    ],
    strengths: [
      'Cotización USD oficial integrada a la banca digital para clientes',
      'Canales web y móvil con operativa bancaria completa',
      'Red de atención en Montevideo y varios departamentos del interior',
      'La cotización se releva directamente desde la API autenticada de Supernet',
    ],
    weaknesses: [
      'La cotización no está publicada en una pizarra abierta: requiere autenticación',
      'Para operar es necesario ser cliente y disponer de cuentas en las monedas involucradas',
      'Las calificaciones varían por sucursal y no existe una única ficha de Google representativa',
    ],
    press: [],
    sources: [
      {
        label: 'Santander Uruguay — sitio oficial',
        url: 'https://www.santander.com.uy/',
      },
      {
        label: 'Santander Uruguay — acceso oficial a Supernet',
        url: 'https://supernet.santander.com.uy/Supernet_UI/',
      },
      {
        label: 'BCU — ficha institucional de Santander Uruguay (n.º 1137)',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=1137',
      },
    ],
  },
  {
    code: 'scotiabank',
    name: 'Scotiabank',
    category: 'banco',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Scotiabank cuenta con sucursales y puntos de atención en Montevideo y el interior. Como las reseñas se publican por local, evitamos presentar la calificación de una sucursal como nota global del banco.',
    founded: null,
    services: [
      'cotización de dólar billete y dólar Internet en Scotia en Línea',
      'cotización de euro por transferencia y Unidad Indexada',
      'banca web y Scotia Móvil',
      'transferencias entre cuentas y a terceros',
      'cuentas, tarjetas, préstamos y plazos fijos',
      'red de sucursales y cajeros',
    ],
    strengths: [
      'Publica cotizaciones diferenciadas para dólar de mostrador y operativa por Internet',
      'Ofrece cotización de EUR por transferencia y de Unidad Indexada',
      'Integra la compra y venta de moneda con su banca digital',
      'La cotización se releva desde el widget autenticado oficial de Scotia en Línea',
    ],
    weaknesses: [
      'Las cotizaciones requieren iniciar sesión y no están disponibles en una pizarra pública',
      'La operativa digital requiere ser cliente y tener productos habilitados',
      'Las reseñas están distribuidas entre múltiples sucursales sin una ficha global comparable',
    ],
    press: [],
    sources: [
      {
        label: 'Scotiabank Uruguay — sitio oficial',
        url: 'https://www.scotiabank.com.uy/',
      },
      {
        label: 'Scotiabank Uruguay — acceso oficial a Scotia en Línea',
        url: 'https://www1.scotiabank.com.uy/scotiaenlinea/login',
      },
      {
        label: 'BCU — ficha institucional de Scotiabank Uruguay (n.º 1128)',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=1128',
      },
    ],
  },
  {
    code: 'suizo',
    name: 'Cambio Suizo',
    category: 'casa',
    googleRating: 4.9,
    googleReviewCount: 120,
    ratingSource:
      'https://www.google.com/maps/place/Cambio+Suizo+-+Surport+S.A./data=!4m7!3m6!1s0x959f81cd31cafcef:0x9ca1457013c91747!8m2!3d-34.900323!4d-56.19091!16s%2Fg%2F11cm0cx8lb',
    branchNote:
      'Ratings dispares entre sucursales: la casa central (Cambio Suizo - Surport S.A., Galicia 1200, Centro) tiene 4,9★ con 120 reseñas; la sucursal Pocitos (21 de Setiembre 3001) 3,3★ con 12 reseñas; un local en Malvín (Orinoco 4943) 4,1★ con 7 reseñas;',
    founded: '1992',
    services: [
      'cotización personalizada por WhatsApp',
      'cambio de divisas: USD, EUR, BRL, ARS, CHF',
      'pago de facturas / cobranzas',
      'transferencias bancarias',
      'registro online de cliente habitual',
      'sábados de mañana',
    ],
    strengths: [
      'Excelente calificación de la casa central en Google (4,9★, 120 reseñas)',
      'Trayectoria desde 1992: más de 30 años en el mercado cambiario',
      'Regulado por el BCU con manual de prevención de lavado de activos publicado en su web',
      'Servicios complementarios: cobranzas (Red UTS/Redpagos) y transferencias bancarias además del cambio',
    ],
    weaknesses: [
      'Calificación baja en sucursal Pocitos (3,3★, 12 reseñas en Google)',
      'Reputación online concentrada en la casa central; demás sucursales casi sin reseñas',
      'Sin app móvil, delivery ni reserva/pedido online según su web',
      'No ofrece Western Union, MoneyGram ni sucursales en aeropuerto',
    ],
    press: [],
    sources: [
      {
        label: 'Sitio oficial Cambio Suizo (fundación 1992, sucursales, servicios…',
        url: 'https://www.cambiosuizo.com.uy/',
      },
      {
        label: "Google Maps - resultados 'Cambio Suizo Montevideo' (ratings de todas las…",
        url: 'https://www.google.com/maps/search/Cambio+Suizo+Montevideo',
      },
      {
        label: 'Google Maps - listado insignia Cambio Suizo - Surport S.A. (4,9★, 120…',
        url: 'https://www.google.com/maps/place/Cambio+Suizo+-+Surport+S.A./data=!4m7!3m6!1s0x959f81cd31cafcef:0x9ca1457013c91747!8m2!3d-34.900323!4d-56.19091!16s%2Fg%2F11cm0cx8lb',
      },
      {
        label: 'EMIS - perfil Surport S.A. (opera como cambio desde octubre 1992…',
        url: 'https://www.emis.com/php/company-profile/UY/Surport_SA_en_3545786.html',
      },
    ],
  },
  {
    code: 'tradelix',
    name: 'Tradelix',
    category: 'casa',
    googleRating: 4,
    googleReviewCount: 46,
    ratingSource:
      'https://www.google.com/maps/place/Redpagos+Ciudad+de+la+Costa+Casa+Cambiaria/@-34.835187,-55.98182,17z/data=!3m1!4b1!4m6!3m5!1s0x959f8910672b793f:0x6800c2705b734255!8m2!3d-34.835187!4d-55.98182!16s%2Fg%2F11gxtgkn4c',
    branchNote: 'Única sucursal (Av. Giannattasio km 21,500, Lagomar/Ciudad de la Costa).',
    founded: '2013',
    services: [
      'Pizarra de cotizaciones en su web',
      'Compra y venta de moneda extranjera',
      'Giros nacionales e internacionales',
      'Agente Western Union',
      'Cobro de facturas vía Redpagos',
      'Atención por WhatsApp y transferencias online según reseñas',
    ],
    strengths: [
      'Valoración positiva en Google (4,0★, 46 reseñas en su local de Lagomar)',
      'Casa de cambio regulada por el BCU desde 2013 (institución nº 2496)',
      'Empresa familiar con experiencia en el rubro cambiario (según su web)',
      'Servicios complementarios: Western Union, giros y Redpagos en el mismo local',
    ],
    weaknesses: [
      'Sin listado propio en Google bajo la marca Tradelix (figura como Redpagos Ciudad de la Costa)',
      'Quejas puntuales por mal trato del personal en reseñas recientes de Google',
      'Una sola sucursal en Lagomar: sin presencia en Montevideo ni en el aeropuerto',
      'Sin app móvil, delivery ni reserva online de divisas',
    ],
    press: [],
    sources: [
      {
        label: 'Sitio oficial Cambio Tradelix (pizarra de cotizaciones y servicios)',
        url: 'https://tradelix.com.uy/',
      },
      {
        label: 'Tradelix - Sobre Nosotros (autorización BCU 26/08/2013, empresa familiar)',
        url: 'https://tradelix.com.uy/sobre-nosotros/',
      },
      {
        label: 'Tradelix - Servicios (cambio, Western Union, Redpagos)',
        url: 'https://tradelix.com.uy/servicios/',
      },
      {
        label: 'Google Maps: Redpagos Ciudad de la Costa Casa Cambiaria (4,0★, 46 reseñas…',
        url: 'https://www.google.com/maps/place/Redpagos+Ciudad+de+la+Costa+Casa+Cambiaria/@-34.835187,-55.98182,17z/data=!3m1!4b1!4m6!3m5!1s0x959f8910672b793f:0x6800c2705b734255!8m2!3d-34.835187!4d-55.98182!16s%2Fg%2F11gxtgkn4c',
      },
    ],
  },
  {
    code: 'varlix',
    name: 'Varlix',
    category: 'casa',
    googleRating: 3.9,
    googleReviewCount: 149,
    ratingSource: 'https://www.google.com/maps/search/Cambio+Varlix?hl=es',
    branchNote:
      'Calificaciones muy dispares entre sucursales en Google Maps (observadas en vivo 2026-07-04): el local insignia de Punta Carretas Shopping es por lejos el más reseñado con 3,9★ (149).',
    founded: '1981',
    services: [
      'Cotización online de divisas en su web',
      'Compra/venta de divisas y venta de oro',
      'Remesas y giros nacionales e internacionales',
      'Tarjeta prepaga propia',
      'Cobranza de facturas / pago de servicios',
      'Pago de pasividades',
    ],
    strengths: [
      'Local insignia bien valorado y muy reseñado (3,9★, 149 reseñas en Punta Carretas Shopping, Google Maps)',
      'Larga trayectoria: opera desde 1981 (su propia web)',
      'Red amplia: ~15 sucursales en Montevideo, Colonia y Maldonado, regulada por el BCU',
      'Horario extendido todos los días hasta las 22 h en shoppings y locales Disco',
    ],
    weaknesses: [
      'Calificaciones Google muy dispares por sucursal: 1,6★ en Colonia del Sacramento y 2,5★ en Tres Cruces',
      'Quejas recurrentes por políticas rígidas con billetes y monedas (no aceptan monedas; pagan menos por billetes que no están perfectos)',
      'Reseñas mencionan colas largas en el local de Punta Carretas Shopping',
      'Varias sucursales co-marcadas Redpagos con ratings bajos (2,9★ Montevideo Shopping; 3,4★ Pocitos)',
    ],
    press: [
      {
        label: 'Así fue el violento asalto a la casa de cambio en Montevideo Shopping (Subrayado…',
        url: 'https://www.subrayado.com.uy/asi-fue-el-violento-asalto-la-casa-cambio-montevideo-shopping-n75585',
      },
      {
        label: 'Tres años de cárcel para el padre del hombre que murió en explosión de cajero en…',
        url: 'https://www.elobservador.com.uy/nota/tres-anos-de-prision-para-el-padre-del-delincuente-que-murio-en-el-shopping-punta-carreras-2019118131329',
      },
    ],
    sources: [
      {
        label: "Google Maps - búsqueda 'Cambio Varlix' (ratings de todas las sucursales…",
        url: 'https://www.google.com/maps/search/Cambio+Varlix?hl=es',
      },
      {
        label: 'Google Maps - listado insignia Punta Carretas Shopping (3,9★, 149 reseñas)',
        url: 'https://www.google.com/maps/place/Cambio+Varlix/@-34.922859,-56.1593954,17z',
      },
      {
        label: 'Varlix - Nosotros (historia, fundación 1981)',
        url: 'https://www.varlix.com.uy/nosotros',
      },
      {
        label: 'Varlix - Todas las sucursales (ubicaciones y horarios)',
        url: 'https://www.varlix.com.uy/AllShops',
      },
    ],
  },
  {
    code: 'cambistar',
    name: 'Cambistar (Investa)',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Casa Central única (Misiones 1544/46 esq. Piedras, Ciudad Vieja); no se identificaron otras sucursales propias con listados de Google separados, aunque figura también como punto Redpagos. No se pudo verificar una ficha de Google Maps (herramientas de búsqueda sin acceso a Maps renderizado por JS).',
    founded: '2004',
    services: [
      'compra y venta de moneda extranjera (USD, ARS, BRL, EUR)',
      'giros y transferencias nacionales e internacionales (Giros More)',
      'cobros y pagos de servicios vía red Redpagos',
      'depósitos y retiros en cuentas bancarias mediante terminal',
      'corresponsalía financiera (recepción de fondos)',
    ],
    strengths: [
      'Antigüedad y continuidad operativa: activa desde 2004 en la misma dirección',
      'Ubicación céntrica en Ciudad Vieja, esquina Misiones y Piedras',
      'Integración con red Redpagos, ampliando puntos de cobro/pago',
      'Regulada y supervisada por el BCU (institución nº 2598), estado activa',
    ],
    weaknesses: [
      'Sin rating ni volumen de reseñas de Google verificable',
      'Horario acotado: lunes a viernes 10:00-18:00, sin atención fines de semana',
      'Sucursal única, sin presencia física amplia frente a competidores con múltiples locales',
    ],
    press: [],
    sources: [
      { label: 'Sitio oficial Investa', url: 'https://www.investa.com.uy/' },
      {
        label: 'BCU - Ficha institucional nroinst=2598',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2598',
      },
    ],
  },
  {
    code: 'eurodracma',
    name: 'Eurodracma',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Varias sucursales (Casa Central en Montevideo/Divina Comedia, Punta del Este, y dos locales en Treinta y Tres), pero no se encontró una ficha de Google verificable para ninguna (un agregador de terceros muestra 5,0★ con solo 4 reseñas para Punta del Este, muestra insuficiente para reportar).',
    founded: null,
    services: [
      'compra y venta de moneda extranjera',
      'arbitraje de divisas',
      'cobranza de facturas y giros nacionales',
      'envío de remesas familiares',
      'transferencias/giros al exterior',
    ],
    strengths: [
      'Regulada y supervisada por el BCU (institución nº 2443), estado activa',
      'Múltiples puntos de atención (Montevideo, Punta del Este, Treinta y Tres x2)',
    ],
    weaknesses: [
      'Sin calificación de Google verificable para la Casa Central de Montevideo',
      'Mencionada en la investigación periodística "FinCEN Files" como entidad receptora de fondos vinculados a Javier Mascherano, lo que generó dudas sobre titularidad real de cuentas',
    ],
    press: [
      {
        label:
          'Transferencias e inversiones de Javier Mascherano en Uruguay despertaron alertas (Montevideo Portal)',
        url: 'https://www.montevideo.com.uy/Noticias/Transferencias-e-inversiones-de-Javier-Mascherano-en-Uruguay-despertaron-alertas-uc765251',
      },
    ],
    sources: [
      { label: 'Sitio oficial Eurodracma', url: 'https://eurodracma.com/' },
      { label: 'Servicios (sitio oficial)', url: 'https://eurodracma.com/servicios/' },
      {
        label: 'BCU - Ficha institucional nroinst=2443',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2443',
      },
    ],
  },
  {
    code: 'nonica',
    name: 'Cambio El Trébol',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Solo se identificó una sucursal confirmada (Casa Central, 18 de Julio 1395, Montevideo); no se hallaron listados de Google Maps para evaluar variación entre sucursales ni una ficha verificable.',
    founded: '2006',
    services: [
      'compra y venta de moneda extranjera (USD, EUR, ARS, BRL, GBP, CHF, JPY)',
      'compra y venta de oro y monedas',
      'cotización online publicada en el sitio',
      'procedimiento de Prevención de Lavado de Activos publicado',
      'canal formal de reclamos online',
    ],
    strengths: [
      'Institución activa y habilitada por el BCU (nº 2373)',
      'Publica cotizaciones actualizadas en su propio sitio',
      'Ubicación céntrica de larga trayectoria sobre 18 de Julio',
    ],
    weaknesses: [
      'Sin reseñas/rating de Google verificables',
      'Sitio oficial en Joomla 1.5 (obsoleto) con un link canonical inyectado en el <head> apuntando a un dominio ajeno (resotomoro.eu) — indicio de compromiso/spam SEO, confirmado vigente en julio 2026; no enlazar el sitio sin monitoreo',
      'Sucursal única, sin red de locales adicionales',
    ],
    press: [],
    sources: [
      {
        label: 'BCU - Ficha institucional nroinst=2373',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2373',
      },
      { label: 'Sitio oficial - Inicio', url: 'https://www.cambioeltrebol.com/' },
    ],
  },
  {
    code: 'cambio_varzy',
    name: 'Cambio Varzy',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Sucursal única (Independencia 736, Florida); no se encontró una ficha de Google Maps verificable (un agregador de terceros, PlanetaUruguay, muestra 4,4/5, pero es un sistema de reseñas propio del directorio, no de Google).',
    founded: '2006',
    services: [
      'compra y venta de moneda extranjera',
      'cobranza de facturas',
      'giros y transferencias nacionales e internacionales',
      'corresponsalía financiera (recepción de fondos)',
      'venta de entradas para espectáculos',
      'sub agencia Redpagos',
    ],
    strengths: [
      'Primera casa de cambio del departamento de Florida, operando desde 2006',
      'Institución autorizada y supervisada por el BCU (nº 2500)',
      'Oferta ampliada vía sub-agencia Redpagos (cobranzas, giros)',
    ],
    weaknesses: [
      'Sin calificación de Google Maps verificable — baja visibilidad online',
      'Una socia (hermana de Gustavo Basso, accionista del 50% de Cambio Varzy S.A.) fue denunciada por asistencia al lavado de activos por unas 600 transferencias registradas en esta casa de cambio, en el marco del escándalo "Conexión Ganadera" (la diaria y El Observador, 2026)',
      'Sucursal única, sin cobertura en Montevideo u otras ciudades',
    ],
    press: [
      {
        label:
          'la diaria — Denunciaron a la hermana de Basso por asistencia al lavado por unas 600 transacciones realizadas en el Cambio Varzy',
        url: 'https://ladiaria.com.uy/justicia/articulo/2026/3/conexion-ganadera-denunciaron-a-la-hermana-de-basso-por-asistencia-al-lavado-por-unas-600-transacciones-realizadas-en-el-cambio-varzy/',
      },
      {
        label:
          'El Observador — Inversores de Conexión Ganadera ampliaron denuncia por lavado... y contra la hermana de Basso',
        url: 'https://www.elobservador.com.uy/nacional/inversores-conexion-ganadera-ampliaron-denuncia-lavado-contra-cabral-tener-ganado-don-coraje-y-contra-la-hermana-basso-n6038843',
      },
    ],
    sources: [
      { label: 'Sitio oficial Cambio Varzy', url: 'https://www.cambiovarzy.com/' },
      {
        label: 'BCU - Ficha institucional nroinst=2500',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2500',
      },
    ],
  },
  {
    code: 'baluma_cambio',
    name: 'Baluma Cambio',
    category: 'casa',
    googleRating: null,
    googleReviewCount: null,
    ratingSource: null,
    branchNote:
      'Única ubicación registrada ante el BCU, dentro del complejo turístico Enjoy Punta del Este (ex-Conrad), Parada 4; no se encontró una ficha de Google Maps ni presencia en comparadores de casas de cambio de Punta del Este.',
    founded: '1997',
    services: [
      'compra y venta de moneda extranjera',
      'arbitraje de divisas',
      'giros y transferencias nacionales e internacionales',
      'cobro de facturas de servicios',
      'venta de entradas para espectáculos del resort',
    ],
    strengths: [
      'Casi 30 años de trayectoria (desde 1997)',
      'Ubicación única dentro del complejo turístico Enjoy Punta del Este, zona de alto tránsito',
      'Institución activa y habilitada por el BCU (nº 2451), sin sanciones registradas en fuentes de prensa consultadas',
    ],
    weaknesses: [
      'Sin presencia ni reseñas verificables en Google Maps ni en comparadores como Wise — baja visibilidad online',
      'Sucursal única, no listada en directorios independientes de casas de cambio de Punta del Este',
      'Atención probablemente ligada a los horarios del resort/casino',
    ],
    press: [],
    sources: [
      {
        label: 'BCU - Ficha institucional nroinst=2451',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2451',
      },
      {
        label: 'Sitio oficial Baluma Cambio',
        url: 'http://balumacambio.enjoypuntadeleste.com.uy/',
      },
    ],
  },
]

// --- Localized page content ---------------------------------------------------

export interface CasaFaqItem {
  q: string
  a: string
}

export interface CasasContent {
  lang: string
  title: string
  metaTitle: string
  description: string
  keywords: string
  /** `{date}` placeholder → localized LAST_RESEARCHED. */
  intro: string
  updated: string
  methodologyTitle: string
  methodology: string[]
  bestForTitle: string
  bestForRate: string
  bestForRated: string
  bestForCoverage: string
  bestForDigital: string
  colCasa: string
  colRating: string
  colBuy: string
  colSell: string
  colSpread: string
  colCoverage: string
  colLinks: string
  categoryCasa: string
  categoryBanco: string
  categoryFintech: string
  contextTitle: string
  context: string[]
  borderTitle: string
  border: string[]
  safetyTitle: string
  safety: string[]
  faqTitle: string
  faq: CasaFaqItem[]
  disclaimer: string
  sourcesTitle: string
  ctaTitle: string
  ctaBody: string
  ctaRates: string
  ctaMap: string
  ctaBranches: string
  noData: string
  lowSample: string
  reviewsCaption: string
  sortLabel: string
  sortReviews: string
  sortRating: string
  sortBestSell: string
  sortBestBuy: string
  sortSpread: string
  sortName: string
  deptFilterLabel: string
  categoryAll: string
  detailsTitle: string
  strengthsLabel: string
  weaknessesLabel: string
  pressLabel: string
  servicesLabel: string
  foundedLabel: string
  branchesLink: string
  historyLink: string
  websiteLink: string
  departmentsSuffix: string
  departmentsSuffixOne: string
  ratesDisclaimer: string
  bcuBadge: string
}

const CONTENT: Record<'es' | 'en' | 'pt', CasasContent> = {
  es: {
    lang: 'es-UY',
    title: 'Casas de cambio en Uruguay: comparativa completa',
    metaTitle: 'Casas de Cambio en Uruguay: Comparativa, Cotizaciones y Opiniones',
    description:
      'Comparamos todas las casas de cambio de Uruguay: cotización del dólar en vivo, reseñas públicas de Google, cobertura de sucursales y servicios. Datos verificados con fuentes citadas.',
    keywords:
      'casas de cambio uruguay, mejor casa de cambio uruguay, donde cambiar dolares uruguay, casas de cambio montevideo, cambio de moneda uruguay, opiniones casas de cambio, comparativa casas de cambio',
    intro:
      'Todas las casas de cambio, bancos y fintech autorizados por el BCU que relevamos a diario, comparados en un solo lugar: cotización del dólar en tiempo real, reputación según reseñas públicas, cobertura y servicios.',
    updated: 'Reputación relevada el {date} · Cotizaciones en vivo',
    methodologyTitle: 'Cómo comparamos (metodología)',
    methodology: [
      'Cotizaciones: surgen de nuestro relevamiento automático de los sitios oficiales de cada casa, actualizado varias veces al día. El spread es la brecha entre compra y venta: cuanto más bajo, menos perdés en un ida y vuelta.',
      'Reputación: promedio y cantidad de reseñas públicas de Google Maps al {date}. No calificamos nosotros: cada dato tiene su fuente citada, y verificamos cada número con una segunda búsqueda independiente. Menos de 30 reseñas se marca como muestra chica.',
      '«Sin datos» no es una mala señal: las casas chicas o del interior suelen tener pocas reseñas publicadas.',
      'No tenemos afiliación comercial con ninguna casa: nadie paga por aparecer ni por su posición. Si ves un error, escribinos desde la página de contacto.',
    ],
    bestForTitle: 'Elegí según lo que buscás',
    bestForRate: 'Mejor precio USD ahora',
    bestForRated: 'Mejor reputación',
    bestForCoverage: 'Mayor cobertura',
    bestForDigital: 'Mejor experiencia digital',
    colCasa: 'Casa',
    colRating: 'Reseñas (Google)',
    colBuy: 'Compra USD',
    colSell: 'Venta USD',
    colSpread: 'Spread',
    colCoverage: 'Cobertura',
    colLinks: 'Más info',
    categoryCasa: 'Casa de cambio',
    categoryBanco: 'Banco',
    categoryFintech: 'Fintech',
    contextTitle: '¿Casa de cambio, banco o fintech?',
    context: [
      'Las casas de cambio viven de comprar y vender moneda, y compiten entre sí cuadra a cuadra: por eso suelen ofrecer mejor precio que los bancos para el cambio de billetes, sin necesidad de ser cliente.',
      'Los bancos (BROU, Itaú, Santander y Scotiabank) convienen sobre todo si ya sos cliente: el tipo de cambio por canales electrónicos suele mejorar al de mostrador, y evitás moverte con efectivo. Como referencia neutral, el BCU publica a diario el tipo de cambio interbancario, que es mayorista: ninguna ventanilla te va a dar ese precio exacto.',
      'Las fintech y emisoras como Prex y OCA operan desde sus canales digitales, con cotización propia para clientes: convienen para saldos y compras, pero para billetes físicos seguís necesitando una ventanilla habilitada.',
    ],
    borderTitle: 'En la frontera y el interior',
    border: [
      'En ciudades de frontera como Rivera, Chuy o Río Branco conviven casas uruguayas y brasileñas, y el real se negocia con spreads muy finos: casas como Cambio Principal, Cambial o Cambio Fénix viven de ese flujo.',
      'En el interior, la oferta se concentra en una o dos casas por ciudad (Cambio Young en Young, Cambio Minas en Minas, Cambio Openn en Melo). Con menos competencia, comparar contra la cotización de Montevideo antes de cambiar montos grandes siempre paga.',
      'En Punta del Este y Maldonado la competencia es fuerte en temporada (Aeromar, Maiorano, y las cadenas grandes): los precios se mueven más rápido y conviene mirar la cotización del día.',
    ],
    safetyTitle: 'Seguridad y regulación',
    safety: [
      'Todas las casas listadas están autorizadas y supervisadas por el Banco Central del Uruguay (BCU), que publica el registro oficial de casas de cambio habilitadas. El enlace «BCU» de cada casa lleva a su ficha en ese registro.',
      'Cambiar en una casa habilitada te da comprobante y billetes verificados. Evitá el cambio informal callejero: además de ilegal, es la principal fuente de billetes falsos.',
      'Por normativa de prevención de lavado de activos, para montos medianos o grandes te van a pedir documento (cédula o pasaporte). Es normal y aplica en todas las instituciones.',
    ],
    faqTitle: 'Preguntas frecuentes',
    faq: [
      {
        q: '¿Cuál es la mejor casa de cambio de Uruguay?',
        a: 'No hay una única «mejor»: el mejor precio del dólar cambia todos los días y entre sucursales, y la mejor atención depende de cada local. Por eso esta página combina la cotización en vivo (relevada de los sitios oficiales), las reseñas públicas de Google y la cobertura de cada casa, para que elijas según lo que más te importe. Para el mejor precio de hoy, mirá el comparador en vivo de la portada.',
      },
      {
        q: '¿Conviene cambiar en una casa de cambio o en un banco?',
        a: 'Para billetes, las casas de cambio suelen ofrecer un spread más bajo que la ventanilla de un banco y no piden ser cliente. Los bancos convienen si ya operás con ellos: los canales electrónicos como eBROU mejoran el precio de mostrador y evitan mover efectivo.',
      },
      {
        q: '¿Conviene cambiar en el aeropuerto?',
        a: 'Las sucursales de aeropuerto son cómodas pero suelen cotizar peor que las del centro: pagás la conveniencia. Si podés, cambiá lo mínimo al llegar y el resto en una casa céntrica después de comparar cotizaciones.',
      },
      {
        q: '¿Es seguro cambiar dinero en Uruguay?',
        a: 'Sí, siempre que uses casas autorizadas por el BCU (todas las de esta página lo están). Pedí y guardá el comprobante, contá el dinero antes de retirarte y evitá el cambio informal callejero.',
      },
      {
        q: '¿Qué necesito para cambiar dinero?',
        a: 'Para montos chicos, solo el efectivo. Para montos medianos o grandes las casas piden documento de identidad (cédula o pasaporte) por las normas de prevención de lavado de activos del BCU.',
      },
      {
        q: '¿Dónde conviene cambiar dólares en Montevideo?',
        a: 'La mayor concentración de casas está en el Centro y Ciudad Vieja, donde la competencia ajusta los precios; en barrios como Carrasco o Pocitos las cotizaciones suelen ser algo menos competitivas. Usá el mapa de sucursales para ver qué te queda cerca y el comparador en vivo para saber cuál paga mejor hoy.',
      },
      {
        q: '¿Se puede negociar la cotización de la pizarra?',
        a: 'Sí. Para montos medianos o grandes (desde unos US$ 100-500 según la casa), muchas casas mejoran la pizarra si lo pedís en ventanilla, y los clientes habituales suelen conseguir algunos centésimos extra. Guías como Guru’Guay y foros de expatriados lo documentan como práctica habitual.',
      },
      {
        q: '¿Las reseñas y cotizaciones de esta página están actualizadas?',
        a: 'Las cotizaciones se relevan automáticamente varias veces al día desde los sitios oficiales. Las reseñas de Google son una foto al {date}, con su fuente citada; los promedios pueden variar levemente desde entonces.',
      },
      {
        q: '¿Por qué algunas casas figuran «sin datos» de reseñas?',
        a: 'Porque no encontramos una ficha de Google verificable con reseñas suficientes. Es común en casas chicas o del interior y no implica mala reputación.',
      },
    ],
    disclaimer:
      'Las cotizaciones cambian durante el día y pueden diferir de la pizarra de cada sucursal. La reputación es una foto de reseñas públicas al {date}: no es una calificación propia ni asesoramiento financiero. No tenemos afiliación con las casas listadas. ¿Encontraste un error? Avisanos desde la página de contacto.',
    sourcesTitle: 'Fuentes y referencias',
    ctaTitle: '¿Dónde conviene cambiar hoy?',
    ctaBody:
      'El mejor precio cambia todos los días. Mirá el comparador en vivo con todas las casas, o encontrá la sucursal más cercana en el mapa.',
    ctaRates: 'Ver cotizaciones en vivo',
    ctaMap: 'Ver mapa de sucursales',
    ctaBranches: 'Ver todas las sucursales',
    noData: 'Sin datos',
    lowSample: 'muestra chica',
    reviewsCaption: 'Reseñas públicas de Google al {date}',
    sortLabel: 'Ordenar por',
    sortReviews: 'Más reseñadas',
    sortRating: 'Mejor calificación',
    sortBestSell: 'Venta USD más barata',
    sortBestBuy: 'Compra USD más alta',
    sortSpread: 'Menor spread',
    sortName: 'Nombre (A-Z)',
    deptFilterLabel: 'Departamento',
    categoryAll: 'Todas',
    detailsTitle: 'Detalle por casa',
    strengthsLabel: 'Puntos fuertes',
    weaknessesLabel: 'Puntos débiles',
    pressLabel: 'En los medios',
    servicesLabel: 'Servicios',
    foundedLabel: 'Fundada en',
    branchesLink: 'Sucursales',
    historyLink: 'Histórico',
    websiteLink: 'Sitio oficial',
    departmentsSuffix: 'deptos.',
    departmentsSuffixOne: 'depto.',
    ratesDisclaimer:
      'Cotizaciones de dólar billete relevadas de los sitios oficiales; «—» significa que la casa no publica cotización online en este momento.',
    bcuBadge: 'Habilitada por el BCU',
  },
  en: {
    lang: 'en',
    title: 'Exchange houses in Uruguay: the complete comparison',
    metaTitle: 'Uruguay Exchange Houses: Comparison, Live Rates & Reviews',
    description:
      'We compare every exchange house in Uruguay: live dollar rates, public Google reviews, branch coverage and services. Verified data with cited sources.',
    keywords:
      'exchange houses uruguay, best exchange house uruguay, where to exchange dollars uruguay, currency exchange montevideo, casas de cambio uruguay, uruguay money exchange reviews',
    intro:
      'Every BCU-authorized exchange house, bank and fintech we track daily, compared in one place: live dollar rates, reputation from public reviews, coverage and services.',
    updated: 'Reputation surveyed on {date} · Live rates',
    methodologyTitle: 'How we compare (methodology)',
    methodology: [
      'Rates: come from our automatic scraping of each house’s official site, updated several times a day. The spread is the gap between buy and sell: the lower it is, the less you lose on a round trip.',
      'Reputation: average and count of public Google Maps reviews as of {date}. We do not rate anyone ourselves: every figure is cited, and each number was double-checked with an independent second search. Fewer than 30 reviews is flagged as a small sample.',
      '“No data” is not a bad sign: small or inland houses often have few published reviews.',
      'We have no commercial affiliation with any house: nobody pays to appear or to rank. Spot an error? Tell us via the contact page.',
    ],
    bestForTitle: 'Pick by what you need',
    bestForRate: 'Best USD price right now',
    bestForRated: 'Best reputation',
    bestForCoverage: 'Widest coverage',
    bestForDigital: 'Best digital experience',
    colCasa: 'House',
    colRating: 'Reviews (Google)',
    colBuy: 'USD buy',
    colSell: 'USD sell',
    colSpread: 'Spread',
    colCoverage: 'Coverage',
    colLinks: 'More',
    categoryCasa: 'Exchange house',
    categoryBanco: 'Bank',
    categoryFintech: 'Fintech',
    contextTitle: 'Exchange house, bank or fintech?',
    context: [
      'Exchange houses make their living buying and selling currency and compete block by block, so they usually beat bank counters on cash rates — no account needed.',
      'Banks (BROU, Itaú, Santander and Scotiabank) pay off mainly if you are already a customer: electronic channels can improve on the counter rate and you avoid carrying cash. As a neutral reference, the central bank (BCU) publishes the daily interbank rate — a wholesale price no counter will match exactly.',
      'Fintechs and issuers such as Prex and OCA use their digital channels and customer rates: they work well for balances and purchases, but physical banknotes still require an authorized counter.',
    ],
    borderTitle: 'Border towns and the interior',
    border: [
      'In border cities like Rivera, Chuy or Río Branco, Uruguayan and Brazilian houses coexist and the real trades with very thin spreads: houses such as Cambio Principal, Cambial or Cambio Fénix live off that flow.',
      'Inland, supply concentrates in one or two houses per town (Cambio Young in Young, Cambio Minas in Minas, Cambio Openn in Melo). With less competition, checking Montevideo rates before exchanging large amounts always pays.',
      'In Punta del Este and Maldonado competition is fierce in season (Aeromar, Maiorano and the big chains): prices move faster, so check the day’s rate.',
    ],
    safetyTitle: 'Safety and regulation',
    safety: [
      'Every house listed here is authorized and supervised by the Central Bank of Uruguay (BCU), which publishes the official registry of licensed exchange houses. Each house’s “BCU” link goes to its entry in that registry.',
      'Exchanging at a licensed house gets you a receipt and verified banknotes. Avoid informal street exchange: besides being illegal, it is the main source of counterfeit bills.',
      'Under anti-money-laundering rules, medium and large amounts require ID (cédula or passport). This is normal and applies at every institution.',
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'Which is the best exchange house in Uruguay?',
        a: 'There is no single “best”: the best dollar price changes daily and between branches, and service quality varies by location. This page combines live rates (scraped from official sites), public Google reviews and each house’s coverage so you can choose by what matters most to you. For today’s best price, check the live comparator on the home page.',
      },
      {
        q: 'Exchange house or bank — which pays better?',
        a: 'For cash, exchange houses usually offer a tighter spread than a bank counter and don’t require an account. Banks pay off if you already bank with them: electronic channels like eBROU beat the counter rate and you avoid carrying cash.',
      },
      {
        q: 'Should I exchange money at the airport?',
        a: 'Airport branches are convenient but usually quote worse than downtown ones — you pay for the convenience. If you can, exchange the minimum on arrival and the rest at a downtown house after comparing rates.',
      },
      {
        q: 'Is it safe to exchange money in Uruguay?',
        a: 'Yes, as long as you use BCU-authorized houses (every house on this page is). Ask for and keep the receipt, count your money before leaving, and avoid informal street exchange.',
      },
      {
        q: 'What do I need to exchange money?',
        a: 'For small amounts, just the cash. For medium and large amounts houses will ask for ID (cédula or passport) under the BCU’s anti-money-laundering rules.',
      },
      {
        q: 'Where should I exchange dollars in Montevideo?',
        a: 'The densest cluster of houses is in Centro and Ciudad Vieja, where competition keeps prices tight; rates in posher neighborhoods like Carrasco or Pocitos tend to be slightly less competitive. Use the branch map to find what’s near you and the live comparator to see who pays best today.',
      },
      {
        q: 'Can you negotiate the board rate?',
        a: 'Yes. For medium and large amounts (from roughly US$100-500 depending on the house), many houses will beat the board rate if you ask at the counter, and regular customers often get a few extra cents. Guides like Guru’Guay and expat forums document this as standard practice.',
      },
      {
        q: 'Are the reviews and rates on this page up to date?',
        a: 'Rates are scraped automatically several times a day from official sites. Google reviews are a snapshot as of {date}, with sources cited; averages may have drifted slightly since.',
      },
      {
        q: 'Why do some houses show “no data” for reviews?',
        a: 'Because we couldn’t find a verifiable Google listing with enough reviews. That’s common for small or inland houses and does not imply a bad reputation.',
      },
    ],
    disclaimer:
      'Rates change during the day and may differ from each branch’s board. Reputation is a snapshot of public reviews as of {date}: it is not our own rating nor financial advice. We are not affiliated with any listed house. Found an error? Let us know via the contact page.',
    sourcesTitle: 'Sources and references',
    ctaTitle: 'Where does it pay to exchange today?',
    ctaBody:
      'The best price changes every day. Check the live comparator with every house, or find the nearest branch on the map.',
    ctaRates: 'See live rates',
    ctaMap: 'See branch map',
    ctaBranches: 'See all branches',
    noData: 'No data',
    lowSample: 'small sample',
    reviewsCaption: 'Public Google reviews as of {date}',
    sortLabel: 'Sort by',
    sortReviews: 'Most reviewed',
    sortRating: 'Highest rating',
    sortBestSell: 'Cheapest USD sell',
    sortBestBuy: 'Highest USD buy',
    sortSpread: 'Lowest spread',
    sortName: 'Name (A-Z)',
    deptFilterLabel: 'Department',
    categoryAll: 'All',
    detailsTitle: 'House by house',
    strengthsLabel: 'Strengths',
    weaknessesLabel: 'Weak points',
    pressLabel: 'In the press',
    servicesLabel: 'Services',
    foundedLabel: 'Founded in',
    branchesLink: 'Branches',
    historyLink: 'History',
    websiteLink: 'Official site',
    departmentsSuffix: 'depts.',
    departmentsSuffixOne: 'dept.',
    ratesDisclaimer:
      'Cash-dollar rates scraped from official sites; “—” means the house isn’t publishing an online rate right now.',
    bcuBadge: 'BCU-licensed',
  },
  pt: {
    lang: 'pt-BR',
    title: 'Casas de câmbio no Uruguai: o comparativo completo',
    metaTitle: 'Casas de Câmbio no Uruguai: Comparativo, Cotações e Avaliações',
    description:
      'Comparamos todas as casas de câmbio do Uruguai: cotação do dólar ao vivo, avaliações públicas do Google, cobertura de agências e serviços. Dados verificados com fontes citadas.',
    keywords:
      'casas de câmbio uruguai, melhor casa de câmbio uruguai, onde trocar dólares uruguai, câmbio montevidéu, trocar real em montevidéu, avaliações casas de câmbio uruguai',
    intro:
      'Todas as casas de câmbio, bancos e fintechs autorizados pelo BCU que monitoramos diariamente, comparados em um só lugar: cotação do dólar em tempo real, reputação segundo avaliações públicas, cobertura e serviços.',
    updated: 'Reputação levantada em {date} · Cotações ao vivo',
    methodologyTitle: 'Como comparamos (metodologia)',
    methodology: [
      'Cotações: vêm do nosso monitoramento automático dos sites oficiais de cada casa, atualizado várias vezes ao dia. O spread é a diferença entre compra e venda: quanto menor, menos você perde numa ida e volta.',
      'Reputação: média e quantidade de avaliações públicas do Google Maps em {date}. Nós não damos nota: cada dado tem fonte citada e foi conferido com uma segunda busca independente. Menos de 30 avaliações é marcado como amostra pequena.',
      '“Sem dados” não é um mau sinal: casas pequenas ou do interior costumam ter poucas avaliações publicadas.',
      'Não temos afiliação comercial com nenhuma casa: ninguém paga para aparecer nem pela posição. Viu um erro? Escreva pela página de contato.',
    ],
    bestForTitle: 'Escolha pelo que você procura',
    bestForRate: 'Melhor preço USD agora',
    bestForRated: 'Melhor reputação',
    bestForCoverage: 'Maior cobertura',
    bestForDigital: 'Melhor experiência digital',
    colCasa: 'Casa',
    colRating: 'Avaliações (Google)',
    colBuy: 'Compra USD',
    colSell: 'Venda USD',
    colSpread: 'Spread',
    colCoverage: 'Cobertura',
    colLinks: 'Mais',
    categoryCasa: 'Casa de câmbio',
    categoryBanco: 'Banco',
    categoryFintech: 'Fintech',
    contextTitle: 'Casa de câmbio, banco ou fintech?',
    context: [
      'As casas de câmbio vivem de comprar e vender moeda e competem quarteirão a quarteirão: por isso costumam oferecer preço melhor que os bancos para dinheiro em espécie, sem exigir conta.',
      'Os bancos (BROU, Itaú, Santander e Scotiabank) valem a pena principalmente se você já é cliente: os canais eletrônicos podem melhorar o preço do balcão e evitam andar com dinheiro. Como referência neutra, o banco central (BCU) publica diariamente o câmbio interbancário — um preço de atacado que nenhum balcão paga exatamente.',
      'Fintechs e emissores como Prex e OCA usam seus canais digitais e cotações para clientes: são úteis para saldos e compras, mas para notas físicas você ainda precisa de um balcão autorizado.',
    ],
    borderTitle: 'Na fronteira e no interior',
    border: [
      'Em cidades de fronteira como Rivera, Chuy ou Río Branco convivem casas uruguaias e brasileiras, e o real é negociado com spreads bem finos: casas como Cambio Principal, Cambial ou Cambio Fénix vivem desse fluxo.',
      'No interior, a oferta se concentra em uma ou duas casas por cidade (Cambio Young em Young, Cambio Minas em Minas, Cambio Openn em Melo). Com menos concorrência, comparar com a cotação de Montevidéu antes de trocar valores grandes sempre compensa.',
      'Em Punta del Este e Maldonado a concorrência é forte na temporada (Aeromar, Maiorano e as grandes redes): os preços mudam mais rápido, vale olhar a cotação do dia.',
    ],
    safetyTitle: 'Segurança e regulação',
    safety: [
      'Todas as casas listadas são autorizadas e supervisionadas pelo Banco Central do Uruguai (BCU), que publica o registro oficial de casas habilitadas. O link “BCU” de cada casa leva à sua ficha nesse registro.',
      'Trocar numa casa habilitada garante comprovante e notas verificadas. Evite o câmbio informal de rua: além de ilegal, é a principal fonte de notas falsas.',
      'Pelas normas de prevenção à lavagem de dinheiro, valores médios ou grandes exigem documento (cédula ou passaporte). É normal e vale em todas as instituições.',
    ],
    faqTitle: 'Perguntas frequentes',
    faq: [
      {
        q: 'Qual é a melhor casa de câmbio do Uruguai?',
        a: 'Não existe uma única “melhor”: o melhor preço do dólar muda todo dia e entre agências, e o atendimento varia por local. Esta página combina a cotação ao vivo (coletada dos sites oficiais), as avaliações públicas do Google e a cobertura de cada casa, para você escolher pelo que mais importa. Para o melhor preço de hoje, veja o comparador ao vivo na página inicial.',
      },
      {
        q: 'Casa de câmbio ou banco — qual paga melhor?',
        a: 'Para dinheiro em espécie, as casas de câmbio costumam ter spread menor que o balcão de um banco e não exigem conta. Bancos valem a pena se você já é cliente: canais eletrônicos como o eBROU melhoram o preço do balcão.',
      },
      {
        q: 'Vale a pena trocar no aeroporto?',
        a: 'As agências de aeroporto são cômodas, mas costumam cotar pior que as do centro: você paga pela conveniência. Se puder, troque o mínimo na chegada e o resto numa casa do centro depois de comparar cotações.',
      },
      {
        q: 'É seguro trocar dinheiro no Uruguai?',
        a: 'Sim, desde que você use casas autorizadas pelo BCU (todas as desta página são). Peça e guarde o comprovante, conte o dinheiro antes de sair e evite o câmbio informal de rua.',
      },
      {
        q: 'O que preciso para trocar dinheiro?',
        a: 'Para valores pequenos, só o dinheiro. Para valores médios ou grandes as casas pedem documento (cédula ou passaporte) pelas normas de prevenção à lavagem de dinheiro do BCU.',
      },
      {
        q: 'Onde vale a pena trocar dólares em Montevidéu?',
        a: 'A maior concentração de casas fica no Centro e na Ciudad Vieja, onde a concorrência ajusta os preços; em bairros como Carrasco ou Pocitos as cotações costumam ser um pouco piores. Use o mapa de agências para ver o que está perto de você e o comparador ao vivo para saber quem paga melhor hoje.',
      },
      {
        q: 'Dá para negociar a cotação do quadro?',
        a: 'Sim. Para valores médios ou grandes (a partir de uns US$ 100-500 conforme a casa), muitas casas melhoram o quadro se você pedir no balcão, e clientes habituais costumam conseguir alguns centésimos a mais. Guias como o Guru’Guay e fóruns de expatriados documentam essa prática.',
      },
      {
        q: 'As avaliações e cotações desta página estão atualizadas?',
        a: 'As cotações são coletadas automaticamente várias vezes ao dia dos sites oficiais. As avaliações do Google são uma foto de {date}, com fonte citada; as médias podem ter variado um pouco desde então.',
      },
      {
        q: 'Por que algumas casas aparecem “sem dados” de avaliações?',
        a: 'Porque não encontramos uma ficha do Google verificável com avaliações suficientes. É comum em casas pequenas ou do interior e não significa má reputação.',
      },
    ],
    disclaimer:
      'As cotações mudam ao longo do dia e podem diferir do quadro de cada agência. A reputação é uma foto de avaliações públicas em {date}: não é nota nossa nem aconselhamento financeiro. Não temos afiliação com as casas listadas. Achou um erro? Avise pela página de contato.',
    sourcesTitle: 'Fontes e referências',
    ctaTitle: 'Onde vale a pena trocar hoje?',
    ctaBody:
      'O melhor preço muda todos os dias. Veja o comparador ao vivo com todas as casas, ou encontre a agência mais próxima no mapa.',
    ctaRates: 'Ver cotações ao vivo',
    ctaMap: 'Ver mapa de agências',
    ctaBranches: 'Ver todas as agências',
    noData: 'Sem dados',
    lowSample: 'amostra pequena',
    reviewsCaption: 'Avaliações públicas do Google em {date}',
    sortLabel: 'Ordenar por',
    sortReviews: 'Mais avaliadas',
    sortRating: 'Melhor nota',
    sortBestSell: 'Venda USD mais barata',
    sortBestBuy: 'Compra USD mais alta',
    sortSpread: 'Menor spread',
    sortName: 'Nome (A-Z)',
    deptFilterLabel: 'Departamento',
    categoryAll: 'Todas',
    detailsTitle: 'Casa por casa',
    strengthsLabel: 'Pontos fortes',
    weaknessesLabel: 'Pontos fracos',
    pressLabel: 'Na imprensa',
    servicesLabel: 'Serviços',
    foundedLabel: 'Fundada em',
    branchesLink: 'Agências',
    historyLink: 'Histórico',
    websiteLink: 'Site oficial',
    departmentsSuffix: 'deptos.',
    departmentsSuffixOne: 'depto.',
    ratesDisclaimer:
      'Cotações do dólar em espécie coletadas dos sites oficiais; “—” significa que a casa não publica cotação online neste momento.',
    bcuBadge: 'Habilitada pelo BCU',
  },
}

/** Localized content tree for the directory page; unknown locales fall back to es. */
export function getCasasContent(locale: string): CasasContent {
  return CONTENT[locale as 'es' | 'en' | 'pt'] ?? CONTENT.es
}
