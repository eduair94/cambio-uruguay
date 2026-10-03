// "¿Vale lo que piden?": el análisis que la ficha de cada auto usado
// (/autos-usados-uruguay/<key>) muestra debajo del aviso.
//
// Es pura para que los tests la ejerciten sin Nuxt; el endpoint de la ficha junta los datos (pares
// del mismo modelo, autos de otros modelos en la misma plata y los snapshots que ya existen) y la
// llama una vez por pedido. Nada de esto es una tasación: son precios PEDIDOS.
//
// CUATRO REGLAS QUE LA PÁGINA TIENE QUE PODER EXPLICAR:
//  * Se compara contra avisos LIMPIOS: sin deuda, choque o recupero declarados, sin marcas y con la
//    moneda leída, no deducida. Es la misma cohorte de referencia que usa la página de autos con
//    deuda; un chocado a mitad de precio no es "el mercado".
//  * Sin cinco comparables no hay veredicto. Con tres avisos el percentil es ruido.
//  * Las "elecciones" (el más barato, el de menos km por esta plata…) nunca son el propio aviso ni
//    un aviso con riesgo declarado: las listas ordenadas por "más barato" atraen exactamente los
//    errores y los chocados.
//  * Todo número dice de dónde sale: año o versión, caída del modelo o del mercado, consumo del aviso
//    o del modelo.
import {
  carAdvisorFuelFallback,
  carOwnershipCosts,
  CAR_ADVISOR_DEFAULT_KM,
  type CarAdvisorCosts,
  type CarAdvisorFuelPrices,
} from './carAdvisor'
import type { LatinNcapEntry } from './carAdvisorFigures'
import { latinNcapResults } from './latinNcap'
import {
  CAR_VALUATION_MAX_KM_ADJUSTMENT,
  CAR_VALUATION_MIN_SAMPLE,
  estimateCarValue,
} from './carsValuation'
import type {
  PublicCarAdvisorModel,
  PublicCarAdvisorShare,
  PublicCarAdvisorSnapshot,
  PublicCarBodyType,
  PublicCarFuel,
  PublicCarListing,
  PublicCarMarketSnapshot,
  PublicCarPartPrice,
  PublicCarReportSnapshot,
} from './carsPublic'

/** Comparables mínimos para dar un veredicto. */
export const CAR_INSIGHT_MIN_PEERS = 5
/** "Por esta plata": hasta 5 % más de lo que pide el aviso, lo que se negocia sin esfuerzo. */
export const CAR_INSIGHT_PRICE_STRETCH = 1.05
/** La banda de otros modelos que lee el endpoint: de 90 % a 105 % del precio del aviso. */
export const CAR_INSIGHT_BAND_FLOOR = 0.9
/** Fichas mínimas para decir qué parte de un modelo trae un equipamiento. */
const SHARE_MIN_SHEETS = 5
/** Piezas con precio mínimas para mostrar repuestos (el mismo umbral que el asesor). */
const PARTS_MIN_MEASURED = 3

export type CarInsightVerdict = 'muy-bajo' | 'bajo' | 'justo' | 'alto' | 'muy-alto'

export interface CarInsightPosition {
  /** `version`: misma versión y año; `year`: mismo año; `years`: año ±1. */
  basis: 'version' | 'year' | 'years'
  yearFrom: number
  yearTo: number
  trim: string | null
  n: number
  min: number
  p25: number
  median: number
  p75: number
  max: number
  /** Qué parte de los comparables pide MENOS que este aviso (0..1). */
  cheaperShare: number
  /** precio / mediana − 1. */
  gap: number
  verdict: CarInsightVerdict
}

export interface CarInsightKm {
  basis: 'version' | 'year'
  expected: number
  low: number
  high: number
  /** precio / esperado − 1. */
  gap: number
  kmFactor: number
  kmCapped: boolean
  kmMedian: number
  /** Cuánto le resta al precio de este modelo y año cada 10.000 km de más. */
  perTenThousandUsd: number | null
}

export type CarInsightPickKind =
  | 'cheapest-same'
  | 'best-km-value'
  | 'lowest-km-for-price'
  | 'newest-for-price'
  | 'other-newest'
  | 'other-lowest-km'

