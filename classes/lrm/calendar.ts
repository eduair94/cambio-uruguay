// El «Calendario tentativo de colocación de títulos emitidos por el BCU» (calendario_deuda.pdf).
//
// El BCU lo reemplaza cada viernes con las licitaciones de las dos semanas siguientes. El texto que
// devuelve unpdf trae cada licitación en una línea:
//
//   19/10/2026 19/10/2026 23/11/2026 LRM S. 13846 vta. 1 35 13.300 2.660 14,00
//
// (licitación, integración, vencimiento, serie y venta, plazo, monto, no competitiva, hora). Se
// leen SÓLO las filas de LRM: las de Notas del Tesoro del mismo PDF salen con columnas corridas
// (una dice "13 años" sin moneda) y esta página no las necesita.
//
// La prueba de que las columnas se leyeron bien es la misma idea que la de Ley 18.212 en
// `classes/bcurates/`: el plazo que declara la fila tiene que ser exactamente los días entre la
// integración y el vencimiento. Una fila que no cierra se descarta en vez de publicarse.
import type { LrmCalendar, LrmUpcoming } from "./types";

const DATE = String.raw`(\d{1,2})\/(\d{1,2})\/(\d{4})`;

function iso(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100)) return null;
  const value = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  // 31/2 no existe: Date lo corre al 3/3 y la vuelta no coincide.
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value ? value : null;
}

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** "13.300" → 13300 (millones). El punto es separador de miles. */
const amount = (text: string): number => (text === "-" ? 0 : Number(text.replace(/\./g, "")));

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  setiembre: 9,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/** Las licitaciones de LRM del calendario. `null` si el texto no parece el calendario. */
export function parseCalendarText(text: string): LrmCalendar | null {
  const flat = text.replace(/\s+/g, " ");
  const periods = [...flat.matchAll(new RegExp(String.raw`PERIODO:\s*${DATE}\s+AL\s+${DATE}`, "gi"))]
    .map((m) => ({ from: iso(m[1], m[2], m[3]), to: iso(m[4], m[5], m[6]) }))
    .filter((p): p is { from: string; to: string } => Boolean(p.from && p.to));
  if (!periods.length) return null;

  const row = new RegExp(
    String.raw`${DATE}\s+${DATE}\s+${DATE}\s+LRM\s+S\.?\s*(\d+)\s*vta\.?\s*(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+|-)\s+(\d{1,2})[,.:](\d{2})`,
    "gi"
  );
  const items: LrmUpcoming[] = [];
  const seen = new Set<string>();
  for (const m of flat.matchAll(row)) {
    const date = iso(m[1], m[2], m[3]);
    const settlement = iso(m[4], m[5], m[6]);
    const maturity = iso(m[7], m[8], m[9]);
    const days = Number(m[12]);
    if (!date || !settlement || !maturity) continue;
    if (daysBetween(settlement, maturity) !== days) continue;
    const series = `${m[10]}-${m[11]}`;
    const id = `${date}|${series}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      date,
      settlement,
      maturity,
      series,
      days,
      amount: amount(m[13]),
      nonCompetitive: amount(m[14]),
      hour: `${m[15].padStart(2, "0")}:${m[16]}`,
    });
  }
  if (!items.length) return null;
  items.sort((a, b) => (a.date === b.date ? a.days - b.days : a.date < b.date ? -1 : 1));

  const published = /(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo),\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i.exec(
    flat
  );
  const month = published ? MONTHS[published[2].toLowerCase()] : undefined;
  const publishedOn = published && month ? iso(published[1], String(month), published[3]) : null;

  return {
    from: periods.map((p) => p.from).sort()[0],
    to: periods
      .map((p) => p.to)
      .sort()
      .reverse()[0],
    publishedOn,
    items,
  };
}
