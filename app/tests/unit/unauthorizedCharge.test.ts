// Guardarraíl de /me-cobran-algo-que-no-autorice.
//
// El riesgo de esta página no es el render: es publicar como derecho algo que sólo dice el contrato
// de un emisor, o dejar creer que un organismo puede ordenar una devolución que no puede ordenar.
// Estos tests fijan las dos cosas que se pierden primero cuando alguien edita el catálogo.
import { describe, expect, it } from 'vitest'

import {
  AUTHORITIES,
  CHARGE_FAQS,
  CHARGE_GAPS,
  CHARGE_TRAPS,
  CONSTANCIA_RULE,
  DOCUMENTS_TO_ASK,
  NORM_QUOTES,
  STOP_ACTIONS,
  STOP_ACTIONS_GAP,
  UNAUTHORIZED_CHARGE_SOURCES,
  UNAUTHORIZED_CHARGE_VERIFIED_AT,
} from '../../utils/unauthorizedCharge'

const KINDS = ['norma', 'operador', 'practica']

describe('quién puede ordenar la devolución', () => {
  it('sólo el juzgado: es la tesis de la página y no puede romperse en silencio', () => {
    const canRefund = AUTHORITIES.filter(a => a.ordersRefund)
    expect(canRefund).toHaveLength(1)
    expect(canRefund[0].id).toBe('juzgado')
  })

  it('el BCU supervisa y sanciona, pero NO ordena la devolución', () => {
    const bcu = AUTHORITIES.find(a => a.id === 'bcu')!
    expect(bcu.supervises).toBe(true)
    expect(bcu.sanctions).toBe(true)
    expect(bcu.ordersRefund).toBe(false)
  })

  it('Defensa del Consumidor tampoco la ordena, y es del MEF (no del MEC)', () => {
    const dnc = AUTHORITIES.find(a => a.id === 'dnc')!
    expect(dnc.ordersRefund).toBe(false)
    expect(dnc.fullName).toContain('Ministerio de Economía y Finanzas')
    expect(dnc.fullName).not.toContain('Educación')
  })

  it('la empresa no supervisa ni sanciona, pero es la primera puerta', () => {
    const empresa = AUTHORITIES.find(a => a.id === 'empresa')!
    expect(empresa.supervises).toBe(false)
    expect(empresa.sanctions).toBe(false)
    expect(AUTHORITIES[0].id).toBe('empresa')
  })
})

describe('los plazos que más se confunden', () => {
  it('la respuesta al reclamo es en días CORRIDOS, nunca hábiles', () => {
    const empresa = AUTHORITIES.find(a => a.id === 'empresa')!
    expect(empresa.deadline).toContain('corridos')
    expect(empresa.deadline).not.toContain('hábiles')
  })

  it('no se publica ningún plazo legal en días para desconocer un cargo', () => {
    // Ninguna ley uruguaya fija un número: el que circula es el contrato del emisor. Si alguien
    // agrega "tenés 90 días" como si fuera norma, este test lo tiene que ver.
    const trap = CHARGE_TRAPS.find(t => t.id === 'plazo-contractual')!
    expect(trap.detail).toContain('no de una norma')
    expect(trap.detail.toLowerCase()).toContain('cada cuota es un cargo nuevo')
  })

  it('la vía rápida del juzgado declara su caducidad', () => {
    const juzgado = AUTHORITIES.find(a => a.id === 'juzgado')!
    expect(juzgado.deadline.toLowerCase()).toContain('caduca')
  })
})

