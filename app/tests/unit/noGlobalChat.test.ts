import { readFileSync, readdirSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const appRoot = resolve(import.meta.dirname, '../..')
function runtimeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = resolve(directory, entry.name)
    if (entry.isDirectory()) return runtimeFiles(file)
    return /\.(?:vue|ts|js|mjs|css|html)$/.test(entry.name) ? [file] : []
  })
}

describe('global support chat removal', () => {
  it('has no loader, resource hint or widget API in the application runtime', () => {
    const files = [
      resolve(appRoot, 'app.vue'),
      resolve(appRoot, 'nuxt.config.ts'),
      ...['plugins', 'components', 'layouts', 'pages', 'server', 'public'].flatMap(directory =>
        runtimeFiles(resolve(appRoot, directory))
      ),
    ]
    const forbidden = /(?:https?:)?\/\/[^\s'"<>]*\btawk\.to\b|\bTawk_API\b|\bTawk_LoadStart\b/
    expect(
      files
        .filter(file => forbidden.test(readFileSync(file, 'utf8')))
        .map(file => relative(appRoot, file))
    ).toEqual([])
  })

  it('does not retain the obsolete chat toggle or reserve screen space for its bubble', () => {
    const files = [
      'app.vue',
      'pages/avanzado.vue',
      'components/ExchangeFilters.vue',
      'components/DonationCard.vue',
    ]
    for (const file of files) {
      expect(readFileSync(resolve(appRoot, file), 'utf8'), file).not.toMatch(
        /hideWidgets|hiddenWidgets|chat-bubble-height/
      )
    }
  })
})
