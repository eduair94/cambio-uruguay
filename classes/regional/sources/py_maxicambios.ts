// Paraguay — Maxicambios (HTML).
//
// The BCP publishes what the market averaged; this is what a counter in
// Asunción or Ciudad del Este actually charges, including the currencies the
// central bank prices but nobody trades in size. It is the Paraguayan analogue
// of the casa board this site was built on, and it exists here for the same
// reason: the reference rate is not the price you pay.
//
// It is also the one source in this set that demonstrates the failure mode the
// whole validator exists for. Its peso-uruguayo row reads compra 130 / venta 200
// guaraníes — a 54% spread on a currency the casa plainly does not trade. That
// is not a price, it is a sign in a window, and `validate.ts` drops it (the
// spread ceiling is 50%) with the reason recorded in the snapshot's `rejected`
// list rather than silently. Everything else this counter publishes is real and
// stays.
import * as cheerio from "cheerio";
import { fetchText } from "../net";
import { makeQuote, parseLocaleNumber } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "py_maxicambios",
  name: "Maxicambios",
  country: "PY",
  url: "https://www.maxicambios.com.py/",
  access: "scrape",
  publisher: "exchange-house",
  covers: "Precio de mostrador de una casa de cambio paraguaya: dólar, real, peso argentino, peso uruguayo, euro y yen en guaraníes.",
};

const URL = "https://www.maxicambios.com.py/";

/** Row label on the page -> ISO code. The page writes names, not codes. */
const LABELS: Array<{ match: RegExp; code: string; label: string }> = [
  { match: /d[oó]lar/i, code: "USD", label: "Dólar en casa de cambio" },
  { match: /^\s*euro/i, code: "EUR", label: "Euro en casa de cambio" },
  { match: /real/i, code: "BRL", label: "Real en casa de cambio" },
  { match: /peso\s*ar/i, code: "ARS", label: "Peso argentino en casa de cambio" },
  { match: /peso\s*uy|peso\s*urug/i, code: "UYU", label: "Peso uruguayo en casa de cambio" },
];

export function parseMaxicambios(html: string): RegionalQuote[] {
  const $ = cheerio.load(html);
  const quotes: RegionalQuote[] = [];
  const seen = new Set<string>();

  $("table tbody tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .map((_index, cell) => $(cell).text().trim().replace(/\s+/g, " "))
      .get();
    if (cells.length < 3) return;
    const spec = LABELS.find((entry) => entry.match.test(cells[0]));
    if (!spec) return;

    const quote = makeQuote({
      country: "PY",
      market: "casas",
      label: spec.label,
      kind: "retail",
      base: spec.code,
      quote: "PYG",
      buy: parseLocaleNumber(cells[1], "dot"),
      sell: parseLocaleNumber(cells[2], "dot"),
      // The page carries no timestamp of its own; the read is the stamp.
      updatedAt: null,
      source: meta.id,
      sourceUrl: URL,
    });
    if (!quote || seen.has(quote.id)) return;
    seen.add(quote.id);
    quotes.push(quote);
  });

  return quotes;
}

export async function fetchPyMaxicambios(): Promise<RegionalQuote[]> {
  const html = await fetchText(URL, { headers: { accept: "text/html,*/*;q=0.8" } });
  if (!html) return [];
  return parseMaxicambios(html);
}
