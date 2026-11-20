// /llms.txt: el índice para asistentes de IA, generado de los catálogos del sitio.
//
// Hasta el 20/11/2026 era un archivo estático (`public/llms.txt`) que describía sólo el
// comparador de cotizaciones, mientras los asistentes aterrizaban en los directorios de precios
// (autos, celulares, alquileres, equipar…) que no nombraba, y decía "145 guías" cuando ya había
// más. Lo que se pinnea acá:
// - el FORMATO de llmstxt.org (H1, resumen en blockquote, texto libre sin encabezados y secciones
//   H2 que son sólo listas de `- [nombre](url): notas`);
// - que cada enlace del sitio exista como página o route, sea público (`edgeTtlFor` no lo excluye)
//   y lo permita robots.txt — un enlace a una página privada o a una ruta que se mudó sería una
//   instrucción mala para un agente, y nada más del sitio lo notaría;
// - que un directorio nuevo no pueda entrar al registro sin declarar cada cuánto se actualiza;
// - que el archivo estático no vuelva: Nitro sirve `public/` ANTES que los routes, así que un
//   `public/llms.txt` taparía este route sin que ningún test del route fallara.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import {
  generateRobotsTxt,
  matchPathToRule,
  normalizeGroup,
  parseRobotsTxt,
} from '@nuxtjs/robots/util'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { AI_TOOLSETS, MCP_ENDPOINT } from '../../utils/aiSearch'
import { DIRECTORIOS } from '../../utils/directorios'
import { edgeTtlFor } from '../../utils/edgeCache'
import { guideSlugs, guides } from '../../utils/guides'
import { LLMS_SITE_SUMMARY, LLMS_SITE_URL } from '../../utils/llmsFull'
import {
  LLMS_DIRECTORIO_FRESHNESS,
  LLMS_LISTING_PATTERNS,
  LLMS_STABLE_PATTERNS,
  LLMS_UI_PATH,
  openDataLink,
  renderLlmsIndex,
  type LlmsIndexInput,
} from '../../utils/llmsIndex'
import { OPEN_DATA_ENDPOINTS } from '../../utils/openData'
import { toolPath, tools } from '../../utils/tools'
import { installNitroGlobals } from './helpers/nitro'

// El catálogo de guías y nuxt.config son módulos grandes; mismo presupuesto que llmsFull.test.ts.
vi.setConfig({ testTimeout: 60_000 })

const SITE = 'https://cambio-uruguay.com'
const APP = join(__dirname, '..', '..')
const PAGES_DIR = join(APP, 'pages')

const INPUT: LlmsIndexInput = {
  siteUrl: LLMS_SITE_URL,
  directorios: DIRECTORIOS,
  tools,
  guideCount: guides.length,
  openDataEndpoints: OPEN_DATA_ENDPOINTS,
  mcpToolsets: AI_TOOLSETS,
}

const output = renderLlmsIndex(INPUT)

// ── Resolución de rutas contra `pages/` (calcado de internalLinks.test.ts) ──────────────────────

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return vueFiles(full)
    return name.endsWith('.vue') ? [full] : []
  })
}

const pageFiles = vueFiles(PAGES_DIR).map(f => relative(PAGES_DIR, f).split(sep).join('/'))

function fileToRoute(file: string): string {
  const route = file.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')
  return route ? `/${route}` : '/'
}

const staticRoutes = new Set(pageFiles.filter(f => !f.includes('[')).map(fileToRoute))
const dynamicRouteFiles = pageFiles.filter(f => f.includes('[')).map(fileToRoute)

/**
 * Un segmento puede ser entero dinámico (`[slug]`) o mezclado (`hasta-[monto]-dolares`): cada
 * `[param]` vale una tira sin barras; `[[opt]]` como segmento entero es opcional, `[...x]` el resto.
 */
function routeMatcher(route: string): RegExp {
  const pattern = route
    .split('/')
    .slice(1)
    .map(segment => {
      if (/^\[\[[^\]]+\]\]$/.test(segment)) return '(?:/[^/]+)?'
      if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return '/.+'
      return `/${segment
        .split(/(\[[^\]]+\])/)
        .map(part =>
          /^\[[^\]]+\]$/.test(part) ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        )
        .join('')}`
    })
    .join('')
  return new RegExp(`^${pattern}$`)
}

