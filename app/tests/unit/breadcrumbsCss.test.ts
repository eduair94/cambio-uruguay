import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Las migas usaban los valores de Vuetify tal cual, y eso fallaba de tres maneras medidas en
// producción el 2026-11-20 (probes de 144 páginas):
//   - la miga actual (`.v-breadcrumbs-item--disabled`) se apagaba con `opacity: 0.38`: #a5a5a7 sobre
//     #f6f7f9, contraste 2,29:1, en más de 21 páginas (axe color-contrast);
//   - `.v-breadcrumbs` es una fila flex SIN wrap, así que en un teléfono cada miga se encogía y se
//     partía por dentro ("Autos / usados", "Chevrolet / Celta" en tres columnitas de 100 px de alto);
//   - los enlaces medían 24 px de alto.
// El arreglo vive en assets/css/legacy-vuetify.css (global, sin @layer, así gana a la capa
// `vuetify-components` sin pelear con ninguna regla de página) y este test lo lee de la fuente.
//
// Lo que NO hace, a propósito: no pone `white-space: nowrap` en las migas. Con la fila envolviendo,
// una miga que entra en la línea ya se ubica entera (el corte de línea de flex usa su ancho
// max-content), y nowrap sólo agregaría el caso malo: una miga más ancha que la fila (un título de
// guía o de modelo a 320 px) no podría partirse y empujaría la página de costado. En cambio cada
// miga se topa en el ancho de la fila y, recién ahí, parte el texto (el patrón que ya usaba la
// ficha de alquiler). Tampoco toca padding ni margin: el aire de la miga es del layout
// (layoutTop.test.ts).

const CSS = readFileSync(join(__dirname, '..', '..', 'assets', 'css', 'legacy-vuetify.css'), 'utf8')
const SOURCE = CSS.replace(/\/\*[\s\S]*?\*\//g, '')

interface Rule {
  selectors: string[]
  body: string
}

const rules: Rule[] = [...SOURCE.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => ({
  selectors: selector!
    .split(',')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean),
  body: body!,
}))

const breadcrumbRules = rules.filter(r => r.selectors.some(s => s.includes('v-breadcrumbs')))

function declarations(selector: string): Record<string, string> {
  const rule = rules.find(r => r.selectors.includes(selector))
  expect(rule, selector).toBeDefined()
  return Object.fromEntries(
    rule!.body
      .split(';')
      .map(d => d.trim())
      .filter(Boolean)
      .map(d => {
        const i = d.indexOf(':')
        return [d.slice(0, i).trim(), d.slice(i + 1).trim()]
      })
  )
}

describe('migas (VBreadcrumbs) en legacy-vuetify.css', () => {
  it('la fila envuelve en vez de encoger cada miga', () => {
    const d = declarations('.v-breadcrumbs')
    expect(d['flex-wrap']).toBe('wrap')
    expect(d['row-gap']).toMatch(/^\d+px$/)
  })

  it('una miga más ancha que la fila se topa en la fila y parte el texto, sin desbordar', () => {
    const d = declarations('.v-breadcrumbs-item')
    expect(d['max-width']).toBe('100%')
    expect(d['min-width']).toBe('0')
    expect(d['overflow-wrap']).toBe('anywhere')
  })

  it('ninguna regla de migas impide partir el texto (nowrap desbordaría a 320 px)', () => {
    for (const rule of breadcrumbRules) {
      expect(rule.body, rule.selectors.join(', ')).not.toMatch(/white-space\s*:\s*nowrap/)
    }
  })

  it('la miga actual se lee: sin la opacidad de deshabilitado, con el token de énfasis medio', () => {
    const d = declarations('.v-breadcrumbs-item--disabled')
    expect(d.opacity).toBe('1')
    // on-background a 0,60 sobre #f6f7f9 es ~#636465 (5,6:1); en el tema oscuro, blanco a 0,70
    // sobre #0a0e1a. El token cambia con el tema, así que no hace falta una regla por tema.
    expect(d.color).toBe('rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity))')
  })

  it('el enlace de cada miga mide al menos 32 px de alto, con el texto centrado', () => {
    const d = declarations('.v-breadcrumbs-item--link')
    expect(Number.parseFloat(d['min-height'] ?? '')).toBeGreaterThanOrEqual(32)
    expect(d['min-height']).toMatch(/px$/)
    expect(d.display).toBe('inline-flex')
    expect(d['align-items']).toBe('center')
  })

  it('no toca el aire de la miga, que es del layout', () => {
    expect(breadcrumbRules.length).toBeGreaterThanOrEqual(4)
    for (const rule of breadcrumbRules) {
      expect(rule.body, rule.selectors.join(', ')).not.toMatch(
        /(^|[;\s])(padding|margin)[\w-]*\s*:/
      )
    }
  })

  it('va sin @layer, para ganarle a la capa de componentes de Vuetify', () => {
    expect(SOURCE).not.toMatch(/@layer/)
  })
})
