// app/tests/unit/scamRadar.test.ts
//
// The tests that matter here are the ones about what we REFUSE to publish. Everything else is
// counting.
import { describe, expect, it } from 'vitest'
import {
  MIN_REPORTS,
  SCAM_PATTERNS,
  buildRadar,
  classifyScam,
  isSafeToQuote,
  looksLikeReport,
  type ScamMention,
} from '../../utils/scamRadar'

const m = (over: Partial<ScamMention> = {}): ScamMention => ({
  id: over.id ?? 'x',
  text: over.text ?? '',
  date: over.date ?? '2026-07-01',
  permalink: over.permalink ?? 'https://reddit.com/r/uruguay/comments/a/_/1',
  sub: over.sub ?? 'uruguay',
  score: over.score ?? 1,
})

describe('classifyScam', () => {
  it('recognises the phishing playbook', () => {
    expect(classifyScam('me llamaron del banco y les di el código que me llegó por SMS')).toContain(
      'phishing'
    )
  })

  it('recognises a cloned card', () => {
    expect(classifyScam('aparecieron compras que no hice, me clonaron la tarjeta')).toContain(
      'clonacion'
    )
  })

  it('recognises the marketplace scam', () => {
    expect(classifyScam('le transferí y nunca me llegó nada, el vendedor desapareció')).toContain(
      'marketplace'
    )
  })

  it('recognises a ponzi pitch', () => {
    expect(classifyScam('me prometían 8% mensual garantizado en dólares')).toContain('inversion')
  })

  it('returns nothing for an ordinary complaint', () => {
    expect(classifyScam('la app del banco anda lenta')).toEqual([])
  })
})

describe('isSafeToQuote — the guard that keeps us out of court', () => {
  it('refuses any fragment that names a company', () => {
    // This is the whole point. A redditor accusing a named company is exactly the sentence we
    // must not republish: they are anonymous, so the art. 336 defence does not cover us.
    expect(isSafeToQuote('me estafaron con una transferencia y el Santander no hizo nada')).toBe(
      false
    )
    expect(
      isSafeToQuote('Prex me bloqueó la cuenta y se quedó con mi plata, son unos chorros')
    ).toBe(false)
    expect(isSafeToQuote('Conexión Ganadera se llevó los ahorros de mi familia entera')).toBe(false)
  })

  it('refuses links and handles', () => {
    expect(isSafeToQuote('cuidado con esta web https://estafa.com que te roba los datos ya')).toBe(
      false
    )
    expect(isSafeToQuote('me escribió u/scammer123 ofreciendo un trabajo que era mentira')).toBe(
      false
    )
  })

  it('allows a fragment that explains the mechanism and names nobody', () => {
    expect(
      isSafeToQuote(
        'me mandaron un SMS diciendo que tenía que validar la cuenta y era una web falsa'
      )
    ).toBe(true)
  })

  it('refuses fragments too short or too long to be a fair quote', () => {
    expect(isSafeToQuote('me estafaron')).toBe(false)
    expect(isSafeToQuote('a'.repeat(300))).toBe(false)
  })
})

