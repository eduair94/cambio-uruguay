// La regla de caducidad del clearing, escrita igual en todos lados.
//
// EL SITIO SE CONTRADECÍA A SÍ MISMO. Cuatro archivos —/alquilar-estando-en-clearing,
// /conviene-comprar-en-cuotas, rentClearing.ts y debtRelief.ts— tenían bien el art. 22 de la Ley
// 18.331, y /salir-del-clearing decía lo contrario: "el plazo máximo es de 5 años y no es
// renovable". El texto vigente dice otra cosa, y la diferencia le cambia la decisión a quien lo
// lee:
//
//   * obligación IMPAGA: cinco años desde su incorporación, y si al vencer sigue impaga el acreedor
//     puede pedir POR ÚNICA VEZ otros cinco. Pueden ser diez.
//   * obligación CANCELADA: hasta cinco años NO renovables, contados desde la cancelación.
//
// Decirle a alguien con una deuda impaga que a los cinco años caduca sí o sí lo empuja a esperar en
// vez de negociar. Por eso "no renovable" nunca puede aparecer suelto: sólo vale para lo cancelado.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = ['pages', 'utils'].map(d => join(__dirname, '..', '..', d))

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return filesUnder(full)
    if (!/\.(?:vue|ts)$/.test(name)) return []
    return [full]
  })
}

const SOURCES = ROOTS.flatMap(filesUnder)
  .map(path => ({ path, text: readFileSync(path, 'utf8') }))
  .filter(f => /no renovable|no es renovable/i.test(f.text))

describe('la caducidad del clearing', () => {
  it('el sitio habla del tema en algún lado (guarda de vacuidad)', () => {
    expect(SOURCES.length).toBeGreaterThan(0)
  })

  it.each(
    SOURCES.map(f => [
      relative(join(__dirname, '..', '..'), f.path)
        .split(sep)
        .join('/'),
      f,
    ])
  )('%s dice "no renovable" sólo de una obligación cancelada', (_name, file) => {
    for (const m of file.text.matchAll(/no (?:es )?renovable/gi)) {
      const around = file.text.slice(Math.max(0, m.index - 260), m.index + 260)
      expect(
        /cancelad/i.test(around),
        `"${m[0]}" sin "cancelada" cerca — el plazo de la deuda IMPAGA sí se puede renovar`
      ).toBe(true)
    }
  })

  it.each(
    SOURCES.map(f => [
      relative(join(__dirname, '..', '..'), f.path)
        .split(sep)
        .join('/'),
      f,
    ])
  )('%s no promete que una deuda impaga caduca sola', (_name, file) => {
    // La frase exacta que tenía /salir-del-clearing. Si vuelve, vuelve el error.
    expect(file.text).not.toMatch(/plazo máximo es de 5 años y[\s\S]{0,40}no es renovable/i)
  })
})