export interface CarInsightPick {
  kind: CarInsightPickKind
  car: PublicCarListing
}

export interface CarInsightModelOption {
  marketSlug: string
  brand: string
  model: string
  adverts: number
  medianUsd: number
  medianYear: number
  medianKm: number | null
}

export interface CarInsightDepreciation {
  annualDrop: number
  /** La caída no es la del modelo sino la típica del mercado. */
  fromMarket: boolean
  inOneYearUsd: number
  lossPerYearUsd: number
  /** Mediana pedida por año del modelo (sólo años con muestra), el más viejo primero. */
  points: Array<{ year: number; medianUsd: number; n: number }>
}

export interface CarInsightCosts extends CarAdvisorCosts {
  kmYear: number
  fuel: PublicCarFuel
  /** El aviso no dice el combustible: se tomó el más común del modelo (o nafta). */
  fuelAssumed: boolean
  usdUyu: number
  fuelPrices: CarAdvisorFuelPrices & { asOf: string | null }
}

export interface CarInsightParts {
  readAt: string
  index: number | null
  parts: PublicCarPartPrice[]
  baseline: PublicCarPartPrice[]
}

export interface CarInsight {
  position: CarInsightPosition | null
  km: CarInsightKm | null
  /** El aviso trae km pero no son creíbles (relleno o muy pocos para su edad): no se usan. */
  kmDoubtful: boolean
  /** El puesto del aviso entre los de su modelo ordenados por precio contra su año y sus km. */
  kmValue: { rank: number; of: number } | null
  picks: CarInsightPick[]
  alternatives: CarInsightModelOption[]
  band: { from: number; to: number; body: PublicCarBodyType | null } | null
  depreciation: CarInsightDepreciation | null
  costs: CarInsightCosts | null
  parts: CarInsightParts | null
  safety: {
    ncap: LatinNcapEntry[]
    abs: PublicCarAdvisorShare | null
    airbags: PublicCarAdvisorShare | null
    esc: PublicCarAdvisorShare | null
  }
  negotiation: { windowDays: number; medianCut: number; cutShare: number } | null
  sellerGap: { gap: number; dealerMedian: number; privateMedian: number } | null
  supply: { listings: number; sameYear: number | null }
}

/** Lo que hace falta de un aviso para la tabla de otros modelos y para saber si está limpio. */
export type CarInsightBandRow = Pick<
  PublicCarListing,
  | 'key'
  | 'marketSlug'
  | 'brand'
  | 'model'
  | 'year'
  | 'km'
  | 'priceUsd'
  | 'title'
  | 'flags'
  | 'risks'
  | 'currencyInferred'
>

export interface CarInsightInput {
  car: PublicCarListing
  /** Avisos vigentes del mismo modelo (el endpoint lee año ±2). Puede incluir al propio aviso. */
  peers: PublicCarListing[]
  /**
   * Candidatos de otros modelos para las tarjetas (el endpoint trae los más nuevos y los de menos km
   * de la banda de precio y carrocería del aviso, no un recorte cualquiera).
   */
  alternatives: PublicCarListing[]
  /**
   * La banda ENTERA, en filas livianas, para la tabla de modelos. Sin ella la tabla se arma con
   * `alternatives`, que es una muestra: los tests la omiten.
   */
  band?: CarInsightBandRow[]
  market: PublicCarMarketSnapshot | null
  report: PublicCarReportSnapshot | null
  advisor: PublicCarAdvisorSnapshot | null
  fuel: (CarAdvisorFuelPrices & { asOf: string | null }) | null
  /** Para la antigüedad que vuelve creíbles a los km; por defecto, hoy. */
  now?: Date
}

export function carInsightVerdict(gap: number): CarInsightVerdict {
  if (gap <= -0.15) return 'muy-bajo'
  if (gap <= -0.05) return 'bajo'
  if (gap <= 0.05) return 'justo'
  if (gap <= 0.15) return 'alto'
  return 'muy-alto'
}

/**
 * Lo que el título dice y el análisis de riesgo a veces no marca (medido el 2026-10-03: un Logan
 * "Deuda de patente" salía como "el más nuevo por la misma plata"). Lo negado no cuenta: "sin deuda"
 * es un argumento de venta, no una declaración.
 */
