// El informe del mercado de autos usados: /mercado-de-autos-usados-uruguay.
//
// Todo lo que muestra sale de los avisos que el directorio ya tiene. La distinción que la página
// repite —y que este archivo tiene que sostener— es que un aviso es OFERTA y no una venta.
import type {
  PublicCarFuel,
  PublicCarReportSnapshot,
  PublicCarSeller,
  PublicCarTransmission,
} from './carsPublic'

export const CAR_REPORT_PATH = '/mercado-de-autos-usados-uruguay'

export const CAR_REPORT_FUEL_LABELS: Record<PublicCarFuel | 'unknown', string> = {
  nafta: 'Nafta',
  diesel: 'Diésel',
  electrico: 'Eléctrico',
  hibrido: 'Híbrido',
  gnc: 'GNC',
  unknown: 'Sin dato',
}
export const CAR_REPORT_TRANSMISSION_LABELS: Record<PublicCarTransmission | 'unknown', string> = {
  manual: 'Manual',
  automatica: 'Automática',
  unknown: 'Sin dato',
}
export const CAR_REPORT_SELLER_LABELS: Record<PublicCarSeller | 'unknown', string> = {
  dealer: 'Automotora',
  private: 'Dueño',
  unknown: 'Sin dato',
}

export interface CarReportResponse {
  generatedAt: string
  usdUyu: number
  data: PublicCarReportSnapshot['data']
}

/** "US$ 12.500" sin decimales: en este mercado los centavos son ruido. */
export const carReportUsd = (value: number | null): string =>
  value === null ? 'sin dato' : `US$ ${Math.round(value).toLocaleString('es-UY')}`

export const carReportPercent = (value: number | null, digits = 0): string =>
  value === null ? 'sin dato' : `${(value * 100).toFixed(digits).replace('.', ',')} %`

export const carReportKm = (value: number | null): string =>
  value === null ? 'sin dato' : `${Math.round(value).toLocaleString('es-UY')} km`

/** La franja de precio, escrita como la lee alguien que está buscando. */
export const carReportBandLabel = (from: number, to: number | null): string =>
  to === null
    ? `más de ${carReportUsd(from)}`
    : from === 0
      ? `hasta ${carReportUsd(to)}`
      : `${carReportUsd(from)} a ${carReportUsd(to)}`

/**
 * Cuántos años de auto compra un año menos de antigüedad: la caída anual dicha al revés, que es como
 * se toma la decisión ("si espero un año y compro uno más viejo, me ahorro X").
 */
export const carReportSavingPerYear = (medianUsd: number, annualDrop: number | null): string =>
  annualDrop === null ? 'sin dato' : carReportUsd(Math.round(medianUsd * annualDrop))

export interface CarReportFinding {
  title: string
  body: string
  /** A quién le sirve: la misma medición se lee distinto de cada lado del mostrador. */
  audience: 'compra' | 'vende' | 'ambos'
}

/** Umbrales de segmento: arriba y abajo de estos precios medianos por modelo. */
const BIG_CAR_USD = 22_000
const SMALL_CAR_USD = 12_000

const medianOf = (values: readonly number[]): number | null => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/**
 * Cuánto pierde un auto típico por año de antigüedad: la mediana de la caída de los modelos con
 * curva. Una sola función para el informe y la guía de venta, que antes lo calculaban distinto.
 */
export const carReportTypicalDrop = (report: CarReportResponse['data']): number | null =>
  medianOf(report.models.filter(model => model.annualDrop !== null).map(model => model.annualDrop!))

export interface CarReportDebtEvidence {
  medianGap: number | null
  p25Gap: number | null
  measured: number
}

/**
 * Las conclusiones del informe, calculadas desde los datos: cada una aparece sólo si la medición que
 * la sostiene está, y dice su número. Ninguna es texto fijo, porque un "los autos grandes pierden el
 * doble" escrito a mano sigue diciéndolo el día que deja de ser cierto.
 */
