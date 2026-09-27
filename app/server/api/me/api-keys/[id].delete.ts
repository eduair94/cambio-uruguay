// Revocar una clave propia. La API sólo actúa sobre claves de este `ownerUid` y sólo acepta
// revocar o renombrar cuando viene uno.
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const id = String(getRouterParam(event, 'id') || '')
  if (!/^[a-f0-9]{24}$/.test(id))
    throw createError({ statusCode: 400, statusMessage: 'Clave inválida.' })
  await apiAdminFetch(`/admin/api-keys/${id}`, {
    method: 'PATCH',
    body: { ownerUid: uid, status: 'revoked' },
  })
  return { ok: true }
})
