// Las filas de /vivir-con-el-salario-minimo-uruguay: casas, apartamentos y habitaciones vigentes
// del directorio, normalizadas UNA vez por cosecha y filtradas en memoria por pedido.
//
// Casas y apartamentos salen del catálogo de /api/rentals/budget tal cual (elegibilidad propia,
// gastos comunes sólo con evidencia propia). Las habitaciones, que ese catálogo no incluye, salen
// de una consulta propia. Del texto de cada pieza se leen cuatro marcas y el texto se descarta.
//
// LA GUARDA DE PLAUSIBILIDAD existe porque el filtro de elegibilidad deja pasar precios que no
// pueden ser el de esa vivienda: el 26/9/2026 había apartamentos de lujo de 3 dormitorios en
// Playa Mansa publicados a "$ 3.500" (0,09 de la mediana de su cohorte). Los baratos de verdad
// medidos ese día daban 0,38 (Manga, 1 dormitorio) y 0,46 (Carmelo, casa): el umbral es 0,3.

import type { PipelineStage } from 'mongoose'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  rentalPublicStages,
  type RentalOffer,
  type RentalPublicProperty,
} from '../../utils/rentals'
import { rentalPeriodEvidence } from '../../utils/rentalEligibility'
import {
  rentalAvailabilityAdvertId,
  rentalAvailabilityHidden,
} from '../../utils/rentalAvailability'
import {
  FORMAS,
  PALANCAS_NINGUNA,
  evaluarAviso,
  mismoDepartamento,
  normalizeMinimumWageQuery,
  planDelMes,
  puertasDeEntrada,
  regionDe,
  type Forma,
  type FormaResumen,
  type MinimumWageItem,
  type MinimumWageListing,
  type MinimumWageResponse,
  type Palancas,
  type PlanDelMes,
  type Region,
  type Restriccion,
  type TipoVivienda,
} from '../../utils/minimumWage'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import { loadRentalAnalysisCatalogue } from './rentalAnalysis'
import { loadRentalAvailabilityIndex } from './rentalAvailability'
import { loadRentalBudgetCatalogue, selectRentalBudgetOffer } from './rentalBudget'
import { rentalPublicPropertyProjection } from './rentalDetail'

export const MAX_PRICE = 25_000
export const MIN_ROOM_PRICE = 3_000
export const PLAUSIBLE_MIN_RATIO = 0.3
export const COHORT_MIN_N = 8
const MAX_ROOMS = 5_000
const PER_PAGE = 24

export interface MinimumWageRow extends MinimumWageListing {
  /** Id de disponibilidad de la oferta elegida: los reportes de la comunidad la esconden. */
  advertId: string
}

export interface MinimumWageDataset {
  generatedAt: string
  analysisAt: string | null
  rows: MinimumWageRow[]
  excluidosPorPrecio: number
}

// ─── Marcas del texto propio ─────────────────────────────────────────────────

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/[^\S\n]+/g, ' ')

const INCLUIDOS =
  /\b(?:servicios|luz|agua|wifi|internet|gastos|ute|ose)\b[^.\n]{0,40}?\bincluid[oa]s?\b|\btodo incluido\b|\bincluye (?:la )?(?:luz|agua|wifi|internet|servicios|gastos)\b|\b(?:luz|agua|wifi)\b[^.\n]{0,30}?\ben el precio\b/g
const NO_INCLUIDOS = /\bno (?:estan |van |son )?incluid[oa]s?\b|\bno incluye\b/

// "Baño compartido" o "cocina compartida" es una pieza propia en una casa compartida: no cuenta.
const COMPARTIDA =
  /\b(?:habitacion(?:es)?|piezas?|cuartos?|dormitorios?) compartid[oa]s?\b|\bcamas? en (?:habitacion|pieza|cuarto|dormitorio)\b|\bcuchetas?\b|\bliteras?\b|\bindividuales? y compartid[oa]s?\b/
const PENSION = /\b(?:pension|residencia|alojamiento|hostel|hogar estudiantil)\b/
const MIXTO = /\b(?:chicos y chicas|chicas y chicos|hombres y mujeres|mujeres y hombres|mixt[ao]s?)\b/
const MUJERES =
  /\b(?:femenin[ao]s?|(?:para|a) (?:mujeres|chicas|senoritas|damas|una mujer|mujer sola|senora sola))\b/
const HOMBRES =
  /\b(?:masculin[ao]s?|(?:para|a) (?:hombres?|varones|caballeros|sr|senor)|hombre solo)\b/
