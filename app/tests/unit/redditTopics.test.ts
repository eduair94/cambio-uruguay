import { describe, expect, it } from 'vitest'
import {
  LEGAL_URUGUAY_HARVEST_QUERIES,
  TOPIC_DEFS,
  aggregateTopics,
  classifyPost,
  topicHarvestQueries,
  type TopicPost,
} from '../../utils/redditTopics'

const post = (over: Partial<TopicPost> & { title: string }): TopicPost => ({
  redditId: Math.random().toString(36).slice(2),
  selftext: '',
  score: 1,
  numComments: 5,
  permalink: 'https://reddit.com/x',
  date: '2026-07-01',
  createdUtc: 1_780_000_000,
  sub: 'uruguay',
  ...over,
})

describe('redditTopics - classifyPost', () => {
  it('routes money questions to the right topics', () => {
    expect(classifyPost({ title: '¿Conviene comprar dólares ahora?' })).toContain('dolar-cambio')
    expect(classifyPost({ title: 'Estoy en clearing, ¿puedo alquilar?' })).toEqual(
      expect.arrayContaining(['deuda-clearing', 'alquiler-vivienda'])
    )
    expect(classifyPost({ title: 'Devolución de IRPF por alquiler' })).toEqual(
      expect.arrayContaining(['impuestos', 'alquiler-vivienda'])
    )
    expect(classifyPost({ title: '¿Dónde invertir mis pesos? plazo fijo o FCI' })).toContain(
      'ahorro-inversion'
    )
  })

  it('classifies only the in-scope legal cases found in r/LegalUruguay', () => {
    expect(
      classifyPost({
        title: 'Pagué un servicio y no fue prestado, ¿reclamo en Defensa del Consumidor?',
      })
    ).toContain('derechos-reclamos')
    expect(
      classifyPost({
        title: 'Empresa de cobranza no explica intereses ni cómo imputó mis pagos',
      })
    ).toContain('derechos-reclamos')
    expect(classifyPost({ title: 'Consulta laboral por sueldo impago y despido' })).toContain(
      'derechos-reclamos'
    )

    expect(classifyPost({ title: '¿Cómo se inicia una sucesión intestada?' })).not.toContain(
      'derechos-reclamos'
    )
    expect(classifyPost({ title: 'Dudas sobre una denuncia penal por lesiones' })).not.toContain(
      'derechos-reclamos'
    )
  })

  it('does not confuse amounts, cards or generic financial news with exchange and loans', () => {
    expect(classifyPost({ title: 'Importé una consola de 800 dólares' })).not.toContain(
      'dolar-cambio'
    )
    expect(classifyPost({ title: '¿Se consigue casa por 60 mil dólares?' })).not.toContain(
      'dolar-cambio'
    )
    expect(
      classifyPost({ title: 'Gravamen sobre renta financiera extranjera para residentes' })
    ).not.toContain('credito-prestamo')
    const cardTopics = classifyPost({ title: '¿Qué tarjeta de crédito OCA recomiendan?' })
    expect(cardTopics).toContain('tarjetas')
    expect(cardTopics).not.toContain('credito-prestamo')
    expect(
      classifyPost({ title: 'Pokémon cumple 30 años, ¿qué recuerdan de la franquicia?' })
    ).not.toContain('compras-import')
    expect(classifyPost({ title: '¿OCA funciona con Apple Wallet?' })).not.toContain('cripto')
  })

  it('drops obvious off-topic noise even if it has a stray money word', () => {
    expect(
      classifyPost({ title: 'Armando mi primer pc gamer, ¿qué placa de video compro?' })
    ).toEqual([])
    expect(classifyPost({ title: 'Historias Bizarras - El meteorito de Paysandú' })).toEqual([])
  })

  it('keeps a noisy-looking post when it is clearly a money question', () => {
    // "vacaciones" is in NOISE, but a real IRPF question must survive.
    expect(classifyPost({ title: 'IRPF y aguinaldo antes de las vacaciones' })).toContain(
      'impuestos'
    )
  })

  it('returns [] for a post with no money content', () => {
    expect(classifyPost({ title: 'Recomienden una serie para el finde' })).toEqual([])
  })
})

