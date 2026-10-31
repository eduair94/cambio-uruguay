import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { describe, expect, it } from 'vitest'
import { adsenseLoaderScripts } from '../../composables/useAds'
import * as ads from '../../utils/ads'
import {
  adDensityForPath,
  adsAllowed,
  adsFlagOn,
  isCalculatorPath,
  maxAdSlots,
} from '../../utils/ads'

// La unidad manual de las calculadoras, detrás de NUXT_PUBLIC_ADS_TOOLS.
//
// Desde el 19/8/2026 las calculadoras van en `none` (sin loader): los anuncios AUTOMÁTICOS leen el
// DOM y en una calculadora el DOM es un formulario, así que caían entre los campos y el resultado.
// El interruptor las devuelve a `light` —loader y UNA unidad manual después del resultado y de su
// explicación— y sólo tiene sentido con esas URL excluidas de Anuncios automáticos en la consola,
// cosa que el código no puede comprobar. Por eso está APAGADO por defecto y estos tests fijan:
//
//   1. apagado = nada cambia: ni loader ni unidad en ninguna calculadora;
//   2. encendido = loader y exactamente una unidad manual, la de ToolShell (o la de la única
//      calculadora que no usa ToolShell), con el cierre del layout apagado en esas rutas;
//   3. la unidad va DESPUÉS del resultado, del texto explicativo y de la advertencia;
//   4. el índice `/herramientas` no cambia, prendido o apagado.

const CALCULATORS = [
  '/herramientas/calculadora-sueldo-liquido',
  '/herramientas/calculadora-plazo-fijo',
  '/herramientas/conversor-unidad-indexada',
  '/herramientas/carrito-importacion',
  '/en/herramientas/costo-de-vida',
  '/pt/herramientas/calculadora-iva/',
  '/herramientas/conversor-de-monedas?monto=100',
]

type Node = {
  type: number
  tag?: string
  props?: any[]
  children?: Node[]
}

const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7

function readSfc(path: string) {
  const filename = resolve(__dirname, '../..', path)
  return parse(readFileSync(filename, 'utf8'), { filename }).descriptor
}

/** Element nodes only, in document order. */
function elements(node: Node): Node[] {
  const own = node.type === ELEMENT ? [node] : []
  return [...own, ...(node.children ?? []).flatMap(elements)]
}

function elementChildren(node: Node): Node[] {
  return (node.children ?? []).filter(child => child.type === ELEMENT)
}

function attr(node: Node, name: string): string | undefined {
  return (node.props ?? []).find(prop => prop.type === ATTRIBUTE && prop.name === name)?.value
    ?.content
}

function directive(node: Node, name: string): string {
  const prop = (node.props ?? []).find(p => p.type === DIRECTIVE && p.name === name)
  return prop?.exp?.content ?? ''
}

function hasDirective(node: Node, name: string): boolean {
  return (node.props ?? []).some(p => p.type === DIRECTIVE && p.name === name)
}

function adSlots(root: Node): Node[] {
  return elements(root).filter(node => node.tag === 'AdSlot')
}

// ---------------------------------------------------------------------------------------------
// 1. La política de rutas.
// ---------------------------------------------------------------------------------------------

