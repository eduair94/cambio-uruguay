import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, ref, watch } from 'vue'
import {
  useRentalAvailability,
  rentalAvailabilityErrorCode,
} from '../../composables/useRentalAvailability'

const advert = {
  source: 'infocasas' as const,
  listingId: 'infocasas:123',
  title: 'Never send extra fields',
  url: 'https://example.invalid',
}
const summary = { count: 2, lastReportedAt: '2026-09-06T12:00:00Z', status: 'unconfirmed' }
const revision = '00000000-0000-4000-8000-000000000001'
let auth: { user: { uid: string } | null; getToken: ReturnType<typeof vi.fn> }
let states: Map<string, ReturnType<typeof ref>>
const request = vi.fn()
let scope: ReturnType<typeof effectScope>
beforeEach(() => {
  vi.resetAllMocks()
  scope = effectScope()
  states = new Map()
  auth = reactive({
    user: { uid: 'account-a' },
    getToken: vi.fn().mockResolvedValue('intercepted-token'),
  })
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('$fetch', request)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('useState', (key: string, initial: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(initial()))
    return states.get(key)
  })
  request.mockImplementation(async (url: string) =>
    url.startsWith('/api/me/')
      ? { reported: false, expiresAt: null, canReport: true, revision }
      : { summary, currentPropertyKey: 'stable-group' }
  )
})
afterEach(() => {
  scope.stop()
  vi.unstubAllGlobals()
})
const client = () => scope.run(() => useRentalAvailability())!

describe('community availability client', () => {
  it('replaces an inspected count when a later public result reports its withdrawal or expiry', async () => {
    const api = client()
    await api.inspect(advert)
    expect(api.summaries.value[api.key(advert)].count).toBe(2)
    api.syncSummaries([
      { ...advert, availability: { count: 0, lastReportedAt: null, status: 'unconfirmed' } },
    ])
    expect(api.summaries.value[api.key(advert)].count).toBe(0)
  })
  it('does no passive requests and sends only source/id when explicitly inspecting', async () => {
    const api = client()
    expect(request).not.toHaveBeenCalled()
    await api.inspect(advert)
    expect(request).toHaveBeenCalledTimes(2)
    for (const [, options] of request.mock.calls) {
      expect(options.query).toEqual({ source: advert.source, listingId: advert.listingId })
      expect(options.cache).toBe('no-store')
    }
  })
  it('never fetches private state for a signed-out visitor', async () => {
    auth.user = null
    const api = client()
    await api.inspect(advert)
    expect(request).toHaveBeenCalledTimes(1)
    expect(api.own.value).toEqual({})
  })
  it('uses CAS revision, explicit identity and timestamp bust only after confirmed mutation', async () => {
    const api = client()
    await api.inspect(advert)
    request.mockResolvedValue({
      summary,
      reported: true,
      expiresAt: '2026-10-06T12:00:00Z',
      revision,
    })
    expect(api.withRevision({ availability: 'hide_any' })).toEqual({ availability: 'hide_any' })
    const now = Date.now()
    await api.submit(advert, false)
    expect(request).toHaveBeenLastCalledWith(
      '/api/me/rental-availability',
      expect.objectContaining({
        method: 'POST',
        body: { source: advert.source, listingId: advert.listingId, revision },
      })
    )
    expect(api.revision.value).toBeGreaterThanOrEqual(now)
    expect(api.withRevision({ availability: 'hide_any' }).availabilityRevision).toBe(
      api.revision.value
    )
  })
  it('refreshes a CAS conflict without automatically repeating the mutation', async () => {
    const api = client()
    await api.inspect(advert)
    request.mockImplementation(async (url: string, options: any) => {
      if (options.method) throw { data: { data: { code: 'report_changed' } } }
      return url.startsWith('/api/me/')
        ? { reported: true, canReport: false, expiresAt: null, revision: 'new' }
        : { summary, currentPropertyKey: 'stable-group' }
    })
    await expect(api.submit(advert, false)).rejects.toMatchObject({
      data: { data: { code: 'report_changed' } },
    })
    expect(request.mock.calls.filter(([, options]) => options.method)).toHaveLength(1)
    expect(api.own.value[api.key(advert)].reported).toBe(true)
    expect(api.revision.value).toBe(0)
  })
  it('defers result refresh until the report dialog closes', async () => {
    const api = client(),
      refresh = vi.fn()
    scope.run(() => api.watchChanges(refresh))
    api.activeDialog.value = 'report'
    api.revision.value = Date.now()
    await nextTick()
    expect(refresh).not.toHaveBeenCalled()
    api.activeDialog.value = null
    await nextTick()
    expect(refresh).toHaveBeenCalledTimes(1)
  })
  it('withdraws using its current revision even when new reporting is unavailable', async () => {
    const api = client()
    await api.inspect(advert)
    api.own.value[api.key(advert)] = { reported: true, canReport: false, expiresAt: null, revision }
    request.mockResolvedValue({
      summary: { ...summary, count: 1 },
      reported: false,
      expiresAt: null,
      revision,
    })
    await api.submit(advert, true)
    expect(request).toHaveBeenLastCalledWith(
      '/api/me/rental-availability',
      expect.objectContaining({
        method: 'DELETE',
        query: { source: advert.source, listingId: advert.listingId, revision },
      })
    )
  })
  it('does not send a mutation with a different account token', async () => {
    const api = client()
    await api.inspect(advert)
    request.mockClear()
    auth.getToken.mockImplementation(async () => {
      auth.user = { uid: 'account-b' }
      return 'other-account-token'
    })
    await expect(api.submit(advert, false)).rejects.toMatchObject({
      data: { code: 'auth_required' },
    })
    expect(request).not.toHaveBeenCalled()
  })
  it('does not place a late mutation result into a different account state', async () => {
    const api = client()
    await api.inspect(advert)
    request.mockImplementation(async () => {
      auth.user = { uid: 'account-b' }
      await nextTick()
      return { summary, reported: true, expiresAt: null, revision }
    })
    await expect(api.submit(advert, false)).rejects.toMatchObject({
      data: { code: 'auth_required' },
    })
    expect(api.own.value).toEqual({})
    expect(api.revision.value).toBe(0)
  })
  it('preserves the server rate-limit code', () => {
    expect(rentalAvailabilityErrorCode({ data: { data: { code: 'rate_limited' } } })).toBe(
      'rate_limited'
    )
  })
})
