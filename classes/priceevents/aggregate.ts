// Plan D — CyberLunes/Black Friday: agregado PURO del día — toma lo que `analyzeOffer` ya decidió
// para cada oferta (Task 1) y arma el documento que el job (Task 2, `sync_price_events.ts`) publica.
// Sin Mongo, sin Date.now() salvo para `generatedAt` (el único campo que documenta CUÁNDO se corrió,
// nunca usado para decidir nada dentro de esta función).
import type { PriceEvent } from "./calendar";
import { foldSellerName, isUnidentifiedMlSeller, mlDisplaySellerName, type PriceEventAnalysis } from "./types";

/** Por vertical: cuántas ofertas calificaron hoy y cuántas de esas cayeron en cada regla. Una
 * oferta puede contar en `drops` Y en `inflated` a la vez (ver `PriceEventAnalysis.classes`). */
export interface PriceEventVerticalStats {
  eligible: number;
  drops: number;
  inflated: number;
}

/** Un vendedor con al menos `PRICE_EVENT_MIN_SELLER_LISTINGS` ofertas con precio de lista hoy: sólo
 * conteo y proporción, nunca un adjetivo — la regla que lo define va escrita junto a la tabla que lo
 * muestra (AGENTS.md, "Sin acusaciones"). */
export interface PriceEventSellerStat {
  sellerKey: string;
  sellerName: string;
  withListPrice: number;
  inflated: number;
  /** `inflated / withListPrice`, como porcentaje con 1 decimal (mismo formato que `dropPct`). */
  share: number;
}

export interface PriceEventSnapshot {
  key: string;
  day: string;
  event: PriceEvent | null;
  generatedAt: string;
  trackingSince: string | null;
  /** Cuántas ofertas se leyeron hoy en total (con o sin punto calificado) — el denominador que hace
   * legible a `eligible` en el reporte de la corrida en seco. */
  analyzed: number;
  /** Cuántas de esas `analyzeOffer` no descartó (antigüedad + puntos previos + moneda soportada). */
  eligible: number;
  byVertical: Record<string, PriceEventVerticalStats>;
  /**
   * La vitrina: hasta `PRICE_EVENT_MAX_DROPS` bajas reales, máx `PRICE_EVENT_MAX_DROPS_PER_SELLER`
   * por vendedor — NO el total del día. Antes se llamaba `drops`, que un total (`dropsCount` abajo)
   * con el mismo nombre habría hecho ambiguo: "¿el array recortado o la cuenta completa?". El total
   * del día para el titular/la serie de 30 días sale de `dropsCount`/`inflatedCount`, nunca de
   * `topDrops.length` (que se achata en 200 apenas el día tiene más bajas que eso).
   */
  topDrops: PriceEventAnalysis[];
  /** Total de ofertas `baja-real` del día, sin el recorte de la vitrina — suma de `byVertical[*].drops`. */
  dropsCount: number;
  /** Total de ofertas `tachado-por-encima` del día, sin recorte — suma de `byVertical[*].inflated`. */
  inflatedCount: number;
  sellers: PriceEventSellerStat[];
  /** Cuántas ofertas elegibles vinieron de cada `source` (`mercadolibre`, `fenicio`, `shopify`, …) —
   * final review M5: la página mide qué fracción del día es MercadoLibre en vez de imprimir un
   * porcentaje adivinado. Cuenta sobre lo QUE SE CLASIFICÓ (`eligible`, `suspect` incluido no —
   * ver `refresh.ts`), nunca sobre `analyzed`, así que sigue siendo comparable con `eligible`. */
  bySource: Record<string, number>;
  /** Ofertas descartadas por la guarda de plausibilidad (I2a) — precio o precio de lista de hoy fuera
   * de `[1/5, 5]` veces su propia `priorMedian`, casi siempre un problema de datos (mezcla de
   * monedas, un precio sin parsear) y no un dato real. Contadas aparte de `analyzed - eligible`
   * porque esa resta ya mezcla "todavía no tiene historial" con esto. */
  suspect: number;
}

/** Parámetros opcionales de {@link buildPriceEventSnapshot} calculados por el llamador (`refresh.ts`)
 * mientras recorre el cursor de Mongo — no se pueden derivar de `analyses` porque `PriceEventAnalysis`
 * no lleva `source` (ver el comentario de `OFFER_FIELDS` en `store.ts`: ese campo no lo necesita el
 * análisis en sí, sólo este conteo). */
export interface PriceEventSnapshotExtra {
  bySource?: Record<string, number>;
  suspect?: number;
}

