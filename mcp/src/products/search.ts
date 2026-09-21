// search_products + list_directories: one normalised search over the product
// directories of the site (phones, desk chairs, home equipment, e-scooters and
// e-bikes). Each directory is a whole catalogue, cached and filtered here.

import { compact, fmt, fold, matchesWords, money, PUBLIC_SITE } from "../format.js";
import type { ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";

export const PRODUCT_VERTICALS = ["celulares", "sillas", "hogar", "monopatines", "bicicletas-electricas"] as const;
export type ProductVertical = (typeof PRODUCT_VERTICALS)[number];

export interface Band {
  p25?: number;
  median?: number;
  p75?: number;
  min?: number;
  n?: number;
}

export interface ProductOffer {
  seller?: string;
  title?: string;
  url?: string;
  price?: number;
  currency?: string;
  priceUyu?: number;
  condition?: string;
  available?: boolean;
}

export interface CategoryItem {
  key: string;
  category: string;
  categoryLabel?: string;
  variant?: string;
  variantLabel?: string;
  newBand?: Band | null;
  usedBand?: Band | null;
  usedSavingPct?: number | null;
  usedNote?: string;
  reason?: string;
  tier?: string;
  room?: string;
  offers?: ProductOffer[];
  products?: Array<{ slug?: string; name?: string; brand?: string; bestPriceUyu?: number; sellers?: number; offers?: ProductOffer[] }>;
}

export interface ProductRow {
  vertical: ProductVertical;
  name: string;
  brand?: string;
  category?: string;
  variant?: string;
  bestPriceUyu?: number;
  newBand?: Band;
  usedBand?: Band;
  usedSavingPct?: number;
  sellers?: number;
  bestOffer?: { seller?: string; priceUyu?: number; url?: string; condition?: string };
  bestUsedOffer?: { seller?: string; priceUyu?: number; url?: string; condition?: string };
  rating?: string;
  tier?: string;
  note?: string;
  siteUrl: string;
  /** Matched by text search but not returned: product names inside a category. */
  keywords?: string;
}

const cheapest = (offers: ProductOffer[] | undefined, condition?: string) =>
  (offers ?? [])
    .filter((o) => o.available !== false && typeof o.priceUyu === "number" && (!condition || o.condition === condition))
    .sort((a, b) => a.priceUyu! - b.priceUyu!)[0];

/**
 * The raw offer list of a category is not curated: it holds a 20-peso fridge ad and a paring knife
 * under "chef knife". The site bands are. An offer only counts when it is at least 60 % of the
 * p25 of the band for its own condition.
 */
export function plausibleOffers(offers: ProductOffer[] | undefined, bands: { newBand?: Band | null; usedBand?: Band | null }) {
  return (offers ?? []).filter((o) => {
    const band = o.condition === "used" ? bands.usedBand : bands.newBand;
    return !band?.p25 || (typeof o.priceUyu === "number" && o.priceUyu >= band.p25 * 0.6);
  });
}

const offerOf = (o: ProductOffer | undefined) =>
  o ? compact({ seller: o.seller, priceUyu: o.priceUyu, url: o.url, condition: o.condition === "used" ? "usado" : o.condition === "new" ? "nuevo" : o.condition }) : undefined;

interface PhonesResponse {
  brands?: Array<{ brandLabel?: string; models?: Array<{ slug: string; name: string; brandLabel?: string; storageGb?: number; bestNewUyu?: number; newSellers?: number }> }>;
}

interface ChairsResponse {
  products?: Array<{
    slug: string;
    name: string;
    brand?: string;
    category?: string;
    offers?: ProductOffer[];
    price?: { median?: number; min?: number; max?: number; bestNew?: number | null; bestUsed?: number | null };
    stars?: number | null;
    ratingCount?: number | null;
    tier?: string;
    sellers?: number;
  }>;
}

const MOVILIDAD: Record<string, { api: string; page: string }> = {
  monopatines: { api: "/api/movilidad/monopatin-electrico", page: "/monopatines-electricos-uruguay" },
  "bicicletas-electricas": { api: "/api/movilidad/bicicleta-electrica", page: "/bicicletas-electricas-uruguay" },
};

export function categoryRows(vertical: ProductVertical, items: CategoryItem[], pagePath: (item: CategoryItem) => string): ProductRow[] {
  return items.map((it) => {
    const offers = plausibleOffers([...(it.offers ?? []), ...(it.products?.flatMap((p) => p.offers ?? []) ?? [])], it);
    const best = cheapest(offers, "new") ?? cheapest(offers);
    const bestUsed = cheapest(offers, "used");
    return compact({
      vertical,
      name: [it.categoryLabel, it.variantLabel].filter(Boolean).join(" — "),
      category: it.category,
      variant: it.variant,
      bestPriceUyu: best?.priceUyu ?? it.newBand?.min,
      newBand: it.newBand ?? undefined,
      usedBand: it.usedBand ?? undefined,
      usedSavingPct: it.usedSavingPct ?? undefined,
      sellers: new Set((it.offers ?? []).map((o) => o.seller)).size || undefined,
      bestOffer: offerOf(best),
      bestUsedOffer: offerOf(bestUsed),
      tier: it.tier,
      note: it.usedNote,
      keywords: (it.products ?? []).map((p) => [p.brand, p.name].filter(Boolean).join(" ")).join(" | "),
      siteUrl: `${PUBLIC_SITE}${pagePath(it)}`,
    }) as ProductRow;
  });
}

export async function loadVertical(site: SiteApi, vertical: ProductVertical): Promise<ProductRow[]> {
  if (vertical === "celulares") {
    const res = await site.get<PhonesResponse>("/api/phones", undefined, { ttlMs: TTL.catalog });
    return (res.brands ?? []).flatMap((b) =>
      (b.models ?? []).map(
        (m) =>
          compact({
            vertical,
            name: m.name,
            brand: m.brandLabel ?? b.brandLabel,
            bestPriceUyu: m.bestNewUyu,
            sellers: m.newSellers,
            note: "precio nuevo más bajo entre tiendas y Mercado Libre",
            siteUrl: `${PUBLIC_SITE}/celulares-uruguay/${m.slug}`,
          }) as ProductRow
      )
    );
  }
  if (vertical === "sillas") {
    const res = await site.get<ChairsResponse>("/api/chairs", undefined, { ttlMs: TTL.catalog });
    return (res.products ?? []).map((p) => {
      const best = cheapest(p.offers);
      return compact({
        vertical,
        name: p.name,
        brand: p.brand,
        category: p.category,
        bestPriceUyu: best?.priceUyu ?? p.price?.min,
        newBand: p.price?.median ? { median: p.price.median, min: p.price.min } : undefined,
        sellers: p.sellers,
        bestOffer: offerOf(best),
        rating: p.stars ? `${fmt(p.stars, 1)}★ (${fmt(p.ratingCount ?? 0)} opiniones)` : undefined,
        tier: p.tier,
        siteUrl: `${PUBLIC_SITE}/sillas-escritorio-uruguay/${p.slug}`,
      }) as ProductRow;
    });
  }
  if (vertical === "hogar") {
    const res = await site.get<{ items?: CategoryItem[] }>("/api/equipar", undefined, { ttlMs: TTL.catalog });
    return categoryRows(vertical, res.items ?? [], (it) => `/equipar-casa-uruguay/${it.category}`);
  }
  const m = MOVILIDAD[vertical]!;
  const res = await site.get<{ items?: CategoryItem[] }>(m.api, undefined, { ttlMs: TTL.catalog });
  return categoryRows(vertical, res.items ?? [], () => m.page);
}

export interface ProductSearchInput {
  vertical?: ProductVertical | "todas";
  text?: string;
  brand?: string;
  maxPriceUyu?: number;
  condition?: "new" | "used" | "any";
  limit?: number;
}

export async function searchProducts(site: SiteApi, input: ProductSearchInput): Promise<ToolOutput> {
  const verticals = !input.vertical || input.vertical === "todas" ? [...PRODUCT_VERTICALS] : [input.vertical];
  const settled = await Promise.allSettled(verticals.map((v) => loadVertical(site, v)));
  const failed = verticals.filter((_, i) => settled[i]!.status === "rejected");
  const rows = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (!rows.length && failed.length) throw (settled.find((r) => r.status === "rejected") as PromiseRejectedResult).reason;
  const brand = input.brand ? fold(input.brand) : "";
  const matched = rows
    .filter((r) => matchesWords([r.name, r.brand, r.category, r.variant, r.keywords].filter(Boolean).join(" "), input.text))
    .filter((r) => !brand || fold(`${r.brand ?? ""} ${r.name} ${r.keywords ?? ""}`).includes(brand))
    .filter((r) => input.condition !== "used" || !!r.usedBand)
    .map((r) => (input.condition === "used" && r.usedBand?.median ? { ...r, bestPriceUyu: r.bestUsedOffer?.priceUyu ?? r.usedBand.p25 ?? r.usedBand.median, bestOffer: r.bestUsedOffer ?? r.bestOffer } : r))
    .filter((r) => !input.maxPriceUyu || (r.bestPriceUyu ?? Infinity) <= input.maxPriceUyu)
    .sort((a, b) => (a.bestPriceUyu ?? Infinity) - (b.bestPriceUyu ?? Infinity));
  const limit = Math.max(1, Math.min(30, input.limit ?? 12));
  const items = matched.slice(0, limit).map(({ keywords: _k, ...row }) => row);
  const lines = [`${fmt(matched.length)} productos coinciden en ${verticals.join(", ")} (del más barato al más caro).`];
  items.forEach((r, n) => {
    const bands = [
      r.newBand?.median ? `nuevo típico ${money(r.newBand.median)}${r.newBand.p25 ? ` (${money(r.newBand.p25)}–${money(r.newBand.p75)})` : ""}` : "",
      r.usedBand?.median ? `usado típico ${money(r.usedBand.median)}` : "",
      r.usedSavingPct ? `usado ahorra ~${r.usedSavingPct} %` : "",
      r.bestUsedOffer?.priceUyu && input.condition !== "used" ? `usado desde ${money(r.bestUsedOffer.priceUyu)}${r.bestUsedOffer.seller ? ` (${r.bestUsedOffer.seller})` : ""}` : "",
    ].filter(Boolean);
    lines.push(
      `${n + 1}. ${r.name}${r.brand && !r.name.includes(r.brand) ? ` (${r.brand})` : ""} — desde ${money(r.bestPriceUyu)}` +
        (r.bestOffer?.seller ? ` en ${r.bestOffer.seller}${r.bestOffer.condition ? ` (${r.bestOffer.condition})` : ""}` : "") +
        (bands.length ? ` · ${bands.join(" · ")}` : "") +
        (r.rating ? ` · ${r.rating}` : "") +
        (r.sellers ? ` · ${r.sellers} vendedores` : "") +
        `\n   ${r.bestOffer?.url ?? ""}\n   ficha: ${r.siteUrl}`
    );
  });
  if (!items.length) lines.push("Sin coincidencias: probá con una palabra más general (\"heladera\", \"iphone\", \"silla gamer\").");
  if (failed.length) lines.push(`No se pudo leer: ${failed.join(", ")} (reintentá más tarde).`);
  lines.push("Precios en pesos uruguayos de tiendas y Mercado Libre, relevados a diario; confirmá stock y precio final en el link.");
  return { text: lines.join("\n"), data: { total: matched.length, items, verticals, unavailable: failed } };
}

/** Directory key of /api/directorios → its page and what it lists. */
export const DIRECTORIES: Record<string, { path: string; label: string }> = {
  alquileres: { path: "/alquileres-uruguay", label: "Alquileres (viviendas en alquiler)" },
  ventas: { path: "/venta-viviendas-uruguay", label: "Viviendas en venta" },
  inmobiliarias: { path: "/inmobiliarias-uruguay", label: "Inmobiliarias" },
  autos: { path: "/autos-usados-uruguay", label: "Autos usados" },
  celulares: { path: "/celulares-uruguay", label: "Celulares (modelos con precio)" },
  sillas: { path: "/sillas-escritorio-uruguay", label: "Sillas de escritorio y gamer" },
  tiendas: { path: "/tiendas-online-uruguay", label: "Tiendas online (señales de confianza)" },
  precios: { path: "/precios-de-supermercado-uruguay", label: "Precios de supermercado (artículos SIPC)" },
  casas: { path: "/casas-de-cambio", label: "Casas de cambio" },
  couriers: { path: "/couriers-uruguay", label: "Couriers para compras del exterior" },
  tarjetas: { path: "/tarjetas-de-credito-uruguay", label: "Tarjetas de crédito" },
};

export async function listDirectories(site: SiteApi): Promise<ToolOutput> {
  const res = await site.get<{ cifras?: Record<string, { count?: number; asOf?: string }> }>("/api/directorios", undefined, {
    ttlMs: TTL.catalog,
  });
  const rows = Object.entries(res.cifras ?? {}).map(([key, v]) => ({
    key,
    label: DIRECTORIES[key]?.label ?? key,
    count: v.count ?? null,
    asOf: v.asOf ?? null,
    siteUrl: `${PUBLIC_SITE}${DIRECTORIES[key]?.path ?? "/directorios-uruguay"}`,
  }));
  const extra = [
    { key: "equipar", label: "Equipar una casa (38 categorías, canastas)", siteUrl: `${PUBLIC_SITE}/equipar-casa-uruguay` },
    { key: "movilidad", label: "Monopatines y bicicletas eléctricas", siteUrl: `${PUBLIC_SITE}/monopatines-electricos-uruguay` },
    { key: "oportunidades", label: "Oportunidades inmobiliarias y de autos", siteUrl: `${PUBLIC_SITE}/oportunidades-inmobiliarias-uruguay` },
  ];
  const lines = [
    ...rows.map((r) => `• ${r.label}: ${r.count !== null ? fmt(r.count) : "s/d"}${r.asOf ? ` (al ${r.asOf})` : ""} — ${r.siteUrl}`),
    ...extra.map((r) => `• ${r.label} — ${r.siteUrl}`),
    `Todos: ${PUBLIC_SITE}/directorios-uruguay`,
  ];
  return { text: lines.join("\n"), data: { directories: [...rows, ...extra] } };
}
