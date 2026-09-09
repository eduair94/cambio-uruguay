// El sobre de tasas del plan de vida: dos endpoints del backend en una forma.
//
// Función pura y con test propio por la lección de la canasta medida: una
// proyección inline que deja un campo afuera no falla, no avisa, y la sección
// simplemente no aparece.
//
// El segmento importa. La deuda de consumo CON autorización de descuento del
// sueldo tiene 21,16 % de tasa media y la de SIN autorización 80,72 %:
// confundirlas invierte el orden de la cascada, que es lo único que la cascada
// tiene para ofrecer.
//
// Y siempre la MEDIA, nunca el tope: el tope es el máximo que la Ley 18.212
// permite cobrar (122,23 % en ese segmento), no lo que la gente paga.
import type { LifePlanRates } from '../../utils/lifePlan'

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null)

/** La media del segmento cuyo nombre matchea, o null. */
function mediaOf(caps: unknown, pattern: RegExp): number | null {
  if (!Array.isArray(caps)) return null
  for (const row of caps) {
    if (!row || typeof row !== 'object') continue
    const segmento = (row as Record<string, unknown>).segmento
    if (typeof segmento !== 'string' || !pattern.test(segmento)) continue
    return num((row as Record<string, unknown>).tasaMedia)
  }
  return null
}

export function projectLifePlanRates(financing: unknown, debt: unknown): LifePlanRates {
  const financingObj =
    financing && typeof financing === 'object' ? (financing as Record<string, unknown>) : undefined
  const f = financingObj?.figures as Record<string, unknown> | undefined
  const d = debt && typeof debt === 'object' ? (debt as Record<string, unknown>) : undefined

  return {
    plazoFijoBrou: num(f?.plazoFijoBrou),
    fondoPesos: num(f?.fondoPesos),
    inflacion: num(f?.inflacion),
    deudaSinDescuento: mediaOf(d?.usuryCaps, /sin autorizaci/i),
    deudaConDescuento: mediaOf(d?.usuryCaps, /con autorizaci/i),
    asOfRates: str(financingObj?.asOf),
    asOfDebt: str(d?.asOf),
  }
}
