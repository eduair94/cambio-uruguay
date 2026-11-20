// "Seguí leyendo" mostraba el título de una página y enlazaba a otra. El bloque de arriba
// (`RelatedInline`) anotaba sus rutas en un `useState` desde un `watchEffect`, y el del pie
// (`RelatedPages`, en el layout) las excluía. En una página con `await` de nivel superior
// (indicadores, costo de vida) el servidor pintaba el pie antes de la anotación y el navegador
// después; la hidratación de producción corrige el texto pero no el `href` ni el ícono. Medido en
// /indicadores/unidad-reajustable: «Pagar el alquiler en efectivo» llevaba a la página del reajuste
// del alquiler. Ahora las dos salen de `relatedInlineItems(route.path, route.query)`, pura.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  RELATED_INLINE_LIMIT,
  RELATED_INLINE_PREFIXES,
  RELATED_INLINE_ROUTES,
  relatedInlineItems,
  rendersRelatedInline,
} from '../../utils/relatedInline'
import { relatedFor } from '../../utils/relatedPages'

const APP = join(__dirname, '..', '..')
const PAGES = join(APP, 'pages')
const read = (path: string): string => readFileSync(join(APP, path), 'utf8')

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return vueFiles(full)
    return name.endsWith('.vue') ? [full] : []
  })
}

/** `pages/herramientas/calculadora-iva.vue` → `/herramientas/calculadora-iva`; dinámica → prefijo. */
function routeOf(file: string): { route: string; dynamic: boolean } {
  const parts = relative(PAGES, file)
    .replace(/\.vue$/, '')
    .split(sep)
  if (parts[parts.length - 1] === 'index') parts.pop()
  const dynamicAt = parts.findIndex(part => part.startsWith('['))
  if (dynamicAt >= 0) return { route: `/${parts.slice(0, dynamicAt).join('/')}/`, dynamic: true }
  return { route: `/${parts.join('/')}`, dynamic: false }
}

const rendering = vueFiles(PAGES)
  .filter(file => /<RelatedInline\b|<ToolShell\b/.test(readFileSync(file, 'utf8')))
  .map(routeOf)

describe('las páginas que pintan el bloque de arriba son exactamente las declaradas', () => {
  it('rutas fijas: las de <ToolShell> y <RelatedInline> en pages/', () => {
    const fixed = rendering.filter(r => !r.dynamic).map(r => r.route)
    expect([...fixed].sort()).toEqual([...RELATED_INLINE_ROUTES].sort())
  })

  it('rutas dinámicas: sólo los indicadores', () => {
    const dynamic = rendering.filter(r => r.dynamic).map(r => r.route)
    expect([...dynamic].sort()).toEqual([...RELATED_INLINE_PREFIXES].sort())
  })

  it('ningún otro componente lo pinta: si no, una página lo mostraría sin estar en la lista', () => {
    const components = vueFiles(join(APP, 'components'))
      .filter(file => /<RelatedInline\b/.test(readFileSync(file, 'utf8')))
      .map(file => relative(APP, file).split(sep).join('/'))
    expect(components).toEqual(['components/ToolShell.vue'])
  })

  it('el índice de indicadores y el carrito no lo pintan y no excluyen nada', () => {
    expect(rendersRelatedInline('/indicadores')).toBe(false)
    expect(rendersRelatedInline('/indicadores/')).toBe(false)
    expect(rendersRelatedInline('/herramientas/carrito-importacion')).toBe(false)
    expect(relatedInlineItems('/herramientas/carrito-importacion')).toEqual([])
    expect(relatedInlineItems('/guias/otra')).toEqual([])
  })
})

describe('lo pintado arriba y lo excluido abajo son lo mismo', () => {
  const PATH = '/indicadores/unidad-reajustable'

  it('arriba van tres, de la misma lista que el pie y en su orden', () => {
    const inline = relatedInlineItems(PATH).map(item => item.to)
    expect(inline).toHaveLength(RELATED_INLINE_LIMIT)
    expect(inline).toEqual(
      relatedFor(PATH, RELATED_INLINE_LIMIT)
        .map(item => item.to)
        .slice(0, RELATED_INLINE_LIMIT)
    )
  })

  it('el pie de /indicadores/unidad-reajustable no repite ninguna de las tres', () => {
    const inline = relatedInlineItems(PATH).map(item => item.to)
    const footer = relatedFor(PATH, 6, { exclude: inline }).map(item => item.to)
    expect(footer.length).toBeGreaterThan(0)
    for (const to of inline) expect(footer).not.toContain(to)
  })

  it('con prefijo de idioma, query o barra final da lo mismo: misma ruta, mismas tarjetas', () => {
    const base = relatedInlineItems(PATH).map(item => item.to)
    expect(relatedInlineItems(`/en${PATH}`).map(item => item.to)).toEqual(base)
    expect(relatedInlineItems(`${PATH}/`).map(item => item.to)).toEqual(base)
    expect(relatedInlineItems(PATH, { operation: 'rent', mode: 'x' }).map(i => i.to)).toEqual(
      relatedFor(PATH, RELATED_INLINE_LIMIT, { operation: 'rent', mode: 'x' }).map(i => i.to)
    )
  })

  it('es determinista: el servidor y el navegador calculan lo mismo', () => {
    for (const path of [PATH, '/indicadores/bpc', '/herramientas/costo-de-vida']) {
      expect(relatedInlineItems(path)).toEqual(relatedInlineItems(path))
      expect(relatedInlineItems(path).length).toBeGreaterThan(0)
    }
  })

  it('los dos componentes llaman a la misma función con los mismos argumentos, sin estado', () => {
    const inline = read('components/RelatedInline.vue')
    const footer = read('components/RelatedPages.vue')
    const call = 'relatedInlineItems(route.path, route.query)'
    expect(inline).toContain(call)
    expect(footer).toContain(call)
    for (const source of [inline, footer]) {
      // Las llamadas, no los comentarios que cuentan por qué se sacaron.
      expect(source).not.toMatch(/\buseState\s*[<(]/)
      expect(source).not.toMatch(/\bwatchEffect\s*\(/)
      expect(source).not.toContain('relatedInlineStateKey')
    }
  })

  it('la sección de la tarjeta del pie no baja de 12 px (0,68rem daba 10,88 px)', () => {
    const footer = read('components/RelatedPages.vue')
    const rule = footer.match(/\.related-section\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toContain('font-size: 0.75rem')
    expect(footer).not.toMatch(/font-size:\s*0\.68rem/)
  })
})
