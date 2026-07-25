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
    promise = mongoose.connect(uri, { maxPoolSize: 5 })
    promise.catch(() => {
      promise = null // allow retry on next call after a failed connect
    })
  }
  return promise
}
