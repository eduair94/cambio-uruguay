// Plan D — CyberLunes/Black Friday: orquesta un día — lee, clasifica, agrega y (salvo corrida en
// seco o corrida flaca) publica. `today` es siempre un parámetro, nunca `Date.now()` adentro, así el
// mismo código sirve al job diario, al horario de evento (`--event-only`) y a este archivo probado
// con `classes/priceevents/store.ts` mockeado (mismo criterio que `classes/propertyzones/refresh.ts`).
import { analyzeOfferOutcome } from "./analyze";
import { buildPriceEventSnapshot, type PriceEventSnapshot } from "./aggregate";
import { activeEvent, type PriceEvent } from "./calendar";
import {
  loadCurrentAnalyzed,
  loadCurrentEligible,
  loadTrackingSince,
  loadVerticals,
  offersSeenTodayByVertical,
  pruneOldDaySnapshots,
  saveSnapshot,
} from "./store";
import type { PriceEventAnalysis, PricewatchOfferLike } from "./types";

/** Por debajo de este piso, `current` todavía no tiene suficiente historia para servir de línea de
 * base — bloquear la escritura ahí confundiría "la serie recién empieza" con "hoy fue una corrida
 * mala". Medido: el historial de `pricewatchoffers` arrancó el 2026-09-16/17 y la regla de 21 días
 * mantiene `eligible` en 0 varias semanas — ningún día de esas primeras semanas debe leerse como una
 * caída del 100 %. */
export const PRICE_EVENT_THIN_FLOOR = 20;
/** Bajo este porcentaje de lo publicado en `current`, una corrida se trata como una salida (menos
 * fuentes respondieron), no como una temporada con menos descuentos reales. */
export const PRICE_EVENT_THIN_RATIO = 0.4;
/** Cuántos días de archivo (`day:YYYY-MM-DD`) se conservan antes de podarlos. */
export const PRICE_EVENT_SNAPSHOT_RETENTION_DAYS = 400;

/**
 * F2 (hallazgo 9): distinto de `PRICE_EVENT_THIN_RATIO` — ese compara `eligible` (ofertas que
 * calificaron) contra `current`, esto compara `analyzed` (ofertas LEÍDAS) contra `current`, y SÓLO
 * para `--event-only`. Una corrida horaria puede caer con equipar ya escrito y sillas todavía no (o
 * viceversa): `analyzed` sería la mitad de lo que la corrida diaria termina leyendo, sin que haya
 * pasado nada malo — publicar ESE momento como si fuera el día completo fabricaría un salto o una
 * caída que no existió. Ver `PriceEventRunResult.partialHourlyData`.
 */
export const PRICE_EVENT_PARTIAL_HOURLY_RATIO = 0.5;
/** Mismo espíritu que `PRICE_EVENT_THIN_FLOOR`: por debajo de este `analyzed` en el `current`
 * guardado, la comparación de datos parciales no tiene una base sólida contra qué medirse — no se
 * activa mientras la serie recién esté empezando. */
export const PRICE_EVENT_PARTIAL_HOURLY_FLOOR = 20;

export interface PriceEventRunOptions {
  /** `YYYY-MM-DD`, UTC — por defecto el de hoy (mismo formato que graba `classes/pricewatch/record.ts`). */
  today?: string;
  /** Nunca escribe ni poda; sólo lee y agrega, para inspeccionar la corrida contra datos reales. */
  dryRun?: boolean;
  /** Poda las filas `day:` de más de `PRICE_EVENT_SNAPSHOT_RETENTION_DAYS`. Default `true` (la
   * corrida diaria). El horario de evento (`--event-only` en `sync_price_events.ts`) puede correr
   * hasta 24 veces en un día de evento activo — hacer que cada una vuelva a mirar y borrar filas
   * vencidas no suma nada sobre la corrida diaria que ya lo hizo, así que ese job pasa `prune: false`. */
  prune?: boolean;
  /** `--event-only`: el cron horario dentro de una ventana activa. Cambia UNA sola cosa acá — ver
   * `PriceEventRunResult.noDataYet` — todo lo demás (guarda de corrida flaca, escritura, poda) es
   * idéntico a la corrida diaria. */
  eventOnly?: boolean;
}

