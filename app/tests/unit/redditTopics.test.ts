import { describe, expect, it } from 'vitest'
import {
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
  })
})
