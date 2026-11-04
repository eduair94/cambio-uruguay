import { describe, expect, it } from 'vitest'

import { FRANJAS_CONTRIBUTIVAS, ASIGNACION_FAMILIAR_VIGENCIA } from '../../utils/asignacionFamiliar'
import { getGuide } from '../../utils/guides'

/**
 * Las cifras de `/guias/asignacion-familiar-doble-uruguay`, contra su fuente primaria.
 *
 * Son tres números y los tres caducan: los $ 1.347 y $ 674 de la asignación simple del régimen
 * contributivo y los $ 3.837,89 del beneficiario con discapacidad del Plan de Equidad, todos con
 * vigencia 1/2026. El riesgo no es que estén mal hoy, es que alguien actualice UNA de las dos
 * páginas que los publican —la guía nueva o `utils/asignacionFamiliar.ts`, que es la que alimenta
 * `/asignacion-familiar-uruguay`— y el sitio pase a decir dos cosas distintas sobre la misma
 * prestación. Por eso el doble se verifica DERIVÁNDOLO del catálogo que ya existía, en vez de
 * cotejar dos literales escritos a mano.
 *
 * Y se vigila la otra mitad, que es lo que esta guía existe para no hacer: ningún monto en pesos
 * puede aparecer sin su vigencia en el mismo bloque, y el monto de las ayudas extraordinarias no se
 * publica, porque el BPS no publica uno vigente.
 */
const SLUG = 'asignacion-familiar-doble-uruguay'

describe('la guía de la asignación familiar doble', () => {
  const guide = getGuide(SLUG)

  it('está en el catálogo, con fuentes y preguntas', () => {
    expect(guide).toBeDefined()
    expect(guide!.sources?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(guide!.faqs?.length ?? 0).toBeGreaterThanOrEqual(4)
  })

  it('entra en el SERP: título y descripción dentro de presupuesto', () => {
    expect(`${guide!.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(guide!.description.length).toBeLessThanOrEqual(155)
  })

  it('publica el doble de las dos franjas que ya tenía el sitio, no dos literales nuevos', () => {
    const texto = JSON.stringify(guide)
    for (const franja of FRANJAS_CONTRIBUTIVAS) {
      const doble = (franja.montoMensual * 2).toLocaleString('es-UY')
      expect(texto, `falta el doble de ${franja.montoMensual}: ${doble}`).toContain(doble)
    }
    // Y la simple también, para que el lector pueda hacer la cuenta.
    expect(texto).toContain('1.347')
    expect(texto).toContain('674')
  })

  it('publica el valor del Plan de Equidad para el beneficiario con discapacidad', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('3.837,89')
    expect(texto).toContain('2.686,51')
  })

  it('nunca publica un monto sin su vigencia en el mismo bloque', () => {
    expect(ASIGNACION_FAMILIAR_VIGENCIA).toBe('1/2026')
    const bloques = [
      ...guide!.sections.map(section => `${section.body} ${JSON.stringify(section.table ?? '')}`),
      ...(guide!.faqs ?? []).map(faq => faq.a),
    ]
    const conMonto = bloques.filter(bloque => /\$ ?\d/.test(bloque))
    expect(conMonto.length).toBeGreaterThanOrEqual(3)
    for (const bloque of conMonto)
      expect(bloque, bloque.slice(0, 120)).toMatch(/1\/2026|vigencia|Los tres son pesos/)
  })

  it('dice que las ayudas extraordinarias existen y no les pone precio', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('ayudas extraordinarias')
    expect(texto).toContain('no publica un importe vigente')
  })

  it('no le atribuye al Decreto-Ley 15.084 la duplicación del monto', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('el texto del Decreto-Ley 15.084 que consultamos no la contiene')
  })

  it('cita las tres fichas del BPS y los dos textos en IMPO', () => {
    const urls = (guide!.sources ?? []).map(source => source.url)
    expect(urls).toContain('https://www.bps.gub.uy/5470/asignacion-familiar.html')
    expect(urls).toContain(
      'https://www.bps.gub.uy/23669/a-quienes-les-corresponde-asignacion-familiar-doble.html'
    )
    expect(urls).toContain('https://www.bps.gub.uy/3540/plan-de-equidad.html')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos-ley/15084-1980/5')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18227-2007')
  })

  it('no es un ranking ni una recomendación entre los dos regímenes', () => {
    const texto = JSON.stringify(guide)
    expect(texto).toContain('no son una recomendación')
    expect(texto).toContain('Incompatibles')
  })
})
