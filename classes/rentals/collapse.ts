import type { RentalMeta } from "./types";

/**
 * ¿La corrida completa de hoy es una caída de los portales, o una corrida normal?
 *
 * La pregunta sólo tiene sentido contra OTRA CORRIDA COMPLETA. Hasta el 20/11/2026 se comparaba
 * contra todo lo almacenado, y lo almacenado no es lo que una corrida lee: Mercado Libre, InfoCasas
 * y Facebook son parciales, sus avisos no vistos se conservan hasta 21 días, y las tandas horarias
 * suman novedades todo el día. Medido ese día: 89.590 propiedades guardadas contra 42–54 mil avisos
 * por corrida completa, o sea que una corrida SANA leía entre el 47 % y el 61 % de lo guardado y el
 * umbral del 50 % caía de un lado u otro según cuánto trajera Facebook. Cinco de las últimas diez
 * corridas completas (11, 12, 14, 19 y 20 de noviembre) se tiraron enteras: una hora de lectura sin
 * guardar, y sin poda, sin bajas de precio y sin corrección de monedas ese día. Nadie lo vio porque
 * la negativa sale antes de escribir el resumen de la corrida.
 *
 * Dos varas, y hacen falta las dos:
 *
 * 1. LA ÚLTIMA CORRIDA COMPLETA GUARDADA (`RENTAL_FULL_META_KEY`, que ya existía), aviso contra
 *    aviso: menos de `ratio` de lo que trajo ésa es una caída. Las cinco corridas tiradas traían
 *    entre el 85 % y el 89 %.
 * 2. UN PISO CONTRA LO ALMACENADO que no se mueve con cada corrida: menos de `ratio / 2`. La vara 1
 *    se renueva sola, así que una caída en escalones la pasaría toda — un día sin Mercado Libre
 *    (56 % de la anterior: se guarda), al siguiente también sin InfoCasas (50,01 % de ESA: se
 *    guardaría por tres avisos), y en tres días queda el 17 % sin una sola negativa. Lo almacenado
 *    tarda 21 días en bajar: contra eso el segundo día es el 15,6 % y se rechaza.
 *
 * Lo que la guarda NO cubre, a sabiendas: perder UNA fuente grande pasa (sin Mercado Libre queda el
 * 56 % de la corrida anterior y el 31 % de lo almacenado). Está bien que pase — las demás fuentes se
 * guardan frescas, y una corrida flaca guardada no borra nada por ausencia en las fuentes
 * parciales (`sourcesAllowingExpiry`) —, pero no puede pasar callada: si la fuente sigue caída,
 * sus propiedades dejan de mostrarse a los 10 días (`RENTAL_STALE_DAYS`) y `pruneStaleRentals` las
 * borra a los 21, completa o no la fuente. Por eso `rentalSourceDrops`, que mide cada fuente contra
 * su propia mediana de las últimas corridas y no contra la de ayer, y el aviso de `sync_rentals.ts`.
 *
 * Sin una corrida completa guardada (base nueva) queda la regla anterior, contra lo almacenado.
 * `RENTALS_COLLAPSE_RATIO=0` apaga las dos varas: es la salida para una baja permanente y sabida
 * (un portal que se saca), porque mientras la corrida se rechaza la vara 1 no se renueva.
 */
export interface RentalCollapseInput {
  mode: "full" | "fast";
  /** Avisos que trajo esta corrida, todas las fuentes sumadas. */
  listings: number;
  /** Propiedades que armó esta corrida. */
  properties: number;
  /** Propiedades guardadas: todas, también las que ningún portal muestra hace días. */
  stored: number;
  /** El resumen de la última corrida completa guardada, si lo hay. */
  lastFull: Pick<RentalMeta, "generatedAt" | "mode" | "sources"> | null;
  /** Qué parte de la última corrida completa tiene que alcanzar ésta para guardarse (0,5). */
  ratio: number;
}

export interface RentalCollapseVerdict {
  refuse: boolean;
  /**
   * Contra qué se midió. "stored-floor" = pasó contra la última corrida completa y cayó debajo del
   * piso contra lo almacenado; "none" = no había con qué comparar y la corrida se guarda.
   */
  basis: "last-full-run" | "stored-floor" | "stored" | "none";
  /** Avisos (contra la última corrida) o propiedades (contra lo almacenado) de esta corrida. */
  found: number;
  expected: number;
  /** La parte de `expected` que hacía falta alcanzar. */
  threshold: number;
}

/** Debajo de esto no hay directorio que proteger (la primera corrida de una base nueva). */
const MIN_BASELINE = 200;

/** Avisos que trajo una corrida, sumando el `listings` de cada fuente de su resumen. */
export function rentalRunListings(meta: Pick<RentalMeta, "sources"> | null): number {
  let total = 0;
  for (const source of meta?.sources ?? []) {
    const listings = Number(source?.listings);
    if (Number.isFinite(listings) && listings > 0) total += listings;
  }
  return total;
}

