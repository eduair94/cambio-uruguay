// app/utils/rentalBarrioCopy.ts
// Los textos de /alquiler/<departamento>/<barrio>: título, descripción, intro, ranking y FAQ.
// Puro (sin Vue ni I/O) para que cada regla de copy se pruebe en vitest. Una pregunta frecuente
// sólo existe si hay un dato que la conteste: nada de "consultá con una inmobiliaria".
import type { FaqItem } from './faqAnswers'
import type { RentalBarrioCell, RentalBarrioPage } from './rentalBarrio'
import type { RentalZoneBedrooms, RentalZonePropertyType } from './rentalZoneTypes'

export const BEDROOM_LABEL: Record<RentalZoneBedrooms, string> = {
  any: 'Todos',
  '0': 'Monoambiente',
  '1': '1 dormitorio',
  '2': '2 dormitorios',
  '3': '3 dormitorios',
  '4plus': '4 o más dormitorios',
}

/** Presupuesto del `<title>` medido CON la marca, como `tests/unit/seoTitleBudget.test.ts`. */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155
/** Espejo del titleTemplate de app.vue: la marca se agrega sólo si no está ya. */
const withBrand = (title: string) =>
  /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`

const uyu = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Montevideo',
})

export function formatUyu(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `$ ${uyu.format(value)}`
}

/** "4 de octubre de 2026" desde `rentalDataAsOf` (o `generatedAt`), en hora de Montevideo. */
export function rentalBarrioDate(
  page: Pick<RentalBarrioPage, 'rentalDataAsOf' | 'generatedAt'>
): string | null {
  const raw = page.rentalDataAsOf ?? page.generatedAt
  const time = Date.parse(raw ?? '')
  return Number.isFinite(time) ? dateFormat.format(new Date(time)) : null
}

const cellOf = (
  page: RentalBarrioPage,
  type: RentalZonePropertyType,
  bedrooms: RentalZoneBedrooms
) =>
  page.cells.find(
    cell =>
      cell.propertyType === type && cell.bedrooms === bedrooms && cell.prices.rent.median !== null
  ) ?? null

/** "apartamento de 2 dormitorios", "monoambiente", "casa". */
function subject(type: RentalZonePropertyType, bedrooms: RentalZoneBedrooms): string {
  if (bedrooms === '0') return 'monoambiente'
  if (bedrooms === 'any') return type
  return `${type} de ${BEDROOM_LABEL[bedrooms]}`
}

const range = (cell: RentalBarrioCell) => {
  const { p25, p75 } = cell.prices.rent
  return p25 !== null && p75 !== null ? ` (entre ${formatUyu(p25)} y ${formatUyu(p75)})` : ''
}

export function rentalBarrioTitle(page: Pick<RentalBarrioPage, 'neighborhood'>): string {
  const variants = [
    `Alquiler en ${page.neighborhood}: cuánto cuesta hoy`,
    `Alquiler en ${page.neighborhood}: precios hoy`,
    `Alquiler en ${page.neighborhood}`,
  ]
  // Un nombre propio no se corta: si ni la última entra, se publica igual.
  return (
    variants.find(title => withBrand(title).length <= MAX_TITLE) ?? variants[variants.length - 1]!
  )
}

const DESCRIPTION_CELLS: ReadonlyArray<readonly [RentalZonePropertyType, RentalZoneBedrooms]> = [
  ['apartamento', '2'],
  ['apartamento', '1'],
  ['apartamento', 'any'],
  ['casa', 'any'],
]

export function rentalBarrioDescription(page: RentalBarrioPage): string {
  const place = `${page.neighborhood} (${page.department})`
  const date = rentalBarrioDate(page)
  const when = date ? ` Datos del ${date}.` : ''
  const best =
    DESCRIPTION_CELLS.map(([type, bedrooms]) => cellOf(page, type, bedrooms)).find(Boolean) ?? null
  if (!best)
    return `Alquilar en ${place}: precios pedidos por apartamentos y casas, con gastos comunes y rango por dormitorio.${when}`
  const lead = `Alquilar en ${place}: ${subject(best.propertyType, best.bedrooms)} a ${formatUyu(best.prices.rent.median)} por mes de mediana`
  const full = `${lead}, con gastos comunes y rango por dormitorio.${when}`
  // El dato y la fecha van adelante: si no entra en el SERP, se cae la coletilla, no la cifra.
  return full.length <= MAX_DESCRIPTION ? full : `${lead}.${when}`
}

export function rentalBarrioIntro(page: RentalBarrioPage): string {
  const sentences: string[] = []
  for (const bedrooms of ['1', '2', '3'] as const) {
    const cell = cellOf(page, 'apartamento', bedrooms)
    if (cell)
      sentences.push(
        `${BEDROOM_LABEL[bedrooms]}: ${formatUyu(cell.prices.rent.median)} de mediana${range(cell)}.`
      )
  }
  const head = `Lo que se pide por mes por un apartamento en alquiler en ${page.neighborhood}, ${page.department}.`
  const all = cellOf(page, 'apartamento', 'any')
  const count = all
    ? `Sale de ${all.prices.rent.count} ${all.prices.rent.count === 1 ? 'aviso' : 'avisos'} de apartamentos vigentes.`
    : ''
  if (!sentences.length && !all) {
    return `Lo que se pide por mes por una vivienda en alquiler en ${page.neighborhood}, ${page.department}, según los avisos vigentes.`
  }
  return [head, ...sentences, count].filter(Boolean).join(' ')
}

export function rentalBarrioRankSentence(page: RentalBarrioPage): string | null {
  const rank = page.rank
  if (!rank || rank.of < 3) return null
  return `${page.neighborhood} es el ${rank.position}.º barrio más caro de ${page.department} para un ${subject(rank.propertyType, rank.bedrooms)}, entre ${rank.of} con datos.`
}

export function rentalBarrioFaq(page: RentalBarrioPage): FaqItem[] {
  const items: FaqItem[] = []
  const barrio = page.neighborhood
  const date = rentalBarrioDate(page)
  const read = date ? `, leídos el ${date}` : ''

  for (const bedrooms of ['1', '2', '3'] as const) {
    const cell = cellOf(page, 'apartamento', bedrooms)
    if (!cell) continue
    const { median, p25, p75, count } = cell.prices.rent
    const spread =
      p25 !== null && p75 !== null
        ? ` La mitad de los avisos pide entre ${formatUyu(p25)} y ${formatUyu(p75)}.`
        : ''
    items.push({
      id: `barrio-precio-${bedrooms}-dormitorios`,
      question: `¿Cuánto cuesta alquilar un apartamento de ${BEDROOM_LABEL[bedrooms]} en ${barrio}?`,
      answer: `Un apartamento de ${BEDROOM_LABEL[bedrooms]} en ${barrio} se pide a ${formatUyu(median)} por mes de mediana.${spread} Sale de ${count} ${count === 1 ? 'aviso vigente' : 'avisos vigentes'}${read}; son precios pedidos, no de contratos firmados.`,
    })
  }

  const all = cellOf(page, 'apartamento', 'any')
  const expenses = all?.prices.commonExpenses
  if (all && expenses && expenses.median !== null) {
    const spread =
      expenses.p25 !== null && expenses.p75 !== null
        ? ` (la mitad, entre ${formatUyu(expenses.p25)} y ${formatUyu(expenses.p75)})`
        : ''
    const total =
      all.prices.monthlyTotal.median !== null
        ? ` Sumados al alquiler, el total mensual tiene una mediana de ${formatUyu(all.prices.monthlyTotal.median)}.`
        : ''
    items.push({
      id: 'barrio-gastos-comunes',
      question: `¿Cuánto son los gastos comunes en ${barrio}?`,
      answer: `Entre los apartamentos de ${barrio} que publican gastos comunes, la mediana es de ${formatUyu(expenses.median)} por mes${spread}, sobre ${expenses.count} ${expenses.count === 1 ? 'aviso' : 'avisos'}.${total} Dependen del edificio: portería, ascensor y amenities los suben.`,
    })
  }

  const rankSentence = rentalBarrioRankSentence(page)
  if (rankSentence && page.rank) {
    const median =
      cellOf(page, page.rank.propertyType, page.rank.bedrooms)?.prices.rent.median ?? null
    const third = page.rank.of / 3
    const verdict =
      page.rank.position <= third
        ? 'Está entre los más caros del departamento.'
        : page.rank.position > page.rank.of - third
          ? 'Está entre los más baratos del departamento.'
          : 'Está en la mitad de la tabla del departamento.'
    items.push({
      id: 'barrio-caro',
      question: `¿${barrio} es caro comparado con el resto de ${page.department}?`,
      answer: `${rankSentence} ${verdict}${median !== null ? ` La mediana que se pide es de ${formatUyu(median)} por mes.` : ''}`,
      link: { to: '/barrios-alquileres-uruguay', label: 'Comparar barrios' },
    })
  }

  items.push({
    id: 'barrio-garantia',
    question: `¿Qué garantía piden para alquilar en ${barrio}?`,
    answer: `En ${barrio} se piden las mismas garantías que en el resto del país, y cada aviso dice cuáles acepta. Las más comunes son la de ANDA, la de la Contaduría General de la Nación (CGN), que cobra el alquiler descontándolo del sueldo, un seguro de fianza de una aseguradora y el depósito en garantía en el Banco Hipotecario (BHU). Conviene preguntar cuál aceptan antes de ir a ver la vivienda.`,
    link: { to: '/garantia-de-alquiler-uruguay', label: 'Garantías de alquiler' },
  })
  return items
}
