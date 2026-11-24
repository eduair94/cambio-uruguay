// La moneda de un aviso de Facebook. La tarjeta dice «UYU» salvo que el vendedor haya elegido
// dólares, y muchos escriben el monto en dólares igual («PC Gamer Ryzen 5 5600 | RTX 4060 8GB | 8GB
// RAM | SSD 1TB NVMe — $ 950», 23/11/2026). Dos caminos, en este orden:
//
//  1. El texto lo DICE: «(USD)», «US$ 1.350», «u$s 950», «950 dólares» con el mismo número que la
//     tarjeta. Es un dato del aviso, no una deducción: `inferred: false`.
//  2. Sólo cierra en dólares: en pesos el precio sería menos de un quinto de lo que valen sus piezas
//     o sus iguales, y en dólares cae entre 0,3 y 2,5 veces eso. Se marca `inferred: true` y queda
//     fuera de todo veredicto y de toda comparación (la regla de autos y alquileres).
import { norm } from "./text";

const USD_WORD = "(?:u\\$s|us\\$|u\\$d|usd|dolares|dls|dolar)";

/** El texto declara dólares para ese monto. */
export function textSaysUsd(text: string, amount: number): boolean {
  const t = norm(text);
  // «(USD) NOTEBOOK GAMER…»: los paréntesis no sobreviven a `norm`, la palabra sí, al principio.
  if (/(?:^|\s)(?:usd|u\$s|us\$|u\$d)(?:\s|$)/.test(t.slice(0, 40)) || /\bprecio\s*en\s*(?:usd|dolares|u\$s)\b/.test(t)) return true;
  const pattern = new RegExp(`${USD_WORD}\\s*:?\\s*(\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?![0-9])|(?<![0-9.,])(\\d{1,3}(?:[.,]\\d{3})*|\\d+)\\s*${USD_WORD}`, "g");
  for (const match of t.matchAll(pattern)) {
    const value = Number(String(match[1] ?? match[2]).replace(/[.,](?=\d{3}\b)/g, ""));
    if (Number.isFinite(value) && value > 0 && Math.abs(value - amount) <= Math.max(1, amount * 0.01)) return true;
  }
  return false;
}

export interface CurrencyRead {
  currency: "UYU" | "USD";
  inferred: boolean;
}

export function readCurrency(input: {
  amount: number;
  currency: "UYU" | "USD";
  text: string;
  /** Lo que valen sus piezas usadas o sus iguales, en dólares; null sin referencia. */
  referenceUsd: number | null;
  usdUyu: number;
}): CurrencyRead {
  if (input.currency === "USD") return { currency: "USD", inferred: false };
  if (input.amount < 20_000 && textSaysUsd(input.text, input.amount)) return { currency: "USD", inferred: false };
  const reference = input.referenceUsd;
  if (!reference || reference < 150 || !(input.usdUyu > 0)) return { currency: "UYU", inferred: false };
  const asPesos = input.amount / input.usdUyu;
  if (input.amount <= 6_000 && asPesos < reference * 0.2 && input.amount >= reference * 0.3 && input.amount <= reference * 2.5) {
    return { currency: "USD", inferred: true };
  }
  return { currency: "UYU", inferred: false };
}
