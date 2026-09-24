// Public wire contract of the used-car directory. app/utils/carsPublic.ts mirrors this file and
// tests/autos/contracts.test.ts fails when the two drift.
export type PublicCarCurrency = "USD" | "UYU";
export type PublicCarFuel = "nafta" | "diesel" | "electrico" | "hibrido" | "gnc";
export type PublicCarTransmission = "manual" | "automatica";
export type PublicCarSeller = "dealer" | "private";
/**
 * Fuel consumption in litres per 100 km. `basis` says where the figure comes from: "advert" = this
 * advert states it; the rest are estimates from what OTHER sellers state, one figure per seller — same
 * model and engine, same model, or (coarse) same fuel and displacement. `sellers` = how many sellers
 * stand behind an estimate.
 */
export interface PublicCarFuelEconomy {
  litersPer100Km: number;
  city: number | null;
  highway: number | null;
  combined: number | null;
  basis: "advert" | "model_engine" | "model" | "engine_class";
  sellers: number | null;
}

/**
 * La carrocería del auto. `basis` dice de dónde sale: "advert" = lo declara ESTE aviso (su ficha
 * propia, o la palabra que el vendedor escribió en el título); "model" = no lo declara, y es la
 * carrocería que muestran las fichas de los demás avisos de su mismo modelo. Un auto sin carrocería
 * no lleva este campo y nunca cumple un filtro de carrocería.
 */
export type PublicCarBodyType =
  | "sedan" | "hatchback" | "suv" | "pickup" | "rural" | "furgon" | "monovolumen" | "coupe" | "cabriolet";
export interface PublicCarBody {
  type: PublicCarBodyType;
  basis: "advert" | "model";
}

/** Lo que Mercado Libre archiva bajo "Control de tracción": la tracción del auto. */
export type PublicCarDrivetrain = "delantera" | "trasera" | "4x4" | "4x2" | "integral";
export type PublicCarSteering = "hidraulica" | "electrica" | "asistida" | "mecanica";
/** El equipamiento que la ficha del aviso marca con Sí o No (classes/autos/specs.ts). */
export type PublicCarEquipment =
  | "abs" | "control_estabilidad" | "control_traccion" | "airbag_conductor" | "airbag_pasajero" | "isofix" | "alarma"
  | "blindado" | "camara_retroceso" | "sensor_estacionamiento" | "estacionamiento_automatico" | "sensor_lluvia"
  | "faros_antiniebla" | "faros_automaticos" | "tercera_luz_freno" | "alarma_luces"
  | "aire_acondicionado" | "climatizador" | "piloto_automatico" | "computadora_abordo" | "cristales_electricos"
  | "cierre_centralizado" | "cierre_automatico_vidrios" | "apertura_remota_baul" | "tapizado_cuero"
  | "asientos_calefaccionados" | "techo_solar" | "porta_vasos"
  | "bluetooth" | "apple_carplay" | "android_auto" | "usb" | "entrada_auxiliar" | "am_fm" | "cd" | "dvd" | "mp3"
  | "comando_volante"
  | "llantas_aleacion" | "porta_equipaje" | "defensa_delantera" | "desempanador_trasero" | "limpia_luneta"
  | "rueda_auxilio";

/**
 * La ficha técnica del aviso, y SÓLO del aviso: nada acá se estima. Sale de la tabla de la página
 * propia de Mercado Libre leída en `readAt`; los demás portales no tienen ficha leída y no la llevan.
 * Cada cifra es null cuando la ficha no la trae o cuando no puede ser la de un auto.
 */
