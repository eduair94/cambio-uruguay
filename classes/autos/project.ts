// The public boundary. Every public row is REBUILT field by field: descriptions, seller ids, price
// history and the ML detail payload never cross it.
import { CAR_OPPORTUNITY_POLICY, type CarAnalysis, type CarCandidate } from "./analyze";
import { cleanPublicText } from "./normalize";
import { safeSourcePermalink, safeSourcePicture } from "./sources/registry";
import { risksOf, type CarRiskItem } from "./riskAnalyze";
import type {
  PublicCarCatalogMeta, PublicCarComparable, PublicCarListing, PublicCarOpportunityItem, PublicCarOpportunitySnapshot,
  PublicCarRiskCategoryStat, PublicCarRiskItem, PublicCarRiskSnapshot, PublicCarRiskStats, PublicCarSourceCoverage,
} from "./publicTypes";
import type { CarListing } from "./types";

export const CAR_CATALOG_FRESH_DAYS = 4;
const round3 = (value: number): number => Math.round(value * 1000) / 1000;

function dealerNameOf(listing: CarListing): string | null {
  // A dealer's own website names itself; ML names the dealer only on the advert's page.
  if (listing.dealerName) return cleanPublicText(listing.dealerName) || null;
  if (listing.sellerType !== "dealer" || !listing.detail?.sellerName) return null;
  return cleanPublicText(listing.detail.sellerName) || null;
}

export function publicCarListing(listing: CarListing, opportunity: PublicCarListing["opportunity"]): PublicCarListing | null {
  if (!safeSourcePermalink(listing.source, listing.permalink)) return null;
  return {
    key: listing.key,
    source: listing.source,
    sourceName: listing.sourceName,
    brand: listing.brand,
    brandSlug: listing.brandSlug,
    model: listing.model,
    modelSlug: listing.modelSlug,
    marketSlug: listing.marketSlug,
    title: cleanPublicText(listing.title).slice(0, 160),
    year: listing.year,
    km: listing.kmQuality === "ok" ? listing.km : null,
    price: listing.price,
    listedPrice: listing.listedPrice ?? null,
    currency: listing.currency,
    priceUsd: listing.priceUsd,
    priceConverted: listing.priceConverted,
    currencyInferred: !!listing.currencyInferred,
    transmission: listing.transmission,
    fuel: listing.fuel,
    fuelEconomy: listing.fuelEconomy ? { ...listing.fuelEconomy } : null,
    body: listing.body ? { ...listing.body } : null,
    doors: listing.doors ?? null,
    color: listing.color ?? null,
    engine: listing.engine,
    trim: listing.trimLabel,
    department: listing.department,
    neighborhood: listing.neighborhood,
    sellerType: listing.sellerType,
    dealerName: dealerNameOf(listing),
    picture: safeSourcePicture(listing.source, listing.picture),
    pictureCount: listing.pictureCount,
    permalink: listing.permalink,
    firstSeen: listing.firstSeen,
    lastSeen: listing.lastSeen,
    priceDrop: listing.priceDrop ? { ...listing.priceDrop } : null,
    flags: [...listing.flags],
    risks: risksOf(listing).map(risk => ({ category: risk.category, severity: risk.severity, quote: risk.quote, from: risk.from })),
    opportunity,
    reference: listing.reference ? { ...listing.reference } : null,
  };
}

const badgeOf = (candidate: CarCandidate): NonNullable<PublicCarListing["opportunity"]> => ({
  tier: candidate.tier, gap: round3(candidate.sample.gap), median: Math.round(candidate.sample.median), n: candidate.sample.n,
});

export interface CatalogContext {
  now: Date;
  generatedAt: string;
  usdUyu: number;
  lastFullReadAt: string | null;
  lastReadAt: string | null;
  reportedTotal: number | null;
  sources: PublicCarSourceCoverage[];
}

