// Avisos de armadores en Facebook Marketplace: la mayor parte de los armadores independientes de
// Montevideo anuncia acá y en ningún otro lado. Medido el 11/11/2026: ~20 avisos con precio por
// búsqueda por el puente, más con el scroll del Chrome del perfil (`readMarketplaceSearches`).
//
// Lo que se publica de cada aviso: título, precio de la tarjeta (rotulado «precio del aviso», nunca
// atribuido a un mueble), barrios y servicios que nombra, y la lista de precios de su descripción
// cuando la ficha se pudo leer. NO se publica la imagen (las URLs del CDN de Facebook vencen en
// días), ni el vendedor, ni ningún contacto: la ficha exige sesión.
import { fbNodes } from "../../facebook/graphql";
import type { MarketplaceSearch } from "../../facebook/search";
import { blankEntry, withZones } from "../entry";
import { coverageFromText, isAssemblyTitle, pricesFromText, servicesFromText, stripContacts } from "../text";
import { SYMBOLIC_PRICE_UYU, type ArmadorEntry, type ArmadorPrice } from "../types";
import { zoneOfBarrio } from "../zones";

export const FACEBOOK_QUERIES = [
  "armador de muebles",
  "armado de muebles",
  "armado y desarmado de muebles",
  "armador de muebles a domicilio",
  "armado de roperos",
  "armador",
];

/** Las búsquedas de Marketplace desde Montevideo. `narrow`: una búsqueda chica que termina en su
 * primera página no es el freno de Facebook. */
export function facebookSearches(location = "montevideo"): MarketplaceSearch[] {
  return FACEBOOK_QUERIES.map(query => ({ location, query, narrow: true, maxScrolls: 12 }));
}

export interface FacebookCardLike {
  id: string;
  title: string;
  url: string;
  price: { amount?: number; currency: "UYU" | "USD" };
  image?: string | null;
  location: string | null;
}

/** La descripción del propio aviso en los textos de su ficha; null si no está. */
export function facebookDescription(id: string, texts: readonly string[]): string | null {
  const nodes = fbNodes(texts, node => node.id === id && !!node.redacted_description);
  const text = nodes.map(node => node.redacted_description?.text).find(value => typeof value === "string" && value.trim());
  return typeof text === "string" ? text.trim().slice(0, 4_000) : null;
}

/** "Montevideo, Uruguay" → "Montevideo"; "Las Piedras, Uruguay" → "Las Piedras". */
const cityOf = (location: string | null): string => String(location || "").split(",")[0]!.trim();

export function facebookEntry(card: FacebookCardLike, description: string | null, day: string): ArmadorEntry | null {
  if (!isAssemblyTitle(card.title) || !String(card.url || "").startsWith("https://")) return null;
  const city = cityOf(card.location);
  const metro = city && city !== "Montevideo" ? zoneOfBarrio(city) : null;
  // Fuera de Montevideo y del área metropolitana no es este directorio (Florida, Maldonado…).
  if (city !== "Montevideo" && metro !== "metropolitana") return null;

  const entry = blankEntry({ id: `fb:${card.id}`, source: "facebook", kind: "aviso", name: stripContacts(card.title) || "Aviso de armado de muebles", url: card.url }, day);
  const text = [card.title, description ?? ""].join("\n");
  entry.coverage = withZones(coverageFromText(text));
  entry.base = metro
    ? { barrio: city, zone: "metropolitana", department: "Canelones", basis: "text" }
    : { barrio: null, zone: null, department: "Montevideo", basis: null };
  entry.services = [...new Set<ArmadorEntry["services"][number]>(["armado", ...servicesFromText(text)])];

  const amount = Number(card.price?.amount);
  const prices: ArmadorPrice[] = [];
  if (Number.isFinite(amount) && amount >= (card.price.currency === "USD" ? 5 : SYMBOLIC_PRICE_UYU)) {
    prices.push({
      item: null, label: "Precio del aviso", amount, amountMax: null, currency: card.price.currency,
      kind: "ad", conditions: null, sourceUrl: card.url, observedAt: day, origin: "ad-card",
    });
  } else {
    entry.symbolicPrice = true;
  }
  if (description) prices.push(...pricesFromText(description, card.url, day));
  entry.prices = prices;
  entry.sources = [{ url: card.url, consultedAt: day, label: "Facebook Marketplace" }];
  return entry;
}
