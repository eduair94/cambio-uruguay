// Arma el snapshot semanal de /apps-utiles-uruguay: una lectura por ficha de tienda, en serie.
//
// La fusión es la de classes/stores/profile.ts (`mergeSignal`): un error conserva lo anterior CON
// SU FECHA VIEJA —la página decide si ya es demasiado viejo para mostrarlo—, y un 404 es una
// ausencia explícita que reemplaza lo que hubiera. Dos guardas, las dos con precedente en el repo:
// corte temprano si las primeras 10 apps no consiguieron ninguna respuesta (tiendas caídas o nos
// bloquearon: no se escribe nada), y `usefulAppsRunIsThin` para una corrida a medias.
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

export async function buildUsefulAppsSnapshot(options: BuildOptions = {}): Promise<UsefulAppsSnapshot> {
  const catalog = options.catalog ?? USEFUL_APP_STORE_IDS;
  const now = options.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  const read: Reader = options.read ?? ((store, id) => readListing(store, id));
  const sleep = options.sleep ?? delay;
  const gapMs = options.gapMs ?? REQUEST_GAP_MS;
  const previousApps = options.previous?.apps ?? {};

  const apps: Record<string, AppSignals> = {};
  const counts: UsefulAppsCounts = { apps: catalog.length, fresh: 0, missing: 0, failed: 0 };
  const developerChanges: DeveloperChange[] = [];
  let requests = 0;

  for (let index = 0; index < catalog.length; index++) {
    const entry = catalog[index];
    const signals: AppSignals = {};
    for (const store of ["android", "ios"] as const) {
      const id = store === "android" ? entry.android : entry.ios;
      if (!id) continue;
      if (requests > 0) await sleep(gapMs);
      requests++;
      const outcome = await read(store, id);
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
    if (index + 1 === EARLY_STOP_APPS && counts.fresh + counts.missing === 0) {
      throw new Error(
        `las primeras ${EARLY_STOP_APPS} apps no obtuvieron ninguna respuesta de las tiendas; no se escribe nada`
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
  const answered = next.counts.fresh + next.counts.missing;
  const asked = answered + next.counts.failed;
  if (asked === 0) return "la corrida no pidió ninguna ficha";
  if (next.counts.failed * 2 > asked) return `fallaron ${next.counts.failed} de ${asked} fichas`;
  const before = previous ? previous.counts.fresh + previous.counts.missing : 0;
  if (before >= 20 && answered * 2 < before) {
    return `sólo ${answered} fichas contestaron contra ${before} de la corrida anterior`;
  }
  return null;
}
