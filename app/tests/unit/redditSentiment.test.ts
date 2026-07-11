// app/tests/unit/redditSentiment.test.ts
import { describe, expect, it } from 'vitest'
import {
  REDDIT_ENTITIES,
  aggregateEntitySentiment,
  extractMentions,
  labelForNet,
  matchEntities,
  scoreText,
  themesFor,
  type RedditMention,
} from '../../utils/redditSentiment'

const mention = (over: Partial<RedditMention> = {}): RedditMention => ({
  id: over.id ?? 'c1',
  kind: over.kind ?? 'comment',
  text: over.text ?? '',
  score: over.score ?? 1,
  date: over.date ?? '2026-06-01',
  permalink: over.permalink ?? 'https://reddit.com/r/uruguay/comments/x/_/c1',
  sub: over.sub ?? 'uruguay',
  named: over.named,
})

describe('entity catalogue', () => {
  it('covers every entity of the tier list plus BTG', () => {
    const ids = REDDIT_ENTITIES.map(e => e.id)
    for (const id of [
      'mercadopago',
      'itau',
      'santander',
      'brou',
      'bbva',
      'takenos',
      'heritage',
      'astropay',
      'scotiabank',
      'prex',
      'btg',
    ]) {
      expect(ids, id).toContain(id)
    }
  })

  it('has unique ids and at least one query + pattern each', () => {
    const ids = REDDIT_ENTITIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of REDDIT_ENTITIES) {
      expect(e.queries.length, e.id).toBeGreaterThan(0)
      expect(e.patterns.length, e.id).toBeGreaterThan(0)
    }
  })
})

describe('matchEntities', () => {
  it('matches accented and unaccented spellings', () => {
    expect(matchEntities('el itaú me cobró de más')).toContain('itau')
    expect(matchEntities('Itau tiene la mejor app')).toContain('itau')
  })

  it('matches multi-word and glued brand names', () => {
    expect(matchEntities('uso mercado pago para todo')).toContain('mercadopago')
    expect(matchEntities('MercadoPago rinde más que el banco')).toContain('mercadopago')
  })

  it('does not read MercadoLibre rage as Mercado Pago sentiment', () => {
    // The marketplace and the wallet are different products; "cada vez peor ese sitio" is
    // about MercadoLibre and must not land on Mercado Pago's score.
    expect(matchEntities('cada vez peor ese sitio, MercadoLibre tiene el monopolio')).toEqual([])
  })

  it('matches Scotia as Scotiabank', () => {
    expect(matchEntities('me fui del Scotia por el servicio')).toContain('scotiabank')
  })

  it('matches BTG and keeps HSBC separate', () => {
    expect(matchEntities('BTG Pactual compró el HSBC')).toEqual(
      expect.arrayContaining(['btg', 'hsbc'])
    )
  })

  it('respects word boundaries (no substring false positives)', () => {
    // "brou" must not match inside another word, "prex" not inside "prexistente"
    expect(matchEntities('una condición prexistente')).not.toContain('prex')
    expect(matchEntities('el broucito no existe')).not.toContain('brou')
  })

  it('returns an empty array when no entity is mentioned', () => {
    expect(matchEntities('hoy llueve en Montevideo')).toEqual([])
  })
})

