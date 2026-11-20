// La tabla de los comparadores de monopatines y de bicicletas (4/11/2026): en el teléfono NO hay
// desplazamiento lateral. Con tres modelos medía 488 px en 317 y el primero quedaba tapado.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const table = readFileSync(
  join(APP, 'components', 'movilidad', 'MovilidadCompareTable.vue'),
  'utf8'
)
const css = table.slice(table.indexOf('<style'))

describe('MovilidadCompareTable', () => {
  it('nunca desplaza en horizontal: sin overflow-x ni ancho mínimo fijo', () => {
    expect(css).not.toMatch(/overflow-x\s*:\s*(auto|scroll)/)
    expect(css).not.toMatch(/min-width:\s*\d{3,}px/)
  })

  it('en el teléfono el rótulo va arriba a todo el ancho y los valores en columnas iguales', () => {
    const phone = css.slice(css.indexOf('@media (max-width: 599.98px)'))
    expect(phone).toContain('grid-template-columns: repeat(var(--cmp-cols, 2), minmax(0, 1fr))')
    expect(phone).toMatch(/\.cmp-label \{[^}]*grid-column: 1 \/ -1/)
    expect(phone).toMatch(/\.cmp-head \{[^}]*position: sticky/)
    expect(table).toContain(':style="{ \'--cmp-cols\': String(models.length) }"')
  })

  it('conserva la semántica de tabla aunque cambie el display', () => {
    for (const role of [
      'role="table"',
      'role="row"',
      'role="columnheader"',
      'role="rowheader"',
      'role="cell"',
    ])
      expect(table).toContain(role)
  })

  it('lo usan los dos comparadores, cada uno con su hub', () => {
    for (const [dir, hub] of [
      ['monopatines-electricos-uruguay', '/monopatines-electricos-uruguay'],
      ['bicicletas-electricas-uruguay', '/bicicletas-electricas-uruguay'],
    ]) {
      const page = readFileSync(join(APP, 'pages', dir, 'comparar.vue'), 'utf8')
      expect(page).toContain('<MovilidadCompareTable')
      expect(page).toContain(`hub="${hub}"`)
      expect(page).not.toContain('compare-scroll')
    }
  })
})
