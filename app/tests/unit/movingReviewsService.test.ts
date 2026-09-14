import { describe, expect, it, vi } from 'vitest'
import { createMovingReviewsService, MOVING_REVIEW_FIELDS } from '../../server/utils/movingReviews'
import type { MovingReviewProfile } from '../../utils/movingReviews'

const profile: MovingReviewProfile = {
  key: 'provider-montevideo',
  providerId: 'provider',
  platform: 'google',
  status: 'verified',
  placeId: 'ChIJ_reviewed_listing_12345',
  profileUrl: 'https://maps.google.com/?cid=123',
  label: 'Montevideo',
  expectedNames: ['Example Moving'],
  expectedCountryCode: 'UY',
}
const json = {
  status: 'OK',
  result: {
    place_id: profile.placeId,
    name: 'Example Moving',
    rating: 4.5,
    user_ratings_total: 20,
  },
}
const input = {
  providerId: 'provider',
  profileKey: profile.key,
  ip: 'test-ip',
  gmapsBase: 'http://internal-proxy:2221',
}

describe('moving reviews live service', () => {
  it('requests only an allowlisted profile, without retry or text fields', async () => {
    const fetcher = vi.fn().mockResolvedValue(json)
    const service = createMovingReviewsService({ profiles: [profile], fetcher })
    expect((await service.read(input)).body.status).toBe('ok')
    expect(fetcher).toHaveBeenCalledWith('http://internal-proxy:2221/placeDetails', {
      params: { place_id: profile.placeId, fields: MOVING_REVIEW_FIELDS },
      timeout: 15000,
      retry: 0,
    })
    expect(MOVING_REVIEW_FIELDS.split(',')).not.toContain('reviews')
    expect(MOVING_REVIEW_FIELDS.split(',')).not.toContain('html_attributions')
  })

  it('does not share or cache Google responses between requests', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json)
      .mockResolvedValueOnce({ ...json, result: { ...json.result, user_ratings_total: 21 } })
    const service = createMovingReviewsService({ profiles: [profile], fetcher })
    expect((await service.read(input)).body.count).toBe(20)
    expect((await service.read(input)).body.count).toBe(21)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('rejects arbitrary IDs and a known profile belonging to another provider before fetching', async () => {
    const fetcher = vi.fn()
    const service = createMovingReviewsService({ profiles: [profile], fetcher })
    expect((await service.read({ ...input, providerId: 'attacker' })).statusCode).toBe(404)
    expect(
      (await service.read({ ...input, profileKey: 'https://attacker.invalid/' })).statusCode
    ).toBe(404)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('requires a branch selection when several approved profiles exist', async () => {
    const fetcher = vi.fn().mockResolvedValue(json)
    const service = createMovingReviewsService({
      profiles: [profile, { ...profile, key: 'other-branch' }],
      fetcher,
    })
    expect((await service.read({ ...input, profileKey: undefined })).body.status).toBe(
      'profile_required'
    )
    expect(fetcher).not.toHaveBeenCalled()
    expect((await service.read(input)).body.status).toBe('ok')
  })

  it('never calls ambiguous, rejected or unpinned profiles', async () => {
    const fetcher = vi.fn()
    for (const candidate of [
      { ...profile, status: 'ambiguous' as const },
      { ...profile, status: 'rejected' as const },
      { ...profile, placeId: undefined },
    ]) {
      const service = createMovingReviewsService({ profiles: [candidate], fetcher })
      expect((await service.read(input)).body.status).toBe('unknown_profile')
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('stays inert without a valid configured base or when explicitly disabled', async () => {
    const fetcher = vi.fn()
    const service = createMovingReviewsService({ profiles: [profile], fetcher })
    expect((await service.read({ ...input, gmapsBase: '' })).body.status).toBe('not_configured')
    expect((await service.read({ ...input, gmapsBase: 'file:///tmp/data' })).body.status).toBe(
      'not_configured'
    )
    expect((await service.read({ ...input, enabled: false })).body.status).toBe('not_configured')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('hides private upstream failures and does not fall back to previous data', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json)
      .mockRejectedValueOnce(new Error('http://private-proxy/secret-api-key'))
    const service = createMovingReviewsService({ profiles: [profile], fetcher })
    await service.read(input)
    const response = await service.read(input)
    expect(response).toMatchObject({
      statusCode: 503,
      body: { status: 'unavailable', rating: null, count: null },
    })
    expect(JSON.stringify(response)).not.toMatch(/private-proxy|secret-api-key/)
  })

  it('returns an identity mismatch without publishing the wrong score', async () => {
    const service = createMovingReviewsService({
      profiles: [profile],
      fetcher: vi
        .fn()
        .mockResolvedValue({ ...json, result: { ...json.result, place_id: 'different-pin' } }),
    })
    expect(await service.read(input)).toMatchObject({
      statusCode: 200,
      body: { status: 'identity_mismatch', rating: null },
    })
  })

  it('limits each IP and permits reads after the quota window', async () => {
    let time = 1000
    const fetcher = vi.fn().mockResolvedValue(json)
    const service = createMovingReviewsService({
      profiles: [profile],
      fetcher,
      perIpLimit: 1,
      now: () => time,
    })
    expect((await service.read(input)).body.status).toBe('ok')
    expect((await service.read(input)).statusCode).toBe(429)
    expect(fetcher).toHaveBeenCalledTimes(1)
    time += 60000
    expect((await service.read(input)).body.status).toBe('ok')
  })

  it('applies a global quota across different IPs', async () => {
    const fetcher = vi.fn().mockResolvedValue(json)
    const service = createMovingReviewsService({ profiles: [profile], fetcher, globalLimit: 1 })
    await service.read(input)
    expect((await service.read({ ...input, ip: 'other-ip' })).body.status).toBe('rate_limited')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('bounds concurrent work and releases the slot after upstream failure', async () => {
    let reject!: (reason: Error) => void
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail
          })
      )
      .mockResolvedValue(json)
    const service = createMovingReviewsService({ profiles: [profile], fetcher, maxConcurrent: 1 })
    const pending = service.read(input)
    expect((await service.read({ ...input, ip: 'other-ip' })).body.status).toBe('busy')
    reject(new Error('upstream down'))
    expect((await pending).body.status).toBe('unavailable')
    expect((await service.read({ ...input, ip: 'other-ip' })).body.status).toBe('ok')
  })

  it('permits concurrent reads from one IP while keeping the default global capacity at three', async () => {
    const resolve: Array<(value: unknown) => void> = []
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise(done => {
          resolve.push(done)
        })
    )
    const service = createMovingReviewsService({ profiles: [profile], fetcher })
    const pending = [
      service.read(input),
      service.read(input),
      service.read({ ...input, ip: 'other-ip' }),
    ]
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(await service.read(input)).toMatchObject({
      statusCode: 503,
      body: { status: 'busy' },
    })
    expect((await service.read({ ...input, ip: 'third-ip' })).body.status).toBe('busy')
    expect(fetcher).toHaveBeenCalledTimes(3)

    resolve[0](json)
    expect((await pending[0]).body.status).toBe('ok')
    pending.push(service.read(input))
    expect(fetcher).toHaveBeenCalledTimes(4)
    for (const finish of resolve.slice(1)) finish(json)
    expect((await Promise.all(pending)).every(response => response.body.status === 'ok')).toBe(true)
  })

  it('bounds quota-memory growth and removes expired counters', async () => {
    let time = 1000
    const service = createMovingReviewsService({
      profiles: [profile],
      fetcher: vi.fn().mockResolvedValue(json),
      maxIpEntries: 1,
      now: () => time,
    })
    await service.read(input)
    expect((await service.read({ ...input, ip: 'other-ip' })).statusCode).toBe(429)
    time += 60000
    expect((await service.read({ ...input, ip: 'other-ip' })).body.status).toBe('ok')
  })
})
