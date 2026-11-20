// Cuatro arreglos chicos que salieron de medir la página publicada (sondas del 2026-11-20, 390x844,
// tema claro, axe + objetivos táctiles de menos de 40 px):
//
//  1. La bandera de la tarjeta de auto («Menciona choque, airbags o reparaciones») es justo la
//     advertencia que el lector tiene que ver, y salía en ámbar #ff8f00 a 12 px sobre blanco:
//     2,28:1. La de «Bajó US$ 900» (teal #00897b) daba 4,31:1. Las dos fallan 4,5:1 a 12 px. El tema
//     oscuro ya contrasta y no se toca.
//  2. «Configurar cookies», la única forma de volver a abrir el consentimiento, medía 105x18 en el pie.
//  3. «Usar» en cada banco de /herramientas/calculadora-plazo-fijo medía 56x28 en el teléfono, y es
//     la única acción de la fila.
//  4. La foto principal de la ficha del auto es el LCP del teléfono (2,8 s) y no pedía prioridad.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')

function sfc(path: string) {
  const filename = join(APP, path)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const css = descriptor.styles
    .map(style => style.content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))
    .join('\n')
  return { template: descriptor.template?.content ?? '', css }
}

function bodyOf(css: string, selector: string): string {
  const escaped = selector.replace(/[.()[\]]/g, m => `\\${m}`).replace(/\s+/g, '\\s+')
  const match = css.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`))
  expect(match, selector).not.toBeNull()
  return match![1]!
}

/** Contraste WCAG 2.x de un color hexadecimal contra blanco. */
function contrastOnWhite(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/../g)!
    .map(part => parseInt(part, 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const luminance = 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  return 1.05 / (luminance + 0.05)
}

describe('las etiquetas de la tarjeta de auto contrastan en el tema claro', () => {
  const { css } = sfc('components/cars/ListingCard.vue')

  it('la prueba mide lo que midió axe', () => {
    // Los dos colores que salían en producción, para que la función no apruebe cualquier cosa.
    expect(contrastOnWhite('#ff8f00')).toBeLessThan(2.4)
    expect(contrastOnWhite('#00897b')).toBeLessThan(4.5)
  })

  for (const modifier of ['flag', 'drop']) {
    it(`.car-badge--${modifier} tiene un color propio en el tema claro con 4,5:1 o más`, () => {
      const body = bodyOf(css, `.v-theme--light .car-badge--${modifier}`)
      const color = body.match(/color:\s*(#[0-9a-fA-F]{6})/)?.[1]
      expect(color, `.car-badge--${modifier} sin color fijo en el tema claro`).toBeDefined()
      expect(contrastOnWhite(color!)).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('el tema oscuro sigue tomando los colores del tema', () => {
    expect(bodyOf(css, '.car-badge--flag')).toMatch(/rgb\(var\(--v-theme-warning\)\)/)
    expect(bodyOf(css, '.car-badge--drop')).toMatch(/rgb\(var\(--v-theme-info\)\)/)
    expect(bodyOf(css, '.car-badge--deal')).toMatch(/rgb\(var\(--v-theme-success\)\)/)
  })
})

describe('«Configurar cookies» del pie es un objetivo táctil', () => {
  const { template, css } = sfc('components/Footer.vue')

  it('el botón sigue en el pie', () => {
    expect(template).toMatch(/<button type="button" class="cu-footer__cookies"/)
  })

  it('mide al menos 44 px de alto', () => {
    const body = bodyOf(css, '.cu-footer__cookies')
    expect(Number(body.match(/min-height:\s*(\d+)px/)?.[1])).toBeGreaterThanOrEqual(44)
    // Un botón inline no toma el alto: tiene que ser una caja flexible centrada.
    expect(body).toMatch(/display:\s*inline-flex/)
    expect(body).toMatch(/align-items:\s*center/)
  })
})

describe('los botones «Usar» de la calculadora de plazo fijo', () => {
  const { template, css } = sfc('pages/herramientas/calculadora-plazo-fijo.vue')

  it('los dos botones llevan la clase que los agranda en el teléfono', () => {
    const buttons = [...template.matchAll(/<VBtn\b[^>]*>\s*(Usar(?: esta tasa)?)\s*<\/VBtn>/g)]
    expect(buttons.map(m => m[1])).toEqual(['Usar', 'Usar esta tasa'])
    for (const [tag] of buttons) expect(tag).toMatch(/class="rate-use-btn"/)
  })

  it('en xs miden 44 px de alto; en escritorio quedan como estaban', () => {
    // Por CSS y no con useDisplay(): el HTML se cachea en el borde y servidor y cliente tienen
    // que dibujar el mismo marcado.
    const media = css.match(/@media \(max-width: 599\.98px\)\s*\{([\s\S]*?)\n\}/)
    expect(media, 'falta el bloque xs').not.toBeNull()
    const rule = media![1]!.match(/\.rate-use-btn\s*\{([^}]*)\}/)
    expect(rule).not.toBeNull()
    expect(Number(rule![1]!.match(/min-height:\s*(\d+)px/)?.[1])).toBeGreaterThanOrEqual(44)
    expect(template.match(/class="rate-use-btn"/g)).toHaveLength(2)
    expect(template).not.toMatch(/useDisplay/)
  })
})

describe('la foto principal de la ficha del auto pide prioridad', () => {
  const { template } = sfc('pages/autos-usados-uruguay/[key].vue')
  const photo = template.match(/<div class="car-photo">\s*<img\b([^>]*)\/>/)

  it('es la imagen de la foto activa', () => {
    expect(photo, 'cambió el marcado de la foto principal').not.toBeNull()
    expect(photo![1]).toMatch(/:src="activePicture"/)
  })

  it('lleva fetchpriority="high" y decoding="async", sin lazy', () => {
    expect(photo![1]).toMatch(/\sfetchpriority="high"/)
    expect(photo![1]).toMatch(/\sdecoding="async"/)
    expect(photo![1]).not.toMatch(/loading="lazy"/)
    // La caja ya está reservada: el ancho y el alto siguen ahí.
    expect(photo![1]).toMatch(/width="720"/)
    expect(photo![1]).toMatch(/height="480"/)
  })
})
