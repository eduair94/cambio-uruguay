// El sitio existía dos veces.
//
// Verificado el 2026-09-03: www.cambio-uruguay.com servía todo el sitio con 200 y sin Location, y
// el archivo propio de Search Console listaba nueve URLs bajo www con 695 impresiones y 6 clics
// —encabezadas por /casa/santander, 350 impresiones en posición 7,3— pese a que la etiqueta
// canonical apuntaba correctamente al apex. El canonical es una sugerencia; el 301 no.
//
// La regla es angosta a propósito, y estos tests la mantienen angosta: un middleware que redirige
// cualquier host desconocido rompe el desarrollo local y las vistas previas, y lo rompe en
// producción, donde se nota tarde.
import { describe, expect, it } from 'vitest'
import { CANONICAL_HOST, canonicalHostRedirect } from '../../utils/canonicalHost'

describe('canonicalHostRedirect', () => {
  it('manda www al apex conservando la ruta', () => {
    expect(canonicalHostRedirect('www.cambio-uruguay.com', '/casa/santander')).toBe(
      'https://cambio-uruguay.com/casa/santander'
    )
  })

  it('conserva la query, que es donde viven los deep links del mapa', () => {
    expect(
      canonicalHostRedirect('www.cambio-uruguay.com', '/descuentos-con-tarjeta-uruguay?banco=itau')
    ).toBe('https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay?banco=itau')
  })

  it('funciona en la raíz', () => {
    expect(canonicalHostRedirect('www.cambio-uruguay.com', '/')).toBe('https://cambio-uruguay.com/')
  })

  it('ignora el puerto', () => {
    expect(canonicalHostRedirect('www.cambio-uruguay.com:443', '/')).toBe(
      'https://cambio-uruguay.com/'
    )
  })

  it('no le importa la caja de las mayúsculas', () => {
    expect(canonicalHostRedirect('WWW.Cambio-Uruguay.COM', '/x')).toBe(
      'https://cambio-uruguay.com/x'
    )
  })

  it('NO redirige el host bueno: sería un bucle', () => {
    expect(canonicalHostRedirect('cambio-uruguay.com', '/')).toBeNull()
    expect(canonicalHostRedirect(`${CANONICAL_HOST}`, '/casa/brou')).toBeNull()
  })

  it('NO toca el desarrollo local ni una vista previa', () => {
    // Un middleware que redirige todo lo que no reconoce rompe esto, y se nota tarde.
    expect(canonicalHostRedirect('localhost:3311', '/')).toBeNull()
    expect(canonicalHostRedirect('127.0.0.1:3000', '/')).toBeNull()
    expect(canonicalHostRedirect('staging.cambio-uruguay.com', '/')).toBeNull()
    expect(canonicalHostRedirect('104.234.204.107:3528', '/')).toBeNull()
  })

  it('no se confunde con un dominio que apenas se le parece', () => {
    expect(canonicalHostRedirect('www.cambio-uruguay.com.ar', '/')).toBeNull()
    expect(canonicalHostRedirect('wwwcambio-uruguay.com', '/')).toBeNull()
    expect(canonicalHostRedirect('www.otro-cambio-uruguay.com', '/')).toBeNull()
  })

  it('aguanta un Host vacío o roto sin lanzar', () => {
    expect(canonicalHostRedirect('', '/')).toBeNull()
    expect(canonicalHostRedirect('   ', '/')).toBeNull()
  })

  it('la salida nunca vuelve a disparar el redirect', () => {
    const once = canonicalHostRedirect('www.cambio-uruguay.com', '/casa/santander')!
    const host = new URL(once).host
    expect(canonicalHostRedirect(host, '/casa/santander')).toBeNull()
  })
})