const ESTUDIANTES = /\b(?:estudiantil|estudiantes|universitari[ao]s)\b/

export function roomTextFlags(
  title: string,
  description: string
): {
  serviciosIncluidos: boolean
  piezaCompartida: boolean
  pension: boolean
  restriccion: Restriccion | null
} {
  const heading = fold(title)
  const text = `${heading}\n${fold(description.slice(0, 20_000))}`
  let serviciosIncluidos = false
  for (const match of text.matchAll(INCLUIDOS)) {
    const start = match.index ?? 0
    const around = text.slice(Math.max(0, start - 25), start + match[0].length + 5)
    if (!NO_INCLUIDOS.test(around)) serviciosIncluidos = true
  }
  const mixto = MIXTO.test(text)
  const restriccion: Restriccion | null =
    !mixto && MUJERES.test(text)
      ? 'mujeres'
      : !mixto && HOMBRES.test(text)
        ? 'hombres'
        : ESTUDIANTES.test(heading)
          ? 'estudiantes'
          : null
  return {
    serviciosIncluidos,
    piezaCompartida: COMPARTIDA.test(text),
    pension: PENSION.test(heading),
    restriccion,
  }
}

// ─── Plausibilidad ───────────────────────────────────────────────────────────

export interface CohortInput {
  department: string
  type: string
  bedrooms: number | null
  price: number
}

const bucket = (bedrooms: number | null): string | null =>
  bedrooms === null || !Number.isFinite(bedrooms)
    ? null
    : bedrooms >= 3
      ? '3'
      : String(Math.max(0, Math.floor(bedrooms)))

function cohortKeys(row: Omit<CohortInput, 'price'>): string[] {
  const department = fold(row.department).trim()
  const b = bucket(row.bedrooms)
  return [
    ...(b === null ? [] : [`${department}|${row.type}|${b}`]),
    `${department}|${row.type}`,
    `*|${row.type}`,
  ]
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export function cohortMedians(rows: CohortInput[]): Map<string, number> {
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    if (!(Number.isFinite(row.price) && row.price > 0)) continue
    for (const key of cohortKeys(row)) {
      const list = groups.get(key)
      if (list) list.push(row.price)
      else groups.set(key, [row.price])
    }
  }
  const medians = new Map<string, number>()
  for (const [key, values] of groups)
    if (values.length >= COHORT_MIN_N) medians.set(key, median(values))
  return medians
}

/** La primera cohorte con muestra decide; sin ninguna, se abstiene y el aviso queda. */
export function plausibleRent(row: CohortInput, medians: Map<string, number>): boolean {
  for (const key of cohortKeys(row)) {
    const value = medians.get(key)
    if (value !== undefined) return row.price >= PLAUSIBLE_MIN_RATIO * value
  }
  return true
}

// ─── Filas ───────────────────────────────────────────────────────────────────

export function rowsFromBudgetProperties(
  properties: RentalPublicProperty[],
  usdUyu: number
): MinimumWageRow[] {
  const rows: MinimumWageRow[] = []
  for (const property of properties) {
    if (property.propertyType !== 'casa' && property.propertyType !== 'apartamento') continue
    const selected = selectRentalBudgetOffer(property.offers, 'rent', usdUyu)
    if (!selected || selected.budget.rentUyu > MAX_PRICE) continue
    const advertId = rentalAvailabilityAdvertId(selected.offer.source, selected.offer.listingId)
    if (!advertId) continue
    rows.push({
      key: property.key,
      title: selected.offer.title || property.title,
      tipo: property.propertyType,
      department: property.department || '',
      neighborhood: property.neighborhood || '',
      bedrooms: property.bedrooms ?? null,
      area: property.area ?? null,
      alquiler: Math.round(selected.budget.rentUyu),
      gastosComunes:
        selected.budget.expensesUyu === null ? null : Math.round(selected.budget.expensesUyu),
      source: selected.offer.source,
      image: selected.offer.image ?? null,
      lastSeen: selected.offer.lastSeen,
      serviciosIncluidos: false,
      piezaCompartida: false,
      pension: false,
      restriccion: null,
      advertId,
    })
  }
  return rows
}

type RoomRawOffer = RentalOffer & {
  identity?: { version?: number; description?: string }
  details?: { description?: string }
}
export type RoomRawProperty = RentalPublicProperty & { offers: RoomRawOffer[] }

