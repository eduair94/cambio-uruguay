import { connectDb } from './db'
import { MoveExplanationModel } from '../models/MoveExplanation'
import { buildAnalysis, loadDriverSeries } from './analysis'
import { attributeMove } from '../../utils/attribution'
import { montevideoToday } from '../../utils/blog'
import { chatTextWithFallback } from './ai'
import { searchMoveNews } from './geminiNews'

/**
 * If today (or `asOfOverride`) is a notable move day for `currency`, upsert
 * its MoveExplanation. Tries a live Gemini-grounded news search first (real
 * cited headlines + a narrative grounded in them); falls back to the
 * original path — archived-feed headlines (USD only) + an AI narrative
 * built purely from measured attribution — when Gemini is unconfigured,
 * fails, or finds nothing real. No-ops if the target date isn't a notable
 * move. Idempotent — safe to call repeatedly (e.g. re-running the daily
 * task). `asOfOverride` exists only so manual/local verification can target
 * a known historical date instead of the real current day; the production
 * caller (`server/tasks/drivers/daily.ts`) never passes it.
 */
export async function recordTodayExplanation(
  currency: string,
  asOfOverride?: string
): Promise<{ recorded: boolean; date: string }> {
  await connectDb()
  const asOf = asOfOverride ?? montevideoToday()

  const [{ moves, headlines, correlations }, driverSeries] = await Promise.all([
    buildAnalysis(currency),
    loadDriverSeries(currency),
  ])

  const today = moves.find(m => m.date === asOf)
  if (!today) return { recorded: false, date: asOf }

  const attribution = attributeMove(asOf, driverSeries).slice(0, 5)
  const drivers = attribution.map(d => ({ key: d.key, dayMovePct: d.dayMovePct }))
  void correlations // available if a future task wants to persist `r` too

  const grounded = await searchMoveNews(currency, asOf, today.pctChange, today.direction, drivers)

  let narrative: string | null
  let storedHeadlines: { title: string; source: string; link: string }[]

  if (grounded) {
    narrative = grounded.narrative
    storedHeadlines = grounded.headlines
  } else {
    const directionWord = today.direction === 'down' ? 'bajó' : 'subió'
    const driverLines = attribution
      .map(d => `${d.key} ${d.dayMovePct >= 0 ? '+' : ''}${d.dayMovePct.toFixed(2)}%`)
      .join(', ')
    narrative = await chatTextWithFallback({
      system:
        'Sos un analista financiero que explica movimientos cambiarios en Uruguay en 2-3 frases claras, en español, sin inventar datos ni noticias.',
      user: `El ${currency}/UYU ${directionWord} ${Math.abs(today.pctChange).toFixed(2)}% el ${asOf}. Ese día se movieron estos indicadores: ${driverLines || 'sin datos de drivers disponibles'}. Explicá brevemente qué pudo influir, basándote solo en estos datos (correlación, no causalidad; no afirmes causas que no estén en los datos).`,
    }).catch(() => null)
    // buildAnalysis's headlines carry an extra `pubDate` field that
    // MoveExplanationDoc doesn't declare — strip it explicitly rather than
    // relying on implicit Mongoose subdocument casting to drop it.
    storedHeadlines = headlines.map(h => ({ title: h.title, source: h.source, link: h.link }))
  }

  await MoveExplanationModel.updateOne(
    { currency, date: asOf },
    {
      $set: {
        pctChange: today.pctChange,
        direction: today.direction,
        drivers,
        narrative,
        headlines: storedHeadlines,
      },
    },
    { upsert: true }
  )
  return { recorded: true, date: asOf }
}