export interface PublicCarSpecs {
  readAt: string;
  powerHp: number | null;
  valvesPerCylinder: number | null;
  gears: number | null;
  drivetrain: PublicCarDrivetrain | null;
  steering: PublicCarSteering | null;
  fuelTankL: number | null;
  trunkL: number | null;
  lengthMm: number | null;
  heightMm: number | null;
  widthMm: number | null;
  wheelbaseMm: number | null;
  seats: number | null;
  /** Lo que la ficha marca con "Sí", en el orden de classes/autos/specs.ts. */
  equipment: PublicCarEquipment[];
  /** Lo que la ficha marca con "No": el vendedor dice que el auto no lo tiene. */
  missing: PublicCarEquipment[];
  singleOwner: boolean | null;
  acceptsTrade: boolean | null;
  negotiable: boolean | null;
  mechanicalWarranty: boolean | null;
  factoryWarranty: boolean | null;
}

export type PublicCarFlag = "damaged" | "financing" | "foreign_plate" | "paperwork" | "price_mismatch" | "recovered";
export type PublicCarTier = "strict" | "exploratory";
export type PublicCarSource =
  | "mercadolibre" | "facebook" | "clasiautos" | "julio" | "shoppingdeautos" | "carper" | "fidocar" | "carone"
  | "motorlider" | "duenodirecto";

export interface PublicCarReference {
  priceUsd: number;
  basis: "version" | "year";
  updatedAt: string;
}

export interface PublicCarListing {
  key: string;
  source: PublicCarSource;
  sourceName: string;
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  marketSlug: string;
  title: string;
  year: number;
  km: number | null;
  price: number;
  /**
   * What the portal lists when it is NOT the car's price: the advert states a cash price ("US$12990
   * Contado") and `price` is that one; the listed number was the down payment. Null otherwise.
   */
  listedPrice: number | null;
  currency: PublicCarCurrency;
  priceUsd: number;
  priceConverted: boolean;
  currencyInferred: boolean;
  transmission: PublicCarTransmission | null;
  fuel: PublicCarFuel | null;
  fuelEconomy: PublicCarFuelEconomy | null;
  body: PublicCarBody | null;
  /** Puertas y color: sólo si los declara la ficha propia del aviso. */
  doors: number | null;
  color: string | null;
  engine: string | null;
  trim: string | null;
  department: string | null;
  neighborhood: string | null;
  sellerType: PublicCarSeller | null;
  dealerName: string | null;
  picture: string | null;
  pictureCount: number | null;
  /** La galería del propio aviso (hasta 6, del host de fotos de su fuente); sólo la sirve la ficha. */
  pictures: string[];
  permalink: string;
  firstSeen: string;
  lastSeen: string;
  priceDrop: { from: number; currency: PublicCarCurrency; since: string } | null;
  flags: PublicCarFlag[];
  /** What the advert itself declares about the car, quoted. Empty for almost every row. */
  risks: PublicCarRisk[];
  opportunity: { tier: PublicCarTier; gap: number; median: number; n: number } | null;
  reference: PublicCarReference | null;
  /** La ficha técnica del aviso (sólo Mercado Libre); sólo la sirve la ficha, las listas no. */
  specs: PublicCarSpecs | null;
  /** Hay un teléfono publicable para este aviso; se pide aparte, a /api/cars/contact/<key>. */
  hasContact?: boolean;
}

/** Un teléfono del vendedor: `value` se marca ("+59899123456", "08002525"), `display` se lee. */
export interface PublicCarContactPhone {
  value: string;
  display: string;
  mobile: boolean;
}

/**
 * Cómo contactar al vendedor de UN aviso, pedido aparte y con un clic: nunca viaja con el catálogo.
 * "advert_text" = lo escribió el vendedor en el texto público de su aviso (`sourceUrl` es el aviso);
 * "dealer_site" = el número comercial de la automotora en su propia web (`sourceUrl` es esa página).
 */
export interface PublicCarContact {
  key: string;
  origin: "advert_text" | "dealer_site";
  phones: PublicCarContactPhone[];
  sourceUrl: string;
  observedAt: string;
  /** "dealer_site": el nombre de la automotora dueña del número. */
  dealerName: string | null;
  /** Aviso de Mercado Libre: cuántos autos de la web de la automotora publica también esa cuenta. */
  accountTwins: number | null;
}

export interface PublicCarModelSummary {
  slug: string;
  brand: string;
  model: string;
  listings: number;
}

