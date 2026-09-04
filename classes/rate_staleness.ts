// La cuarta guarda: la pizarra que no se rompió, se quedó quieta.
//
// Las tres que ya existían miran otra cosa, y por eso las tres dejaron pasar el mismo caso durante
// 57 días:
//   * `rate_plausibility` mira compra > venta POR FILA. 37,15 < 39,55 pasa.
//   * `rate_audit` mira la banda por percentiles contra las otras casas. 39,55 contra una mediana
//     de 41,45 son ~4,6 %: holgadamente dentro de p10/3–p90×3.
//   * `/estado` (app/server/api/scraper-health.get.ts) tiene un estado `stale`, pero mide la FECHA
//     DE LA FILA. Un origen que escribe fila fresca todos los días con el mismo número sale `live`.
//
// El caso real: `baluma_cambio` publica 37,15 / 39,55 desde el 2026-07-09.
// `balumacambio.enjoypuntadeleste.com.uy/cotizacion.php` devuelve HTTP 200 y 8.449 bytes bajo el
// título "Cotizaciones del día". El scraper anda. El que se congeló es el origen — comprobalo contra
// la fuente antes de tocar un scraper.
//
// POR QUÉ ES UN DEFECTO ACTIVO Y NO SIMPLE OBSOLESCENCIA, que es la parte que importa:
// una pizarra congelada no se queda quieta en el ranking, LO ESCALA. El mercado se mueve y ella no,
// así que deriva hacia el extremo de la distribución; y como el sitio ordena por "más barato", la
// sube al titular. Cuanto más vieja, más destacada. Por eso `extreme` es parte del veredicto: los
// mismos días quietos importan mucho más si además están encabezando la portada.
//
// Esta guarda NO borra nada. Una pizarra quieta puede ser un precio real (una casa chica que no
// mueve el mostrador en una semana tranquila existe), y borrar por sospecha es cambiar un dato
// dudoso por cero datos — el mismo error que `rate_audit` evita con su nivel `sospechosa`.

const DAY_MS = 86_400_000;

export interface StalenessRow {
  origin: string;
  code: string;
  type?: string | null;
  buy?: number | null;
  sell?: number | null;
  date: Date | string;
}

/** Dónde queda la cotización quieta dentro de su propio grupo (moneda + tipo) hoy. */
export type FrozenExtreme = "min-sell" | "max-sell" | "min-buy" | "max-buy" | null;

export interface FrozenQuote {
  origin: string;
  code: string;
  type: string;
  buy: number | null;
  sell: number | null;
  /** Primer día del tramo sin cambios. `null` cuando toda la ventana está quieta. */
  lastChangedAt: Date | null;
  daysFrozen: number;
  /** `true` = la ventana entera está quieta, así que `daysFrozen` es un piso, no el número real. */
  capped: boolean;
  extreme: FrozenExtreme;
}

export interface FrozenOptions {
  today: Date;
  /** Días de calendario sin moverse a partir de los cuales se reporta. Por defecto 7. */
  minDays?: number;
}

const keyOf = (r: StalenessRow) => `${r.origin}|${r.code}|${r.type || ""}`;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const startOfDay = (d: Date) => Math.floor(d.getTime() / DAY_MS);
const daysBetween = (from: Date, to: Date) => startOfDay(to) - startOfDay(from);

/**
 * Encuentra las cotizaciones cuyo precio no cambió en `minDays` días de calendario o más.
 *
 * Recibe las filas diarias crudas de una ventana (varios orígenes, varias monedas) y no toca la
 * base: es pura, para poder probarla sin Mongo.
 */
