// La unidad intermedia de las fichas de aviso (auto, alquiler, venta).
//
// Hasta el 2026-10-31 una ficha llegaba al pie con una sola unidad, la del cierre del layout,
// debajo de la ficha técnica, el historial de precio, la comparación y los parecidos (~0,7
// impresiones por vista en autos). La ficha es densidad normal: tiene presupuesto para dos.
// Este test vigila que haya exactamente una propia, en el corte que se eligió, y que la ruta
// siga teniendo presupuesto para ella.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'
import { adDensityForPath, maxAdSlots } from '../../utils/ads'

const APP = resolve(__dirname, '../..')

const FICHAS: Record<string, { route: string; before: string; after: string }> = {
  'pages/autos-usados-uruguay/[key].vue': {
    route: '/autos-usados-uruguay/mlu-123',
    after: '<CarsSellerPhone',
    before: 'data-testid="car-specs"',
  },
  'pages/alquileres/[key].vue': {
    route: '/alquileres/pocitos-abc123',
    after: 'id="rental-description-title"',
    before: 'id="rental-location-title"',
  },
  'pages/venta-viviendas-uruguay/[key].vue': {
    route: '/venta-viviendas-uruguay/infocasas-123',
    after: "t('description')",
    before: "t('amenities')",
  },
}

describe('la unidad intermedia de las fichas', () => {
  for (const [file, { route, before, after }] of Object.entries(FICHAS)) {
    describe(file, () => {
      const src = readFileSync(resolve(APP, file), 'utf8')
      const template = parse(src, { filename: file }).descriptor.template?.content ?? ''

      it('tiene una sola unidad in-article propia', () => {
        expect(template.match(/<AdSlot\s[^>]*placement="in-article"/g)).toHaveLength(1)
        expect(template.match(/<AdSlot\b/g)).toHaveLength(1)
      })

      it('va después de lo que la persona vino a ver y antes del bloque siguiente', () => {
        const ad = template.indexOf('<AdSlot')
        expect(template.indexOf(after)).toBeGreaterThan(-1)
        expect(template.indexOf(after)).toBeLessThan(ad)
        expect(ad).toBeLessThan(template.indexOf(before))
      })

      it('la ruta tiene presupuesto para dos unidades', () => {
        expect(maxAdSlots(adDensityForPath(route))).toBe(2)
      })
    })
  }
})
