import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A short hash of every machine-translated message file (i18n/extra/). It goes in the URL the
 * extra-locale loader fetches (i18n/locales/extra.ts), so a deploy with new copy is a new URL
 * and no cache can serve the old one. Build-time only: nuxt.config calls it.
 */
export function extraMessagesVersion(dir: string): string {
  const hash = createHash('sha1')
  for (const file of readdirSync(dir).sort()) {
    hash.update(file).update(readFileSync(join(dir, file)))
  }
  return hash.digest('hex').slice(0, 12)
}