const TITLE_RISK =
  /\b(?:deudas?|chocad[oa]s?|choque|para repuestos?|recuperad[oa]|sin papeles|a reparar|motor fundido|no arranca|embargad[oa]|siniestrad[oa])\b/i
const TITLE_RISK_DENIED =
  /\b(?:sin|no tiene|libre de|cero|nunca)\s+(?:deudas?|chocad[oa]s?|choques?|siniestros?)\b/gi
const titleDeclaresRisk = (title: string): boolean =>
  TITLE_RISK.test(title.replace(TITLE_RISK_DENIED, ' '))

/** Ni riesgo declarado, ni marcas, ni moneda deducida: lo que vale como "el mercado". */
export const carInsightClean = (car: CarInsightBandRow): boolean =>
  !car.currencyInferred &&
  !car.flags.length &&
  !car.risks.length &&
  car.priceUsd > 0 &&
  !titleDeclaresRisk(car.title)

/** Kilometrajes de relleno que los vendedores escriben cuando no quieren poner el real. */
const PLACEHOLDER_KM = new Set([1, 1234, 12345, 123456, 111111, 99999, 999999])

/**
 * Los km del aviso si son creíbles; null si no. Un Gol 1988 con "12345 km" ganaba "el de menos km
 * por la misma plata": desde los tres años de antigüedad se exigen al menos 1.000 km por año, y nada
 * pasa de 600.000. Los km se siguen mostrando tal cual en la tarjeta; sólo no se usan para elegir.
 */
export function carInsightTrustedKm(
  car: Pick<PublicCarListing, 'km' | 'year'>,
  nowYear: number
): number | null {
  const km = car.km
  if (km === null || km < 0 || km > 600_000 || PLACEHOLDER_KM.has(km)) return null
  const age = nowYear - car.year
  if (age >= 3 && km < 1_000 * age) return null
  return km
}

function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return 0
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower)
}

const median = (values: readonly number[]): number =>
  quantile(
    [...values].sort((a, b) => a - b),
    0.5
  )

function positionOf(car: PublicCarListing, peers: PublicCarListing[]): CarInsightPosition | null {
  const sameYear = peers.filter(peer => peer.year === car.year)
  const sameVersion = car.trim ? sameYear.filter(peer => peer.trim === car.trim) : []
  let basis: CarInsightPosition['basis']
  let group: PublicCarListing[]
  if (sameVersion.length >= CAR_INSIGHT_MIN_PEERS) {
    basis = 'version'
    group = sameVersion
  } else if (sameYear.length >= CAR_INSIGHT_MIN_PEERS) {
    basis = 'year'
    group = sameYear
  } else {
    basis = 'years'
    group = peers.filter(peer => Math.abs(peer.year - car.year) <= 1)
    if (group.length < CAR_INSIGHT_MIN_PEERS) return null
  }
  const prices = group.map(peer => peer.priceUsd).sort((a, b) => a - b)
  const middle = quantile(prices, 0.5)
  const gap = car.priceUsd / middle - 1
  return {
    basis,
    yearFrom: basis === 'years' ? car.year - 1 : car.year,
    yearTo: basis === 'years' ? car.year + 1 : car.year,
    trim: basis === 'version' ? car.trim : null,
    n: prices.length,
    min: prices[0]!,
    p25: Math.round(quantile(prices, 0.25)),
    median: Math.round(middle),
    p75: Math.round(quantile(prices, 0.75)),
    max: prices[prices.length - 1]!,
    cheaperShare: prices.filter(price => price < car.priceUsd).length / prices.length,
    gap,
    verdict: carInsightVerdict(gap),
  }
}