/** Techo de la lista de bajas publicadas — una vitrina, no el dataset completo. */
export const PRICE_EVENT_MAX_DROPS = 200;
/** Ningún vendedor domina la vitrina de bajas con su propio catálogo entero. */
export const PRICE_EVENT_MAX_DROPS_PER_SELLER = 3;
/** Bajo esta cantidad de ofertas con precio de lista, "la mitad de las mías están infladas" no dice
 * nada — ver AGENTS.md, "requiere ≥ 5 ofertas con precio tachado ese día". */
export const PRICE_EVENT_MIN_SELLER_LISTINGS = 5;

/**
 * Agrega los análisis de UN día (todas las verticales juntas) en el documento que se publica.
 *
 * `analyses` lleva un elemento por oferta LEÍDA hoy — `null` cuando `analyzeOffer` la descartó — así
 * que `analyses.length` es el total leído y `eligible` (abajo) es cuántas de esas calificaron; sin
 * ese `null` de por medio, el reporte de la corrida en seco no podría distinguir "no hay ofertas" de
 * "hay ofertas pero ninguna con 21 días de historia todavía".
 */
export function buildPriceEventSnapshot(
  analyses: readonly (PriceEventAnalysis | null)[],
  today: string,
  event: PriceEvent | null,
  trackingSince: string | null,
  extra: PriceEventSnapshotExtra = {}
): PriceEventSnapshot {
  const eligible = analyses.filter((analysis): analysis is PriceEventAnalysis => analysis !== null);

  const byVertical: Record<string, PriceEventVerticalStats> = {};
  let dropsCount = 0;
  let inflatedCount = 0;
  for (const analysis of eligible) {
    const stats = byVertical[analysis.vertical] ?? { eligible: 0, drops: 0, inflated: 0 };
    stats.eligible += 1;
    if (analysis.classes.includes("baja-real")) {
      stats.drops += 1;
      dropsCount += 1;
    }
    if (analysis.classes.includes("tachado-por-encima")) {
      stats.inflated += 1;
      inflatedCount += 1;
    }
    byVertical[analysis.vertical] = stats;
  }

  // Ordenadas de la baja más grande a la más chica ANTES de aplicar el tope por vendedor, así el
  // resultado se queda ordenado igual: dentro de sus 3 lugares, cada vendedor entra con sus mejores
  // bajas primero, nunca con las últimas que sobraron.
  //
  // El orden tiene que ser el MISMO en cada corrida para el mismo conjunto de análisis, sin importar
  // en qué orden el cursor de Mongo entregó los documentos — así que un empate en `dropPct` (que es
  // un redondeo a 1 decimal: dos ofertas bien distintas rutinariamente empatan ahí) nunca se resuelve
  // por "el orden en que llegaron". Tres claves, en orden:
  //   1. `dropPct` desc — el criterio real, tal como se publica.
  //   2. `price / priorMin` asc (SIN redondear) — el desempate elegido: es la versión de precisión
  //      completa de la misma pregunta que hace `dropPct`, así que una baja apenas mayor (que redondeó
  //      igual) sigue ganando en vez de decidirse por casualidad. Se descartó "baja absoluta"
  //      (`priorMin - price`) porque compara ofertas de escalas de precio distintas sin que eso
  //      signifique nada (un colchón y una heladera no comparten unidad de "cuánto bajó").
  //   3. `listingId` asc — el desempate final, determinista, para el puñado de casos con precio Y
  //      priorMin idénticos (dos ofertas del mismo precio antes y ahora).
  const droppedCandidates = eligible
    .filter((analysis) => analysis.classes.includes("baja-real") && analysis.dropPct !== null)
    .slice()
    .sort((a, b) => {
      if (b.dropPct !== a.dropPct) return (b.dropPct as number) - (a.dropPct as number);
      const ratioA = a.price / a.priorMin;
      const ratioB = b.price / b.priorMin;
      if (ratioA !== ratioB) return ratioA - ratioB;
      return a.listingId.localeCompare(b.listingId);
    });

  // F2 (hallazgo 8): el nombre a MOSTRAR de cada vendedor se resuelve UNA vez, sobre TODOS los
  // vendedores elegibles del día (no sólo los que llegan a `sellers` o a `topDrops` por separado),
  // para que la vitrina de bajas y la tabla de vendedores sufijen "(Mercado Libre)" con el MISMO
  // criterio — antes sólo se sufijaba en `sellers`, así que una fila de `topDrops` del mismo vendedor
  // ML podía mostrar el nombre sin desambiguar.
  const sellerDisplayNames = new Map<string, string>();
  for (const analysis of eligible) {
    if (!sellerDisplayNames.has(analysis.sellerKey)) {
      sellerDisplayNames.set(analysis.sellerKey, mlDisplaySellerName(analysis.sellerKey, analysis.sellerName));
    }
  }

  // M9, insensible a mayúsculas/acentos (`foldSellerName`): dos vendedores con distinto `sellerKey`
  // publicando bajo el mismo nombre (una tienda propia y su storefront en MercadoLibre) se
  // desambiguan sufijando SÓLO el de MercadoLibre — un choque entre dos fuentes no-ML (que esta
  // función nunca observó) se deja tal cual en vez de adivinar cuál sufijar.
  const foldedNameOwners = new Map<string, Set<string>>();
  for (const [sellerKey, displayName] of sellerDisplayNames) {
    const folded = foldSellerName(displayName);
    const owners = foldedNameOwners.get(folded) ?? new Set<string>();
    owners.add(sellerKey);
    foldedNameOwners.set(folded, owners);
  }
  for (const [sellerKey, displayName] of sellerDisplayNames) {
    const owners = foldedNameOwners.get(foldSellerName(displayName));
    if ((owners?.size ?? 0) > 1 && sellerKey.startsWith("ml:")) {
      sellerDisplayNames.set(sellerKey, `${displayName} (Mercado Libre)`);
    }
  }

  // Final review C1: an unidentified MercadoLibre seller ("ml:unknown", or a real numeric id paired
  // with the literal fallback name) is not one store — it is however many distinct sellers ML
  // couldn't name for us. Sharing the 3-per-seller cap between all of them would let the loudest of
  // those anonymous listings crowd out real, named stores; instead each unidentified listing caps
  // against ITSELF (keyed by `listingId`, so the cap of 3 never actually binds). An `ml:<id>` seller
  // with an EMPTY name (F2, hallazgo 7) is a DIFFERENT case — it has a real, distinguishable identity
  // (a numeric id), so it caps normally by its own `sellerKey` like any other seller, it is just
  // labelled "Vendedor de Mercado Libre #<id>" instead of a blank string.
  const topDrops: PriceEventAnalysis[] = [];
  const dropsPerSeller = new Map<string, number>();
  for (const candidate of droppedCandidates) {
    if (topDrops.length >= PRICE_EVENT_MAX_DROPS) break;
    const unidentifiedMl = isUnidentifiedMlSeller(candidate.sellerKey, candidate.sellerName);
    const capKey = unidentifiedMl ? `listing:${candidate.listingId}` : candidate.sellerKey;
    const count = dropsPerSeller.get(capKey) ?? 0;
    if (count >= PRICE_EVENT_MAX_DROPS_PER_SELLER) continue;
    const displayName = sellerDisplayNames.get(candidate.sellerKey) ?? candidate.sellerName;
    topDrops.push(displayName === candidate.sellerName ? candidate : { ...candidate, sellerName: displayName });
    dropsPerSeller.set(capKey, count + 1);
  }

  const sellerTotals = new Map<string, { sellerName: string; withListPrice: number; inflated: number }>();
  for (const analysis of eligible) {
    if (analysis.listPrice === null) continue;
    // C1: an unidentified MercadoLibre seller never enters the sellers table at all — "how many of
    // Mercado Libre's listings show an inflated crossed-out price" is not a statement about a store.
    // An ml:<id> seller with an empty name (not "unidentified" — see mlDisplaySellerName) DOES enter,
    // labelled by its id.
    if (isUnidentifiedMlSeller(analysis.sellerKey, analysis.sellerName)) continue;
    const entry = sellerTotals.get(analysis.sellerKey) ?? {
      sellerName: sellerDisplayNames.get(analysis.sellerKey) ?? analysis.sellerName,
      withListPrice: 0,
      inflated: 0,
    };
    entry.withListPrice += 1;
    if (analysis.classes.includes("tachado-por-encima")) entry.inflated += 1;
    sellerTotals.set(analysis.sellerKey, entry);
  }

  const sellers: PriceEventSellerStat[] = [...sellerTotals.entries()]
    .filter(([, totals]) => totals.withListPrice >= PRICE_EVENT_MIN_SELLER_LISTINGS)
    .map(([sellerKey, totals]) => ({
      sellerKey,
      sellerName: totals.sellerName,
      withListPrice: totals.withListPrice,
      inflated: totals.inflated,
      share: Math.round((totals.inflated / totals.withListPrice) * 1000) / 10,
    }))
    .sort((a, b) => a.sellerName.localeCompare(b.sellerName));

  return {
    key: `day:${today}`,
    day: today,
    event,
    generatedAt: new Date().toISOString(),
    trackingSince,
    analyzed: analyses.length,
    eligible: eligible.length,
    byVertical,
    topDrops,
    dropsCount,
    inflatedCount,
    sellers,
    bySource: extra.bySource ?? {},
    suspect: extra.suspect ?? 0,
  };
}
