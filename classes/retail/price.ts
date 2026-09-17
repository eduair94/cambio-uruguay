// Shared price helpers for every retail adapter. Kept separate from the adapters themselves because
// the crossed-out ("list") price shows up under a different name per platform — MercadoLibre's
// `original_amount`, WooCommerce's `regular_price`, Shopify's `compare_at_price`, VTEX's
// `ListPrice` — but the rule for when it counts as a real discount is the same everywhere.

/**
 * The crossed-out reference price, only when it is genuinely above the selling price. A store that
 * "discounts" 100 UYU off a 14990 sticker is real; a reference price equal to or below what is
 * actually charged is not a discount and is never invented as one.
 */
export function listPriceOf(price: number, reference: number | null | undefined): number | null {
  const value = Number(reference);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value > price ? Math.round(value * 100) / 100 : null;
}
