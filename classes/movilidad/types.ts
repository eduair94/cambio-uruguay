// Meta shape for the movilidad job (monopatines y bicicletas eléctricas).
//
// The ITEM shape needs no new type: `buildEquiparCatalog` (classes/equipar/catalog.ts) always
// returns `EquiparItem[]` regardless of which registry it classified against, so `sync_movilidad.ts`
// and `classes/movilidad/store.ts` import `EquiparItem` directly from `classes/equipar/types.ts`
// rather than declaring a parallel one that could drift from it.
//
// The META shape DOES need its own type: `EquiparMeta` carries `baskets`, and monopatines/bicicletas
// are not part of a room-filling basket — `classes/equipar/basket.ts` only ever iterates
// `EQUIPAR_CATEGORIES`, never an injected registry (see the comment on `EquiparRoom` in
// `classes/equipar/types.ts`) — so there is no total to publish alongside this catalogue.
import type { EquiparSourceRun } from "../equipar/types";

export interface MovilidadMeta {
  generatedAt: string;
  usdUyu: number;
  listings: number;
  items: number;
  runs: EquiparSourceRun[];
  /** Categories that produced nothing this run, so the page can say so instead of hiding them. */
  uncovered: string[];
}
