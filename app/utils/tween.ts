// Pure tween helpers for the count-up animation (`components/CountUp.vue`).
// Kept framework-agnostic so the easing + per-frame value are unit-testable; the
// component only wires these to requestAnimationFrame and reduced-motion.

/** Cubic ease-out, clamped to [0, 1]. `1 - (1 - t)^3`. */
export function easeOutCubic(t: number): number {
  const x = Math.min(Math.max(t, 0), 1)
  return 1 - (1 - x) ** 3
}

/**
 * Eased value `from`→`to` at `elapsed` ms of a `duration` ms tween. Returns
 * `to` immediately when the duration is non-positive or already elapsed.
 */
export function frameValue(from: number, to: number, elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return to
  return from + (to - from) * easeOutCubic(elapsed / duration)
}
