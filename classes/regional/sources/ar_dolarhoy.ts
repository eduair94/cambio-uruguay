// Argentina — DolarHoy (HTML).
//
// The most-read quote page in Argentina, and the only source in this set that is
// a real scrape rather than a JSON endpoint. It earns its place twice: it is a
// third independent survey of the blue (so two publishers can be checked against
// a third), and it is the page an Argentine actually looks at, which is what
// makes it the right number to show next to "what a casa uruguaya charges".
//
// The markup is AMP tiles: every quote is a `.values` block whose parent tile
// carries the title. The mobile duplicate of the blue tile is emitted twice in
// the same document, so rows are de-duplicated by key inside the source — a
// duplicate would otherwise look like corroboration from itself.
import * as cheerio from "cheerio";
import { fetchText } from "../net";
import { makeQuote, parseLocaleNumber } from "../quote";
import type { RegionalKind, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "ar_dolarhoy",
  name: "DolarHoy",
  country: "AR",
  url: "https://www.dolarhoy.com/",
  access: "scrape",
  publisher: "media",
  covers: "Tercer relevamiento independiente del blue, más oficial, MEP, CCL, USDC y tarjeta, leídos de la página que mira el público argentino.",
};

const URL = "https://www.dolarhoy.com/";

/** Title on the page -> market slug, kind and the label the board uses. */
const TITLES: Array<{ match: RegExp; market: string; label: string; kind: RegionalKind }> = [
  { match: /blue/i, market: "blue", label: "Dólar blue", kind: "parallel" },
  { match: /oficial/i, market: "oficial", label: "Dólar oficial", kind: "official" },
  { match: /mep|bolsa/i, market: "bolsa", label: "Dólar MEP (bolsa)", kind: "financial" },
  { match: /contado con liqui|ccl/i, market: "contadoconliqui", label: "Contado con liquidación", kind: "financial" },
  { match: /digital|usdc|cripto/i, market: "cripto", label: "Dólar cripto (USDC)", kind: "financial" },
  { match: /tarjeta|turista/i, market: "tarjeta", label: "Dólar tarjeta", kind: "card" },
];

/** `Actualizado por última vez: 21/08/26 06:39 PM` -> ISO, or null when absent. */
export function parseDolarHoyStamp(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  const [, d, m, y, hRaw, min, ampm] = match;
  let hour = Number(hRaw);
  if (/pm/i.test(ampm || "") && hour < 12) hour += 12;
  if (/am/i.test(ampm || "") && hour === 12) hour = 0;
  const year = y.length === 2 ? `20${y}` : y;
  // The page prints Buenos Aires local time (UTC-3) without saying so.
  const iso = `${year}-${m}-${d}T${String(hour).padStart(2, "0")}:${min}:00-03:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Pure parser, so the fixture test never needs the network. */
export function parseDolarHoy(html: string): RegionalQuote[] {
  const $ = cheerio.load(html);
  const stamp = parseDolarHoyStamp($(".tile.update span").first().text());
  const seen = new Set<string>();
  const quotes: RegionalQuote[] = [];

  $(".values").each((_, element) => {
    const values = $(element);
    const tile = values.parent();
    const title = tile.find(".titleText").first().text().trim();
    if (!title) return;
    const spec = TITLES.find((entry) => entry.match.test(title));
    if (!spec) return;

    const buy = parseLocaleNumber(values.find(".compra .val").first().text(), "latam");
    const sell = parseLocaleNumber(values.find(".venta .val").first().text(), "latam");
    const quote = makeQuote({
      country: "AR",
      market: spec.market,
      label: spec.label,
      kind: spec.kind,
      base: "USD",
      quote: "ARS",
      buy,
      sell,
      updatedAt: stamp,
      source: meta.id,
      sourceUrl: URL,
    });
    if (!quote || seen.has(quote.id)) return;
    seen.add(quote.id);
    quotes.push(quote);
  });

  return quotes;
}

export async function fetchArDolarHoy(): Promise<RegionalQuote[]> {
  const html = await fetchText(URL, { headers: { accept: "text/html,*/*;q=0.8" } });
  if (!html) return [];
  return parseDolarHoy(html);
}
