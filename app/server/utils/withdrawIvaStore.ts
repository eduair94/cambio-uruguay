// Durable state for the `withdraw:iva-check` watchdog task. Uses the `withdraw`
// Nitro storage (fs-backed in prod, see nuxt.config) so the "already notified"
// flag survives restarts and the alert doesn't re-fire on every tick.

/** Persisted watchdog state. */
export interface IvaWatchdogState {
  /** ISO timestamp of the last check. */
  checkedAt: string
  /** Whether the encoded IVA rules currently need human re-verification. */
  needsReverify: boolean
  /** Human-readable reasons (empty when fine). */
  reasons: string[]
  /** Signature of the reasons we last sent an alert for (de-dupes notifications). */
  lastNotifiedKey: string | null
  /** ISO timestamp of the last alert sent. */
  lastNotifiedAt: string | null
}

const KEY = 'iva-watchdog'

export async function getIvaWatchdogState(): Promise<IvaWatchdogState | null> {
  return (await useStorage('withdraw').getItem<IvaWatchdogState>(KEY)) ?? null
}

export async function setIvaWatchdogState(state: IvaWatchdogState): Promise<void> {
  await useStorage('withdraw').setItem(KEY, state)
}
