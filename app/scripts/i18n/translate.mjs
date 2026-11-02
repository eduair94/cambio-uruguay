#!/usr/bin/env node
// Machine translation of the site's messages into the EXTRA locales (utils/locales.ts).
//
//   npm run i18n:translate                    # every extra locale, only what changed
//   npm run i18n:translate -- --locales fr,de # some locales
//   npm run i18n:translate -- --content       # also the content trees (i18n/content/registry.ts)
//
// Uses `tr-file` (Google Translate, no key needed) as the backend. INCREMENTAL: next to each
// translation we keep the hash of the English text it came from (i18n/translation-sources/),
// so a run only sends keys that are new or whose source changed, and drops keys that left
// es.json. A key Google fails to return, or returns with a placeholder lost, is NOT written:
// vue-i18n then falls back to English for that one key instead of serving a broken message.
//
// Source text: English (en.json), which every Google model translates from best; the few keys
// that exist only in Spanish are translated from es.json.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'
import trFile from 'tr-file'

const { TranslateAPI } = trFile
const APP = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const jiti = createJiti(import.meta.url, { alias: { '~': APP, '@': APP } })
const { EXTRA_LOCALES } = await jiti.import(resolve(APP, 'utils/locales.ts'))
const { fnv1a, overlayableStrings } = await jiti.import(resolve(APP, 'utils/contentOverlay.ts'))

const args = process.argv.slice(2)
const argValue = name => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const onlyLocales = argValue('--locales')?.split(',').filter(Boolean)
const withContent = args.includes('--content')
const contentOnly = args.includes('--content-only')
const concurrency = Number(argValue('--concurrency') ?? 4)

const JSON_DIR = resolve(APP, 'i18n/locales/json')
const EXTRA_DIR = resolve(APP, 'i18n/extra')
const SOURCES_DIR = resolve(APP, 'i18n/translation-sources')
const CONTENT_DIR = resolve(APP, 'i18n/content')

// The free endpoint truncates oversized requests silently; stay far below its limits.
const MAX_ITEMS = 50
const MAX_CHARS = 4000

// Names Google would translate ("Cambio Uruguay" → "乌拉圭变迁"). Longest first.
const PROTECTED_TERMS = ['cambio-uruguay.com', 'Cambio Uruguay', 'Cambio UY']

const api = new TranslateAPI({ verbose: false })
const sleep = ms => new Promise(done => setTimeout(done, ms))

const readJson = (file, fallback) =>
  existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback
const writeJson = (file, data) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

function flatten(node, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') flatten(value, path, out)
    else if (typeof value === 'string') out.set(path, value)
  }
  return out
}

/** Rebuild the nested tree in the order of `order` (es.json), keeping only keys in `values`. */
function unflatten(order, values) {
  const root = {}
  for (const path of order) {
    if (!values.has(path)) continue
    const parts = path.split('.')
    let node = root
    for (const part of parts.slice(0, -1)) node = node[part] ??= {}
    node[parts.at(-1)] = values.get(path)
  }
  return root
}

