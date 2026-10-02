// Ropa por kilo y fardos en Uruguay — de dónde sale la ropa que se revende, cuánto deja un lote y
// por qué traer un fardo por courier no cierra.
//
// POR QUÉ ESTE ARCHIVO EXISTE. "Fardos de ropa americana" es un negocio que se vende en TikTok con
// cifras de Chile y Argentina, donde existe: Chile importó 118 mil toneladas de ropa usada en 2024 y
// Argentina pasó de 77 t a 4.600 t en un año cuando venció su prohibición. En Uruguay ese mercado
// casi no existe —el resto del mundo declara haberle mandado 428 t en 2024— y lo que acá se vende
// como "fardo" es otra cosa: un LOTE cerrado de N prendas (10 a 100), casi siempre nuevas o
// locales. La página tiene que decir eso primero, porque quien llega buscando "fardos" trae en la
// cabeza el precio por kilo chileno.
//
// LO QUE DESARMA. Tres creencias que circulan y no resisten la norma:
//   1. "Importar ropa usada está prohibido en Uruguay." No encontramos ninguna norma que lo prohíba:
//      la lista de prohibiciones de la DNA son todas de vehículos usados y autopartes, y la única
//      norma que nombra la 6309 (Decreto 432/012) es una FACILIDAD para donaciones. Lo que sí está
//      prohibido es VENDER ropa que entró sin pagar: Código Aduanero art. 212.
//   2. "Traé un fardo por courier, pagás el 60 % y listo." La prestación única admite fines
//      comerciales (Decreto 50/026 art. 2) pero topa en 20 kg y US$ 800, y el flete aéreo de un
//      casillero en Miami cuesta más de DOCE VECES lo que vale el kilo de ropa usada en origen.
//      `courierBale()` hace la cuenta con las tarifas de courier que el sitio ya tiene auditadas.
//   3. "Un fardo deja 300 %." Es lo que dicen los vendedores de fardos en Argentina. Lo que sí está
//      medido es cuánto se tira: en Kantamanto (Ghana) el 40 % de la ropa sale del mercado como
//      residuo. `lotEconomics()` pide el porcentaje vendible como dato y no lo esconde.
//
// LA REGLA DE LAS CIFRAS. Cada número tiene fuente y fecha en `ROPA_SOURCES`. Lo que no se pudo
// verificar —el canon de un puesto en Tristán Narvaja, el margen neto de un feriante, el % de
// "primera" dentro de un fardo— va en `ROPA_UNPUBLISHED` en vez de estimarse.

import {
  estimatePrestacionUnica,
  POSTAL_MAX_INVOICE_USD,
  POSTAL_MAX_WEIGHT_KG,
} from './commercialImport'
import { courierParcelQuote, ESTIMATOR_COURIERS, type Courier } from './courierShipping'
import type { FaqItem } from './faqAnswers'

/** Fecha en la que se contrastó este archivo contra las fuentes. */
export const ROPA_KILO_VERIFIED_AT = '2026-10-02'

export interface RopaSource {
  readonly label: string
  readonly url: string
}

