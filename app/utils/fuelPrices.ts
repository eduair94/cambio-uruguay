// Precios de combustibles: tipos, catálogo y helpers puros de /precio-de-la-nafta-uruguay.
// Sin imports de Vue/Nuxt: lo carga vitest-node y también el server (fallback).
import type { FaqItem } from './faqAnswers'

export type FuelKey = 'super95' | 'premium97' | 'gasoil50s' | 'gasoil10s' | 'queroseno' | 'supergas'

export interface FuelRow {
  from: string
  super95: number | null
  premium97: number | null
  gasoil50s: number | null
  gasoil10s: number | null
  queroseno: number | null
  supergas: number | null
}

export interface FuelResponse {
  asOf: string | null
  sourceUrl: string
  latest: FuelRow
  previous: FuelRow | null
  rows: FuelRow[]
}

export interface FuelProduct {
  key: FuelKey
  label: string
  short: string
  unit: 'litro' | 'kg'
}

export const FUEL_PRODUCTS: readonly FuelProduct[] = [
  { key: 'super95', label: 'Nafta Súper 95', short: 'Súper 95', unit: 'litro' },
  { key: 'premium97', label: 'Nafta Premium 97', short: 'Premium 97', unit: 'litro' },
  { key: 'gasoil50s', label: 'Gasoil 50-S', short: 'Gasoil 50-S', unit: 'litro' },
  { key: 'gasoil10s', label: 'Gasoil 10-S', short: 'Gasoil 10-S', unit: 'litro' },
  { key: 'queroseno', label: 'Queroseno', short: 'Queroseno', unit: 'litro' },
  { key: 'supergas', label: 'Supergás', short: 'Supergás', unit: 'kg' },
]

