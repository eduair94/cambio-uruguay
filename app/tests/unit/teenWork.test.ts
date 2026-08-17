import { describe, expect, it } from 'vitest'
import {
  CARNE_REQUIREMENTS,
  CARNE_STEPS,
  FORBIDDEN_WORK,
  MONEY_ROUTES,
  TEEN_AGE_RULES,
  TEEN_WORK_FAQS,
  TEEN_WORK_LIMITS,
  TEEN_WORK_SOURCES,
  TEEN_WORK_TIPS,
  TEEN_WORK_VERIFIED_AT,
} from '../../utils/teenWork'

describe('sources', () => {
  it('points every source at an official publisher', () => {
    expect(TEEN_WORK_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of TEEN_WORK_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.url).toMatch(/impo\.com\.uy|inau\.gub\.uy|gub\.uy/)
      expect(source.label.trim().length).toBeGreaterThan(20)
      expect(source.publisher.trim()).not.toBe('')
    }
  })

  it('has a verified-at date in ISO form', () => {
    expect(TEEN_WORK_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(TEEN_WORK_VERIFIED_AT))).toBe(false)
  })

  // Every claim on this page is a labour-law claim about minors. A rule whose
  // source index points nowhere is a claim nobody can check.
  it('backs every age rule, limit and route with a source that exists', () => {
    for (const rule of TEEN_AGE_RULES) expect(TEEN_WORK_SOURCES[rule.sourceIndex]).toBeDefined()
    for (const limit of TEEN_WORK_LIMITS) expect(TEEN_WORK_SOURCES[limit.sourceIndex]).toBeDefined()
    for (const route of MONEY_ROUTES) expect(TEEN_WORK_SOURCES[route.sourceIndex]).toBeDefined()
  })
})

describe('the age ladder', () => {
  it('covers every band from under-13 to 18', () => {
    expect(TEEN_AGE_RULES).toHaveLength(4)
    const ages = TEEN_AGE_RULES.map(rule => rule.age).join(' ')
    expect(ages).toMatch(/13/)
    expect(ages).toMatch(/15/)
    expect(ages).toMatch(/18/)
  })

  it('states 15 as the floor and 13–14 as an exception, not a right', () => {
    const teen = TEEN_AGE_RULES.find(rule => rule.age.includes('15, 16'))
    expect(teen?.allowed).toMatch(/carné/i)
    // `startsWith`, not `includes`: "Menos de 13 años" also contains "13" and
    // would match the wrong row.
    const younger = TEEN_AGE_RULES.find(rule => rule.age.startsWith('13'))
    expect(younger?.allowed).toMatch(/excepción/i)
    expect(younger?.condition).toMatch(/no es un derecho/i)
  })

  it('says plainly that under 13 there is no work', () => {
    const child = TEEN_AGE_RULES[0]
    expect(child?.allowed).toMatch(/no podés trabajar/i)
  })
})

describe('the working-day limits', () => {
  it('carries the four figures a reader has to know', () => {
    const text = TEEN_WORK_LIMITS.map(limit => `${limit.rule} ${limit.detail}`).join(' ')
    expect(text).toMatch(/6 horas/)
    expect(text).toMatch(/36 horas/)
    expect(text).toMatch(/6\.00 a 22\.00/)
    expect(text).toMatch(/12 horas/)
  })

  it('states that night work is prohibited', () => {
    const text = TEEN_WORK_LIMITS.map(limit => `${limit.rule} ${limit.detail}`).join(' ')
    expect(text).toMatch(/nocturno.*prohibido/i)
  })

  it('frames the 8-hour case as an authorisation, never as the rule', () => {
    const eight = TEEN_WORK_LIMITS.find(limit => limit.rule.includes('8 horas'))
    expect(eight).toBeDefined()
    expect(eight?.detail).toMatch(/autorización, no la regla/i)
  })

  it('states the adolescent administers their own wage', () => {
    const wage = TEEN_WORK_LIMITS.find(limit => /sueldo/i.test(limit.rule))
    expect(wage?.detail).toMatch(/vos lo administrás/i)
  })
})

