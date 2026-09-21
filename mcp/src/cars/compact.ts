// One used-car advert → the compact shape every car tool returns, and its line of
// text. Prices are in US dollars; a currency the site had to infer is flagged.

import { compact, fmt, isoDay, money, PUBLIC_SITE } from "../format.js";

export interface RawCar {
  key: string;
  source?: string;
  sourceName?: string;
  brand?: string;
  model?: string;
  marketSlug?: string;
  title?: string;
  year?: number;
  km?: number | null;
  price?: number;
  currency?: string;
  priceUsd?: number;
  currencyInferred?: boolean;
  transmission?: string | null;
  fuel?: string | null;
  fuelEconomy?: { litersPer100Km?: number | null } | null;
  body?: { type?: string } | null;
  doors?: number | null;
  color?: string | null;
  engine?: string | null;
  trim?: string | null;
  department?: string | null;
  neighborhood?: string | null;
  sellerType?: string | null;
  dealerName?: string | null;
  permalink?: string;
  firstSeen?: string;
  lastSeen?: string;
  priceDrop?: { from?: number; to?: number; at?: string; pct?: number } | null;
  risks?: Array<{ category?: string; severity?: string; quote?: string }>;
  opportunity?: { tier?: string; gap?: number; median?: number; n?: number } | null;
  reference?: { priceUsd?: number; basis?: string } | null;
}

export const RISK_LABEL: Record<string, string> = {
  deuda: "deuda",
  papeles: "papeles/título",
  siniestro: "chocado o siniestrado",
  recupero: "recupero (robado recuperado)",
  mecanica: "problema mecánico",
  uso_intensivo: "uso intensivo (ex taxi, remise, app)",
  chapa_extranjera: "chapa extranjera",
};

export function carSiteUrl(key: string): string {
  return `${PUBLIC_SITE}/autos-usados-uruguay/${encodeURIComponent(key)}`;
}

export function compactCar(c: RawCar) {
  return compact({
    key: c.key,
    title: c.title,
    brand: c.brand,
    model: c.model,
    modelSlug: c.marketSlug,
    trim: c.trim ?? undefined,
    engine: c.engine ?? undefined,
    year: c.year,
    km: c.km ?? undefined,
    priceUsd: c.priceUsd,
    listedAs: c.currency && c.currency !== "USD" ? money(c.price, c.currency) : undefined,
    currencyInferred: c.currencyInferred || undefined,
    fuel: c.fuel ?? undefined,
    transmission: c.transmission ?? undefined,
    body: c.body?.type,
    doors: c.doors ?? undefined,
    color: c.color ?? undefined,
    litersPer100Km: c.fuelEconomy?.litersPer100Km ?? undefined,
    department: c.department ?? undefined,
    seller: c.sellerType === "dealer" ? `automotora${c.dealerName ? ` ${c.dealerName}` : ""}` : c.sellerType === "private" ? "particular" : undefined,
    source: c.sourceName ?? c.source,
    listingUrl: c.permalink,
    siteUrl: carSiteUrl(c.key),
    firstSeen: isoDay(c.firstSeen),
    priceDrop: c.priceDrop ?? undefined,
    opportunity: c.opportunity?.gap
      ? { gapPct: Math.round(c.opportunity.gap * 100), cohortMedianUsd: c.opportunity.median, comparables: c.opportunity.n, tier: c.opportunity.tier }
      : undefined,
    guidePriceUsd: c.reference?.priceUsd,
    declaredRisks: c.risks?.length
      ? c.risks.map((r) => compact({ what: RISK_LABEL[r.category ?? ""] ?? r.category, severity: r.severity, quote: r.quote }))
      : undefined,
  });
}

export type CompactCar = ReturnType<typeof compactCar>;

/** "Peugeot 208 1.5 Allure 2017 · 112.000 km · US$ 7.900 · manual nafta 7,2 L/100 · Salto · particular" */
export function carLine(c: CompactCar): string {
  const head = [c.title || `${c.brand ?? ""} ${c.model ?? ""}`.trim(), c.year].filter(Boolean).join(" ");
  const bits = [
    c.km !== undefined ? `${fmt(c.km)} km` : "km s/d",
    `${money(c.priceUsd, "USD")}${c.currencyInferred ? " (moneda deducida)" : ""}`,
    [c.transmission, c.fuel].filter(Boolean).join(" "),
    c.litersPer100Km ? `${fmt(c.litersPer100Km, 1)} L/100 km` : "",
    c.department ?? "",
    c.seller ?? "",
    c.source ?? "",
  ].filter(Boolean);
  const flags = [
    c.opportunity ? `oportunidad: ${c.opportunity.gapPct} % bajo su cohorte (mediana ${money(c.opportunity.cohortMedianUsd, "USD")})` : "",
    c.priceDrop ? "bajó de precio" : "",
    c.guidePriceUsd ? `guía ML ${money(c.guidePriceUsd, "USD")}` : "",
    c.declaredRisks?.length ? `⚠ declara: ${c.declaredRisks.map((r) => r.what).join(", ")}` : "",
  ].filter(Boolean);
  return `${head} · ${bits.join(" · ")}${flags.length ? ` · ${flags.join(" · ")}` : ""}\n  ${c.listingUrl ?? ""}\n  ficha: ${c.siteUrl}`;
}