function kmOf(
  car: PublicCarListing,
  km: number | null,
  market: PublicCarMarketSnapshot | null,
  report: PublicCarReportSnapshot | null
): CarInsightKm | null {
  if (!market || km === null) return null
  const coefficients = report?.data?.valuation ?? null
  if (coefficients?.km.value == null) return null
  const version = market.rows.find(
    row =>
      row.year === car.year &&
      row.n >= CAR_VALUATION_MIN_SAMPLE &&
      row.trim === car.trim &&
      row.engine === car.engine &&
      row.transmission === car.transmission
  )
  const estimate = estimateCarValue(market, coefficients, {
    year: car.year,
    km,
    rowKey: version
      ? [version.trim ?? '', version.engine ?? '', version.transmission ?? ''].join('|')
      : null,
  })
  if (!estimate) return null
  return {
    basis: estimate.basis,
    expected: estimate.mid,
    low: estimate.low,
    high: estimate.high,
    gap: car.priceUsd / estimate.mid - 1,
    kmFactor: estimate.kmFactor,
    kmCapped: estimate.kmCapped,
    kmMedian: estimate.row.kmMedian,
    perTenThousandUsd: Math.round(coefficients.km.value * estimate.row.median),
  }
}

/**
 * Precio pedido contra lo que el mercado pide por SU año con SUS km: mediana del año × el factor de
 * km del tasador. Menos de 1 = más barato que lo esperable. Null si el año no tiene muestra.
 */
function kmValueRatio(
  car: PublicCarListing,
  km: number | null,
  market: PublicCarMarketSnapshot | null,
  perTenThousand: number | null
): number | null {
  if (!market || km === null || perTenThousand === null) return null
  const year = market.years.find(row => row.year === car.year && row.n >= CAR_VALUATION_MIN_SAMPLE)
  if (!year || !(year.median > 0) || !(year.kmMedian > 0)) return null
  const raw = (1 - perTenThousand) ** ((km - year.kmMedian) / 10_000)
  const factor = Math.min(
    1 + CAR_VALUATION_MAX_KM_ADJUSTMENT,
    Math.max(1 - CAR_VALUATION_MAX_KM_ADJUSTMENT, raw)
  )
  return car.priceUsd / (year.median * factor)
}

const byNewest = (a: PublicCarListing, b: PublicCarListing): number =>
  b.year - a.year || (a.km ?? Infinity) - (b.km ?? Infinity) || a.priceUsd - b.priceUsd
const byLowestKm = (a: PublicCarListing, b: PublicCarListing): number =>
  (a.km ?? Infinity) - (b.km ?? Infinity) || b.year - a.year || a.priceUsd - b.priceUsd
const byCheapest = (a: PublicCarListing, b: PublicCarListing): number =>
  a.priceUsd - b.priceUsd || (a.km ?? Infinity) - (b.km ?? Infinity) || a.key.localeCompare(b.key)

function alternativesOf(
  car: PublicCarListing,
  others: readonly CarInsightBandRow[]
): CarInsightModelOption[] {
  const groups = new Map<string, CarInsightBandRow[]>()
  for (const other of others) {
    const list = groups.get(other.marketSlug) ?? []
    list.push(other)
    groups.set(other.marketSlug, list)
  }
  return [...groups.entries()]
    .filter(([slug, list]) => slug !== car.marketSlug && list.length >= 2)
    .map(([slug, list]) => {
      const kms = list.map(item => item.km).filter((km): km is number => km !== null)
      return {
        marketSlug: slug,
        brand: list[0]!.brand,
        model: list[0]!.model,
        adverts: list.length,
        medianUsd: Math.round(median(list.map(item => item.priceUsd))),
        medianYear: Math.round(median(list.map(item => item.year))),
        medianKm: kms.length ? Math.round(median(kms)) : null,
      }
    })
    .sort(
      (a, b) =>
        b.adverts - a.adverts ||
        b.medianYear - a.medianYear ||
        a.marketSlug.localeCompare(b.marketSlug)
    )
    .slice(0, 6)
}

