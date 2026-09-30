// Espejo en el app del monitor de competencia (classes/monitor/): constantes, estado de acceso para
// mostrar y la validación de lo que guarda /api/me/monitor. El job del backend es quien evalúa y
// avisa; competitorMonitorParity.test.ts ata las constantes y el acceso a las del backend.

export type MonitorCurrency = 'USD' | 'EUR' | 'BRL' | 'ARS'
export const MONITOR_CURRENCIES: readonly MonitorCurrency[] = ['USD', 'EUR', 'BRL', 'ARS']
export const MAX_COMPETITORS = 12
export const TRIAL_DAYS = 14
export type EmailMode = 'none' | 'daily' | 'all'

export interface MonitorInput {
  ownOrigin: string | null
  competitors: string[]
  currencies: MonitorCurrency[]
  alerts: { moves: boolean; position: boolean; quiet: boolean; daily: boolean }
  channels: { telegram: boolean; email: EmailMode }
  active: boolean
}

export type MonitorAccess =
  | { status: 'trial'; daysLeft: number; endsAt: string }
  | { status: 'business' }
  | { status: 'expired'; endedAt: string }

const DAY_MS = 86_400_000

export function monitorAccess(
  trialStartedAt: Date | string,
  hasBusiness: boolean,
  now = new Date()
): MonitorAccess {
  if (hasBusiness) return { status: 'business' }
  const endsAt = new Date(new Date(trialStartedAt).getTime() + TRIAL_DAYS * DAY_MS)
  if (now.getTime() < endsAt.getTime()) {
    return {
      status: 'trial',
      daysLeft: Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS),
      endsAt: endsAt.toISOString(),
    }
  }
  return { status: 'expired', endedAt: endsAt.toISOString() }
}

export function emptyMonitorInput(): MonitorInput {
  return {
    ownOrigin: null,
    competitors: [],
    currencies: ['USD'],
    alerts: { moves: true, position: true, quiet: true, daily: true },
    channels: { telegram: true, email: 'daily' },
    active: true,
  }
}

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)

export function sanitizeMonitor(
  body: unknown,
  eligible: ReadonlySet<string>
): { ok: true; value: MonitorInput } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>
  const isHouse = (id: unknown): id is string =>
    typeof id === 'string' && id !== 'bcu' && eligible.has(id)

  let ownOrigin: string | null = null
  if (b.ownOrigin !== null && b.ownOrigin !== undefined && b.ownOrigin !== '') {
    if (!isHouse(b.ownOrigin))
      return { ok: false, error: 'La casa propia no está entre las casas del sitio.' }
    ownOrigin = b.ownOrigin
  }

  const raw: unknown[] = Array.isArray(b.competitors) ? b.competitors : []
  if (raw.some(id => !isHouse(id)))
    return { ok: false, error: 'Hay un competidor que no está entre las casas del sitio.' }
  const competitors = [...new Set(raw as string[])].filter(id => id !== ownOrigin)
  if (competitors.length < 1 || competitors.length > MAX_COMPETITORS) {
    return { ok: false, error: `Elegí entre 1 y ${MAX_COMPETITORS} competidores.` }
  }

  const currencies = [...new Set(Array.isArray(b.currencies) ? b.currencies : [])].filter(
    (c): c is MonitorCurrency => (MONITOR_CURRENCIES as readonly unknown[]).includes(c)
  )
  if (!currencies.length) return { ok: false, error: 'Elegí al menos una moneda.' }

  const alerts = {
    moves: bool(b.alerts?.moves, true),
    position: ownOrigin ? bool(b.alerts?.position, true) : false,
    quiet: ownOrigin ? bool(b.alerts?.quiet, true) : false,
    daily: bool(b.alerts?.daily, true),
  }
  const email: EmailMode = ['none', 'daily', 'all'].includes(b.channels?.email)
    ? b.channels.email
    : 'daily'
  return {
    ok: true,
    value: {
      ownOrigin,
      competitors,
      currencies,
      alerts,
      channels: { telegram: bool(b.channels?.telegram, true), email },
      active: bool(b.active, true),
    },
  }
}
