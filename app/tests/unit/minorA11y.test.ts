// Cuatro hallazgos menores de axe en producción (sondeo del 2026-11-20, a11y.md F7), cada uno con
// su arreglo de atributo:
// - aria-progressbar-name: la barra de adherencia de /meal-prep-uruguay y el spinner de /noticias
//   no tenían nombre. La barra lleva aria-label; el spinner va al lado del texto «cargando», así
//   que se oculta (aria-hidden) en vez de nombrarlo dos veces.
// - image-redundant-alt: en /historico la bandera de la columna Moneda decía «USD» pegada al texto
//   «USD» (20 nodos). CurrencyFlag gana una prop `decorative` que le da alt=""; por defecto sigue
//   siendo alt=<código>. La bandera de la columna Casa NO es decorativa: es lo único con nombre
//   dentro de su botón (el ícono es aria-hidden), y vaciarla dejaría el enlace sin nombre.
// - scrollable-region-focusable: la tabla mes a mes de /indicadores/<indicador> se desborda en un
//   teléfono y su `.v-table__wrapper` no toma foco. El desplazamiento pasa a un div con tabindex.
// - empty-table-header: la columna de acciones de las tablas de cotizaciones tiene `title: ''`. Un
//   slot #header.actions pone «Acciones» sólo para lectores de pantalla (d-sr-only).
//
// Comprobación sobre el AST de la plantilla (como carFiltersMore.test.ts) y un render SSR real
// de CurrencyFlag.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { actionsHeaderLabel } from '../../utils/a11yLabels'

const APP = join(__dirname, '..', '..')

function sfc(file: string) {
  const filename = join(APP, file)
  return parse(readFileSync(filename, 'utf8'), { filename }).descriptor
}

function elements(node: any): any[] {
  return [node, ...(node.children || []).flatMap(elements)]
}

function templateElements(file: string): any[] {
  const ast = sfc(file).template?.ast
  expect(ast, `${file} tiene que tener plantilla`).toBeTruthy()
  return elements(ast).filter(n => n.type === 1)
}

/** Un atributo estático (`name="x"`) o enlazado (`:name="x"`), por nombre. */
function prop(el: any, name: string): { static?: string; bound?: string } | null {
  for (const p of el.props || []) {
    if (p.type === 6 && p.name === name) return { static: p.value?.content ?? '' }
    if (p.type === 7 && p.name === 'bind' && p.arg?.content === name) {
      return { bound: p.exp?.content ?? '' }
    }
  }
  return null
}

/** El nombre del slot de un <template #x>, si lo tiene. */
function slotName(el: any): string | null {
  if (el.tag !== 'template') return null
  const slot = (el.props || []).find((p: any) => p.type === 7 && p.name === 'slot')
  return slot?.arg?.content ?? null
}

describe('aria-progressbar-name', () => {
  it('la barra de adherencia de /meal-prep-uruguay tiene nombre con el porcentaje', () => {
    const bars = templateElements('pages/meal-prep-uruguay.vue').filter(
      n => n.tag === 'VProgressLinear'
    )
    expect(bars.length).toBeGreaterThan(0)
    for (const bar of bars) {
      const label = prop(bar, 'aria-label')
      expect(label, 'VProgressLinear sin aria-label').not.toBeNull()
      expect(label!.bound).toMatch(/pct\(plan\.adherence\.kcal\)/)
    }
  })

  it('el spinner de /noticias está oculto: el texto de al lado ya dice que carga', () => {
    const spinners = templateElements('pages/noticias.vue').filter(
      n => n.tag === 'VProgressCircular'
    )
    expect(spinners.length).toBeGreaterThan(0)
    for (const s of spinners) expect(prop(s, 'aria-hidden')?.static).toBe('true')
  })
})

