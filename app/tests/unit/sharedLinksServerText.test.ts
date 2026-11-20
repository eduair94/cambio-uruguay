import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Tripwire (2026-11-08). A short-link service for sharing (POST /api/share-links → /s/<id>, with a
// branded page and OG card) exists as uncommitted work. Its first version wrote the page's and the
// card's title and description from the request body, so anyone could mint a cambio-uruguay.com
// link that said whatever they typed. The fixed version derives that text on the server
// (`sharedLinkText`: the page's name in the site navigation plus filters from a closed vocabulary)
// and lives in the local branch `wip/enlaces-compartidos-seguros`. This test is inert until the
// service lands, and fails CI if the unfixed copy is ever committed instead.
const service = fileURLToPath(new URL('../../server/utils/sharedLinks.ts', import.meta.url))
const summary = fileURLToPath(new URL('../../utils/shareSummary.ts', import.meta.url))

describe('a shared link never publishes text from whoever created it', () => {
  it.skipIf(!existsSync(service))('derives the card text on the server, not from the body', () => {
    const source = readFileSync(service, 'utf8')
    expect(source).not.toMatch(/normalizeShareText\(\s*input\.(?:title|description)/)
    expect(source).toMatch(/export function sharedLinkText\(/)
  })

  it.skipIf(!existsSync(summary))('prints only closed-vocabulary filter values', () => {
    const source = readFileSync(summary, 'utf8')
    expect(source).toMatch(/function closedValue\(/)
  })
})
