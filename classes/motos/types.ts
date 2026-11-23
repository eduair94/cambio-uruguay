// Formas internas del directorio de motos usadas (`/motos-usadas-uruguay`). Lo que se publica se
// arma campo por campo en ./project.ts; nada de acá sale tal cual.
//
// La dimensión que autos no tiene es la CILINDRADA, y es la que decide qué se compara con qué: una
// Yumbo 125 y una Yumbo 200 no son la misma moto ni el mismo precio. Sale del título con una
// expresión explícita (./identify.ts) y si no está queda en `null` — precisión sobre recall, la
// misma regla que celulares.

import type { CarRisk } from "../autos/risk";
import type { MotoDisplacementBasis } from "./displacement";

/** Las únicas dos monedas que publica Mercado Libre Uruguay. */
export type MotoCurrency = "USD" | "UYU";

/**
 * Las fuentes del directorio. v1 lee sólo Mercado Libre; el tipo es una unión (y no el string
 * `"mercadolibre"`) porque la precedencia de `dedupeMotos` y la tabla de `MOTO_SOURCES` son el
 * lugar donde entra la segunda, y así agregarla es una línea y no un refactor.
 */
export type MotoSource = "mercadolibre" | "facebook";

/** Nafta salvo prueba en contrario. La eléctrica NUNCA se promedia con las de nafta (ver ./catalog.ts). */
export type MotoFuel = "nafta" | "electrica" | "hibrida" | "diesel";

export type MotoSellerType = "dealer" | "private";

/**
 * El eje por el que se parten las bandas. "combustion" y no "nafta" a propósito: lo que la fila
 * afirma es que ESA banda no tiene ninguna moto eléctrica adentro, no que todas sean de nafta
 * (medido el 2026-09-22 en MLU1763: 1.172 nafta, 35 eléctricas, 2 híbridas, 1 diésel y 181 sin
 * combustible declarado).
 */
export type MotoPropulsion = "combustion" | "electrica";

/** Calidad del kilometraje declarado: la misma escala que autos (`classes/autos/normalize.ts`). */
export type MotoKmQuality = "ok" | "placeholder" | "unknown";

/**
 * El tipo de moto, que es el equivalente de la carrocería en autos. Los valores son los de la
 * faceta `MOTO_TYPE` de Mercado Libre, medidos el 2026-09-22 (ver ./identify.ts): no se inventa una
 * taxonomía propia cuando el origen ya publica la suya y es la que el vendedor eligió.
 */
export type MotoType =
  | "calle"
  | "naked"
  | "scooter"
  | "doble-proposito"
  | "deportiva"
  | "custom"
  | "chopper"
  | "crucero"
  | "cross"
  | "enduro"
  | "trial"
  | "turismo"
  | "mini";

/**
 * El tramo de cilindrada, con los cortes que publica la propia faceta `ENGINE_DISPLACEMENT` de
 * Mercado Libre. Es lo que se sabe de casi todos los avisos; la cilindrada EXACTA, en cambio, sólo
 * la declara el título y casi nunca lo hace (ver `MOTO_DISPLACEMENT_FACETS` en ./identify.ts).
 */
export type MotoDisplacementBandId = "hasta-125" | "126-250" | "mas-250";

/**
 * De dónde salió el dato: la faceta aplicada del origen, la ficha propia del aviso o la palabra del
 * título. Nunca se mezcla.
 */
export type MotoEvidence = "mercadolibre" | "ficha" | "title";

/** La base de la cilindrada (ver ./displacement.ts): dos son dato del aviso, dos son estimación. */
export type { MotoDisplacementBasis } from "./displacement";

/**
 * La ficha técnica que el VENDEDOR cargó en Mercado Libre, curada: sólo filas vistas en fichas reales
 * y con un valor que se puede leer. No se verifica; la página lo dice.
 */
export interface PublicMotoSpecs {
  /** "2 tiempos" o "4 tiempos". */
  engine: string | null;
  brakes: string | null;
  transmission: string | null;
  gears: number | null;
  /** "77 hp", sólo si la unidad es hp/cv/kW y el número es plausible para la cilindrada. */
  power: string | null;
  uniqueOwner: boolean | null;
  tradeIn: boolean | null;
  negotiable: boolean | null;
  readAt: string;
}

