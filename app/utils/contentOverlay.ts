/**
 * Machine translations of per-page content trees (the TypeScript copy that is not in
 * vue-i18n), and the rule that keeps them honest. PURE.
 *
 * A translation is stored as `path → [hash of the English source, translated text]`
 * (i18n/content/<tree>/<locale>.json, written by scripts/i18n/translate.mjs). At render the
 * page takes the CURRENT English tree and replaces a string only when its hash still matches:
 * an English sentence edited after the last translation run — a fee, a limit, a date — shows
 * in English until the script runs again, never as the translation of the old figure.
 */

export type ContentTranslation = Record<string, [string, string]>

/** 32-bit FNV-1a, hex. Shared by the script that writes the hashes and the page that checks them. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Keys whose values are identifiers, routes or media, never prose. */
const NON_TEXT_KEYS = new Set([
  'to',
  'href',
  'url',
  'path',
  'link',
  'icon',
  'id',
  'slug',
  'key',
  'locale',
  'lang',
  'color',
  'src',
  'image',
  'img',
  'email',
  'phone',
  'tel',
  'date',
  'iso',
  'code',
  'currency',
  'origin',
  'kind',
  'type',
  'variant',
  'tone',
  'anchor',
  'hash',
])

const NON_TEXT_VALUE = /^(?:https?:\/\/|\/|mdi-|#|[\w.+-]+@[\w-]+\.)/

/** Whether a string leaf is prose worth translating. */
export function isOverlayableString(key: string, value: string): boolean {
  if (NON_TEXT_KEYS.has(key)) return false
  if (NON_TEXT_VALUE.test(value)) return false
  return /\p{L}/u.test(value)
}

/** Every translatable string leaf of `tree`, by dotted path (array indexes included). */
export function overlayableStrings(tree: unknown): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (node: unknown, path: string, key: string) => {
    if (typeof node === 'string') {
      if (isOverlayableString(key, node)) out.set(path, node)
      return
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, path ? `${path}.${index}` : String(index), key))
      return
    }
    if (node && typeof node === 'object') {
      for (const [childKey, child] of Object.entries(node)) {
        walk(child, path ? `${path}.${childKey}` : childKey, childKey)
      }
    }
  }
  walk(tree, '', '')
  return out
}

/**
 * A copy of `tree` with every string whose English source still matches replaced by its
 * translation. Non-string values, and strings without a fresh translation, are the tree's own.
 */
export function overlayContent<T>(tree: T, translation: ContentTranslation | null | undefined): T {
  if (!translation) return tree
  const walk = (node: unknown, path: string): unknown => {
    if (typeof node === 'string') {
      const entry = translation[path]
      return entry && entry[0] === fnv1a(node) ? entry[1] : node
    }
    if (Array.isArray(node)) {
      return node.map((child, index) => walk(child, path ? `${path}.${index}` : String(index)))
    }
    if (node && typeof node === 'object') {
      const copy: Record<string, unknown> = {}
      for (const [childKey, child] of Object.entries(node)) {
        copy[childKey] = walk(child, path ? `${path}.${childKey}` : childKey)
      }
      return copy
    }
    return node
  }
  return walk(tree, '') as T
}