describe('extractMentions — sentence-level attribution', () => {
  const ids = (text: string, post: string[] = []) =>
    extractMentions(text, post).map(m => `${m.entityId}:${m.text}`)

  it('attributes each sentence to the bank that sentence names', () => {
    // The real failure this rule exists for: one comment ranting about several banks must
    // not put the Santander insult in Itaú's mouth.
    const out = extractMentions(
      'Santander es un asco, la app es horrible. Itaú en cambio anda joya.',
      []
    )
    const santander = out.filter(m => m.entityId === 'santander')
    const itau = out.filter(m => m.entityId === 'itau')
    expect(santander.some(m => /asco/.test(m.text))).toBe(true)
    expect(itau.some(m => /asco/.test(m.text))).toBe(false)
    expect(itau.some(m => /joya/.test(m.text))).toBe(true)
  })

  it('drops a sentence that names several banks — it belongs to nobody in particular', () => {
    expect(ids('el BROU es peor que el Itaú')).toEqual([])
  })

  it('carries the subject forward to the next sentence', () => {
    // "Santander. La app es una bosta." — the second sentence is still about Santander.
    const out = extractMentions('Tengo Santander hace años. La app es una bosta.', [])
    expect(out.some(m => m.entityId === 'santander' && /bosta/.test(m.text))).toBe(true)
  })

  it('inherits the thread subject when the comment names nobody and the thread is about ONE bank', () => {
    const out = extractMentions('la app es una bosta', ['bbva'])
    expect(out).toEqual([{ entityId: 'bbva', text: 'la app es una bosta', named: false }])
  })

  it('only inherits for sentences that are actually about banking', () => {
    // Real noise from the corpus: a thread about an Itaú loan drifts into the OP's
    // relationship, and "mi pareja es un amor / su familia es malísima" was being scored as
    // sentiment about Itaú. An inherited sentence must talk about a rubric dimension.
    const drift = extractMentions('mi pareja es un amor pero su familia es malísima', ['itau'])
    expect(drift).toEqual([])
    const onTopic = extractMentions('la comisión de mantenimiento es carísima', ['itau'])
    expect(onTopic.map(m => m.entityId)).toEqual(['itau'])
  })

  it('still keeps an off-topic sentence when it names the bank (it is on the record)', () => {
    const out = extractMentions('BBVA es lo peor que hay', [])
    expect(out.map(m => m.entityId)).toEqual(['bbva'])
  })

  it('drops an unattributable comment in a multi-bank thread rather than guessing', () => {
    expect(ids('es un desastre', ['brou', 'itau', 'santander'])).toEqual([])
  })

  it('drops a comment with no bank in a thread with no bank', () => {
    expect(ids('es un desastre', [])).toEqual([])
  })

  it('flags whether the sentence named the bank itself (only named ones are safe to quote)', () => {
    const named = extractMentions('la app de BBVA es una bosta', [])
    expect(named[0]?.named).toBe(true)
    const inherited = extractMentions('la app es una bosta', ['bbva'])
    expect(inherited[0]?.named).toBe(false)
  })
})

describe('scoreText', () => {
  it('scores clearly negative Uruguayan slang as negative', () => {
    expect(scoreText('la app es una bosta y se ve espantosa').polarity).toBeLessThan(0)
    expect(scoreText('pésimo servicio, una estafa').polarity).toBeLessThan(0)
  })

  it('scores praise as positive', () => {
    expect(scoreText('excelente app, la recomiendo, anda impecable').polarity).toBeGreaterThan(0)
  })

  it('handles negation: "no anda" is not positive', () => {
    expect(scoreText('no anda bien, nunca funciona').polarity).toBeLessThan(0)
  })

  it('flips a positive term after a negator', () => {
    const plain = scoreText('la app funciona').polarity
    const negated = scoreText('la app no funciona').polarity
    expect(plain).toBeGreaterThan(0)
    expect(negated).toBeLessThan(plain)
  })

  it('returns neutral (0) for text with no sentiment terms', () => {
    expect(scoreText('abrí la cuenta el martes').polarity).toBe(0)
  })

  it('reports which terms it matched, for auditability', () => {
    const res = scoreText('pésimo soporte pero la app es rápida')
    expect(res.matched.length).toBeGreaterThan(0)
    expect(res.matched.some(m => m.term === 'pésimo')).toBe(true)
  })

  it('is case- and accent-insensitive', () => {
    expect(scoreText('PESIMO servicio').polarity).toBe(scoreText('pésimo servicio').polarity)
  })
})