export interface RawMotoListing {
  id: string;
  source: MotoSource;
  /** Marca y modelo vienen del filtro APLICADO, nunca de adivinar el título (igual que autos). */
  brandId: string;
  brand: string;
  modelId: string;
  model: string;
  title: string;
  year: number;
  km: number | null;
  price: number;
  currency: MotoCurrency;
  fuel: MotoFuel | null;
  neighborhood: string | null;
  department: string | null;
  sellerType: MotoSellerType | null;
  sellerId: string | null;
  picture: string | null;
  pictureCount: number | null;
  permalink: string;
  observedAt: string;
  /** La moneda la DEDUJO el lector (Facebook dice "UYU" aunque el vendedor pida dólares). */
  currencyInferred?: boolean;
}

export interface MotoPricePoint {
  price: number;
  currency: MotoCurrency;
  observedAt: string;
}

/**
 * Lo que las facetas del propio Mercado Libre declararon de ESTE aviso, guardado junto a él.
 *
 * Se guarda porque los dos barridos por faceta (tipo y cilindrada) sólo los hace la corrida
 * COMPLETA: son ~170 páginas del puente compartido y la horaria tiene 250 pedidos para todo. Sin
 * esto, la horaria republicaría el catálogo entero con `type` y `displacementBand` en null —
 * borrando cada hora lo que la diaria acababa de medir, que es exactamente el defecto que
 * `equiparstoresnapshots` resuelve del otro lado.
 *
 * No vence: el tipo y la cilindrada de una moto no cambian, y el aviso que deja de existir se
 * retira solo a las dos ausencias. `readAt` viaja igual para que se pueda auditar de cuándo es.
 */
export interface MotoFacetEvidence {
  type: MotoType | null;
  displacementBand: MotoDisplacementBandId | null;
  readAt: string;
}

/**
 * La ficha propia del aviso (`moto.mercadolibre.com.uy/MLU-…`), leída por `sync_motos_detail.ts`.
 *
 * Privada entera: lo que cruza al público se arma campo por campo en ./catalog.ts. La tabla cruda
 * (`specs`) y la descripción se guardan para poder auditar y para que un lector mejor se aplique
 * sin volver a pedir nada.
 */
export interface MotoDetail {
  readAt: string;
  price: number;
  currency: MotoCurrency;
  /** `item_status` de la página: un aviso pausado o finalizado contesta 200 con otro estado. */
  active: boolean;
  /** La tabla «Características principales» tal cual, etiqueta → valor. */
  specs: Record<string, string>;
  /** La fila «Cilindrada», ya leída (null si no está o no es una cilindrada). */
  displacement: number | null;
  /** La fila «Tipo de moto»: casi siempre la etiqueta de ML ("Naked", "Scooters"), a veces texto libre. */
  typeText: string | null;
  color: string | null;
  /** La galería propia, hasta 8 fotos del host de imágenes de ML. */
  pictures: string[];
  description: string;
}

/** Lo que se guarda por aviso en la colección PRIVADA `motolistings`. */
export interface StoredMoto {
  key: string;
  firstSeen: string;
  lastSeen: string;
  listing: RawMotoListing;
  priceHistory: MotoPricePoint[];
  retiredAt: string | null;
  missedFullSweeps: number;
  /** Lo que declararon las facetas de ML la última vez que una corrida completa las barrió. */
  facets?: MotoFacetEvidence | null;
  /** La última ficha leída bien. Una lectura fallida nunca la borra. */
  detail?: MotoDetail | null;
  /** La última lectura fallida (red, 5xx, página sin ficha): espera un día antes de reintentar. */
  detailError?: { at: string; reason: string } | null;
  /** Cuándo la ficha contestó 404/410: el aviso ya no existe y no se repide por una semana. */
  detailGoneAt?: string | null;
}

