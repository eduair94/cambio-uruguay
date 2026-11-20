// @vitest-environment jsdom
// Los parches de ARIA de plugins/combobox-a11y.client.ts (utils/comboboxA11y.ts), contra Vuetify
// 4.2.2 de verdad y no contra la forma que tenía en 3.9. Medido el 19/11/2026: el parche viejo le
// sacaba el rol al <input> y lo dejaba como textbox con aria-expanded (axe aria-allowed-attr,
// crítico, 211 nodos en 64 páginas por perfil), y en el teléfono el envoltorio `role="combobox"`
// se tragaba el rótulo del orden de las tablas (empty-table-header). Las listas de enlaces de
// /sucursal salían `role="list"` sin un solo listitem (aria-required-children).
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createApp, createSSRApp, h, nextTick } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { afterEach, describe, expect, it } from 'vitest'
import { patchComboboxes, WRAPPER_COMBOBOX_ATTRS, watchComboboxes } from '../../utils/comboboxA11y'

const require = createRequire(import.meta.url)
const { createVuetify, components } = require('vuetify/dist/vuetify.js')
const APP = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(APP, path), 'utf8')

afterEach(() => {
  document.body.innerHTML = ''
})

// What Vuetify 4.2.2 renders for a VSelect on the server (captured from /historico/prex/usd).
const SELECT_FIXTURE = `
<div class="v-input v-select">
  <div class="v-field v-field--variant-outlined" role="combobox" aria-haspopup="listbox"
       aria-expanded="false" aria-controls="menu-v-0" aria-owns="menu-v-0">
    <div class="v-field__field">
      <label class="v-label v-field-label" id="input-v-1-label">Período</label>
      <div class="v-field__input" data-no-activator="">
        <input value="6 meses" size="1" role="combobox" type="text" id="input-v-1"
               aria-labelledby="input-v-1-label" aria-expanded="false" aria-controls="menu-v-0">
      </div>
    </div>
  </div>
</div>`

function mountFixture(html: string) {
  document.body.innerHTML = html
  return document.body
}

function countMutations(run: () => void): Promise<number> {
  return new Promise(resolveCount => {
    let count = 0
    const observer = new MutationObserver(records => (count += records.length))
    observer.observe(document.body, { subtree: true, childList: true, attributes: true })
    run()
    queueMicrotask(() => {
      count += observer.takeRecords().length
      observer.disconnect()
      resolveCount(count)
    })
  })
}

describe('patch 1: the input is the combobox, the wrapper is not', () => {
  it('keeps role and ARIA on the input and strips every combobox attribute from the wrapper', () => {
    const body = mountFixture(SELECT_FIXTURE)
    patchComboboxes(body)
    const input = body.querySelector('input')!
    const field = body.querySelector('.v-field')!
    expect(input.getAttribute('role')).toBe('combobox')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(input.getAttribute('aria-controls')).toBe('menu-v-0')
    expect(input.getAttribute('aria-labelledby')).toBe('input-v-1-label')
    for (const name of WRAPPER_COMBOBOX_ATTRS) expect(field.hasAttribute(name)).toBe(false)
    // Exactly one combobox left per select.
    expect(body.querySelectorAll('[role="combobox"]')).toHaveLength(1)
    // No element without a role keeps aria-expanded (the aria-allowed-attr violation).
    expect(body.querySelectorAll('[aria-expanded]:not([role])')).toHaveLength(0)
  })

  it('is idempotent: a second run mutates nothing', async () => {
    const body = mountFixture(SELECT_FIXTURE)
    patchComboboxes(body)
    const before = body.innerHTML
    expect(await countMutations(() => patchComboboxes(body))).toBe(0)
    expect(body.innerHTML).toBe(before)
  })

  it('finds the wrapper again after its role is gone, when the activator writes ARIA back', () => {
    const body = mountFixture(SELECT_FIXTURE)
    patchComboboxes(body)
    const field = body.querySelector('.v-field')!
    // What useActivator's bindProps does on every open/close (setAttribute, outside Vue's diff).
    field.setAttribute('aria-haspopup', 'listbox')
    field.setAttribute('aria-expanded', 'true')
    field.setAttribute('aria-controls', 'menu-v-0')
    field.setAttribute('aria-owns', 'menu-v-0')
    patchComboboxes(body)
    for (const name of WRAPPER_COMBOBOX_ATTRS) expect(field.hasAttribute(name)).toBe(false)
  })

  it('leaves a field whose input is not a combobox alone', () => {
    const body = mountFixture(
      `<div class="v-field" aria-describedby="hint"><input type="text" aria-expanded="false"></div>`
    )
    patchComboboxes(body)
    expect(body.querySelector('.v-field')!.getAttribute('aria-describedby')).toBe('hint')
    expect(body.querySelector('input')!.hasAttribute('role')).toBe(false)
  })

  it('leaves a plain combobox input outside a .v-field alone (search palette, reference address)', () => {
    const body = mountFixture(
      `<div class="search-palette"><input class="search-palette__input" role="combobox" aria-expanded="true" aria-controls="cu-search-listbox"></div>`
    )
    const before = body.innerHTML
    patchComboboxes(body)
    expect(body.innerHTML).toBe(before)
  })
})

