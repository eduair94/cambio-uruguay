import { beforeEach, describe, expect, it, vi } from 'vitest'

import createHandler from '../../server/api/share-links.post'
import readHandler from '../../server/api/share-links/[id].get'

const mocks = vi.hoisted(() => {
  class SharedLinkError extends Error {
    constructor(readonly statusCode: number) {
      super('Failure')
    }
  }
  return {
    SharedLinkError,
    createSharedLink: vi.fn(),
    readSharedLink: vi.fn(),
    readSharedLinkBody: vi.fn(),
    takeSharedLinkQuota: vi.fn(),
    getHeader: vi.fn(),
    getRequestIP: vi.fn(),
    getRouterParam: vi.fn(),
    setResponseHeader: vi.fn(),
  }
})
vi.mock('h3', () => ({
  defineEventHandler: (fn: unknown) => fn,
  createError: (error: any) => Object.assign(new Error(error.statusMessage), error),
  getHeader: mocks.getHeader,
  getRequestIP: mocks.getRequestIP,
  getRouterParam: mocks.getRouterParam,
  setResponseHeader: mocks.setResponseHeader,
}))
vi.mock('../../server/utils/sharedLinks', () => mocks)

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getRequestIP.mockReturnValue('127.0.0.1')
  mocks.getRouterParam.mockReturnValue('AbCd_0123-xy')
})

describe('share link HTTP endpoints', () => {
  it('applies quota before reading the body, delegates validation and never caches writes', async () => {
    const body = { path: '/comparar' }
    mocks.readSharedLinkBody.mockResolvedValue(body)
    mocks.createSharedLink.mockResolvedValue({ id: 'AbCd_0123-xy' })
    expect(await createHandler({} as any)).toEqual({ id: 'AbCd_0123-xy' })
    expect(mocks.createSharedLink).toHaveBeenCalledWith(body)
    expect(mocks.takeSharedLinkQuota.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.readSharedLinkBody.mock.invocationCallOrder[0]!
    )
    expect(mocks.setResponseHeader).toHaveBeenCalledWith({}, 'cache-control', 'no-store')
  })

  it('rejects cross-site writes before body/database access', async () => {
    mocks.getHeader.mockReturnValue('cross-site')
    await expect(createHandler({} as any)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.readSharedLinkBody).not.toHaveBeenCalled()
    expect(mocks.createSharedLink).not.toHaveBeenCalled()
  })

  it('returns retry-after for rate-limited writes and hides database error details', async () => {
    mocks.takeSharedLinkQuota.mockImplementationOnce(() => {
      throw new mocks.SharedLinkError(429)
    })
    await expect(createHandler({} as any)).rejects.toMatchObject({ statusCode: 429 })
    expect(mocks.setResponseHeader).toHaveBeenCalledWith({}, 'retry-after', '60')
    mocks.createSharedLink.mockRejectedValueOnce(new Error('mongodb://credentials-private'))
    await expect(createHandler({} as any)).rejects.toMatchObject({
      statusCode: 503,
      message: 'Sharing temporarily unavailable',
    })
  })

  it('caches only successful immutable reads, not errors', async () => {
    mocks.readSharedLink.mockResolvedValueOnce({ path: '/comparar' })
    expect(await readHandler({} as any)).toEqual({ path: '/comparar' })
    expect(mocks.readSharedLink).toHaveBeenCalledWith('AbCd_0123-xy')
    expect(mocks.setResponseHeader).toHaveBeenLastCalledWith(
      {},
      'cache-control',
      'public, max-age=300, s-maxage=3600'
    )
    mocks.setResponseHeader.mockClear()
    mocks.readSharedLink.mockRejectedValueOnce(new mocks.SharedLinkError(404))
    await expect(readHandler({} as any)).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.setResponseHeader).toHaveBeenCalledOnce()
    expect(mocks.setResponseHeader).toHaveBeenCalledWith({}, 'cache-control', 'no-store')
  })
})