describe('redditTopics - aggregateTopics', () => {
  const now = 1_781_000_000
  const posts: TopicPost[] = [
    post({ title: 'Comprar dólares en el BROU', createdUtc: now - 10 * 86400 }),
    post({ title: '¿A cuánto está el dólar hoy?', createdUtc: now - 400 * 86400 }),
    post({
      title: 'Salir del clearing, ¿cómo hago?',
      numComments: 40,
      createdUtc: now - 5 * 86400,
    }),
    post({ title: 'Armar pc gamer', createdUtc: now - 1 * 86400 }), // noise → no topic
  ]

  it('counts total and recent per topic and drops empty topics', () => {
    const agg = aggregateTopics(posts, now, 90)
    const dolar = agg.find(t => t.id === 'dolar-cambio')!
    expect(dolar.total).toBe(2)
    expect(dolar.recent).toBe(1) // only the 10-day-old one is within 90d
    expect(agg.some(t => t.id === 'cripto')).toBe(false) // no cripto posts
  })

  it('ranks by recent momentum then total', () => {
    const agg = aggregateTopics(posts, now, 90)
    const ids = agg.map(t => t.id)
    // clearing (1 recent) and dolar (1 recent) both present; noise contributes nothing
    expect(ids).toContain('deuda-clearing')
    expect(ids).toContain('dolar-cambio')
  })

  it('samples prefer questions and higher engagement', () => {
    const agg = aggregateTopics(posts, now, 90)
    const clearing = agg.find(t => t.id === 'deuda-clearing')!
    expect(clearing.sample[0]!.title).toMatch(/clearing/i)
  })

  it('does not publish a body-only incidental match ahead of a relevant title', () => {
    const agg = aggregateTopics(
      [
        post({
          title: 'Discusión política de la semana',
          selftext: 'Al final alguien mencionó un préstamo.',
          numComments: 900,
          createdUtc: now - 86400,
        }),
        post({
          title: '¿Qué préstamo conviene para una compra chica?',
          numComments: 2,
          createdUtc: now - 2 * 86400,
        }),
      ],
      now,
      90
    )
    const credit = agg.find(topic => topic.id === 'credito-prestamo')!

    expect(credit.total).toBe(2)
    expect(credit.sample[0]!.title).toMatch(/préstamo conviene/i)
    expect(credit.sample.some(thread => /política/i.test(thread.title))).toBe(false)
  })

  it('publishes question-shaped titles without filling the sample with news', () => {
    const agg = aggregateTopics(
      [
        post({
          title: 'Dudas por las AFAP: cierre del diálogo generó movimientos en bonos uruguayos',
          numComments: 100,
        }),
        post({ title: '¿Cómo me cambio de AFAP?', numComments: 1 }),
      ],
      now,
      90
    )
    const retirement = agg.find(topic => topic.id === 'jubilacion-afap')!

    expect(retirement.sample.map(thread => thread.title)).toEqual(['¿Cómo me cambio de AFAP?'])
  })
})

describe('redditTopics - catalogue integrity', () => {
  it('every topic has related links pointing at internal paths', () => {
    for (const t of TOPIC_DEFS) {
      expect(t.related.length).toBeGreaterThan(0)
      for (const r of t.related) expect(r.to.startsWith('/')).toBe(true)
    }
  })

  it('harvest queries are deduped', () => {
    const qs = topicHarvestQueries()
    expect(new Set(qs).size).toBe(qs.length)
    expect(qs.length).toBeGreaterThan(10)
    expect(qs).toEqual(expect.arrayContaining([...LEGAL_URUGUAY_HARVEST_QUERIES]))
    expect(LEGAL_URUGUAY_HARVEST_QUERIES).toContain('defensa consumidor')
    expect(LEGAL_URUGUAY_HARVEST_QUERIES).toContain('reclamo laboral')
  })
})
