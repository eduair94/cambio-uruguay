// Las cuentas que hace /estadisticas-reddit sobre la foto del bot.
//
// La página publica números sobre una cuenta que comenta sola en comunidades ajenas, así que lo que
// más importa acá no es que las divisiones den bien: es QUÉ se decide publicar. La tasa de respuesta
// es baja a propósito y se muestra igual, porque el número que la reemplazaría —"contestó 300
// preguntas"— invita justo a la lectura contraria: que la cuenta comenta en todo lo que se mueve.
import { describe, expect, it } from 'vitest'
import {
  BOT_RULES,
  EMPTY_TOTALS,
  answerRate,
  averageScore,
  explainReason,
  lastDays,
  survivalRate,
} from '../../utils/redditStats'

const totals = (over: Partial<typeof EMPTY_TOTALS> = {}) => ({ ...EMPTY_TOTALS, ...over })

describe('redditStats - proporciones', () => {
  it('la tasa de respuesta es sobre lo leído, no sobre lo contestable', () => {
    expect(answerRate(totals({ answered: 3, evaluated: 300 }))).toBeCloseTo(1)
  })

  it('la supervivencia es sobre lo publicado', () => {
    expect(survivalRate(totals({ answered: 10, alive: 8 }))).toBe(80)
  })

  it('ninguna divide por cero el primer día', () => {
    // El día del estreno todos los denominadores son 0. Un NaN en la portada de una página de
    // transparencia es peor que un cero.
    expect(answerRate(EMPTY_TOTALS)).toBe(0)
    expect(survivalRate(EMPTY_TOTALS)).toBe(0)
    expect(averageScore(EMPTY_TOTALS)).toBe(0)
  })

  it('el voto promedio admite negativos, que es cuando importa', () => {
    expect(averageScore(totals({ answered: 4, score: -6 }))).toBe(-1.5)
  })
})

describe('redditStats - la serie diaria', () => {
  const day = (date: string, posted: number) => ({
    date,
    posted,
    rejected: 0,
    gaps: 0,
    score: 0,
    removed: 0,
  })

  it('rellena los días sin actividad', () => {
    // Un gráfico que sólo dibuja los días con filas miente sobre la cadencia: tres comentarios en
    // tres días seguidos y tres en tres semanas se verían idénticos.
    const series = lastDays([day('2026-08-19', 2)], 5, new Date('2026-08-19T12:00:00Z'))
    expect(series).toHaveLength(5)
    expect(series.map(d => d.date)).toEqual([
      '2026-08-15',
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
    ])
    expect(series.at(-1)!.posted).toBe(2)
    expect(series[0]!.posted).toBe(0)
  })

  it('termina hoy y va en orden cronológico', () => {
    const series = lastDays([], 3, new Date('2026-08-19T00:00:00Z'))
    expect(series.at(-1)!.date).toBe('2026-08-19')
    expect([...series].sort((a, b) => a.date.localeCompare(b.date))).toEqual(series)
  })

  it('ignora los días de la foto que caen fuera de la ventana', () => {
    const series = lastDays([day('2026-01-01', 9)], 3, new Date('2026-08-19T00:00:00Z'))
    expect(series.some(d => d.posted === 9)).toBe(false)
  })
})

describe('redditStats - los motivos se explican en castellano', () => {
  it('traduce los códigos internos', () => {
    expect(explainReason('filter:off_topic')).toBe('No era una pregunta de plata')
    expect(explainReason('gap:weak_match')).toContain('no tiene una página')
  })

  it('agrupa las familias con sufijo variable', () => {
    // `invalid_invented_number` llega con el número pegado, y `limit:` con el detalle del tope.
    expect(explainReason('invalid_invented_number')).toContain('sin fuente')
    expect(explainReason('limit:page_cooldown')).toContain('topes de volumen')
  })

  it('un motivo desconocido se muestra tal cual en vez de desaparecer', () => {
    // Tragarse lo que no reconoce convertiría un motivo nuevo en una fila vacía en la página, que es
    // exactamente cuando más interesa verlo.
    expect(explainReason('motivo_nuevo_que_nadie_previo')).toBe('motivo_nuevo_que_nadie_previo')
  })
})

describe('redditStats - las reglas publicadas', () => {
  it('dice las tres que sostienen todo lo demás', () => {
    const text = BOT_RULES.map(r => `${r.title} ${r.body}`)
      .join(' ')
      .toLowerCase()
    expect(text).toContain('nunca abre hilos')
    expect(text).toContain('perfil')
    expect(text).toContain('sin fuente')
  })

  it('cada regla tiene ícono, título y explicación', () => {
    for (const rule of BOT_RULES) {
      expect(rule.icon).toMatch(/^mdi-/)
      expect(rule.title.length).toBeGreaterThan(8)
      expect(rule.body.length).toBeGreaterThan(40)
    }
  })
})
