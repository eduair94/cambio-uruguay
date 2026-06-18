import mongoose from 'mongoose'

let promise: Promise<typeof mongoose> | null = null

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