describe('buildRadar', () => {
  const phishing = (date: string, text = 'me llamaron del banco y me pidieron el código por SMS') =>
    m({ text, date, permalink: `https://reddit.com/x/${date}` })

  it('hides a pattern with too few reports — a handful of anecdotes is not a trend', () => {
    const radar = buildRadar([phishing('2026-07-01'), phishing('2026-06-01')])
    expect(radar).toHaveLength(0)
    expect(MIN_REPORTS).toBe(5)
  })

  it('publishes a pattern once enough people report it', () => {
    const radar = buildRadar([
      phishing('2026-07-01'),
      phishing('2026-06-20'),
      phishing('2026-06-10'),
      phishing('2026-06-05'),
      phishing('2026-06-01'),
    ])
    expect(radar).toHaveLength(1)
    expect(radar[0]!.id).toBe('phishing')
    expect(radar[0]!.reports).toBe(5)
    expect(radar[0]!.threads.length).toBeGreaterThan(0)
  })

  it('counts what is RECENT separately from the total', () => {
    const radar = buildRadar(
      [
        phishing('2026-07-01'),
        phishing('2026-06-20'),
        phishing('2026-06-15'),
        phishing('2026-06-10'),
        phishing('2020-01-01'),
      ],
      { now: new Date('2026-07-11T00:00:00Z') }
    )
    expect(radar[0]!.reports).toBe(5)
    expect(radar[0]!.recent).toBe(4) // the 2020 one is not "this week's" anything
  })

  it('sorts by what is happening NOW, not by all-time volume', () => {
    const old = 'me clonaron la tarjeta y aparecieron compras que no hice'
    const mentions = [
      // clonación: lots of reports, all ancient
      ...Array.from({ length: 9 }, (_, i) => m({ text: old, date: '2019-01-0' + (i + 1) })),
      // phishing: fewer, but current
      phishing('2026-07-01'),
      phishing('2026-06-25'),
      phishing('2026-06-20'),
      phishing('2026-06-15'),
      phishing('2026-06-10'),
    ]
    const radar = buildRadar(mentions, { now: new Date('2026-07-11T00:00:00Z') })
    expect(radar[0]!.id).toBe('phishing')
  })

  it('never publishes a quote that names a company, even when the report does', () => {
    const dirty = 'el Santander no me devolvió nada después de que me clonaron la tarjeta ok'
    const clean = 'me clonaron la tarjeta y aparecieron consumos que no hice, chiquitos, de prueba'
    const radar = buildRadar([
      m({ text: dirty, date: '2026-07-01', permalink: 'https://r/1' }),
      m({ text: dirty, date: '2026-06-05', permalink: 'https://r/2' }),
      m({ text: dirty, date: '2026-06-04', permalink: 'https://r/4' }),
      m({ text: dirty, date: '2026-06-03', permalink: 'https://r/5' }),
      m({ text: clean, date: '2026-05-01', permalink: 'https://r/3' }),
    ])
    const quotes = radar[0]!.quotes.map(q => q.text)
    expect(quotes.some(q => /santander/i.test(q))).toBe(false)
    // the thread is still linked — the reader can go read it themselves
    expect(radar[0]!.threads.length).toBeGreaterThan(0)
  })

  it('every published quote carries its permalink', () => {
    const radar = buildRadar(
      Array.from({ length: 6 }, (_, i) =>
        m({
          text: 'me mandaron un SMS pidiendo que validara la cuenta, era una web falsa igualita',
          date: `2026-07-0${i + 1}`,
          permalink: `https://r/${i}`,
        })
      )
    )
    for (const q of radar[0]!.quotes) expect(q.permalink).toBeTruthy()
  })
})

describe('pattern catalogue', () => {
  it('gives every pattern a defence — the reason the page exists', () => {
    for (const p of SCAM_PATTERNS) {
      expect(p.how.length, p.id).toBeGreaterThan(40)
      expect(p.defence.length, p.id).toBeGreaterThan(40)
      expect(p.matchers.length, p.id).toBeGreaterThan(0)
    }
  })

  it('has unique ids', () => {
    const ids = SCAM_PATTERNS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('looksLikeReport — a quote must be an account, not an opinion', () => {
  it('rejects advice about the topic', () => {
    // Real corpus leak: "usá Apple Pay para evitar la clonación" is a tip, not a report.
    expect(
      looksLikeReport(
        'clave en los viajes: usar la tarjeta desde Apple Pay para evitar la clonación'
      )
    ).toBe(false)
  })

  it('rejects a first-person account of nothing happening', () => {
    // Also real: quoting this under "reportes" would say the opposite of what the person said.
    expect(looksLikeReport('a mi jamás me clonaron una tarjeta, la tengo hace más de 5 años')).toBe(
      false
    )
    expect(looksLikeReport('a mí nunca me estafaron con eso')).toBe(false)
  })

  it('accepts a first-hand account of the thing happening', () => {
    expect(looksLikeReport('me llamaron diciendo que eran del banco y me pidieron el código')).toBe(
      true
    )
    expect(looksLikeReport('transferí y nunca me llegó el producto, perdí la plata')).toBe(true)
  })
})