export const ROPA_SOURCES = {
  oecBaci: {
    label: 'OEC / CEPII BACI — comercio mundial de ropa usada (HS 6309), 2022–2024',
    url: 'https://oec.world/en/profile/hs/used-clothing',
  },
  witsUy2024: {
    label: 'WITS (Banco Mundial) / UN Comtrade — importaciones de Uruguay en la partida 6309, 2024',
    url: 'https://wits.worldbank.org/trade/comtrade/en/country/URY/year/2024/tradeflow/Imports/partner/ALL/product/630900',
  },
  dnaProhibiciones: {
    label: 'DNA — Prohibición de importación (listado de decretos)',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/5626/3/innova.front/prohibicion-de-importacion.html',
  },
  decreto432: {
    label: 'Decreto N.º 432/012 — donaciones de prendas usadas (partida 6309.00.10.00)',
    url: 'https://www.impo.com.uy/bases/decretos/432-2012',
  },
  decreto8: {
    label:
      'Decreto N.º 8/022 — solicitud de importación de textiles ante la DNI (capítulos 61 y 62)',
    url: 'https://www.impo.com.uy/bases/decretos/8-2022',
  },
  licenciaTextil: {
    label: 'gub.uy — Licencia de importación de textiles (trámite de la DNI)',
    url: 'https://www.gub.uy/tramites/licencia-importacion-textiles',
  },
  decreto50art2: {
    label: 'Decreto N.º 50/026, art. 2 — prestación única del 60 % (personas físicas o jurídicas)',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/2',
  },
  decreto50art3: {
    label: 'Decreto N.º 50/026, art. 3 — franquicia: uso personal y sin fines comerciales',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/3',
  },
  decreto50art7: {
    label:
      'Decreto N.º 50/026, art. 7 — no aplica a mercadería que requiere autorización y no la tiene',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/7',
  },
  dnaPrestacionUnica: {
    label: 'DNA — Prestación única: «Con o sin fines comerciales»',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28222/1/innova.front/',
  },
  dnaDua: {
    label: 'DNA — Régimen general: personas físicas hasta dos DUA por año',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28223/1/innova.front/',
  },
  codigoAduanero: {
    label: 'Código Aduanero (Ley N.º 19.276), arts. 209 a 212 — contrabando',
    url: 'https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/212',
  },
  omcAranceles: {
    label: 'OMC — Perfil arancelario de Uruguay (prendas de vestir: NMF aplicado, máximo 20 %)',
    url: 'https://www.wto.org/english/res_e/statis_e/daily_update_e/tariff_profiles/UY_S.pdf',
  },
  tasaConsular: {
    label: 'Ley N.º 19.535, art. 265 — tasa consular 5 % (3 % con ACE 18)',
    url: 'https://impo.com.uy/bases/leyes-originales/19535-2017/265',
  },
  digestoIm: {
    label: 'Digesto de Montevideo, arts. D.1887 y D.1888 — qué pueden vender los periferiantes',
    url: 'https://normativa.montevideo.gub.uy/armado/69071',
  },
  feriaMunicipioG: {
    label: 'Municipio G — Reglamento Feria Especial Fin de Año 2025-2026 (sticker de $ 768)',
    url: 'https://municipiog.montevideo.gub.uy/sites/municipiog/files/Reglamento%202025-2026_1.pdf',
  },
  ley18083: {
    label: 'Ley N.º 18.083, art. 71 — quién puede ser monotributista',
    url: 'https://www.impo.com.uy/bases/leyes/18083-2006/71',
  },
  bpsMonotributo: {
    label: 'BPS — Monotributo Ley 19.942, cuotas vigentes desde enero 2026',
    url: 'https://www.bps.gub.uy/18051/monotributo-ley-19942.html',
  },
  mlCostos: {
    label: 'Mercado Libre Uruguay — Costos de vender (ayuda 870)',
    url: 'https://www.mercadolibre.com.uy/ayuda/870',
  },
  mlLotes: {
    label: 'Mercado Libre Uruguay — búsqueda «lote ropa usada» (leída el 2/10/2026)',
    url: 'https://listado.mercadolibre.com.uy/lote-ropa-usada',
  },
  eraMioComision: {
    label: 'Era Mío — Cómo vender (comisión del 48 % más IVA)',
    url: 'https://eramio.com.uy/c/como-vender',
  },
  eraMioKilo: {
    label: 'Era Mío — venta por kilo en Malvín, 21 al 23 de agosto de 2026 (TikTok oficial)',
    url: 'https://www.tiktok.com/@eramio_uy/video/7676261333012122901',
  },
  vopero: {
    label: 'Vopero — Comisiones de venta (centro de ayuda, actualizado el 22/8/2025)',
    url: 'https://ayuda.vopero.uy/es/cuales-son-las-comisiones-de-venta-ryKntWCOo',
  },
  natasha: {
    label: 'Natasha Mayorista — fábrica y venta por mayor, Porongos 2459 (Reus)',
    url: 'https://natashamayorista.com.uy/',
  },
  rpmm: {
    label: 'Ropa por Mayor Montevideo — Domingo Aramburú 1701',
    url: 'https://www.ropapormayormontevideo.com.uy/',
  },
  ortBarrio: {
    label: 'Universidad ORT — Qué es el Barrio de los Judíos',
    url: 'https://fd.ort.edu.uy/blog/que-es-el-barrio-de-los-judios',
  },
  redditFardos: {
    label: 'r/uruguay — «¿Dónde compro fardos de ropa?» (19/9/2023)',
    url: 'https://www.reddit.com/r/uruguay/comments/16mdaua/',
  },
  redditPiedrasBlancas: {
    label: 'r/uruguay — dónde compran los revendedores (4/7/2026)',
    url: 'https://www.reddit.com/r/uruguay/comments/1unkcjh/',
  },
  municipioD: {
    label: 'Municipio D — Feria de Piedras Blancas (jueves y domingos)',
    url: 'https://municipiod.montevideo.gub.uy/node/188',
  },
  oslomet: {
    label: 'OsloMet (Clothing Research) — Carta de viaje desde Uruguay, diciembre de 2022',
    url: 'https://clothingresearch.oslomet.no/2022/12/21/travel-letter-uruguay-december-2022/',
  },
  observadorSecondHand: {
    label:
      'El Observador — Lo que se puede ganar vendiendo ropa en tiendas second hand (29/1/2023)',
    url: 'https://www.elobservador.com.uy/nota/entre-1-000-y-20-000-por-mes-lo-que-se-puede-ganar-vendiendo-ropa-en-tiendas-second-hand-2023129105218',
  },
  observadorContrabando: {
    label: 'El Observador — Red que traía ropa de La Salada y Avellaneda por Paysandú (23/3/2019)',
    url: 'https://www.elobservador.com.uy/nota/traian-ropa-de-contrabando-de-ferias-de-avellaneda-y-la-salada-y-van-a-la-carcel-201932318443',
  },
  subrayadoRioBranco: {
    label: 'Subrayado — Operativo de contrabando en Río Branco, $U 10,9 millones (4/9/2026)',
    url: 'https://www.subrayado.com.uy/incautaron-pantuflas-camperas-y-championes-operativo-contrabando-la-mercaderia-esta-valuada-10-millones-n1017299',
  },
  dnaFrayBentos: {
    label: 'DNA — Más de 700 prendas incautadas en Fray Bentos (29/12/2025)',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28163/9/innova.front/mas-de-700-prendas-de-vestir-y-accesorios-incautados-en-fray-bentos.html',
  },
  dnaFardos2006: {
    label: 'DNA — Fardos con miles de prendas usadas sin documentación (2006, PDF)',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/2838/1/noticia-20060201.pdf',
  },
  laTercera: {
    label:
      'La Tercera — Las exportaciones de ropa usada desde Iquique que inundan el mercado argentino (21/2/2026)',
    url: 'https://www.latercera.com/pulso/noticia/las-exportaciones-de-ropa-usada-desde-iquique-que-inundan-el-mercado-argentino/',
  },
  todoJujuy: {
    label: 'TodoJujuy — Ropa usada, frontera y crisis textil (6/4/2026)',
    url: 'https://www.todojujuy.com/jujuy/ropa-usada-frontera-y-crisis-textil-que-hay-detras-del-fenomeno-que-tiene-jujuy-como-principal-puerta-entrada-n288317',
  },
  c5n: {
    label: 'C5N — Ropa usada importada en 2025, datos de la CIAI (18/12/2025)',
    url: 'https://www.c5n.com/economia/ropa-usada-importada-2025-ya-ingresaron-casi-200-camiones-y-alertan-impacto-sanitario-ambiental-y-productivo-n224266',
  },
  diarioUno: {
    label:
      'Diario Uno (Mendoza) — Emprendimiento que vende ropa por kilo traída de EE.UU. (16/1/2026)',
    url: 'https://www.diariouno.com.ar/sociedad/en-maipu-un-novedoso-emprendimiento-vende-kilo-ropa-traida-estados-unidos-n1518056',
  },
  bbcAtacama: {
    label:
      'BBC News Brasil (vía Correio Braziliense) — La ropa usada que termina en el desierto chileno (25/4/2026)',
    url: 'https://www.correiobraziliense.com.br/mundo/2026/04/7406129-como-suas-roupas-velhas-podem-ir-parar-neste-deserto-no-chile.html',
  },
  orFoundation: {
    label: 'The Or Foundation (Liz Ricketts) — carta abierta sobre Kantamanto, Ghana (30/1/2021)',
    url: 'https://atmos.earth/fashion-and-design/fashion-clothing-waste-letter-ghana/',
  },
  changingMarkets: {
    label:
      'Changing Markets Foundation, «Trashion» — informe sobre Kenia (vía FashionUnited, 16/2/2023)',
    url: 'https://fashionunited.uk/news/business/donated-clothing-worsening-kenya-s-plastic-pollution-report/2023021667934',
  },
  wrapWales: {
    label: 'WRAP — Composition of Textiles in Wales (15/12/2022)',
    url: 'https://www.wrap.ngo/resources/report/composition-textiles-wales',
  },
  smart: {
    label: 'Connecticut DEEP — Textiles Reuse & Recycling (cifras de SMART)',
    url: 'https://portal.ct.gov/DEEP/Reduce-Reuse-Recycle/Textiles-Reuse--Recycling',
  },
  thredup: {
    label: 'Retail Dive — ThredUp Resale Report 2025 (21/3/2025)',
    url: 'https://www.retaildive.com/news/thredup-2025-resale-report-tariffs-fast-fashion/743095/',
  },
  onu: {
    label: 'Noticias ONU — Día Internacional de Cero Desechos y la moda (27/3/2025)',
    url: 'https://news.un.org/en/story/2025/03/1161636',
  },
} as const satisfies Record<string, RopaSource>

