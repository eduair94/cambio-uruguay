// Una página por institución del tarifario IAMC: `/mutualista/<id>`.
//
// POR QUÉ. La demanda ganable de este sitio es de MARCA, y acá la marca es la mutualista: quien
// busca escribe «casmu precio ticket» o «comepa orden especialista», no «tasas moderadoras».
// `/tickets-mutualistas-uruguay` ya compara las 34 instituciones y deja elegir concepto y régimen,
// pero una sola URL no puede reclamar 34 nombres propios: es el mismo reparto que el sitio ya hace
// entre `/historico` (el hub lista todas) y `/historico/<casa>` (la página contesta el nombre).
//
// QUÉ AGREGA ESTA PÁGINA QUE EL HUB NO DA. Dos cosas, y ninguna es una cifra nueva:
//
//  1. El tarifario ENTERO de UNA institución en una pantalla — los cinco conceptos a la vez. El hub
//     muestra un concepto por vez porque compara entre instituciones; acá no hay que elegir.
//  2. Dónde cae esa institución entre las 34. El máximo autorizado del especialista va de $ 207,10
//     a $ 875,68 (4,2×) sobre el mismo archivo, y eso sólo se ve poniendo una al lado de las otras.
//
// LO QUE NO HACE, que es lo que `mutualistaCosts.ts` ya decidió y acá no se afloja:
//
//  - No elige un precio por el lector. «PRECIO 1» no es «el precio general» y un número suelto en
//    la fila auxiliar no identifica un convenio, así que por régimen se publica el RANGO de lo que
//    el MSP imprime y nunca un importe como «el» que le toca a nadie.
//  - Un CERO no es una exoneración. Se cuenta aparte y se dice que es lo que el archivo publica,
//    no un beneficio (CUDAM publica $ 0,00 en urgencia centralizada).
//  - Los importes son SIN IVA ni timbres, como los publica el MSP.
//  - Una contradicción del origen (una columna por encima del máximo de la columna F) se conserva y
//    se muestra; no se corrige ni se esconde.
//
// PURE module (sin runtime de Vue/Nuxt, imports relativos).

import {
  MUTUALISTA_COSTS,
  MUTUALISTA_COST_CONCEPTS,
  MUTUALISTA_COST_SOURCE,
  getMutualistaCostRows,
  normalizeMutualistaAmount,
  type MutualistaCostAffiliation,
  type MutualistaCostConceptId,
  type MutualistaCostInstitution,
} from './mutualistaCosts'

/** El hub del que cuelga la familia: el mismo rastro que el lector ve arriba de la página. */
export const MUTUALISTA_INDEX_PATH = '/tickets-mutualistas-uruguay'
export const MUTUALISTA_INDEX_LABEL = 'Tickets y órdenes de mutualistas'

const AFFILIATION_ORDER: readonly MutualistaCostAffiliation[] = [
  'fonasa',
  'no-fonasa',
  'sanidad-policial',
]

const AFFILIATION_LABELS: Readonly<Record<MutualistaCostAffiliation, string>> = {
  fonasa: 'FONASA',
  'no-fonasa': 'No FONASA',
  'sanidad-policial': 'Sanidad Policial',
}

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
] as const

/** `2026-07-01` → `julio de 2026`. Sin `Date`: la fecha del origen es un día calendario, no un instante. */
export function mutualistaMonthLabel(isoDate: string): string {
  const [year, month] = isoDate.split('-')
  const index = Number(month) - 1
  return MONTHS[index] && year ? `${MONTHS[index]} de ${year}` : isoDate
}

/** `2026-07-01` → `1 de julio de 2026`. */
export function mutualistaDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  const index = Number(month) - 1
  return MONTHS[index] && year && day ? `${Number(day)} de ${MONTHS[index]} de ${year}` : isoDate
}

/**
 * El nombre que se imprime.
 *
 * Es el campo INSTITUCIÓN del archivo del MSP y nunca una identidad inferida: no se expande una
 * sigla, no se traduce y no se completa un nombre comercial. Lo único que cambia es la CAJA cuando
 * el archivo lo escribió en minúscula (`comeflo`, `smqs`), porque eso es cómo se tipeó la celda y
 * no un nombre distinto — y un `<h1>` en minúscula se lee como un error del sitio, no del origen.
 */
export function mutualistaDisplayName(name: string): string {
  const trimmed = name.trim()
  return trimmed && trimmed === trimmed.toLowerCase() ? trimmed.toUpperCase() : trimmed
}

