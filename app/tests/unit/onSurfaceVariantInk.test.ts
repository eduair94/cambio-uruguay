// Tripwire: `on-surface-variant` is NOT a muted text colour in this app.
//
// In Vuetify it is the ink of `surface-variant` — the inverted chip that tooltips paint on — so it
// flips with the theme. Measured on production (2026-10-03): the dark theme ships
// `--v-theme-on-surface-variant: 0,0,0` and the light theme `238,238,238`. Used as "secondary text"
// on a normal surface it gives black on navy in dark mode and near-white on white in light mode:
// unreadable in BOTH themes. `/ropa-por-kilo-uruguay`, `/iass-uruguay` and
// `/mercado-de-autos-usados-uruguay` shipped their intros and labels that way, and nothing caught
// it — the contrast audit only runs on a fixed list of routes and unit tests never paint a page.
//
// Muted text is `rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity))` (what
// `text-medium-emphasis` does) — see `FamiliaNav.vue` or `AssistantCta.vue`. A component that really
// paints on `surface-variant` can still use its ink: add it to ALLOWED with the reason.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = ['pages', 'components', 'layouts', 'assets']
const APP_DIR = join(__dirname, '..', '..')

/** `app/`-relative paths allowed to use the ink, each with the reason. Empty on purpose. */
const ALLOWED: Readonly<Record<string, string>> = {}

/** The CSS variable or the utility class, in any of the forms Vuetify accepts. */
const INK =
  /--v-theme-on-surface-variant\b|\btext-on-surface-variant\b|color=["']on-surface-variant["']/

function sourceFiles(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries.flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(?:vue|css|scss|ts)$/.test(name) ? [full] : []
  })
}

const files = ROOTS.flatMap(root => sourceFiles(join(APP_DIR, root)))
const rel = (file: string) => relative(APP_DIR, file).split(sep).join('/')

describe('on-surface-variant is never used as text colour on a normal surface', () => {
  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('no page, component, layout or stylesheet uses the inverted tooltip ink', () => {
    const offenders = files
      .filter(file => !(rel(file) in ALLOWED))
      .flatMap(file =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, i) => ({ line, n: i + 1 }))
          .filter(({ line }) => INK.test(line))
          .map(({ n }) => `${rel(file)}:${n}`)
      )
    expect(
      offenders,
      'Use rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)) for muted text:\n' +
        offenders.join('\n')
    ).toEqual([])
  })

  it('the pattern catches every form it claims to', () => {
    expect(INK.test('color: rgb(var(--v-theme-on-surface-variant));')).toBe(true)
    expect(
      INK.test('color: rgb(var(--v-theme-on-surface-variant, var(--v-theme-on-surface)));')
    ).toBe(true)
    expect(INK.test('<p class="text-on-surface-variant">')).toBe(true)
    expect(INK.test('<VChip color="on-surface-variant">')).toBe(true)
    expect(
      INK.test('color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));')
    ).toBe(false)
    expect(INK.test('background: rgb(var(--v-theme-surface-variant));')).toBe(false)
  })
})