describe('utils/ads: el interruptor de las calculadoras', () => {
  it('apagado (por defecto) deja las calculadoras sin loader, como desde agosto', () => {
    for (const path of CALCULATORS) {
      expect(adDensityForPath(path), path).toBe('none')
      expect(adDensityForPath(path, {}), path).toBe('none')
      expect(adDensityForPath(path, { toolsAds: false }), path).toBe('none')
      expect(adsAllowed(path), path).toBe(false)
    }
  })

  it('encendido las pasa a light: loader y UNA unidad manual', () => {
    for (const path of CALCULATORS) {
      const density = adDensityForPath(path, { toolsAds: true })
      expect(density, path).toBe('light')
      expect(maxAdSlots(density), path).toBe(1)
      expect(adsAllowed(path, { toolsAds: true }), path).toBe(true)
    }
  })

  it('no toca el índice ni ninguna otra ruta', () => {
    for (const toolsAds of [false, true]) {
      expect(adDensityForPath('/herramientas', { toolsAds })).toBe('light')
      expect(adDensityForPath('/en/herramientas/', { toolsAds })).toBe('light')
      expect(adDensityForPath('/franquicia-aduana-uruguay', { toolsAds })).toBe('normal')
      expect(adDensityForPath('/dolar-hoy', { toolsAds })).toBe('light')
      expect(adDensityForPath('/contacto', { toolsAds })).toBe('none')
      expect(adDensityForPath('/widget', { toolsAds })).toBe('none')
      // Un parecido no hereda la regla.
      expect(adDensityForPath('/herramientas-financieras', { toolsAds })).toBe('normal')
    }
  })

  it('reconoce una calculadora en cualquier idioma, y nunca el índice', () => {
    for (const path of CALCULATORS) expect(isCalculatorPath(path), path).toBe(true)
    for (const path of ['/herramientas', '/herramientas/', '/en/herramientas', '/widget', '/'])
      expect(isCalculatorPath(path), path).toBe(false)
  })

  it('lee el interruptor igual horneado en el build (cadena) que pisado en runtime (destr)', () => {
    for (const on of ['1', 'true', ' TRUE ', 'on', 'sí', 1, true])
      expect(adsFlagOn(on), `${on}`).toBe(true)
    for (const off of ['', '0', 'false', 'no', 'ture', 0, false, undefined, null, {}])
      expect(adsFlagOn(off), `${off}`).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// 2. El composable: loader y unidades con la config real del runtime simulada.
// ---------------------------------------------------------------------------------------------

const composableSource = readFileSync(resolve(__dirname, '../../composables/useAds.ts'), 'utf8')

const PLACEMENTS = ['content-end', 'in-article', 'sidebar', 'after-tool'] as const
const SLOTS = { contentEnd: 'close', inArticle: 'inside', sidebar: 'rail' }

function useAdsAt(path: string, config: Record<string, unknown> = {}) {
  const { outputText } = ts.transpileModule(composableSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const context = {
    exports: {} as any,
    require: (name: string) => {
      if (name === '~/utils/ads') return ads
      throw new Error(`Unexpected import: ${name}`)
    },
    computed: vue.computed,
    useRoute: () => ({ path, meta: {} }),
    useRuntimeConfig: () => ({
      public: { adsensePubId: 'ca-pub-test', adsenseSlots: SLOTS, ...config },
    }),
  }
  runInNewContext(outputText, context)
  const api = context.exports.useAds() as {
    pubId: string
    scriptAllowed: { value: boolean }
    canRender: (placement: string) => boolean
    slotIdFor: (placement: string) => string
  }
  return {
    ...api,
    rendered: PLACEMENTS.filter(placement => api.canRender(placement)),
    loader: adsenseLoaderScripts(api.pubId, api.scriptAllowed.value, true),
  }
}

describe('useAds: calculadoras con el interruptor apagado', () => {
  it('no carga el loader ni dibuja ninguna unidad, ni con todos los ids configurados', () => {
    for (const path of CALCULATORS) {
      for (const config of [{}, { adsTools: '' }, { adsTools: '0' }, { adsTools: 0 }]) {
        const state = useAdsAt(path, { ...config, adsenseSlots: { ...SLOTS, tools: 'tools' } })
        expect(state.scriptAllowed.value, path).toBe(false)
        expect(state.loader, path).toEqual([])
        expect(state.rendered, path).toEqual([])
      }
    }
  })
})

describe('useAds: calculadoras con el interruptor encendido', () => {
  it('carga el loader y dibuja exactamente una unidad: la de después del resultado', () => {
    for (const path of CALCULATORS) {
      // `1` llega como cadena si se horneó en el build y como número si lo pisó el runtime.
      for (const adsTools of ['1', 1, true]) {
        const state = useAdsAt(path, { adsTools })
        expect(state.scriptAllowed.value, path).toBe(true)
        expect(state.loader, path).toHaveLength(1)
        expect(state.rendered, path).toEqual(['after-tool'])
        expect(state.rendered.length, path).toBe(maxAdSlots('light'))
      }
    }
  })

  it('usa el id propio si existe y, si no, el del cierre', () => {
    const path = '/herramientas/calculadora-iva'
    expect(useAdsAt(path, { adsTools: '1' }).slotIdFor('after-tool')).toBe('close')
    const own = useAdsAt(path, { adsTools: '1', adsenseSlots: { ...SLOTS, tools: 'tools' } })
    expect(own.slotIdFor('after-tool')).toBe('tools')
    expect(own.rendered).toEqual(['after-tool'])
    // Sin ningún id no hay unidad (el loader sí: es lo mismo que en cualquier ruta light).
    const none = useAdsAt(path, { adsTools: '1', adsenseSlots: {} })
    expect(none.rendered).toEqual([])
    // Sin publisher, nada.
    const noPub = useAdsAt(path, { adsTools: '1', adsensePubId: '' })
    expect(noPub.loader).toEqual([])
    expect(noPub.rendered).toEqual([])
  })

  it('deja el índice y el resto del sitio exactamente como estaban', () => {
    for (const adsTools of ['', '1']) {
      expect(useAdsAt('/herramientas', { adsTools }).rendered).toEqual(['content-end'])
      expect(useAdsAt('/herramientas', { adsTools }).loader).toHaveLength(1)
      expect(useAdsAt('/dolar-hoy', { adsTools }).rendered).toEqual(['content-end'])
      expect(useAdsAt('/franquicia-aduana-uruguay', { adsTools }).rendered).toEqual([
        'content-end',
        'in-article',
        'sidebar',
      ])
      expect(useAdsAt('/contacto', { adsTools }).loader).toEqual([])
    }
  })
})

// ---------------------------------------------------------------------------------------------
// 3. Dónde va la unidad.
// ---------------------------------------------------------------------------------------------

describe('ToolShell: la unidad va después de la calculadora y antes de su explicación', () => {
  // Hasta el 2026-10-31 iba después de la explicación y de la advertencia. En el teléfono la
  // explicación cae debajo de la calculadora, así que casi nadie llegaba a la unidad (una impresión
  // cada diez vistas). Ahora va pegada a la calculadora entera —campos y resultado— y antes del
  // texto que la explica; nunca entre los campos y el resultado, que es lo que las sacó de Auto Ads.
  const shell = readSfc('components/ToolShell.vue')
  const root = elementChildren(shell.template!.ast as unknown as Node)[0]!
  const units = adSlots(root)
  const branches = elementChildren(root).filter(
    child => directive(child, 'if') === 'asideLayout' || hasDirective(child, 'else')
  )

  it('una unidad por diseño, la de las calculadoras, sólo en cliente', () => {
    expect(branches).toHaveLength(2)
    expect(units).toHaveLength(2)
    for (const branch of branches) {
      const own = adSlots(branch)
      expect(own).toHaveLength(1)
      expect(attr(own[0]!, 'placement')).toBe('after-tool')
      const wrapper = elements(branch).find(node => elementChildren(node).includes(own[0]!))
      expect(wrapper?.tag).toBe('ClientOnly')
    }
  })

  it('en cada diseño va después de la calculadora y antes de la explicación', () => {
    for (const branch of branches) {
      const order = elements(branch)
      const at = order.findIndex(node => node.tag === 'AdSlot')
      const calc = order.findIndex(node => node.tag === 'slot' && !attr(node, 'name'))
      const explainer = order.findIndex(
        node => node.tag === 'slot' && attr(node, 'name') === 'content'
      )
      expect(calc).toBeGreaterThan(-1)
      expect(explainer).toBeGreaterThan(-1)
      expect(at).toBeGreaterThan(calc)
      // En el diseño de columna, la explicación vive en la columna de al lado: después en el
      // documento, debajo en el teléfono.
      expect(at).toBeLessThan(explainer)
    }
  })

  it('ninguna unidad fuera de los dos diseños', () => {
    const outside = elementChildren(root)
      .filter(child => !branches.includes(child))
      .flatMap(adSlots)
    expect(outside).toEqual([])
  })
})

describe('las calculadoras: cada una recibe su única unidad', () => {
  const dir = resolve(__dirname, '../../pages/herramientas')
  const pages = readdirSync(dir).filter(file => file.endsWith('.vue') && file !== 'index.vue')

  it.each(pages)('%s', file => {
    const page = readSfc(`pages/herramientas/${file}`)
    const root = page.template!.ast as unknown as Node
    const usesShell = elements(root).some(node => node.tag === 'ToolShell')
    const own = adSlots(root)
    if (usesShell) {
      // La unidad la pone ToolShell; una propia sería la segunda.
      expect(own).toHaveLength(0)
      return
    }
    expect(own).toHaveLength(1)
    expect(attr(own[0]!, 'placement')).toBe('after-tool')
  })

  it('carrito-importacion la pone después del carrito y de su total', () => {
    const page = readSfc('pages/herramientas/carrito-importacion.vue')
    const nodes = elements(page.template!.ast as unknown as Node)
    const unit = nodes.findIndex(node => node.tag === 'AdSlot')
    const summary = nodes.findIndex(node => node.tag === 'ImportCartSummary')
    const lastField = nodes.map(node => node.tag).lastIndexOf('VTextField')
    expect(summary).toBeGreaterThan(-1)
    expect(unit).toBeGreaterThan(summary)
    expect(unit).toBeGreaterThan(lastField)
    // Fuera de la grilla del carrito: hija del contenedor de la página, no de una columna.
    const container = nodes.find(node => node.tag === 'VContainer')!
    const wrapper = elementChildren(container).find(child =>
      elementChildren(child).some(node => node.tag === 'AdSlot')
    )
    expect(wrapper?.tag).toBe('ClientOnly')
    expect(elementChildren(container).indexOf(wrapper!)).toBe(elementChildren(container).length - 1)
  })

  it('el índice no tiene unidad propia: sigue con el cierre del layout', () => {
    const index = readSfc('pages/herramientas/index.vue')
    expect(adSlots(index.template!.ast as unknown as Node)).toHaveLength(0)
  })
})

describe('el layout no suma una segunda unidad en las calculadoras', () => {
  it('su cierre existe, pero el composable lo apaga en estas rutas', () => {
    const layout = readSfc('layouts/default.vue')
    const placements = adSlots(layout.template!.ast as unknown as Node).map(node =>
      attr(node, 'placement')
    )
    expect(placements).toEqual(['content-end', 'sidebar'])
    const state = useAdsAt('/herramientas/calculadora-irpf', {
      adsTools: '1',
      adsenseSlots: { ...SLOTS, tools: 'tools' },
    })
    for (const placement of placements) expect(state.canRender(placement!), placement).toBe(false)
  })
})