export function rentalCollapseVerdict(input: RentalCollapseInput): RentalCollapseVerdict {
  const { ratio } = input;
  // La tanda horaria es parcial a propósito y nunca borra por ausencia: no se juzga.
  if (input.mode !== "full") return { refuse: false, basis: "none", found: input.listings, expected: 0, threshold: ratio };
  const hasStored = input.stored > MIN_BASELINE;
  const lastFull = input.lastFull?.mode === "full" ? rentalRunListings(input.lastFull) : 0;
  if (lastFull > MIN_BASELINE) {
    if (input.listings < lastFull * ratio) {
      return { refuse: true, basis: "last-full-run", found: input.listings, expected: lastFull, threshold: ratio };
    }
    const floor = ratio / 2;
    if (hasStored && input.properties < input.stored * floor) {
      return { refuse: true, basis: "stored-floor", found: input.properties, expected: input.stored, threshold: floor };
    }
    return { refuse: false, basis: "last-full-run", found: input.listings, expected: lastFull, threshold: ratio };
  }
  if (hasStored) {
    return { refuse: input.properties < input.stored * ratio, basis: "stored", found: input.properties, expected: input.stored, threshold: ratio };
  }
  return { refuse: false, basis: "none", found: input.listings, expected: 0, threshold: ratio };
}

/** Cuántas corridas completas guardadas entran en la vara de cada fuente. */
export const RENTAL_SOURCE_HISTORY = 7;
/** Una fuente cayó si trae menos de esta parte de su vara. Fijo: no depende de RENTALS_COLLAPSE_RATIO. */
export const RENTAL_SOURCE_DROP_RATIO = 0.5;
/**
 * Desde cuántos avisos por corrida la caída de una fuente va al Telegram y no sólo al log. En
 * absoluto, no como parte de la corrida: el total lo mueve Facebook (el 17/11/2026 InfoCasas era
 * el 25,7 % de una corrida de 54.488, a un día gordo de Facebook de dejar de contar como grande).
 * Hoy pasan Mercado Libre (21,6 mil) e InfoCasas (14 mil), que son parejas día a día; Facebook y
 * El País (5,5 mil) varían solas y quedan en el log.
 */
export const RENTAL_BIG_SOURCE_LISTINGS = 10_000;

type SourceSummary = { listings?: number; recent?: number[] };

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const counts = (values: unknown): number[] =>
  (Array.isArray(values) ? values : []).map(Number).filter((value) => Number.isFinite(value) && value >= 0);

/**
 * La vara de una fuente: la MEDIANA de lo que trajo en las últimas corridas completas guardadas.
 *
 * No lo de la última corrida, que se renueva sola: una fuente que pierde el 40 % por día nunca trae
 * menos de la mitad que el día anterior (21.606 → 12.964 → 7.778 → …) y se desangra entera sin una
 * línea; contra la mediana, el segundo día ya está debajo de la mitad. Y una fuente muerta se sigue
 * nombrando cada día hasta que la mediana la alcanza, no sólo el primero.
 *
 * Un resumen de antes de que existiera `recent` vale por una sola corrida: su `listings`.
 */
export function rentalSourceReference(source: SourceSummary | null | undefined): number {
  const recent = counts(source?.recent);
  if (recent.length) return median(recent);
  const listings = Number(source?.listings);
  return Number.isFinite(listings) && listings > 0 ? listings : 0;
}

/** El `recent` que guarda esta corrida completa: el anterior más lo de hoy, las últimas siete. */
export function rentalNextRecent(previous: SourceSummary | null | undefined, listings: number): number[] {
  const before = counts(previous?.recent);
  const carried = before.length ? before : counts(previous ? [previous.listings] : []);
  return [...carried, Math.max(0, Number(listings) || 0)].slice(-RENTAL_SOURCE_HISTORY);
}

export interface RentalSourceDrop {
  key: string;
  now: number;
  /** La vara: la mediana de las últimas corridas completas guardadas de esta fuente. */
  before: number;
  /** La fuente trae RENTAL_BIG_SOURCE_LISTINGS o más por corrida: su caída se avisa. */
  big: boolean;
}

/**
 * Fuentes que hoy trajeron menos de la mitad de su vara, entre las que traen `minReference` avisos
 * o más por corrida.
 *
 * No decide si la corrida se guarda: es lo que explica una corrida más chica, y lo que impide que
 * la pérdida de una fuente pase callada. El 20/11/2026 habría nombrado a Facebook (1.884 contra
 * 5.668, cortado a dos búsquedas) y a El País (1.899 contra 5.471, lecturas incompletas).
 */
export function rentalSourceDrops(
  runs: readonly { key: string; listings: number }[],
  lastFull: Pick<RentalMeta, "mode" | "sources"> | null,
  minReference = 1000,
): RentalSourceDrop[] {
  if (lastFull?.mode !== "full") return [];
  const drops: RentalSourceDrop[] = [];
  for (const previous of lastFull.sources ?? []) {
    if (!previous) continue;
    const before = rentalSourceReference(previous);
    if (before < minReference) continue;
    const now = Number(runs.find((run) => run.key === previous.key)?.listings) || 0;
    if (now < before * RENTAL_SOURCE_DROP_RATIO) {
      drops.push({ key: previous.key, now, before: Math.round(before), big: before >= RENTAL_BIG_SOURCE_LISTINGS });
    }
  }
  return drops;
}
