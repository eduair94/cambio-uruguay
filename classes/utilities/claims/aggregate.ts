/**
 * Intendencia de Montevideo, Sistema Único de Reclamos (SUR): every complaint since 2010 with its
 * point. Only four families speak about living in a street, and only those are kept. They are
 * complaints REGISTERED, not problems that happened: a neighbourhood that complains more is not
 * necessarily worse served, and the page says so.
 */
export const CLAIM_CATEGORIES = ["alumbrado", "saneamiento", "limpieza", "calles"] as const;
export type ClaimCategory = typeof CLAIM_CATEGORIES[number];
export type ClaimCounts = Record<ClaimCategory, number>;

export interface ClaimsAggregate {
  periodFrom: string;
  periodTo: string;
  countsByOfficialCode: Record<string, ClaimCounts>;
  /** Rows in the period and categories whose point fell in no single INE barrio. */
  unassigned: number;
  /** Rows read from the file (all periods, all categories). */
  rows: number;
}

export function claimCategory(area: string, group: string): ClaimCategory | null {
  if (area === "Alumbrado") return "alumbrado";
  if (area === "Saneamiento") return "saneamiento";
  if (area === "Limpieza" && (group === "Problema de limpieza" || group === "Estado de los contenedores")) return "limpieza";
  if (area === "Calles y veredas" && group === "Viales") return "calles";
  return null;
}

/** One CSV record (RFC 4180 quoting). Returns null while a quoted field is still open. */
export function splitCsvLine(line: string): string[] | null {
  const fields: string[] = [];
  let field = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { fields.push(field); field = ""; }
    else field += char;
  }
  if (quoted) return null;
  fields.push(field);
  return fields;
}

const emptyCounts = (): ClaimCounts => ({ alumbrado: 0, saneamiento: 0, limpieza: 0, calles: 0 });
const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
const shiftMonth = (month: string, delta: number) => {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
};

/**
 * Streams the SUR CSV once, counting per month, INE barrio and category, then keeps the last twelve
 * COMPLETE months present in the file (the month of the newest row is treated as partial unless the
 * row falls on its last day).
 */
export async function aggregateClaims(lines: AsyncIterable<string>, locate: (lng: number, lat: number) => string | null, now = new Date()): Promise<ClaimsAggregate> {
  const today = now.toISOString().slice(0, 10);
  let header: string[] | null = null;
  let pending = "";
  let rows = 0, newest = "";
  const monthly = new Map<string, Map<string, ClaimCounts>>();
  const monthlyUnassigned = new Map<string, number>();
  for await (const piece of lines) {
    const line = pending ? `${pending}\n${piece}` : piece;
    const fields = splitCsvLine(line);
    if (!fields) { pending = line.length > 100_000 ? "" : line; continue; }
    pending = "";
    if (!header) {
      header = fields.map((name, index) => (index === 0 && name.charCodeAt(0) === 0xfeff ? name.slice(1) : name).trim());
      for (const name of ["FECHA_INGRESO_RECLAMO", "DESC_AREA", "DESC_GRUPO", "LATITUD", "LONGITUD"])
        if (!header.includes(name)) throw new Error(`SUR CSV lacks ${name}`);
      continue;
    }
    rows++;
    const value = (name: string) => fields[header!.indexOf(name)]?.trim() ?? "";
    const day = value("FECHA_INGRESO_RECLAMO").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today) continue;
    if (day > newest) newest = day;
    const category = claimCategory(value("DESC_AREA"), value("DESC_GRUPO"));
    if (!category) continue;
    const month = day.slice(0, 7);
    const code = locate(Number(value("LONGITUD")), Number(value("LATITUD")));
    if (!code) { monthlyUnassigned.set(month, (monthlyUnassigned.get(month) || 0) + 1); continue; }
    let byCode = monthly.get(month);
    if (!byCode) monthly.set(month, byCode = new Map());
    let counts = byCode.get(code);
    if (!counts) byCode.set(code, counts = emptyCounts());
    counts[category]++;
  }
  if (!header || rows < 1000 || !newest) throw new Error("SUR CSV too small to be the full archive");
  const lastComplete = newest === monthEnd(newest.slice(0, 7)) ? newest.slice(0, 7) : shiftMonth(newest.slice(0, 7), -1);
  const firstMonth = shiftMonth(lastComplete, -11);
  const countsByOfficialCode: Record<string, ClaimCounts> = {};
  let unassigned = 0;
  for (let month = firstMonth; month <= lastComplete; month = shiftMonth(month, 1)) {
    unassigned += monthlyUnassigned.get(month) || 0;
    for (const [code, counts] of monthly.get(month) || []) {
      const total = countsByOfficialCode[code] ||= emptyCounts();
      for (const category of CLAIM_CATEGORIES) total[category] += counts[category];
    }
  }
  return { periodFrom: `${firstMonth}-01`, periodTo: monthEnd(lastComplete), countsByOfficialCode, unassigned, rows };
}
