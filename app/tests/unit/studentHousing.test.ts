import { describe, expect, it } from 'vitest'
import {
  matchStudentHousing,
  studentHousingBandFor,
  studentHousingRouteById,
  studentHousingVerdict,
  STUDENT_HOGARES,
  STUDENT_HOUSING_BPC,
  STUDENT_HOUSING_COMPLAINTS,
  STUDENT_HOUSING_FAQS,
  STUDENT_HOUSING_LEGAL_MINIMUMS,
  STUDENT_HOUSING_PRICE_BANDS,
  STUDENT_HOUSING_ROUTES,
  STUDENT_HOUSING_SOURCES,
  STUDENT_HOUSING_VISIT_CHECKLIST,
  STUDENT_HOUSING_VS_RENT,
  type StudentHousingInput,
} from '../../utils/studentHousing'

// The person who motivated the page: asked r/uruguay for a women-only or mixed
// student pensión at around 8.000 pesos, any neighbourhood, individual room —
// and could not find one.
const persona: StudentHousingInput = {
  budget: 8000,
  room: 'individual',
  gender: 'mujer',
  origin: 'interior',
  age: 20,
  studies: 'udelar',
  income: 'medio',
  when: 'ya',
}

const fitOf = (res: ReturnType<typeof matchStudentHousing>, id: string) =>
  res.find(r => r.route.id === id)!.fit

describe('matchStudentHousing — the 8.000 individual-room persona', () => {
  it('returns every route exactly once', () => {
    const res = matchStudentHousing(persona)
    expect(res).toHaveLength(STUDENT_HOUSING_ROUTES.length)
    expect(new Set(res.map(r => r.route.id)).size).toBe(STUDENT_HOUSING_ROUTES.length)
  })

  it('does not promise an individual pensión room below the observed floor', () => {
    const individual = studentHousingBandFor('habitacion-individual')
    expect(persona.budget).toBeLessThan(individual.min)
    expect(fitOf(matchStudentHousing(persona), 'pension-individual')).toBe('baja')
  })

  it('offers the shared bed as the thing that actually fits that budget', () => {
    expect(fitOf(matchStudentHousing(persona), 'pension-compartida')).toBe('media')
  })

  it('surfaces the Udelar housing beca as a high fit for an interior Udelar student', () => {
    expect(fitOf(matchStudentHousing(persona), 'beca-alojamiento')).toBe('alta')
  })

  it('names the amount of the beca in pesos so it can be compared with the rent', () => {
    const beca = matchStudentHousing(persona).find(r => r.route.id === 'beca-alojamiento')!
    expect(beca.reason).toContain((2 * STUDENT_HOUSING_BPC).toLocaleString('es-UY'))
  })

  it('sorts so that nothing dismissed outranks something that fits', () => {
    const res = matchStudentHousing(persona)
    const order = ['alta', 'media', 'baja', 'descartada']
    const idx = res.map(r => order.indexOf(r.fit))
    expect(idx).toEqual([...idx].sort((a, b) => a - b))
  })
})

describe('matchStudentHousing — the inscription window is the real gate', () => {
  const interior: StudentHousingInput = { ...persona, room: 'compartida', income: 'bajo' }

  it('downgrades the free routes when the student needs a room right now', () => {
    const now = matchStudentHousing({ ...interior, when: 'ya' })
    expect(fitOf(now, 'inju')).toBe('media')
    expect(fitOf(now, 'hogar-intendencia')).toBe('media')
  })

  it('promotes them when the student is planning for next year', () => {
    const planned = matchStudentHousing({ ...interior, when: 'proximo-ano' })
    expect(fitOf(planned, 'inju')).toBe('alta')
    expect(fitOf(planned, 'hogar-intendencia')).toBe('alta')
  })

  it('says out loud that this year the INJU call already closed', () => {
    const now = matchStudentHousing({ ...interior, when: 'ya' })
    expect(now.find(r => r.route.id === 'inju')!.reason).toMatch(/cerr/i)
  })
})

