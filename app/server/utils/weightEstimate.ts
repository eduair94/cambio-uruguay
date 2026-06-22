// Server-only AI weight estimator for the import cart. Marketplaces rarely expose
// shipping weight, so we ask the configured model for a rough figure and parse it
// to kilograms with the pure `parseWeightKg`. Best-effort: returns null when the
// AI isn't configured or the reply has no usable weight (the UI falls back to a
// manual field).
import { parseWeightKg } from '../../utils/weightEstimate'
import { chatTextWithFallback } from './ai'

const SYSTEM =
  'You estimate the typical shipping weight (product plus packaging) of consumer products for international courier shipping. Reply with ONLY a single number followed by a unit, for example "0.5 kg" or "800 g". Do not explain.'

/** Estimate a product's shipping weight (kg) from its name, or null. */
export async function estimateWeightKg(name: string): Promise<number | null> {
  const clean = name.trim().slice(0, 200)
  if (!clean) return null
  const text = await chatTextWithFallback({
    system: SYSTEM,
    user: `Estimated shipping weight of: ${clean}`,
    maxTokens: 32,
    temperature: 0.2,
  })
  return parseWeightKg(text)
}
