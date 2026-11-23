// Lo que comparten las rutas de /api/emprendimientos: la proyección pública de una ficha (sin
// fotos vencidas), las bajas y el filtro del listado. La ficha ya viene armada campo por campo del
// job; acá sólo se recorta lo que la tarjeta no usa y se sacan las fotos cuya firma venció.
import {
  EmprendimientoListingModel,
  type EmprendimientoListingDoc,
} from '../models/EmprendimientoListing'
import { EmprendimientoOptOutModel } from '../models/EmprendimientoOptOut'
import { photoUrlExpired } from '../../utils/photoSizes'
import {
  isJoyita,
  montevideoDay,
  sortEmprendimientos,
  type EmprendimientoCard,
  type EmprendimientoDetail,
  type EmprendimientoFacets,
  type EmprendimientosState,
} from '../../utils/emprendimientos'

/** Una foto que vence en menos de esto ya no se sirve: la página puede quedar en caché un rato. */
const PHOTO_MARGIN_DAYS = 0.25

const live = (url: string | null | undefined, now: number): string | null =>
  url && !photoUrlExpired(url, now, PHOTO_MARGIN_DAYS) ? url : null

export function toCard(doc: EmprendimientoListingDoc, now: number, photos = 3): EmprendimientoCard {
  return {
    handle: doc.handle,
    name: doc.name,
    summary: doc.summary,
    rubro: doc.rubro,
    tags: (doc.tags ?? []).slice(0, 5),
    departamento: doc.departamento ?? null,
    barrio: doc.barrio ?? null,
    envios: doc.envios,
    raro: Boolean(doc.raro),
    soloInstagram: Boolean(doc.soloInstagram),
    whatsapp: Boolean(doc.whatsapp),
    followers: doc.followers ?? null,
    profilePic: live(doc.profilePic, now),
    posts: (doc.posts ?? [])
      .filter(post => live(post.image, now))
      .slice(0, photos)
      .map(post => ({
        code: post.code,
        reel: Boolean(post.reel),
        date: post.date ?? null,
        image: post.image,
      })),
    lastPostAt: doc.lastPostAt ?? null,
    postsLast90: doc.postsLast90 ?? 0,
    listedAt: doc.listedAt,
  }
}

export function toDetail(doc: EmprendimientoListingDoc, now: number): EmprendimientoDetail {
  return {
    ...toCard(doc, now, 12),
    website: doc.website ?? null,
    ofrece: doc.ofrece,
    sources: (doc.sources ?? []).map(s => ({ kind: s.kind, label: s.label, url: s.url ?? null })),
    readAt: doc.readAt,
  }
}

/** Los campos de la tarjeta (la búsqueda y el vencimiento de fotos no viajan). */
export const CARD_SELECT = {
  _id: 0,
  handle: 1,
  name: 1,
  summary: 1,
  rubro: 1,
  tags: 1,
  departamento: 1,
  barrio: 1,
  envios: 1,
  raro: 1,
  soloInstagram: 1,
  whatsapp: 1,
  followers: 1,
  profilePic: 1,
  posts: 1,
  lastPostAt: 1,
  postsLast90: 1,
  listedAt: 1,
} as const

export async function loadOptOuts(): Promise<Set<string>> {
  const rows = await EmprendimientoOptOutModel.find({}, { _id: 0, handle: 1 }).lean()
  return new Set(rows.map(row => row.handle))
}

/** "Tortas Pocitos" → ["tortas", "pocitos"], sin tildes, como el campo `search` del job. */
export function searchWords(q: string): string[] {
  return q
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2)
    .slice(0, 6)
}

export interface LightRow {
  handle: string
  rubro: string
  departamento: string | null
  soloInstagram: boolean
  raro: boolean
  listedAt: string
  lastPostAt: string | null
  followers: number | null
  search: string
}

export const LIGHT_SELECT = {
  _id: 0,
  handle: 1,
  rubro: 1,
  departamento: 1,
  soloInstagram: 1,
  raro: 1,
  listedAt: 1,
  lastPostAt: 1,
  followers: 1,
  search: 1,
} as const

export interface Filtered {
  matched: LightRow[]
  facets: EmprendimientoFacets
}

/**
 * Filtra en memoria (unas pocas miles de filas livianas) para contar cada faceta con los demás
 * filtros puestos: el chip de un rubro dice cuántas hay EN ese departamento, no en total.
 */
export function filterRows(rows: readonly LightRow[], state: EmprendimientosState): Filtered {
  const words = searchWords(state.q)
  const base = rows.filter(row => words.every(word => row.search.includes(word)))
  const pass = (row: LightRow, skip: 'rubro' | 'depto' | 'solo' | 'raros' | null): boolean =>
    (skip === 'rubro' || !state.rubro || row.rubro === state.rubro) &&
    (skip === 'depto' || !state.depto || row.departamento === state.depto) &&
    (skip === 'solo' || !state.solo || row.soloInstagram) &&
    (skip === 'raros' || !state.raros || row.raro)
  const rubros: Record<string, number> = {}
  const departamentos: Record<string, number> = {}
  let soloInstagram = 0
  let raros = 0
  for (const row of base) {
    if (pass(row, 'rubro')) rubros[row.rubro] = (rubros[row.rubro] ?? 0) + 1
    if (pass(row, 'depto') && row.departamento)
      departamentos[row.departamento] = (departamentos[row.departamento] ?? 0) + 1
    if (pass(row, 'solo') && row.soloInstagram) soloInstagram++
    if (pass(row, 'raros') && row.raro) raros++
  }
  return {
    matched: base.filter(row => pass(row, null)),
    facets: { rubros, departamentos, soloInstagram, raros },
  }
}

export async function loadLightRows(optOuts: ReadonlySet<string>): Promise<LightRow[]> {
  const rows = (await EmprendimientoListingModel.find(
    {},
    LIGHT_SELECT
  ).lean()) as unknown as LightRow[]
  return rows.filter(row => !optOuts.has(row.handle))
}

/** Los destacados de la portada: lo raro, las joyitas (chicas y activas) y lo recién llegado. */
export function pickDestacados(
  rows: readonly LightRow[],
  now: number,
  size = 8
): { raros: string[]; joyitas: string[]; nuevos: string[] } {
  const day = montevideoDay(now)
  const raros = sortEmprendimientos(
    rows.filter(row => row.raro),
    'descubrir',
    day,
    now
  )
    .slice(0, size)
    .map(r => r.handle)
  const joyitas = sortEmprendimientos(
    rows.filter(row => isJoyita(row, now) && !raros.includes(row.handle)),
    'descubrir',
    `${day}:j`,
    now
  )
    .slice(0, size)
    .map(r => r.handle)
  const nuevos = sortEmprendimientos(rows, 'nuevos', day, now)
    .slice(0, size)
    .map(r => r.handle)
  return { raros, joyitas, nuevos }
}

export async function loadCards(
  handles: readonly string[],
  now: number
): Promise<Map<string, EmprendimientoCard>> {
  if (!handles.length) return new Map()
  const docs = (await EmprendimientoListingModel.find(
    { handle: { $in: [...new Set(handles)] } },
    CARD_SELECT
  ).lean()) as unknown as EmprendimientoListingDoc[]
  return new Map(docs.map(doc => [doc.handle, toCard(doc, now)]))
}
