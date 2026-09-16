import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { dateLocale } from '../../utils/format'

// The bug this guards: `'es'` and `'es-UY'` are NOT interchangeable in ICU.
// `toLocaleDateString('es', {month: 'long'})` renders "septiembre" (the Spain
// spelling); only `'es-UY'` renders "setiembre" (the Uruguay spelling). Every
// guide-page footer in production rendered "septiembre" until every raw
// `locale.value`/`c.value.lang` argument was routed through `dateLocale()`.
// This file is the tripwire against that regressing.

describe('dateLocale', () => {
  it('maps the site i18n locales to their BCP-47 formatting tag', () => {
    expect(dateLocale('es')).toBe('es-UY')
    expect(dateLocale('en')).toBe('en-US')
    expect(dateLocale('pt')).toBe('pt-BR')
  })

  it('returns anything else unchanged', () => {
    expect(dateLocale('fr')).toBe('fr')
    expect(dateLocale('es-UY')).toBe('es-UY')
    expect(dateLocale('pt-BR')).toBe('pt-BR')
  })

  it('renders "setiembre", not "septiembre", for the Uruguay locale', () => {
    const formatted = new Date('2026-09-16T00:00:00Z').toLocaleDateString(dateLocale('es'), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    expect(formatted).toContain('setiembre')
    expect(formatted).not.toContain('septiembre')
  })
})

// --- Tripwire: no page may format a date/number with the raw i18n locale ---
//
// `pages/**/*.vue` must not call `toLocaleDateString`/`toLocaleString` with the
// bare i18n locale (`locale.value`) or a content-lang field carrying it
// (`c.value.lang`) -- that is exactly the call shape that rendered
// "septiembre" in production. Route it through `dateLocale()` instead.
const APP_ROOT = path.resolve(__dirname, '..', '..')
const PAGES_ROOT = path.join(APP_ROOT, 'pages')

const BANNED: RegExp[] = [
  /toLocaleDateString\(\s*locale\.value/,
  /toLocaleString\(\s*locale\.value/,
  /toLocaleDateString\(\s*c\.value\.lang/,
  /toLocaleString\(\s*c\.value\.lang/,
]

// Explicit, documented opt-outs. Keep this list short -- each entry is a file
// this test would otherwise fail, with the reason it is allowed to keep the
// raw locale. Do NOT add an entry just to silence a real regression.
const ALLOWED_EXCEPTIONS: Record<string, string> = {
  'pizarra.vue':
    "Formats day/month as 2-digit numerals ({day:'2-digit', month:'2-digit'}) -- no month " +
    'name is ever spelled out, so the setiembre/septiembre bug cannot occur here. The ' +
    "locale.value ternary picks 'en-GB' (not 'en-US') on purpose, for DD/MM day-before-" +
    'month ordering in English, which dateLocale() does not provide.',
}

function walkVueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkVueFiles(full, out)
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

describe('no page formats a date/number with the raw i18n locale', () => {
  it('routes every locale.value / c.value.lang formatting call through dateLocale()', () => {
    const hits: string[] = []
    for (const file of walkVueFiles(PAGES_ROOT)) {
      const relative = path.relative(PAGES_ROOT, file).split(path.sep).join('/')
      if (relative in ALLOWED_EXCEPTIONS) continue
      const src = fs.readFileSync(file, 'utf8')
      for (const re of BANNED) {
        if (re.test(src)) hits.push(`pages/${relative} — matches ${re}`)
      }
    }
    expect(
      hits,
      `Found a raw locale.value/c.value.lang date/number format -- wrap it with dateLocale() ` +
        `from utils/format.ts (or add a documented exception above):\n${hits.join('\n')}`
    ).toEqual([])
  })

  it('documents why each exception is exempt', () => {
    for (const [file, reason] of Object.entries(ALLOWED_EXCEPTIONS)) {
      expect(fs.existsSync(path.join(PAGES_ROOT, file)), `${file} no longer exists`).toBe(true)
      expect(reason.length).toBeGreaterThan(20)
    }
  })
})
