// app/tests/unit/consumerRights.test.ts
//
// This page tells people what the Ley 17.250 actually gives them when an online purchase goes
// wrong. The tests are about DISCIPLINE: every claim cites an article, the deadlines and figures
// match the verified law text, and the article-number corrections our adversarial pass found
// (burden of publicity proof = art. 26 not 24; contrapublicidad = art. 51; sanctions in art. 47)
// are pinned so a future edit cannot silently reintroduce the wrong citation.
import { describe, expect, it } from 'vitest'
import {
  COMPLAINT_STEPS,
  CONSUMER_FAQS,
  CONSUMER_RIGHTS,
  CONSUMER_SCENARIOS,
  CONSUMER_SOURCES,
  GOLDEN_RULE,
  KEY_FIGURES,
  scenarioById,
} from '../../utils/consumerRights'

describe('consumer scenario integrity', () => {
  it('has unique ids', () => {
    const ids = CONSUMER_SCENARIOS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never publishes a scenario without citing the article it comes from', () => {
    for (const s of CONSUMER_SCENARIOS) {
      expect(s.articles.length, s.id).toBeGreaterThan(0)
      for (const a of s.articles) {
        expect(a, `${s.id}: "${a}"`).toMatch(/Ley 17\.250|art\./i)
      }
    }
  })

  it('gives every scenario a deadline (or explicit note) and evidence to collect', () => {
    for (const s of CONSUMER_SCENARIOS) {
      expect(s.deadlines.length, s.id).toBeGreaterThan(0)
      expect(s.evidence.length, s.id).toBeGreaterThan(0)
      expect(s.lever.length, s.id).toBeGreaterThan(0)
    }
  })

  it('covers the AMV-STORE case: cobraron, no entregan, no cancelan, no devuelven', () => {
    for (const id of ['cobraron-no-entregan', 'no-cancelan', 'no-devuelven', 'esta-en-cadeteria']) {
      expect(scenarioById(id), id).toBeTruthy()
    }
  })
})

describe('the verified legal facts must not regress', () => {
  it('arrepentimiento is 5 días hábiles, from contract OR delivery at your option', () => {
    const s = scenarioById('no-cancelan')!
    expect(s.articles.join(' ')).toMatch(/art\. 16/)
    expect(s.deadlines.join(' ')).toMatch(/5 d[íi]as h[áa]biles/i)
    expect(s.deadlines.join(' ')).toMatch(/contrato o desde la entrega/i)
  })

  it('the not-delivered case gives the consumer the choice of remedy (art. 33)', () => {
    const s = scenarioById('cobraron-no-entregan')!
    expect(s.articles.join(' ')).toMatch(/art\. 33/)
    expect(s.answer).toMatch(/elecci[óo]n es TUYA|eleg[íi]s vos/i)
  })

  it('is honest that a card chargeback is not a Ley 17.250 right', () => {
    const s = scenarioById('cobraron-no-entregan')!
    expect(s.answer).toMatch(/no es un derecho de la ley/i)
    // transfers / Abitab / RedPagos have no chargeback — say so
    expect(s.answer).toMatch(/no hay contracargo/i)
  })

  it('puts the burden of publicity proof on the advertiser via art. 26 (NOT art. 24)', () => {
    const s = scenarioById('publicidad-enganosa')!
    const arts = s.articles.join(' ')
    expect(arts).toMatch(/art\. 26/)
    expect(arts).toMatch(/art\. 51/) // contrapublicidad
    // the burden-of-proof / contrapublicidad claims must not be attributed to art. 24
    expect(s.answer).toMatch(/carga de probar.*anunciante \(art\. 26\)/i)
    expect(s.answer).toMatch(/contrapublicidad.*\(art\. 51\)/i)
  })

  it('states garantía legal caducidad plazos exactly (30/90 días, 6 meses/3 meses)', () => {
    const s = scenarioById('producto-defectuoso')!
    const d = s.deadlines.join(' ')
    expect(d).toMatch(/30 d[íi]as/)
    expect(d).toMatch(/90 d[íi]as/)
    expect(d).toMatch(/6 meses/)
    expect(d).toMatch(/3 meses/)
    expect(s.articles.join(' ')).toMatch(/art\. 37/)
  })
})

describe('rights, steps, figures and sources', () => {
  it('every right cites at least one article', () => {
    for (const r of CONSUMER_RIGHTS) {
      expect(r.articles.length, r.title).toBeGreaterThan(0)
    }
  })

  it('the abusive-clause right kills "no se aceptan devoluciones"', () => {
    const r = CONSUMER_RIGHTS.find(x => /abusiva/i.test(x.title))!
    expect(r.articles.join(' ')).toMatch(/art\. 31/)
    expect(r.practical).toMatch(/nulo/i)
  })

  it('the escalation ends in a sancionatorio with multa 20 a 4.000 UR', () => {
    const last = COMPLAINT_STEPS[COMPLAINT_STEPS.length - 1]!
    expect(last.detail).toMatch(/20 a 4\.000 UR/)
    expect(last.detail).toMatch(/0800 7005/)
  })

  it('exposes the free Defensa del Consumidor channel and its phone', () => {
    expect(KEY_FIGURES.some(f => /0800 7005/.test(f.value))).toBe(true)
    expect(KEY_FIGURES.some(f => /gratuito/i.test(f.value))).toBe(true)
  })

  it('sources are all official (impo.com.uy or gub.uy) primary links', () => {
    expect(CONSUMER_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const s of CONSUMER_SOURCES) {
      expect(s.url, s.label).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy)/)
    }
  })

  it('has at least 10 FAQs, each with a question and an answer', () => {
    expect(CONSUMER_FAQS.length).toBeGreaterThanOrEqual(10)
    for (const f of CONSUMER_FAQS) {
      expect(f.q.length).toBeGreaterThan(0)
      expect(f.a.length).toBeGreaterThan(0)
    }
  })

  it('states the golden rule: orden público, derechos irrenunciables', () => {
    expect(GOLDEN_RULE).toMatch(/orden p[úu]blico/i)
    expect(GOLDEN_RULE).toMatch(/irrenunciable/i)
  })
})
