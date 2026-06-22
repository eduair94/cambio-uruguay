// Pure parsing for the AI product-weight estimate (used by the import cart's
// "estimate weight" action). The model is asked to reply with a number + unit;
// this extracts the first plausible weight and normalizes it to kilograms.
// PURE (no Vue/Nuxt/AI runtime) so it can be unit-tested; the server util
// `server/utils/weightEstimate.ts` calls the AI and feeds the text here.
import { round } from './calculators'

/** Plausible shipping-weight ceiling (kg). Courier max is 20 kg; allow headroom. */
const MAX_PLAUSIBLE_KG = 100

const UNIT_RE =
  /(\d+(?:[.,]\d+)?)\s*(kilogramos|kilograms|kilogram|kilos|kilo|kgs|kg|gramos|grams|gram|gr|g|pounds|pound|lbs|lb|ounces|ounce|oz)\b/gi

/** kg multiplier for a (lower-cased) unit token, or null if unrecognized. */
function unitFactor(unit: string): number | null {
  if (unit.startsWith('kil') || unit === 'kg' || unit === 'kgs') return 1
  if (unit.startsWith('gram') || unit === 'gramos' || unit === 'g' || unit === 'gr') return 0.001
  if (unit.startsWith('pound') || unit === 'lb' || unit === 'lbs') return 0.453592
  if (unit.startsWith('ounce') || unit === 'oz') return 0.0283495
  return null
}

/**
 * Extract the first plausible weight from free text and return it in kilograms,
 * or null when none is found. Accepts kg/g/lb/oz, decimal comma, and ignores
 * implausible values (≤ 0 or absurdly large) so a stray number can't poison it.
 */
export function parseWeightKg(text: string | null | undefined): number | null {
  if (!text) return null
  UNIT_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = UNIT_RE.exec(text)) !== null) {
    const value = Number.parseFloat(match[1]!.replace(',', '.'))
    const factor = unitFactor(match[2]!.toLowerCase())
    if (factor == null || !Number.isFinite(value)) continue
    const kg = value * factor
    if (kg > 0 && kg <= MAX_PLAUSIBLE_KG) return round(kg, 3)
  }
  return null
}
