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
function placementOf(node: any): string | undefined {
  return node.props?.find((prop: any) => prop.name === 'placement')?.value?.content
}
// The content-end region EXPLICITLY: the layout also carries the desktop rail
// (`placement="sidebar"`, adRail.test.ts) in its own <ClientOnly>, and "the
// first ClientOnly with an AdSlot" would silently start exercising whichever
// one comes first in template order.
const layoutRegion = elements(layout.descriptor.template!.ast).find(
  node =>
    node.tag === 'ClientOnly' &&
    node.children.some(
      (child: any) => child.tag === 'AdSlot' && placementOf(child) === 'content-end'
    )
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
  // The globals object IS the context, so a test can change a global after evaluation.
  const context = Object.assign(globals, {
    exports: {} as any,
    require: (name: string) => {
      if (name === 'vue') return vue
      throw new Error(`Unexpected import: ${name}`)
    },
  })
  runInNewContext(outputText, context)
  return context.exports
}

// Where the unit sits when AdSense answers. jsdom lays nothing out (every box is 0x0 at the top),
// so each test that collapses a unit says where it is: the rule depends on it.
const VIEWPORT = window.innerHeight
function placeUnit(container: HTMLElement, top: number, height = 300) {
  const unit = container.querySelector<HTMLElement>('.cu-ad')!
  vi.spyOn(unit, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 390,
    width: 390,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect)
}

// A page that loses the unit's height when it collapses. `anchoring` plays Chrome's scroll
// anchoring: laying the page out after a removal above the reader already scrolls by the loss
// (measured 2026-11-20 in Chrome, 300 of 300 px).
function scrollablePage(
  container: HTMLElement,
  { y, anchoring }: { y: number; anchoring: boolean }
) {
  const reserve = 280
  let scrollY = y
  let collapsed = false
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => {
      const present = Boolean(container.querySelector('.cu-ad'))
      if (!present && !collapsed) {
        collapsed = true
        if (anchoring) scrollY -= reserve
      }
      return present ? 5000 : 5000 - reserve
    },
  })
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
  const scrollBy = vi.fn((options: ScrollToOptions) => {
    scrollY += options.top ?? 0
  })
  ;(window as any).scrollBy = scrollBy
  return { scrollBy, reserve }
}

