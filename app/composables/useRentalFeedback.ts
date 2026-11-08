import { isFeedbackId, type RentalFeedbackInput } from '~/utils/rentalFeedback'

const CLIENT_KEY = 'cu-rental-feedback-client'
const SNOOZE_PREFIX = 'cu-rental-feedback-snooze:'

/** Used when storage is blocked: one id for this page view, so a tap and its follow-up match. */
let pageClientId: string | null = null

const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')

/** A random id per browser: answers from the same person can be read in order. Never personal. */
function clientId(): string | null {
  try {
    let id = localStorage.getItem(CLIENT_KEY)
    if (!id || !/^[a-z\d]{12,40}$/i.test(id)) {
      id = randomId()
      localStorage.setItem(CLIENT_KEY, id)
    }
    return id
  } catch {
    try {
      return (pageClientId ??= randomId())
    } catch {
      return null
    }
  }
}

/**
 * Sending an answer, completing a one-tap answer, and remembering that a question was answered or
 * closed so it does not come back for a while. Storage can be blocked (private windows, previews):
 * then the question simply shows again next time, which is the honest fallback.
 */
export function useRentalFeedback() {
  /** Stores an answer. `null` when it could not be sent; `id` is the row, for a micro answer. */
  async function send(
    input: RentalFeedbackInput & { website?: string }
  ): Promise<{ id: string | null } | null> {
    try {
      const response = await $fetch<{ ok?: boolean; id?: unknown }>('/api/rental-feedback', {
        method: 'POST',
        body: { ...input, clientId: clientId() },
      })
      return { id: isFeedbackId(response?.id) ? response.id : null }
    } catch {
      return null
    }
  }

  /** Adds what fell short and a comment to the row a tap created. */
  async function followUp(
    id: string,
    input: { reasons: string[]; comment: string; website?: string }
  ): Promise<boolean> {
    if (!isFeedbackId(id)) return false
    try {
      await $fetch(`/api/rental-feedback/${id}`, {
        method: 'PATCH',
        body: { ...input, clientId: clientId() },
      })
      return true
    } catch {
      return false
    }
  }

  function snoozed(key: string): boolean {
    try {
      const until = Number(localStorage.getItem(SNOOZE_PREFIX + key))
      return Number.isFinite(until) && until > Date.now()
    } catch {
      return false
    }
  }

  function snooze(key: string, days: number) {
    try {
      localStorage.setItem(SNOOZE_PREFIX + key, String(Date.now() + days * 86_400_000))
    } catch {
      /* Blocked storage: the question shows again next visit. */
    }
  }

  return { send, followUp, snoozed, snooze }
}