export interface PriceEventRunResult {
  today: string;
  event: PriceEvent | null;
  verticals: string[];
  snapshot: PriceEventSnapshot;
  /** `eligible` de lo que YA estaba publicado como `current`, o `null` si nunca se publicó nada. */
  currentEligible: number | null;
  /** `analyzed` de lo que YA estaba publicado como `current`, o `null` si nunca se publicó nada — F2,
   * hallazgo 9: lo único que necesita {@link PriceEventRunResult.partialHourlyData}. */
  currentAnalyzed: number | null;
  /** La corrida activó la guarda de corrida flaca (y por lo tanto no escribió, aunque no fuera
   * `dryRun`). */
  thin: boolean;
  /** Se guardó `current`/`day:<today>` de verdad — nunca en `dryRun`, nunca si `thin`. */
  written: boolean;
  /** Filas `day:` borradas por vencidas — `0` cuando no se escribió (dry-run o corrida flaca) o
   * cuando `options.prune` fue `false` (el horario de evento). */
  pruned: number;
  /** `true` cuando esta corrida (con `eventOnly: true`) leyó CERO ofertas para `today`
   * (`snapshot.analyzed === 0`) — hallazgo M1: el cron horario puede caer a las 00:19 UTC, antes de
   * que `sync_equipar.ts`/`sync_chairs.ts` (~12:xx UTC) escriban el primer punto del día nuevo. Eso
   * no es una corrida flaca (no hay nada malo con los datos, todavía no existen) y pasaba todas las
   * horas antes del mediodía de cada día de evento — activar `thin` ahí disparaba una "falla" en pm2
   * cada vez. Tratado como un no-op limpio: no escribe, `thin` queda en `false`, sale en 0. La
   * corrida diaria (`eventOnly` sin marcar) nunca activa esto — sigue usando la guarda de corrida
   * flaca de siempre, incluso con `analyzed === 0`. */
  noDataYet: boolean;
  /** `true` cuando esta corrida (con `eventOnly: true`) leyó MENOS de `PRICE_EVENT_PARTIAL_HOURLY_RATIO`
   * de lo que `current` ya tenía en `analyzed` — F2, hallazgo 9: distinto de `noDataYet` (analyzed
   * es 0) y de `thin` (basado en `eligible`, y sólo se evalúa cuando esto es `false`). El caso real:
   * una corrida horaria a media mañana, con equipar ya escrito y sillas todavía no — `analyzed` es
   * una fracción real de datos, no cero, pero sigue siendo una FOTO PARCIAL del día, no el día
   * completo. Tratado igual que `noDataYet`: no escribe, no marca `thin`, sale en 0. La corrida
   * diaria nunca activa esto — sigue usando `thin` (basado en `eligible`) sin este freno adicional. */
  partialHourlyData: boolean;
}

/**
 * Corre un día entero: lee cada vertical de `pricewatchoffers` vista HOY, clasifica cada oferta
 * contra su propio historial (Task 1), agrega el resultado (este archivo, `aggregate.ts`) y publica
 * — salvo `dryRun`, o salvo que la corrida se vea como una salida (guarda de corrida flaca; ver
 * `PRICE_EVENT_THIN_RATIO`/`PRICE_EVENT_THIN_FLOOR`).
 */
export async function runPriceEvents(options: PriceEventRunOptions = {}): Promise<PriceEventRunResult> {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const dryRun = options.dryRun ?? false;
  const prune = options.prune ?? true;
  const eventOnly = options.eventOnly ?? false;
  const event = activeEvent(today);

  const [verticals, trackingSince, currentEligible, currentAnalyzed] = await Promise.all([
    loadVerticals(),
    loadTrackingSince(),
    loadCurrentEligible(),
    loadCurrentAnalyzed(),
  ]);

  const analyses: (PriceEventAnalysis | null)[] = [];
  const bySource: Record<string, number> = {};
  let suspect = 0;
  for (const vertical of verticals) {
    const cursor = offersSeenTodayByVertical(vertical, today);
    for await (const raw of cursor) {
      const offer = raw as unknown as PricewatchOfferLike & { source?: string };
      const outcome = analyzeOfferOutcome(offer, today);
      analyses.push(outcome.analysis);
      if (outcome.suspect) suspect += 1;
      if (outcome.analysis) {
        const source = offer.source || "desconocida";
        bySource[source] = (bySource[source] ?? 0) + 1;
      }
    }
  }

  const snapshot = buildPriceEventSnapshot(analyses, today, event, trackingSince, { bySource, suspect });

  // M1: see `PriceEventRunResult.noDataYet` — an --event-only run that read zero offers is too early,
  // not thin, and must never trip the thin-run guard below.
  const noDataYet = eventOnly && snapshot.analyzed === 0;

  // F2, hallazgo 9: see `PriceEventRunResult.partialHourlyData` — evaluated only when there IS some
  // data (noDataYet already covers the zero case) and only for --event-only.
  const partialHourlyData =
    eventOnly &&
    !noDataYet &&
    currentAnalyzed !== null &&
    currentAnalyzed >= PRICE_EVENT_PARTIAL_HOURLY_FLOOR &&
    snapshot.analyzed < currentAnalyzed * PRICE_EVENT_PARTIAL_HOURLY_RATIO;

  const thin =
    !noDataYet &&
    !partialHourlyData &&
    currentEligible !== null &&
    currentEligible >= PRICE_EVENT_THIN_FLOOR &&
    snapshot.eligible < currentEligible * PRICE_EVENT_THIN_RATIO;

  let written = false;
  let pruned = 0;
  if (!dryRun && !thin && !noDataYet && !partialHourlyData) {
    await saveSnapshot(snapshot);
    if (prune) pruned = await pruneOldDaySnapshots(today, PRICE_EVENT_SNAPSHOT_RETENTION_DAYS);
    written = true;
  }

  return {
    today,
    event,
    verticals,
    snapshot,
    currentEligible,
    currentAnalyzed,
    thin,
    written,
    pruned,
    noDataYet,
    partialHourlyData,
  };
}
