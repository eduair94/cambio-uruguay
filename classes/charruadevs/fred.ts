// Avisos de desarrollo de software en Indeed EE.UU. (FRED: IHLIDXUSTPSOFTDEVE), feb-2020 = 100.
// El contexto externo del termómetro: EE.UU. es el mayor comprador de software uruguayo.
import axios from "axios";

export interface FredPoint {
  m: string;
  v: number;
}

const FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=IHLIDXUSTPSOFTDEVE";

export function parseFredCsv(csv: string): FredPoint[] {
  const acc = new Map<string, number[]>();
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [d, v] = line.split(",");
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !v || v === "." || !Number.isFinite(Number(v))) continue;
    const k = d.slice(0, 7);
    const list = acc.get(k) || [];
    list.push(Number(v));
    acc.set(k, list);
  }
  return [...acc.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([m, vs]) => ({ m, v: Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 10) / 10 }));
}

export async function fetchFred(): Promise<FredPoint[] | null> {
  try {
    const res = await axios.get<string>(FRED_URL, {
      timeout: 20000,
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0 cambio-uruguay" },
    });
    const pts = parseFredCsv(String(res.data));
    return pts.length ? pts : null;
  } catch {
    return null;
  }
}
