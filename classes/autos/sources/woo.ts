// WooCommerce dealer stores read through the public Store API (/wp-json/wc/store/v1/products), the
// same contract their own cart uses. Measured 2026-09-17: Shopping de Autos (171 cars) and Carper
// usados publish year, km, brand, model, gearbox and fuel as product attributes; Carper writes prices
// in cents (`currency_minor_unit: 2`) and marks cars it will not sell as "NO APTO PARA LA VENTA".
import { engineFromCc, versionTransmission } from "../catalog/match";
import { fold, fuelOf, transmissionOf } from "../normalize";
import type { CarSourceResult } from "../types";
import { addCar, autosFetchJson, buildWebCar, htmlText, sourceResult, type WebCarContext } from "./common";
import { CAR_SOURCES } from "./registry";

export interface WooSite {
  source: "shoppingdeautos" | "carper";
  baseUrl: string;
}

export const WOO_SITES: readonly WooSite[] = [
  { source: "shoppingdeautos", baseUrl: "https://shoppingdeautos.uy" },
  { source: "carper", baseUrl: "https://usados.carper.com.uy" },
];

interface WooAttribute {
  name?: string;
  terms?: Array<{ name?: string }>;
}

export interface WooProduct {
  id?: number | string;
  name?: string;
  permalink?: string;
  description?: string;
  short_description?: string;
  prices?: { price?: string; currency_code?: string; currency_minor_unit?: number };
  images?: Array<{ src?: string }>;
  attributes?: WooAttribute[];
  is_in_stock?: boolean;
}

function attributesOf(product: WooProduct): Map<string, string> {
  const map = new Map<string, string>();
  for (const attribute of product.attributes ?? []) {
    const name = fold(htmlText(attribute.name ?? ""));
    const value = htmlText(attribute.terms?.[0]?.name ?? "");
    if (name && value && !map.has(name)) map.set(name, value);
  }
  return map;
}

export function wooProductToCar(product: WooProduct, site: WooSite, context: WebCarContext): ReturnType<typeof buildWebCar> {
  const attributes = attributesOf(product);
  const get = (...names: string[]): string | null => names.map(name => attributes.get(name)).find(Boolean) ?? null;
  if (/0 ?km|nuevo/.test(fold(get("estado", "tipo") ?? ""))) return null;
  if (/no apto/.test(fold(get("estatus") ?? ""))) return null;
  const availability = get("disponibilidad");
  if (availability && !/^disponible/.test(fold(availability))) return null;
  if (product.is_in_stock === false) return null;
  const minorUnit = Number(product.prices?.currency_minor_unit ?? 0);
  const price = Number(product.prices?.price) / 10 ** (Number.isInteger(minorUnit) && minorUnit >= 0 ? minorUnit : 0);
  const currency = String(product.prices?.currency_code || "").toUpperCase();
  if (currency !== "USD" && currency !== "UYU") return null;
  const title = htmlText(product.name ?? "");
  const id = String(product.id ?? "");
  if (!/^\d{1,12}$/.test(id) || !title) return null;
  const yearText = get("ano") ?? "";
  const kmDigits = (get("kilometros", "kilometraje") ?? "").replace(/[^\d]/g, "");
  const engine = engineFromCc(get("motor (cc)", "motor", "cilindrada") ?? "");
  return buildWebCar({
    source: site.source,
    id,
    title,
    specText: [engine, title].filter(Boolean).join(" "),
    permalink: String(product.permalink || ""),
    picture: product.images?.[0]?.src ?? null,
    price,
    currency,
    brand: get("marca"),
    model: get("modelo"),
    year: /^\d{4}$/.test(yearText) ? Number(yearText) : null,
    km: kmDigits ? Number(kmDigits) : null,
    transmission: transmissionOf(get("transmision") ?? "") ?? versionTransmission(title),
    fuel: fuelOf(get("combustible") ?? ""),
    sellerType: "dealer",
    sellerId: site.source,
    dealerName: CAR_SOURCES[site.source].dealerName,
    department: null,
    description: htmlText(`${product.short_description ?? ""} ${product.description ?? ""}`),
    context,
  });
}

export async function harvestWooCars(
  site: WooSite,
  context: WebCarContext,
  options: { fetchPage?: (url: string) => Promise<unknown[] | null>; maxPages?: number; perPage?: number } = {},
): Promise<CarSourceResult> {
  const result = sourceResult(site.source, new Date().toISOString());
  const perPage = options.perPage ?? 100;
  const maxPages = options.maxPages ?? 20;
  const fetchPage = options.fetchPage ?? (async (url: string) => {
    const fetched = await autosFetchJson<unknown>(url);
    return Array.isArray(fetched.body) ? fetched.body : null;
  });
  let reachedEnd = false;
  for (let page = 1; page <= maxPages; page++) {
    const items = await fetchPage(`${site.baseUrl}/wp-json/wc/store/v1/products?per_page=${perPage}&page=${page}`);
    result.requests++;
    if (!items) {
      result.ok = false;
      result.note = `página ${page} sin respuesta`;
      break;
    }
    for (const item of items) addCar(result, wooProductToCar(item as WooProduct, site, context));
    if (items.length < perPage) {
      reachedEnd = true;
      break;
    }
  }
  if (!reachedEnd && result.ok) result.note = "tope de páginas alcanzado";
  result.complete = result.ok && reachedEnd;
  result.finishedAt = new Date().toISOString();
  return result;
}
