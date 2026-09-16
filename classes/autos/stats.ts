/** Linear-interpolation quantile (the definition the property opportunity engine uses). */
export function quantile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}