export function findFrozenQuotes(rows: StalenessRow[], opts: FrozenOptions): FrozenQuote[] {
  const minDays = opts.minDays ?? 7;
  const groups = new Map<string, { row: StalenessRow; date: Date; buy: number | null; sell: number | null }[]>();

  for (const row of rows) {
    const buy = num(row.buy);
    const sell = num(row.sell);
    // Una fila sin ningún precio no es un cambio de precio: es un día sin dato. Contarla como
    // cambio reiniciaría el contador y escondería justo a la pizarra que buscamos.
    if (buy === null && sell === null) continue;
    const date = row.date instanceof Date ? row.date : new Date(row.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = keyOf(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ row, date, buy, sell });
  }

  // El valor de hoy de cada serie, para saber después quién es la punta de su grupo.
  const latest = new Map<string, { code: string; type: string; origin: string; buy: number | null; sell: number | null }>();
  for (const [key, points] of groups) {
    points.sort((a, b) => a.date.getTime() - b.date.getTime());
    const last = points[points.length - 1];
    latest.set(key, { code: last.row.code, type: last.row.type || "", origin: last.row.origin, buy: last.buy, sell: last.sell });
  }

  const frozen: FrozenQuote[] = [];
  for (const [key, points] of groups) {
    // Con una sola muestra no hay nada que comparar. Eso es una serie corta, no una pizarra quieta,
    // y denunciarla convertiría a cada casa nueva en una alerta el día que entra.
    if (points.length < 2) continue;

    const last = points[points.length - 1];
    let i = points.length - 1;
    while (i >= 0 && points[i].buy === last.buy && points[i].sell === last.sell) i--;

    const capped = i < 0;
    const runStart = capped ? points[0].date : points[i + 1].date;
    // Días de CALENDARIO, no cantidad de puntos: hay orígenes con días faltantes, y contar muestras
    // le bajaría la antigüedad justo a los que peor se están portando.
    const daysFrozen = daysBetween(runStart, opts.today);
    if (daysFrozen < minDays) continue;

    frozen.push({
      origin: last.row.origin,
      code: last.row.code,
      type: last.row.type || "",
      buy: last.buy,
      sell: last.sell,
      lastChangedAt: capped ? null : runStart,
      daysFrozen,
      capped,
      extreme: extremeOf(key, latest),
    });
  }

  return frozen.sort((a, b) => b.daysFrozen - a.daysFrozen);
}

/** Si esta cotización es hoy el mínimo o el máximo de su grupo (moneda + tipo). */
function extremeOf(key: string, latest: Map<string, { code: string; type: string; origin: string; buy: number | null; sell: number | null }>): FrozenExtreme {
  const mine = latest.get(key);
  if (!mine) return null;
  const peers = [...latest.values()].filter(p => p.code === mine.code && p.type === mine.type);
  // Con dos casas cualquiera es extremo por definición, y eso no informa nada.
  if (peers.length < 3) return null;

  const sells = peers.map(p => p.sell).filter((v): v is number => v !== null);
  const buys = peers.map(p => p.buy).filter((v): v is number => v !== null);
  if (mine.sell !== null && sells.length >= 3) {
    if (mine.sell === Math.min(...sells)) return "min-sell";
    if (mine.sell === Math.max(...sells)) return "max-sell";
  }
  if (mine.buy !== null && buys.length >= 3) {
    if (mine.buy === Math.max(...buys)) return "max-buy";
    if (mine.buy === Math.min(...buys)) return "min-buy";
  }
  return null;
}

export type FrozenSeverity = "aviso" | "grave" | null;

/**
 * Cuán mal está una pizarra quieta.
 *
 * El extremo sube la severidad sin esperar los 30 días porque es el que se publica en la portada:
 * ocho días quieto en el medio del pelotón es una casa tranquila; ocho días quieto encabezando el
 * ranking es el sitio contestando mal su pregunta principal.
 */
export function frozenSeverity(q: { daysFrozen: number; extreme: FrozenExtreme }, minDays = 7): FrozenSeverity {
  if (q.daysFrozen < minDays) return null;
  if (q.extreme !== null) return "grave";
  return q.daysFrozen >= 30 ? "grave" : "aviso";
}

/** Una línea legible por humanos, para el aviso y para los logs. */
export function describeFrozen(q: FrozenQuote): string {
  const what = `${q.origin} ${q.code}${q.type ? "/" + q.type : ""}`;
  const since = q.capped ? `hace ${q.daysFrozen}+ días` : `desde hace ${q.daysFrozen} días`;
  const tip = q.extreme ? ` — y es ${LABELS[q.extreme]} de su grupo, o sea que encabeza el ranking` : "";
  return `${what}: ${q.buy ?? "-"} / ${q.sell ?? "-"} sin cambiar ${since}${tip}`;
}

const LABELS: Record<Exclude<FrozenExtreme, null>, string> = {
  "min-sell": "la venta más barata",
  "max-sell": "la venta más cara",
  "max-buy": "la compra más alta",
  "min-buy": "la compra más baja",
};
