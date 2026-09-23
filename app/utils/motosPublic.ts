// Espejo de las formas PÚBLICAS de `classes/motos/types.ts` (lo que el job `sync_motos.ts` escribe
// en la APP DB). Escrito a mano y no re-exportado: `app/` es otro `package.json`, otro build y otro
// deploy, y no puede importar de la raíz (AGENTS.md de la raíz). Es el mismo corte que ya existe
// entre `carsPublic.ts` (lo que publica el backend) y `cars.ts` (lo que el app hace con eso).
//
// **Este archivo se escribió contra el backend real, no contra el contrato que traía el encargo.**
// El encargo describía `motocatalog` como "una fila por modelo(-año) con banda"; el job publica una
// fila por AVISO (`PublicMotoListing`, igual que `carcatalog`) y las bandas por modelo van aparte,
// en `motomarketsnapshots`. Mirrorear el contrato del encargo habría dado una página que no lee
// una sola fila de las que el job escribe, sin fallar y sin avisar.
//
// Tres colecciones:
//   * `motocatalog`         → una fila por aviso vigente (`MotoPublicListing`).
//   * `motocatalogmetas`    → `{ key, generatedAt, meta }`; `key: "uy-motos"` lleva
//                             `MotoPublicCatalogMeta` adentro de `meta`.
//   * `motomarketsnapshots` → `{ key, generatedAt, snapshot }`; la `key` es el slug del modelo
//                             (`MotoPublicModel`) salvo la reservada `_informe`, que lleva el
//                             informe del mercado.
//
// `app/utils` es un namespace PLANO de auto-imports, así que TODO lo exportado lleva prefijo
// `moto`/`MOTO_` — la misma regla que `app/utils/movilidad.ts` escribe en su cabecera.

/** Las dos únicas monedas que publica Mercado Libre Uruguay. */
export type MotoPublicCurrency = 'USD' | 'UYU'

/** v1 lee sólo Mercado Libre. Es una unión y no un literal porque ahí entra la segunda fuente. */
export type MotoPublicSource = 'mercadolibre'

export type MotoPublicFuel = 'nafta' | 'electrica' | 'hibrida' | 'diesel'

/**
 * El eje por el que el backend parte las bandas. "combustion" y no "nafta" a propósito: lo que la
 * fila afirma es que esa banda no tiene ninguna moto eléctrica adentro, no que todas sean de nafta
 * (medido el 2026-09-22 en MLU1763: 1.172 nafta, 35 eléctricas, 2 híbridas, 1 diésel y 181 sin
 * combustible declarado).
 */
export type MotoPublicPropulsion = 'combustion' | 'electrica'

export type MotoPublicSellerType = 'dealer' | 'private'

/**
 * El tipo de moto, que es el equivalente de la carrocería en autos. Los valores son los de la
 * faceta `MOTO_TYPE` de Mercado Libre: no se inventa una taxonomía propia cuando el origen ya
 * publica la suya y es la que el vendedor eligió.
 */
export type MotoPublicType =
  | 'calle'
  | 'naked'
  | 'scooter'
  | 'doble-proposito'
  | 'deportiva'
  | 'custom'
  | 'chopper'
  | 'crucero'
  | 'cross'
  | 'enduro'
  | 'trial'
  | 'turismo'
  | 'mini'

/** De dónde salió el dato: la faceta aplicada del origen, o la palabra del título. Nunca se mezcla. */
export type MotoPublicEvidence = 'mercadolibre' | 'title'

/** Una fila pública de `motocatalog`: UN AVISO, no un modelo. */
export interface MotoPublicListing {
  key: string
  source: MotoPublicSource
  sourceName: string
  brand: string
  brandSlug: string
  model: string
  modelSlug: string
  /** `marca-modelo`: la cohorte de la ficha del modelo. */
  marketSlug: string
  /** `marca|modelo|cilindrada`: la identidad de producto. */
  productKey: string
  title: string
  year: number
  /** `null` cuando el kilometraje declarado es un relleno (1, 111.111…) o no está. */
  km: number | null
  price: number
  currency: MotoPublicCurrency
  /** El precio convertido por el job con la cotización de la corrida (`meta.usdUyu`). Es el único
   * campo comparable entre avisos en pesos y en dólares, y por eso el filtro de precio va sobre él
   * mientras que lo que se MUESTRA es siempre el precio en la moneda del aviso. */
  priceUsd: number
  priceConverted: boolean
  /** Moneda DEDUCIDA. En v1 nunca es `true` (ML la declara en cada tarjeta), pero viaja igual y la
   * página la marca: una moneda deducida no cuenta como declarada. */
  currencyInferred: boolean
  /** Centímetros cúbicos leídos del TÍTULO, o `null` si el título no los dice. Nunca inferida del
   * modelo: precisión sobre recall, la misma regla que celulares. */
  displacement: number | null
  displacementBasis: MotoPublicEvidence | null
  /**
   * El TRAMO de cilindrada, tal como lo declara la faceta del propio Mercado Libre.
   *
   * Existe porque el numero exacto casi nunca esta: lo escribe el titulo, y medido el 22/9/2026 lo
   * declaraban 2 de 73 avisos publicables. La faceta, en cambio, la tiene el origen para casi todos,
   * y la lee el barrido de la corrida COMPLETA. Sin este campo el filtro de cilindrada de la pagina
   * puede ofrecer cuatro tramos que no matchean casi nada, que es peor que no ofrecerlos.
   */
  displacementBand: MotoPublicDisplacementBandId | null
  displacementBandBasis: MotoPublicEvidence | null
  type: MotoPublicType | null
  typeBasis: MotoPublicEvidence | null
  fuel: MotoPublicFuel | null
  department: string | null
  neighborhood: string | null
  sellerType: MotoPublicSellerType | null
  picture: string | null
  pictureCount: number | null
  permalink: string
  firstSeen: string
  lastSeen: string
  priceDrop: { from: number; currency: MotoPublicCurrency; since: string } | null
  /** Lo que el propio VENDEDOR declara en el título (deuda, choque, papeles…). La cita es suya. */
  flags: string[]
}