/** Importe con el formato del sitio. No agrega IVA ni timbres. */
export function formatMutualistaUyu(value: number | null): string {
  const amount = normalizeMutualistaAmount(value)
  return amount === null
    ? 'Sin dato'
    : `$ ${new Intl.NumberFormat('es-UY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`
}

/** Lo que publica UN régimen de UNA institución para UN concepto. Nunca un precio elegido. */
export interface MutualistaRegimeSummary {
  affiliation: MutualistaCostAffiliation
  label: string
  /** Columnas que el MSP publica para ese régimen y ese concepto. */
  columns: number
  /**
   * De cuántas de esas columnas sale el rango: las que traen un importe mayor que cero.
   *
   * Es un número aparte de `columns` porque el rango se lee mal sin él: «de $ 20,87 a $ 172,66 en
   * 16 columnas» suena a que las 16 están dentro del rango, y en la Asociación Española 10 de esas
   * 16 no traen dato para ese concepto.
   */
  pricedColumns: number
  /** Menor y mayor importe POSITIVO publicado. Los ceros se cuentan aparte, no achatan el rango. */
  lowestUyu: number | null
  highestUyu: number | null
  /** Columnas con $ 0,00: es lo que publica el archivo, no una exoneración probada. */
  zeroColumns: number
  /** Columnas sin dato. Un hueco nunca se convierte en cero. */
  missingColumns: number
  /** Columnas por encima del máximo de la columna F: contradicción del origen, conservada. */
  exceedingColumns: number
}

/** Un concepto del tarifario, con el lugar que ocupa esta institución entre las que lo publican. */
export interface MutualistaConceptSummary {
  id: MutualistaCostConceptId
  label: string
  /** Máximo autorizado (columna F del MSP), común a los regímenes de la institución. */
  maximumUyu: number | null
  /** Mediana del máximo autorizado de las instituciones que lo publican. */
  medianUyu: number | null
  /** Puesto por máximo autorizado, 1 = el más barato. `null` si esta institución no lo publica. */
  rank: number | null
  /** Cuántas instituciones publican el concepto, o sea sobre cuántas se calculó el puesto. */
  of: number
  regimes: MutualistaRegimeSummary[]
}

export interface MutualistaPage {
  slug: string
  /** Nombre impreso (ver `mutualistaDisplayName`). */
  name: string
  /** El campo INSTITUCIÓN tal cual lo trae el archivo, sin tocar la caja. */
  sourceName: string
  sheet: string
  effectiveFrom: string
  path: string
  indexPath: string
  indexLabel: string
  title: string
  heading: string
  description: string
  concepts: MutualistaConceptSummary[]
  /** Regímenes que esta institución publica, en el orden del archivo. */
  regimeLabels: string[]
  /** Columnas de precio que el MSP publica para la institución. */
  totalColumns: number
  /** Cuántas filas del tarifario contradicen el máximo publicado. Casi siempre 0. */
  contradictions: number
  source: typeof MUTUALISTA_COST_SOURCE
}

const BY_NAME = [...MUTUALISTA_COSTS].sort((a, b) =>
  mutualistaDisplayName(a.name).localeCompare(mutualistaDisplayName(b.name), 'es')
)

/** Los slugs de la familia, en el orden en que se listan. El sitemap lee ESTA función. */
export function mutualistaPageSlugs(): string[] {
  return BY_NAME.map(institution => institution.id)
}

export function isMutualistaPageSlug(slug: string): boolean {
  return MUTUALISTA_COSTS.some(institution => institution.id === slug)
}

export function mutualistaPagePath(slug: string): string {
  return `/mutualista/${slug}`
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const half = sorted.length / 2
  return sorted.length % 2 ? sorted[Math.floor(half)]! : (sorted[half - 1]! + sorted[half]!) / 2
}