export type RopaSourceId = keyof typeof ROPA_SOURCES

// ---------------------------------------------------------------------------------------------
// Estadísticas (BACI vía la API de OEC, leída el 2026-10-02)
// ---------------------------------------------------------------------------------------------

/** Una fila de comercio: valor en dólares y peso en toneladas. US$/kg se DERIVA, no se escribe. */
export interface TradeRow {
  readonly label: string
  readonly valueUsd: number
  readonly tonnes: number
}

/** US$ por kilo implícito de una fila: valor / (toneladas × 1000). */
export function usdPerKg(row: Pick<TradeRow, 'valueUsd' | 'tonnes'>): number | null {
  if (!(row.tonnes > 0) || !(row.valueUsd >= 0)) return null
  return row.valueUsd / (row.tonnes * 1000)
}

/** Comercio mundial de la partida 6309 por año (BACI). */
export const WORLD_BY_YEAR: readonly TradeRow[] = Object.freeze([
  { label: '2022', valueUsd: 5_497_919_252, tonnes: 5_359_273 },
  { label: '2023', valueUsd: 5_520_011_231, tonnes: 5_489_338 },
  { label: '2024', valueUsd: 5_034_821_296, tonnes: 5_512_332 },
])

/** Los cinco mayores exportadores de 2024 (BACI). */
export const TOP_EXPORTERS_2024: readonly TradeRow[] = Object.freeze([
  { label: 'Estados Unidos', valueUsd: 886_900_000, tonnes: 725_669 },
  { label: 'China', valueUsd: 675_300_000, tonnes: 887_475 },
  { label: 'Reino Unido', valueUsd: 534_200_000, tonnes: 417_933 },
  { label: 'Alemania', valueUsd: 319_200_000, tonnes: 456_821 },
  { label: 'Corea del Sur', valueUsd: 268_500_000, tonnes: 265_644 },
])

