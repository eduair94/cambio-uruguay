// Panel privado de clientes de la API: todas las claves, su uso y quién usa la API sin clave (los
// candidatos a un plan). Sólo NUXT_ADMIN_EMAILS, nunca cacheado en el borde.
import type { ApiKeyRecord, ApiUsageResponse } from '../../../utils/apiKeys'
import { apiAdminFetch } from '../../utils/apiAdmin'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const { keys } = await apiAdminFetch<{ keys: ApiKeyRecord[] }>('/admin/api-keys', { query: {} })
  const usage = await apiAdminFetch<ApiUsageResponse>('/admin/api-usage', { query: { days: 30 } })
  return { keys, usage }
})