const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
  delete (window as any).adsbygoogle
  delete (window as any).scrollBy
  Reflect.deleteProperty(document.documentElement, 'scrollHeight')
  Reflect.deleteProperty(window, 'scrollY')
  vi.restoreAllMocks()
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
      readonly callback: (
        entries: Array<{ isIntersecting: boolean; boundingClientRect?: { top: number } }>
      ) => void,
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
    /** The observed box left the screen; `top` < 0 means it went out through the top. */
    leave(top: number) {
      this.callback([{ isIntersecting: false, boundingClientRect: { top } }])
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
  // Kept so a test can take the observer away, as in a browser without one.
  const globals: Record<string, unknown> = {
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
  }
  const adSlot = evaluate(slotScript, globals).default
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
  return { route, intersections, requests, answer, push, container, globals }
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

  it('collapses an immediate unfilled answer below the screen and retries only on the next page', async () => {
    const { answer, route, intersections, push, container } = mountLayout()
    answer.mockImplementationOnce(element => element.setAttribute('data-ad-status', 'unfilled'))
    placeUnit(container, VIEWPORT + 200)
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
    placeUnit(container, VIEWPORT + 50)
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

// The 2026-11-19 probe found scroll-phase shifts of exactly a unit's height (-407 / -390 px) on
// ten pages: an unfilled unit was removed while the reader was looking at what sat under it.
describe('giving back an unfilled unit without moving what the reader sees', () => {
  async function unfilledAt(top: number, page?: { y: number; anchoring: boolean }) {
    const mounted = mountLayout()
    const scroll = page ? scrollablePage(mounted.container, page) : null
    mounted.intersections[0].enter()
    await settle()
    placeUnit(mounted.container, top)
    mounted.requests[0].setAttribute('data-ad-status', 'unfilled')
    await settle()
    return { ...mounted, scroll }
  }

  it('keeps a unit the reader can see until it leaves the screen, then collapses it', async () => {
    const { container, intersections, scroll } = await unfilledAt(VIEWPORT - 200, {
      y: 1200,
      anchoring: false,
    })
    expect(container.querySelector('.cu-ad')).not.toBeNull()
    const away = intersections.at(-1)!
    expect(intersections).toHaveLength(2)
    expect(away.options.threshold).toBe(0)
    expect(away.element).toBe(container.querySelector('.cu-ad'))

    // The first report of an observer is the current state: still on screen, nothing happens.
    away.enter()
    await settle()
    expect(container.querySelector('.cu-ad')).not.toBeNull()

    // Out through the bottom: nothing visible is under it, so no scroll.
    away.leave(VIEWPORT + 10)
    await settle()
    expect(container.querySelector('.cu-ad')).toBeNull()
    expect(away.disconnect).toHaveBeenCalled()
    expect(scroll!.scrollBy).not.toHaveBeenCalled()
  })

  it('collapses at once a unit entirely below the screen, without scrolling', async () => {
    const { container, intersections, scroll } = await unfilledAt(VIEWPORT, {
      y: 0,
      anchoring: false,
    })
    expect(container.querySelector('.cu-ad')).toBeNull()
    expect(intersections).toHaveLength(1)
    expect(scroll!.scrollBy).not.toHaveBeenCalled()
  })

  it('collapses a unit above the screen and leaves the scroll to Chrome when it anchored', async () => {
    const { container, scroll } = await unfilledAt(-500, { y: 2500, anchoring: true })
    expect(container.querySelector('.cu-ad')).toBeNull()
    // Scrolling again on top of the browser's own anchoring moved the text a second time.
    expect(scroll!.scrollBy).not.toHaveBeenCalled()
    expect(window.scrollY).toBe(2500 - scroll!.reserve)
  })

  it('compensates a unit above the screen when the browser did not anchor', async () => {
    const { container, scroll } = await unfilledAt(-500, { y: 2500, anchoring: false })
    expect(container.querySelector('.cu-ad')).toBeNull()
    expect(scroll!.scrollBy).toHaveBeenCalledTimes(1)
    expect(scroll!.scrollBy).toHaveBeenCalledWith({ top: -scroll!.reserve, behavior: 'instant' })
  })

  it('compensates when a unit the reader was looking at leaves through the top', async () => {
    const { container, intersections, scroll } = await unfilledAt(100, {
      y: 2500,
      anchoring: false,
    })
    expect(container.querySelector('.cu-ad')).not.toBeNull()
    intersections.at(-1)!.leave(-320)
    await settle()
    expect(container.querySelector('.cu-ad')).toBeNull()
    expect(scroll!.scrollBy).toHaveBeenCalledWith({ top: -scroll!.reserve, behavior: 'instant' })
  })

  it('without IntersectionObserver collapses at once, as before', async () => {
    const mounted = mountLayout()
    mounted.intersections[0].enter()
    await settle()
    delete mounted.globals.IntersectionObserver
    placeUnit(mounted.container, VIEWPORT - 200)
    mounted.requests[0].setAttribute('data-ad-status', 'unfilled')
    await settle()
    expect(mounted.container.querySelector('.cu-ad')).toBeNull()
  })

  it('stops waiting when the reader leaves the page with the unit still on screen', async () => {
    const { container, intersections, route } = await unfilledAt(VIEWPORT - 200)
    const away = intersections.at(-1)!
    expect(container.querySelector('.cu-ad')).not.toBeNull()
    route.path = '/herramientas/calculadora-irpf'
    await settle()
    expect(away.disconnect).toHaveBeenCalled()
    expect(container.querySelector('.cu-ad')).toBeNull()
  })

  it('collapses once even when the answer is seen twice', async () => {
    const { answer, intersections, container } = mountLayout()
    answer.mockImplementationOnce(element => element.setAttribute('data-ad-status', 'unfilled'))
    placeUnit(container, VIEWPORT - 200)
    intersections[0].enter()
    await settle()
    // push() answered synchronously: the check after push() and the observer both saw it.
    expect(intersections).toHaveLength(2)
  })

  it('collapses the sticky rail at once: it never leaves the screen and has nothing under it', async () => {
    // The same evaluated AdSlot the layout uses, mounted on its own as the rail.
    const { intersections, globals, requests } = mountLayout()
    const adSlot = (globals.exports as { default: vue.Component }).default
    const rail = vue.createApp({ setup: () => () => vue.h(adSlot, { placement: 'sidebar' }) })
    rail.config.globalProperties.$t = (key: string) => key
    const host = document.createElement('div')
    document.body.append(host)
    rail.mount(host)
    apps.push(rail)
    const railObserver = intersections.at(-1)!
    railObserver.enter()
    await settle()
    placeUnit(host, 100, 600)
    requests.at(-1)!.setAttribute('data-ad-status', 'unfilled')
    await settle()
    expect(host.querySelector('.cu-ad')).toBeNull()
    expect(intersections.at(-1)).toBe(railObserver)
  })
})

describe('the unit box', () => {
  const css = slot.descriptor.styles
    .map(style => style.content)
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  // A fresh parse: compileScript above transforms the shared AST (the v-if root becomes an IF node).
  const template = parse(readFileSync(slot.filename, 'utf8')).descriptor.template!
  const root = template.ast!.children.find((node: any) => node.type === 1) as any

  function block(source: string, selector: string) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return source.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
  }
  function media(query: string) {
    const start = css.indexOf(`@media ${query}`)
    const open = css.indexOf('{', start)
    let depth = 0
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
    }
    return ''
  }

  it('is not a landmark: a div with the visible label and no aria-label', () => {
    expect(root.tag).toBe('div')
    expect(elements(root).filter((node: any) => node.tag === 'aside')).toEqual([])
    expect(
      elements(root)
        .flatMap((node: any) => node.props || [])
        .map((prop: any) => prop.loc.source)
    ).not.toContainEqual(expect.stringMatching(/aria-label|role=/))
    expect(
      elements(root).some(
        (node: any) => node.tag === 'span' && /cu-ad__label/.test(node.loc.source)
      )
    ).toBe(true)
  })

  // AdSense writes `min-height: 0px !important; height: auto !important` inline on the ins's
  // parents (axe samples, 2026-11-19). A pseudo-element cannot carry an inline style.
  it('reserves with a pseudo-element, not with a min-height AdSense can zero', () => {
    const before = block(css, '.cu-ad::before')
    expect(before).toMatch(/height:\s*var\(--cu-ad-reserve/)
    expect(before).toMatch(/grid-row:\s*1 \/ 3/)
    expect(block(css, '.cu-ad')).toMatch(/display:\s*grid/)
    expect(block(css, '.cu-ad')).toMatch(/grid-template-rows:\s*auto 1fr/)
    for (const placement of ['content-end', 'after-tool', 'in-article'])
      expect(css).not.toMatch(new RegExp(`\\.cu-ad--${placement}[^{]*\\{[^}]*min-height`))
  })

  it('never stretches the ins: AdSense keeps the height it gives it', () => {
    const ins = block(css, '.cu-ad :deep(.adsbygoogle)')
    expect(ins).toMatch(/grid-row:\s*2/)
    expect(ins).toMatch(/align-self:\s*start/)
    expect(ins).not.toMatch(/(?:^|[\s;])(?:min-)?height/)
  })

  it('keeps the reserved heights it had', () => {
    expect(block(css, '.cu-ad--content-end,\n.cu-ad--after-tool')).toMatch(
      /--cu-ad-reserve:\s*300px/
    )
    expect(block(css, '.cu-ad--in-article')).toMatch(/--cu-ad-reserve:\s*280px/)
    expect(media('(min-width: 960px)')).toMatch(/--cu-ad-reserve:\s*280px/)
    // The rail keeps its block box and fixed 300x600 ins (adRail.test.ts).
    expect(block(css, '.cu-ad--sidebar::before')).toMatch(/content:\s*none/)
  })
})

describe('editorial ad placements', () => {
  it.each(['adelanto-de-efectivo-tarjeta-de-credito', 'sala-vip-aeropuerto-uruguay'])(
    '%s reserves just one in-article unit plus the layout close',
    slug => {
      const page = readSfc(`pages/${slug}.vue`)
      const units = elements(page.descriptor.template!.ast).filter(node => node.tag === 'AdSlot')
      // `maxAdSlots` is the ceiling of units INSIDE the reading column. The desktop rail
      // (`placement="sidebar"`) is out of the column by construction — it takes a column of its
      // own, never a section break — so it does not spend the page's budget and is not counted.
      const layoutUnits = elements(layout.descriptor.template!.ast).filter(
        node => node.tag === 'AdSlot' && placementOf(node) !== 'sidebar'
      )
      expect(units).toHaveLength(1)
      expect(placementOf(units[0])).toBe('in-article')
      expect(units.length + layoutUnits.length).toBe(maxAdSlots(adDensityForPath(`/${slug}`)))
    }
  )
})