describe('patch 1 against a real Vuetify 4 VSelect', () => {
  function stubBrowser() {
    const g = globalThis as any
    g.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    g.IntersectionObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    window.matchMedia ??= (() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    })) as any
    g.visualViewport ??= new EventTarget()
  }
  // The first <input> of a VSelect is the hidden one that carries the form value.
  const textInput = (root: ParentNode) =>
    root.querySelector<HTMLInputElement>('input[type="text"]')!

  async function mountSelect() {
    stubBrowser()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      data: () => ({ menu: false, value: 'a' }),
      render() {
        return h(components.VApp, null, () =>
          h(components.VSelect, {
            label: 'Período',
            items: ['a', 'b'],
            modelValue: this.value,
            menu: this.menu,
            'onUpdate:menu': (v: boolean) => (this.menu = v),
          })
        )
      },
    })
    app.use(createVuetify())
    const vm = app.mount(host) as any
    await nextTick()
    await new Promise(r => setTimeout(r, 0))
    return { app, vm, host }
  }

  it('renders role="combobox" on both the wrapper and the input, with aria-expanded on the input', async () => {
    const { app, host } = await mountSelect()
    const field = host.querySelector('.v-select .v-field')!
    const input = textInput(field)
    expect(field.getAttribute('role')).toBe('combobox')
    expect(input.getAttribute('role')).toBe('combobox')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    patchComboboxes(document)
    expect(field.hasAttribute('role')).toBe(false)
    expect(input.getAttribute('role')).toBe('combobox')
    app.unmount()
  })

  it('writes the wrapper ARIA back when the menu opens, so the observer must watch aria-expanded', async () => {
    const { app, vm, host } = await mountSelect()
    const field = host.querySelector('.v-select .v-field')!
    patchComboboxes(document)
    expect(field.hasAttribute('aria-expanded')).toBe(false)

    vm.menu = true
    await nextTick()
    await new Promise(r => setTimeout(r, 0))
    // No node was added or removed on the wrapper, yet its ARIA is back, without its role.
    expect(field.hasAttribute('role')).toBe(false)
    expect(field.getAttribute('aria-expanded')).toBe('true')
    expect(textInput(host).getAttribute('aria-expanded')).toBe('true')

    patchComboboxes(document)
    expect(field.hasAttribute('aria-expanded')).toBe(false)
    expect(textInput(host).getAttribute('role')).toBe('combobox')
    app.unmount()
  })
})

describe('watchComboboxes', () => {
  it('re-patches, coalesced to one frame, when only an attribute changes', async () => {
    mountFixture(SELECT_FIXTURE)
    const frames: Array<() => void> = []
    const stop = watchComboboxes(document, cb => frames.push(cb))
    const field = document.querySelector('.v-field')!
    expect(field.hasAttribute('aria-expanded')).toBe(false)

    field.setAttribute('aria-expanded', 'true')
    document.querySelector('input')!.setAttribute('aria-expanded', 'true')
    await Promise.resolve()
    expect(frames).toHaveLength(1)
    frames.shift()!()
    expect(field.hasAttribute('aria-expanded')).toBe(false)
    expect(document.querySelector('input')!.getAttribute('aria-expanded')).toBe('true')
    stop()
  })

  it('patches selects that mount later', async () => {
    document.body.innerHTML = '<main></main>'
    const frames: Array<() => void> = []
    const stop = watchComboboxes(document, cb => frames.push(cb))
    document.querySelector('main')!.innerHTML = SELECT_FIXTURE
    await Promise.resolve()
    frames.splice(0).forEach(f => f())
    expect(document.querySelector('.v-field')!.hasAttribute('role')).toBe(false)
    expect(document.querySelector('input')!.getAttribute('role')).toBe('combobox')
    stop()
  })
})

