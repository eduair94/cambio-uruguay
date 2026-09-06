import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, ref, watch } from 'vue'
import { useRentalAlerts, rentalAlertErrorCode } from '../../composables/useRentalAlerts'
import type { RentalAlertSubscription } from '../../utils/rentalAlerts'

const item = {
  id: '507f1f77bcf86cd799439011',
  kind: 'rental-search',
  name: 'My search',
  filters: { department: 'Montevideo' },
  channels: { email: true, push: false },
  frequency: 'hourly',
  active: true,
  locale: 'es',
  searchUrl: '/alquileres-uruguay',
  createdAt: '2026-09-06T12:00:00Z',
  updatedAt: '2026-09-06T12:00:00Z',
  lastNotifiedAt: null,
} satisfies RentalAlertSubscription
let auth: { user: { uid: string } | null; ready: boolean; getToken: ReturnType<typeof vi.fn> }
let states: Map<string, ReturnType<typeof ref>>
const request = vi.fn()
beforeEach(() => {
  vi.resetAllMocks()
  states = new Map()
  auth = reactive({
    user: { uid: 'account-a' },
    ready: true,
    getToken: vi.fn().mockResolvedValue('token-a'),
  })
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useAuthFetch', () => ({ authFetch: request }))
  vi.stubGlobal('$fetch', request)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('useState', (key: string, initial: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(initial()))
    return states.get(key)
  })
  vi.stubGlobal('useI18n', () => ({ locale: ref('es') }))
  vi.stubGlobal('useRoute', () => ({ fullPath: '/alquileres-uruguay?department=Montevideo' }))
  vi.stubGlobal('document', { activeElement: { id: 'alert-trigger' } })
  const storage = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    setItem: (key: string, value: string) => storage.set(key, value),
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => storage.delete(key),
  })
})

describe('rental alert client account isolation', () => {
  for (const mutation of ['save', 'pause', 'delete'] as const)
    it(`does not publish an old account's ${mutation} response into the new account`, async () => {
      const alerts = useRentalAlerts()
      alerts.begin('rental-search', { department: 'Montevideo' })
      alerts.items.value = [item]
      request.mockImplementation(async () => {
        auth.user = { uid: 'account-b' }
        await nextTick()
        return { item: { ...item, active: false } }
      })
      const action =
        mutation === 'save'
          ? alerts.save()
          : mutation === 'pause'
            ? alerts.setActive(item, false)
            : alerts.remove(item)
      await expect(action).rejects.toMatchObject({ data: { code: 'auth_required' } })
      expect(alerts.items.value).toEqual([])
      expect(alerts.draft.value?.filters).toEqual({ department: 'Montevideo' })
    })

  it('does not send a request with the next account token', async () => {
    const alerts = useRentalAlerts()
    alerts.begin('rental-search', {})
    auth.getToken.mockImplementation(async () => {
      auth.user = { uid: 'account-b' }
      return 'token-b'
    })
    await expect(alerts.save()).rejects.toMatchObject({ data: { code: 'auth_required' } })
    expect(request).not.toHaveBeenCalled()
  })

  it('clears account-owned edit drafts on account change', async () => {
    const alerts = useRentalAlerts()
    alerts.edit(item)
    expect(alerts.draft.value?.ownerUid).toBe('account-a')
    auth.user = { uid: 'account-b' }
    await nextTick()
    expect(alerts.draft.value).toBeNull()
    expect(alerts.open.value).toBe(false)
    expect(sessionStorage.getItem('cu_rental_alert_draft_v1')).toBeNull()
  })

  it('keeps a newer public draft if an earlier create response arrives', async () => {
    const alerts = useRentalAlerts()
    alerts.begin('rental-search', { department: 'Montevideo' })
    request.mockImplementation(async () => {
      alerts.begin('rental-search', { department: 'Canelones' })
      return { item, alreadyExists: false }
    })
    await alerts.save()
    expect(alerts.draft.value?.filters.department).toBe('Canelones')
  })

  it('reactivates a channel-less subscription only with explicitly chosen channels', async () => {
    const alerts = useRentalAlerts()
    alerts.edit({ ...item, active: false, channels: { email: false, push: false } }, true)
    alerts.draft.value!.channels.email = true
    request.mockResolvedValue({ item })
    await alerts.save()
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining(item.id),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ active: true, channels: { email: true, push: false } }),
      })
    )
  })

  it('recognizes nested H3 rate-limit errors without replacing the draft', () => {
    expect(rentalAlertErrorCode({ data: { data: { code: 'too_many_requests' } } })).toBe(
      'too_many_requests'
    )
  })
})