function depreciationOf(
  car: PublicCarListing,
  market: PublicCarMarketSnapshot | null,
  report: PublicCarReportSnapshot | null,
  model: PublicCarAdvisorModel | null,
  typicalDrop: number | null
): CarInsightDepreciation | null {
  const curve = report?.data?.depreciation?.find(item => item.marketSlug === car.marketSlug) ?? null
  const own = curve?.annualDrop ?? model?.annualDrop ?? null
  const drop = own ?? typicalDrop
  if (drop === null || !(drop > 0)) return null
  const points = market
    ? market.years
        .filter(row => row.n >= CAR_VALUATION_MIN_SAMPLE)
        .map(row => ({ year: row.year, medianUsd: Math.round(row.median), n: row.n }))
    : (curve?.points ?? []).map(point => ({
        year: point.year,
        medianUsd: point.medianUsd,
        n: point.adverts,
      }))
  return {
    annualDrop: drop,
    fromMarket: own === null,
    inOneYearUsd: Math.round(car.priceUsd * (1 - drop)),
    lossPerYearUsd: Math.round(car.priceUsd * drop),
    points: points.sort((a, b) => a.year - b.year),
  }
}

const enoughShare = (share: PublicCarAdvisorShare | null): PublicCarAdvisorShare | null =>
  share && share.n >= SHARE_MIN_SHEETS ? share : null

