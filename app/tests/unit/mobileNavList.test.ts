// @vitest-environment jsdom
// El menú del teléfono, en marcado plano (19/11/2026, 390 px). Era un VList con 12 VListGroup y 263
// VListItem: el primer toque en la hamburguesa armaba ~1.000 instancias (288 ms de mediana sin
// frenar la CPU, 5,6 s a 4x) y cada hover/apertura/cierre posterior las volvía a dibujar todas;
// además la cabecera «Menu» salía como `role="listitem"` huérfano (axe aria-required-parent en 70
// de 72 páginas) y las etiquetas se cortaban con puntos suspensivos.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NAV_SECTIONS } from '../../utils/siteNav'
import { createSpaLinkHandler } from '../../utils/spaLinks'

const APP = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(APP, path), 'utf8')

const filename = resolve(APP, 'components/MobileNavList.vue')
const source = readFileSync(filename, 'utf8')
const { descriptor } = parse(source, { filename })
const { outputText } = ts.transpileModule(
  compileScript(descriptor, { id: 'mobile-nav-list', inlineTemplate: true }).content,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
)

const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
})

const stub = (tag: string, attrs: Record<string, string> = {}) =>
  vue.defineComponent({
    inheritAttrs: false,
    setup:
      (_props, { attrs: passed }) =>
      () =>
        vue.h(tag, { ...attrs, ...passed }),
  })

function mountMenu(path: string, { prefix = '' } = {}) {
  const route = vue.reactive({ path })
  const navigateTo = vi.fn()
  const context = {
    ...vue,
    exports: {} as { default?: vue.Component },
    require(name: string) {
      if (name === 'vue') return vue
      if (name === '~/utils/siteNav') return { NAV_SECTIONS }
      if (name === '~/utils/spaLinks') return { createSpaLinkHandler }
      throw new Error(`Unexpected import: ${name}`)
    },
    useI18n: () => ({ t: (key: string) => key }),
    useLocalePath: () => (to: string) => (prefix ? (to === '/' ? prefix : prefix + to) : to),
    useRoute: () => route,
    navigateTo,
  }
  runInNewContext(outputText, context)
  const close = vi.fn()
  const search = vi.fn((event: MouseEvent) => event.preventDefault())
  const app = vue.createApp(context.exports.default!, {
    searchHref: `${prefix}/buscar`,
    onClose: close,
    onSearch: search,
  })
  app.component('ThemeToggle', stub('button', { 'data-testid': 'theme-toggle' }))
  app.component('VBtn', stub('button'))
  app.component('VDivider', stub('hr'))
  const container = document.createElement('div')
  document.body.append(container)
  app.mount(container)
  apps.push(app)
  return { root: container, route, navigateTo, close, search }
}

const click = (el: Element) => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
  el.dispatchEvent(event)
  return event
}
const current = (root: Element) =>
  [...root.querySelectorAll('a[aria-current]')].map(a => a.getAttribute('href'))
const internalEntries = NAV_SECTIONS.flatMap(s => s.entries).filter(e => e.to)