const dynamicMatchers = dynamicRouteFiles.map(routeMatcher)

function isPage(path: string): boolean {
  return staticRoutes.has(path) || dynamicMatchers.some(re => re.test(path))
}

/** Rutas que no son páginas pero existen: un route de Nitro o la API de datos abiertos. */
function isServerRoute(path: string): boolean {
  if (path === '/llms-full.txt')
    return existsSync(join(APP, 'server', 'routes', 'llms-full.txt.ts'))
  if (path === '/llms.txt') return existsSync(join(APP, 'server', 'routes', 'llms.txt.ts'))
  if (path === '/api/datos') return existsSync(join(APP, 'server', 'api', 'datos', 'index.get.ts'))
  if (path === '/api/datos/openapi.json')
    return existsSync(join(APP, 'server', 'api', 'datos', 'openapi.json.get.ts'))
  if (OPEN_DATA_ENDPOINTS.some(endpoint => endpoint.ruta === path)) {
    const rel = path.replace(/^\/api\//, '')
    return (
      existsSync(join(APP, 'server', 'api', `${rel}.get.ts`)) ||
      existsSync(join(APP, 'server', 'api', rel, 'index.get.ts'))
    )
  }
  return false
}

// ── Lectura del documento ─────────────────────────────────────────────────────────────────────

const LINK_ITEM = /^- \[[^\]]+\]\((https?:\/\/[^)\s]+)\)(: .+)?$/

function sections(text: string): Array<{ heading: string; lines: string[] }> {
  const out: Array<{ heading: string; lines: string[] }> = []
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) out.push({ heading: line.slice(3), lines: [] })
    else if (out.length) out[out.length - 1]!.lines.push(line)
  }
  return out
}