describe('matchStudentHousing — who each free route is for', () => {
  it('dismisses INJU for someone already living in Montevideo', () => {
    const res = matchStudentHousing({ ...persona, origin: 'montevideo' })
    expect(fitOf(res, 'inju')).toBe('descartada')
  })

  it('dismisses INJU past the age cap and points at the intendencia hogar', () => {
    const res = matchStudentHousing({ ...persona, age: 27 })
    expect(fitOf(res, 'inju')).toBe('descartada')
    expect(res.find(r => r.route.id === 'inju')!.reason).toMatch(/intendencia/i)
  })

  it('dismisses INJU on high household income', () => {
    expect(fitOf(matchStudentHousing({ ...persona, income: 'alto' }), 'inju')).toBe('descartada')
  })

  it('points a canario at their own departmental hogar instead of INJU', () => {
    const res = matchStudentHousing({ ...persona, origin: 'canelones' })
    expect(fitOf(res, 'inju')).toBe('descartada')
    expect(res.find(r => r.route.id === 'inju')!.reason).toMatch(/Canelones/)
    expect(fitOf(res, 'hogar-intendencia')).not.toBe('descartada')
  })

  it('has no departmental hogar for a montevideano', () => {
    expect(
      fitOf(matchStudentHousing({ ...persona, origin: 'montevideo' }), 'hogar-intendencia')
    ).toBe('descartada')
  })

  it('dismisses the Udelar beca for a private-university student', () => {
    expect(fitOf(matchStudentHousing({ ...persona, studies: 'privada' }), 'beca-alojamiento')).toBe(
      'descartada'
    )
  })

  it('dismisses the Udelar beca for someone living with family in Montevideo', () => {
    expect(
      fitOf(matchStudentHousing({ ...persona, origin: 'montevideo' }), 'beca-alojamiento')
    ).toBe('baja')
  })
})

describe('matchStudentHousing — the market routes follow the budget', () => {
  it('opens the individual pensión once the budget clears the observed floor', () => {
    const rich = matchStudentHousing({ ...persona, budget: 13000 })
    expect(fitOf(rich, 'pension-individual')).toBe('alta')
  })

  it('warns a woman on a mid budget that the women-only house costs more', () => {
    const mid = matchStudentHousing({ ...persona, budget: 9000 })
    const row = mid.find(r => r.route.id === 'pension-individual')!
    expect(row.fit).toBe('media')
    expect(row.reason).toMatch(/MIXTA/)
  })

  it('does not warn about the women-only premium when gender is indifferent', () => {
    const mid = matchStudentHousing({ ...persona, budget: 9000, gender: 'indistinto' })
    expect(mid.find(r => r.route.id === 'pension-individual')!.reason).not.toMatch(/MIXTA/)
  })

  it('marks the shared bed as unreachable below the cheapest observed price', () => {
    const broke = matchStudentHousing({ ...persona, room: 'compartida', budget: 4000 })
    expect(fitOf(broke, 'pension-compartida')).toBe('baja')
  })

  it('never shows a market route as a high fit when the budget is below every band', () => {
    const broke = matchStudentHousing({ ...persona, room: 'compartida', budget: 3000 })
    const market = broke.filter(r => r.route.kind === 'mercado')
    expect(market.every(r => r.fit !== 'alta')).toBe(true)
  })

  it('rules out signing a lease under 18', () => {
    expect(fitOf(matchStudentHousing({ ...persona, age: 17 }), 'alquiler-compartido')).toBe(
      'descartada'
    )
  })
})