export interface PublicCarSourceCoverage {
  source: PublicCarSource;
  name: string;
  listings: number;
  duplicates: number;
  lastReadAt: string | null;
  ok: boolean;
}

export interface PublicCarCatalogMeta {
  key: "uy-cars";
  generatedAt: string;
  freshDays: number;
  sourceCoverage: "partial";
  listings: number;
  usdUyu: number;
  lastFullReadAt: string | null;
  lastReadAt: string | null;
  reportedTotal: number | null;
  opportunities: number;
  models: PublicCarModelSummary[];
  sources: PublicCarSourceCoverage[];
}

export interface PublicCarMarketRow {
  year: number;
  trim: string | null;
  engine: string | null;
  transmission: PublicCarTransmission | null;
  n: number;
  sellers: number;
  p25: number;
  median: number;
  p75: number;
  kmMedian: number;
}

export interface PublicCarGuideVersion {
  name: string;
  priceUsd: number;
}

export interface PublicCarGuideYear {
  year: number;
  averageUsd: number | null;
  versions: PublicCarGuideVersion[];
}

export interface PublicCarMarketSnapshot {
  version: 1;
  slug: string;
  brand: string;
  model: string;
  brandSlug: string;
  modelSlug: string;
  generatedAt: string;
  listings: number;
  years: PublicCarMarketRow[];
  rows: PublicCarMarketRow[];
  guide: PublicCarGuideYear[];
  guideUpdatedAt: string | null;
}

export interface PublicCarComparable {
  key: string;
  source: PublicCarSource;
  sourceName: string;
  title: string;
  year: number;
  km: number;
  priceUsd: number;
  trim: string | null;
  engine: string | null;
  sellerType: PublicCarSeller | null;
  permalink: string;
  lastSeen: string;
}

export interface PublicCarSample {
  n: number;
  sellers: number;
  dealers: number;
  privates: number;
  p25: number;
  median: number;
  p75: number;
  spread: number;
  kmMedian: number;
  kmP75: number;
}

export interface PublicCarOpportunityItem {
  subject: PublicCarListing;
  tier: PublicCarTier;
  gap: number;
  conservativeGap: number;
  sellerSensitivityGap: number;
  sample: PublicCarSample;
  comparables: PublicCarComparable[];
  detailReadAt: string;
}

export interface PublicCarTierPolicy {
  minimumComparables: number;
  minimumSellers: number;
  maximumSpread: number;
  minimumGap: number;
  minimumConservativeGap: number;
  minimumSellerSensitivityGap: number;
}

export interface PublicCarOpportunityPolicy {
  freshDays: number;
  kmToleranceRatio: number;
  kmToleranceMin: number;
  maximumPerSeller: number;
  maximumGap: number;
  strict: PublicCarTierPolicy;
  exploratory: PublicCarTierPolicy;
}

export interface PublicCarOpportunityStats {
  input: number;
  eligible: number;
  analyzed: number;
  candidates: number;
  verified: number;
  strict: number;
  exploratory: number;
  review: number;
  excluded: Record<string, number>;
  rejectedByDetail: Record<string, number>;
}

export interface PublicCarOpportunitySnapshot {
  version: 1;
  algorithm: "car-cohort-v2";
  generatedAt: string;
  usdUyu: number;
  policy: PublicCarOpportunityPolicy;
  items: PublicCarOpportunityItem[];
  stats: PublicCarOpportunityStats;
}

export type PublicCarRiskCategory =
  | "deuda" | "papeles" | "siniestro" | "recupero" | "mecanica" | "chapa_extranjera" | "uso_intensivo";
export type PublicCarRiskSeverity = "alta" | "media";

export interface PublicCarRisk {
  category: PublicCarRiskCategory;
  severity: PublicCarRiskSeverity;
  /** The seller's own words. The site quotes, it does not conclude. */
  quote: string;
  from: "title" | "description";
}