/**
 * La región en 2024 (BACI, lo que los socios declaran haber mandado). Argentina 2024 es el año
 * ANTERIOR al salto: en 2025 importó 4,6 millones de kilos (TodoJujuy, con datos oficiales).
 */
export const REGION_2024: readonly TradeRow[] = Object.freeze([
  { label: 'Chile', valueUsd: 125_847_393, tonnes: 118_084 },
  { label: 'Uruguay', valueUsd: 733_090, tonnes: 428 },
  { label: 'Argentina', valueUsd: 213_802, tonnes: 78 },
])

/**
 * Uruguay, dos fuentes que miden cosas distintas.
 *
 * BACI reconcilia lo que declara el país que exporta con lo que declara el que importa; UN
 * Comtrade/WITS publica lo que Uruguay DECLARA haber importado. La diferencia es de un factor de
 * tres en peso y de nueve en valor, y no la resolvemos: puede ser mercadería en tránsito,
 * clasificación distinta en origen (BACI atribuye a Camboya 280 t, que huele a ropa nueva
 * declarada como usada) o zona franca. Se publican las dos, cada una con su nombre.
 */
export const URUGUAY_IMPORTS: Readonly<{
  baci: readonly TradeRow[]
  declared2024: TradeRow
}> = Object.freeze({
  baci: Object.freeze([
    { label: '2022', valueUsd: 2_382_039, tonnes: 1_034 },
    { label: '2023', valueUsd: 586_422, tonnes: 490 },
    { label: '2024', valueUsd: 733_090, tonnes: 428 },
  ]),
  declared2024: { label: '2024 (declarado por Uruguay)', valueUsd: 83_200, tonnes: 128.7 },
})

/** Precio medio de exportación de EE.UU. en 2024, US$/kg: el ancla de "cuánto vale el kilo". */
export const US_EXPORT_USD_PER_KG_2024 = usdPerKg(TOP_EXPORTERS_2024[0]!)!

// ---------------------------------------------------------------------------------------------
// Dónde se abastece quien revende en Uruguay
// ---------------------------------------------------------------------------------------------

export type GarmentCondition = 'usada' | 'nueva'

/** Un lote real, con precio publicado. El costo por prenda se DERIVA. */
export interface LocalLot {
  readonly id: string
  readonly label: string
  readonly condition: GarmentCondition
  readonly priceUyu: number
  readonly garments: number
  /** Dónde y qué es, en una línea. */
  readonly detail: string
  readonly source: RopaSourceId
  /** Fecha en que se leyó el precio. */
  readonly seenOn: string
}

