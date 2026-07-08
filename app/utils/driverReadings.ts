export type Strength = 'fuerte' | 'moderada' | 'debil' | 'casiNula'

/** Bucket a correlation coefficient by absolute strength. */
export function strengthLabel(r: number): Strength {
  const a = Math.abs(r)
  if (a >= 0.5) return 'fuerte'
  if (a >= 0.3) return 'moderada'
  if (a >= 0.1) return 'debil'
  return 'casiNula'
}

// Drivers that have a hand-written plain-language reading. Anything else → 'generic'.
const KNOWN = new Set(['brl', 'dxy', 'us10y', 'eurusd', 'arBlue', 'arOfficial'])

/** Select the i18n key for a driver's plain-language reading given its correlation. */
export function readingKeyFor(driverKey: string, r: number): string {
  const base = KNOWN.has(driverKey) ? driverKey : 'generic'
  if (strengthLabel(r) === 'casiNula') return `porQueDolar.readings.${base}.weak`
  return `porQueDolar.readings.${base}.${r >= 0 ? 'pos' : 'neg'}`
}
