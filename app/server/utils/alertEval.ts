export const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000 // 6 hours

export type Op = '<' | '>' | '<=' | '>='

export function compareOp(op: Op, value: number, target: number): boolean {
  switch (op) {
    case '<':
      return value < target
    case '>':
      return value > target
    case '<=':
      return value <= target
    case '>=':
      return value >= target
  }
}

interface EvalInput {
  op: Op
  target: number
  armed: boolean
  lastFiredAt: Date | null
}

/**
 * Edge-trigger + cooldown. Fires only on a false→true crossing while armed and
 * past the cooldown; disarms after firing; re-arms when the condition is false.
 */
export function evaluateAlert(
  alert: EvalInput,
  current: number | null,
  now: number
): { fire: boolean; armed: boolean } {
  if (current == null) return { fire: false, armed: alert.armed }
  const met = compareOp(alert.op, current, alert.target)

  if (!met) return { fire: false, armed: true } // re-arm when condition clears

  // condition met:
  if (!alert.armed) return { fire: false, armed: false }
  const cooledDown =
    !alert.lastFiredAt || now - new Date(alert.lastFiredAt).getTime() >= ALERT_COOLDOWN_MS
  if (!cooledDown) return { fire: false, armed: true }
  return { fire: true, armed: false }
}
