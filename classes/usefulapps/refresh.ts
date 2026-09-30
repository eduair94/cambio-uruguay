// Arma el snapshot semanal de /apps-utiles-uruguay: una lectura por ficha de tienda, en serie.
//
// La fusión es la de classes/stores/profile.ts (`mergeSignal`): un error conserva lo anterior CON
// SU FECHA VIEJA —la página decide si ya es demasiado viejo para mostrarlo—, y un 404 es una
// ausencia explícita que reemplaza lo que hubiera. Las guardas miran las fichas LEÍDAS BIEN, no las
// que contestaron: un 404 también es una respuesta, y una tienda que empezara a contestar 404 a
// todo (otra URL, un WAF) pasaba las dos guardas y escondía todos sus botones. Por eso: corte
// temprano si las primeras 10 apps no consiguieron ninguna lectura buena, y `usefulAppsRunIsThin`
// para una corrida a medias o con demasiados 404 de golpe.
import { USEFUL_APP_STORE_IDS, type UsefulAppStoreIds } from "./catalog";
import { readListing, type ReadOutcome } from "./stores";
import {
  USEFUL_APPS_KEY,
  type AppSignals,
  type DeveloperChange,
  type StoreName,
  type UsefulAppsCounts,
  type UsefulAppsSnapshot,
} from "./types";

export const EARLY_STOP_APPS = 10;
/** Entre pedido y pedido: son unos 230 por semana, no hay apuro. */
export const REQUEST_GAP_MS = 1500;
/**
 * Reintentos de una ficha que falló (429, 5xx, red): el App Store contesta 429 a este ritmo unas
 * cinco veces por corrida (medido el 30/9/2026 sobre las 232 fichas). Esperas crecientes, o las que
 * pida la tienda con Retry-After (con tope), y un presupuesto por corrida para que un bloqueo real
 * termine igual en `failed` en minutos y no en horas.
 */
export const RETRY_BACKOFF_MS: readonly number[] = [5000, 15000];
export const RETRY_AFTER_CAP_MS = 30000;
export const RETRY_BUDGET = 30;
/** Un 404 esconde el botón de la tienda: más de esto de golpe no se publica. */
const MISSING_JUMP = 5;
const MISSING_SHARE = 0.1;

export type Reader = (store: StoreName, id: string) => Promise<ReadOutcome>;

export interface BuildOptions {
  catalog?: readonly UsefulAppStoreIds[];
  previous?: UsefulAppsSnapshot | null;
  now?: Date;
  read?: Reader;
  sleep?: (ms: number) => Promise<void>;
  gapMs?: number;
}

const tidy = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * El día (YYYY-MM-DD) de un instante en Uruguay. La corrida es a las 01:34 UTC, que acá es la noche
 * anterior: fechada con el día UTC, la página decía "tiendas leídas" mañana.
 */
export function usefulAppsDay(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Un 4xx que no es 408 ni 429 es una respuesta, no un tropiezo: reintentarlo no cambia nada. */
function isRetryable(outcome: ReadOutcome): boolean {
  if (outcome.kind !== "error") return false;
  const status = /^HTTP (\d{3})$/.exec(outcome.message);
  if (!status) return true;
  const code = Number(status[1]);
  return code === 408 || code === 429 || code >= 500;
}

export async function buildUsefulAppsSnapshot(options: BuildOptions = {}): Promise<UsefulAppsSnapshot> {
  const catalog = options.catalog ?? USEFUL_APP_STORE_IDS;
  const now = options.now ?? new Date();
  const today = usefulAppsDay(now);
  const read: Reader = options.read ?? ((store, id) => readListing(store, id));
  const sleep = options.sleep ?? delay;
  const gapMs = options.gapMs ?? REQUEST_GAP_MS;
  const previousApps = options.previous?.apps ?? {};

  const apps: Record<string, AppSignals> = {};
  const counts: UsefulAppsCounts = { apps: catalog.length, fresh: 0, missing: 0, failed: 0, retried: 0 };
  const developerChanges: DeveloperChange[] = [];
  let requests = 0;

  const readWithRetries = async (store: StoreName, id: string): Promise<ReadOutcome> => {
    let outcome = await read(store, id);
    for (let attempt = 0; attempt < RETRY_BACKOFF_MS.length && isRetryable(outcome); attempt++) {
      if (counts.retried >= RETRY_BUDGET || outcome.kind !== "error") break;
      counts.retried++;
      const asked = outcome.retryAfterMs;
      await sleep(asked !== undefined ? Math.min(asked, RETRY_AFTER_CAP_MS) : RETRY_BACKOFF_MS[attempt]);
      outcome = await read(store, id);
    }
    return outcome;
  };

  for (let index = 0; index < catalog.length; index++) {
    const entry = catalog[index];
    const signals: AppSignals = {};
    for (const store of ["android", "ios"] as const) {
      const id = store === "android" ? entry.android : entry.ios;
      if (!id) continue;
      if (requests > 0) await sleep(gapMs);
      requests++;
      const outcome = await readWithRetries(store, id);
      if (outcome.kind === "ok") {
        counts.fresh++;
        signals[store] = { status: "ok", checkedAt: today, ...outcome.listing };
        const expected = store === "android" ? entry.androidDeveloper : entry.iosDeveloper;
        const found = outcome.listing.developer;
        if (expected && found && tidy(expected) !== tidy(found)) {
          developerChanges.push({ id: entry.id, store, expected, found });
        }
      } else if (outcome.kind === "missing") {
        counts.missing++;
        signals[store] = { status: "missing", checkedAt: today };
      } else {
        counts.failed++;
        // Lo anterior con su fecha, o null si nunca se leyó: la ausencia de dato no es una ausencia
        // de la app.
        signals[store] = previousApps[entry.id]?.[store] ?? null;
      }
    }
    apps[entry.id] = signals;
    if (index + 1 === EARLY_STOP_APPS && counts.fresh === 0) {
      throw new Error(
        `las primeras ${EARLY_STOP_APPS} apps no obtuvieron ninguna respuesta válida de las tiendas ` +
          `(sólo errores o 404); no se escribe nada`
      );
    }
  }

  return { key: USEFUL_APPS_KEY, capturedAt: now, apps, counts, developerChanges };
}

/** Motivo para NO pisar el snapshot guardado, o `null` si la corrida está sana. */
export function usefulAppsRunIsThin(
  next: UsefulAppsSnapshot,
  previous: UsefulAppsSnapshot | null
): string | null {
  const { fresh, missing, failed } = next.counts;
  const asked = fresh + missing + failed;
  if (asked === 0) return "la corrida no pidió ninguna ficha";
  if (failed * 2 > asked) return `fallaron ${failed} de ${asked} fichas`;
  if (fresh === 0) return `ninguna de las ${asked} fichas se leyó bien`;
  // Un 404 es una afirmación ("la app ya no está") que esconde el botón de esa tienda: que crezcan
  // de a poco es posible; muchos de golpe son otra cosa (la tienda cambió la URL, un WAF).
  const allowedMissing = Math.max(
    (previous?.counts.missing ?? 0) + MISSING_JUMP,
    Math.ceil(asked * MISSING_SHARE)
  );
  if (missing > allowedMissing) {
    return `${missing} de ${asked} fichas dieron 404 (el tope es ${allowedMissing}): ¿cambió la URL de una tienda?`;
  }
  const before = previous?.counts.fresh ?? 0;
  if (before >= 20 && fresh * 2 < before) {
    return `sólo ${fresh} fichas se leyeron bien contra ${before} de la corrida anterior`;
  }
  return null;
}
