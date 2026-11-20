/** Compare the same quantity of foreign currency at two published UYU quotes.
 * Rates are board prices, not executable totals including fees. */
export function compareRateAmounts(
  amount: number,
  rate: number,
  bestRate: number,
  selling: boolean
): { total: number; difference: number } | null {
  if (![amount, rate, bestRate].every(value => Number.isFinite(value) && value > 0)) return null
  const totalCents = Math.round(amount * rate * 100)
  const bestCents = Math.round(amount * bestRate * 100)
  if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(bestCents)) return null
  return {
    total: totalCents / 100,
    difference: Math.max(0, selling ? bestCents - totalCents : totalCents - bestCents) / 100,
  }
}