export interface PublicCarRiskItem {
  subject: PublicCarListing;
  risks: PublicCarRisk[];
  severity: PublicCarRiskSeverity;
  /** Discount against the SAME car without a declared risk; null when there is nothing to compare. */
  gap: number | null;
  median: number | null;
  n: number | null;
  sellers: number | null;
  /** The advert's own photos show the damage the advert itself declares. */
  photoConfirms: boolean;
}

export interface PublicCarRiskCategoryStat {
  category: PublicCarRiskCategory;
  adverts: number;
  measured: number;
  medianGap: number | null;
  p25Gap: number | null;
  p75Gap: number | null;
}

export interface PublicCarRiskStats {
  input: number;
  declared: number;
  measured: number;
  withoutDescription: number;
}

export interface PublicCarRiskSnapshot {
  version: 1;
  generatedAt: string;
  usdUyu: number;
  items: PublicCarRiskItem[];
  categories: PublicCarRiskCategoryStat[];
  stats: PublicCarRiskStats;
}

export interface PublicCarReportRange {
  p25: number;
  median: number;
  p75: number;
}

export interface PublicCarReportModel {
  marketSlug: string;
  brand: string;
  model: string;
  adverts: number;
  share: number;
  price: PublicCarReportRange;
  medianYear: number;
  medianKm: number | null;
  /** Cuánto pierde por año, del promedio de años consecutivos. Null si la curva no alcanza. */
  annualDrop: number | null;
  /** Qué tan abierto está el abanico de precios del mismo modelo: (p75-p25)/mediana. */
  spread: number;
  dealerShare: number;
  automaticShare: number;
  declaredRiskShare: number;
}

export interface PublicCarReportDepreciationPoint {
  year: number;
  adverts: number;
  medianUsd: number;
}

export interface PublicCarReportDepreciation {
  marketSlug: string;
  brand: string;
  model: string;
  annualDrop: number | null;
  points: PublicCarReportDepreciationPoint[];
}

export interface PublicCarReportBudgetModel {
  marketSlug: string;
  brand: string;
  model: string;
  adverts: number;
  medianUsd: number;
  medianYear: number;
  medianKm: number | null;
}

export interface PublicCarReportBudget {
  maxUsd: number;
  adverts: number;
  models: PublicCarReportBudgetModel[];
}

export interface PublicCarReportSellerGap {
  marketSlug: string;
  brand: string;
  model: string;
  dealerMedian: number;
  privateMedian: number;
  gap: number;
  cohorts: number;
}

export interface PublicCarReportNegotiation {
  windowDays: number;
  changed: number;
  cut: number;
  raised: number;
  medianCut: number | null;
  shareOfMarket: number;
}

export interface PublicCarReportRotation {
  measurable: boolean;
  historyDays: number;
  retired: number;
  note: string;
  medianDays: number | null;
}

export interface PublicCarCoefficient {
  /** Fraction of the price: 0.04 is 4 %. Null when there are not enough cohorts. */
  value: number | null;
  cohorts: number;
  p25: number | null;
  p75: number | null;
}

export interface PublicCarPriceEnding {
  ending: string;
  adverts: number;
}

export interface PublicCarValuation {
  km: PublicCarCoefficient;
  automatic: PublicCarCoefficient;
  automaticWithTrim: PublicCarCoefficient;
  diesel: PublicCarCoefficient;
  endings: PublicCarPriceEnding[];
}

export interface PublicCarReportSnapshotData {
  market: {
    adverts: number;
    brands: number;
    models: number;
    price: PublicCarReportRange;
    year: PublicCarReportRange;
    km: PublicCarReportRange | null;
    sellers: Record<PublicCarSeller | "unknown", number>;
    fuels: Array<{ fuel: PublicCarFuel | "unknown"; adverts: number }>;
    transmissions: Array<{ transmission: PublicCarTransmission | "unknown"; adverts: number }>;
    departments: Array<{ department: string; adverts: number }>;
    priceBands: Array<{ from: number; to: number | null; adverts: number }>;
  };
  brands: Array<{ slug: string; name: string; adverts: number; share: number; medianUsd: number; medianYear: number }>;
  models: PublicCarReportModel[];
  depreciation: PublicCarReportDepreciation[];
  budgets: PublicCarReportBudget[];
  sellerGaps: { median: number | null; models: PublicCarReportSellerGap[] };
  negotiation: PublicCarReportNegotiation;
  rotation: PublicCarReportRotation;
  risk: { adverts: number; share: number; byCategory: Array<{ category: PublicCarRiskCategory; adverts: number }> };
  /** Lo que mueve el precio dentro del mismo modelo y año: km, caja, combustible. */
  valuation: PublicCarValuation;
}

