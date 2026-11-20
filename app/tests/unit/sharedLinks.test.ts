import { describe, expect, it } from 'vitest'
import {
  isSharedLinkId,
  isShareablePath,
  normalizeSharePath,
  normalizeShareText,
} from '../../utils/sharedLinks'

describe('public share targets', () => {
  it('preserves vehicle comparison selection and public catalog filters', () => {
    expect(
      normalizeSharePath('/autos-usados-uruguay?brand=toyota&priceMax=20000&fuel=hibrido&page=2')
    ).toBe('/autos-usados-uruguay?brand=toyota&fuel=hibrido&page=2&priceMax=20000')
    expect(normalizeSharePath('/autos-usados-uruguay/comparar?autos=ml-MLU123456,fb-123456')).toBe(
      '/autos-usados-uruguay/comparar?autos=ml-MLU123456%2Cfb-123456'
    )
    expect(
      normalizeSharePath('/motos-usadas-uruguay?marca=honda&cilindrada=125&precioMaxUsd=3000')
    ).toBe('/motos-usadas-uruguay?cilindrada=125&marca=honda&precioMaxUsd=3000')
  })

  it('retains rental filters while removing personal reference points and tracking', () => {
    const path = normalizeSharePath(
      '/pt/alquileres-uruguay?bedrooms=2&pets=1&garantia=anda&refLat=-34.9&refLng=-56.1&refLabel=Mi+casa&sort=distancia&utm_source=chat&token=secret'
    )
    expect(path).toBe('/pt/alquileres-uruguay?bedrooms=2&garantia=anda&pets=1')
  })

  it('preserves property selections and product filtering', () => {
    expect(
      normalizeSharePath('/venta-viviendas-uruguay?keys=infocasas-123,casasweb-456&maxPrice=90000')
    ).toBe('/venta-viviendas-uruguay?keys=infocasas-123%2Ccasasweb-456&maxPrice=90000')
    expect(
      normalizeSharePath('/equipar-casa-uruguay/productos/heladera?condicion=nuevo&marca=lg')
    ).toBe('/equipar-casa-uruguay/productos/heladera?condicion=nuevo&marca=lg')
  })

  it('keeps budget rental criteria, discounts and non-vehicle directories shareable', () => {
    expect(
      normalizeSharePath(
        '/oportunidades-inmobiliarias-uruguay?operation=rent&mode=budget&band=under10000&basis=monthly&agency=example&dueno=1'
      )
    ).toBe(
      '/oportunidades-inmobiliarias-uruguay?agency=example&band=under10000&basis=monthly&dueno=1&mode=budget&operation=rent'
    )
    expect(
      normalizeSharePath(
        '/descuentos-con-tarjeta-uruguay?banco=itau&tipo=credito&categoria=restaurantes'
      )
    ).toBe('/descuentos-con-tarjeta-uruguay?banco=itau&categoria=restaurantes&tipo=credito')
    expect(
      normalizeSharePath(
        '/apps-utiles-uruguay?categoria=transporte&plataforma=android&depto=Montevideo'
      )
    ).toBe('/apps-utiles-uruguay?categoria=transporte&depto=Montevideo&plataforma=android')
    expect(normalizeSharePath('/precio/leche?depto=Montevideo&ofertas=1&lat=-34.9&lng=-56.1')).toBe(
      '/precio/leche?depto=Montevideo&ofertas=1'
    )
  })

  it('allows public static, dynamic and translated paths and same-site absolute URLs', () => {
    for (const path of ['/', '/en', '/pt/comparar', '/autos-usados-uruguay/ml-MLU123456'])
      expect(isShareablePath(path)).toBe(true)
    expect(
      normalizeSharePath('https://cambio-uruguay.com/comparar?tipo=buy&moneda=USD#tabla')
    ).toBe('/comparar?moneda=USD&tipo=buy')
  })

  it.each([
    '/cuenta',
    '/en/cuenta/perfil',
    '/estadisticas-de-busqueda',
    '/estadisticas-por-pagina',
    '/contactos-comerciales',
    '/api/cars',
    '/en/api/cars',
    '/admin',
    '/auth/login',
    '/mi-lista',
    '/equipar-casa-uruguay/mi-lista',
    '/descuentos-con-tarjeta-uruguay/cerca-de-mi',
    '/not-a-real-page',
    '//evil.example/a',
    '/\\evil.example/a',
    'https://evil.example/',
    'https://cambio-uruguay.com.evil.example/',
    'https://evil@cambio-uruguay.com/',
    '/blog/../cuenta',
    '/blog/%2e%2e/cu enta',
    '/blog/%252e%252e/cu enta',
    '/blog/%2fcuenta',
    '/blog/%5ccuenta',
    '/blog/%00x',
    '/blog/%FF',
    '/blog/a\n',
    '/en//cuenta',
  ])('rejects private, external or ambiguous path %s', path => {
    expect(normalizeSharePath(path)).toBeNull()
  })

  it('drops unapproved queries and fragments even on dynamic pages', () => {
    expect(
      normalizeSharePath('/blog/economia?redirect=https://evil.example&email=a@b.com#secret')
    ).toBe('/blog/economia')
    expect(normalizeSharePath('/comparar?casas=brou&casas=prex&moneda=USD')).toBe(
      '/comparar?casas=brou&casas=prex&moneda=USD'
    )
  })

  it('reuses an existing share URL and rejects malformed IDs', () => {
    expect(normalizeSharePath('/s/AbCd_0123-xy?token=secret')).toBe('/s/AbCd_0123-xy')
    expect(isSharedLinkId('AbCd_0123-xy')).toBe(true)
    expect(normalizeSharePath('/s/123')).toBeNull()
    expect(isSharedLinkId('AbCd_0123-xy/')).toBe(false)
  })

  it('bounds input, decoded parameter values, count and canonical output', () => {
    expect(normalizeSharePath('/buscar?q=' + 'x'.repeat(4096))).toBeNull()
    expect(normalizeSharePath('/buscar?q=' + 'x'.repeat(1025))).toBeNull()
    expect(normalizeSharePath('/buscar?' + Array(65).fill('q=x').join('&'))).toBeNull()
    expect(normalizeSharePath('/buscar?q=' + '😀'.repeat(400))).toBeNull()
    expect(normalizeSharePath('/buscar?q=%00secret')).toBeNull()
    expect(normalizeSharePath({ path: '/' })).toBeNull()
  })
})

it('normalizes metadata to bounded plain text without hidden control characters', () => {
  expect(normalizeShareText('  <b>Autos</b>\n baratos \u202E ', 140)).toBe('Autos baratos')
  expect(normalizeShareText('x'.repeat(200), 140)).toHaveLength(140)
  expect(normalizeShareText({ title: 'not text' }, 140)).toBe('')
})