export const FUEL_VERIFIED_AT = '2026-09-15'

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** "setiembre 2026" a partir de una vigencia ISO. Uruguay escribe setiembre. */
export function monthLabel(from: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(from ?? '')
  if (!m) return ''
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${month} ${m[1]}` : ''
}

/** La vigencia siguiente a una ISO: el próximo día 1 en el que el precio puede cambiar. */
export function nextMonthLabel(from: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(from ?? '')
  if (!m) return ''
  const month = Number(m[2])
  const year = month === 12 ? Number(m[1]) + 1 : Number(m[1])
  const next = month === 12 ? 1 : month + 1
  return monthLabel(`${year}-${String(next).padStart(2, '0')}-01`)
}

const round2 = (n: number): number => Math.round(n * 100) / 100

export function formatUyu(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$ ${n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface Change {
  abs: number
  pct: number
}

export function changeBetween(
  before: number | null | undefined,
  after: number | null | undefined
): Change | null {
  if (
    before == null ||
    after == null ||
    !Number.isFinite(before) ||
    !Number.isFinite(after) ||
    before === 0
  )
    return null
  return { abs: round2(after - before), pct: round2(((after - before) / before) * 100) }
}

export interface LastChange extends Change {
  from: string
  before: number
  after: number
}

/**
 * La última vigencia en la que ese producto cambió de precio, y cuánto.
 *
 * Compara valores NO NULOS consecutivos, saltando los huecos: una vigencia que no trae ese
 * producto no es un cambio de precio, y tratarla como corte escondería el cambio que hay a sus
 * dos lados (un solo null en el medio de la serie dejaba el producto como "sin cambios").
 */
export function lastChange(rows: readonly FuelRow[], key: FuelKey): LastChange | null {
  // La fila no nula más reciente que se vio, con la vigencia desde la que rige ese valor.
  let newer: { from: string; value: number } | null = null
  for (let i = rows.length - 1; i >= 0; i--) {
    const value = rows[i]![key]
    if (value == null) continue
    if (newer != null && value !== newer.value) {
      const c = changeBetween(value, newer.value)
      // Un salto desde cero no tiene porcentaje. Se sigue mirando hacia atrás en busca de un
      // cambio que sí se pueda expresar, en vez de contestar "sin cambios", que sería falso.
      if (c) return { from: newer.from, before: value, after: newer.value, ...c }
    }
    newer = { from: rows[i]!.from, value }
  }
  return null
}

/** La fila vigente doce meses antes de `latestFrom` (misma vigencia del año anterior). */
export function yearAgo(rows: readonly FuelRow[], latestFrom: string): FuelRow | null {
  const m = /^(\d{4})-(\d{2}-\d{2})$/.exec(latestFrom ?? '')
  if (!m) return null
  const wanted = `${Number(m[1]) - 1}-${m[2]}`
  return rows.find(r => r.from === wanted) ?? null
}

export interface FuelSource {
  label: string
  url: string
}

export const FUEL_SOURCES: readonly FuelSource[] = [
  {
    label: 'ANCAP — Histórico de precios de combustibles',
    url: 'https://www.ancap.com.uy/10564/5/historico-precios-combustibles.html',
  },
  {
    label: 'ANCAP — Decretos de precios',
    url: 'https://www.ancap.com.uy/4898/5/decretos-precios.html',
  },
  {
    label: 'MIEM — Tarifas y precios de combustibles',
    url: 'https://www.gub.uy/ministerio-industria-energia-mineria/tematica/tarifas',
  },
  {
    label: 'URSEA — Precios de paridad de importación (PPI)',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/tematica/paridad-precios-importacion-ppi',
  },
  {
    label: 'Catálogo de Datos Abiertos — PPI de combustibles líquidos',
    url: 'https://catalogodatos.gub.uy/dataset/ursea-ppi_vs_pe_v2',
  },
]

export const FUEL_HOW_IT_WORKS: ReadonlyArray<{ heading: string; body: string }> = [
  {
    heading: 'URSEA calcula cada mes el precio de paridad de importación',
    body: 'La Unidad Reguladora de los Servicios de Energía y Agua publica todos los meses el precio de paridad de importación (PPI): lo que costaría traer nafta, gasoil y supergás terminados en vez de refinarlos en ANCAP. Es la referencia técnica, no el precio en el surtidor.',
  },
  {
    heading: 'El Poder Ejecutivo fija el precio por decreto',
    body: 'Con ese informe, los ministerios de Economía y de Industria deciden el precio de venta al público y lo firman por decreto, normalmente en los últimos días del mes. Pueden seguir el PPI o apartarse: en 2026 el Gobierno anunció que amortigua parte de la suba del petróleo por el conflicto en Medio Oriente.',
  },
  {
    heading: 'Rige el día 1 y es igual en todo el país',
    body: 'El precio nuevo entra en vigencia el primer día del mes y es uniforme en todo el territorio: una estación de Artigas cobra lo mismo que una de Montevideo. Lo que sí cambia entre estaciones son las promociones y los descuentos con tarjeta.',
  },
  {
    heading: 'El IMESI de las naftas se ajusta en enero',
    body: 'Las naftas pagan IMESI, un impuesto específico que el Ejecutivo actualiza a comienzos de cada año. Por eso los cambios de enero suelen mezclar dos cosas: la variación del petróleo y la del impuesto.',
  },
]

export function buildFuelFaq(
  latest: FuelRow,
  previous: FuelRow | null,
  rows: readonly FuelRow[]
): FaqItem[] {
  const month = monthLabel(latest.from)
  // Sin vigencia legible no se escribe "desde el 1.º de ." — la cláusula entera desaparece.
  const since = month ? ` desde el 1.º de ${month}` : ''
  const next = nextMonthLabel(latest.from)
  const superChange = changeBetween(previous?.super95, latest.super95)
  const last = lastChange(rows, 'super95')
  // Nombre de la vigencia anterior, con salida por si esa fila viniera sin fecha legible.
  const prevRef = (previous ? monthLabel(previous.from) : '') || 'la vigencia anterior'
  const movement =
    superChange == null || previous == null
      ? 'Todavía no hay una vigencia anterior para comparar con la que rige hoy.'
      : superChange.abs === 0
        ? `Este mes la Súper 95 no cambió: sigue a ${formatUyu(latest.super95)} el litro, igual que en ${prevRef}.`
        : `La Súper 95 ${superChange.abs > 0 ? 'subió' : 'bajó'} ${formatUyu(Math.abs(superChange.abs))} por litro (${Math.abs(superChange.pct).toLocaleString('es-UY')} %) respecto de ${prevRef}, y ese precio rige${since || ' desde el 1.º de este mes'}.`
  const lastMove =
    last == null
      ? ''
      : ` La última vez que se movió fue en ${monthLabel(last.from) || 'una vigencia anterior'}: pasó de ${formatUyu(last.before)} a ${formatUyu(last.after)}.`
  return [
    {
      id: 'cuanto-sale-la-nafta',
      question: '¿Cuánto sale el litro de nafta hoy en Uruguay?',
      answer: `La Nafta Súper 95 vale ${formatUyu(latest.super95)} el litro y la Premium 97 ${formatUyu(latest.premium97)}, precios vigentes${since} y fijados por decreto para todo el país.`,
    },
    {
      id: 'cuanto-subio-la-nafta',
      question: '¿Cuánto subió o bajó la nafta este mes?',
      answer: `${movement}${lastMove}`,
    },
    {
      id: 'cuando-cambia-el-precio',
      question: '¿Cuándo cambia el precio de los combustibles?',
      answer: `Los precios se revisan mes a mes: URSEA publica su informe de paridad de importación, el Poder Ejecutivo decide y firma el decreto en los últimos días del mes, y el precio nuevo rige desde el día 1.${next ? ` El próximo cambio posible es el 1.º de ${next}.` : ''}`,
    },
    {
      id: 'cuanto-sale-el-gasoil',
      question: '¿Cuánto sale el gasoil?',
      answer: `El Gasoil 50-S vale ${formatUyu(latest.gasoil50s)} el litro y el Gasoil 10-S ${formatUyu(latest.gasoil10s)}${since ? `, vigentes${since}` : ''}. Los dos son gasoil: cambia el contenido de azufre, no el motor que lo usa.`,
    },
    {
      id: 'cuanto-sale-el-supergas',
      question: '¿Cuánto sale el supergás?',
      answer: `El supergás vale ${formatUyu(latest.supergas)} por kilo${since}. El precio de la garrafa depende de su tamaño y del distribuidor; ANCAP publica el valor por kilo.`,
    },
    {
      id: 'quien-fija-el-precio',
      question: '¿Quién fija el precio de la nafta en Uruguay?',
      answer:
        'El Poder Ejecutivo, por decreto de los ministerios de Economía y de Industria, con el informe mensual de precios de paridad de importación de URSEA como referencia. ANCAP produce y distribuye, pero no decide el precio de venta al público.',
    },
    {
      id: 'por-que-la-premium-sale-mas',
      question: '¿Por qué la Premium 97 sale más que la Súper 95?',
      answer: `Tiene más octanaje (97 contra 95) y un proceso de refinación distinto. La diferencia hoy es de ${formatUyu(changeBetween(latest.super95, latest.premium97)?.abs ?? null)} por litro. Sólo conviene si el manual del auto la pide.`,
    },
    {
      id: 'es-igual-en-todo-el-pais',
      question: '¿El precio es el mismo en todas las estaciones?',
      answer:
        'Sí, el precio de venta al público es uniforme en todo el país por decreto. Lo que cambia son las promociones por día, las apps de fidelidad y los descuentos con tarjeta, que pueden bajar el gasto real entre 5 y 20 %.',
    },
  ]
}