function regimeSummaries(
  institution: MutualistaCostInstitution,
  conceptId: MutualistaCostConceptId
): MutualistaRegimeSummary[] {
  const summaries: MutualistaRegimeSummary[] = []
  for (const affiliation of AFFILIATION_ORDER) {
    const rows = getMutualistaCostRows(institution.id, conceptId, affiliation)
    if (!rows.length) continue
    const positive = rows
      .map(row => row.amountUyu)
      .filter((amount): amount is number => amount !== null && amount > 0)
    summaries.push({
      affiliation,
      label: AFFILIATION_LABELS[affiliation],
      columns: rows.length,
      pricedColumns: positive.length,
      lowestUyu: positive.length ? Math.min(...positive) : null,
      highestUyu: positive.length ? Math.max(...positive) : null,
      zeroColumns: rows.filter(row => row.amountUyu === 0).length,
      missingColumns: rows.filter(row => row.amountUyu === null).length,
      exceedingColumns: rows.filter(row => row.exceedsPublishedMaximum).length,
    })
  }
  return summaries
}

/**
 * El modelo de UNA página. `undefined` para un slug que no está en el archivo, que es lo que la
 * guarda de la ruta convierte en un 404 antes de renderizar nada.
 */
export function getMutualistaPage(slug: string): MutualistaPage | undefined {
  const institution = MUTUALISTA_COSTS.find(item => item.id === slug)
  if (!institution) return undefined

  const name = mutualistaDisplayName(institution.name)
  const concepts: MutualistaConceptSummary[] = MUTUALISTA_COST_CONCEPTS.map(concept => {
    // Un $ 0,00 en la columna del máximo autorizado NO es un precio barato: es lo que el archivo
    // publica donde el MSP no autorizó un importe, y la propia regla de `mutualistaCosts.ts` dice
    // que un cero no prueba una exoneración. Si entrara a la cuenta, CUDAM saldría «puesto 1 de 34,
    // el más barato» en urgencia centralizada, que es la única afirmación de esta página que sería
    // falsa. Así que un cero no se compara: ni puntúa, ni mueve la mediana de los demás.
    const published = MUTUALISTA_COSTS.map(item => item.maxima[concept.id]).filter(
      (amount): amount is number => amount !== null && amount > 0
    )
    const own = institution.maxima[concept.id]
    const comparable = own !== null && own > 0
    return {
      id: concept.id,
      label: concept.label,
      maximumUyu: own,
      medianUyu: median(published),
      // Empates: el puesto es «cuántas publican un máximo menor, más una», así que dos
      // instituciones con el mismo importe comparten puesto en vez de inventarse un desempate.
      rank: comparable ? published.filter(amount => amount < own).length + 1 : null,
      of: published.length,
      regimes: regimeSummaries(institution, concept.id),
    }
  })

  const medicines = concepts.find(concept => concept.id === 'medicamentos')
  const specialist = concepts.find(concept => concept.id === 'especialistas')
  const month = mutualistaMonthLabel(institution.effectiveFrom)

  return {
    slug: institution.id,
    name,
    sourceName: institution.name,
    sheet: institution.sheet,
    effectiveFrom: institution.effectiveFrom,
    path: mutualistaPagePath(institution.id),
    indexPath: MUTUALISTA_INDEX_PATH,
    indexLabel: MUTUALISTA_INDEX_LABEL,
    title: `Ticket y orden en ${name}`,
    heading: `${name}: cuánto sale el ticket y la orden`,
    // La regla medida del sitio: la descripción lleva el número. Son las dos cifras que más se
    // buscan de un tarifario (el ticket de medicamentos y la consulta con especialista), con el
    // organismo que las autoriza y el mes del tarifario, y entra en los 155 caracteres del SERP.
    description:
      `En ${name} el máximo autorizado del MSP es ${formatMutualistaUyu(medicines?.maximumUyu ?? null)} ` +
      `el ticket de medicamentos y ${formatMutualistaUyu(specialist?.maximumUyu ?? null)} el especialista (${month}).`,
    concepts,
    regimeLabels: AFFILIATION_ORDER.filter(affiliation =>
      institution.columns.some(column => column.affiliation === affiliation)
    ).map(affiliation => AFFILIATION_LABELS[affiliation]),
    totalColumns: institution.columns.length,
    contradictions: MUTUALISTA_COST_CONCEPTS.reduce(
      (total, concept) =>
        total +
        getMutualistaCostRows(institution.id, concept.id).filter(row => row.exceedsPublishedMaximum)
          .length,
      0
    ),
    source: MUTUALISTA_COST_SOURCE,
  }
}

/** Las 34 páginas, para el sitemap y para los tests. */
export function listMutualistaPages(): MutualistaPage[] {
  return mutualistaPageSlugs()
    .map(slug => getMutualistaPage(slug))
    .filter((page): page is MutualistaPage => Boolean(page))
}
