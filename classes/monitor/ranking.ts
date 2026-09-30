// Dónde queda una casa dentro de su grupo. Puro.
//
// Desde el lado de quien va a la casa: en la COMPRA (la casa le compra dólares) gana la más alta;
// en la VENTA gana la más baja. Empates comparten puesto (1, 2, 2, 4). Una casa sin precio de ese
// lado (0) no entra en la cuenta.
import type { Quote, Side } from "./types";

export interface Placement {
  position: number;
  of: number;
  better: { origin: string; value: number }[];
}

const valueOf = (quote: Quote, side: Side): number => (side === "buy" ? quote.buy : quote.sell);
const beats = (a: number, b: number, side: Side): boolean => (side === "buy" ? a > b : a < b);
const order = (side: Side) => (a: { origin: string; value: number }, b: { origin: string; value: number }) =>
  (side === "buy" ? b.value - a.value : a.value - b.value) || a.origin.localeCompare(b.origin);

export function placementOf(quotes: readonly Quote[], origin: string, side: Side): Placement | null {
  const valid = quotes.filter((q) => valueOf(q, side) > 0);
  const own = valid.find((q) => q.origin === origin);
  if (!own) return null;
  const mine = valueOf(own, side);
  const better = valid
    .filter((q) => beats(valueOf(q, side), mine, side))
    .map((q) => ({ origin: q.origin, value: valueOf(q, side) }))
    .sort(order(side));
  return { position: better.length + 1, of: valid.length, better };
}

export function bestOf(quotes: readonly Quote[], side: Side): { origin: string; value: number } | null {
  const valid = quotes
    .filter((q) => valueOf(q, side) > 0)
    .map((q) => ({ origin: q.origin, value: valueOf(q, side) }))
    .sort(order(side));
  return valid[0] ?? null;
}