describe('the carné', () => {
  it('lists the documents the trámite asks for', () => {
    expect(CARNE_REQUIREMENTS.length).toBeGreaterThanOrEqual(6)
    const text = CARNE_REQUIREMENTS.map(req => req.item).join(' ')
    expect(text).toMatch(/[Cc]édula/)
    expect(text).toMatch(/carné de salud/i)
    expect(text).toMatch(/antitetánica/i)
    expect(text).toMatch(/constancia de estudio/i)
    expect(text).toMatch(/formulario del empleador/i)
  })

  // The order trips everyone: the trámite needs an employer's form, so the job
  // comes first. A guide that lists the carné as step one sends the reader to
  // an office they cannot complete anything at.
  it('puts getting the job before the paperwork', () => {
    expect(CARNE_STEPS[0]?.name).toMatch(/trabajo/i)
    expect(CARNE_STEPS[0]?.text).toMatch(/formulario del empleador/i)
  })

  it('gives every step real instructions', () => {
    expect(CARNE_STEPS.length).toBeGreaterThanOrEqual(5)
    for (const step of CARNE_STEPS) {
      expect(step.name.trim().length).toBeGreaterThan(5)
      expect(step.text.trim().length).toBeGreaterThan(40)
    }
  })

  it('says the trámite is free and where it is done', () => {
    const text = CARNE_STEPS.map(step => step.text).join(' ')
    expect(text).toMatch(/no tiene costo/i)
    expect(text).toMatch(/Fernández Crespo/)
    expect(text).toMatch(/2402 0604/)
  })
})

describe('forbidden work', () => {
  it('lists the hazardous tasks the resolution names', () => {
    const text = FORBIDDEN_WORK.join(' | ').toLowerCase()
    expect(text).toMatch(/nocturno/)
    expect(text).toMatch(/armas/)
    expect(text).toMatch(/alcohólicas/)
    expect(text).toMatch(/altura/)
    expect(text).toMatch(/pesca/)
    expect(FORBIDDEN_WORK.length).toBeGreaterThanOrEqual(8)
  })
})

describe('the money routes', () => {
  it('leads with formal employment and names the youth-employment law', () => {
    expect(MONEY_ROUTES[0]?.title).toMatch(/[Ee]mpleo formal/)
    const text = MONEY_ROUTES.map(route => `${route.title} ${route.body}`).join(' ')
    expect(text).toMatch(/19\.133/)
  })

  it('gives every route a body and a concrete requirement', () => {
    expect(MONEY_ROUTES.length).toBeGreaterThanOrEqual(3)
    for (const route of MONEY_ROUTES) {
      expect(route.body.trim().length).toBeGreaterThan(120)
      expect(route.requires.trim().length).toBeGreaterThan(10)
    }
  })

  // Own-account work is where a guide is most tempted to invent a procedure.
  // There is none published, and the page has to say that.
  it('states the own-account gap instead of inventing a trámite', () => {
    const own = MONEY_ROUTES.find(route => /cuenta/i.test(route.title))
    expect(own).toBeDefined()
    expect(own?.body).toMatch(/no hay un trámite equivalente publicado/i)
    expect(own?.body).toMatch(/6 horas|horario diurno/i)
  })
})

describe('tips and FAQs', () => {
  it('warns that an employer who skips the carné is the irregular one', () => {
    const text = TEEN_WORK_TIPS.map(tip => `${tip.title} ${tip.body}`).join(' ')
    expect(text).toMatch(/2\.000 unidades reajustables/)
    expect(text).toMatch(/historia laboral/i)
  })

  it('puts school above the work schedule', () => {
    const text = TEEN_WORK_TIPS.map(tip => `${tip.title} ${tip.body}`).join(' ')
    expect(text).toMatch(/liceo|UTU|estudio/i)
  })

  it('gives every tip and FAQ substantive prose', () => {
    expect(TEEN_WORK_TIPS.length).toBeGreaterThanOrEqual(5)
    for (const tip of TEEN_WORK_TIPS) {
      expect(tip.title.trim().length).toBeGreaterThan(5)
      expect(tip.body.trim().length).toBeGreaterThan(80)
    }
    expect(TEEN_WORK_FAQS.length).toBeGreaterThanOrEqual(8)
    for (const faq of TEEN_WORK_FAQS) {
      expect(faq.q.trim().endsWith('?')).toBe(true)
      expect(faq.a.trim().length).toBeGreaterThan(90)
    }
  })

  it('answers the question the page exists for', () => {
    const first = TEEN_WORK_FAQS[0]
    expect(first?.q).toMatch(/15 años/)
    expect(first?.a).toMatch(/edad mínima para trabajar es 15/i)
  })

  it('never promises a validity period no source states', () => {
    const text = [...TEEN_WORK_FAQS.map(faq => faq.a), ...CARNE_STEPS.map(step => step.text)].join(
      ' '
    )
    expect(text).not.toMatch(/el carné vence|validez de \d/i)
  })
})