describe('la disciplina de fuentes', () => {
  it('cada afirmación declara origen y trae al menos una fuente https', () => {
    const all = [
      ...AUTHORITIES.flatMap(a => a.sources),
      ...STOP_ACTIONS.flatMap(s => s.sources),
      ...NORM_QUOTES.flatMap(q => q.sources),
      ...CHARGE_TRAPS.flatMap(t => t.sources),
      ...UNAUTHORIZED_CHARGE_SOURCES,
    ]
    expect(all.length).toBeGreaterThan(25)
    for (const s of all) {
      expect(KINDS).toContain(s.kind)
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.label.length).toBeGreaterThan(3)
    }
    for (const a of AUTHORITIES) expect(a.sources.length).toBeGreaterThan(0)
    for (const s of STOP_ACTIONS) expect(s.sources.length).toBeGreaterThan(0)
    for (const q of NORM_QUOTES) expect(q.sources.length).toBeGreaterThan(0)
    for (const t of CHARGE_TRAPS) expect(t.sources.length).toBeGreaterThan(0)
  })

  it('las citas textuales llevan artículo y no están vacías', () => {
    expect(NORM_QUOTES.length).toBeGreaterThanOrEqual(8)
    for (const q of NORM_QUOTES) {
      expect(q.quote.length).toBeGreaterThan(40)
      expect(q.article).toMatch(/art/i)
      expect(q.useFor.length).toBeGreaterThan(40)
    }
  })

  it('los huecos se publican como huecos', () => {
    expect(CHARGE_GAPS.length).toBeGreaterThanOrEqual(5)
    expect(STOP_ACTIONS_GAP).toContain('No encontramos')
    // El más importante: no existe un "stop payment" genérico y la página lo dice.
    expect(STOP_ACTIONS_GAP.toLowerCase()).toContain('stop payment')
  })

  it('la fecha de verificación es una fecha ISO real', () => {
    expect(UNAUTHORIZED_CHARGE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(new Date(UNAUTHORIZED_CHARGE_VERIFIED_AT).getTime())).toBe(false)
  })
})

describe('el encuadre que decide el resultado', () => {
  it('advierte que discutirlo como fraude te deja peor', () => {
    const trap = CHARGE_TRAPS.find(t => t.id === 'como-fraude')!
    expect(trap.detail).toContain('367')
    expect(trap.detail).toContain('no pactado')
  })

  it('advierte que dejar de pagar te manda al Clearing', () => {
    const trap = CHARGE_TRAPS.find(t => t.id === 'dejar-de-pagar')!
    expect(trap.detail).toContain('Central de Riesgos')
    expect(trap.detail).toContain('mora')
  })

  it('corrige la confusión entre plazo de financiación y plazo de cobertura', () => {
    const trap = CHARGE_TRAPS.find(t => t.id === 'cuotas-vs-cobertura')!
    expect(trap.detail).toContain('12 cuotas')
    expect(trap.detail).toContain('45 días')
  })

  it('los pasos para frenar el cobro están ordenados por certeza y ninguno es baja', () => {
    expect(STOP_ACTIONS.length).toBeGreaterThanOrEqual(4)
    for (const s of STOP_ACTIONS) expect(['alta', 'media']).toContain(s.certainty)
    expect(STOP_ACTIONS[0].id).toBe('rescindir')
  })
})

describe('lo operativo', () => {
  it('pide la constancia con número, que es lo que habilita el resto del camino', () => {
    expect(CONSTANCIA_RULE).toContain('número')
    expect(DOCUMENTS_TO_ASK.length).toBeGreaterThanOrEqual(4)
    expect(DOCUMENTS_TO_ASK.some(d => d.toLowerCase().includes('constancia'))).toBe(true)
  })

  it('las preguntas frecuentes contestan, no derivan', () => {
    expect(CHARGE_FAQS.length).toBeGreaterThanOrEqual(10)
    for (const faq of CHARGE_FAQS) {
      expect(faq.q.length).toBeGreaterThan(10)
      expect(faq.a.length).toBeGreaterThan(80)
    }
  })

  it('ids únicos en cada catálogo', () => {
    for (const list of [AUTHORITIES, STOP_ACTIONS, NORM_QUOTES, CHARGE_TRAPS]) {
      const ids = list.map(x => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
