// The price an advert states for paying in full ("precio contado"), read from its own text.
//
// Why this exists: dealers list the DOWN PAYMENT as the price and put the real price in the
// description. MLU700552753 (Hyundai HB20 2023) is listed at US$ 8.990 and its description opens
// with "US$12990 Contado / US$8990 y cuotas"; the opportunities page called it 30 % cheaper than
// the same car. In the sample of 2026-09-19, 2,015 of the 10,515 active adverts with a description
// mention "contado", and two more were listed below their own cash price (16.800 vs "Precio contado
// U$S 19.300"; 4.900 vs "PRECIO CONTADO U$S 5.900 RETIRA CON U$S 3.540").
//
// The rule the directory follows: the cash price the advert states is the car's price; the listed
// number is only what the portal shows. What makes this hard is everything else that is also paid
// "contado" in a car advert — the yearly car tax ("Patente Anual Contado es de $ 38.019"), "50 %
// contado", the accountant ("contador") — so every reading is anchored on the word AND an amount
// next to it, in the listing's own currency, within a plausible range of the listed number.
import { fold } from "./normalize";
import type { CarCurrency, CarPricePoint } from "./types";

export interface CashPriceReading {
  /** The cash price the text states, in the listing's currency; null when none is stated clearly. */
  cash: number | null;
  /** The listed number appears in the text as a down payment ("US$8990 y cuotas", "retira con"). */
  listedIsDownPayment: boolean;
  /** Two different cash prices: the text contradicts itself, and neither is used. */
  ambiguous: boolean;
}

// A car price: grouped thousands ("12.990", "520.000") or at least four bare digits ("12990").
// Two- and three-digit numbers are percentages, km per litre or instalment counts, never a car.
const AMOUNT = String.raw`(\d{1,3}(?:[.,]\d{3})+|\d{4,7})`;
// "u$s", "u$d", "u$$", "us$", "usd", "usd$", "dolares". Listed before the peso sign so "u$s" is never
// read as pesos.
const USD = String.raw`(?:u\s?\$\s?[sd$]|us\s?\$|usd\s?\$?|u\$|uss|dolares|dolar|dls)`;
const PESO = String.raw`(?:\$|pesos|uyu)`;
const MARK = `(${USD}|${PESO})`;
const MARKED_AMOUNT = String.raw`(?:${MARK}\s*)?${AMOUNT}(?:\s*${MARK})?`;

// Three ways sellers write it (live examples in tests/autos/cashPrice.test.ts):
// "Precio contado: USD 23.900" / "Contado USD 14.500" / "US$12990 Contado".
const KEYWORD_FIRST = new RegExp(String.raw`\b(?:precio|valor)\s+(?:de\s+|al\s+|en\s+)?contado\s+(?:es\s+)?(?:de\s+)?${MARKED_AMOUNT}`, "g");
const CONTADO_FIRST = new RegExp(String.raw`\bcontado\s+${MARKED_AMOUNT}`, "g");
const AMOUNT_FIRST = new RegExp(String.raw`${MARKED_AMOUNT}\s+(?:al\s+)?contado\b`, "g");

// A down payment or first instalment listed as the price: "entrega de U$S 15.000", "retirá con 4.000
// dólares", "primera cuota de U$S 2.500", "U$S 5.500 y facilidades".
const DOWN_KEYWORD = new RegExp(String.raw`\b(?:entrega\w*|anticipo|retira\w*|llevatelo|llevalo|lleva|primera\s+cuota|cuota\s+inicial|pago\s+inicial)\s+(?:(?:con|de|minima|inicial|solo|una)\s+)*${MARKED_AMOUNT}`, "g");
const DOWN_CONTINUATION = new RegExp(String.raw`${MARKED_AMOUNT}\s+(?:y|mas|\+)\s+(?:(?:el|un|en|hasta|\d{1,2})\s+)*(?:cuotas?|facilidades|saldo|financ\w*|credito)`, "g");

// What is also paid "contado" in a car advert, and is not the car.
const NOT_THE_CAR = /(?:patente|seguro|impuesto|sucive|cuota)/;
const KM_BEFORE = /(?:km|kms|kilometros|kilometraje|recorrido)\s*$/;

const PLAUSIBLE: Record<CarCurrency, { min: number; max: number }> = {
  USD: { min: 1_000, max: 500_000 },
  UYU: { min: 40_000, max: 25_000_000 },
};
// Against the listed number: a down payment is rarely under a quarter of the price, and a cash price
// clearly under the listed one is another number (the price "con permuta", a monthly instalment).
const MIN_RATIO = 0.8;
const MAX_RATIO = 4;
// Once the text itself says the listed number is a down payment or a first instalment, how far below
// the price it sits says nothing: "Primera cuota de U$S 2.500" under "Precio contado U$S 14.900".
const MAX_RATIO_OVER_DOWN_PAYMENT = 20;
const SAME = 0.01;

interface Reading {
  amount: number;
  currency: CarCurrency;
  marked: boolean;
}

const flatOf = (text: string): string =>
  ` ${fold(text).replace(/[^a-z0-9$.,%+]+/g, " ").replace(/\s+/g, " ").trim()} `;

function amountOf(text: string): number {
  return Number(text.replace(/[.,](?=\d{3}\b)/g, "").replace(/[^\d]/g, ""));
}

