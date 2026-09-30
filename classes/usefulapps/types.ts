// Tipos del snapshot semanal de /apps-utiles-uruguay (colección `usefulappssnapshots`, base del
// app). El lado que lee es app/utils/usefulAppsStores.ts (`UsefulAppsSnapshotDoc`).
export const USEFUL_APPS_KEY = "uy";

export type StoreName = "android" | "ios";

/** Lo que se lee de una ficha. Todo campo puede faltar: una ficha rara no rompe la corrida. */
export interface StoreListing {
  name: string | null;
  developer: string | null;
  /** Día (YYYY-MM-DD) de la última versión publicada. */
  updated: string | null;
  rating: number | null;
  ratingCount: number | null;
  /** Sólo Google Play ("100 k+"). */
  installs: string | null;
  icon: string | null;
}

export interface StoreSignal extends Partial<StoreListing> {
  /** `missing` = la tienda contestó 404: la app no está en la tienda de Uruguay. */
  status: "ok" | "missing";
  /** Día (YYYY-MM-DD) de la lectura. Una lectura fallida conserva la anterior con SU fecha. */
  checkedAt: string;
}

export interface AppSignals {
  android?: StoreSignal | null;
  ios?: StoreSignal | null;
}

/** Una ficha cuyo desarrollador ya no es el del catálogo: se revisa a mano, la página no lo muestra. */
export interface DeveloperChange {
  id: string;
  store: StoreName;
  expected: string;
  found: string;
}

export interface UsefulAppsCounts {
  apps: number;
  /** Fichas leídas bien en esta corrida. */
  fresh: number;
  /** Fichas que la tienda contestó con 404. */
  missing: number;
  /** Pedidos que fallaron (red, 5xx, página sin JSON-LD): conservan lo anterior. */
  failed: number;
}

export interface UsefulAppsSnapshot {
  key: string;
  capturedAt: Date;
  apps: Record<string, AppSignals>;
  counts: UsefulAppsCounts;
  developerChanges: DeveloperChange[];
}