export interface PublicCarReportSnapshot {
  version: 1;
  generatedAt: string;
  usdUyu: number;
  data: PublicCarReportSnapshotData;
}

/** Las seis piezas de la canasta de repuestos (classes/autos/repuestos.ts). */
export type PublicCarPartKey = "pastillas" | "filtro_aceite" | "amortiguador" | "embrague" | "distribucion" | "optica";

/** Mediana en pesos de una pieza, sobre avisos de Mercado Libre Uruguay que nombran el modelo. */
export interface PublicCarPartPrice {
  key: PublicCarPartKey;
  median: number;
  offers: number;
}

export interface PublicCarAdvisorParts {
  readAt: string;
  /** Media geométrica de (mediana del modelo / mediana de todos) con 3+ piezas; null si no alcanza. */
  index: number | null;
  /** Ofertas coincidentes sumadas en las seis piezas: avisos de repuestos, no stock de las casas. */
  offers: number;
  parts: PublicCarPartPrice[];
}

export interface PublicCarAdvisorYear {
  year: number;
  n: number;
  p25: number;
  median: number;
  p75: number;
  kmMedian: number | null;
}

/** Combustible × caja: un Corolla híbrido automático y uno a nafta manual no cuestan ni consumen lo mismo. */
export interface PublicCarAdvisorVariant {
  fuel: PublicCarFuel;
  transmission: PublicCarTransmission;
  adverts: number;
  litersPer100Km: number | null;
  /** Qué parte de los avisos con consumo lo declara; el resto es la estimación por modelo. */
  consumptionDeclaredShare: number | null;
  years: PublicCarAdvisorYear[];
}

/** Sí / (sí + no) entre las fichas que mencionan el dato; lo no mencionado no cuenta. */
export interface PublicCarAdvisorShare {
  share: number;
  n: number;
}

export interface PublicCarAdvisorModel {
  marketSlug: string;
  brand: string;
  model: string;
  brandSlug: string;
  modelSlug: string;
  adverts: number;
  sellers: number;
  body: PublicCarBodyType | null;
  bodyShare: number | null;
  /** Fichas técnicas leídas: la base de plazas, baúl, largo, potencia y equipamiento. */
  specsN: number;
  seats: number | null;
  trunkL: number | null;
  lengthMm: number | null;
  powerHp: number | null;
  fourByFour: PublicCarAdvisorShare | null;
  abs: PublicCarAdvisorShare | null;
  airbags: PublicCarAdvisorShare | null;
  esc: PublicCarAdvisorShare | null;
  isofix: PublicCarAdvisorShare | null;
  annualDrop: number | null;
  dealerShare: number;
  declaredRiskShare: number;
  variants: PublicCarAdvisorVariant[];
  parts: PublicCarAdvisorParts | null;
}

export interface PublicCarAdvisorSnapshotData {
  /** Caída anual típica del mercado: la que se usa cuando el modelo no tiene curva propia. */
  typicalDrop: number | null;
  /** Mediana de cada pieza entre todos los modelos medidos: la base del índice de repuestos. */
  partsBaseline: PublicCarPartPrice[];
  models: PublicCarAdvisorModel[];
}

export interface PublicCarAdvisorSnapshot {
  version: 1;
  generatedAt: string;
  usdUyu: number;
  data: PublicCarAdvisorSnapshotData;
}
