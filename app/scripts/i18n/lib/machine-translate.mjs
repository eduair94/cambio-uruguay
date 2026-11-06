// The machine-translation core shared by scripts/i18n/translate.mjs (vue-i18n messages and
// content trees) and scripts/i18n/autotranslate-job.mjs (the page translation memory).
//
// Backend: `tr-file` (Google Translate, no key needed). Everything defensive here was measured:
// see the comments on TOKEN_STYLES and figuresKept. A text that does not come back valid is left
// out of the result on purpose — the caller keeps the source text, never a broken translation.

import trFile from 'tr-file'

const { TranslateAPI } = trFile

// The free endpoint truncates oversized requests silently; stay far below its limits.
const MAX_ITEMS = 50
const MAX_CHARS = 4000

const sleep = ms => new Promise(done => setTimeout(done, ms))

// Named placeholders only: `{'@'}` literal interpolations are escapes the caller may add.
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
 * Token styles for the parts Google must not touch (placeholders, brand names), in the order
 * they are tried. None uses braces, so tr-file's own `{x}` → `__PLACEHOLDER_0__` shielding
 * never kicks in: Google dropped or rewrote those tokens in 22 of 2176 French messages
 * ("de __PLACEHOLDER_0__%" came back as "de 0 %"). Measured over 64 placeholder-heavy strings
 * in eight languages on 2026-11-02: `ZQ0Z` survived 63, `[0]` 62, `X0X` 61. `[0]` goes last
 * anyway: it once came back as "1 $U ([1])", a figure that was never in the source.
 */
export const TOKEN_STYLES = [i => `ZQ${i}Z`, i => `X${i}X`, i => `[${i}]`]

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A translation may not lose a figure, and may add one only where the source spells it out —
 * never with the `[n]` token style, whose digits are how "1 $U ([1])" got invented.
 */
export function figuresKept(text, source, style) {
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
 * vue-i18n message syntax: `|` splits plurals and `@` starts a linked message, so either one
 * appearing in a translation would silently cut or corrupt it (see i18nMessagePipes.test.ts).
 * Escape them as literal interpolations. Any brace that is not one of the source's goes.
 */
export function escapeForVueI18n(text, source) {
  const allowed = new Set(source.match(/\{[^{}]*\}/g) ?? [])
  return asciiDigits(text)
    .replace(/\{[^{}]*\}|[{}@|]/g, match => {
      if (allowed.has(match)) return match
      if (match === '@' || match === '|') return `{'${match}'}`
      return match.length > 1 ? match : ''
    })
    .replace(/\s+$/, '')
}

/**
 * Arabic-Indic and Persian digits (and the Arabic decimal and thousands marks) as ASCII. Google
 * writes figures that way in Arabic, Persian and Urdu: "٢٥٬٠٠٠" for 25.000, which no figure check
 * would recognize. The pages already print their live numbers with ASCII digits.
 */
export function asciiDigits(text) {
  return text
    .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',')
}

/** Plain text: only the source's own `{n}` placeholders may contain braces. */
export function cleanPlainText(text, source) {
  const allowed = new Set(source.match(/\{[^{}]*\}/g) ?? [])
  return asciiDigits(text)
    .replace(/\{[^{}]*\}|[{}]/g, match =>
      allowed.has(match) ? match : match.length > 1 ? match : ''
    )
    .replace(/\s+$/, '')
}

// Same cut as utils/autoTranslate.ts (`segmentKey`): the figures of a segment, in order.
const SOURCE_NUMBER = /\d+(?:[.,:/]\d+)*/g
// In a translation a figure may come back regrouped: "25.000" as "25 000" (French) or
// "25,000" (English). Thousands groups after a space count as part of the number.
const OUTPUT_NUMBER = /\d+(?:[.,:/]\d+|[\u00A0\u202F ]\d{3}(?!\d))*/g
const digitsOf = text => text.replace(/\D/g, '')

export const numbersIn = text => text.match(SOURCE_NUMBER) ?? []

/**
 * A translation of a text WITH its real figures turned back into a template: each figure of
 * the source, found in the output by its digits, becomes {i} (the memory stores templates; the
 * page puts its live numbers back). Null when a figure is missing, or when the output has a
 * figure the source did not (other than a small spelled-out one: "a gram" → "1 g").
 */
export function templatize(translated, numbers) {
  const spans = [...translated.matchAll(OUTPUT_NUMBER)].map(match => ({
    start: match.index,
    end: match.index + match[0].length,
    digits: digitsOf(match[0]),
    index: -1,
  }))
  for (const [index, number] of numbers.entries()) {
    const span = spans.find(
      candidate => candidate.index === -1 && candidate.digits === digitsOf(number)
    )
    if (!span) return null
    span.index = index
  }
  let out = ''
  let cursor = 0
  for (const span of spans) {
    if (span.index === -1) {
      if (!/^(?:[1-9]|10)$/.test(span.digits)) return null
      continue
    }
    out += translated.slice(cursor, span.start) + `{${span.index}}`
    cursor = span.end
  }
  return out + translated.slice(cursor)
}

