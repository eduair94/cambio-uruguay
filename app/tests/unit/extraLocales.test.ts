import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import type { NuxtPage } from '@nuxt/schema'
import { countCompactRoutes } from '../../modules/extra-locales'
import { CONTENT_SOURCES } from '../../i18n/content/registry'
import { fnv1a, overlayContent, overlayableStrings } from '../../utils/contentOverlay'
// @ts-expect-error plain ESM module of the translation scripts
import { PROTECTED_ACRONYMS } from '../../scripts/i18n/lib/machine-translate.mjs'
import {
  EXTRA_LOCALE_CODES,
  EXTRA_LOCALE_ROUTES,
  EXTRA_LOCALES,
  LOCALE_PREFIX_RE,
  hasExtraLocales,
} from '../../utils/locales'
import { splitLocalePath } from '../../utils/localizedRoutes'
import { NAV_SECTIONS } from '../../utils/siteNav'

const APP = resolve(__dirname, '../..')
const JSON_DIR = join(APP, 'i18n/locales/json')
const EXTRA_DIR = join(APP, 'i18n/extra')
type Tree = Record<string, unknown>

const readTree = (file: string): Tree => JSON.parse(readFileSync(file, 'utf8'))
function flatten(node: Tree, prefix = '', out = new Map<string, string>()) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.set(path, value)
    else if (value && typeof value === 'object') flatten(value as Tree, path, out)
  }
  return out
}
const es = flatten(readTree(join(JSON_DIR, 'es.json')))
const en = flatten(readTree(join(JSON_DIR, 'en.json')))
const named = (text: string) => (text.match(/\{(?!')[^{}]*\}/g) ?? []).sort()

describe('extra locales: the list', () => {
  it('has unique lowercase codes that no page route starts with', () => {
    expect(new Set(EXTRA_LOCALE_CODES).size).toBe(EXTRA_LOCALE_CODES.length)
    for (const code of EXTRA_LOCALE_CODES) {
      expect(code).toMatch(/^[a-z]{2}(?:-[a-z]{2})?$/)
      expect(existsSync(join(APP, `pages/${code}.vue`)), code).toBe(false)
      expect(existsSync(join(APP, `pages/${code}`)), code).toBe(false)
    }
    expect(EXTRA_LOCALE_CODES).not.toContain('es')
    expect(EXTRA_LOCALE_CODES).not.toContain('en')
    expect(EXTRA_LOCALE_CODES).not.toContain('pt')
  })

  it('matches a locale prefix by whole segment, never by word start', () => {
    expect(LOCALE_PREFIX_RE.test('/fr/mapa')).toBe(true)
    expect(LOCALE_PREFIX_RE.test('/fr')).toBe(true)
    expect(LOCALE_PREFIX_RE.test('/ca/pizarra')).toBe(true)
    expect(LOCALE_PREFIX_RE.test('/casa/brou')).toBe(false)
    expect(LOCALE_PREFIX_RE.test('/idiomas')).toBe(false)
    expect(splitLocalePath('/ja/mapa')).toEqual({ locale: 'ja', path: '/mapa' })
    expect(splitLocalePath('/zh')).toEqual({ locale: 'zh', path: '/' })
  })

  it('offers only routes that have a page and a navigation entry', () => {
    const nav = new Set(NAV_SECTIONS.flatMap(section => section.entries.map(entry => entry.to)))
    for (const route of EXTRA_LOCALE_ROUTES) {
      const base = route === '/' ? 'index' : route.slice(1)
      const file = [`pages/${base}.vue`, `pages/${base}/index.vue`].find(candidate =>
        existsSync(join(APP, candidate))
      )
      expect(file, route).toBeTruthy()
      expect(nav.has(route), route).toBe(true)
    }
    expect(hasExtraLocales('/mapa/')).toBe(true)
    expect(hasExtraLocales('/mapa?cash=1')).toBe(true)
    expect(hasExtraLocales('/guias')).toBe(false)
  })
})

describe('extra locales: how their messages load', () => {
  it('ships one public JSON per locale and nothing else in i18n/extra', () => {
    const files = readdirSync(EXTRA_DIR).sort()
    expect(files).toEqual(EXTRA_LOCALE_CODES.map(code => `${code}.json`).sort())
  })

  it('keeps i18n’s per-file cache off for the shared loader', () => {
    // One loader file serves 32 locales; @nuxtjs/i18n caches by FILE, so with its cache on a
    // German page would be handed the French messages (i18n/locales/extra.ts).
    const config = readFileSync(join(APP, 'nuxt.config.ts'), 'utf8')
    expect(config).toContain("file: { path: 'extra.ts', cache: false }")
    expect(config).toMatch(/publicAssets: \[\{ baseURL: '\/i18n-messages', dir: EXTRA_MESSAGES_DIR/)
  })
})

describe('extra locales: the route module', () => {
  it('counts the compact routes that serve every non-default locale', () => {
    const pages = [
      { name: 'mapa___es', path: '/mapa' },
      { name: 'mapa', path: '/:locale(en|pt|fr)/mapa' },
      { name: 'index', path: '/:locale(en|pt|fr)' },
      { name: 'alquiler-dep-barrio___es', path: '/alquiler/:dep()/:barrio()' },
    ] as NuxtPage[]
    expect(countCompactRoutes(pages)).toBe(2)
    expect(countCompactRoutes([{ name: 'mapa___es', path: '/mapa' }] as NuxtPage[])).toBe(0)
  })

  it('is enabled in nuxt.config', () => {
    expect(readFileSync(join(APP, 'nuxt.config.ts'), 'utf8')).toContain(
      'experimental: { compactRoutes: true }'
    )
  })
})

describe('extra locales: the messages', () => {
  for (const { code } of EXTRA_LOCALES) {
    describe(code, () => {
      const file = join(EXTRA_DIR, `${code}.json`)

      it('exists with exactly the Spanish keys', () => {
        expect(existsSync(file)).toBe(true)
        const messages = flatten(readTree(file))
        expect([...messages.keys()].sort()).toEqual([...es.keys()].sort())
      })

      it('keeps every placeholder and survives the vue-i18n compiler', () => {
        const tree = readTree(file)
        const messages = flatten(tree)
        const i18n = createI18n({
          legacy: false,
          locale: code,
          messages: { [code]: tree },
          missingWarn: false,
          fallbackWarn: false,
        })
        const broken: string[] = []
        for (const [key, text] of messages) {
          const source = en.get(key) ?? es.get(key)!
          if (named(text).join() !== named(source).join()) broken.push(`${key}: placeholders`)
          // No params: literal interpolations resolve, named ones vanish; nothing else is eaten.
          const expected = text.replace(/\{'([^']*)'\}/g, '$1').replace(/\{[^{}]*\}/g, '')
          if (i18n.global.t(key) !== expected) broken.push(`${key}: compiler`)
        }
        expect(broken).toEqual([])
      })

      // "Regulated by BCU" came back in Arabic as "regulated by the Union of British
      // Universities" (scripts/i18n/lib/machine-translate.mjs, PROTECTED_ACRONYMS).
      it('keeps the acronyms of the Uruguayan institutions', () => {
        const messages = flatten(readTree(file))
        const lost: string[] = []
        for (const [key, text] of messages) {
          const source = en.get(key) ?? es.get(key)!
          for (const acronym of PROTECTED_ACRONYMS) {
            if (source.includes(acronym) && !text.includes(acronym)) lost.push(`${key}: ${acronym}`)
          }
        }
        expect(lost).toEqual([])
      })

      it('records source hashes only for keys that still exist', () => {
        const sources = readTree(join(APP, `i18n/translation-sources/${code}.json`))
        const stale = Object.keys(sources).filter(key => !es.has(key))
        expect(stale).toEqual([])
      })
    })
  }
})

describe('extra locales: the glossary', () => {
  const glossary = readTree(join(APP, 'i18n/glossary.json')) as Record<
    string,
    Record<string, string>
  >

  it('names real keys and real locales, and the messages carry its words', () => {
    for (const [key, byLocale] of Object.entries(glossary)) {
      if (key.startsWith('_')) continue
      expect(es.has(key), key).toBe(true)
      for (const [code, text] of Object.entries(byLocale)) {
        expect(EXTRA_LOCALE_CODES, `${key}.${code}`).toContain(code)
        expect(flatten(readTree(join(EXTRA_DIR, `${code}.json`))).get(key), `${key}.${code}`).toBe(
          text
        )
      }
    }
  })
})

describe('extra locales: the content trees', () => {
  it('lays a translation over only the strings whose English is unchanged', () => {
    const tree = { title: 'Fee: $45', link: { to: '/mapa', label: 'Map' }, items: ['One', 2] }
    const translation = {
      title: [fnv1a('Fee: $40'), 'Frais : 40 $'] as [string, string],
      'link.label': [fnv1a('Map'), 'Carte'] as [string, string],
      'items.0': [fnv1a('One'), 'Un'] as [string, string],
    }
    expect(overlayContent(tree, translation)).toEqual({
      title: 'Fee: $45',
      link: { to: '/mapa', label: 'Carte' },
      items: ['Un', 2],
    })
    expect([...overlayableStrings(tree).keys()]).toEqual(['title', 'link.label', 'items.0'])
  })

  it('stores translations only for paths of the current English trees', () => {
    const contentDir = join(APP, 'i18n/content')
    for (const [name, tree] of Object.entries(CONTENT_SOURCES)) {
      const paths = new Set(overlayableStrings(tree).keys())
      const dir = join(contentDir, name)
      if (!existsSync(dir)) continue
      for (const file of readdirSync(dir).filter(entry => entry.endsWith('.json'))) {
        expect(EXTRA_LOCALE_CODES, `${name}/${file}`).toContain(file.replace(/\.json$/, ''))
        const translation = readTree(join(dir, file)) as Record<string, [string, string]>
        for (const [path, entry] of Object.entries(translation)) {
          expect(Array.isArray(entry) && entry.length === 2, `${name}/${file} ${path}`).toBe(true)
          // A path the English tree lost is dead weight in the lazy chunk.
          if (!paths.has(path)) expect.fail(`${name}/${file}: ${path} is no longer in the tree`)
        }
      }
    }
  })
})
