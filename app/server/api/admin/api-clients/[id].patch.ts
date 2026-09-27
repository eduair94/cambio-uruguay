// El dueño del sitio cambia plan, límites, estado o notas de una clave. Nunca reenvía un
// `ownerUid`: con él la API acotaría el cambio a revocar o renombrar.
import type { ApiKeyRecord } from '../../../../utils/apiKeys'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireAdmin } from '../../../utils/requireAdmin'

const FIELDS = ['plan', 'limits', 'status', 'notes', 'label'] as const

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const id = String(getRouterParam(event, 'id') || '')
  if (!/^[a-f0-9]{24}$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Clave inválida.' })
  const b = ((await readBody(event)) ?? {}) as Record<string, unknown>
  const body: Record<string, unknown> = {}
  for (const field of FIELDS) if (b[field] !== undefined) body[field] = b[field]
  return apiAdminFetch<{ apiKey: ApiKeyRecord }>(`/admin/api-keys/${id}`, { method: 'PATCH', body })
})
