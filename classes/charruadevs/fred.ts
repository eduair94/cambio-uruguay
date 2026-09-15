// Avisos de desarrollo de software en Indeed EE.UU., feb-2020 = 100. El contexto externo del
// termómetro: EE.UU. es el mayor comprador de software uruguayo.
//
// Dos fuentes para la MISMA serie (76,62 el 2026-09-11 en las dos): el repo público de Indeed Hiring
// Lab en GitHub, que es el publicador, y FRED (IHLIDXUSTPSOFTDEVE), que la redistribuye. Hiring Lab va
// primero porque FRED no contesta desde el VPS (conexión caída, status 000, medido 2026-09-15) y la
// siembra de producción salió con la serie vacía por eso.
import axios from "axios";

export interface FredPoint {
  m: string;
  v: number;
}

const HIRING_LAB_URL =
  "https://raw.githubusercontent.com/hiring-lab/job_postings_tracker/master/US/job_postings_by_sector_US.csv";
const FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=IHLIDXUSTPSOFTDEVE";

function monthlyAverages(points: Array<[string, number]>): FredPoint[] {
  const acc = new Map<string, number[]>();
  for (const [d, v] of points) {
    const k = d.slice(0, 7);
    const list = acc.get(k) || [];
    list.push(v);
    acc.set(k, list);
  }
  return [...acc.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([m, vs]) => ({ m, v: Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 10) / 10 }));
}

/**
 * El CSV por sector de Hiring Lab (`date,jobcountry,indeed_job_postings_index,variable,display_name`)
 * → el promedio mensual de "total postings" de Software Development. "new postings" es otra serie
 * (sólo avisos nuevos) y no se mezcla.
 */
export function parseHiringLabCsv(csv: string): FredPoint[] {
  const points: Array<[string, number]> = [];
  for (const line of csv.split(/\r?\n/)) {
    const [d, , v, variable, name] = line.split(",");
    if (variable !== "total postings" || name !== "Software Development") continue;
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Number(v)) || v === "") continue;
    points.push([d, Number(v)]);
  }
  return monthlyAverages(points);
}

export function parseFredCsv(csv: string): FredPoint[] {
  const points: Array<[string, number]> = [];
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [d, v] = line.split(",");
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !v || v === "." || !Number.isFinite(Number(v))) continue;
    points.push([d, Number(v)]);
  }
  return monthlyAverages(points);
}

async function getText(url: string, timeout: number): Promise<string | null> {
  try {
    const res = await axios.get<string>(url, {
      timeout,
      responseType: "text",
      maxContentLength: 64 * 1024 * 1024,
      headers: { "User-Agent": "Mozilla/5.0 cambio-uruguay" },
    });
    return String(res.data);
  } catch {
    return null;
  }
}

/** La serie mensual, de la primera fuente que conteste con datos; `null` si ninguna. */
export async function fetchFred(): Promise<FredPoint[] | null> {
  const lab = await getText(HIRING_LAB_URL, 60000);
  const fromLab = lab ? parseHiringLabCsv(lab) : [];
  if (fromLab.length) return fromLab;
  const fred = await getText(FRED_URL, 20000);
  const fromFred = fred ? parseFredCsv(fred) : [];
  return fromFred.length ? fromFred : null;
}
