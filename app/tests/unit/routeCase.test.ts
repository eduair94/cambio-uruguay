// Cada caso de acá se midió contra el sitio en vivo el 2026-09-02: las dos grafías respondían 200
// con el mismo contenido y cada una se declaraba canónica de sí misma.
import { describe, expect, it } from 'vitest'
import { canonicalRoutePath, LOWERCASE_ROUTE_FAMILIES } from '../../utils/routeCase'

describe('canonicalRoutePath', () => {
  it('baja la moneda del histórico, que es donde está el tráfico', () => {
    // /historico/brou/usd tenía 8.592 impresiones; /historico/brou/USD, la grafía del sitemap, cero.
    expect(canonicalRoutePath('/historico/brou/USD')).toBe('/historico/brou/usd')
    expect(canonicalRoutePath('/historico/brou/usd/EBROU')).toBe('/historico/brou/usd/ebrou')
  })

  it('baja el departamento de sucursales', () => {
    expect(canonicalRoutePath('/sucursales/oca/MONTEVIDEO')).toBe('/sucursales/oca/montevideo')
    expect(canonicalRoutePath('/sucursales/brou/CERRO%20LARGO')).toBe(
      '/sucursales/brou/cerro%20largo'
    )
  })

  it('decodifica antes de bajar, porque el hex del porcentaje es insensible a mayúsculas', () => {
    // Un toLowerCase() crudo daría `paysand%c3%9a`, que sigue siendo «PAYSANDÚ» con Ú mayúscula.
    expect(canonicalRoutePath('/sucursales/brou/PAYSAND%C3%9A')).toBe(
      '/sucursales/brou/paysand%C3%BA'
    )
  })

  it('respeta el prefijo de idioma', () => {
    expect(canonicalRoutePath('/en/historico/brou/USD')).toBe('/en/historico/brou/usd')
    expect(canonicalRoutePath('/pt/sucursales/oca/MALDONADO')).toBe('/pt/sucursales/oca/maldonado')
  })

  it('devuelve la misma cadena cuando ya es canónica — no hay redirect que dar', () => {
    for (const path of [
      '/historico/brou/usd',
      '/sucursales/brou/montevideo',
      '/en/historico/brou/usd',
      '/sucursales/brou/cerro-largo',
    ]) {
      expect(canonicalRoutePath(path)).toBe(path)
    }
  })

  it('no toca ninguna otra familia', () => {
    // Una regla global de minúsculas es una regla que algún día rompe una ruta que necesitaba su
    // mayúscula. Estas dos familias y nada más.
    for (const path of [
      '/casa/brou/COMPRAR',
      '/convertir/100-USD',
      '/guias/Algo',
      '/api/Rates',
      '/',
    ]) {
      expect(canonicalRoutePath(path)).toBe(path)
    }
  })

  it('deja en paz una ruta con porcentaje malformado en vez de inventarle una forma', () => {
    expect(canonicalRoutePath('/sucursales/brou/%ZZ')).toBe('/sucursales/brou/%ZZ')
  })

  it('no entra en bucle: la salida ya es canónica', () => {
    const once = canonicalRoutePath('/sucursales/brou/CERRO%20LARGO')
    expect(canonicalRoutePath(once)).toBe(once)
  })

  it('cubre exactamente las dos familias medidas', () => {
    expect([...LOWERCASE_ROUTE_FAMILIES].sort()).toEqual(['historico', 'sucursales'])
  })
})
