import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// The rule: the Gemini key lives ONLY in the root .env, and anything that uses Gemini lives in the
// root Express backend. This test is what makes that a fact instead of an intention. It fails the
// moment somebody adds a Gemini call back into app/ — which is exactly how the first one got here.
const APP_ROOT = path.resolve(__dirname, '..', '..')
const SKIP = new Set([
  'node_modules',
  '.nuxt',
  '.output',
  '.data',
  'dist',
  '.git',
  'coverage',
  'test-results',
])
const EXTS = new Set(['.ts', '.js', '.vue', '.mjs', '.cjs'])

const BANNED: Array<[RegExp, string]> = [
  [/generativelanguage\.googleapis\.com/, 'a direct call to the Gemini API'],
  [/\bgeminiApiKey\b/, 'a read of the Gemini key from runtimeConfig'],
  [/\bNUXT_GEMINI_API_KEY\b/, 'a read of the Gemini key from the environment'],
  [/google_search/, 'a Gemini grounding tool declaration'],
]

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (EXTS.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

describe('no Gemini in the Nuxt app', () => {
  it('has no file that calls Gemini or reads its key', () => {
    const self = path.resolve(__filename)
    const hits: string[] = []
    for (const file of walk(APP_ROOT)) {
      if (path.resolve(file) === self) continue // this test names the patterns it bans
      const src = fs.readFileSync(file, 'utf8')
      for (const [re, why] of BANNED) {
        if (re.test(src)) hits.push(`${path.relative(APP_ROOT, file)} — ${why}`)
      }
    }
    expect(
      hits,
      `Gemini belongs in the root Express backend (classes/gemini.ts), not in app/:\n${hits.join('\n')}`
    ).toEqual([])
  })
})
