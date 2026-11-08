import mongoose from 'mongoose'

let promise: Promise<typeof mongoose> | null = null

/**
 * Closes the pool once a prerendered route is done with it.
 *
 * `nuxt build` prerenders inside the build process, so an open Mongo pool
 * keeps its event loop alive and the build never exits — it hangs holding the
 * deploy flock, which blocks every later deploy. At runtime this is a no-op:
 * the server must keep its pool.
 */
export async function disconnectDbAfterPrerender(): Promise<void> {
  if (!import.meta.prerender) return
  promise = null
  await mongoose.disconnect().catch(() => {})
}

export function connectDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose)
  if (!promise) {
    const uri = useRuntimeConfig().mongoUri
    if (!uri) throw new Error('MONGO_URI is not configured')
    // 25 connections per worker, not 5. The 5 dates from the first Mongo use of the app (auth, June
    // 2026); since then one /api/rentals search alone runs six aggregations, the coverage count and
    // the meta read at once, and every concurrent SSR shares the same pool. Measured on 2026-11-08,
    // a cold Montevideo search: the pipelines take ~3 s in parallel straight against Mongo, the API
    // answered in 10–14 s, about what they cost one after the other — they were queueing for five
    // connections. Two workers x 25 is nothing for the local mongod (~50.000 connections free).
    promise = mongoose.connect(uri, { maxPoolSize: 25 })
    promise.catch(() => {
      promise = null // allow retry on next call after a failed connect
    })
  }
  return promise
}
