// @vitest-environment jsdom
// AffiliateLink renderizado de verdad: sin URL configurada no deja ni un nodo; con URL, un enlace
// con rel="sponsored", el host impreso y el data-cta que el plugin de clics ya instrumenta.
import * as vue from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { affiliateLink } from '../../utils/affiliates'
import { compileComponent, evaluateComponent, registerStubs } from './helpers/sfc'

const source = compileComponent('components/AffiliateLink.vue', 'affiliate-link')

const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
})

function mount(
  overrides: Record<string, unknown>,
  props: Record<string, unknown> = { id: 'wise' }
) {
  const component = evaluateComponent(source, {
    useRoute: () => ({ path: '/en/guias/enviar-recibir-dinero-exterior' }),
    useAffiliates: () => ({
      linkFor: (id: string, content?: string) => affiliateLink(id, overrides, content),
    }),
  })
  const root = document.createElement('div')
  document.body.append(root)
  const app = vue.createApp(component, props)
  registerStubs(app)
  apps.push(app)
  app.mount(root)
  return root
}

describe('AffiliateLink', () => {
  it('renders nothing at all when no URL is configured', () => {
    const root = mount({})
    expect(root.innerHTML).toBe('<!--v-if-->')
  })

  it('renders a sponsored, attributed link with its host when the URL is configured', () => {
    const root = mount({ wise: 'https://wise.com/invite/u/abc' })
    const a = root.querySelector('a')!
    expect(a).not.toBeNull()
    expect(a.getAttribute('rel')).toBe('noopener noreferrer sponsored')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.dataset.cta).toBe('affiliate-wise')
    const href = new URL(a.getAttribute('href')!)
    expect(href.searchParams.get('utm_medium')).toBe('affiliate')
    // La ruta sin el prefijo de locale: la cuenta se abrió desde la misma guía en cualquier idioma.
    expect(href.searchParams.get('utm_content')).toBe('/guias/enviar-recibir-dinero-exterior')
    expect(root.textContent).toContain('Abrir una cuenta en Wise')
    expect(root.textContent).toContain('wise.com')
  })

  it('lets the page override the label but never the destination', () => {
    const root = mount({ wise: 'https://wise.com/x' }, { id: 'wise', label: 'Ver Wise' })
    expect(root.textContent).toContain('Ver Wise')
    expect(root.querySelector('a')!.getAttribute('href')).toContain('https://wise.com/x')
  })
})