export function carReportFindings(
  report: CarReportResponse['data'],
  debt: CarReportDebtEvidence | null = null
): CarReportFinding[] {
  const findings: CarReportFinding[] = []

  const withDrop = report.models.filter(model => model.annualDrop !== null)
  const big = withDrop.filter(model => model.price.median >= BIG_CAR_USD)
  const small = withDrop.filter(model => model.price.median <= SMALL_CAR_USD)
  const bigDrop = big.length >= 3 ? medianOf(big.map(model => model.annualDrop!)) : null
  const smallDrop = small.length >= 3 ? medianOf(small.map(model => model.annualDrop!)) : null
  if (bigDrop !== null && smallDrop !== null && bigDrop > smallDrop) {
    findings.push({
      title: 'Los autos grandes pierden valor mucho más rápido',
      body: `Los modelos que se piden por más de ${carReportUsd(BIG_CAR_USD)} pierden ${carReportPercent(bigDrop, 1)} por año de antigüedad; los de menos de ${carReportUsd(SMALL_CAR_USD)}, ${carReportPercent(smallDrop, 1)}. Si comprás un SUV o una pick-up grande, uno de pocos años ya absorbió la parte más cara de esa caída; si lo tenés y dudás en vender, cada año te cuesta más que a quien tiene un auto chico.`,
      audience: 'ambos',
    })
  }

  const valuation = report.valuation
  if (valuation.automatic.value !== null && valuation.automaticWithTrim.value !== null) {
    findings.push({
      title: 'La caja automática vale menos de lo que parece',
      body: `Contra la manual de la misma versión, la automática se pide ${carReportPercent(valuation.automatic.value, 1)} más. Contra la manual del mismo modelo y año sin fijar la versión, ${carReportPercent(valuation.automaticWithTrim.value, 1)}: el resto es el equipamiento con el que suele venir. Si pagás esa diferencia, fijate qué versión estás comprando.`,
      audience: 'ambos',
    })
  }

  const negotiation = report.negotiation
  if (negotiation.changed >= 50) {
    const cuts = negotiation.cut / negotiation.changed
    if (cuts >= 0.7) {
      findings.push({
        title: 'Es un mercado de compradores',
        body: `De cada 10 avisos que cambian de precio, ${Math.round(cuts * 10)} bajan, con un recorte mediano de ${carReportPercent(negotiation.medianCut, 1)}. Los vendedores publican alto y corrigen después: quien compra tiene margen, y quien vende gana tiempo publicando en el precio de mercado desde el principio.`,
        audience: 'ambos',
      })
    }
  }

  const gaps = report.sellerGaps
  if (gaps.median !== null) {
    const reversed = gaps.models
      .filter(model => model.gap < 0)
      .map(model => `${model.brand} ${model.model}`)
    const reversedText = reversed.length
      ? ` En ${reversed.slice(0, 3).join(', ')}${reversed.length > 3 ? ' y otros' : ''} la automotora pide incluso menos.`
      : ''
    findings.push({
      title: 'La automotora cobra poco más que el dueño',
      body: `Por el mismo modelo y año, una automotora pide ${carReportPercent(gaps.median, 1)} más que un particular.${reversedText} Con una diferencia así, la garantía y la transferencia hecha pueden valer más que el ahorro.`,
      audience: 'compra',
    })
  }

  // Sólo si TODO el 50 % central es descuento y hay muestra: con 6-7 avisos la deuda dio −21 % y con
  // 13 dio −2 %, cruzando el cero. Un hallazgo que se da vuelta con la próxima lectura no se publica.
  if (
    debt &&
    debt.medianGap !== null &&
    debt.p25Gap !== null &&
    debt.p25Gap > 0 &&
    debt.measured >= 10
  ) {
    findings.push({
      title: 'Una deuda declarada se descuenta',
      body: `Los avisos que dicen tener deuda de patente, prenda o embargo se piden ${carReportPercent(debt.medianGap, 0)} menos que el mismo auto sin nada (${debt.measured} avisos comparables). Si la deuda es menor que ese descuento, quien compra puede salir ganando pagándola —siempre que la confirme en el certificado del SUCIVE y en el registral antes de señar—.`,
      audience: 'compra',
    })
  }

  if (valuation.km.value !== null) {
    const fifty = 1 - (1 - valuation.km.value) ** 5
    // Un año típico en Uruguay son unos 15.000 km: la comparación sólo se afirma si los datos la dan.
    const perYearOfKm = 1 - (1 - valuation.km.value) ** 1.5
    const typicalDrop = carReportTypicalDrop(report)
    const ageWins = typicalDrop !== null && typicalDrop > perYearOfKm * 1.5
    findings.push({
      title: ageWins ? 'Los kilómetros pesan menos que el año' : 'Cuánto pesan los kilómetros',
      body:
        `Dentro del mismo modelo y año, cada 10.000 km de diferencia son ${carReportPercent(valuation.km.value, 1)} de precio: 50.000 km de más, ${carReportPercent(fifty, 0)}.` +
        (ageWins
          ? ` Un año más de antigüedad, en cambio, pesa ${carReportPercent(typicalDrop, 1)}: más del doble de lo que se maneja en un año.`
          : '') +
        ' Para quien vende: decir los kilómetros reales te cuesta menos que un aviso que nadie puede comparar.',
      audience: 'vende',
    })
  }

  return findings
}