export function rowsFromRoomProperties(properties: RoomRawProperty[]): MinimumWageRow[] {
  const rows: MinimumWageRow[] = []
  for (const property of properties) {
    const candidates = (property.offers || [])
      .map(offer => ({
        offer,
        description:
          (offer.identity?.version === 1 && offer.identity.description) ||
          offer.details?.description ||
          '',
      }))
      .filter(
        ({ offer, description }) =>
          offer.currency === 'UYU' &&
          Number.isFinite(offer.priceUyu) &&
          offer.priceUyu >= MIN_ROOM_PRICE &&
          offer.priceUyu <= MAX_PRICE &&
          rentalAvailabilityAdvertId(offer.source, offer.listingId) !== null &&
          !rentalPeriodEvidence(offer.title || '', description).shortTerm
      )
      .sort((a, b) => a.offer.priceUyu - b.offer.priceUyu)
    const chosen = candidates[0]
    if (!chosen) continue
    const flags = roomTextFlags(chosen.offer.title || property.title || '', chosen.description)
    rows.push({
      key: property.key,
      title: chosen.offer.title || property.title,
      tipo: 'habitacion',
      department: property.department || '',
      neighborhood: property.neighborhood || '',
      bedrooms: null,
      area: property.area ?? null,
      alquiler: Math.round(chosen.offer.priceUyu),
      gastosComunes: null,
      source: chosen.offer.source,
      image: chosen.offer.image ?? null,
      lastSeen: chosen.offer.lastSeen,
      ...flags,
      advertId: rentalAvailabilityAdvertId(chosen.offer.source, chosen.offer.listingId)!,
    })
  }
  return rows
}

export function buildMinimumWageDataset(input: {
  generatedAt: string
  analysisAt: string | null
  budget: MinimumWageRow[]
  rooms: MinimumWageRow[]
  /** Casas y apartamentos de la foto semanal; null si no estaba: la cohorte sale de las propias filas. */
  analysisListings: CohortInput[] | null
}): MinimumWageDataset {
  const asCohort = (row: MinimumWageRow): CohortInput => ({
    department: row.department,
    type: row.tipo,
    bedrooms: row.bedrooms,
    price: row.alquiler,
  })
  const medians = cohortMedians([
    ...(input.analysisListings ?? input.budget.map(asCohort)),
    ...input.rooms.map(asCohort),
  ])
  const all = [...input.budget, ...input.rooms]
  const rows = all.filter(row => plausibleRent(asCohort(row), medians))
  return {
    generatedAt: input.generatedAt,
    analysisAt: input.analysisAt,
    rows,
    excluidosPorPrecio: all.length - rows.length,
  }
}

// ─── La consulta ─────────────────────────────────────────────────────────────

const VEREDICTO_ORDEN = { cierra: 0, 'cierra-si': 1, 'no-cierra': 2 } as const

function enForma(row: MinimumWageRow, forma: Forma, departamento: string): boolean {
  return (
    (forma.tipos as readonly TipoVivienda[]).includes(row.tipo) &&
    (forma.regiones as readonly Region[]).includes(regionDe(row.department)) &&
    (!departamento || mismoDepartamento(row.department, departamento))
  )
}

function planes(forma: Forma, palancas: Palancas): Map<Region, PlanDelMes> {
  return new Map(forma.regiones.map(region => [region, planDelMes(forma.id, region, palancas)]))
}

