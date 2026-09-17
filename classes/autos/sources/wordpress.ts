// Two WordPress listing themes by the same vendor, read through the site's own REST API:
//   * Listivo — Clasiautos (/wp-json/wp/v2/listings): every field is a string array
//     (`listivo_945: ["Toyota"]`, `listivo_130: ["U$S 15,000"]`), private and dealer sellers mixed;
//   * Vehica — Julio Automóviles (/wp-json/wp/v2/cars): taxonomies are term ids, readable from
//     `class_list` slugs (`vehica_6659-fiat`); the year is a term resolved through its taxonomy;
//     the price is `{ vehica_currency_6656_2316: 9200 }`, and 2316 is the site's US$ (100 of 100
//     cars on 2026-09-17).
// A page past the last answers HTTP 400 `rest_post_invalid_page_number`: that is the end, not a failure.
import { engineFromCc, versionTransmission } from "../catalog/match";
import { fold, fuelOf, transmissionOf } from "../normalize";
import type { CarSourceResult } from "../types";
import { addCar, autosFetchJson, buildWebCar, htmlText, moneyOf, sourceResult, type WebCarContext } from "./common";
import { CAR_SOURCES } from "./registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WpPost = Record<string, any>;
type FetchPage = (url: string) => Promise<unknown[] | null>;

const CLASIAUTOS = "https://clasiautos.uy/wp-json/wp/v2/listings";
const JULIO = "https://julioautomoviles.com.uy/wp-json/wp/v2";
const JULIO_USD = "_2316";

async function defaultFetchPage(url: string): Promise<unknown[] | null> {
  const fetched = await autosFetchJson<unknown>(url);
  if (Array.isArray(fetched.body)) return fetched.body;
  if (fetched.failure === "HTTP 400" && !/[?&]page=1(?:&|$)/.test(url)) return [];
  return null;
}

async function readPages(
  base: string,
  result: CarSourceResult,
  options: { fetchPage?: FetchPage; maxPages?: number; perPage?: number },
  onPage: (items: unknown[]) => void,
): Promise<boolean> {
  const fetchPage = options.fetchPage ?? defaultFetchPage;
  const perPage = options.perPage ?? 100;
  const maxPages = options.maxPages ?? 30;
  for (let page = 1; page <= maxPages; page++) {
    const items = await fetchPage(`${base}?per_page=${perPage}&page=${page}`);
    result.requests++;
    if (!items) {
      result.ok = false;
      result.note = `${base.split("/").pop()} página ${page} sin respuesta`;
      return false;
    }
    onPage(items);
    if (items.length < perPage) return true;
  }
  result.note = "tope de páginas alcanzado";
  return false;
}

