// What a checkout request must clear before anything is written or any provider is called.
// Pure, so the rules are tested without a database or a network (tests/unit/adFreeCheckout.test.ts).
import { validateAmount, type AdFreeProvider } from '../../utils/adFree'

export interface CheckoutRequest {
  provider: AdFreeProvider
  amount: number
}

export function parseCheckoutRequest(
  user: { anonymous: boolean },
  body: unknown,
  configured: Record<AdFreeProvider, boolean>
): { ok: true; value: CheckoutRequest } | { ok: false; status: number; message: string } {
  // A guest session is a browser, not a person: the twelve months would be lost with its storage.
  if (user.anonymous) {
    return {
      ok: false,
      status: 403,
      message:
        'Para aportar necesitás una cuenta: entrá con Google, Discord o correo. Así el beneficio te sigue en todos tus dispositivos.',
    }
  }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const provider = b.provider
  if (provider !== 'mercadopago' && provider !== 'paypal') {
    return { ok: false, status: 400, message: 'Medio de pago desconocido.' }
  }
  if (!configured[provider]) {
    return { ok: false, status: 503, message: 'Ese medio de pago no está disponible ahora.' }
  }
  const amount = validateAmount(provider, b.amount)
  if (!amount.ok) return { ok: false, status: 400, message: amount.error }
  return { ok: true, value: { provider, amount: amount.amount } }
}

/** The status and message to answer with, or null when the request may go ahead. */
export function checkoutRequestError(
  user: { anonymous: boolean },
  body: unknown,
  configured: Record<AdFreeProvider, boolean>
): { status: number; message: string } | null {
  const parsed = parseCheckoutRequest(user, body, configured)
  return parsed.ok ? null : { status: parsed.status, message: parsed.message }
}
