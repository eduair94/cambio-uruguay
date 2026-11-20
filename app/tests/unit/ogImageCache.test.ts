import { createRequire } from 'node:module'
import { beforeAll, describe, expect, it, vi } from 'vitest'

// Rendered share cards stay in each worker's memory. With no store of its own the module used
// Nitro's root memory storage, which never evicts: every distinct card URL stayed there for its
// 3-day TTL. A count bounds nothing on its own, since an entry weighs what its card weighs; the
// bound that holds is `maxSize`, in bytes, and it has to be a small part of the heap pm2 gives a
// worker. Without `maxSize` unstorage's lru-cache driver does not even measure its entries.

type CacheStorage = { driver?: string; max?: number; maxSize?: number }
let storage: CacheStorage

beforeAll(async () => {
  vi.stubGlobal('defineNuxtConfig', (value: unknown) => value)
  try {
    const config = (await import('../../nuxt.config')).default as unknown as {
      ogImage: { runtimeCacheStorage: CacheStorage }
    }
    storage = config.ogImage.runtimeCacheStorage
  } finally {
    vi.unstubAllGlobals()
  }
})

describe('share card cache', () => {
  it('is an LRU bounded in bytes, at most an eighth of a worker heap', () => {
    const { apps } = createRequire(import.meta.url)('../../ecosystem.config.cjs')
    const worker = apps.find((app: { name: string }) => app.name === 'cambio-uruguay')
    const heapMb = Number(/--max-old-space-size=(\d+)/.exec(worker.node_args)?.[1])
    expect(heapMb).toBeGreaterThan(0)
    expect(storage.driver).toBe('lru-cache')
    expect(storage.maxSize).toBeGreaterThan(0)
    expect(storage.maxSize).toBeLessThanOrEqual((heapMb * 1024 * 1024) / 8)
  })
})
