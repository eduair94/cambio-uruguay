// Qué fichas de monopatín se leen en esta corrida, y en qué orden.
//
// La lección que esta cola tiene adentro es la de Casasweb (9-10/10/2026): un job de fichas que NO
// guarda la lectura fallida, con orden determinista y corte por fallas seguidas, se traba para
// siempre apenas se juntan cinco avisos borrados al frente — y el log dice "el portal no contesta".
// Acá toda lectura se guarda, buena o mala, y la mala vuelve con espera: 1, 3 y 7 días, y a la cuarta
// falla seguida se abandona por un mes. Un aviso que ya no existe (404, ficha cerrada) espera 7 días: el
// directorio deja de mostrarlo solo a los 4 días sin verlo, así que casi nunca vuelve.

export const FICHA_REFRESH_DAYS = 45;
export const GONE_RETRY_DAYS = 7;
export const FAILURE_BACKOFF_DAYS = [1, 3, 7] as const;
export const MAX_FAILURES = 4;
/** Un aviso abandonado se vuelve a probar al mes: un bloqueo largo no lo deja sin ficha para siempre. */
export const ABANDON_RETRY_DAYS = 30;

/** Lo que `movilidadspecs` guarda por aviso, sea la lectura buena o mala. */
export interface StoredFichaDoc {
  listingId: string;
  /** La última lectura fue buena. */
  ok: boolean;
  gone?: boolean;
  /** Fallas SEGUIDAS; una lectura buena lo vuelve a 0. */
  failures: number;
  /** La última lectura buena. */
  readAt: string | null;
  lastTriedAt: string | null;
}

export interface FichaQueueRow {
  listingId: string;
  url: string;
  source: "store" | "mercadolibre" | "facebook";
}

const DAY = 86_400_000;

const elapsedDays = (iso: string | null | undefined, now: Date): number => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : (now.getTime() - time) / DAY;
};

export function fichaDue(stored: StoredFichaDoc | undefined, now: Date): boolean {
  if (!stored) return true;
  if (stored.gone) return elapsedDays(stored.lastTriedAt, now) >= GONE_RETRY_DAYS;
  const failures = stored.failures ?? 0;
  if (failures >= MAX_FAILURES) return elapsedDays(stored.lastTriedAt, now) >= ABANDON_RETRY_DAYS;
  if (failures > 0) return elapsedDays(stored.lastTriedAt, now) >= FAILURE_BACKOFF_DAYS[failures - 1]!;
  return elapsedDays(stored.readAt, now) >= FICHA_REFRESH_DAYS;
}

/**
 * Tiendas primero (son pocas y su ficha es la más completa), después los avisos de ML que nunca se
 * leyeron, y recién después las relecturas y los reintentos. Facebook nunca: su ficha exige la
 * sesión del perfil, y lo único público de un aviso de Marketplace es su título.
 */
export function orderTargets(
  rows: readonly FichaQueueRow[],
  stored: ReadonlyMap<string, StoredFichaDoc>,
  now: Date,
  budget: number
): FichaQueueRow[] {
  const rank = (row: FichaQueueRow): number => {
    const never = !stored.has(row.listingId);
    if (row.source === "store") return never ? 0 : 2;
    return never ? 1 : 3;
  };
  return rows
    .filter((row) => row.source !== "facebook" && row.url && fichaDue(stored.get(row.listingId), now))
    .sort((a, b) => rank(a) - rank(b) || a.listingId.localeCompare(b.listingId))
    .slice(0, Math.max(0, budget));
}