/** Banda de precio de una cohorte. Descriptiva: es lo que se PIDE, no una tasación. En dólares,
 * porque es la única escala en la que los avisos en pesos y en dólares se pueden comparar. */
export interface MotoPublicBand {
  n: number
  sellers: number
  p25: number
  median: number
  p75: number
  kmMedian: number | null
}

export interface MotoPublicYearBand extends MotoPublicBand {
  year: number
}

/**
 * Los tres tramos que publica la faceta `ENGINE_DISPLACEMENT` de Mercado Libre. La taxonomia es del
 * origen, no nuestra: son los cortes con los que el vendedor clasifico su aviso.
 */
export type MotoPublicDisplacementBandId = 'hasta-125' | '126-250' | 'mas-250'

export interface MotoPublicDisplacementBand extends MotoPublicBand {
  displacement: number
}

/**
 * Una ficha de modelo, guardada en `motomarketsnapshots` bajo su propio `slug`.
 *
 * Una línea ELÉCTRICA del mismo fabricante es una ficha aparte (`yumbo-gs-electrica`) y no una
 * sección de la misma: si compartieran ficha, la banda de arriba tendría que promediar dos
 * mercados para existir, que es justo lo que no se hace.
 */
export interface MotoPublicModel {
  version: 1
  slug: string
  brand: string
  brandSlug: string
  model: string
  modelSlug: string
  generatedAt: string
  listings: number
  propulsion: MotoPublicPropulsion
  band: MotoPublicBand | null
  years: MotoPublicYearBand[]
  displacements: MotoPublicDisplacementBand[]
  /** Caída anual medida sobre el propio catálogo (la misma recta que el informe de autos), o
   * `null` si la curva no da: entonces la ficha DICE que no hay depreciación medida. */
  annualDrop: number | null
  types: Array<{ type: MotoPublicType; adverts: number }>
}

export interface MotoPublicSourceCoverage {
  source: MotoPublicSource
  name: string
  listings: number
  duplicates: number
  lastReadAt: string | null
  ok: boolean
}

/** Lo que va adentro de `meta` en el documento `key: "uy-motos"` de `motocatalogmetas`. */
export interface MotoPublicCatalogMeta {
  id: 'uy-motos'
  generatedAt: string
  freshDays: number
  /** Ninguna fuente declara haber leído TODO el mercado: el directorio nunca dice "completo". */
  sourceCoverage: 'partial'
  listings: number
  usdUyu: number
  lastFullReadAt: string | null
  lastReadAt: string | null
  reportedTotal: number | null
  /** Cuántos avisos no dicen su cilindrada. Se publica: la ausencia se declara, no se estima. */
  withoutDisplacement: number
  /** Avisos sin NINGUNA de las dos vías: ni cilindrada en el título ni tramo declarado por el
   * origen. Es el número que hay que mostrar al lado del filtro, porque es el que de verdad queda
   * afuera de todos los tramos. */
  withoutDisplacementBand: number
  models: Array<{ slug: string; brand: string; model: string; listings: number }>
  sources: MotoPublicSourceCoverage[]
}

/** El documento de `motocatalogmetas`. `meta` es `Mixed` del lado del backend y lleva la forma de
 * arriba sólo para `key: "uy-motos"`; las otras dos claves (`-harvest`, `-publish`) guardan la
 * cosecha y la negativa a publicar, y esta app no las lee. */
export interface MotoPublicCatalogMetaDoc {
  key: string
  generatedAt: string
  meta: MotoPublicCatalogMeta
}

/** El documento de `motomarketsnapshots`. `snapshot` es la ficha del modelo salvo en la `key`
 * reservada del informe. */
export interface MotoPublicModelDoc {
  key: string
  generatedAt: string
  snapshot: MotoPublicModel
}
