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
