// Facebook Marketplace para `/computadoras-usadas-uruguay`: las búsquedas (leídas por el Chrome del
// perfil con `readMarketplaceSearches`, el mismo lector de alquileres y retail) y la ficha de cada
// aviso, donde está la descripción con las piezas.
//
// Medido el 23/11/2026 desde Montevideo: 12 búsquedas + 2 categorías dieron 254 avisos únicos, y
// Facebook cortaba cada lista en su primera página (24 tarjetas). Las búsquedas son muchas y chicas
// a propósito: una lista partida en palabras y en bandas de precio llega más hondo que una sola
// (docs de alquileres: «Una lista es un ranking que Facebook corta»).
import type { MarketplaceCard } from "../../facebook/cards";
import { fbNodes } from "../../facebook/graphql";
import type { MarketplaceSearch } from "../../facebook/search";
import type { FacebookComputerDetail, RawComputerListing } from "../types";

export const FB_QUERIES = [
  "pc gamer",
  "notebook",
  "computadora",
  "laptop",
  "pc de escritorio",
  "macbook",
  "notebook gamer",
  "torre pc",
  "computadora gamer",
  "pc completa",
  "placa de video",
  "rtx",
  "procesador ryzen",
  "procesador intel",
  "memoria ram ddr4",
  "imac",
  "all in one",
  "mini pc",
  "cpu i5",
  "cpu i7",
  "motherboard",
  "ssd",
] as const;

/** Bandas en pesos (el filtro de Marketplace) para las dos palabras con más avisos. */
export const FB_PRICE_BANDS: ReadonlyArray<readonly [number, number]> = [
  [500, 8_000],
  [8_000, 15_000],
  [15_000, 25_000],
  [25_000, 45_000],
  [45_000, 300_000],
];

/** La lista completa (la diaria) o un tramo rotativo de las palabras ordenadas por más nuevas (la horaria). */
export function facebookSearches(options: { fast: boolean; rotation?: number; location?: string }): MarketplaceSearch[] {
  const location = options.location ?? "montevideo";
  if (options.fast) {
    const slice = 6;
    const start = ((options.rotation ?? 0) * slice) % FB_QUERIES.length;
    const words = [...FB_QUERIES.slice(start), ...FB_QUERIES.slice(0, start)].slice(0, slice);
    return words.map((query) => ({ location, query, sort: "newest" as const, narrow: true }));
  }
  return [
    ...FB_QUERIES.map((query) => ({ location, query, narrow: true })),
    ...["pc gamer", "notebook"].flatMap((query) => FB_PRICE_BANDS.map(([minPrice, maxPrice]) => ({ location, query, params: { minPrice, maxPrice }, narrow: true }))),
    { location, query: "computers", category: "computers", narrow: true, maxScrolls: 6 },
  ];
}

/** Una tarjeta de Marketplace como fila cruda. Sin vendedor: en Facebook es casi siempre una persona. */
export function facebookRaw(card: MarketplaceCard, day: string): RawComputerListing | null {
  const amount = Number(card.price?.amount);
  if (!card.id || !card.title || !Number.isFinite(amount)) return null;
  return {
    slug: `fb-${card.id}`,
    source: "facebook",
    sourceId: card.id,
    url: card.url || `https://www.facebook.com/marketplace/item/${card.id}/`,
    title: card.title.slice(0, 300),
    price: amount,
    currency: card.price.currency,
    image: card.image,
    location: card.location,
    category: card.categoryId,
    condition: null,
    officialStore: false,
    sellerId: null,
    firstSeen: day,
    lastSeen: day,
  };
}

/**
 * La ficha de un aviso, de los textos (GraphQL) que dejó su página. `found: false` cuando la página
 * cargó a medias y no trajo el aviso: eso NO es un aviso borrado (se relee pronto). `gone` sólo si el
 * propio aviso dice que se vendió, está pausado o ya no está en Marketplace.
 */
export function facebookDetailFromTexts(id: string, texts: readonly string[], readAt: string): FacebookComputerDetail {
  const nodes = fbNodes(texts, (node) => node.id === id && (!!node.redacted_description || !!node.marketplace_listing_title || node.is_sold !== undefined));
  const node = nodes.find((candidate) => candidate.redacted_description) ?? nodes[0] ?? null;
  if (!node) return { id, readAt, found: false, description: null, attributes: {}, createdAt: null, gone: false };
  const attributes: Record<string, string> = {};
  for (const attribute of Array.isArray(node.attribute_data) ? node.attribute_data : []) {
    const name = String(attribute?.attribute_name ?? "").trim();
    const value = String(attribute?.value ?? "").trim();
    if (name && value && name.length <= 40 && value.length <= 80) attributes[name] = value;
  }
  const created = Number(node.creation_time);
  const description = typeof node.redacted_description?.text === "string" ? node.redacted_description.text.trim().slice(0, 4_000) : null;
  const gone = node.is_sold === true || node.is_pending === true || node.is_live === false || node.is_hidden === true;
  return {
    id,
    readAt,
    found: true,
    description: description || null,
    attributes,
    createdAt: Number.isFinite(created) && created > 1_400_000_000 ? new Date(created * 1000).toISOString() : null,
    gone,
  };
}

/** Días tras los que una ficha leída se relee (el vendedor edita precio y texto). */
export const FB_DETAIL_REREAD_DAYS = 21;
/** Una ficha que cargó a medias se reintenta antes. */
export const FB_DETAIL_RETRY_DAYS = 2;

/**
 * Qué fichas leer: primero las de `priority` (las que serían oportunidad si tuvieran ficha), después
 * las nunca leídas (las más nuevas primero) y al final las viejas.
 */
export function facebookDetailTargets(raws: readonly RawComputerListing[], details: ReadonlyMap<string, FacebookComputerDetail>, now: Date, max: number, priority: ReadonlySet<string> = new Set()): RawComputerListing[] {
  const age = (iso: string): number => (now.getTime() - new Date(iso).getTime()) / 86_400_000;
  const fresh = raws.filter((raw) => raw.source === "facebook" && raw.price > 1);
  const never = fresh
    .filter((raw) => !details.has(raw.sourceId))
    .sort((a, b) => Number(priority.has(b.sourceId)) - Number(priority.has(a.sourceId)) || b.firstSeen.localeCompare(a.firstSeen));
  const stale = fresh
    .filter((raw) => {
      const detail = details.get(raw.sourceId);
      if (!detail || detail.gone) return false;
      return age(detail.readAt) > (detail.found ? FB_DETAIL_REREAD_DAYS : FB_DETAIL_RETRY_DAYS);
    })
    .sort((a, b) => (details.get(a.sourceId)!.readAt).localeCompare(details.get(b.sourceId)!.readAt));
  return [...never, ...stale].slice(0, max);
}