/**
 * @param {object} options
 * @param {string[]} options.protectedTerms names Google would translate ("Cambio Uruguay" →
 *   "乌拉圭变迁"); matched longest first
 * @param {(text: string, source: string) => string} [options.clean] post-processing
 * @param {boolean} [options.verbose]
 */
export function createTranslator({ protectedTerms, clean = cleanPlainText, verbose = true }) {
  const api = new TranslateAPI({ verbose: false })
  const terms = [...new Set(protectedTerms)].sort((a, b) => b.length - a.length)
  const shielded = new RegExp(
    `${terms.map(escapeRegExp).join('|')}${terms.length ? '|' : ''}\\{[^{}]*\\}`,
    'g'
  )
  const stats = { requests: 0, chars: 0, failures: 0 }

  function protect(text, style) {
    const parts = []
    const protectedText = text.replace(shielded, match => {
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

  async function translateChunk(texts, target, source) {
    for (let attempt = 1; ; attempt++) {
      try {
        stats.requests++
        stats.chars += texts.reduce((sum, text) => sum + text.length, 0)
        return await api.translateBatch(texts, target, source)
      } catch (error) {
        stats.failures++
        if (attempt >= 5) throw error
        await sleep(1500 * attempt ** 2)
      }
    }
  }

  async function translatePass(items, target, source, style, out, label) {
    let start = 0
    while (start < items.length) {
      const chunk = []
      let chars = 0
      while (start < items.length && chunk.length < MAX_ITEMS) {
        const shieldedText = protect(items[start].text, style)
        if (chunk.length && chars + shieldedText.protectedText.length > MAX_CHARS) break
        chunk.push({ ...items[start], ...shieldedText })
        chars += shieldedText.protectedText.length
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
        if (verbose) console.warn(`  ${label}: chunk failed (${error.message})`)
        // Five failed attempts in a row is the service refusing us (quota, block): stop here
        // rather than burn the rest of the run against it.
        throw error
      }
      chunk.forEach((item, index) => {
        const raw = results[index]
        if (typeof raw !== 'string' || !raw.trim()) return
        const restored = unprotect(raw, item.parts, style)
        if (restored == null) return
        const text = clean(restored, item.text)
        if (placeholdersOf(text) !== placeholdersOf(item.text)) return
        if (!figuresKept(text, item.text, style)) return
        out.set(item.id, text)
      })
      await sleep(120)
    }
  }

  /**
   * Translate `items` ([{ id, text, source }]) into `target`. Returns Map id → translation for
   * the items that came back valid; the rest are left out on purpose. Throws when the service
   * keeps refusing (the Map built so far is attached as `error.partial`).
   */
  async function translateItems(items, target, label) {
    const out = new Map()
    try {
      for (const source of [...new Set(items.map(item => item.source))]) {
        for (let style = 0; style < TOKEN_STYLES.length; style++) {
          const pending = items.filter(item => item.source === source && !out.has(item.id))
          if (!pending.length) break
          await translatePass(pending, target, source, style, out, label)
        }
      }
    } catch (error) {
      error.partial = out
      throw error
    }
    return out
  }

  /**
   * Translate memory templates (`[{ id, template, example? }]`, Spanish). With an `example` (the
   * template with its real figures) the example is what Google sees — it orders a sentence far
   * better around "9 horas" than around a placeholder ("pendant des heures 9") — and the result is
   * turned back into a template. Whatever that cannot do falls back to the template itself.
   */
  async function translateTemplates(items, target, label) {
    const out = new Map()
    const keepExamples = result => {
      for (const item of items) {
        const translated = item.example ? result.get(item.id) : undefined
        const template = translated ? templatize(translated, numbersIn(item.example)) : null
        if (template !== null) out.set(item.id, template)
      }
    }
    const examples = items.filter(item => item.example)
    if (examples.length) {
      try {
        keepExamples(
          await translateItems(
            examples.map(item => ({ id: item.id, text: item.example, source: 'es' })),
            target,
            label
          )
        )
      } catch (error) {
        keepExamples(error.partial ?? new Map())
        error.partial = out
        throw error
      }
    }
    const rest = items.filter(item => !out.has(item.id))
    if (!rest.length) return out
    try {
      const result = await translateItems(
        rest.map(item => ({ id: item.id, text: item.template, source: 'es' })),
        target,
        label
      )
      for (const [id, text] of result) out.set(id, text)
    } catch (error) {
      for (const [id, text] of error.partial ?? []) out.set(id, text)
      error.partial = out
      throw error
    }
    return out
  }

  return { translateItems, translateTemplates, stats }
}