export const LOCAL_LOTS: readonly LocalLot[] = Object.freeze([
  {
    id: 'ml-100-usadas',
    label: 'Lote de 100 prendas usadas',
    condition: 'usada',
    priceUyu: 12_000,
    garments: 100,
    detail: 'Publicado en Mercado Libre Uruguay como lote para revender. No se elige qué viene.',
    source: 'mlLotes',
    seenOn: '2026-10-02',
  },
  {
    id: 'ml-24-usadas',
    label: 'Lote de 24 prendas usadas',
    condition: 'usada',
    priceUyu: 5_000,
    garments: 24,
    detail:
      'Mercado Libre Uruguay. Lote más chico y más seleccionado: el costo por prenda casi se duplica.',
    source: 'mlLotes',
    seenOn: '2026-10-02',
  },
  {
    id: 'ml-10-jeans',
    label: 'Lote de 10 jeans',
    condition: 'usada',
    priceUyu: 1_750,
    garments: 10,
    detail: 'Mercado Libre Uruguay, ofrecido como «ideal tienda revendedor».',
    source: 'mlLotes',
    seenOn: '2026-10-02',
  },
  {
    id: 'era-mio-5kg',
    label: '5 kg en una venta por kilo',
    condition: 'usada',
    // $ 590 por kilo llevando 5 kg o más; se cuentan 4 prendas por kilo (ver GARMENTS_PER_KG).
    priceUyu: 5 * 590,
    garments: 5 * 4,
    detail:
      'Era Mío, Malvín: $ 790 el kilo, $ 690 desde 3 kg y $ 590 desde 5 kg. Es venta al público, en promoción de fin de semana.',
    source: 'eraMioKilo',
    seenOn: '2026-08-20',
  },
  {
    id: 'natasha-6-basicas',
    label: '6 remeras básicas nuevas',
    condition: 'nueva',
    priceUyu: 6 * 190,
    garments: 6,
    detail: 'Natasha Mayorista (Reus): fabricación propia, pedido mínimo de 6 prendas surtidas.',
    source: 'natasha',
    seenOn: '2026-10-02',
  },
])

/** Costo por prenda de un lote. */
export function perGarmentUyu(lot: Pick<LocalLot, 'priceUyu' | 'garments'>): number {
  return lot.garments > 0 ? lot.priceUyu / lot.garments : 0
}

/**
 * Prendas por kilo de referencia. Diario Uno (Mendoza, 16/1/2026), sobre ropa traída de EE.UU.:
 * «entre 5 y 6 remeras, 3 o 4 pantalones […] y 4 vestidos» por kilo. Se toma 4 como mezcla; un
 * fardo de abrigos o de jeans rinde bastante menos.
 */
export const GARMENTS_PER_KG = 4

// ---------------------------------------------------------------------------------------------
// Canales de venta y lo que se quedan
// ---------------------------------------------------------------------------------------------

export type ChannelId = 'feria' | 'mercadolibre' | 'consignacion'

/**
 * Mercado Libre Uruguay cobra «entre 11,5 % y 17 %, según la categoría del producto» más un cargo
 * fijo por unidad por debajo de $ 1.000. La tasa exacta de Ropa está detrás del login, así que se
 * toma el TOPE: subestimar el costo es el error caro.
 */
export const ML_COMMISSION_MAX_PCT = 17
export const ML_COMMISSION_MIN_PCT = 11.5
export const ML_FIXED_FEE_BANDS: readonly { readonly belowUyu: number; readonly feeUyu: number }[] =
  Object.freeze([
    { belowUyu: 500, feeUyu: 15 },
    { belowUyu: 750, feeUyu: 25 },
    { belowUyu: 1000, feeUyu: 40 },
  ])

/** Cargo fijo de Mercado Libre para una unidad de ese precio. */
export function mlFixedFeeUyu(priceUyu: number): number {
  for (const band of ML_FIXED_FEE_BANDS) if (priceUyu < band.belowUyu) return band.feeUyu
  return 0
}

/** Era Mío: «la comisión de ERA MIO es de un 48% más IVA». IVA básico 22 %. */
export const CONSIGNMENT_COMMISSION_PCT = 48
export const CONSIGNMENT_IVA_PCT = 22
/** Lo que le queda a quien deja la prenda, en % del precio de venta. */
export const CONSIGNMENT_KEEP_PCT =
  100 - CONSIGNMENT_COMMISSION_PCT * (1 + CONSIGNMENT_IVA_PCT / 100)

/** Lo que el canal se queda de UNA prenda vendida a ese precio. */
export function channelFeeUyu(channel: ChannelId, priceUyu: number): number {
  const price = Math.max(priceUyu || 0, 0)
  if (channel === 'mercadolibre') {
    return (price * ML_COMMISSION_MAX_PCT) / 100 + (price > 0 ? mlFixedFeeUyu(price) : 0)
  }
  if (channel === 'consignacion') return (price * (100 - CONSIGNMENT_KEEP_PCT)) / 100
  return 0
}

/**
 * Vopero (ejemplos oficiales): la consignación se queda MÁS cuanto más barata es la prenda. Para la
 * ropa de lote —que se vende en $ 200— es el canal que peor paga.
 */
