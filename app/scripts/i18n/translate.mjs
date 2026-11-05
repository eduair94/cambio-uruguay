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
import { createTranslator, escapeForVueI18n } from './lib/machine-translate.mjs'

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

// Names Google would translate ("Cambio Uruguay" → "乌拉圭变迁"). Longest first.
const PROTECTED_TERMS = ['cambio-uruguay.com', 'Cambio Uruguay', 'Cambio UY']

const translator = createTranslator({ protectedTerms: PROTECTED_TERMS, clean: escapeForVueI18n })

/** Like the library's, but a refusing service ends the locale with what was translated so far. */
async function translateItems(items, target, label) {
  try {
    return await translator.translateItems(items, target, label)
  } catch (error) {
    console.warn(`  ${label}: stopped (${error.message})`)
    return error.partial ?? new Map()
  }
}

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
