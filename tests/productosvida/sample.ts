// The real MercadoLibre sample (fixtures/ml_sample.json: 50 results per search, taken through the
// bridge the night of 2026-11-19), turned into what the shared harvester would hand the catalogue
// builders: each result offered only to the spec of the search that returned it (as
// `harvestMercadoLibre` does), tagged with that spec, the same listing kept once at its cheapest.
// No network, no invented title.
import { readFileSync } from "fs";
import path from "path";
import { specsFor } from "../../classes/equipar/classify";
import { PRODUCTOS_VIDA_CATEGORIES } from "../../classes/productosvida/registry";
import type { RetailListing } from "../../classes/retail/types";

export type SampleRow = [title: string, price: number, currency: "UYU" | "USD", condition: "new" | "used"];

interface SampleFile {
  takenAt: string;
  queries: Record<string, SampleRow[]>;
}

export const SAMPLE: SampleFile = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures", "ml_sample.json"), "utf8")
) as SampleFile;

/**
 * The sample was taken before the tuppers query was settled; its closest real search stands in.
 * Second queries that the sample does not have («lavavajillas compacto», «bicicleta urbana»…) are
 * simply absent.
 */
export const SAMPLE_QUERY_FOR: Record<string, string> = {
  "tupper vidrio hermetico": "contenedores de vidrio hermeticos",
};

/** The dollar rate the sample is read at, close to the night it was taken. */
export const SAMPLE_USD_UYU = 40;

export const sampleRowsFor = (query: string): SampleRow[] => SAMPLE.queries[SAMPLE_QUERY_FOR[query] ?? query] ?? [];

/** One advert of the first real run: what the registry of that night accepted and the band kept. */
export type RealRunRow = [title: string, priceUyu: number, condition: "new" | "used", category: string];

interface RealRunFile {
  takenAt: string;
  usdUyu: number;
  rows: RealRunRow[];
}

/**
 * The first real run of the job (fixtures/ml_dryrun.json: `--dry-run`, 2026-11-20 07:13 UTC, 62
 * result pages, 1 986 adverts). The 50-per-search sample above never saw a hearing-aid drying box, a
 * wooden «mini bar» or a spare belt for a bread maker; this run did. `category` is the category of
 * the search that returned the advert, the only one the harvester offers it to.
 */
export const REAL_RUN: RealRunFile = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures", "ml_dryrun.json"), "utf8")
) as RealRunFile;

export function sampleListings(observedAt = SAMPLE.takenAt): RetailListing[] {
  const byId = new Map<string, RetailListing>();
  const seen = new Set<string>();
  let serial = 0;
  for (const spec of specsFor(PRODUCTOS_VIDA_CATEGORIES)) {
    for (const query of spec.mlQueries ?? []) {
      for (const [title, price, currency, condition] of sampleRowsFor(query)) {
        if (!spec.accept(title)) continue;
        // The sample keeps no ids; the same title at the same price in two searches is one listing.
        const identity = `${title}|${price}|${currency}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        const listingId = `ml:MLU${String(1_000_000 + ++serial)}`;
        byId.set(listingId, {
          listingId,
          source: "mercadolibre",
          sellerKey: `ml:n:vendedor-${serial % 17}`,
          sellerName: `Vendedor ${serial % 17}`,
          channel: "marketplace",
          title,
          url: `https://articulo.mercadolibre.com.uy/MLU-${1_000_000 + serial}-_JM`,
          price,
          currency,
          condition,
          available: true,
          image: null,
          brand: "",
          model: "",
          catalogId: null,
          attributes: { CATEGORY_SPEC: spec.key },
          rating: null,
          ratingCount: 0,
          location: null,
          freeShipping: null,
          officialStore: false,
          listPrice: null,
          observedAt,
        });
      }
    }
  }
  return [...byId.values()];
}
