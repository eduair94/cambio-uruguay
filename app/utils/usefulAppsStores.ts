// app/utils/usefulAppsStores.ts
// Lo que el job semanal `currency-useful-apps` lee de las fichas de Google Play y del App Store
// (colección `usefulappssnapshots` de la base del app) y cómo lo muestra /apps-utiles-uruguay.
// MÓDULO PURO: lo usan la ruta /api/useful-apps/stores, la página, la tarjeta y los tests.
//
// Las fechas se escriben con una tabla propia de meses y no con Intl: el servidor (ICU 76) y el
// navegador (ICU 78) no escriben igual, y "setiembre" es como se dice acá. Intl sólo se usa para
// saber qué DÍA es un instante en Uruguay, y ahí devuelve números, que no cambian entre versiones.
import { siteTimeZone } from './format'

export type UsefulAppsStoreStatus = 'ok' | 'missing'

/**
 * Una ficha tal como la guarda el job. `missing` = la tienda contestó 404: en el App Store /uy/,
 * no está en Uruguay; en Google Play, la ficha ya no existe (Play contesta 200 con gl=UY aunque la
 * app no se ofrezca acá).
 */
export interface UsefulAppsStoreSignal {
  status: UsefulAppsStoreStatus
  /** Día en que se leyó la ficha. Mongo lo devuelve como Date o como string. */
  checkedAt: string | Date
  name?: string | null
  developer?: string | null
  updated?: string | Date | null
  rating?: number | null
  ratingCount?: number | null
  installs?: string | null
  icon?: string | null
}

export interface UsefulAppsSnapshotDoc {
  key: string
  capturedAt: string | Date
  apps: Record<
    string,
    { android?: UsefulAppsStoreSignal | null; ios?: UsefulAppsStoreSignal | null } | null
  >
  counts?: { apps: number; fresh: number; missing: number; failed: number }
  developerChanges?: { id: string; store: 'android' | 'ios'; expected: string; found: string }[]
}

/** Lo que sale por /api/useful-apps/stores: sólo lo que la página muestra. */
export interface UsefulAppsStoreFacts {
  status: UsefulAppsStoreStatus
  checkedAt: string
  updated: string | null
  rating: number | null
  ratingCount: number | null
  installs: string | null
  icon: string | null
}

export interface UsefulAppsAppFacts {
  android?: UsefulAppsStoreFacts
  ios?: UsefulAppsStoreFacts
}

export interface UsefulAppsStoresPayload {
  /** Día (YYYY-MM-DD) de la última corrida del job. */
  capturedAt: string
  apps: Record<string, UsefulAppsAppFacts>
}

/** Una lectura de más de 60 días no se presenta como dato de hoy (mismo corte que tiendas online). */
export const USEFUL_APPS_SIGNAL_MAX_AGE_DAYS = 60
/** Sin versiones nuevas en 24 meses: la tarjeta avisa que puede no andar bien. */
export const USEFUL_APPS_STALE_MONTHS = 24

const ICON_HOSTS: readonly RegExp[] = [/^play-lh\.googleusercontent\.com$/, /(^|\.)mzstatic\.com$/]

/** Un ícono sólo si es https, sin credenciales y de una de las dos CDN de las tiendas. */
export function usefulAppsSafeIcon(url: unknown): string | null {
  if (typeof url !== 'string' || url.length > 600) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null
    return ICON_HOSTS.some(host => host.test(parsed.hostname)) ? url : null
  } catch {
    return null
  }
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

