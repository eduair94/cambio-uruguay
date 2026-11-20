// Meta shape for the /productos-que-te-cambian-la-vida-uruguay job.
//
// The ITEM and LISTING shapes need no new type: `buildEquiparCatalog` and `buildEquiparListings`
// (classes/equipar/) return `EquiparItem[]` and `EquiparListingRow[]` whatever registry they were
// handed. The META is `MovilidadMeta`'s shape (equipar's minus `baskets`): these products are not part
// of a room-filling basket, so there is no total to publish.
import type { EquiparSourceRun } from "../equipar/types";

export interface ProductosVidaMeta {
  generatedAt: string;
  usdUyu: number;
  /** Accepted MercadoLibre listings this run. */
  listings: number;
  items: number;
  /** Exactly one entry, `key: "mercadolibre"`: this job reads no other source. */
  runs: EquiparSourceRun[];
  /** Categories that had no band this run, so the page can say so instead of hiding them. */
  uncovered: string[];
}