function currencyOf(before: string | undefined, after: string | undefined, fallback: CarCurrency): { currency: CarCurrency; marked: boolean } {
  const mark = before ?? after;
  if (!mark) return { currency: fallback, marked: false };
  return { currency: new RegExp(`^${USD}$`).test(mark.replace(/\s+/g, "")) ? "USD" : "UYU", marked: true };
}

function collect(flat: string, pattern: RegExp, fallback: CarCurrency, keep: (flat: string, index: number, match: RegExpExecArray) => boolean): Reading[] {
  const out: Reading[] = [];
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(flat))) {
    if (!keep(flat, match.index, match)) continue;
    const { currency, marked } = currencyOf(match[1], match[3], fallback);
    out.push({ amount: amountOf(match[2]!), currency, marked });
  }
  return out;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) <= Math.max(a, b) * SAME;

export function readCashPrice(text: string, listed: number, currency: CarCurrency): CashPriceReading {
  const none: CashPriceReading = { cash: null, listedIsDownPayment: false, ambiguous: false };
  if (!text || !(listed > 0)) return none;
  const flat = flatOf(text);
  if (!/\bcontado\b|entrega|retira|anticipo|cuotas|facilidades|llev/.test(flat)) return none;

  const always = (): boolean => true;
  const notTaxNorKm = (source: string, index: number, match: RegExpExecArray): boolean => {
    const word = source.indexOf("contado", index);
    const before = source.slice(Math.max(0, index - 30), word >= 0 ? word : index);
    if (NOT_THE_CAR.test(before)) return false;
    // "Kilómetros: 158.000 Contado USD 14.500": the number before "contado" is the km, unmarked.
    return !(match[1] === undefined && match[3] === undefined && KM_BEFORE.test(source.slice(Math.max(0, index - 20), index)));
  };

  const inCurrency = (reading: Reading): boolean => reading.currency === currency;
  const downs = [
    ...collect(flat, DOWN_KEYWORD, currency, always),
    ...collect(flat, DOWN_CONTINUATION, currency, always),
  ].filter(inCurrency);
  const listedIsDownPayment = downs.some(reading => near(reading.amount, listed));

  const range = PLAUSIBLE[currency];
  const maxRatio = listedIsDownPayment ? MAX_RATIO_OVER_DOWN_PAYMENT : MAX_RATIO;
  const candidates = [
    ...collect(flat, KEYWORD_FIRST, currency, always).map(reading => ({ ...reading, marked: true })),
    ...collect(flat, CONTADO_FIRST, currency, notTaxNorKm),
    ...collect(flat, AMOUNT_FIRST, currency, notTaxNorKm),
  ].filter(reading =>
    inCurrency(reading) &&
    reading.amount >= range.min && reading.amount <= range.max &&
    reading.amount / listed >= MIN_RATIO && reading.amount / listed <= maxRatio &&
    // A real cash price never equals a down payment stated in the same text ("16.500 contado 13.000
    // y cuotas" also reads "contado 13.000").
    !downs.some(down => near(down.amount, reading.amount)));
  // An explicit currency or the word "precio" outranks a bare number next to "contado".
  const strong = candidates.filter(reading => reading.marked);
  const pool = strong.length ? strong : candidates;
  const clusters: number[] = [];
  for (const { amount } of pool) if (!clusters.some(value => near(value, amount))) clusters.push(amount);
  if (clusters.length > 1) return { cash: null, listedIsDownPayment, ambiguous: true };
  return { cash: clusters[0] ?? null, listedIsDownPayment, ambiguous: false };
}

export interface CarPriceBasis {
  /** The car's price: the stated cash price when there is one, else the listed number. */
  price: number;
  /** The number the portal shows, kept only when it is NOT the car's price. */
  listedPrice: number | null;
  /** The text states a cash price (equal to the listed one or not): the listed number is settled. */
  cashKnown: boolean;
  /** The listed number looks like a down payment (or the text contradicts itself) and no cash price
   *  says what the car costs: the price is unknown, so it cannot be called cheap. */
  financing: boolean;
}

/**
 * Which number is the car's price. The stated cash price wins over the listed one, with one
 * exception measured on live adverts: a description is written once and a price is edited often. When
 * the stated cash price is a number this same advert was LISTED at before ("U$S12.900 contado" on an
 * advert since lowered to 12.300), the description is older than the price, and the listed number is
 * the current one. That exception never applies when the listed number is itself the down payment.
 */
export function priceBasisOf(
  listing: { title: string; price: number; currency: CarCurrency },
  description: string | null | undefined,
  history: readonly CarPricePoint[],
): CarPriceBasis {
  const listed = listing.price;
  const reading = readCashPrice(`${listing.title}\n${description ?? ""}`, listed, listing.currency);
  if (reading.cash !== null) {
    if (near(reading.cash, listed)) return { price: listed, listedPrice: null, cashKnown: true, financing: false };
    const stale = !reading.listedIsDownPayment &&
      history.some(point => point.currency === listing.currency && near(point.price, reading.cash!));
    if (stale) return { price: listed, listedPrice: null, cashKnown: false, financing: false };
    return { price: reading.cash, listedPrice: listed, cashKnown: true, financing: false };
  }
  return { price: listed, listedPrice: null, cashKnown: false, financing: reading.listedIsDownPayment || reading.ambiguous };
}