/** CurrencyFlag compilado de verdad y renderizado como lo hace el servidor. */
function loadCurrencyFlag(): vue.Component {
  const descriptor = sfc('components/CurrencyFlag.vue')
  const { content } = compileScript(descriptor, { id: 'currency-flag', inlineTemplate: true })
  const { outputText } = ts.transpileModule(content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const exports = {} as { default: vue.Component }
  new Function('exports', 'require', 'computed', outputText)(
    exports,
    (name: string) => {
      if (name === 'vue') return vue
      throw new Error(`Unexpected module ${name}`)
    },
    vue.computed
  )
  return exports.default
}

const ITEM = { origin: 'brou', code: 'USD', type: '', buy: 40, sell: 42, name: 'Dólar' }

describe('image-redundant-alt', () => {
  const CurrencyFlag = loadCurrencyFlag()
  const render = (props: Record<string, unknown>) =>
    renderToString(vue.createSSRApp({ render: () => vue.h(CurrencyFlag, props) }))

  it('CurrencyFlag sigue diciendo el código por defecto (la bandera sola necesita nombre)', async () => {
    expect(await render({ item: ITEM })).toMatch(/<img[^>]*alt="USD"/)
  })

  it('CurrencyFlag decorative deja alt vacío', async () => {
    const html = await render({ item: ITEM, decorative: true })
    // El SSR de Vue escribe el atributo vacío como `alt` a secas: para el navegador es alt="".
    expect(html).toMatch(/<img[^>]*\salt(="")?[\s>]/)
    expect(html).not.toMatch(/alt="USD"/)
  })

  it('el emoji decorativo no repite el código en title', async () => {
    const html = await render({ item: { ...ITEM, code: 'XAU' }, decorative: true })
    expect(html).not.toMatch(/title="XAU"/)
    expect(html).toMatch(/aria-hidden="true"/)
  })

  it('/historico: decorativa en la columna Moneda (código impreso al lado), no en la de Casa', () => {
    const els = templateElements('pages/historico/index.vue')
    const flagsIn = (slot: string) => {
      const tpl = els.find(n => slotName(n) === slot)
      expect(tpl, `falta el slot ${slot}`).toBeTruthy()
      return elements(tpl).filter(n => n.type === 1 && n.tag === 'CurrencyFlag')
    }
    const codeFlags = flagsIn('item.code')
    expect(codeFlags.length).toBe(1)
    expect(prop(codeFlags[0], 'decorative')).not.toBeNull()

    const originFlags = flagsIn('item.origin')
    expect(originFlags.length).toBe(1)
    expect(prop(originFlags[0], 'decorative')).toBeNull()
  })
})

describe('scrollable-region-focusable', () => {
  it('la tabla mes a mes de /indicadores se desplaza dentro de una región enfocable', () => {
    const els = templateElements('pages/indicadores/[indicador].vue')
    const wrapper = els.find(
      n =>
        n.tag === 'div' &&
        (n.children || []).some(
          (c: any) => c.tag === 'VTable' && prop(c, 'data-testid')?.static === 'indicador-history'
        )
    )
    expect(wrapper, 'la VTable del historial tiene que estar envuelta en un div').toBeTruthy()
    expect(prop(wrapper, 'tabindex')?.static).toBe('0')
    expect(prop(wrapper, 'role')?.static).toBe('region')
    const label = prop(wrapper, 'aria-label')
    expect(label?.static || label?.bound).toBeTruthy()
    expect(prop(wrapper, 'class')?.static).toContain('indicador-scroll')

    const css = sfc('pages/indicadores/[indicador].vue')
      .styles.map(s => s.content)
      .join('\n')
    expect(css).toMatch(/\.indicador-scroll\s*\{[^}]*overflow-x:\s*auto/)
    expect(css).toMatch(
      /\.indicador-scroll\s+:deep\(\.v-table__wrapper\)\s*\{[^}]*overflow:\s*visible/
    )
  })
})

describe('empty-table-header', () => {
  const PAGES = [
    'pages/casa/[origin]/index.vue',
    'pages/cotizacion/[moneda].vue',
    'pages/dolar/[departamento].vue',
    'pages/frontera/[ruta].vue',
  ]

  it.each(PAGES)('%s pone un nombre sólo para lectores en la columna de acciones', file => {
    const els = templateElements(file)
    const slot = els.find(n => slotName(n) === 'header.actions')
    expect(slot, 'falta <template #header.actions>').toBeTruthy()
    const span = elements(slot).find(n => n.type === 1 && n.tag === 'span')
    expect(span, 'el slot tiene que tener un span').toBeTruthy()
    expect(prop(span, 'class')?.static?.split(/\s+/)).toContain('d-sr-only')
    const text = elements(span).find(n => n.type === 5)
    expect(text?.content?.content).toMatch(/actionsHeaderLabel\(locale\)/)

    // El encabezado visible sigue vacío: nada cambia en pantalla.
    const script = sfc(file).scriptSetup?.content ?? ''
    expect(script).toMatch(/\{\s*title:\s*'',\s*key:\s*'actions'/)
  })

  it('la etiqueta está en los tres idiomas con mensajes propios y cae al español', () => {
    expect(actionsHeaderLabel('es')).toBe('Acciones')
    expect(actionsHeaderLabel('en')).toBe('Actions')
    expect(actionsHeaderLabel('pt')).toBe('Ações')
    expect(actionsHeaderLabel('fr')).toBe('Acciones')
  })
})
