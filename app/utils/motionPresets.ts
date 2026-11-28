// The site's motion vocabulary (DESIGN.md → Motion). Animations run on Motion (motion.dev):
// `animate` from `motion/mini` drives the browser's own Web Animations API, so every tween
// below runs on the compositor and is interruptible; `inView` and `stagger` come from `motion`.
//
// Two curves and a handful of durations, nothing else:
// - ARRIVE: a confident deceleration for things entering (a section, the rate board).
// - FEEDBACK: a short, nearly linear settle for acknowledging an action.

/** cubic-bezier(0.16, 1, 0.3, 1): fast start, long soft landing. */
export const EASE_ARRIVE = [0.16, 1, 0.3, 1] as const

/** cubic-bezier(0.2, 0, 0, 1): Material's standard curve, for feedback. */
export const EASE_FEEDBACK = [0.2, 0, 0, 1] as const

/** Seconds. Exits are always faster than entrances. */
export const MOTION_DURATION = {
  feedback: 0.14,
  state: 0.24,
  arrive: 0.56,
  board: 0.9,
} as const

/**
 * True when the visitor asked the OS for less motion. Movement is then skipped entirely:
 * nothing on this site needs to move to be understood.
 */
export function motionReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
