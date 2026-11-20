import { randomBytes } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { defineDriver } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'

// The sitemap cache lives on disk and is shared by the two pm2 workers
// (nuxt.config.ts, `sitemap.runtimeCacheStorage`). unstorage's `fs` driver
// writes with a plain `writeFile`, which truncates the file and then fills it:
// a worker reading the same key in between gets half a JSON document, `destr`
// hands it back as a string, and Nitro's cachedFunction reports
// "Malformed data read from cache." and rebuilds the whole sitemap
// (CAMBIO-URUGUAY-BACKEND-1E, 2026-11-07 to 2026-11-20). Each built sitemap is
// megabytes of XML, so the window is wide.
//
// This driver is the `fs` driver with atomic writes: the value goes to a
// temporary file in the same directory and then replaces the key with
// `rename`, which on one filesystem swaps the whole file at once. A reader sees
// the previous document or the new one, never a partial one. Reads, keys and
// removal are the `fs` driver's own; temporary files are hidden from `getKeys`.

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/
const TMP_SUFFIX = '.tmp-write'

export interface AtomicFsOptions {
  base: string
  readOnly?: boolean
  ignore?: string[]
}

export default defineDriver((options: AtomicFsOptions) => {
  if (!options?.base) throw new Error('[unstorage] [atomic-fs] Missing required option `base`.')
  const inner = fsDriver({
    ...options,
    ignore: [...(options.ignore || ['**/node_modules/**', '**/.git/**']), `**/*${TMP_SUFFIX}`],
  })
  const base = resolve(options.base)
  const path = (key: string) => {
    if (PATH_TRAVERSE_RE.test(key))
      throw new Error(`[unstorage] [atomic-fs] Invalid key: ${JSON.stringify(key)}.`)
    return join(base, key.replace(/:/g, '/'))
  }
  async function write(key: string, value: string | Uint8Array, encoding?: BufferEncoding) {
    if (options.readOnly) return
    const target = path(key)
    await fsp.mkdir(dirname(target), { recursive: true })
    const tmp = `${target}.${process.pid}.${randomBytes(6).toString('hex')}${TMP_SUFFIX}`
    try {
      await fsp.writeFile(tmp, value, encoding)
      await fsp.rename(tmp, target)
    } catch (error) {
      await fsp.unlink(tmp).catch(() => {})
      throw error
    }
  }
  return {
    ...inner,
    name: 'atomic-fs',
    options,
    setItem: (key: string, value: string) => write(key, value, 'utf8'),
    setItemRaw: (key: string, value: string | Uint8Array) => write(key, value),
  }
})