const links = [...output.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map(match => match[1]!)
const sitePaths = [
  ...new Set(
    links
      .filter(url => url === SITE || url.startsWith(`${SITE}/`))
      // El pathname y no la URL entera: los enlaces de la API llevan su consulta de ejemplo.
      .map(url => new URL(url).pathname)
  ),
]
const pagePaths = sitePaths.filter(path => !isServerRoute(path))

const ALLOWED_HOSTS = new Set([
  'cambio-uruguay.com',
  'mcp.cambio-uruguay.com',
  'api.cambio-uruguay.com',
  'github.com',
  'creativecommons.org',
])

describe('/llms.txt follows the llmstxt.org format', () => {
  it('opens with the H1 and the blockquote summary', () => {
    const lines = output.split('\n')
    expect(lines[0]).toBe('# Cambio Uruguay')
    const firstContent = lines.slice(1).find(line => line.trim() !== '')
    expect(firstContent).toBe(`> ${LLMS_SITE_SUMMARY}`)
  })

  it('has no heading between the summary and the first H2 section', () => {
    const lines = output.split('\n')
    const firstH2 = lines.findIndex(line => line.startsWith('## '))
    expect(firstH2).toBeGreaterThan(2)
    for (const line of lines.slice(1, firstH2)) expect(line.startsWith('#'), line).toBe(false)
  })

  it('every H2 section holds only a markdown list of links with optional notes', () => {
    const all = sections(output)
    expect(all.length).toBeGreaterThanOrEqual(5)
    for (const section of all) {
      const items = section.lines.filter(line => line.trim() !== '')
      expect(items.length, section.heading).toBeGreaterThan(0)
      for (const line of items) expect(line, `${section.heading}: ${line}`).toMatch(LINK_ITEM)
    }
    expect(all.map(section => section.heading)).toContain('Optional')
    expect(all.at(-1)!.heading).toBe('Optional')
  })

  it('is deterministic, one line per item, and ends with a single newline', () => {
    expect(renderLlmsIndex(INPUT)).toBe(output)
    expect(output.endsWith('\n')).toBe(true)
    expect(output.endsWith('\n\n')).toBe(false)
    expect(output).not.toMatch(/\n{3,}/)
    expect(output).not.toMatch(/[ \t]+$/m)
  })
})

describe('/llms.txt only links what exists and is public', () => {
  it('links only to the site and an allowlist of hosts', () => {
    expect(links.length).toBeGreaterThan(40)
    for (const url of links) expect(ALLOWED_HOSTS.has(new URL(url).host), url).toBe(true)
  })

  it('every site path is a page file, a guide, or an existing server route', () => {
    const slugs = new Set(guideSlugs())
    for (const path of sitePaths) {
      const guide = /^\/guias\/([a-z0-9-]+)$/.exec(path)
      const ok = isPage(path) || isServerRoute(path) || Boolean(guide && slugs.has(guide[1]!))
      expect(ok, path).toBe(true)
    }
  })

  it('no page path is personal or private (edgeCache NEVER list)', () => {
    expect(pagePaths.length).toBeGreaterThan(30)
    for (const path of pagePaths) expect(edgeTtlFor(path), path).not.toBeNull()
    for (const path of ['/asistente-ia', '/buscar', '/api-reference', '/cuenta', '/estado'])
      expect(sitePaths).not.toContain(path)
  })

  describe('and robots.txt lets every crawler fetch it', () => {
    let groups: Array<{ userAgent: string[]; _rules: unknown }> = []

    beforeAll(async () => {
      vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
      try {
        const { default: config } = await import('../../nuxt.config')
        const robots = parseRobotsTxt(
          generateRobotsTxt({
            groups: [
              normalizeGroup({ allow: config.robots.allow, disallow: config.robots.disallow }),
              ...config.robots.groups.map(normalizeGroup),
            ],
            sitemaps: [config.robots.sitemap],
          })
        )
        groups = robots.groups.map(normalizeGroup) as typeof groups
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('allows every linked site path in every crawler group', () => {
      expect(groups.some(group => group.userAgent.includes('*'))).toBe(true)
      for (const group of groups) {
        for (const path of [...sitePaths, '/llms.txt']) {
          expect(
            matchPathToRule(path, group._rules as never)?.allow ?? true,
            `${group.userAgent.join(', ')} → ${path}`
          ).toBe(true)
        }
      }
    })
  })
})

describe('/llms.txt describes what assistants land on', () => {
  it('declares the freshness of exactly the registered directories', () => {
    expect(Object.keys(LLMS_DIRECTORIO_FRESHNESS).sort()).toEqual(
      DIRECTORIOS.map(entry => entry.id).sort()
    )
    for (const text of Object.values(LLMS_DIRECTORIO_FRESHNESS)) {
      expect(text.trim()).not.toBe('')
      // Sin conteos ni fechas: cada página imprime los suyos, y un número acá envejecería solo.
      expect(text).not.toMatch(/\d\s*(?:avisos|propiedades|modelos|tiendas|casas|artículos|apps)/)
      expect(text).not.toMatch(/\d{4}|\d{1,2}:\d{2}/)
    }
  })

  it('links every directory and its secondary pages, with its freshness line', () => {
    for (const entry of DIRECTORIOS) {
      expect(output).toContain(`](${SITE}${entry.to}): `)
      expect(output).toContain(LLMS_DIRECTORIO_FRESHNESS[entry.id]!)
      for (const link of entry.tambien ?? []) expect(output).toContain(`](${SITE}${link.to})`)
    }
    for (const path of [
      '/directorios-uruguay',
      '/mercado-de-autos-usados-uruguay',
      '/evolucion-precio-alquileres-uruguay',
    ])
      expect(sitePaths).toContain(path)
  })

  it('every stable citation pattern is a dynamic page of the site', () => {
    const normalize = (route: string) => route.replace(/\[[^\]]+\]|<[^>]+>/g, '[]')
    const dynamic = new Set(dynamicRouteFiles.map(normalize))
    expect(LLMS_STABLE_PATTERNS.length).toBeGreaterThanOrEqual(6)
    for (const { pattern, directorio } of LLMS_STABLE_PATTERNS) {
      expect(pattern).toMatch(/^\/[a-z0-9-]+\/.*<[a-z-]+>/)
      expect(dynamic.has(normalize(pattern)), pattern).toBe(true)
      expect(
        DIRECTORIOS.some(entry => entry.id === directorio),
        directorio
      ).toBe(true)
      expect(output).toContain(pattern)
    }
  })

  it('every listing pattern and plain-text path in the notes is a page of the site', () => {
    const normalize = (route: string) => route.replace(/\[[^\]]+\]|<[^>]+>/g, '[]')
    const dynamic = new Set(dynamicRouteFiles.map(normalize))
    expect(LLMS_LISTING_PATTERNS.length).toBeGreaterThanOrEqual(3)
    for (const pattern of LLMS_LISTING_PATTERNS) {
      expect(dynamic.has(normalize(pattern)), pattern).toBe(true)
      expect(output).toContain(pattern)
    }
    expect(isPage(LLMS_UI_PATH), LLMS_UI_PATH).toBe(true)
    expect(output).toContain(`Valor en vivo en ${LLMS_UI_PATH}.`)
  })

  it('lists every tool, the live guide count, the open data API and every MCP toolset', () => {
    for (const tool of tools) expect(output).toContain(`](${SITE}${toolPath(tool)}): `)
    expect(output).toContain(`las ${guides.length} guías`)
    expect(output).not.toContain('145 guías')
    for (const endpoint of OPEN_DATA_ENDPOINTS) {
      // El enlace es el ejemplo del catálogo, que sí contesta 200: la ruta pelada de tres de ellas
      // devuelve 400 («mercado debe ser alquiler, venta o autos»).
      expect(endpoint.ejemplo.startsWith(`${endpoint.ruta}?`), endpoint.id).toBe(true)
      expect(output).toContain(
        `](${SITE}${openDataLink(endpoint.ejemplo)}): ruta: ${endpoint.ruta};`
      )
      expect(output).not.toContain(`](${SITE}${endpoint.ruta})`)
    }
    expect(output).toContain(`](${SITE}/api/datos)`)
    expect(output).toContain(`](${SITE}/api/datos/openapi.json)`)
    expect(output).toContain(`](${SITE}/datos-abiertos-uruguay)`)
    expect(output).toContain(`](${MCP_ENDPOINT}): `)
    for (const set of AI_TOOLSETS) {
      expect(output).toContain(`](${set.url})`)
      for (const tool of set.tools) expect(output).toContain(tool.name)
    }
    expect(output).toContain(`](${SITE}/buscar-con-ia)`)
  })

  it('takes its catalogues as parameters: a fixture renders without the real ones', () => {
    const small = renderLlmsIndex({
      siteUrl: 'https://example.test/',
      directorios: [DIRECTORIOS[0]!],
      tools: [{ slug: 'x', title: 'Herramienta X', description: 'Hace  X.\n' }],
      guideCount: 7,
      openDataEndpoints: [],
      mcpToolsets: [],
    })
    expect(small).toContain('las 7 guías')
    expect(small).toContain('- [Herramienta X](https://example.test/herramientas/x): Hace X.')
    expect(small).not.toContain('example.test//')
  })
})

describe('GET /llms.txt (Nitro route)', () => {
  async function runHandler() {
    vi.resetModules()
    installNitroGlobals()
    const setResponseHeader = vi.fn()
    vi.stubGlobal('setResponseHeader', setResponseHeader)
    const mod = await import('../../server/routes/llms.txt')
    const handler = mod.default as unknown as (event: unknown) => string
    return { body: handler({}), setResponseHeader }
  }

  it('answers text/plain with a one-hour shared cache and the rendered index', async () => {
    const { body, setResponseHeader } = await runHandler()
    expect(setResponseHeader).toHaveBeenCalledWith({}, 'content-type', 'text/plain; charset=utf-8')
    expect(setResponseHeader).toHaveBeenCalledWith(
      {},
      'cache-control',
      'public, max-age=0, must-revalidate, s-maxage=3600'
    )
    expect(body).toBe(output)
  })

  it('is byte-identical across two requests', async () => {
    const first = await runHandler()
    const second = await runHandler()
    expect(first.body).toBe(second.body)
  })

  it('tripwire: no static public/llms.txt shadows the route', () => {
    expect(existsSync(join(APP, 'public', 'llms.txt'))).toBe(false)
  })
})