describe('themesFor', () => {
  it('tags the dimension a comment is really about', () => {
    expect(themesFor('la app se cuelga cada vez que actualizo')).toContain('app')
    expect(themesFor('me cobraron una comisión de mantenimiento carísima')).toContain('comisiones')
    expect(themesFor('el call center no atiende nunca')).toContain('atencion')
    expect(themesFor('para cobrar en dólares del exterior')).toContain('usd')
    expect(themesFor('no hay cajeros cerca de casa')).toContain('cobertura')
  })

  it('returns an empty array when no theme is detectable', () => {
    expect(themesFor('buenas, alguien sabe?')).toEqual([])
  })
})

describe('labelForNet', () => {
  it('maps the net score onto the published labels', () => {
    expect(labelForNet(60, 10)).toBe('muy positivo')
    expect(labelForNet(25, 10)).toBe('positivo')
    expect(labelForNet(0, 10)).toBe('mixto')
    expect(labelForNet(-25, 10)).toBe('negativo')
    expect(labelForNet(-60, 10)).toBe('muy negativo')
  })

  it('refuses to label on a thin sample — absence of chatter is not evidence', () => {
    // The count that matters is OPINIONS, not mentions: a bank named 500 times in passing
    // and judged twice has not been judged by Reddit.
    expect(labelForNet(-90, 2)).toBe('sin datos')
  })
})