/** Un aviso con todo lo derivado ya calculado. Sigue siendo interno. */
export interface MotoListing extends RawMotoListing {
  key: string;
  sourceName: string;
  brandSlug: string;
  modelSlug: string;
  /** `marca-modelo`: la cohorte de la ficha del modelo. */
  marketSlug: string;
  /** La mejor cilindrada que hay (ver ./displacement.ts), o null. */
  displacement: number | null;
  displacementBasis: MotoDisplacementBasis | null;
  /** Cuántos avisos del modelo sostienen la estimación, con base `model`. */
  displacementVotes: number | null;
  /** Sólo el DATO del aviso (ficha o título): lo único que entra a una estadística por cilindrada. */
  exactDisplacement: number | null;
  /** El tramo: de la faceta del origen si la corrida la barrió, si no derivado de la cilindrada. */
  displacementBand: MotoDisplacementBandId | null;
  displacementBandBasis: MotoEvidence | MotoDisplacementBasis | null;
  type: MotoType | null;
  typeBasis: MotoEvidence | null;
  /** `marca|modelo|cilindrada`: la identidad de producto de la spec. */
  productKey: string;
  kmQuality: MotoKmQuality;
  /** Lo que el propio vendedor declara en el título (deuda, choque, papeles…): vocabulario de autos. */
  flags: string[];
  priceUsd: number;
  priceConverted: boolean;
  /** Nunca deducida en v1 (Mercado Libre siempre declara la moneda), pero el campo viaja al público. */
  currencyInferred: boolean;
  firstSeen: string;
  lastSeen: string;
  priceDrop: { from: number; currency: MotoCurrency; since: string } | null;
  /** La galería propia de la ficha, o vacía si todavía no se leyó. */
  pictures: string[];
  /** Familia de color (`classes/autos/bodyType.ts`), de la ficha. */
  color: string | null;
  specs: PublicMotoSpecs | null;
  /** Lo que el VENDEDOR declara en título y descripción (deuda, choque…), con su cita. */
  risks: CarRisk[];
  /** La ficha propia, tal cual se leyó (privada: no cruza al público). */
  detail: MotoDetail | null;
}

export interface MotoHarvestGap {
  brandId: string;
  brand: string;
  missing: number;
}

export interface MotoHarvestResult {
  mode: "full" | "fast";
  startedAt: string;
  finishedAt: string;
  listings: RawMotoListing[];
  /** Tipo por aviso según la faceta `MOTO_TYPE` aplicada, cuando la corrida la barrió. */
  types: Array<{ id: string; type: MotoType }>;
  /** Tramo de cilindrada por aviso según la faceta `ENGINE_DISPLACEMENT`, cuando la corrida la barrió. */
  displacements: Array<{ id: string; band: MotoDisplacementBandId }>;
  /** Avisos que la propia taxonomía de ML clasifica como cuatriciclo, triciclo o motocarro. */
  excludedIds: string[];
  requests: number;
  pages: number;
  failedPages: number;
  rejectedCards: number;
  cooldowns: number;
  /** Marcas cuyas páginas respondieron todas: sólo ahí un aviso no visto puede contar como retirado. */
  completeBrands: string[];
  gaps: MotoHarvestGap[];
  reportedTotal: number | null;
  note: string | null;
  /** Avisos que sólo vio el barrido por MARCA (sin modelo en la faceta), sumados a los del de modelo. */
  brandSweepAdded?: number;
}

/** Banda de precio de una cohorte (modelo o modelo-año). Descriptiva: es lo que se PIDE, no una tasación. */
export interface MotoPriceBand {
  n: number;
  sellers: number;
  p25: number;
  median: number;
  p75: number;
  kmMedian: number | null;
}

export interface MotoYearBand extends MotoPriceBand {
  year: number;
}

export interface MotoDisplacementBand extends MotoPriceBand {
  displacement: number;
}

/** Una fila del directorio: el modelo, con su banda y el desglose por año y por cilindrada. */
export interface PublicMotoModel {
  version: 1;
  slug: string;
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  generatedAt: string;
  listings: number;
  /**
   * El eje por el que se parte la banda. Eléctrica y combustión NUNCA se promedian: son dos
   * mercados, con dos costos de uso, y el comparador de transporte los trata distinto.
   */
  propulsion: MotoPropulsion;
  band: MotoPriceBand | null;
  years: MotoYearBand[];
  displacements: MotoDisplacementBand[];
  /** Caída anual medida sobre el propio catálogo, o null si no hay curva suficiente. */
  annualDrop: number | null;
  /** Tipos declarados por ML entre los avisos del modelo, del más frecuente al menos. */
  types: Array<{ type: MotoType; adverts: number }>;
}