const firstOf = (post: WpPost, key: string): string => {
  const value = post[key];
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return typeof value === "string" ? value.trim() : "";
};
const digitsOf = (text: string): number | null => {
  const digits = String(text || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
};

export function listivoToCar(post: WpPost, context: WebCarContext): ReturnType<typeof buildWebCar> {
  if (!/usado/.test(fold(firstOf(post, "listivo_8114")))) return null;
  const money = moneyOf(firstOf(post, "listivo_130"));
  const id = String(post.id ?? "");
  if (!money || !/^\d{1,12}$/.test(id)) return null;
  const yearText = firstOf(post, "listivo_4316");
  const engine = engineFromCc(firstOf(post, "listivo_8132"));
  const gallery = Array.isArray(post.listivo_145) ? post.listivo_145.find((url: unknown) => typeof url === "string") ?? null : null;
  return buildWebCar({
    source: "clasiautos",
    id,
    title: htmlText(post.title?.rendered ?? ""),
    specText: engine ?? "",
    permalink: String(post.link || ""),
    picture: gallery,
    price: money.amount,
    currency: money.currency,
    brand: firstOf(post, "listivo_945") || null,
    model: firstOf(post, "listivo_8116") || null,
    year: /^\d{4}$/.test(yearText) ? Number(yearText) : null,
    km: digitsOf(firstOf(post, "listivo_4686")),
    transmission: transmissionOf(firstOf(post, "listivo_5666")),
    fuel: fuelOf(firstOf(post, "listivo_5667")),
    sellerType: /particular/.test(fold(firstOf(post, "listivo_8131"))) ? "private" : "dealer",
    sellerId: String(post.author ?? "") || id,
    // A dealer's name on Clasiautos lives in its author profile, which this API does not expose.
    dealerName: null,
    department: null,
    description: htmlText(post.content?.rendered ?? ""),
    category: firstOf(post, "listivo_14") || null,
    context,
  });
}

export function vehicaToCar(post: WpPost, years: ReadonlyMap<number, number>, context: WebCarContext): ReturnType<typeof buildWebCar> {
  const classes: string[] = Array.isArray(post.class_list) ? post.class_list.map(String) : [];
  const term = (taxonomy: string): string | null => classes.find(name => name.startsWith(`${taxonomy}-`))?.slice(taxonomy.length + 1) ?? null;
  const condition = term("vehica_6654");
  if (!condition || !/usad/.test(condition)) return null;
  const prices = post.vehica_6656 && typeof post.vehica_6656 === "object" ? Object.entries(post.vehica_6656 as Record<string, unknown>) : [];
  if (prices.length !== 1 || !prices[0]![0].endsWith(JULIO_USD)) return null;
  const price = Number(prices[0]![1]);
  const id = String(post.id ?? "");
  if (!/^\d{1,12}$/.test(id)) return null;
  const yearId = Array.isArray(post.vehica_19418) ? Number(post.vehica_19418[0]) : NaN;
  const title = htmlText(post.title?.rendered ?? "");
  const engine = engineFromCc(String(post.vehica_6665 ?? ""));
  const picture = Array.isArray(post.vehica_6673) ? post.vehica_6673.find((url: unknown) => typeof url === "string") ?? null : null;
  return buildWebCar({
    source: "julio",
    id,
    title,
    specText: engine ?? "",
    permalink: String(post.link || ""),
    picture,
    price,
    currency: "USD",
    brand: term("vehica_6659")?.replace(/-/g, " ") ?? null,
    model: term("vehica_6660")?.replace(/-/g, " ") ?? null,
    year: years.get(yearId) ?? null,
    km: digitsOf(String(post.vehica_6664 ?? "")),
    transmission: versionTransmission(title),
    fuel: fuelOf(title),
    sellerType: "dealer",
    sellerId: "julio",
    dealerName: CAR_SOURCES.julio.dealerName,
    department: null,
    description: htmlText(post.content?.rendered ?? ""),
    context,
  });
}

export async function harvestClasiautos(
  context: WebCarContext,
  options: { fetchPage?: FetchPage; maxPages?: number; perPage?: number } = {},
): Promise<CarSourceResult> {
  const result = sourceResult("clasiautos", new Date().toISOString());
  const complete = await readPages(CLASIAUTOS, result, options, items => {
    for (const item of items) addCar(result, listivoToCar(item as WpPost, context));
  });
  result.complete = complete && result.ok;
  result.finishedAt = new Date().toISOString();
  return result;
}

export async function harvestJulio(
  context: WebCarContext,
  options: { fetchPage?: FetchPage; maxPages?: number; perPage?: number } = {},
): Promise<CarSourceResult> {
  const result = sourceResult("julio", new Date().toISOString());
  const years = new Map<number, number>();
  const yearsRead = await readPages(`${JULIO}/vehica_19418`, result, options, items => {
    for (const item of items as Array<{ id?: unknown; name?: unknown }>) {
      const year = Number(item.name);
      if (Number.isInteger(year) && year >= 1950 && year <= context.maxYear) years.set(Number(item.id), year);
    }
  });
  // Without the year terms no car can be dated: read nothing rather than guess.
  if (!yearsRead) {
    result.ok = false;
    result.complete = false;
    result.finishedAt = new Date().toISOString();
    return result;
  }
  const complete = await readPages(`${JULIO}/cars`, result, options, items => {
    for (const item of items) addCar(result, vehicaToCar(item as WpPost, years, context));
  });
  result.complete = complete && result.ok;
  result.finishedAt = new Date().toISOString();
  return result;
}
