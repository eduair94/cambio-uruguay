import {
  TRANSLATABLE_ATTRIBUTES,
  announcedLocales,
  canonicalTarget,
  htmlSegments,
  isAutoTranslateLocale,
  isTranslatable,
  normalizeText,
  segmentKey,
  spanishOgImage,
  translateHtml,
  translateSegment,
  type PageTranslationState,
} from '~/utils/autoTranslate'
import { splitLocalePath } from '~/utils/localizedRoutes'

/**
 * Machine translation of whole pages (utils/autoTranslate.ts), on both sides of hydration.
 *
 * SERVER: after Vue renders, every text node and translatable attribute of the page HTML that
 * the translation memory knows is replaced (`app:rendered`, before the payload and the head are
 * serialized), and the translations it used travel to the browser in the payload.
 *
 * BROWSER: Vue hydrates against the translated DOM, finds Spanish in its own vnodes and writes
 * the Spanish back into every such text node — that is how Vue hydration works, and no option
 * changes it. A MutationObserver installed BEFORE hydration puts the translation back in the
 * same task, before the browser paints, and keeps doing it for every node Vue writes later
 * (client navigation, components that render only in the browser). Translations the page did
 * not ship are asked to /api/auto-translate/lookup.
 *
 * HEAD, both sides through the same unhead hook: title and descriptions translated; canonical
 * to the page itself once the page is translated (`canonicalTarget`); hreflang and
 * og:locale:alternate only for the locales the page is announced in (`announcedLocales`).
 */

interface AutoTranslateState extends PageTranslationState {
  locale: string
  path: string
  /** hash → stored translation (template with {0}…) for the segments of this page. */
  map: Record<string, string>
}

const SITE = 'https://cambio-uruguay.com'
const TRANSLATED_META = new Set([
  'description',
  'og:title',
  'og:description',
  'og:image:alt',
  'twitter:title',
  'twitter:description',
  'twitter:image:alt',
])
const SKIP_SELECTOR =
  'script,style,noscript,textarea,code,pre,kbd,samp,var,svg,math,[translate="no"],.notranslate,[data-notranslate]'
const HYDRATION_MISMATCH = 'Hydration completed but contains mismatches.'

type Tag = {
  tag: string
  textContent?: unknown
  props: Record<string, unknown>
}

const localeUrl = (locale: string, path: string) =>
  `${SITE}${locale === 'es' ? '' : `/${locale}`}${path === '/' ? (locale === 'es' ? '' : '') : path}`

/** `en-US` → `en`, `zh-CN` → `zh`, `pt_PT` → `pt`. */
const languageOf = (value: unknown) =>
  String(value ?? '')
    .split(/[-_]/)[0]!
    .toLowerCase()

function headTexts(tags: Tag[]): string[] {
  const out: string[] = []
  for (const tag of tags) {
    if (tag.tag === 'title' && typeof tag.textContent === 'string') out.push(tag.textContent)
    if (tag.tag === 'meta') {
      const key = String(tag.props.name ?? tag.props.property ?? '')
      if (TRANSLATED_META.has(key) && typeof tag.props.content === 'string') {
        out.push(tag.props.content)
      }
    }
  }
  return out
}

const OG_IMAGE_META = new Set([
  'og:image',
  'og:image:url',
  'og:image:secure_url',
  'twitter:image',
  'twitter:image:src',
])

function applyHead(ctx: { tags: Tag[] }, state: AutoTranslateState) {
  const translate = (text: string) =>
    isAutoTranslateLocale(state.locale) && !state.embargoed
      ? translateSegment(normalizeText(text), state.map)
      : null
  const target = canonicalTarget(state.locale, state.path, state)
  const canonical =
    target === 'self'
      ? localeUrl(state.locale, state.path)
      : target === 'spanish'
        ? localeUrl('es', state.path)
        : null
  for (const tag of ctx.tags) {
    if (tag.tag === 'title' && typeof tag.textContent === 'string') {
      tag.textContent = translate(tag.textContent) ?? tag.textContent
    } else if (tag.tag === 'meta') {
      const key = String(tag.props.name ?? tag.props.property ?? '')
      if (TRANSLATED_META.has(key) && typeof tag.props.content === 'string') {
        tag.props.content = translate(tag.props.content) ?? tag.props.content
      }
      if (canonical && key === 'og:url') tag.props.content = canonical
      if (OG_IMAGE_META.has(key) && typeof tag.props.content === 'string') {
        tag.props.content = spanishOgImage(tag.props.content)
      }
    } else if (canonical && tag.tag === 'link' && tag.props.rel === 'canonical') {
      tag.props.href = canonical
    }
  }
  const announced = new Set(['es', ...announcedLocales(state.path, state)])
  ctx.tags = ctx.tags.filter(tag => {
    if (tag.tag === 'link' && tag.props.rel === 'alternate' && tag.props.hreflang) {
      return tag.props.hreflang === 'x-default' || announced.has(languageOf(tag.props.hreflang))
    }
    if (tag.tag === 'meta' && tag.props.property === 'og:locale:alternate') {
      return announced.has(languageOf(tag.props.content))
    }
    return true
  })
}

