// Qué cuenta de Mercado Libre es de qué automotora, reconocida por su INVENTARIO y nunca por el
// nombre: si decenas de autos de la web de Carper tienen su gemelo exacto (./dedupe.ts `carTwins`) en
// una misma cuenta de ML, esa cuenta es Carper y sus avisos llevan el número comercial de la
// `contactPage` de Carper. Se recalcula en cada corrida con los avisos del momento.
//
// Medido el 2026-09-21: Shopping de Autos publica desde 3 cuentas (44, 25 y 19 gemelos), Carper desde
// 2 (61 y 33), Fidocar y Motorlider desde una (47 y 35); cualquier otra cuenta comparte entre 1 y 4
// autos con esas webs, que es lo que da el azar de un mercado chico. Julio y Car One no tienen cuenta
// dominante.
import { carTwins } from "../dedupe";
import { CAR_SOURCES } from "../sources/registry";
import type { CarListing, CarSource } from "../types";

export interface DealerAccount {
  sellerId: string;
  source: CarSource;
  /** Autos de la web de la automotora que esta cuenta también publica. */
  twins: number;
  /** Avisos de automotora de esta cuenta en la corrida. */
  adverts: number;
}

export const DEALER_ACCOUNT_POLICY = { minTwins: 10, minShare: 0.3 } as const;

const carOf = (listing: CarListing): string => `${listing.brandId}|${listing.modelId}|${listing.year}`;

export function inferDealerAccounts(listings: readonly CarListing[]): Map<string, DealerAccount> {
  const mlByCar = new Map<string, CarListing[]>();
  const adverts = new Map<string, number>();
  for (const listing of listings) {
    if (listing.source !== "mercadolibre" || listing.sellerType !== "dealer" || !listing.sellerId) continue;
    mlByCar.set(carOf(listing), [...(mlByCar.get(carOf(listing)) ?? []), listing]);
    adverts.set(listing.sellerId, (adverts.get(listing.sellerId) ?? 0) + 1);
  }
  // seller -> dealer source -> twins (web cars, each counted once per seller).
  const counts = new Map<string, Map<CarSource, number>>();
  for (const web of listings) {
    if (!CAR_SOURCES[web.source].contactPage || web.km === null) continue;
    const sellers = new Set((mlByCar.get(carOf(web)) ?? []).filter(ml => carTwins(ml, web)).map(ml => ml.sellerId!));
    for (const seller of sellers) {
      const bySource = counts.get(seller) ?? new Map<CarSource, number>();
      bySource.set(web.source, (bySource.get(web.source) ?? 0) + 1);
      counts.set(seller, bySource);
    }
  }
  const accounts = new Map<string, DealerAccount>();
  for (const [sellerId, bySource] of counts) {
    const [first, second] = [...bySource].sort((a, b) => b[1] - a[1]);
    if (!first) continue;
    const [source, twins] = first;
    const total = adverts.get(sellerId) ?? 0;
    // Una cuenta repartida entre dos automotoras no es de ninguna: se exige el doble que la segunda.
    if (twins < DEALER_ACCOUNT_POLICY.minTwins || twins < total * DEALER_ACCOUNT_POLICY.minShare) continue;
    if (second && second[1] * 2 > twins) continue;
    accounts.set(sellerId, { sellerId, source, twins, adverts: total });
  }
  return accounts;
}
