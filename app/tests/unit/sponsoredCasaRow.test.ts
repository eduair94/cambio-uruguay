// @vitest-environment jsdom
// La fila patrocinada de la home: con `sponsorships.homeRow` vacío no deja ni un nodo (el DOM de
// la home es byte a byte el de hoy), y con un patrocinador es un bloque APARTE del ranking, que
// nunca entra a `topExchanges` ni lo reordena — "el orden lo determina siempre el precio".
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveSponsoredRow, type Sponsorship } from '../../utils/sponsorships'
import { compileComponent, evaluateComponent, registerStubs } from './helpers/sfc'

const REGISTRY: readonly Sponsorship[] = [
  {
    id: 'cambio-prueba',
    name: 'Cambio Prueba',
    tagline: 'Dólar sin comisión en Ciudad Vieja',
    url: 'https://www.cambioprueba.test/promo?ref=1',
    origin: 'prueba',
  },
]

describe('resolveSponsoredRow (pure)', () => {
  it('is null with no id, an unknown id, a non-string id or a non-http URL', () => {
    expect(resolveSponsoredRow('', 'home-after-rates', REGISTRY)).toBeNull()
    expect(resolveSponsoredRow(undefined, 'home-after-rates', REGISTRY)).toBeNull()
    expect(resolveSponsoredRow(7, 'home-after-rates', REGISTRY)).toBeNull()
    expect(resolveSponsoredRow('otro', 'home-after-rates', REGISTRY)).toBeNull()
    expect(
      resolveSponsoredRow('x', 'home-after-rates', [
        { id: 'x', name: 'X', tagline: 't', url: 'javascript:void(0)' },
      ])
    ).toBeNull()
    // El registro real está vacío hasta que haya un patrocinio firmado: cualquier id da null.
    expect(resolveSponsoredRow('cambio-prueba', 'home-after-rates')).toBeNull()
  })

  it('builds the attributed link and the printed host for a registered sponsor', () => {
    const row = resolveSponsoredRow(' cambio-prueba ', 'home-after-rates', REGISTRY)!
    expect(row.name).toBe('Cambio Prueba')
    expect(row.host).toBe('cambioprueba.test')
    expect(row.origin).toBe('prueba')
    const url = new URL(row.href)
    expect(url.searchParams.get('ref')).toBe('1')
    expect(url.searchParams.get('utm_source')).toBe('cambio-uruguay')
    expect(url.searchParams.get('utm_medium')).toBe('sponsored')
    expect(url.searchParams.get('utm_campaign')).toBe('cambio-prueba')
    expect(url.searchParams.get('utm_content')).toBe('home-after-rates')
  })
})

const source = compileComponent('components/SponsoredCasaRow.vue', 'sponsored-casa-row')

const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
})

function mount(configuredId: string) {
  const observers: FakeIntersectionObserver[] = []
  class FakeIntersectionObserver {
    disconnected = false
    // Como el de verdad: después de `disconnect()` no entrega más entradas.
    disconnect = vi.fn(() => {
      this.disconnected = true
    })
    constructor(
      readonly callback: (
        entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>
      ) => void
    ) {
      observers.push(this)
    }
    observe() {}
    enter(ratio = 1) {
      if (this.disconnected) return
      this.callback([{ isIntersecting: true, intersectionRatio: ratio }])
    }
  }
  const track = vi.fn()
  const component = evaluateComponent(source, {
    IntersectionObserver: FakeIntersectionObserver,
    useRoute: () => ({ path: '/' }),
    useLocalePath: () => (to: string) => to,
    useTrack: () => track,
    useSponsorships: () => ({
      homeRow: vue.computed(() => resolveSponsoredRow(configuredId, 'home-after-rates', REGISTRY)),
    }),
  })
  const root = document.createElement('div')
  document.body.append(root)
  const app = vue.createApp(component)
  registerStubs(app)
  apps.push(app)
  app.mount(root)
  return { root, observers, track }
}

describe('SponsoredCasaRow', () => {
  it('renders NOTHING when runtime config names no sponsor', () => {
    const { root, observers, track } = mount('')
    expect(root.innerHTML).toBe('<!--v-if-->')
    expect(observers).toHaveLength(0)
    expect(track).not.toHaveBeenCalled()
  })

  it('renders nothing for an id that is not in the registry', () => {
    const { root } = mount('cualquier-cosa')
    expect(root.innerHTML).toBe('<!--v-if-->')
  })

  it('renders a labelled, sponsored, attributed block when a sponsor is configured', () => {
    const { root, observers, track } = mount('cambio-prueba')
    const aside = root.querySelector('aside')!
    expect(aside).not.toBeNull()
    expect(aside.classList.contains('on-dark')).toBe(true)
    expect(aside.getAttribute('aria-label')).toBe('ads.label')
    expect(aside.dataset.sponsor).toBe('cambio-prueba')
    // La etiqueta visible, además del aria-label.
    expect(aside.querySelector('.sponsored-row__label')!.textContent).toBe('ads.label')
    expect(root.textContent).toContain('Cambio Prueba')
    expect(root.textContent).toContain('cambioprueba.test')

    const link = aside.querySelector('a.sponsored-row__link')!
    expect(link.getAttribute('rel')).toBe('noopener noreferrer sponsored')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('data-cta')).toBe('sponsored-home')
    expect(link.getAttribute('href')).toContain('utm_medium=sponsored')
    // El enlace a la política es visible y va a /publicidad.
    expect(aside.querySelector('a.sponsored-row__policy')!.getAttribute('href')).toBe('/publicidad')

    // La vista se cuenta una sola vez, al 50 % visible, con metadatos propios (nunca utm_*).
    expect(observers).toHaveLength(1)
    observers[0]!.enter(0.2)
    expect(track).not.toHaveBeenCalled()
    observers[0]!.enter(1)
    observers[0]!.enter(1)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('sponsored_row_view', {
      content_path: '/',
      promo_placement: 'home-after-rates',
      sponsor_id: 'cambio-prueba',
    })
    expect(observers[0]!.disconnect).toHaveBeenCalled()
  })
})

describe('the home mounts it OUTSIDE the ranking', () => {
  const home = readFileSync(resolve(__dirname, '../../pages/index.vue'), 'utf8')

  it('is a sibling of ConLaTuyaBanner, after the Top Exchange Houses section closes', () => {
    const loop = home.indexOf('v-for="(exchange, i) in topExchanges"')
    const mountAt = home.indexOf('<SponsoredCasaRow')
    expect(loop).toBeGreaterThan(-1)
    expect(mountAt).toBeGreaterThan(loop)
    // Entre el v-for del ranking y la fila se cierra la sección del ranking: la fila no está
    // dentro de la grilla ni dentro del v-for.
    expect(home.slice(loop, mountAt)).toContain('</section>')
    expect(home.slice(loop, mountAt)).toContain('<ConLaTuyaBanner />')
    // Una sola vez.
    expect(home.match(/<SponsoredCasaRow/g)).toHaveLength(1)
  })

  it('never touches topExchanges: the ranking is computed without any sponsorship input', () => {
    const script = home.slice(home.indexOf('<script setup'))
    expect(script).not.toMatch(/sponsor/i)
    expect(script).not.toContain('useSponsorships')
  })
})
