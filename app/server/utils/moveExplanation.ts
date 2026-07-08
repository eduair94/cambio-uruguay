import { connectDb } from './db'
import { MoveExplanationModel } from '../models/MoveExplanation'
import { buildAnalysis, loadDriverSeries } from './analysis'
import { attributeMove } from '../../utils/attribution'
import { montevideoToday } from '../../utils/blog'
import { chatTextWithFallback } from './ai'

/**
 * If today is a notable move day for `currency`, upsert its MoveExplanation:
 * numeric attribution (always, computed from real driver data — never
 * hand-typed), today's archived headlines when available (only ever
 * populated for USD — the archived feed is Uruguay dollar/economy news, not
 * currency-specific), and a best-effort AI narrative grounded purely in the
 * measured attribution (never fabricates headlines). No-ops if today isn't a
 * notable move. Idempotent — safe to call repeatedly (e.g. re-running the
 * daily task).
 */
export async function recordTodayExplanation(
  currency: string
): Promise<{ recorded: boolean; date: string }> {
  await connectDb()
  const asOf = montevideoToday()

  const [{ moves, headlines, correlations }, driverSeries] = await Promise.all([
    buildAnalysis(currency),
    loadDriverSeries(currency),
  ])

  const today = moves.find(m => m.date === asOf)
  if (!today) return { recorded: false, date: asOf }

  const attribution = attributeMove(asOf, driverSeries).slice(0, 5)
  const drivers = attribution.map(d => ({ key: d.key, dayMovePct: d.dayMovePct }))
  void correlations // available if a future task wants to persist `r` too

  const directionWord = today.direction === 'down' ? 'bajó' : 'subió'
  const driverLines = attribution
    .map(d => `${d.key} ${d.dayMovePct >= 0 ? '+' : ''}${d.dayMovePct.toFixed(2)}%`)
    .join(', ')
  const narrative = await chatTextWithFallback({
    system:
      'Sos un analista financiero que explica movimientos cambiarios en Uruguay en 2-3 frases claras, en español, sin inventar datos ni noticias.',
    user: `El ${currency}/UYU ${directionWord} ${Math.abs(today.pctChange).toFixed(2)}% el ${asOf}. Ese día se movieron estos indicadores: ${driverLines || 'sin datos de drivers disponibles'}. Explicá brevemente qué pudo influir, basándote solo en estos datos (correlación, no causalidad; no afirmes causas que no estén en los datos).`,
  }).catch(() => null)

  await MoveExplanationModel.updateOne(
    { currency, date: asOf },
    {
      $set: {
        pctChange: today.pctChange,
        direction: today.direction,
        drivers,
        narrative,
        headlines,
      },
    },
    { upsert: true }
  )
  return { recorded: true, date: asOf }
}