describe('studentHousingVerdict', () => {
  it('tells the 8.000 individual seeker that it is not published at that price', () => {
    const v = studentHousingVerdict(8000, 'individual', 'mujer')
    expect(v.short).toBe(true)
    expect(v.headline).toMatch(/Individual/)
    expect(v.detail).toMatch(/8\.500/)
  })

  it('separates the mixed pensión from the women-only house in the middle band', () => {
    const v = studentHousingVerdict(9500, 'individual', 'mujer')
    expect(v.short).toBe(false)
    expect(v.headline).toMatch(/mixta/i)
  })

  it('confirms a private room once the budget clears the concentration band', () => {
    const v = studentHousingVerdict(13000, 'individual', 'mujer')
    expect(v.short).toBe(false)
    expect(v.headline).toMatch(/pieza propia/)
  })

  it('flags a budget below the cheapest shared bed', () => {
    const v = studentHousingVerdict(3500, 'indistinto')
    expect(v.short).toBe(true)
    expect(v.detail).toMatch(/hogar estudiantil/)
  })

  it('warns about the "camas individuales" wording on the shared verdict', () => {
    const v = studentHousingVerdict(6000, 'compartida')
    expect(v.detail).toMatch(/camas individuales/i)
  })
})

describe('data integrity', () => {
  it('every route resolves by id', () => {
    for (const route of STUDENT_HOUSING_ROUTES) {
      expect(studentHousingRouteById(route.id)).toBe(route)
    }
  })

  it('every price band has a plausible range and a dated observation', () => {
    for (const band of STUDENT_HOUSING_PRICE_BANDS) {
      expect(band.min).toBeGreaterThan(0)
      expect(band.max).toBeGreaterThanOrEqual(band.min)
      expect(band.observedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(band.sourceUrl).toMatch(/^https:\/\//)
    }
  })

  it('the individual band sits above the shared band: that is the whole point', () => {
    expect(studentHousingBandFor('habitacion-individual').min).toBeGreaterThan(
      studentHousingBandFor('cama-compartida').min
    )
    expect(studentHousingBandFor('individual-femenina').min).toBeGreaterThan(
      studentHousingBandFor('habitacion-individual').min
    )
  })

  it('every source and complaint channel points at https', () => {
    for (const s of [...STUDENT_HOUSING_SOURCES, ...STUDENT_HOUSING_COMPLAINTS]) {
      expect(s.url).toMatch(/^https:\/\//)
    }
  })

  it('every legal minimum cites its article of the Digesto', () => {
    for (const rule of STUDENT_HOUSING_LEGAL_MINIMUMS) {
      expect(rule.article).toMatch(/^D\.4107\.23\.\d+$/)
    }
  })

  it('keeps the bathroom ratio that motivated the checklist', () => {
    const banos = STUDENT_HOUSING_LEGAL_MINIMUMS.find(r => r.id === 'banos')!
    expect(banos.rule).toMatch(/cada 12/)
  })

  it('lists no duplicated departments and points every hogar at a URL', () => {
    const depts = STUDENT_HOGARES.map(h => h.department)
    expect(new Set(depts).size).toBe(depts.length)
    for (const h of STUDENT_HOGARES) expect(h.url).toMatch(/^https:\/\//)
  })

  it('marks as verified only the hogares read against an official page', () => {
    const verified = STUDENT_HOGARES.filter(h => h.verified).map(h => h.department)
    expect(verified).toContain('Canelones')
    expect(verified).toContain('Río Negro')
    expect(verified).not.toContain('Rocha')
  })

  it('contrasts pensión against alquiler on the point that explains the price', () => {
    const garantia = STUDENT_HOUSING_VS_RENT.find(r => r.topic === 'Garantía')!
    expect(garantia.pension).toMatch(/no piden/i)
  })

  it('has a visit checklist with no duplicated ids', () => {
    const ids = STUDENT_HOUSING_VISIT_CHECKLIST.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(8)
  })

  it('has FAQs that end in a question mark and carry an answer', () => {
    for (const faq of STUDENT_HOUSING_FAQS) {
      expect(faq.q.endsWith('?')).toBe(true)
      expect(faq.a.length).toBeGreaterThan(60)
    }
    expect(new Set(STUDENT_HOUSING_FAQS.map(f => f.q)).size).toBe(STUDENT_HOUSING_FAQS.length)
  })
})
