// El registro de afiliados, con la misma disciplina que pressMentions.test.ts: ids únicos,
// rutas que existen en disco, avisos no vacíos, y la regla central — sin URL configurada no
// hay enlace.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AFFILIATES,
  affiliateConfigKey,
  affiliateLink,
  affiliatesFor,
  buildAffiliateUrl,
  getAffiliate,
  resolveAffiliateUrl,
} from '../../utils/affiliates'
import { hostnameOf, withUtm } from '../../utils/outboundUtm'
import { guides } from '../../utils/guides'

const PAGES_DIR = resolve(__dirname, '../../pages')

describe('affiliates registry', () => {
  it('has unique kebab-case ids and complete entries', () => {
    const ids = AFFILIATES.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of AFFILIATES) {
      expect(a.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(a.partner.trim()).not.toBe('')
      expect(a.label.trim()).not.toBe('')
      expect(a.pages.length).toBeGreaterThan(0)
    }
  })

  it('ships the three agreed ids', () => {
    expect(AFFILIATES.map(a => a.id).sort()).toEqual(['payoneer', 'seguro-viaje', 'wise'])
  })

  it('never carries a fallback URL: the link only exists with an agreement in the environment', () => {
    // El repo es público: un enlace de afiliado versionado es media credencial. Y un bloque
    // "recomendado" sin acuerdo detrás es una recomendación que nadie firmó.
    for (const a of AFFILIATES) expect(a.fallbackUrl, a.id).toBe('')
  })

  it('tells the reader what we earn, next to the link', () => {
    for (const a of AFFILIATES) {
      expect(a.disclosure.length, a.id).toBeGreaterThan(40)
      expect(a.disclosure, a.id).toMatch(/comisi[óo]n/i)
    }
  })

  it('only targets pages that exist in the repo', () => {
    for (const a of AFFILIATES) {
      for (const page of a.pages) {
        expect(page.startsWith('/'), `${a.id}: "${page}" no es una ruta`).toBe(true)
        if (page.startsWith('/guias/')) {
          expect(
            guides.some(g => g.slug === page.slice('/guias/'.length)),
            `${a.id}: no existe la guía ${page}`
          ).toBe(true)
          continue
        }
        const asFile = resolve(PAGES_DIR, `${page.slice(1)}.vue`)
        const asIndex = resolve(PAGES_DIR, page.slice(1), 'index.vue')
        expect(existsSync(asFile) || existsSync(asIndex), `${a.id}: no existe ${page}`).toBe(true)
      }
    }
  })

  it('every affiliateId a guide declares exists in the registry, and vice versa', () => {
    const known = new Set(AFFILIATES.map(a => a.id))
    for (const guide of guides) {
      for (const id of guide.affiliateIds ?? []) {
        expect(known.has(id), `/guias/${guide.slug} declara el afiliado desconocido ${id}`).toBe(
          true
        )
        expect(affiliatesFor(`/guias/${guide.slug}`).map(a => a.id)).toContain(id)
      }
    }
    // La guía de cobrar del exterior compara Payoneer y Wise por nombre: es la que los lleva.
    const cobrar = guides.find(g => g.slug === 'enviar-recibir-dinero-exterior')!
    expect(cobrar.affiliateIds).toEqual(['payoneer', 'wise'])
  })

  it('resolves by id and by page', () => {
    expect(getAffiliate('wise')?.partner).toBe('Wise')
    expect(getAffiliate('nope')).toBeUndefined()
    expect(affiliatesFor('/guias/enviar-recibir-dinero-exterior').map(a => a.id)).toEqual([
      'payoneer',
      'wise',
    ])
    expect(affiliatesFor('/pagina-que-no-existe')).toEqual([])
  })
})

describe('resolving the URL from runtime config', () => {
  it('maps a kebab-case id to the camelCase key Nuxt builds from the env var', () => {
    expect(affiliateConfigKey('payoneer')).toBe('payoneer')
    expect(affiliateConfigKey('seguro-viaje')).toBe('seguroViaje')
  })

  it('is empty with no config, and takes the configured URL when there is one', () => {
    expect(resolveAffiliateUrl('payoneer')).toBe('')
    expect(resolveAffiliateUrl('payoneer', { payoneer: '' })).toBe('')
    expect(resolveAffiliateUrl('payoneer', { payoneer: '   ' })).toBe('')
    expect(resolveAffiliateUrl('payoneer', { payoneer: 42 })).toBe('')
    expect(resolveAffiliateUrl('unknown', { unknown: 'https://x.test' })).toBe('')
    expect(
      resolveAffiliateUrl('seguro-viaje', { seguroViaje: ' https://seguros.test/ref?a=1 ' })
    ).toBe('https://seguros.test/ref?a=1')
  })

  it('renders nothing without a URL, and a sponsored link with attribution when there is one', () => {
    expect(affiliateLink('wise')).toBeNull()
    expect(affiliateLink('nope', { nope: 'https://x.test' })).toBeNull()
    expect(affiliateLink('wise', { wise: 'javascript:alert(1)' })).toBeNull()
    expect(affiliateLink('wise', { wise: 'mailto:x@y.z' })).toBeNull()

    const link = affiliateLink(
      'wise',
      { wise: 'https://www.wise.com/invite/u/abc?x=1' },
      '/guias/enviar-recibir-dinero-exterior'
    )!
    expect(link).not.toBeNull()
    expect(link.id).toBe('wise')
    expect(link.host).toBe('wise.com')
    const url = new URL(link.href)
    expect(url.searchParams.get('x')).toBe('1')
    expect(url.searchParams.get('utm_source')).toBe('cambio-uruguay')
    expect(url.searchParams.get('utm_medium')).toBe('affiliate')
    expect(url.searchParams.get('utm_campaign')).toBe('wise')
    expect(url.searchParams.get('utm_content')).toBe('/guias/enviar-recibir-dinero-exterior')
  })
})

describe('outbound UTM helper', () => {
  it('keeps existing params, refuses non-http destinations, prints the bare host', () => {
    expect(withUtm('not a url', { medium: 'm', campaign: 'c' })).toBe('')
    expect(withUtm('ftp://x.test/', { medium: 'm', campaign: 'c' })).toBe('')
    const out = withUtm('https://a.test/p?keep=1', { medium: 'sponsored', campaign: 'id-1' })
    expect(out).toContain('keep=1')
    expect(out).toContain('utm_medium=sponsored')
    expect(out).not.toContain('utm_content')
    expect(buildAffiliateUrl('https://a.test/', 'payoneer')).toContain('utm_campaign=payoneer')
    expect(hostnameOf('https://www.payoneer.com/x')).toBe('payoneer.com')
    expect(hostnameOf('garbage')).toBe('')
  })
})
