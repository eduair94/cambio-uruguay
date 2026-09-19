import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rentalMessages } from '../../utils/rentalMessages'

// A missing local key does not fail anything: vue-i18n falls back to printing the key. On
// 2026-09-09 a commit about the address finder rewrote utils/rentalMessages.ts from a copy that
// predated the tiles/list toggle, and for nine days the directory's view switch read "tiles" and
// announced itself to screen readers as "viewMode" — in all three languages, with the suite green.
const consumers = [
  'pages/alquileres-uruguay.vue',
  'components/rentals/MapPropertyDetail.vue',
  'components/rentals/ReferenceAddress.vue',
  'components/rentals/SearchFilters.vue',
]

// Literal keys passed to the local `t` — `t('x')`, `t('x', …)` and both arms of `t(c ? 'x' : 'y')`.
// `globalT(`, `$t(` and `te(` are other scopes and are left out by the look-behind.
function localKeys(source: string): string[] {
  const keys = new Set<string>()
  for (const call of source.matchAll(/(?<![\w$.])t\(([^()]*?)(?:,|\))/g)) {
    const args = call[1]!.trim()
    if (!/^(?:'[\w.]+'|[^'"`?]*\?\s*'[\w.]+'\s*:\s*'[\w.]+')$/.test(args)) continue
    for (const literal of args.matchAll(/'([\w.]+)'/g)) keys.add(literal[1]!)
  }
  return [...keys].sort()
}

function has(messages: Record<string, unknown>, key: string): boolean {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) return false
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string'
}

describe('rental route-local messages', () => {
  for (const file of consumers) {
    const keys = localKeys(readFileSync(resolve(__dirname, '../..', file), 'utf8'))

    it(`${file} reads keys at all (guard against a parser that matches nothing)`, () => {
      expect(keys.length).toBeGreaterThan(0)
    })

    for (const locale of ['es', 'en', 'pt'] as const) {
      it(`${file}: every literal key exists in ${locale}`, () => {
        const messages = rentalMessages[locale] as Record<string, unknown>
        expect(keys.filter(key => !has(messages, key))).toEqual([])
      })
    }
  }
})