export function buildCarInsight(input: CarInsightInput): CarInsight {
  const { car, market, report, advisor, fuel } = input
  const nowYear = (input.now ?? new Date()).getUTCFullYear()
  const trusted = (item: PublicCarListing) => carInsightTrustedKm(item, nowYear)
  const peers = input.peers.filter(peer => peer.key !== car.key && carInsightClean(peer))
  const position = positionOf(car, peers)
  // Los km del propio aviso pasan por la misma guarda: con "12345 km" en un 1988, el precio
  // "corregido por km" saldría inflado al tope y el aviso, primero en el orden.
  const ownKm = trusted(car)
  const km = kmOf(car, ownKm, market, report)
  const perTenThousand = report?.data?.valuation?.km.value ?? null

  // Las elecciones, en el orden en que la página las muestra. Un mismo aviso no aparece dos veces.
  const picks: CarInsightPick[] = []
  const used = new Set<string>()
  // Toma el primer candidato (ya ordenado) que no se mostró y que cumple la condición: si el más
  // nuevo por esta plata ya salió como "el mejor por sus km", la tarjeta pasa al siguiente.
  const pick = (
    kind: CarInsightPickKind,
    ordered: readonly PublicCarListing[],
    accept: (candidate: PublicCarListing) => boolean = () => true
  ) => {
    const candidate = ordered.find(item => !used.has(item.key) && accept(item))
    if (!candidate) return
    used.add(candidate.key)
    picks.push({ kind, car: candidate })
  }

  const sameCohort = position
    ? peers.filter(
        peer =>
          peer.year >= position.yearFrom &&
          peer.year <= position.yearTo &&
          (position.trim === null || peer.trim === position.trim)
      )
    : peers.filter(peer => peer.year === car.year)
  pick('cheapest-same', [...sameCohort].sort(byCheapest))

  let kmValue: CarInsight['kmValue'] = null
  const rated = peers
    .map(peer => ({ peer, ratio: kmValueRatio(peer, trusted(peer), market, perTenThousand) }))
    .filter((item): item is { peer: PublicCarListing; ratio: number } => item.ratio !== null)
    .sort((a, b) => a.ratio - b.ratio || byCheapest(a.peer, b.peer))
  const ownRatio = kmValueRatio(car, ownKm, market, perTenThousand)
  pick(
    'best-km-value',
    rated.filter(item => ownRatio === null || item.ratio < ownRatio).map(item => item.peer)
  )
  if (ownRatio !== null && rated.length) {
    kmValue = {
      rank: rated.filter(item => item.ratio < ownRatio).length + 1,
      of: rated.length + 1,
    }
  }

  const ceiling = car.priceUsd * CAR_INSIGHT_PRICE_STRETCH
  const affordable = peers.filter(peer => peer.priceUsd <= ceiling)
  pick(
    'lowest-km-for-price',
    affordable.filter(peer => trusted(peer) !== null).sort(byLowestKm),
    peer => ownKm === null || peer.km! < ownKm
  )
  pick('newest-for-price', [...affordable].sort(byNewest), peer => peer.year > car.year)

  const others = input.alternatives.filter(
    other =>
      other.marketSlug !== car.marketSlug && carInsightClean(other) && other.priceUsd <= ceiling
  )
  pick('other-newest', [...others].sort(byNewest), other => other.year >= car.year)
  pick(
    'other-lowest-km',
    others.filter(other => trusted(other) !== null).sort(byLowestKm),
    other => ownKm === null || other.km! < ownKm
  )

  const model = advisor?.data.models.find(item => item.marketSlug === car.marketSlug) ?? null
  const typicalDrop = advisor?.data.typicalDrop ?? null
  const depreciation = depreciationOf(car, market, report, model, typicalDrop)

  let costs: CarInsightCosts | null = null
  const usdUyu = advisor?.usdUyu ?? report?.usdUyu ?? null
  if (fuel && usdUyu) {
    const commonFuel =
      model?.variants.reduce<(typeof model.variants)[number] | null>(
        (best, variant) => (!best || variant.adverts > best.adverts ? variant : best),
        null
      )?.fuel ?? null
    const carFuel: PublicCarFuel = car.fuel ?? commonFuel ?? 'nafta'
    const variantConsumption =
      model?.variants.find(variant => variant.fuel === carFuel && variant.litersPer100Km !== null)
        ?.litersPer100Km ?? null
    const prices = { super95: fuel.super95, gasoil50s: fuel.gasoil50s }
    const result = carOwnershipCosts(
      {
        fuel: carFuel,
        litersPer100Km: car.fuelEconomy?.litersPer100Km ?? variantConsumption,
        partsIndex: model?.parts?.index ?? null,
        annualDrop: depreciation && !depreciation.fromMarket ? depreciation.annualDrop : null,
        priceUsd: car.priceUsd,
        year: car.year,
        kmYear: CAR_ADVISOR_DEFAULT_KM,
      },
      {
        usdUyu,
        typicalDrop,
        prices,
        fuelFallback: advisor ? carAdvisorFuelFallback(advisor) : new Map(),
      }
    )
    costs = {
      ...result,
      fuelUyu: Math.round(result.fuelUyu),
      patenteUyu: Math.round(result.patenteUyu),
      maintenanceUyu: Math.round(result.maintenanceUyu),
      depreciationUyu: Math.round(result.depreciationUyu),
      annualUyu: Math.round(result.annualUyu),
      monthlyCashUyu: Math.round(result.monthlyCashUyu),
      kmYear: CAR_ADVISOR_DEFAULT_KM,
      fuel: carFuel,
      fuelAssumed: car.fuel === null,
      usdUyu,
      fuelPrices: { ...prices, asOf: fuel.asOf },
    }
  }

  const parts =
    model?.parts && model.parts.parts.length >= PARTS_MIN_MEASURED
      ? {
          readAt: model.parts.readAt,
          index: model.parts.index,
          parts: model.parts.parts,
          baseline: advisor?.data.partsBaseline ?? [],
        }
      : null

  const negotiation = report?.data?.negotiation
  const gap = report?.data?.sellerGaps?.models.find(item => item.marketSlug === car.marketSlug)
  const sameYearRow = market?.years.find(row => row.year === car.year)

  return {
    position,
    km,
    kmValue,
    picks,
    alternatives: alternativesOf(car, (input.band ?? input.alternatives).filter(carInsightClean)),
    kmDoubtful: car.km !== null && ownKm === null,
    band: (input.band ?? input.alternatives).length
      ? {
          from: Math.round(car.priceUsd * CAR_INSIGHT_BAND_FLOOR),
          to: Math.round(ceiling),
          body: car.body?.type ?? null,
        }
      : null,
    depreciation,
    costs,
    parts,
    safety: {
      ncap: latinNcapResults(car.marketSlug, 3, car.year),
      abs: enoughShare(model?.abs ?? null),
      airbags: enoughShare(model?.airbags ?? null),
      esc: enoughShare(model?.esc ?? null),
    },
    negotiation:
      negotiation && negotiation.medianCut !== null && negotiation.changed >= 50
        ? {
            windowDays: negotiation.windowDays,
            medianCut: negotiation.medianCut,
            cutShare: negotiation.cut / negotiation.changed,
          }
        : null,
    sellerGap: gap
      ? { gap: gap.gap, dealerMedian: gap.dealerMedian, privateMedian: gap.privateMedian }
      : null,
    supply: { listings: market?.listings ?? 0, sameYear: sameYearRow?.n ?? null },
  }
}
