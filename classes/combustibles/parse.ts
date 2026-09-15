// classes/combustibles/parse.ts
//
// La tabla de precios históricos de ANCAP (una fila por vigencia, desde 01/07/2021) está en HTML
// plano: siete celdas, fecha dd/mm/yyyy y decimales con coma. Se lee la PRIMERA tabla de la
// página; la segunda es histórico pre-2021 en otra moneda y con otras columnas.
export type FuelKey = "super95" | "premium97" | "gasoil50s" | "gasoil10s" | "queroseno" | "supergas";

export interface FuelRow {
  /** Vigencia (ISO yyyy-mm-dd). */
  from: string;
  super95: number | null;
  premium97: number | null;
  gasoil50s: number | null;
  gasoil10s: number | null;
  queroseno: number | null;
  supergas: number | null;
}

export const FUEL_KEYS: readonly FuelKey[] = ["super95", "premium97", "gasoil50s", "gasoil10s", "queroseno", "supergas"];

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, "").replace(/&nbsp;| /g, " ").trim();

function cell(raw: string): number | null {
  const text = stripTags(raw);
  if (!text) return null;
  const n = Number(text.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseAncapHistory(html: string): FuelRow[] {
  const table = /<table[\s\S]*?<\/table>/i.exec(html);
  if (!table) return [];
  const rows: FuelRow[] = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(table[0]))) {
    const cells: string[] = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td: RegExpExecArray | null;
    while ((td = tdRe.exec(tr[0]))) cells.push(td[1] ?? "");
    if (cells.length !== 7) continue;
    const date = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(stripTags(cells[0]));
    if (!date) continue;
    rows.push({
      from: `${date[3]}-${date[2]}-${date[1]}`,
      super95: cell(cells[1]),
      premium97: cell(cells[2]),
      gasoil50s: cell(cells[3]),
      gasoil10s: cell(cells[4]),
      queroseno: cell(cells[5]),
      supergas: cell(cells[6]),
    });
  }
  rows.sort((a, b) => a.from.localeCompare(b.from));
  return rows;
}