/** Una fila pública de `motocatalog`: un AVISO, no un modelo. El contrato que lee el comparador. */
export interface PublicMotoListing {
  key: string;
  source: MotoSource;
  sourceName: string;
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  marketSlug: string;
  productKey: string;
  title: string;
  year: number;
  km: number | null;
  price: number;
  currency: MotoCurrency;
  priceUsd: number;
  priceConverted: boolean;
  currencyInferred: boolean;
  displacement: number | null;
  displacementBasis: MotoDisplacementBasis | null;
  displacementVotes: number | null;
  displacementBand: MotoDisplacementBandId | null;
  displacementBandBasis: MotoEvidence | MotoDisplacementBasis | null;
  type: MotoType | null;
  typeBasis: MotoEvidence | null;
  fuel: MotoFuel | null;
  department: string | null;
  neighborhood: string | null;
  sellerType: MotoSellerType | null;
  picture: string | null;
  pictureCount: number | null;
  permalink: string;
  firstSeen: string;
  lastSeen: string;
  priceDrop: { from: number; currency: MotoCurrency; since: string } | null;
  flags: string[];
  /** La galería propia (hasta 8), sin la portada repetida adelante si coincide. */
  pictures: string[];
  color: string | null;
  specs: PublicMotoSpecs | null;
  risks: Array<Pick<CarRisk, "category" | "severity" | "quote" | "from">>;
  /** Si la ficha propia del aviso ya se leyó. */
  hasDetail: boolean;
}

export interface PublicMotoSourceCoverage {
  source: MotoSource;
  name: string;
  listings: number;
  duplicates: number;
  lastReadAt: string | null;
  ok: boolean;
}

export interface PublicMotoCatalogMeta {
  /** Fijo: es la llave que `classes/transporte/prices.ts` busca en `motocatalogmetas`. */
  id: "uy-motos";
  generatedAt: string;
  freshDays: number;
  /** Ninguna fuente declara haber leído TODO el mercado: el directorio nunca dice "completo". */
  sourceCoverage: "partial";
  listings: number;
  usdUyu: number;
  lastFullReadAt: string | null;
  lastReadAt: string | null;
  reportedTotal: number | null;
  /** Cuántos avisos quedan sin cilindrada, ni del aviso ni estimada. La ausencia se declara. */
  withoutDisplacement: number;
  /** Y cuántos ni siquiera tienen tramo, que es el dato que sí tiene casi todo el catálogo. */
  withoutDisplacementBand: number;
  /** Cuántos llevan una cilindrada ESTIMADA (consenso del modelo o nombre del modelo). */
  displacementEstimated: number;
  /** Cuántos tienen la ficha propia leída. */
  withDetail: number;
  models: Array<{ slug: string; brand: string; model: string; listings: number }>;
  sources: PublicMotoSourceCoverage[];
}

export interface MotoReportDepreciation {
  slug: string;
  brand: string;
  model: string;
  adverts: number;
  annualDrop: number;
  points: Array<{ year: number; adverts: number; medianUsd: number }>;
}

/** El informe del mercado: agregados, sin una sola fila de aviso adentro. */
export interface PublicMotoReport {
  generatedAt: string;
  usdUyu: number;
  adverts: number;
  /** Composición de la oferta. Mide OFERTA, nunca ventas: nadie publica transferencias por modelo. */
  brands: Array<{ slug: string; name: string; adverts: number; medianUsd: number | null }>;
  displacements: Array<{ band: MotoDisplacementBandId | "sin-dato"; label: string; adverts: number; medianUsd: number | null }>;
  types: Array<{ type: MotoType | "sin-dato"; adverts: number }>;
  fuels: Array<{ fuel: MotoFuel | "sin-dato"; adverts: number }>;
  sellers: Array<{ sellerType: MotoSellerType | "sin-dato"; adverts: number; medianUsd: number | null }>;
  depreciation: MotoReportDepreciation[];
  /** Qué compra cada presupuesto, en dólares. */
  budgets: Array<{ maxUsd: number; adverts: number; models: Array<{ slug: string; brand: string; model: string; adverts: number }> }>;
  /** Lo que el informe NO puede decir, dicho. */
  caveats: string[];
}

export interface PublicMotoReportSnapshot {
  version: 1;
  generatedAt: string;
  report: PublicMotoReport;
}
