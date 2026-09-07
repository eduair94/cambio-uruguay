/** Reviewed URL withdrawals survive historical pruning. Never reuse an ambiguous old page for
 * a new advert that happens to compute the same address/specification key. This small explicit
 * registry covers confirmed repairs; it neither expires offers nor redirects to a guessed unit.
 */
export const RENTAL_RETIRED_KEY_REGISTRY = {
  version: 1,
  entries: [{
    key: "montevideo-cordon-avenida-18-de-julio-1fqazj0",
    retiredOn: "2026-09-07",
    reason: "ambiguous-unit-identity",
  }],
} as const;

export const RETIRED_RENTAL_KEYS: ReadonlySet<string> = new Set(
  RENTAL_RETIRED_KEY_REGISTRY.entries.map(entry => entry.key),
);

export function isRetiredRentalKey(key: string): boolean {
  return RETIRED_RENTAL_KEYS.has(key);
}