export function buildCarCatalog(listings: readonly CarListing[], analysis: CarAnalysis, context: CatalogContext): { listings: PublicCarListing[]; meta: PublicCarCatalogMeta } {
  const badges = new Map(analysis.accepted.map(candidate => [candidate.subject.key, badgeOf(candidate)]));
  const cutoff = context.now.getTime() - CAR_CATALOG_FRESH_DAYS * 86_400_000;
  const rows = listings
    .filter(listing => Date.parse(listing.lastSeen) >= cutoff)
    .map(listing => publicCarListing(listing, badges.get(listing.key) ?? null))
    .filter((row): row is PublicCarListing => !!row)
    .sort((a, b) => a.key.localeCompare(b.key));
  const models = new Map<string, { slug: string; brand: string; model: string; listings: number }>();
  for (const row of rows) {
    const entry = models.get(row.marketSlug) ?? { slug: row.marketSlug, brand: row.brand, model: row.model, listings: 0 };
    entry.listings++;
    models.set(row.marketSlug, entry);
  }
  return {
    listings: rows,
    meta: {
      key: "uy-cars",
      generatedAt: context.generatedAt,
      freshDays: CAR_CATALOG_FRESH_DAYS,
      sourceCoverage: "partial",
      listings: rows.length,
      usdUyu: context.usdUyu,
      lastFullReadAt: context.lastFullReadAt,
      lastReadAt: context.lastReadAt,
      reportedTotal: context.reportedTotal,
      opportunities: rows.filter(row => row.opportunity).length,
      models: [...models.values()].sort((a, b) => b.listings - a.listings || a.slug.localeCompare(b.slug)),
      sources: context.sources.map(source => ({ ...source })),
    },
  };
}

function comparable(listing: CarListing): PublicCarComparable {
  return {
    key: listing.key,
    source: listing.source,
    sourceName: listing.sourceName,
    title: cleanPublicText(listing.title).slice(0, 160),
    year: listing.year,
    km: listing.km!,
    priceUsd: listing.priceUsd,
    trim: listing.trimLabel,
    engine: listing.engine,
    sellerType: listing.sellerType,
    permalink: listing.permalink,
    lastSeen: listing.lastSeen,
  };
}

export function buildOpportunitySnapshot(analysis: CarAnalysis, context: { generatedAt: string; usdUyu: number }): PublicCarOpportunitySnapshot {
  const policy = CAR_OPPORTUNITY_POLICY;
  const items: PublicCarOpportunityItem[] = [];
  for (const candidate of analysis.accepted) {
    const subject = publicCarListing(candidate.subject, badgeOf(candidate));
    if (!subject || !candidate.subject.detail) continue;
    const sample = candidate.sample;
    items.push({
      subject,
      tier: candidate.tier,
      gap: round3(sample.gap),
      conservativeGap: round3(sample.conservativeGap),
      sellerSensitivityGap: round3(sample.sellerSensitivityGap),
      sample: {
        n: sample.n, sellers: sample.sellers, dealers: sample.dealers, privates: sample.privates,
        p25: Math.round(sample.p25), median: Math.round(sample.median), p75: Math.round(sample.p75),
        spread: round3(sample.spread), kmMedian: Math.round(sample.kmMedian), kmP75: Math.round(sample.kmP75),
      },
      comparables: candidate.comparables.filter(peer => safeSourcePermalink(peer.source, peer.permalink)).map(comparable),
      detailReadAt: candidate.subject.detail.readAt,
    });
  }
  return {
    version: 1,
    algorithm: "car-cohort-v2",
    generatedAt: context.generatedAt,
    usdUyu: context.usdUyu,
    policy: {
      freshDays: policy.freshDays,
      kmToleranceRatio: policy.kmToleranceRatio,
      kmToleranceMin: policy.kmToleranceMin,
      maximumPerSeller: policy.maximumPerSeller,
      maximumGap: policy.maximumGap,
      strict: { ...policy.strict },
      exploratory: { ...policy.exploratory },
    },
    items,
    stats: { ...analysis.stats, excluded: { ...analysis.stats.excluded }, rejectedByDetail: { ...analysis.stats.rejectedByDetail } },
  };
}

/**
 * El tablero de precios con motivo. La cita del vendedor cruza la frontera pública ya limpia por
 * `risk.ts`; la descripción entera, nunca. Un aviso sin permalink publicable no entra.
 */
export function buildRiskSnapshot(
  analysis: { items: readonly CarRiskItem[]; categories: readonly PublicCarRiskCategoryStat[]; stats: PublicCarRiskStats },
  context: { generatedAt: string; usdUyu: number },
): PublicCarRiskSnapshot {
  const items: PublicCarRiskItem[] = [];
  for (const item of analysis.items) {
    const subject = publicCarListing(item.subject, null);
    if (!subject) continue;
    items.push({
      subject,
      risks: item.risks.map(risk => ({ category: risk.category, severity: risk.severity, quote: risk.quote, from: risk.from })),
      severity: item.severity,
      gap: item.gap,
      median: item.sample ? Math.round(item.sample.median) : null,
      n: item.sample ? item.sample.n : null,
      sellers: item.sample ? item.sample.sellers : null,
      photoConfirms: item.photoConfirms,
    });
  }
  return {
    version: 1,
    generatedAt: context.generatedAt,
    usdUyu: context.usdUyu,
    items,
    categories: analysis.categories.map(category => ({ ...category })),
    stats: { ...analysis.stats },
  };
}