describe('aggregateEntitySentiment', () => {
  it('returns a "sin datos" entity when there are no mentions', () => {
    const agg = aggregateEntitySentiment('bbva', [])
    expect(agg.mentions).toBe(0)
    expect(agg.label).toBe('sin datos')
    expect(agg.net).toBe(0)
    expect(agg.quotes).toEqual([])
  })

  it('counts positives, negatives and neutrals', () => {
    const agg = aggregateEntitySentiment('prex', [
      mention({ id: 'a', text: 'pésimo soporte, una estafa' }),
      mention({ id: 'b', text: 'me robaron la plata, horrible' }),
      mention({ id: 'c', text: 'excelente, la recomiendo' }),
      mention({ id: 'd', text: 'abrí la cuenta el martes' }),
    ])
    expect(agg.mentions).toBe(4)
    expect(agg.negative).toBe(2)
    expect(agg.positive).toBe(1)
    expect(agg.neutral).toBe(1)
    expect(agg.opinions).toBe(3)
    expect(agg.net).toBeLessThan(0)
  })

  it('does not let neutral chatter dilute the verdict towards "mixto"', () => {
    // The bug this guards: a bank named 200 times in passing and slated by everyone who
    // actually judged it must NOT come out neutral. Net is a mean over OPINIONS.
    const opinions = Array.from({ length: 8 }, (_, i) =>
      mention({ id: `neg${i}`, text: 'pésimo soporte, una estafa' })
    )
    const chatter = Array.from({ length: 200 }, (_, i) =>
      mention({ id: `n${i}`, text: 'alguien sabe el horario de la sucursal?' })
    )
    const agg = aggregateEntitySentiment('prex', [...opinions, ...chatter])
    expect(agg.neutral).toBe(200)
    expect(agg.net).toBeLessThan(-45)
    expect(agg.label).toBe('muy negativo')
  })

  it('says "sin datos" when a bank is much-named but barely judged', () => {
    const agg = aggregateEntitySentiment('heritage', [
      ...Array.from({ length: 150 }, (_, i) =>
        mention({ id: `n${i}`, text: 'lo nombraron en el hilo' })
      ),
      mention({ id: 'o1', text: 'excelente atención' }),
    ])
    expect(agg.mentions).toBe(151)
    expect(agg.opinions).toBe(1)
    expect(agg.label).toBe('sin datos')
  })

  it('weights upvoted comments more than ignored ones', () => {
    const loudNegative = aggregateEntitySentiment('x', [
      mention({ id: 'a', text: 'pésimo, una estafa', score: 200 }),
      mention({ id: 'b', text: 'excelente, la recomiendo', score: 1 }),
    ])
    const loudPositive = aggregateEntitySentiment('x', [
      mention({ id: 'a', text: 'pésimo, una estafa', score: 1 }),
      mention({ id: 'b', text: 'excelente, la recomiendo', score: 200 }),
    ])
    expect(loudNegative.net).toBeLessThan(loudPositive.net)
  })

  it('weights recent mentions more than stale ones', () => {
    const recentNegative = aggregateEntitySentiment(
      'x',
      [
        mention({ id: 'a', text: 'pésimo, una estafa', date: '2026-07-01' }),
        mention({ id: 'b', text: 'excelente, la recomiendo', date: '2019-01-01' }),
      ],
      { now: new Date('2026-07-11T00:00:00Z') }
    )
    const staleNegative = aggregateEntitySentiment(
      'x',
      [
        mention({ id: 'a', text: 'pésimo, una estafa', date: '2019-01-01' }),
        mention({ id: 'b', text: 'excelente, la recomiendo', date: '2026-07-01' }),
      ],
      { now: new Date('2026-07-11T00:00:00Z') }
    )
    expect(recentNegative.net).toBeLessThan(staleNegative.net)
  })

  it('keeps net inside -100..100', () => {
    const agg = aggregateEntitySentiment(
      'x',
      Array.from({ length: 50 }, (_, i) =>
        mention({ id: `n${i}`, text: 'pésimo horrible estafa una bosta', score: 500 })
      )
    )
    expect(agg.net).toBeGreaterThanOrEqual(-100)
    expect(agg.net).toBeLessThanOrEqual(100)
  })

  it('surfaces the most upvoted quote of each polarity, with its permalink', () => {
    const agg = aggregateEntitySentiment('x', [
      mention({ id: 'a', text: 'pésimo soporte', score: 5, permalink: 'https://r/a' }),
      mention({
        id: 'b',
        text: 'una estafa, horrible, me robaron',
        score: 99,
        permalink: 'https://r/b',
      }),
      mention({ id: 'c', text: 'excelente, la recomiendo', score: 40, permalink: 'https://r/c' }),
    ])
    const neg = agg.quotes.find(q => q.polarity < 0)
    const pos = agg.quotes.find(q => q.polarity > 0)
    expect(neg?.permalink).toBe('https://r/b')
    expect(pos?.permalink).toBe('https://r/c')
  })

  it('never quotes a sentence that did not name the bank, even though it still scores it', () => {
    // Real leak this guards: "recomiendo la web Deku deals para ofertas de juegos" sat inside a
    // Santander thread, passed the theme filter, and got published as a quote about Santander.
    const agg = aggregateEntitySentiment('santander', [
      mention({ id: 'a', text: 'recomiendo la web Deku deals, 10/10', named: false, score: 50 }),
      mention({ id: 'b', text: 'la app de Santander es un desastre', named: true, score: 5 }),
    ])
    expect(agg.opinions).toBe(2) // both still count towards the number
    expect(agg.quotes).toHaveLength(1) // but only the one that named the bank is publishable
    expect(agg.quotes[0]!.text).toContain('Santander')
  })

  it('never emits a quote without a permalink (we always cite)', () => {
    const agg = aggregateEntitySentiment('x', [
      mention({ id: 'a', text: 'una bosta', permalink: '' }),
      mention({ id: 'b', text: 'excelente', permalink: 'https://r/b' }),
    ])
    for (const q of agg.quotes) expect(q.permalink).toBeTruthy()
  })

  it('ranks themes by how often they come up', () => {
    const agg = aggregateEntitySentiment('x', [
      mention({ id: 'a', text: 'la app se cuelga' }),
      mention({ id: 'b', text: 'la app es lenta' }),
      mention({ id: 'c', text: 'me cobraron comisión' }),
    ])
    expect(agg.themes[0]?.theme).toBe('app')
    expect(agg.themes[0]?.count).toBe(2)
  })

  it('caps the number of quotes so the UI stays scannable', () => {
    const agg = aggregateEntitySentiment(
      'x',
      Array.from({ length: 40 }, (_, i) =>
        mention({ id: `q${i}`, text: i % 2 ? 'excelente app' : 'pésimo soporte', score: i })
      )
    )
    expect(agg.quotes.length).toBeLessThanOrEqual(6)
  })
})