// Named placeholders only: `{'@'}` literal interpolations are escapes this script adds itself.
const placeholdersOf = text => (text.match(/\{(?!')[^{}]*\}/g) ?? []).sort().join('\u0000')

/** The figures written in a message, placeholders aside. */
const numbersOf = text => new Set(text.replace(/\{[^{}]*\}/g, ' ').match(/\d+/g) ?? [])

// Small numbers a source may spell out that Japanese, Korean or Chinese write as digits
// ("One snapshot per day" → "1日1枚", "a gram" → "1グラム").
const SPELLED_NUMBERS = [
  [/\b(?:a|an|one|once|single|per|each|un|una|uno|cada)\b/i, '1'],
  [/\b(?:two|twice|both|dos|ambos|ambas)\b/i, '2'],
  [/\b(?:three|tres)\b/i, '3'],
  [/\b(?:four|cuatro)\b/i, '4'],
  [/\b(?:five|cinco)\b/i, '5'],
  [/\b(?:six|seis)\b/i, '6'],
  [/\b(?:seven|siete)\b/i, '7'],
  [/\b(?:eight|ocho)\b/i, '8'],
  [/\b(?:nine|nueve)\b/i, '9'],
  [/\b(?:ten|diez)\b/i, '10'],
]

/**
 * A translation may not lose a figure, and may add one only where the source spells it out —
 * never with the `[n]` token style, whose digits are how "1 $U ([1])" got invented.
 */
function figuresKept(text, source, style) {
  const before = numbersOf(source)
  const after = numbersOf(text)
  for (const figure of before) if (!after.has(figure)) return false
  for (const figure of after) {
    if (before.has(figure)) continue
    if (TOKEN_STYLES[style](0).startsWith('[')) return false
    if (!SPELLED_NUMBERS.some(([word, digit]) => digit === figure && word.test(source)))
      return false
  }
  return true
}

/**
 * Token styles for the parts Google must not touch (placeholders, brand names), in the order
 * they are tried. None uses braces, so tr-file's own `{x}` → `__PLACEHOLDER_0__` shielding
 * never kicks in: Google dropped or rewrote those tokens in 22 of 2176 French messages
 * ("de __PLACEHOLDER_0__%" came back as "de 0 %"). Measured over 64 placeholder-heavy strings
 * in eight languages on 2026-11-02: `ZQ0Z` survived 63, `[0]` 62, `X0X` 61. `[0]` goes last
 * anyway: it once came back as "1 $U ([1])", a figure that was never in the source.
 */
const TOKEN_STYLES = [i => `ZQ${i}Z`, i => `X${i}X`, i => `[${i}]`]
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// PROTECTED_TERMS (longest first), then any `{placeholder}`.
const SHIELDED = new RegExp(`${PROTECTED_TERMS.map(escapeRegExp).join('|')}|\\{[^{}]*\\}`, 'g')

function protect(text, style) {
  const parts = []
  const protectedText = text.replace(SHIELDED, match => {
    parts.push(match)
    return TOKEN_STYLES[style](parts.length - 1)
  })
  return { protectedText, parts }
}

/** Put the shielded parts back; null when any token did not come back exactly once. */
function unprotect(text, parts, style) {
  let out = text
  for (let index = parts.length - 1; index >= 0; index--) {
    const token = TOKEN_STYLES[style](index)
    const pieces = out.split(token)
    if (pieces.length !== 2) return null
    out = pieces.join(parts[index])
  }
  return out
}

/**
 * vue-i18n message syntax: `|` splits plurals and `@` starts a linked message, so either one
 * appearing in a translation would silently cut or corrupt it (see i18nMessagePipes.test.ts).
 * Escape them as literal interpolations, and drop any brace that is not one of the source's.
 */
function escapeMessage(text, source) {
  const allowed = new Set(source.match(/\{[^{}]*\}/g) ?? [])
  return text
    .replace(/\{[^{}]*\}|[{}@|]/g, match => {
      if (allowed.has(match)) return match
      if (match === '@' || match === '|') return `{'${match}'}`
      return match.length > 1 ? match : ''
    })
    .replace(/\s+$/, '')
}

async function translateChunk(texts, target, source) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await api.translateBatch(texts, target, source)
    } catch (error) {
      if (attempt >= 5) throw error
      await sleep(1500 * attempt ** 2)
    }
  }
}

/** One pass over `items` with one token style; valid results go into `out`. */
async function translatePass(items, target, source, style, out, label) {
  let start = 0
  while (start < items.length) {
    const chunk = []
    let chars = 0
    while (start < items.length && chunk.length < MAX_ITEMS) {
      const shielded = protect(items[start].text, style)
      if (chunk.length && chars + shielded.protectedText.length > MAX_CHARS) break
      chunk.push({ ...items[start], ...shielded })
      chars += shielded.protectedText.length
      start++
    }
    let results
    try {
      results = await translateChunk(
        chunk.map(item => item.protectedText),
        target,
        source
      )
    } catch (error) {
      console.warn(`  ${label}: chunk failed (${error.message})`)
      continue
    }
    chunk.forEach((item, index) => {
      const raw = results[index]
      if (typeof raw !== 'string' || !raw.trim()) return
      const restored = unprotect(raw, item.parts, style)
      if (restored == null) return
      const text = escapeMessage(restored, item.text)
      if (placeholdersOf(text) !== placeholdersOf(item.text)) return
      if (!figuresKept(text, item.text, style)) return
      out.set(item.id, text)
    })
    await sleep(120)
  }
}

/**
 * Translate `items` ([{ id, text, source }]) into `target`. Returns Map id → translation for
 * the items that came back valid; the rest are left out on purpose.
 */
async function translateItems(items, target, label) {
  const out = new Map()
  for (const source of ['en', 'es']) {
    for (let style = 0; style < TOKEN_STYLES.length; style++) {
      const pending = items.filter(item => item.source === source && !out.has(item.id))
      if (!pending.length) break
      await translatePass(pending, target, source, style, out, label)
    }
  }
  return out
}

// ---------------------------------------------------------------------------------------
// vue-i18n messages
// ---------------------------------------------------------------------------------------

const es = flatten(readJson(resolve(JSON_DIR, 'es.json')))
const en = flatten(readJson(resolve(JSON_DIR, 'en.json')))
const order = [...es.keys()]
// Hand translations that win over the machine (see the file's _comment).
const GLOSSARY = readJson(resolve(APP, 'i18n/glossary.json'), {})

/** "taux de change" for "Exchange rates": a label that starts with a capital keeps it. */
function matchInitialCase(text, source, google) {
  if (!/^\p{Lu}/u.test(source) || !/^\p{Ll}/u.test(text)) return text
  return text[0].toLocaleUpperCase(google) + text.slice(1)
}

function messageSource(key) {
  // The literal-interpolation e-mail placeholder is not prose: copy it.
  if (en.has(key)) return { text: en.get(key), source: 'en' }
  return { text: es.get(key), source: 'es' }
}

async function translateMessages(locale) {
  const file = resolve(EXTRA_DIR, `${locale.code}.json`)
  const sourcesFile = resolve(SOURCES_DIR, `${locale.code}.json`)
  const current = flatten(readJson(file, {}))
  const hashes = readJson(sourcesFile, {})

  const kept = new Map()
  const keptHashes = {}
  const todo = []
  for (const key of order) {
    const { text, source } = messageSource(key)
    const hash = fnv1a(text)
    if (current.has(key) && hashes[key] === hash) {
      kept.set(key, current.get(key))
      keptHashes[key] = hash
      continue
    }
    if (!/\p{L}/u.test(text) || /^\S+\{'@'\}\S+$/.test(text)) {
      // Nothing to translate (codes, numbers, an e-mail placeholder).
      kept.set(key, text)
      keptHashes[key] = hash
      continue
    }
    todo.push({ id: key, text, source, hash })
  }

  const translated = todo.length
    ? await translateItems(todo, locale.google, locale.code)
    : new Map()
  for (const item of todo) {
    if (translated.has(item.id)) {
      kept.set(item.id, translated.get(item.id))
      keptHashes[item.id] = item.hash
    } else {
      // The file stays complete: the reader gets the English text, never a raw key.
      // No hash: the next run sends it again.
      kept.set(item.id, item.text)
    }
  }
  for (const key of order) {
    const { text } = messageSource(key)
    const manual = GLOSSARY[key]?.[locale.code]
    if (manual) {
      kept.set(key, manual)
      keptHashes[key] = fnv1a(text)
    } else if (key in keptHashes) {
      kept.set(key, matchInitialCase(kept.get(key), text, locale.google))
    }
  }
  writeJson(file, unflatten(order, kept))
  writeJson(
    sourcesFile,
    Object.fromEntries(order.filter(key => key in keptHashes).map(key => [key, keptHashes[key]]))
  )
  const untranslated = order.length - Object.keys(keptHashes).length
  console.log(
    `${locale.code}: ${todo.length} sent, ${translated.size} translated${untranslated ? `, ${untranslated} kept in English until the next run` : ''}`
  )
}

// ---------------------------------------------------------------------------------------
// Content trees (i18n/content/registry.ts): the per-page TypeScript copy that is not in
// vue-i18n. Each translation is stored as path → [hash of the English source, text]; the page
// overlays it on the CURRENT English tree and skips any path whose English changed since
// (utils/contentOverlay.ts), so a figure edited in the TypeScript never shows its old value.
// ---------------------------------------------------------------------------------------

async function translateContent(locale, trees) {
  for (const [name, tree] of Object.entries(trees)) {
    const file = resolve(CONTENT_DIR, name, `${locale.code}.json`)
    const current = readJson(file, {})
    const strings = overlayableStrings(tree)
    const next = {}
    const todo = []
    for (const [path, text] of strings) {
      const hash = fnv1a(text)
      if (current[path]?.[0] === hash) next[path] = current[path]
      else todo.push({ id: path, text, source: 'en', hash })
    }
    const translated = todo.length
      ? await translateItems(todo, locale.google, `${locale.code}/${name}`)
      : new Map()
    for (const item of todo) {
      if (translated.has(item.id)) next[item.id] = [item.hash, translated.get(item.id)]
    }
    writeJson(file, next)
    console.log(
      `${locale.code}/${name}: ${todo.length} sent, ${Object.keys(next).length}/${strings.size} strings`
    )
  }
}

const locales = EXTRA_LOCALES.filter(locale => !onlyLocales || onlyLocales.includes(locale.code))
let trees = {}
if (withContent || contentOnly) {
  const registry = await jiti.import(resolve(APP, 'i18n/content/registry.ts'))
  trees = registry.CONTENT_SOURCES
}

const queue = [...locales]
async function worker() {
  for (let locale = queue.shift(); locale; locale = queue.shift()) {
    if (!contentOnly) await translateMessages(locale)
    if (withContent || contentOnly) await translateContent(locale, trees)
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
