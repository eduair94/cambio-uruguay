// A quién le leemos la ficha propia primero.
//
// Medido el 2026-09-18: de 16.865 avisos de Mercado Libre teníamos 122 fichas. La ficha es la única
// fuente de dos cosas que no están en la tarjeta de búsqueda: la VERSIÓN, que decide si un auto puede
// compararse con otro, y la DESCRIPCIÓN, que es donde el vendedor escribe "tiene deuda de 52.000" o
// "chocado de atrás". Una sola lectura sirve a las dos.
//
// El orden no es caprichoso: primero los que están baratos contra una cohorte floja, porque ahí hay
// un motivo que explicar y es lo que el sitio tiene que poder contar.
import { quantile } from "./stats";
import type { StoredCar } from "./types";

export interface DetailTarget {
  key: string;
  permalink: string;
  /** Por qué está en la cola, para poder contarlo en el log. */
  reason: "cheap" | "blocking" | "new" | "specs";
}

export interface DetailQueueOptions {
  now: Date;
  /** Sólo se releen fichas más viejas que esto; 0 desactiva la relectura. */
  refreshDays?: number;
  /** Cuán por debajo de la mediana floja hay que estar para entrar como "barato". */
  cheapGap?: number;
  usdUyu: number;
}

const ML_PAGE = /^https:\/\/auto\.mercadolibre\.com\.uy\/MLU-/;
const LOOSE_MIN_SAMPLE = 5;
const KM_TOLERANCE_RATIO = 0.3;
const KM_TOLERANCE_MIN = 20_000;

const priceUsdOf = (doc: StoredCar, usdUyu: number): number =>
  doc.listing.currency === "USD" ? doc.listing.price : Math.round(doc.listing.price / Math.max(1, usdUyu));

export interface LooseGroup {
  /** Mediana de precio en dólares del grupo marca+modelo+año. */
  price: number;
  /** Mediana de kilómetros: un auto no está barato por tener el doble de km que sus hermanos. */
  km: number | null;
  n: number;
}

/**
 * Medianas por marca+modelo+año y nada más: no alcanzan para llamar barato a un auto —de eso se ocupa
 * la cohorte, con versión, motor y caja— pero alcanzan de sobra para decidir a quién le leemos la
 * ficha primero.
 */
export function looseMedians(docs: readonly StoredCar[], usdUyu: number): Map<string, LooseGroup> {
  const groups = new Map<string, { prices: number[]; kms: number[] }>();
  for (const doc of docs) {
    const price = priceUsdOf(doc, usdUyu);
    if (!(price > 0)) continue;
    const key = `${doc.listing.brandId}|${doc.listing.modelId}|${doc.listing.year}`;
    const group = groups.get(key) ?? { prices: [], kms: [] };
    group.prices.push(price);
    if (doc.listing.km !== null && doc.listing.km > 0) group.kms.push(doc.listing.km);
    groups.set(key, group);
  }
  const medians = new Map<string, LooseGroup>();
  for (const [key, group] of groups) {
    if (group.prices.length < LOOSE_MIN_SAMPLE) continue;
    medians.set(key, {
      price: quantile(group.prices, 0.5),
      km: group.kms.length ? quantile(group.kms, 0.5) : null,
      n: group.prices.length,
    });
  }
  return medians;
}

const blocksCohort = (doc: StoredCar): boolean =>
  !doc.listing.transmission || !doc.detail?.version;

/** La cola de lectura, ya ordenada y sin lo que no se puede leer. */
export function detailTargets(docs: readonly StoredCar[], options: DetailQueueOptions): DetailTarget[] {
  const refreshCutoff = options.refreshDays
    ? options.now.getTime() - options.refreshDays * 86_400_000
    : null;
  const medians = looseMedians(docs, options.usdUyu);
  const cheapGap = options.cheapGap ?? 0.12;
  const groupSizes = new Map<string, number>();
  for (const doc of docs) {
    const key = `${doc.listing.brandId}|${doc.listing.modelId}|${doc.listing.year}`;
    groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
  }
  const targets: Array<DetailTarget & { rank: number; size: number; lastSeen: string }> = [];
  for (const doc of docs) {
    if (!ML_PAGE.test(doc.listing.permalink)) continue;
    // Una ficha leída antes del 2026-09-22 no guardó la tabla técnica: vuelve una vez, después de
    // todo lo que nunca se leyó. Una tabla vacía (`{}`) ya cuenta como leída.
    const upgrade = !!doc.detail && doc.detail.specs === undefined;
    if (doc.detail && !upgrade) {
      // Ya la leímos: sólo vuelve a la cola si se pidió relectura y la ficha es vieja.
      if (!refreshCutoff || Date.parse(doc.detail.readAt) >= refreshCutoff) continue;
    }
    const key = `${doc.listing.brandId}|${doc.listing.modelId}|${doc.listing.year}`;
    const group = medians.get(key);
    const price = priceUsdOf(doc, options.usdUyu);
    const km = doc.listing.km;
    // Un auto con el doble de kilómetros que sus hermanos no está barato: está usado.
    const kmComparable = !group?.km || km === null || km <= group.km * (1 + KM_TOLERANCE_RATIO) + KM_TOLERANCE_MIN;
    const cheap = !!group && price > 0 && 1 - price / group.price >= cheapGap && kmComparable;
    // Una ficha que ya leímos y sólo vuelve por la tabla va SIEMPRE última, aunque el auto esté
    // barato o le falte la versión: su descripción y su versión ya están, y lo que esperan atrás
    // son avisos nunca leídos. Medido el 2026-09-22 al desplegar: clasificarla antes puso 2.461
    // relecturas por delante de todo aviso nuevo, unas seis horas de cola.
    const reason: DetailTarget["reason"] = upgrade ? "specs" : cheap ? "cheap" : blocksCohort(doc) ? "blocking" : "new";
    targets.push({
      key: doc.key,
      permalink: doc.listing.permalink,
      reason,
      rank: reason === "cheap" ? 0 : reason === "blocking" ? 1 : reason === "new" ? 2 : 3,
      size: groupSizes.get(key) ?? 0,
      lastSeen: doc.lastSeen,
    });
  }
  return targets
    .sort((a, b) => a.rank - b.rank || b.size - a.size || b.lastSeen.localeCompare(a.lastSeen) || a.key.localeCompare(b.key))
    .map(({ key, permalink, reason }) => ({ key, permalink, reason }));
}

export const queueSummary = (targets: readonly DetailTarget[]): Record<DetailTarget["reason"], number> => {
  const summary: Record<DetailTarget["reason"], number> = { cheap: 0, blocking: 0, new: 0, specs: 0 };
  for (const target of targets) summary[target.reason]++;
  return summary;
};