export default defineNuxtPlugin({
  name: 'auto-translate',
  setup(nuxtApp) {
    const state = useState<AutoTranslateState | null>('auto-translate', () => null)
    const head = injectHead()

    head.hooks.hook('tags:resolve', (ctx: { tags: Tag[] }) => {
      if (state.value) applyHead(ctx, state.value)
    })

    if (import.meta.server) {
      const context = useRequestEvent()?.context.autoTranslate
      if (!context) return
      state.value = {
        locale: context.locale,
        path: context.path,
        translated: context.translated,
        embargoed: context.embargoed,
        map: {},
      }
      // A page reserved by the change log renders exactly as before: no translated body either.
      if (!isAutoTranslateLocale(context.locale) || context.embargoed) return
      // Hydration rewrites the translated text nodes on purpose (see above).
      useHead({ bodyAttrs: { 'data-allow-mismatch': '' } })
      nuxtApp.hooks.hook('app:rendered', async ({ renderResult }) => {
        const html = (renderResult as { html?: unknown } | undefined)?.html
        if (typeof html !== 'string' || !state.value) return
        const headKeys = headTexts((await head.resolveTags()) as Tag[])
          .map(text => normalizeText(text))
          .filter(isTranslatable)
          .map(segmentKey)
        const keys = [...htmlSegments(html), ...headKeys]
        if (!keys.length) return
        const found = await context.lookup(keys.map(key => key.hash))
        if (!found.size) return
        const result = translateHtml(html, found)
        ;(renderResult as { html: string }).html = result.html
        const map: Record<string, string> = { ...result.used }
        for (const key of headKeys) {
          const stored = found.get(key.hash)
          if (stored !== undefined) map[key.hash] = stored
        }
        state.value.map = map
      })
      return
    }

    // ---------------------------------------------------------------------------- browser ---
    if (!state.value) return
    const map = new Map<string, string>(Object.entries(state.value.map))
    const asked = new Set<string>(map.keys())
    const active = () =>
      !!state.value && isAutoTranslateLocale(state.value.locale) && !state.value.embargoed
    let applying = false

    function skipped(node: Node): boolean {
      const element = node.nodeType === 1 ? (node as Element) : node.parentElement
      return !element || !!element.closest(SKIP_SELECTOR)
    }

    /** Translate one text node; returns the hash when it is translatable but unknown. */
    function translateText(node: Text): string | null {
      const normalized = normalizeText(node.data)
      if (!isTranslatable(normalized) || skipped(node)) return null
      const translated = translateSegment(normalized, map)
      if (translated === null) return segmentKey(normalized).hash
      const lead = /^\s*/.exec(node.data)?.[0] ?? ''
      const trail = /\s*$/.exec(node.data)?.[0] ?? ''
      const next = lead + translated + trail
      if (node.data !== next) node.data = next
      return null
    }

    function translateAttributes(element: Element, unknown: Set<string>) {
      if (skipped(element)) return
      for (const name of TRANSLATABLE_ATTRIBUTES) {
        const value = element.getAttribute(name)
        if (!value) continue
        const normalized = normalizeText(value)
        if (!isTranslatable(normalized)) continue
        const translated = translateSegment(normalized, map)
        if (translated === null) unknown.add(segmentKey(normalized).hash)
        else if (translated !== value) element.setAttribute(name, translated)
      }
    }

    /** Translate everything under `root`; returns the hashes nothing translated yet. */
    function pass(root: Node): Set<string> {
      const unknown = new Set<string>()
      applying = true
      try {
        if (root.nodeType === 3) {
          const hash = translateText(root as Text)
          if (hash) unknown.add(hash)
          return unknown
        }
        if (root.nodeType !== 1) return unknown
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const hash = translateText(node as Text)
          if (hash) unknown.add(hash)
        }
        translateAttributes(root as Element, unknown)
        const selector = TRANSLATABLE_ATTRIBUTES.map(name => `[${name}]`).join(',')
        for (const element of (root as Element).querySelectorAll(selector)) {
          translateAttributes(element, unknown)
        }
      } finally {
        applying = false
      }
      return unknown
    }

    const observer = new MutationObserver(records => {
      if (!active() || applying) return
      applying = true
      try {
        for (const record of records) {
          if (record.type === 'characterData') {
            if (record.target.nodeType === 3) translateText(record.target as Text)
          } else if (record.type === 'attributes') {
            translateAttributes(record.target as Element, new Set())
          } else {
            for (const added of record.addedNodes) {
              applying = false
              pass(added)
              applying = true
            }
          }
        }
      } finally {
        applying = false
      }
    })

    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    /** Ask the memory for what this page shows and does not have yet, plus the page's state. */
    async function refresh() {
      if (!state.value) return
      const unknown = active() ? pass(document.body) : new Set<string>()
      for (const text of headTexts([
        { tag: 'title', textContent: document.title, props: {} },
        ...[...document.querySelectorAll('meta[name="description"],meta[property^="og:"]')].map(
          meta => ({
            tag: 'meta',
            props: {
              name: meta.getAttribute('name'),
              property: meta.getAttribute('property'),
              content: meta.getAttribute('content'),
            },
          })
        ),
      ] as Tag[])) {
        const normalized = normalizeText(text)
        if (isTranslatable(normalized)) unknown.add(segmentKey(normalized).hash)
      }
      const hashes = [...unknown].filter(hash => !asked.has(hash)).slice(0, 3000)
      for (const hash of hashes) asked.add(hash)
      try {
        const response = await $fetch<{
          map: Record<string, string>
          translated: string[]
          embargoed: boolean
        }>('/api/auto-translate/lookup', {
          method: 'POST',
          body: {
            locale: state.value.locale,
            path: state.value.path,
            hashes: active() ? hashes : [],
          },
        })
        for (const [hash, text] of Object.entries(response.map)) map.set(hash, text)
        state.value.translated = response.translated
        state.value.embargoed = response.embargoed
        state.value.map = Object.fromEntries(map)
      } catch {
        return
      }
      if (active()) pass(document.body)
      // unhead re-renders only a head marked dirty; the title and canonical depend on what
      // just arrived.
      ;(head as { dirty?: boolean }).dirty = true
      await head.hooks.callHook('entries:updated', head)
    }

    // Leaving or entering a machine-translated locale reloads the page: Vue only rewrites the
    // text that changed, so French text it never re-rendered would survive on a Spanish page.
    const router = useRouter()
    router.beforeEach((to, from) => {
      const before = splitLocalePath(from.path).locale
      const after = splitLocalePath(to.path).locale
      if (before !== after && (isAutoTranslateLocale(before) || isAutoTranslateLocale(after))) {
        window.location.assign(to.fullPath)
        return false
      }
    })
    router.afterEach(to => {
      if (!state.value) return
      const { locale, path } = splitLocalePath(to.path)
      const clean = path.replace(/(.)\/+$/, '$1') || '/'
      if (clean !== state.value.path)
        state.value = { ...state.value, locale, path: clean, map: state.value.map }
    })
    // The first page came with its state from the server; a Spanish visit has nothing else to ask
    // until it navigates. A translated one still asks for what only the browser rendered.
    let firstPage = true
    nuxtApp.hook('page:finish', () => {
      const first = firstPage
      firstPage = false
      if (first && !active()) return
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(refresh, 250)
    })

    // Installed for the whole visit in a machine-translated locale, even on a reserved page: the
    // next page of the visit may not be one. `active()` decides, page by page.
    if (!isAutoTranslateLocale(state.value.locale)) return
    // Vue reports the text it rewrites; on these pages that is the design, not a defect, and a
    // console error costs the page its Lighthouse "no browser errors" check.
    const consoleError = console.error
    console.error = (...args: unknown[]) => {
      if (args[0] === HYDRATION_MISMATCH) return
      consoleError(...args)
    }
    nuxtApp.hook('app:suspense:resolve', () => {
      console.error = consoleError
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    })
  },
})
