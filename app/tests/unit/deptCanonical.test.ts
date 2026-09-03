// Una canónica que devuelve la misma grafía que trae la URL no deduplica nada.
//
// La familia /sucursales/<casa>/<depto> tenía canónica, pero construida con el parámetro de la
// ruta, así que cada variante se declaraba canónica de sí misma. Verificado en producción el
// 2026-09-03, tres formas vivas del mismo departamento y las tres con canonical propia:
//   /sucursales/brou/cerro%20largo   (la que declara el sitemap)
//   /sucursales/brou/cerro-largo
//   /sucursales/brou/r%C3%ADo%20negro  frente a  /sucursales/brou/rio%20negro
// La mayúscula sí estaba resuelta por el middleware: /sucursales/brou/CERRO%20LARGO da 301.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = readFileSync(
  join(__dirname, '..', '..', 'pages', 'sucursales', '[origin]', '[[location]].vue'),
  'utf8'
)

describe('la canónica del departamento apunta a una sola grafía', () => {
  it('no se construye con el parámetro crudo de la ruta', () => {
    // El defecto exacto: encodeURIComponent(location) devolvía lo que viniera en la URL.
    expect(src).not.toContain('${encodeURIComponent(location)}')
  })

  it('usa el nombre del directorio, que es de donde sale el sitemap', () => {
    expect(src).toContain('canonicalDept')
    expect(src).toContain('directoryBranches.value[0]?.dept')
  })

  it('lo emite en minúscula, como el sitemap', () => {
    const at = src.indexOf('const canonicalDept')
    expect(src.slice(at, at + 320)).toContain("toLocaleLowerCase('es')")
  })

  it('si el directorio no está, cae a la grafía de la URL', () => {
    const at = src.indexOf('const canonicalDept')
    expect(src.slice(at, at + 320)).toContain('|| location')
  })

  it('el hub sin departamento sigue siendo canónico de sí mismo', () => {
    expect(src).toContain('`https://cambio-uruguay.com/sucursales/${origin}`')
  })
})