export const VOPERO_EXAMPLES: readonly {
  readonly saleUyu: number
  readonly sellerGetsUyu: number
}[] = Object.freeze([
  { saleUyu: 250, sellerGetsUyu: 50 },
  { saleUyu: 500, sellerGetsUyu: 150 },
  { saleUyu: 800, sellerGetsUyu: 340 },
  { saleUyu: 2500, sellerGetsUyu: 1275 },
])

// ---------------------------------------------------------------------------------------------
// Cuánto vendible trae un lote
// ---------------------------------------------------------------------------------------------

/**
 * Lo que está medido sobre cuánto de la ropa usada NO se puede vender. Ninguna mide un "fardo de
 * primera" uruguayo —ese dato no existe—: miden ropa recolectada o mercados de fardos importados.
 * Sirven para poner el rango, no para fijar el número de nadie.
 */
export const UNSELLABLE_EVIDENCE: readonly {
  readonly where: string
  readonly finding: string
  readonly source: RopaSourceId
}[] = Object.freeze([
  {
    where: 'Kantamanto (Accra, Ghana), el mayor mercado de fardos del mundo',
    finding:
      'El 40 % de la ropa sale del mercado como residuo, y sólo el 20 % de los minoristas gana plata con el fardo promedio.',
    source: 'orFoundation',
  },
  {
    where: 'Kenia',
    finding:
      'Entre el 20 % y el 50 % de la ropa donada no tiene calidad para venderse en el mercado local.',
    source: 'changingMarkets',
  },
  {
    where: 'Gales (Reino Unido), ropa recolectada sin clasificar',
    finding:
      'Entre 54,6 % (recolección en vereda) y 75,3 % (contenedores) es de calidad reutilizable.',
    source: 'wrapWales',
  },
  {
    where: 'Estados Unidos, recicladores textiles (SMART)',
    finding:
      'El 45 % de lo recolectado se vende como ropa usada; el 30 % se vuelve trapo y el 20 % fibra.',
    source: 'smart',
  },
])

/** El porcentaje vendible por defecto: el de Kantamanto, que es el único medido sobre fardos. */
export const DEFAULT_SELLABLE_PCT = 60

// ---------------------------------------------------------------------------------------------
// La cuenta de un lote
// ---------------------------------------------------------------------------------------------

export interface LotInput {
  /** Lo que se paga por el lote, en pesos. */
  lotCostUyu: number
  garments: number
  /** % de las prendas que se terminan vendiendo, 0–100. */
  sellablePct: number
  /** Precio promedio al que se vende cada prenda. */
  avgPriceUyu: number
  channel: ChannelId
  /** Puesto, traslado, bolsas, la cuota del monotributo prorrateada: todo lo que no es el lote. */
  otherCostsUyu: number
}

export interface LotResult {
  sold: number
  revenueUyu: number
  feesUyu: number
  /** Lo que queda después del lote, el canal y los otros costos. Puede ser negativo. */
  profitUyu: number
  /** Ganancia sobre lo vendido, en %. `null` sin ventas. */
  marginPct: number | null
  /** Ganancia sobre lo invertido (lote + otros costos), en %. `null` sin inversión. */
  returnPct: number | null
  costPerGarmentUyu: number
  /** Lo que termina costando cada prenda VENDIDA: las que no se venden las pagan las otras. */
  costPerSoldUyu: number | null
  /** Prendas a vender, a ese precio, para recuperar lote + otros costos. `null` si nunca se llega. */
  breakEvenUnits: number | null
  /** El precio promedio mínimo con el que lo vendible recupera la inversión. `null` sin ventas. */
  breakEvenPriceUyu: number | null
}

const clampPct = (pct: number) => Math.min(Math.max(Number.isFinite(pct) ? pct : 0, 0), 100)
const nonNeg = (n: number) => (Number.isFinite(n) ? Math.max(n, 0) : 0)

/**
 * El precio mínimo por prenda para que `units` prendas dejen `target` pesos netos del canal.
 *
 * En la feria es una división. En Mercado Libre no: el cargo fijo salta por tramos de precio, así
 * que se despeja tramo por tramo, de abajo hacia arriba, y el primer precio que cae dentro de su
 * propio tramo es el mínimo (al cruzar un tramo el neto BAJA, así que un tramo que no alcanza nunca
 * deja un hueco que el siguiente no cubra).
 */
