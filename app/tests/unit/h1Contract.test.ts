// Cada plantilla que sirve tráfico tiene que emitir exactamente un encabezado de nivel 1.
//
// Por qué existe este archivo: el 2026-09-02, medido contra el sitio en vivo, /historico/itau,
// /historico/prex, /sucursales/brou/montevideo y /sucursales/itau servían CERO encabezados de nivel
// 1. Entre las dos familias son más de 100.000 impresiones al mes. Nadie lo rompió: nunca lo
// tuvieron, mientras la variante de tres segmentos (/historico/brou/usd) sí lo tenía desde julio.
// Un hueco así no se nota nunca sin un test — la página se ve perfecta.
//
// La comprobación es grep sobre el fuente, igual que seoContract.test.ts, y por la misma razón: lo
// que hay que garantizar es que la plantilla declare el encabezado, no reproducir un render.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')
const read = (file: string) => readFileSync(join(PAGES_DIR, file), 'utf8')

/**
 * Las plantillas programáticas que reciben impresiones medidas, con las de agosto de 2026 al lado
 * para que la lista se ordene sola por lo que cuesta perderlas.
 */
const TRAFFIC_TEMPLATES: Array<{ file: string; impressions: number }> = [
  { file: 'historico/[origin]/index.vue', impressions: 72951 },
  { file: 'historico/[origin]/[currency]/[[type]].vue', impressions: 72951 },
  { file: 'sucursales/[origin]/[[location]].vue', impressions: 30000 },
  { file: 'sucursales/index.vue', impressions: 3455 },
  { file: 'sucursal/[slug].vue', impressions: 3455 },
  { file: 'casa/[origin]/index.vue', impressions: 10848 },
  { file: 'casa/[origin]/[intent].vue', impressions: 10848 },
  { file: 'convertir/[slug].vue', impressions: 110740 },
  { file: 'comparativas/[familia]/[par].vue', impressions: 6932 },
]

describe('las plantillas con tráfico declaran su encabezado', () => {
  it.each(TRAFFIC_TEMPLATES.map(t => [t.file, t.impressions] as const))(
    '%s (%i impresiones/mes) emite exactamente un h1',
    file => {
      const matches = read(file).match(/<h1[\s>]/g) || []
      expect(matches).toHaveLength(1)
    }
  )

  it('cubre las dos familias que estaban sin encabezado', () => {
    // Guarda de la guarda: si alguien borra una fila de la lista, esto lo dice.
    const files = TRAFFIC_TEMPLATES.map(t => t.file)
    expect(files).toContain('historico/[origin]/index.vue')
    expect(files).toContain('sucursales/[origin]/[[location]].vue')
  })
})
