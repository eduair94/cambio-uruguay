// Espejo en el app de lo que decide la API en classes/apikeys/: los planes con sus techos (para
// /empresas), los largos del formulario de alta y los tipos que devuelven las rutas de
// administración. La API valida y cuenta; esto sólo dibuja. apiPlansParity.test.ts ata los números.

export type ApiPlanId = 'anonymous' | 'free' | 'business' | 'internal'

export const API_PLAN_LIMITS = {
  anonymous: { perMinute: 600, perDay: 20_000 },
  free: { perMinute: 600, perDay: 20_000 },
  business: { perMinute: 3_000, perDay: 500_000 },
} as const

export const API_PLAN_LABELS: Record<ApiPlanId, string> = {
  anonymous: 'Sin clave',
  free: 'Gratis',
  business: 'Empresa',
  internal: 'Interno',
}

/** Planes que el administrador puede asignar a una clave. */
export const ASSIGNABLE_PLANS: ApiPlanId[] = ['free', 'business', 'internal']

export const MAX_KEYS_PER_ACCOUNT = 3

export const FIELD_LIMITS = {
  label: { min: 1, max: 40 },
  company: { min: 2, max: 80 },
  useCase: { min: 10, max: 500 },
  website: { min: 0, max: 200 },
} as const

export const API_PUBLIC_BASE = 'https://api.cambio-uruguay.com'
export const API_CONTACT_EMAIL = 'admin@cambio-uruguay.com'

export interface ApiKeyRecord {
  id: string
  prefix: string
  label: string
  ownerUid: string
  ownerEmail: string | null
  company: string
  useCase: string
  website: string | null
  plan: ApiPlanId
  limits: { perMinute?: number; perDay?: number } | null
  status: 'active' | 'revoked'
  createdAt: string
  revokedAt: string | null
  lastUsedAt: string | null
  notes: string | null
}

export interface ClientSummary {
  total: number
  last7: number
  routes: { route: string; count: number }[]
  daily: { day: string; count: number }[]
}

export interface AnonymousLead {
  userAgent: string
  total: number
  last7: number
  routes: { route: string; count: number }[]
}

export interface ApiUsageResponse {
  from: string
  to: string
  days: number
  byClient: Record<string, ClientSummary>
  anonymous?: AnonymousLead[]
  site?: ClientSummary | null
}

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString('es-UY')
}

/** Fecha corta en Montevideo. Sólo se usa en componentes que cargan en el cliente. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
}

export function keyUsage(usage: ApiUsageResponse | null | undefined, id: string): ClientSummary | null {
  return usage?.byClient?.[`key:${id}`] ?? null
}

export function curlExample(credential: string): string {
  return `curl -H "X-API-Key: ${credential}" ${API_PUBLIC_BASE}/usage`
}
