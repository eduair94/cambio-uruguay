// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adDensityForPath, maxAdSlots, normalizeAdPath } from '../../utils/ads'

function readSfc(path: string) {
  const filename = resolve(__dirname, '../..', path)
  return { filename, ...parse(readFileSync(filename, 'utf8'), { filename }) }
}

function elements(node: any): any[] {
  return [node, ...(node.children || []).flatMap(elements)]
}

const slot = readSfc('components/AdSlot.vue')
const slotScript = compileScript(slot.descriptor, {
  id: 'ad-slot-lifecycle',
  inlineTemplate: true,
}).content
const layout = readSfc('layouts/default.vue')
// Render the actual layout's ad region, including its key and home exclusion.
// No Nuxt server, account, Google loader or ad requests enter these tests.
const layoutRegion = elements(layout.descriptor.template!.ast).find(
  node => node.tag === 'ClientOnly' && node.children.some((child: any) => child.tag === 'AdSlot')
)
const layoutRender = compileTemplate({
  source: layoutRegion.loc.source,
  filename: layout.filename,
  id: 'layout-ad-region',
}).code

function evaluate(source: string, globals: Record<string, unknown> = {}) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const context = {
    exports: {} as any,
    require: (name: string) => {
      if (name === 'vue') return vue
      throw new Error(`Unexpected import: ${name}`)
    },
    ...globals,
  }
  runInNewContext(outputText, context)
  return context.exports
}

const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
  delete (window as any).adsbygoogle
})

async function settle() {
  await vue.nextTick()
  await vue.nextTick()
  // Let the browser's real MutationObserver deliver its microtask too.
  await Promise.resolve()
  await vue.nextTick()
}

function mountLayout(path = '/franquicia-aduana-uruguay') {
  const route = vue.reactive({ path, fullPath: path })
  const intersections: FakeIntersectionObserver[] = []
  class FakeIntersectionObserver {
    element?: Element
    disconnect = vi.fn()
    constructor(
      readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void,
      readonly options: IntersectionObserverInit
    ) {
      intersections.push(this)
    }
    observe(element: Element) {
      this.element = element
    }
    enter() {
      this.callback([{ isIntersecting: true }])
    }
  }
  const requests: HTMLElement[] = []
  const answer = vi.fn<(element: HTMLElement) => void>()
  const push = vi.fn(() => {
    const element = document.querySelector<HTMLElement>('ins.adsbygoogle')!
    requests.push(element)
    answer(element)
  })
  ;(window as any).adsbygoogle = { push }
  const adSlot = evaluate(slotScript, {
    ...vue,
    window,
    IntersectionObserver: FakeIntersectionObserver,
    MutationObserver: window.MutationObserver,
    useAds: () => ({
      pubId: 'ca-pub-test',
      canRender: (placement: string) => {
        const density = adDensityForPath(route.path)
        return density !== 'none' && (placement !== 'in-article' || density === 'normal')
      },
      slotIdFor: () => 'test-slot',
    }),
  }).default
  const app = vue.createApp({
    setup: () => ({ route, normalizeAdPath }),
    render: evaluate(layoutRender).render,
  })
  app.component('AdSlot', adSlot)
  app.component('ClientOnly', {
    setup:
      (_props, { slots }) =>
      () =>
        slots.default?.(),
  })
  app.config.globalProperties.$t = (key: string) => key
  const container = document.createElement('div')
  document.body.append(container)
  app.mount(container)
  apps.push(app)
  return { route, intersections, requests, answer, push, container }
}

describe('manual ads across actual layout navigation', () => {
  it('loads lazily after entering an allowed page from an ad-free page', async () => {
    const { route, intersections, push, container } = mountLayout('/contacto')
    expect(intersections).toHaveLength(0)
    expect(container.querySelector('.cu-ad')).toBeNull()

    route.path = '/franquicia-aduana-uruguay'
    await settle()
    expect(intersections).toHaveLength(1)
    expect(intersections[0].options.rootMargin).toBe('400px 0px')
    expect(push).not.toHaveBeenCalled()
    intersections[0].enter()
    await settle()
    expect(push).toHaveBeenCalledTimes(1)
    expect(container.querySelector('ins')?.dataset.cuPushed).toBe('1')
    expect(document.querySelector('script')).toBeNull()
  })

  it('gives a newly visited article its own unit, but keeps filters and anchors on the same one', async () => {
    const { route, intersections, requests, push } = mountLayout()
    intersections[0].enter()
    await settle()
    const first = requests[0]
    route.fullPath = `${route.path}?modo=detalle#requisitos`
    await settle()
    expect(intersections).toHaveLength(1)
    expect(push).toHaveBeenCalledTimes(1)
    expect(first.isConnected).toBe(true)

    route.path = '/alquilar-en-uruguay'
    await settle()
    expect(first.isConnected).toBe(false)
    expect(intersections).toHaveLength(2)
    expect(push).toHaveBeenCalledTimes(1)
    intersections[1].enter()
    await settle()
    expect(push).toHaveBeenCalledTimes(2)
    expect(requests[1]).not.toBe(first)
  })

  it('collapses an immediate unfilled answer and retries only on the next page', async () => {
    const { answer, route, intersections, push, container } = mountLayout()
    answer.mockImplementationOnce(element => element.setAttribute('data-ad-status', 'unfilled'))
    intersections[0].enter()
    await settle()
    expect(container.querySelector('.cu-ad')).toBeNull()
    expect(push).toHaveBeenCalledTimes(1)

    route.path = '/alquilar-en-uruguay'
    await settle()
    expect(container.querySelector('.cu-ad')).not.toBeNull()
    expect(push).toHaveBeenCalledTimes(1)
    intersections[1].enter()
    await settle()
    expect(push).toHaveBeenCalledTimes(2)
  })

  it('observes a later unfilled answer and removes ads when leaving for an excluded page', async () => {
    const { requests, route, intersections, push, container } = mountLayout()
    intersections[0].enter()
    await settle()
    requests[0].setAttribute('data-ad-status', 'unfilled')
    await settle()
    expect(container.querySelector('.cu-ad')).toBeNull()

    route.path = '/alquilar-en-uruguay'
    await settle()
    route.path = '/herramientas/calculadora-irpf'
    await settle()
    expect(intersections[1].disconnect).toHaveBeenCalled()
    expect(container.querySelector('.cu-ad')).toBeNull()
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('keeps the home layout ad-free, including after a reader leaves an article', async () => {
    const { route, intersections, container } = mountLayout('/')
    expect(intersections).toHaveLength(0)
    route.path = '/alquilar-en-uruguay'
    await settle()
    expect(intersections).toHaveLength(1)
    route.path = '/'
    await settle()
    expect(intersections[0].disconnect).toHaveBeenCalled()
    expect(container.querySelector('.cu-ad')).toBeNull()
  })
})

describe('editorial ad placements', () => {
  it.each(['adelanto-de-efectivo-tarjeta-de-credito', 'sala-vip-aeropuerto-uruguay'])(
    '%s reserves just one in-article unit plus the layout close',
    slug => {
      const page = readSfc(`pages/${slug}.vue`)
      const units = elements(page.descriptor.template!.ast).filter(node => node.tag === 'AdSlot')
      const layoutUnits = elements(layout.descriptor.template!.ast).filter(
        node => node.tag === 'AdSlot'
      )
      expect(units).toHaveLength(1)
      expect(units[0].props.find((prop: any) => prop.name === 'placement')?.value.content).toBe(
        'in-article'
      )
      expect(units.length + layoutUnits.length).toBe(maxAdSlots(adDensityForPath(`/${slug}`)))
    }
  )
})
