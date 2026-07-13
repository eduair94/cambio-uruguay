// In-process access to the backend's own rate data for the price-prediction job. The backend IS
// the rates source — no HTTP round-trip to its own API, unlike the app's version of this file
// (server/utils/pricePrediction.ts), which had to $fetch its own /evolution/... route over the
// network. Same CANONICAL anchors (USD/EUR/ARS) and the same fallback ("whichever live origin
// quotes it") as the app used, ported verbatim.
import { cambio_info } from "../cambioInfo";
import { isPredictableCurrencyCode, type SeriesPoint } from "./prompt";

// Phase 1 canonical anchors — same feeds analysis.ts/pricePrediction.ts already trusted for
// USD/EUR/ARS in the app. Any other currency falls back to whichever origin currently quotes it
// live (resolveAnchor below), which is lower-quality but the only option for currencies with no
// dedicated backend feed.
const CANONICAL: Record<string, { origin: string; code: string; type: string }> = {
  USD: { origin: "bcu", code: "USD", type: "BILLETE" },
  EUR: { origin: "brou", code: "EUR", type: "" },
  ARS: { origin: "bcu", code: "ARS", type: "BILLETE" },
};

interface LiveRateItem {
  origin?: string;
  code?: string;
  type?: string;
}

async function fetchLiveRates(): Promise<LiveRateItem[]> {
  try {
    const items = await cambio_info.get_data();
    return Array.isArray(items) ? (items as LiveRateItem[]) : [];
  } catch {
    return [];
  }
}

/** Canonical anchor for USD/EUR/ARS, else whichever live origin quotes this currency. */
export async function resolveAnchor(
  currency: string
): Promise<{ origin: string; code: string; type: string } | null> {
  const canonical = CANONICAL[currency];
  if (canonical) return canonical;

  const items = await fetchLiveRates();
  const match = items.find((i) => i.code === currency && i.origin);
  if (!match?.origin) return null;
  return { origin: match.origin, code: currency, type: match.type ?? "" };
}

/** Every currency code currently quoted by at least one exchange house. */
export async function listActiveCurrencies(): Promise<string[]> {
  const items = await fetchLiveRates();
  const codes = new Set<string>();
  for (const item of items) {
    if (item.code && isPredictableCurrencyCode(item.code)) codes.add(item.code);
  }
  return [...codes].sort();
}

interface RawEvolutionPoint {
  date?: unknown;
  buy?: number;
  sell?: number;
}

/** Normalize evolution points into a clean, date-sorted {date,value} series. `date` may arrive as
 *  a real Date (Mongo/mongoose lean() result) or a string — both are reduced to YYYY-MM-DD. */
function toSeries(points: RawEvolutionPoint[] | undefined): SeriesPoint[] {
  if (!Array.isArray(points)) return [];
  const out: SeriesPoint[] = [];
  for (const p of points) {
    if (!p || !p.date) continue;
    const sell = typeof p.sell === "number" ? p.sell : null;
    const buy = typeof p.buy === "number" ? p.buy : null;
    const value = sell ?? buy;
    if (value === null || !Number.isFinite(value) || value <= 0) continue;
    const raw = p.date;
    const iso = raw instanceof Date ? raw.toISOString() : String(raw);
    out.push({ date: iso.slice(0, 10), value });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** ~6 months of daily points for `currency`, or `[]` when there is no anchor or no data yet. */
export async function fetchRecentSeries(currency: string): Promise<SeriesPoint[]> {
  const anchor = await resolveAnchor(currency);
  if (!anchor) return [];
  try {
    const res = await cambio_info.get_currency_evolution(anchor.origin, anchor.code, 6, anchor.type || undefined);
    return toSeries(res?.evolution);
  } catch {
    // get_currency_evolution throws when there's no historical data at all for this anchor —
    // treat exactly like "no series yet", the same as every other caller of this method.
    return [];
  }
}