function calendarDay(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/**
 * `YYYY-MM-DD` de un día o de un instante; `null` si no es una fecha. Un día suelto queda como
 * está; un instante (la captura del job, un Date de Mongo) pasa al día de Uruguay, con la misma
 * regla que el resto del sitio (`siteTimeZone`): la corrida de las 01:34 UTC es la noche anterior
 * acá, y fechada con el día UTC decía "tiendas leídas" mañana.
 */
export function usefulAppsIsoDay(value: unknown): string | null {
  if (typeof value === 'string' && DAY.test(value)) {
    return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? null : value
  }
  const at = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null
  if (!at || Number.isNaN(at.getTime())) return null
  return calendarDay(at, siteTimeZone(at))
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

const INSTALLS = /^\d[0-9.,]*\s?(?:[kKmMbB]|mil)?\s?\+$/

function compactSignal(
  signal: UsefulAppsStoreSignal | null | undefined,
  today: string
): UsefulAppsStoreFacts | undefined {
  if (!signal || (signal.status !== 'ok' && signal.status !== 'missing')) return undefined
  const checkedAt = usefulAppsIsoDay(signal.checkedAt)
  if (!checkedAt) return undefined
  const icon = usefulAppsSafeIcon(signal.icon)
  const empty = { updated: null, rating: null, ratingCount: null, installs: null }
  if (daysBetween(checkedAt, today) > USEFUL_APPS_SIGNAL_MAX_AGE_DAYS) {
    // Vieja: el ícono sigue sirviendo para reconocerla; lo demás ya no es de hoy, y un "no está en
    // la tienda" de hace meses no alcanza para esconder un botón.
    return signal.status === 'ok' && icon ? { status: 'ok', checkedAt, ...empty, icon } : undefined
  }
  if (signal.status === 'missing') return { status: 'missing', checkedAt, ...empty, icon: null }
  const rating =
    typeof signal.rating === 'number' && signal.rating >= 0 && signal.rating <= 5
      ? Math.round(signal.rating * 10) / 10
      : null
  const ratingCount =
    typeof signal.ratingCount === 'number' &&
    Number.isInteger(signal.ratingCount) &&
    signal.ratingCount >= 0
      ? signal.ratingCount
      : null
  const installs =
    typeof signal.installs === 'string' &&
    signal.installs.length <= 16 &&
    INSTALLS.test(signal.installs.trim())
      ? signal.installs.trim()
      : null
  return {
    status: 'ok',
    checkedAt,
    updated: usefulAppsIsoDay(signal.updated),
    rating: ratingCount === null ? null : rating,
    ratingCount,
    installs,
    icon,
  }
}

/**
 * Lo que la ruta devuelve: sólo campos que la página muestra, validados. `today` es el día del
 * servidor que atiende (YYYY-MM-DD); el resultado viaja en el payload, así que el navegador no lo
 * recalcula y no hay diferencias de hidratación.
 */
export function usefulAppsCompactStores(
  doc: UsefulAppsSnapshotDoc | null | undefined,
  today: string
): UsefulAppsStoresPayload | null {
  if (!doc || !doc.apps) return null
  const capturedAt = usefulAppsIsoDay(doc.capturedAt)
  if (!capturedAt) return null
  const reference = usefulAppsIsoDay(today) ?? capturedAt
  const apps: Record<string, UsefulAppsAppFacts> = {}
  for (const [id, stores] of Object.entries(doc.apps)) {
    const out: UsefulAppsAppFacts = {}
    const android = compactSignal(stores?.android, reference)
    const ios = compactSignal(stores?.ios, reference)
    if (android) out.android = android
    if (ios) out.ios = ios
    if (out.android || out.ios) apps[id] = out
  }
  return { capturedAt, apps }
}

export function usefulAppsLatestUpdate(
  facts: UsefulAppsAppFacts | null | undefined
): string | null {
  const days = [facts?.android?.updated, facts?.ios?.updated].filter(
    (day): day is string => typeof day === 'string'
  )
  return days.length ? days.sort()[days.length - 1]! : null
}

export function usefulAppsIconFor(facts: UsefulAppsAppFacts | null | undefined): string | null {
  return facts?.android?.icon ?? facts?.ios?.icon ?? null
}

/** Meses completos entre dos días `YYYY-MM-DD`. */
export function usefulAppsMonthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number]
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0)
}

export function usefulAppsIsStale(updated: string | null, today: string): boolean {
  if (!updated) return false
  return usefulAppsMonthsBetween(updated, today) >= USEFUL_APPS_STALE_MONTHS
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

/** "2026-09-17" → "setiembre de 2026". */
export function usefulAppsMonthYear(day: string): string {
  const [year, month] = day.split('-').map(Number) as [number, number]
  return `${MONTHS[month - 1]} de ${year}`
}

/** "2026-09-03" → "3 de setiembre de 2026". */
export function usefulAppsLongDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  return `${date} de ${MONTHS[month - 1]} de ${year}`
}

/** 4.35915 → "4,4". */
export function usefulAppsRating(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',')
}

/** 1434 → "1.434". */
export function usefulAppsCount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
