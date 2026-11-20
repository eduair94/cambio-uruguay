import { describe, expect, it } from 'vitest'
import {
  scDemandColor,
  scDemandFailureSummary,
  scDemandLabel,
  scDemandRunSummary,
  scDemandWhy,
  type ScDemandItem,
  type ScDemandSerpRun,
} from '../../utils/searchDemand'
import { SearchDemandQueueModel } from '../../server/models/SearchDemandQueue'

const legacy: ScDemandItem = {
  query: 'consulta de prueba',
  topic: 'trabajo',
  rank: 0,
  coverage: 0,
  bestPath: null,
  score: 0.4,
  why: 'sin clasificar: no llegó al presupuesto de SERP, hay que mirarlo a mano',
}

describe('diagnóstico privado de demanda', () => {
  it('no reconstruye intentos ni causas de un snapshot anterior', () => {
    expect(scDemandLabel()).toBe('sin diagnóstico')
    expect(scDemandRunSummary()).not.toMatch(/0 intentos|presupuesto/)
    expect(scDemandWhy(legacy)).not.toMatch(/presupuesto/)
    expect(scDemandFailureSummary()).toBe('')
    expect(scDemandColor()).toBe('warning')
  })

  it('conserva un veredicto legacy válido y su motivo', () => {
    const item: ScDemandItem = {
      ...legacy,
      serp: {
        verdict: 'dudoso',
        reason: 'hueco no concluyente',
        calculators: 0,
        institutional: 0,
        weak: 0,
      },
      why: 'hueco no concluyente',
    }
    expect(scDemandLabel(item.serp?.verdict)).toBe('dudoso')
    expect(scDemandWhy(item)).toBe(item.why)
  })

  it('conserva el motivo legacy de una consulta que ya tiene posición conocida', () => {
    const item: ScDemandItem = {
      ...legacy,
      known: { impressions: 200, clicks: 3, position: 12 },
      score: 0.12,
      why: 'ya aparecés en posición 12.0 (200 impresiones, 3 clics): es de mejorar, no de escribir',
    }
    expect(scDemandWhy(item)).toBe(item.why)
    expect(scDemandLabel(item.serp?.verdict, item.serpCheck)).toBe('sin diagnóstico')
  })

  it('conserva el motivo legacy de cobertura alta aunque no se haya guardado un SERP', () => {
    const item: ScDemandItem = {
      ...legacy,
      coverage: 0.8,
      bestPath: '/guia-existente',
      score: 0.08,
      why: 'ya hay algo parecido en /guia-existente',
    }
    expect(scDemandWhy(item)).toBe(item.why)
    expect(scDemandLabel(item.serp?.verdict, item.serpCheck)).toBe('sin diagnóstico')
  })

  it('distingue una falla de presupuesto y de una etapa desactivada', () => {
    const failure: ScDemandItem = {
      ...legacy,
      why: 'sin clasificar: falló la evaluación del SERP',
      serpCheck: { status: 'failed', reason: 'http', httpStatus: 503 },
    }
    expect(scDemandLabel(undefined, failure.serpCheck)).toBe('falló la evaluación')
    expect(scDemandWhy(failure)).toContain('HTTP 503')
    expect(scDemandWhy(failure)).not.toMatch(/presupuesto|sin mirar/)
    expect(scDemandLabel(undefined, { status: 'not-attempted', reason: 'budget' })).toContain(
      'presupuesto'
    )
    expect(scDemandLabel(undefined, { status: 'not-attempted', reason: 'disabled' })).toBe(
      'etapa omitida'
    )
  })

  it('presenta los contadores de toda la etapa, no los candidatos de la tabla', () => {
    const run: ScDemandSerpRun = {
      startedAt: '2026-11-02T06:40:00.000Z',
      finishedAt: '2026-11-02T06:42:00.000Z',
      budget: 25,
      attempted: 25,
      failures: { http: 24, timeout: 1 },
      httpStatuses: { '503': 24 },
      notAttempted: { budget: 75, disabled: 0 },
    }
    expect(scDemandRunSummary(run)).toMatch(/25 intentos; 25 fallidos; 75 sin intento/)
    expect(scDemandFailureSummary(run)).toContain('HTTP 503: 24')
    expect(scDemandFailureSummary(run)).toContain('tiempo de espera agotado: 1')
  })

  it('no convierte los snapshots viejos en corridas con cero intentos al leer el modelo', () => {
    const doc = new SearchDemandQueueModel({ key: 'demand_queue', asOf: '2026-10-25' })
    expect(doc.validateSync()).toBeUndefined()
    expect(doc.toObject()).not.toHaveProperty('serpRun')
    expect(SearchDemandQueueModel.schema.path('serpRun').options.default).toBeUndefined()
    expect(SearchDemandQueueModel.schema.path('serpRun').options.required).not.toBe(true)
  })
})