export function minPriceFor(channel: ChannelId, units: number, targetUyu: number): number | null {
  if (!(units > 0)) return null
  const perUnit = nonNeg(targetUyu) / units
  if (channel === 'feria') return perUnit
  if (channel === 'consignacion') return perUnit / (CONSIGNMENT_KEEP_PCT / 100)
  const keep = 1 - ML_COMMISSION_MAX_PCT / 100
  let floor = 0
  for (const band of ML_FIXED_FEE_BANDS) {
    const price = (perUnit + band.feeUyu) / keep
    if (price >= floor && price < band.belowUyu) return price
    floor = band.belowUyu
  }
  return Math.max(perUnit / keep, floor)
}

export function lotEconomics(input: LotInput): LotResult {
  const garments = Math.floor(nonNeg(input.garments))
  const lotCost = nonNeg(input.lotCostUyu)
  const other = nonNeg(input.otherCostsUyu)
  const price = nonNeg(input.avgPriceUyu)
  const sold = Math.floor((garments * clampPct(input.sellablePct)) / 100)

  const revenue = sold * price
  const feePerUnit = channelFeeUyu(input.channel, price)
  const fees = sold * feePerUnit
  const invested = lotCost + other
  const profit = revenue - fees - invested
  const netPerUnit = price - feePerUnit

  const breakEvenUnits =
    invested === 0 ? 0 : netPerUnit > 0 ? Math.ceil(invested / netPerUnit - 1e-9) : null

  return {
    sold,
    revenueUyu: revenue,
    feesUyu: fees,
    profitUyu: profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : null,
    returnPct: invested > 0 ? (profit / invested) * 100 : null,
    costPerGarmentUyu: garments > 0 ? lotCost / garments : 0,
    costPerSoldUyu: sold > 0 ? lotCost / sold : null,
    breakEvenUnits,
    breakEvenPriceUyu: minPriceFor(input.channel, sold, invested),
  }
}

// ---------------------------------------------------------------------------------------------
// Traer un fardo por courier
// ---------------------------------------------------------------------------------------------

export interface CourierBaleInput {
  kg: number
  /** Precio de la ropa en origen, US$ por kilo. */
  goodsUsdPerKg: number
  courier: Courier
  /** Pesos por dólar. */
  usdUyu: number
}

export interface CourierBaleResult {
  kg: number
  goodsUsd: number
  freightUsd: number
  taxUsd: number
  totalUsd: number
  perKgUsd: number
  perKgUyu: number
  /** Qué parte del total es flete: el número que define si cierra o no. */
  freightSharePct: number
  /** `false` si el courier publica un cargo condicional: el flete es un piso, no un precio. */
  freightComplete: boolean
  /** Pasa los 20 kg por envío de la prestación única. */
  overWeight: boolean
  /** Pasa los US$ 800 de factura por envío. */
  overValue: boolean
}

/**
 * Un fardo por casillero en Miami, bajo la prestación única del 60 %.
 *
 * El flete sale de `courierParcelQuote`, la misma cuenta del carrito de importación, con el recargo
 * postal y lo que dice la nota de cada courier. El tributo es el 60 % del valor de factura con el
 * mínimo de US$ 20 por envío. `null` si el courier no publica tarifa por kilo.
 */
export function courierBale(input: CourierBaleInput): CourierBaleResult | null {
  const kg = nonNeg(input.kg)
  const quote = courierParcelQuote(input.courier, kg)
  if (!quote || kg === 0) return null
  const goodsUsd = kg * nonNeg(input.goodsUsdPerKg)
  const taxUsd = estimatePrestacionUnica(goodsUsd).chargesUsd
  const totalUsd = goodsUsd + quote.totalUsd + taxUsd
  const perKgUsd = totalUsd / kg
  return {
    kg,
    goodsUsd,
    freightUsd: quote.totalUsd,
    taxUsd,
    totalUsd,
    perKgUsd,
    perKgUyu: perKgUsd * nonNeg(input.usdUyu),
    freightSharePct: totalUsd > 0 ? (quote.totalUsd / totalUsd) * 100 : 0,
    freightComplete: quote.complete,
    overWeight: kg > POSTAL_MAX_WEIGHT_KG,
    overValue: goodsUsd > POSTAL_MAX_INVOICE_USD,
  }
}

/**
 * El courier más barato para `kg` entre los que publican tarifa por kilo y no tienen cargos
 * condicionales. Es el caso MÁS favorable al fardo: si con éste no cierra, con ninguno cierra.
 */
export function cheapestCourierFor(kg: number): Courier | null {
  let best: { courier: Courier; total: number } | null = null
  for (const courier of ESTIMATOR_COURIERS) {
    const quote = courierParcelQuote(courier, kg)
    if (!quote || !quote.complete) continue
    if (!best || quote.totalUsd < best.total) best = { courier, total: quote.totalUsd }
  }
  return best?.courier ?? null
}

/**
 * Cotización de respaldo si la API del sitio no contesta: el tipo de cambio de mercado del día en
 * que se verificó la página (open.er-api.com, 2026-10-02). La página usa el vivo cuando lo tiene.
 */