describe('patch 3: lists', () => {
  async function ssr(render: () => any) {
    const app = createSSRApp({ render })
    app.use(createVuetify())
    return renderToString(app)
  }

  it('Vuetify renders a list of links as role="list" with only role="link" children', async () => {
    const html = await ssr(() =>
      h(components.VList, null, () => [
        h(components.VListItem, { href: '/sucursal/a', title: 'A' }),
        h(components.VListItem, { href: '/sucursal/b', title: 'B' }),
      ])
    )
    const body = mountFixture(html)
    const list = body.querySelector('.v-list')!
    expect(list.getAttribute('role')).toBe('list')
    expect(list.getAttribute('tabindex')).toBe('0')
    expect(Array.from(list.children).map(c => c.getAttribute('role'))).toEqual(['link', 'link'])
    // The list is the only tab stop; its links are reached with the arrows (VListItem.js:251).
    expect(Array.from(list.children).map(c => c.getAttribute('tabindex'))).toEqual(['-2', '-2'])

    patchComboboxes(body)
    expect(list.getAttribute('role')).toBe('presentation')
    expect(list.getAttribute('tabindex')).toBe('-1')
    // The links keep their href and each one becomes a tab stop, or Tab would reach none of them.
    const links = Array.from(body.querySelectorAll<HTMLAnchorElement>('a[href]'))
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/sucursal/a', '/sucursal/b'])
    for (const a of links) expect(a.tabIndex).toBeGreaterThanOrEqual(0)
    expect(body.querySelectorAll('[tabindex="-2"]')).toHaveLength(0)
  })

  it('is idempotent on lists: a second run mutates nothing', async () => {
    const html = await ssr(() =>
      h(components.VList, null, () => [h(components.VListItem, { href: '/a', title: 'A' })])
    )
    const body = mountFixture(html)
    patchComboboxes(body)
    const before = body.innerHTML
    expect(await countMutations(() => patchComboboxes(body))).toBe(0)
    expect(body.innerHTML).toBe(before)
  })

  it('does not promote the items of a nested list that is not demoted', () => {
    const body = mountFixture(`
      <div class="v-list outer" role="list" tabindex="0">
        <a class="v-list-item" role="link" href="/a" tabindex="-2">
          <div class="v-list inner" role="listbox" tabindex="0">
            <div class="v-list-item" role="option" tabindex="-2"></div>
          </div>
        </a>
      </div>`)
    patchComboboxes(body)
    expect(body.querySelector('a')!.getAttribute('tabindex')).toBe('0')
    expect(body.querySelector('[role="option"]')!.getAttribute('tabindex')).toBe('-2')
  })

  it('never touches a selectable list: Vuetify makes it a listbox, and its items are options', async () => {
    const html = await ssr(() =>
      h(components.VList, { selectable: true }, () => [
        h(components.VListItem, { value: 'a', title: 'A' }),
        h(components.VListItem, { value: 'b', title: 'B' }),
      ])
    )
    const body = mountFixture(html)
    const list = body.querySelector('.v-list')!
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.querySelectorAll('[role="option"]')).toHaveLength(2)
    const before = body.innerHTML
    patchComboboxes(body)
    expect(body.innerHTML).toBe(before)
  })

  it('never touches a selectable list of links: it is a listbox, not role="list"', async () => {
    const html = await ssr(() =>
      h(components.VList, { selectable: true }, () => [
        h(components.VListItem, { value: 'a', href: '/a', title: 'A' }),
      ])
    )
    // Selectability, not the children, decides the role (VList.js:312), so the role="list" rule
    // cannot reach any listbox. (A listbox without options is the older rule's business.)
    const body = mountFixture(html)
    expect(body.querySelector('.v-list')!.getAttribute('role')).toBe('listbox')
    expect(body.querySelectorAll('.v-list[role="list"]')).toHaveLength(0)
    // The option-less listbox rule does demote it, and its links stay reachable with Tab too.
    patchComboboxes(body)
    expect(body.querySelector('.v-list')!.getAttribute('role')).toBe('presentation')
    for (const a of Array.from(body.querySelectorAll<HTMLAnchorElement>('a[href]')))
      expect(a.tabIndex).toBeGreaterThanOrEqual(0)
  })

  it('leaves a list that has real list items (or a mix) alone', async () => {
    const html = await ssr(() =>
      h(components.VList, null, () => [
        h(components.VListItem, { title: 'Sin datos' }),
        h(components.VListItem, { href: '/a', title: 'A' }),
      ])
    )
    const body = mountFixture(html)
    expect(
      Array.from(body.querySelector('.v-list')!.children).map(c => c.getAttribute('role'))
    ).toEqual(['listitem', 'link'])
    const before = body.innerHTML
    patchComboboxes(body)
    expect(body.innerHTML).toBe(before)
  })

  it('leaves an empty list alone', () => {
    const body = mountFixture('<div class="v-list" role="list" tabindex="0"></div>')
    patchComboboxes(body)
    expect(body.querySelector('.v-list')!.getAttribute('role')).toBe('list')
  })

  it('a role/tabindex passed to VList (and tabindex to its items) wins in the server HTML', async () => {
    // What pages/sucursal/[slug].vue renders: nothing for the plugin to repair.
    const html = await ssr(() =>
      h(components.VList, { role: 'presentation', tabindex: '-1' }, () => [
        h(components.VListItem, { href: '/a', title: 'A', tabindex: '0' }),
        h(components.VListItem, { href: '/b', title: 'B', tabindex: '0' }),
      ])
    )
    const body = mountFixture(html)
    const list = body.querySelector('.v-list')!
    expect(list.getAttribute('role')).toBe('presentation')
    expect(list.getAttribute('tabindex')).toBe('-1')
    const links = Array.from(body.querySelectorAll<HTMLAnchorElement>('a[href]'))
    expect(links).toHaveLength(2)
    for (const a of links) {
      expect(a.getAttribute('role')).toBe('link')
      expect(a.tabIndex).toBeGreaterThanOrEqual(0)
    }
    const before = body.innerHTML
    patchComboboxes(body)
    expect(body.innerHTML).toBe(before)
  })

  it('on a live Vuetify list, Vue keeps the promoted items and the watcher re-demotes the list', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      data: () => ({ title: 'A' }),
      render() {
        return h(components.VList, null, () => [
          h(components.VListItem, { href: '/a', title: this.title }),
          h(components.VListItem, { href: '/b', title: 'B' }),
        ])
      },
    })
    app.use(createVuetify())
    const vm = app.mount(host) as any
    await nextTick()
    const frames: Array<() => void> = []
    const stop = watchComboboxes(document, cb => frames.push(cb))
    const list = host.querySelector<HTMLElement>('.v-list')!
    const items = () =>
      Array.from(host.querySelectorAll('a[href]')).map(a => a.getAttribute('tabindex'))
    expect(list.getAttribute('role')).toBe('presentation')
    expect(items()).toEqual(['0', '0'])

    // A re-render of the items does not write their -2 back: the vnode value did not change.
    vm.title = 'A2'
    await nextTick()
    expect(host.textContent).toContain('A2')
    expect(items()).toEqual(['0', '0'])

    // Focus in and out: VList's isFocused flips and Vue writes tabindex 0 back on the list.
    const first = host.querySelector('a')!
    first.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await nextTick()
    first.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await nextTick()
    expect(list.getAttribute('tabindex')).toBe('0')
    await Promise.resolve()
    frames.splice(0).forEach(f => f())
    expect(list.getAttribute('role')).toBe('presentation')
    expect(list.getAttribute('tabindex')).toBe('-1')
    expect(items()).toEqual(['0', '0'])
    stop()
    app.unmount()
  })
})

describe('source wiring', () => {
  it('both link lists of /sucursal/<slug> are presentation in the server HTML', () => {
    const page = read('pages/sucursal/[slug].vue')
    const lists = page.match(/<VList\b[^>]*>/g) ?? []
    expect(lists).toHaveLength(2)
    for (const tag of lists) {
      expect(tag).toContain('role="presentation"')
      expect(tag).toContain('tabindex="-1"')
    }
    // With the list out of the Tab order, every link must be a tab stop of its own.
    const items = page.match(/<VListItem\b[^>]*>/g) ?? []
    expect(items).toHaveLength(2)
    for (const tag of items) expect(tag).toContain('tabindex="0"')
  })

  it('the plugin delegates to the tested util and no longer strips the input role', () => {
    const plugin = read('plugins/combobox-a11y.client.ts')
    expect(plugin).toContain("from '~/utils/comboboxA11y'")
    expect(plugin).toContain('watchComboboxes(document)')
    expect(plugin).toContain("nuxtApp.hook('app:mounted'")
    expect(plugin).not.toMatch(/removeAttribute\(['"]role['"]\)/)
  })
})
