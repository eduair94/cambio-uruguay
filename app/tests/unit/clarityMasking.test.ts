import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'
import { clarityRouteAllowed } from '../../utils/clarityPolicy'

// Microsoft Clarity runs in Balanced masking: inputs, numbers and e-mails are hidden in the browser,
// but every other text on screen is recorded as is — including a letter the site builds from what
// a visitor typed into a form (name, address, cédula, phone) and shows in a <pre>. Such a block has
// to sit under `data-clarity-mask` (any value: clarity-js only checks that the attribute is there)
// or on a route Clarity never records (utils/clarityPolicy.ts). A new <pre> forces the decision.
const APP = join(__dirname, '..', '..')

/** <pre> blocks that show only code or a fixed template, never what a visitor typed. */
const UNMASKED_PRE: Record<string, string> = {
  'pages/api-cotizacion-intradia.vue': 'API request and response examples',
  'pages/api-cotizaciones-regionales.vue': 'a JSON sample and curl commands',
  'pages/desarrolladores.vue': 'clone and install commands',
  'pages/empresas.vue': 'a curl example without a key',
  'pages/buscar-con-ia.vue': 'MCP client configuration snippets',
  'pages/derechos-consumidor-compras-online.vue':
    'a complaint template with [placeholders], from the chosen scenario',
  'pages/estafas-uruguay.vue': 'a complaint template with [placeholders], from the chosen scenario',
  'pages/recibir-regalos-del-exterior-uruguay.vue': 'sender instructions from fixed figures',
}

/** Blocks that show a position, a key or a generated letter, and must stay masked. */
const MUST_MASK: Record<string, string[]> = {
  'components/map/LocationsMap.vue': ['locations-map'],
  'components/LocationPopup.vue': ['location_map'],
  'components/account/ApiKeysPanel.vue': ['api-keys-panel__code', 'api-keys-panel__secret'],
  'components/watchlist/WatchlistSetup.vue': ['wl-current', 'wl-origins'],
  'pages/precio/[slug].vue': ['precios-cercanos'],
  'pages/denunciar-ruidos-molestos-uruguay.vue': ['noise-form', 'noise-text'],
  'pages/grabacion-sin-consentimiento-uruguay.vue': ['rec-form', 'rec-text'],
}

interface TemplateNode {
  type: number
  tag?: string
  props?: Array<{
    type: number
    name: string
    value?: { content: string }
    arg?: { content?: string }
    exp?: { content?: string }
  }>
  children?: TemplateNode[]
  content?: { content?: string }
}

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) vueFiles(path, out)
    else if (name.endsWith('.vue')) out.push(path)
  }
  return out
}

const files = ['pages', 'components', 'layouts'].flatMap(dir =>
  vueFiles(join(APP, dir)).map(path => ({
    path: relative(APP, path).split(sep).join('/'),
    source: readFileSync(path, 'utf8'),
  }))
)

const masks = (node: TemplateNode) =>
  (node.props ?? []).some(
    prop =>
      (prop.type === 6 && prop.name === 'data-clarity-mask') ||
      (prop.type === 7 && prop.name === 'bind' && prop.arg?.content === 'data-clarity-mask')
  )

const staticClasses = (node: TemplateNode) =>
  (node.props ?? [])
    .filter(prop => prop.type === 6 && prop.name === 'class')
    .flatMap(prop => prop.value?.content.split(/\s+/) ?? [])

interface Found {
  tag: string
  masked: boolean
  classes: string[]
  expressions: string[]
}

/** Every element of the template, with whether it or an ancestor carries the mask. */
function elements(source: string, path: string): Found[] {
  const { descriptor } = parse(source, { filename: path })
  const out: Found[] = []
  const interpolations = (node: TemplateNode): string[] =>
    node.type === 5
      ? [node.content?.content ?? '']
      : (node.children ?? []).flatMap(child => interpolations(child))
  const walk = (node: TemplateNode, masked: boolean) => {
    const here = node.type === 1 && (masked || masks(node))
    if (node.type === 1)
      out.push({
        tag: node.tag ?? '',
        masked: here,
        classes: staticClasses(node),
        expressions: node.tag === 'pre' ? interpolations(node) : [],
      })
    for (const child of node.children ?? []) walk(child, here || masked)
  }
  for (const child of (descriptor.template?.ast?.children ?? []) as TemplateNode[])
    walk(child, false)
  return out
}

/** The route a page file serves (`pages/precio/[slug].vue` → `/precio/slug`), null for components. */
function routeOf(path: string): string | null {
  if (!path.startsWith('pages/')) return null
  const route = path
    .slice('pages'.length)
    .replace(/\.vue$/, '')
    .replace(/\/index$/, '')
    .replace(/\[\[?([^[\]]+)\]\]?/g, '$1')
  return route || '/'
}

const unmaskedPre = files.flatMap(file =>
  elements(file.source, file.path)
    .filter(node => node.tag === 'pre' && !node.masked)
    .map(node => ({ file: file.path, expressions: node.expressions }))
)

describe('Clarity masks what a visitor typed', () => {
  it('every <pre> is masked, on an unrecorded route, or a declared code or template block', () => {
    const offenders = unmaskedPre
      .filter(({ file }) => {
        const route = routeOf(file)
        if (route && !clarityRouteAllowed(route)) return false
        return !(file in UNMASKED_PRE)
      })
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('no declared block interpolates something built from a form', () => {
    const builtFromForm: string[] = []
    for (const { file, expressions } of unmaskedPre) {
      if (!(file in UNMASKED_PRE)) continue
      const script = files.find(item => item.path === file)!.source
      for (const expression of expressions) {
        if (/\bform\b/.test(expression)) builtFromForm.push(`${file}: ${expression}`)
        const name = expression.trim().match(/^[A-Z_$][\w$]*/i)?.[0]
        const definition = name
          ? script.match(
              new RegExp(
                `const ${name} = computed\\([\\s\\S]*?(?=\\n(?:const|function|watch)\\b|$)`
              )
            )?.[0]
          : undefined
        if (definition && /\bform\b/.test(definition)) builtFromForm.push(`${file}: ${name}`)
      }
    }
    expect(builtFromForm).toEqual([])
  })

  it('the list of declared blocks has no stale entry', () => {
    const declared = new Set(unmaskedPre.map(({ file }) => file))
    expect(Object.keys(UNMASKED_PRE).filter(file => !declared.has(file))).toEqual([])
  })

  it('the blocks that show a position, a key or a generated letter keep their mask', () => {
    const missing: string[] = []
    for (const [file, classes] of Object.entries(MUST_MASK)) {
      const source = files.find(item => item.path === file)?.source
      if (!source) {
        missing.push(`${file}: file not found`)
        continue
      }
      const nodes = elements(source, file)
      for (const name of classes) {
        const matching = nodes.filter(node => node.classes.includes(name))
        if (!matching.length || matching.some(node => !node.masked))
          missing.push(`${file}: .${name}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('the send dialog masks its content: each action link carries the whole message', () => {
    const source = files.find(item => item.path === 'components/SendMessage.vue')!.source
    expect(source).toMatch(/<VDialog[\s\S]*?:content-props="\{ 'data-clarity-mask': 'true' \}"/)
  })
})