export function queryMinimumWage(
  dataset: MinimumWageDataset,
  input: Record<string, unknown>,
  hidden: (advertId: string) => boolean
): MinimumWageResponse {
  const query = normalizeMinimumWageQuery(input)
  const visible = dataset.rows.filter(row => !hidden(row.advertId))
  let selectedItems: MinimumWageItem[] = []

  const formas: FormaResumen[] = FORMAS.map(forma => {
    const con = planes(forma, query.palancas)
    const sin = planes(forma, PALANCAS_NINGUNA)
    const items: MinimumWageItem[] = []
    let sinPalancas = 0
    for (const row of visible) {
      if (!enForma(row, forma, query.departamento)) continue
      const region = regionDe(row.department)
      const evaluacion = evaluarAviso(con.get(region)!, row)
      if (evaluarAviso(sin.get(region)!, row).veredicto !== 'no-cierra') sinPalancas++
      if (evaluacion.veredicto === 'no-cierra') continue
      const { advertId: _advertId, ...listing } = row
      items.push({ ...listing, evaluacion, puertas: puertasDeEntrada(forma.id, row, query.joven) })
    }
    items.sort(
      (a, b) =>
        VEREDICTO_ORDEN[a.evaluacion.veredicto] - VEREDICTO_ORDEN[b.evaluacion.veredicto] ||
        a.evaluacion.costo - b.evaluacion.costo ||
        a.key.localeCompare(b.key)
    )
    if (forma.id === query.forma) selectedItems = items
    const counts = new Map<string, number>()
    for (const item of items) counts.set(item.department, (counts.get(item.department) ?? 0) + 1)
    return {
      id: forma.id,
      cierran: items.filter(item => item.evaluacion.veredicto === 'cierra').length,
      condicionados: items.filter(item => item.evaluacion.veredicto === 'cierra-si').length,
      desde: items.length ? Math.min(...items.map(item => item.evaluacion.costo)) : null,
      porDepartamento: [...counts]
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department, 'es'))
        .slice(0, 5),
      sinPalancas,
    }
  })

  const forma = FORMAS.find(item => item.id === query.forma)!
  const pages = Math.ceil(selectedItems.length / PER_PAGE)
  const page = Math.min(query.page, Math.max(1, pages))
  const departamentos = [
    ...new Set(
      visible
        .filter(row => enForma(row, forma, ''))
        .map(row => row.department)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  return {
    generatedAt: dataset.generatedAt,
    analysisAt: dataset.analysisAt,
    query: { ...query, page },
    planes: [...planes(forma, query.palancas).values()],
    formas,
    items: selectedItems.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: selectedItems.length,
    page,
    pages,
    excluidosPorPrecio: dataset.excluidosPorPrecio,
    departamentos,
  }
}

// ─── Carga ───────────────────────────────────────────────────────────────────

async function loadRooms(): Promise<MinimumWageRow[]> {
  const raw = await RentalListingModel.aggregate<RoomRawProperty>([
    ...rentalPublicStages(
      { propertyType: 'habitacion', priceUyu: { $lte: MAX_PRICE } },
      RENTAL_STALE_DAYS
    ),
    { $limit: MAX_ROOMS + 1 },
    {
      $project: {
        ...rentalPublicPropertyProjection,
        'offers.identity.version': 1,
        'offers.identity.description': 1,
        'offers.details.description': 1,
      },
    },
  ] as PipelineStage[])
    .option({ maxTimeMS: 15_000 })
    .collation(RENTAL_COLLATION)
  if (raw.length > MAX_ROOMS) throw new Error('Room universe exceeds safe read budget')
  return rowsFromRoomProperties(raw)
}

let memo: { signature: string; until: number; value: MinimumWageDataset } | null = null
let loading: { signature: string; promise: Promise<MinimumWageDataset> } | null = null

/** Las filas se arman una vez por cosecha (la firma es su `generatedAt`), no por pedido. */
export async function loadMinimumWageDataset(): Promise<MinimumWageDataset> {
  await connectDb()
  const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' })
    .select({ generatedAt: 1, _id: 0 })
    .maxTimeMS(10_000)
    .lean()
  if (!meta?.generatedAt) throw new Error('Rental source metadata unavailable')
  const harvest = String(meta.generatedAt)
  if (memo && memo.signature === harvest && memo.until > Date.now()) return memo.value
  if (loading?.signature === harvest) return loading.promise
  const promise = (async () => {
    const [catalogue, rooms, analysis] = await Promise.all([
      loadRentalBudgetCatalogue(),
      loadRooms(),
      // Sin la foto semanal la guarda sigue, con cohortes más flacas: las de las propias filas.
      loadRentalAnalysisCatalogue().catch(() => null),
    ])
    const value = buildMinimumWageDataset({
      generatedAt: catalogue.generatedAt,
      analysisAt: analysis?.generatedAt ?? null,
      budget: rowsFromBudgetProperties(catalogue.properties, catalogue.usdUyu),
      rooms,
      analysisListings: analysis
        ? analysis.listings
            .filter(listing => listing.currency === 'UYU')
            .map(listing => ({
              department: listing.department,
              type: listing.type,
              bedrooms: listing.bedrooms,
              price: listing.price,
            }))
        : null,
    })
    memo = { signature: harvest, until: Date.now() + 30 * 60_000, value }
    return value
  })()
  loading = { signature: harvest, promise }
  try {
    return await promise
  } finally {
    if (loading?.promise === promise) loading = null
  }
}

/** Un aviso que dos o más cuentas reportaron como no disponible no se recomienda. */
export async function loadMinimumWage(
  input: Record<string, unknown>
): Promise<MinimumWageResponse> {
  const [dataset, availability] = await Promise.all([
    loadMinimumWageDataset(),
    loadRentalAvailabilityIndex(),
  ])
  return queryMinimumWage(dataset, input, advertId =>
    rentalAvailabilityHidden(availability.byAdvertId.get(advertId), 'hide_multiple')
  )
}
