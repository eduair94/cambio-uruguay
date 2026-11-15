// CAMBIO-URUGUAY-BACKEND-1J: the blog index is written by the two pm2 cluster
// instances to the `fs` storage driver, non-atomically. At the Montevideo day
// rollover both generated posts at once and left an index file that was not
// valid JSON; unstorage handed it back as a raw string and `/api/blog` threw
// `.filter is not a function` on every request until someone fixed the file.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStorage, prefixStorage } from 'unstorage'

let storage = createStorage()
vi.stubGlobal('useStorage', (base: string) => prefixStorage(storage, base))

const { listPosts } = await import('../../server/utils/blog')

const post = (date: string, category: string) => ({
  slug: `${date}-${category}`,
  date,
  category,
  title: `t ${date} ${category}`,
  summary: 's',
  body: 'b',
  headlines: [],
  createdAt: `${date}T03:00:00.000Z`,
})

describe('blog index self-heal', () => {
  beforeEach(async () => {
    storage = createStorage()
    await storage.setItem('blog:posts:2026-11-14-dolar-global', post('2026-11-14', 'dolar-global'))
    await storage.setItem(
      'blog:posts:2026-11-15-dolar-uruguay',
      post('2026-11-15', 'dolar-uruguay')
    )
  })

  it('rebuilds the index from the posts when the stored index is truncated JSON', async () => {
    await storage.setItemRaw('blog:index', '[{"slug":"2026-11-14-dolar-global","date":"2026-1')
    const posts = await listPosts()
    expect(posts.map(p => p.slug)).toEqual(['2026-11-15-dolar-uruguay', '2026-11-14-dolar-global'])
    expect(posts[0]).not.toHaveProperty('body')
    // and the repaired index was written back
    expect(Array.isArray(await storage.getItem('blog:index'))).toBe(true)
  })

  it('rebuilds when the index is a non-array object', async () => {
    await storage.setItem('blog:index', { broken: true })
    expect(await listPosts(1)).toHaveLength(1)
  })

  it('drops malformed entries from an otherwise valid index', async () => {
    await storage.setItem('blog:index', [
      null,
      'x',
      { slug: 1 },
      post('2026-11-14', 'dolar-global'),
    ])
    expect((await listPosts()).map(p => p.slug)).toEqual(['2026-11-14-dolar-global'])
  })

  it('returns [] when there is no index at all', async () => {
    storage = createStorage()
    expect(await listPosts()).toEqual([])
  })
})
