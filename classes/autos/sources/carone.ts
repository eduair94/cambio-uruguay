// Car One (Magento): the used-car listing page, 12 cards per page. Its robots.txt disallows every
// query string except its own filters (`carone_estado=`…), and a URL carrying one of them is allowed
// by the longer rule, so pages are ALWAYS requested with the used filter (`carone_estado=96`) —
// never a bare `?p=`. Each card carries brand line, version line, price, year, km and fuel.
import { versionTransmission } from "../catalog/match";
import { fold, fuelOf } from "../normalize";
import type { CarSourceResult } from "../types";
import { addCar, autosFetchText, buildWebCar, decodeEntities, sourceResult, titleCase, type WebCarContext } from "./common";
import { CAR_SOURCES } from "./registry";

export const CARONE_USED_URL = "https://carone.com.uy/autos-usados-y-0km?carone_estado=96";

export function caroneTotal(html: string): number | null {
  const numbers: string[] = [];
  const pattern = /<span class="toolbar-number">([\d.]+)<\/span>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) && numbers.length < 3) numbers.push(match[1]!);
  const total = numbers.length === 3 ? Number(numbers[2]!.replace(/\./g, "")) : NaN;
  return Number.isFinite(total) ? total : null;
}

const text = (card: string, pattern: RegExp): string | null => {
  const match = pattern.exec(card);
  return match ? decodeEntities(match[1]!).replace(/\s+/g, " ").trim() : null;
};

export function caroneCards(html: string, context: WebCarContext): Array<NonNullable<ReturnType<typeof buildWebCar>>> {
  const cars: Array<NonNullable<ReturnType<typeof buildWebCar>>> = [];
  for (const card of html.split(/(?=<li class="item product product-item)/).slice(1)) {
    const permalink = text(card, /href="(https:\/\/carone\.com\.uy\/[\w-]+-sku\d+-\d+)"/);
    const id = permalink ? /-sku\d+-(\d+)$/.exec(permalink)?.[1] : undefined;
    const brandLine = text(card, /carone-car-info-data-brand[^>]*>([^<]+)</);
    const version = text(card, /carone-car-info-data-model"[^>]*title="([^"]+)"/) ?? text(card, /carone-car-info-data-model"[^>]*>([^<]+)</);
    const amount = Number(text(card, /data-price-amount="(\d+(?:\.\d+)?)"/));
    const shown = text(card, /class="price">([^<]+)</) ?? "";
    if (!permalink || !id || !brandLine || !version || !(amount > 0)) continue;
    const attributes = new Map<string, string>();
    const pair = /carone-car-attribute-value">([^<]*)<\/p>\s*<p class="carone-car-attribute-title[^"]*">([^<]*)</g;
    let match: RegExpExecArray | null;
    while ((match = pair.exec(card))) attributes.set(fold(decodeEntities(match[2]!)).trim(), decodeEntities(match[1]!).trim());
    const year = Number(attributes.get("ano"));
    const kmDigits = (attributes.get("kilometros") ?? "").replace(/[^\d]/g, "");
    const brandWord = brandLine.split(" ")[0]!;
    const versionTitle = titleCase(version);
    const title = fold(version).startsWith(fold(brandWord)) ? versionTitle : `${titleCase(brandWord)} ${versionTitle}`;
    // The version line sometimes drops "AT"/"MT"; the product slug keeps it ("…-1-4t-5p-at-sku4-…").
    const slugWords = permalink.replace(/^https:\/\/carone\.com\.uy\//, "").replace(/-sku\d+-\d+$/, "").replace(/-/g, " ");
    const car = buildWebCar({
      source: "carone",
      id,
      title,
      specText: `${version} ${brandLine}`,
      permalink,
      picture: text(card, /<img src="(https:\/\/cdn\.impel\.io\/[^"]+)"/),
      price: amount,
      currency: /u\$s|us\$|usd/i.test(shown) ? "USD" : "UYU",
      brand: null,
      model: null,
      year: Number.isInteger(year) && year > 1900 ? year : null,
      km: kmDigits ? Number(kmDigits) : null,
      transmission: versionTransmission(version) ?? versionTransmission(slugWords),
      fuel: fuelOf(attributes.get("combustible") ?? ""),
      sellerType: "dealer",
      sellerId: "carone",
      dealerName: CAR_SOURCES.carone.dealerName,
      department: null,
      description: "",
      context,
    });
    if (car) cars.push(car);
  }
  return cars;
}

function cardIds(html: string): string[] {
  const ids: string[] = [];
  const pattern = /<li class="item product product-item[\s\S]*?href="https:\/\/carone\.com\.uy\/[\w-]+-sku\d+-(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) if (!ids.includes(match[1]!)) ids.push(match[1]!);
  return ids;
}

export async function harvestCarOne(
  context: WebCarContext,
  options: { fetchPage?: (url: string) => Promise<string | null>; maxPages?: number } = {},
): Promise<CarSourceResult> {
  const result = sourceResult("carone", new Date().toISOString());
  const fetchPage = options.fetchPage ?? (async (url: string) => (await autosFetchText(url, 30_000, "carone")).body);
  const maxPages = options.maxPages ?? 40;
  const seen = new Set<string>();
  let total: number | null = null;
  let cardsSeen = 0;
  for (let page = 1; page <= maxPages; page++) {
    const html = await fetchPage(`${CARONE_USED_URL}&p=${page}`);
    result.requests++;
    if (!html) {
      result.ok = false;
      result.note = `página ${page} sin respuesta`;
      break;
    }
    if (page === 1) total = caroneTotal(html);
    // Magento answers a page past the end with the last page again: stop when nothing is new.
    const ids = cardIds(html);
    const fresh = ids.filter(id => !seen.has(id));
    if (!fresh.length) break;
    fresh.forEach(id => seen.add(id));
    cardsSeen += fresh.length;
    for (const car of caroneCards(html, context)) if (fresh.includes(car.listing.id)) addCar(result, car);
  }
  result.complete = result.ok && total !== null && cardsSeen >= total;
  if (result.ok && total !== null && cardsSeen < total) result.note = `${cardsSeen} de ${total} tarjetas leídas`;
  result.finishedAt = new Date().toISOString();
  return result;
}
