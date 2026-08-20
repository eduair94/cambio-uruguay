// Alquilar sin recibo de sueldo: la tesis, y los dos datos que la sostienen.
//
// La página salió de un hilo de r/uruguay ("Alquilar en Mdeo sin sueldo") donde alguien que vive de
// las ventas —meses de US$ 2.000 y meses de US$ 1.000— preguntaba cómo hacer. Diecisiete comentarios
// y ninguna respuesta completa. La tesis es que el obstáculo no es la variación del ingreso sino su
// FORMALIDAD, y estos tests existen para que esa tesis no se afloje con una edición distraída.
import { describe, expect, it } from 'vitest'
import {
  FORMALITY_STEPS,
  GUARANTEE_OPTIONS,
  NOPAYSLIP_FAQ,
  RENT_NOPAYSLIP_REVIEWED,
  optionsThatWork,
} from '../../utils/rentNoPayslip'

describe('rentNoPayslip - la comparativa', () => {
  it('la CGN es la que NO sirve, que es la que todo el mundo intenta primero', () => {
    // Funciona reteniendo del recibo de sueldo. Sin recibo no hay de dónde descontar, y su lista de
    // habilitados no incluye independientes. Decirlo es la mitad del valor de la página.
    const cgn = GUARANTEE_OPTIONS.find(o => o.id === 'cgn')
    expect(cgn).toBeDefined()
    expect(cgn!.worksWithoutPayslip).toBe('no')
    expect(cgn!.verdictWhy.toLowerCase()).toContain('recibo')
  })

  it('el FGA es la vía pensada para esto y acepta certificado de contador', () => {
    const fga = GUARANTEE_OPTIONS.find(o => o.id === 'fga')
    expect(fga!.worksWithoutPayslip).toBe('si')
    expect(fga!.requirements.join(' ')).toContain('contador público')
    // Los topes van en UR porque se reajustan solos; en pesos quedarían viejos sin que nadie avise.
    expect(fga!.ceiling).toContain('UR')
  })

  it('quedan varias opciones utilizables, no una sola', () => {
    // Si quedara una sola, la página sería un folleto de esa una. La comparativa vale porque hay
    // varias y se diferencian en qué te piden.
    expect(optionsThatWork().length).toBeGreaterThanOrEqual(3)
    expect(optionsThatWork().length).toBeLessThan(GUARANTEE_OPTIONS.length)
  })

  it('cada opción dice qué pide, cuánto cuesta, su techo y de dónde salió', () => {
    for (const o of GUARANTEE_OPTIONS) {
      expect(o.requirements.length, o.id).toBeGreaterThan(0)
      expect(o.cost.length, o.id).toBeGreaterThan(10)
      expect(o.ceiling.length, o.id).toBeGreaterThan(10)
      expect(o.sources.length, o.id).toBeGreaterThan(0)
      for (const s of o.sources) expect(s.url, o.id).toMatch(/^https:\/\//)
    }
  })

  it('no promete un costo que la fuente no publica', () => {
    // ANDA no publica el costo para independientes. Inventar uno "razonable" sería exactamente lo
    // que el resto del sitio no hace.
    const anda = GUARANTEE_OPTIONS.find(o => o.id === 'anda')
    expect(anda!.cost.toLowerCase()).toContain('no publica')
  })
})

describe('rentNoPayslip - la tesis', () => {
  it('contesta que la variación del ingreso no es el problema', () => {
    const faq = NOPAYSLIP_FAQ.find(f => f.q.toLowerCase().includes('varían'))
    expect(faq, 'falta la pregunta que originó la página').toBeDefined()
    expect(faq!.a).toMatch(/promedio|40 %|30 %/)
  })

  it('dice sin vueltas qué queda cuando no hay nada formal que certificar', () => {
    const faq = NOPAYSLIP_FAQ.find(f => f.q.toLowerCase().includes('sin factura'))
    expect(faq).toBeDefined()
    // Las tres que no miran ingresos. Si alguna desaparece, la respuesta deja de ser accionable.
    expect(faq!.a).toContain('19.889')
    expect(faq!.a.toLowerCase()).toContain('bhu')
    expect(faq!.a.toLowerCase()).toContain('pensión')
  })

  it('la salida a la informalidad es una secuencia, no un consejo', () => {
    expect(FORMALITY_STEPS.length).toBeGreaterThanOrEqual(3)
    // El primer paso tiene que ser registrarse: sin eso ninguno de los otros es posible.
    expect(FORMALITY_STEPS[0]!.step.toLowerCase()).toContain('registrada')
    // Y tiene que enlazar a las páginas que explican cómo, o el paso es una orden sin manual.
    expect(FORMALITY_STEPS.filter(s => s.link).length).toBeGreaterThanOrEqual(2)
  })

  it('los tres meses aparecen, porque son la antigüedad mínima real del sistema', () => {
    const all = [...FORMALITY_STEPS.map(s => s.detail), ...NOPAYSLIP_FAQ.map(f => f.a)].join(' ')
    expect(all).toMatch(/3 meses|tres meses/)
  })
})

describe('rentNoPayslip - procedencia', () => {
  it('lleva fecha de verificación', () => {
    expect(RENT_NOPAYSLIP_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('las fuentes son oficiales donde el dato es oficial', () => {
    const fga = GUARANTEE_OPTIONS.find(o => o.id === 'fga')!
    const cgn = GUARANTEE_OPTIONS.find(o => o.id === 'cgn')!
    expect(fga.sources.some(s => s.url.includes('gub.uy'))).toBe(true)
    expect(cgn.sources.some(s => s.url.includes('gub.uy'))).toBe(true)
  })
})