describe('el menú del teléfono, sin componentes de lista de Vuetify', () => {
  it('ni el componente ni el cajón del layout usan VList, VListItem ni VListGroup', () => {
    const template = descriptor.template!.content
    expect(template).not.toMatch(/<v-?list/i)
    const layout = read('layouts/default.vue')
    const drawer = layout.slice(
      layout.indexOf('<VNavigationDrawer'),
      layout.indexOf('</VNavigationDrawer>')
    )
    expect(drawer).not.toContain('<VList')
    expect(drawer).toMatch(/<MobileNavList\s+v-if="drawerContentReady"/)
    expect(layout).not.toContain('openGroups')
  })

  it('el cajón conserva su etiqueta: navigationSsr y el link_area «drawer» dependen de ella', () => {
    const layout = read('layouts/default.vue')
    expect(layout).toContain('class="mobile-navigation-drawer"')
    expect(layout).toContain('id="mobile-navigation"')
  })

  it('la cabecera lleva el ThemeToggle (SiteTour busca su data-testid) y el botón de cerrar', () => {
    const { root, close } = mountMenu('/')
    const header = root.querySelector('.mobile-nav__header')!
    expect(header.textContent).toContain('Menu')
    expect(header.querySelector('[data-testid="theme-toggle"]')).not.toBeNull()
    const closeButton = header.querySelector('button[aria-label="a11y.close"]')!
    click(closeButton)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('ningún elemento reclama role="listitem" ni role="option"', () => {
    const { root } = mountMenu('/')
    expect(root.querySelectorAll('[role]')).toHaveLength(0)
    // Los <li> están dentro de un <ul>: la lista nativa es la que tiene padre.
    for (const li of root.querySelectorAll('li')) expect(li.parentElement!.tagName).toBe('UL')
  })

  it('cada sección se abre con un <button> que dice si está abierta y qué controla', () => {
    const { root } = mountMenu('/')
    const toggles = [...root.querySelectorAll('.mobile-nav__toggle')]
    expect(toggles).toHaveLength(NAV_SECTIONS.length)
    for (const toggle of toggles) {
      expect(toggle.tagName).toBe('BUTTON')
      expect(toggle.getAttribute('type')).toBe('button')
      expect(toggle.getAttribute('aria-expanded')).toMatch(/^(true|false)$/)
      const list = root.querySelector(`#${toggle.getAttribute('aria-controls')}`)!
      expect(list.tagName).toBe('UL')
      expect(list.hasAttribute('hidden')).toBe(toggle.getAttribute('aria-expanded') === 'false')
    }
  })

  it('todos los enlaces están en el DOM aunque su sección esté cerrada', () => {
    const { root } = mountMenu('/')
    const total = NAV_SECTIONS.reduce((n, s) => n + s.entries.length, 0)
    expect(root.querySelectorAll('.mobile-nav__list a[href]')).toHaveLength(total)
    for (const route of ['/mapa', '/estado', '/prestamos-uruguay', '/dolar/records'])
      expect(root.querySelectorAll(`a[href="${route}"]`)).toHaveLength(1)
  })

  it('en la portada, sin sección dueña de la ruta, abre «market» como antes', () => {
    const { root } = mountMenu('/')
    expect(root.querySelector('#mobile-nav-market')!.hasAttribute('hidden')).toBe(false)
    const open = [...root.querySelectorAll('.mobile-nav__list:not([hidden])')].map(ul => ul.id)
    expect(open).toEqual(['mobile-nav-market'])
    // La portada es `exact`: es la actual sólo en la portada.
    expect(current(root)).toEqual(['/'])
  })

  it('en /dolar-hoy hay exactamente un enlace actual, y la portada no lo es', () => {
    const { root } = mountMenu('/dolar-hoy')
    expect(current(root)).toEqual(['/dolar-hoy'])
    expect(root.querySelector('a[href="/dolar-hoy"]')!.getAttribute('aria-current')).toBe('page')
  })

  it('una página hija marca a su página madre como `true`, no como `page`', () => {
    const parent = internalEntries.find(
      e => e.to !== '/' && !internalEntries.some(o => o.to !== e.to && o.to!.startsWith(`${e.to}/`))
    )!
    const { root } = mountMenu(`${parent.to}/alguna-hija`)
    expect(current(root)).toEqual([parent.to])
    expect(root.querySelector(`a[href="${parent.to}"]`)!.getAttribute('aria-current')).toBe('true')
  })

  it('un prefijo sin borde de segmento no cuenta: /dolar-hoy-x no es /dolar-hoy', () => {
    const { root } = mountMenu('/dolar-hoy-x')
    expect(current(root)).toEqual([])
  })

  it('con prefijo de idioma, /en/dolar-hoy marca su enlace y no la portada /en', () => {
    const { root } = mountMenu('/en/dolar-hoy', { prefix: '/en' })
    expect(current(root)).toEqual(['/en/dolar-hoy'])
  })

  it('abre la sección dueña de la ruta y conserva la que la persona abrió', async () => {
    const { root, route } = mountMenu('/dolar-hoy')
    const owner = NAV_SECTIONS.find(s => s.entries.some(e => e.to === '/dolar-hoy'))!.id
    const other = NAV_SECTIONS.find(s => s.id !== owner)!
    const otherToggle = root.querySelector(`#mobile-nav-toggle-${other.id}`)!
    expect(otherToggle.getAttribute('aria-expanded')).toBe('false')
    click(otherToggle)
    await vue.nextTick()
    expect(otherToggle.getAttribute('aria-expanded')).toBe('true')
    expect(root.querySelector(`#mobile-nav-${other.id}`)!.hasAttribute('hidden')).toBe(false)

    const third = NAV_SECTIONS.find(s => s.id !== owner && s.id !== other.id && s.id !== 'market')!
    route.path = third.entries.find(e => e.to)!.to!
    await vue.nextTick()
    for (const id of [owner, other.id, third.id])
      expect(root.querySelector(`#mobile-nav-${id}`)!.hasAttribute('hidden'), id).toBe(false)

    click(otherToggle)
    await vue.nextTick()
    expect(otherToggle.getAttribute('aria-expanded')).toBe('false')
    expect(root.querySelector(`#mobile-nav-${other.id}`)!.hasAttribute('hidden')).toBe(true)
  })

  it('un enlace interno cierra el cajón y navega del lado del cliente con UN solo listener', () => {
    const { root, navigateTo, close } = mountMenu('/')
    const event = click(root.querySelector('a[href="/dolar-hoy"] .mobile-nav__label')!)
    expect(event.defaultPrevented).toBe(true)
    expect(close).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledWith('/dolar-hoy')
  })

  it('un clic con modificador queda nativo (pestaña nueva)', () => {
    const { root, navigateTo } = mountMenu('/')
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    root.querySelector('a[href="/dolar-hoy"]')!.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('la búsqueda pasa el evento al layout, que abre la paleta; el delegado no navega', () => {
    const { root, navigateTo, search } = mountMenu('/')
    const link = root.querySelector('a[href="/buscar"]')!
    const event = click(link)
    expect(search).toHaveBeenCalledTimes(1)
    expect(search.mock.calls[0]![0]).toBe(event)
    expect(event.defaultPrevented).toBe(true)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('los externos abren en otra pestaña y cierran el cajón sin navegar', () => {
    const external = NAV_SECTIONS.flatMap(s => s.entries).find(e => e.href)
    if (!external) return
    const { root, navigateTo, close } = mountMenu('/')
    const link = root.querySelector(`a[href="${external.href}"]`)!
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    const event = click(link)
    expect(event.defaultPrevented).toBe(false)
    expect(close).toHaveBeenCalledTimes(1)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('cada ícono es una clase mdi fija de siteNav, decorativa', () => {
    const { root } = mountMenu('/')
    const icons = [...root.querySelectorAll('.mobile-nav__list .mobile-nav__icon')]
    expect(icons).toHaveLength(NAV_SECTIONS.reduce((n, s) => n + s.entries.length, 0))
    for (const icon of icons) {
      expect(icon.getAttribute('aria-hidden')).toBe('true')
      expect(icon.className).toMatch(/(?:^|\s)mdi(?:\s|$)/)
      expect(icon.className).toMatch(/(?:^|\s)mdi-[a-z0-9-]+(?:\s|$)/)
    }
  })

  it('filas de 48 px y etiquetas que se parten en vez de cortarse con «…»', () => {
    const css = descriptor.styles.map(s => s.content).join('\n')
    expect(css).toMatch(/\.mobile-nav__row \{[^}]*min-height: 48px;/)
    expect(css).toMatch(/\.mobile-nav__label \{[^}]*white-space: normal;/)
    expect(css).not.toMatch(/text-overflow:\s*ellipsis|white-space:\s*nowrap/)
    // Colores del tema, no fijos: el cajón cambia con el modo claro/oscuro.
    expect(css).toContain('rgba(var(--v-theme-on-surface)')
  })
})