export const FALLBACK_USD_UYU = 40.31

// ---------------------------------------------------------------------------------------------
// Lo que no publicamos
// ---------------------------------------------------------------------------------------------

export const ROPA_UNPUBLISHED: readonly string[] = Object.freeze([
  'El margen neto de un feriante. No hay ninguna medición publicada en Uruguay, y las cifras de «300 % de ganancia» que circulan son de vendedores de fardos en Argentina hablando de su propio producto.',
  'El costo de un puesto en Tristán Narvaja o en Piedras Blancas. La Intendencia cobra derechos por metro que fija por resolución y no encontramos una tarifa vigente publicada; el único importe oficial que hallamos es el sticker de $ 768 de una feria especial de fin de año.',
  'Qué porcentaje de un fardo es «primera», «segunda» o descarte. Los vendedores chilenos usan esas categorías, pero ninguna fuente seria mide su composición.',
  'El costo de traer un contenedor por barco. Es la vía de los importadores de verdad, pero el flete marítimo, el despachante y el depósito cambian con cada operación y no hay una tarifa pública que se pueda usar de ejemplo.',
  'Si la DNA saca la ropa NUEVA de la prestación única cuando no tiene la licencia textil. El art. 7 del Decreto 50/026 lo habilita, pero no encontramos cómo lo aplica en la práctica: preguntalo antes de comprar.',
])

// ---------------------------------------------------------------------------------------------
// Preguntas frecuentes (el texto visible y el del FAQPage salen de acá)
// ---------------------------------------------------------------------------------------------

export const ROPA_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'ropa-usada-prohibida',
    question: '¿Está prohibido importar ropa usada a Uruguay?',
    answer:
      'No encontramos ninguna norma que lo prohíba. La lista de prohibiciones de importación de la Dirección Nacional de Aduanas son todas de vehículos usados y autopartes, y la única norma que nombra la partida de la ropa usada (6309) es el Decreto 432/012, que facilita las donaciones a organismos públicos. La ropa usada tampoco está en el anexo de la licencia textil del Decreto 8/022. Lo que sí es infracción es vender ropa que entró sin pagar tributos: el art. 212 del Código Aduanero castiga como contrabando a quien la tiene para comercializarla sin comprobante.',
  },
  {
    id: 'donde-compran-feriantes',
    question: '¿Dónde compran la ropa los feriantes en Montevideo?',
    answer:
      'En los mayoristas del Barrio de los Judíos (Villa Muñoz), donde también se abastecen comerciantes del interior; en la propia feria de Piedras Blancas, donde compran los revendedores; en lotes cerrados de 10 a 100 prendas que se publican en Mercado Libre y redes; y en tiendas de segunda mano que venden por kilo. No encontramos en Uruguay un mercado de fardos importados de ropa usada como el de Chile o Argentina.',
  },
  {
    id: 'fardo-por-courier',
    question: '¿Conviene traer un fardo de ropa usada por courier?',
    answer:
      'Casi nunca. La prestación única del 60 % admite fines comerciales, pero topa en 20 kg y US$ 800 por envío, y el flete aéreo desde Miami cuesta entre 15 y 24 dólares el kilo. Con el kilo de ropa usada a US$ 1,22 —el precio medio al que exportó Estados Unidos en 2024—, el flete es casi el 90 % del costo y el kilo puesto en Uruguay sale más caro que lo que una tienda de segunda mano de Montevideo le cobra al público por kilo cuando se llevan 5 kg.',
  },
  {
    id: 'cuanto-se-gana',
    question: '¿Cuánto se gana vendiendo ropa por kilo o en fardos?',
    answer:
      'Depende sobre todo de cuántas prendas del lote se terminan vendiendo, y ése es el dato que los vendedores de fardos no publican. En Kantamanto, el mayor mercado de fardos del mundo, el 40 % de la ropa sale como residuo y sólo uno de cada cinco minoristas gana plata con el fardo promedio. Un lote de 100 prendas a $ 12.000 vendido al 60 % a $ 250 la prenda deja $ 3.000 antes del puesto y el traslado; a $ 200 la prenda, no deja nada.',
  },
  {
    id: 'feriante-monotributo',
    question: '¿Un feriante puede ser monotributista?',
    answer:
      'Sí, si cumple las condiciones del art. 71 de la Ley 18.083: actividad de dimensión económica reducida, no más de un puesto o un pequeño local, y ventas exclusivamente a consumidores finales. Ojo con dos cosas: el monotributo no reemplaza los tributos que se pagan al importar, y en Montevideo la venta de artículos usados en la vía pública sólo está permitida en zonas preestablecidas (Digesto, art. D.1888).',
  },
])
