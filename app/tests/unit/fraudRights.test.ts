// app/tests/unit/fraudRights.test.ts
//
// This page tells people what they are legally entitled to after being robbed. The tests below
// are less about arithmetic than about DISCIPLINE: every published claim must cite an article,
// and the two claims that are legally contested must be labelled as contested rather than sold
// as certainties. Reddit is full of both errors; we are correcting them, so we had better not
// commit them ourselves.
import { describe, expect, it } from 'vitest'
import {
  EMONEY_GAP,
  ESCALATION,
  FRAUD_SCENARIOS,
  GOLDEN_RULE,
  scenarioById,
  toneFor,
} from '../../utils/fraudRights'

describe('fraud matrix integrity', () => {
  it('has unique ids', () => {
    const ids = FRAUD_SCENARIOS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never publishes a right without citing the article it comes from', () => {
    for (const s of FRAUD_SCENARIOS) {
      expect(s.articles.length, s.id).toBeGreaterThan(0)
      for (const a of s.articles) {
        // Every citation must name a norm: a ley, a decreto, a código or the BCU's recopilación.
        expect(a, `${s.id}: "${a}"`).toMatch(/Ley|RNRCSF|RNSP|Código|BCU|Decreto/i)
      }
    }
  })

  it('gives every scenario a deadline and something to collect', () => {
    for (const s of FRAUD_SCENARIOS) {
      expect(s.deadlines.length, s.id).toBeGreaterThan(0)
      expect(s.evidence.length, s.id).toBeGreaterThan(0)
    }
  })
})

describe('the claims that must NOT be oversold', () => {
  it('labels phishing as contested — the law genuinely does not resolve it', () => {
    const s = scenarioById('phishing')!
    expect(s.certainty).toBe('contestado')
    expect(s.whoPays).toBe('depende')
    // It must state the argument AGAINST the reader too. A page that only flatters the victim
    // would get them into a fight they are told they cannot lose, and they can.
    expect(s.againstYou).toBeTruthy()
    expect(s.answer).toMatch(/discutid|disputad|no.*resuelv/i)
  })

  it('tells the marketplace victim the truth: the bank does not owe them the money', () => {
    const s = scenarioById('transferi-a-un-estafador')!
    expect(s.whoPays).toBe('nadie te lo devuelve')
    expect(s.answer).toMatch(/no ten[ée]s derecho/i)
    // The one real tool, and honest about it being a faculty rather than an obligation.
    expect(s.answer).toMatch(/facultado|no obligado/i)
  })

  it('promises no chargeback for a product that never arrived', () => {
    const s = scenarioById('no-llego')!
    expect(s.certainty).toBe('silencio de la ley')
    expect(s.answer).toMatch(/no te vamos a prometer|no encontramos ninguna norma/i)
  })
})

describe('the claims Reddit gets wrong, which are the point of the page', () => {
  it('puts the burden of proof on the issuer for a cloned card', () => {
    const s = scenarioById('clonada')!
    expect(s.whoPays).toBe('emisor')
    expect(s.certainty).toBe('claro')
    expect(s.articles.join(' ')).toMatch(/364 lit\. h/)
  })

  it('says an over-limit operation is on the issuer even if you notified late', () => {
    const s = scenarioById('clonada')!
    expect(s.answer).toMatch(/l[íi]mite/i)
    expect(s.answer).toMatch(/aunque hayas avisado tarde|avisado tarde/i)
  })

  it('surfaces the 2FA lever for an unauthorised transfer', () => {
    const s = scenarioById('transferencia-no-autorizada')!
    expect(s.articles.join(' ')).toMatch(/364 lit\. i/)
    expect(s.answer).toMatch(/doble factor/i)
  })

  it('is the only scenario with a real refund clock: the débito automático', () => {
    const s = scenarioById('debito-automatico')!
    expect(s.deadlines.join(' ')).toMatch(/5 D[ÍI]AS H[ÁA]BILES/i)
    expect(s.deadlines.join(' ')).toMatch(/1 D[ÍI]A H[ÁA]BIL/i)
    // It is the only one where silence works FOR the victim.
    expect(s.answer).toMatch(/confirmado/i)
  })
})

describe('the e-money gap (Prex, Mi Dinero)', () => {
  it('says plainly which protections do NOT reach a wallet', () => {
    expect(EMONEY_GAP.doesNotApply.length).toBeGreaterThan(0)
    expect(EMONEY_GAP.doesNotApply.join(' ')).toMatch(/364 lit\. h/)
    expect(EMONEY_GAP.applies.join(' ')).toMatch(/19\.731/)
  })
})

describe('escalation ladder', () => {
  it('leads with the 48-hour deadline that makes people lose their money', () => {
    const fortyEight = ESCALATION.find(s => /48/.test(s.when))
    expect(fortyEight).toBeTruthy()
    expect(fortyEight!.detail).toMatch(/se cae|libres/i)
  })

  it('sends card fraud to Defensa del Consumidor, not the BCU', () => {
    const step = ESCALATION.find(s => /Defensa del Consumidor/i.test(s.title))!
    expect(step.title).toMatch(/NO el BCU/i)
  })

  it('is honest that only a court can order the money back', () => {
    const bcu = ESCALATION.find(s => /BCU/i.test(s.title) && /no para que/i.test(s.title))!
    expect(bcu.detail).toMatch(/no tiene competencia/i)
    expect(ESCALATION.some(s => /Justicia/i.test(s.title))).toBe(true)
  })

  it('states the golden rule about documenting the moment you notified', () => {
    expect(GOLDEN_RULE).toMatch(/fecha y hora/i)
  })
})

describe('toneFor', () => {
  it('colours the verdicts by who actually pays', () => {
    expect(toneFor('emisor')).toBe('success')
    expect(toneFor('depende')).toBe('warning')
    expect(toneFor('nadie te lo devuelve')).toBe('error')
  })
})
