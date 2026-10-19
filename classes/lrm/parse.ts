// Las hojas «LRM» y «NT MEF» de la planilla de operaciones del BCU, fila por fila.
//
// Las columnas se ubican por su ENCABEZADO y no por su letra: la planilla la arma a mano la mesa
// de operaciones del BCU ("I:\GROUP\MESA LOCAL\EMISIONES\…" dice su propia ruta), y una columna
// agregada en el medio corre todas las letras. Si falta un encabezado que esta página necesita, el
// parser no adivina: devuelve cero filas y el job conserva la foto anterior.
//
// Guardas, en dos niveles, porque una planilla cargada a mano tiene errores de tipeo de verdad: en
// la descarga del 19/10/2026 la licitación a 364 días del 15/10 declara ofertas por 1.229.352
// MILLONES de pesos, más de lo que existe en toda la economía. Esta página no publica las
// ofertas, pero la lección vale para la tasa:
//
//   1. Por fila (`rowProblem`): una tasa de corte fuera de 0,25–40 %, un plazo que no cierra con
//      las fechas o un vencimiento anterior a la licitación no es un dato, es un error.
//   2. Por serie (`dropOutliers`): una tasa que se aleja más de max(2,5 puntos, 40 %) de la mediana
//      de las últimas ocho licitaciones del MISMO plazo es un tipeo (0,62 por 6,2). La mediana se
//      calcula sobre lo leído, no sobre lo aceptado: si el BCU de verdad sube la tasa de golpe, la
//      ventana se corre en cinco licitaciones y el dato nuevo entra, en vez de quedar rechazado
//      para siempre contra una mediana que ya no existe.
import { excelSerialToIso, type SheetRow } from "./xlsx";
import { LRM_TERM_REFS, type LrmAuction, type LrmTermRef, type TreasuryAuction } from "./types";

/** Banda absoluta de una tasa de corte, en porcentaje. */
export const RATE_MIN = 0.25;
export const RATE_MAX = 40;
/** Ventana y tolerancia de la guarda por serie. */
export const OUTLIER_WINDOW = 8;
export const OUTLIER_MIN_HISTORY = 4;
export const OUTLIER_ABS_PP = 2.5;
export const OUTLIER_REL = 0.4;

const norm = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** La fila de encabezados y, por cada nombre pedido, la letra de su columna. */
function findHeader(
  rows: readonly SheetRow[],
  wanted: Record<string, string>
): { headerRow: number; columns: Record<string, string> } | null {
  for (const row of rows) {
    const byName = new Map<string, string>();
    for (const [column, value] of Object.entries(row.cells)) byName.set(norm(value), column);
    const columns: Record<string, string> = {};
    let ok = true;
    for (const [field, header] of Object.entries(wanted)) {
      const column = byName.get(norm(header));
      if (!column) {
        ok = false;
        break;
      }
      columns[field] = column;
    }
    if (ok) return { headerRow: row.row, columns };
  }
  return null;
}

const num = (value: string | undefined): number => {
  if (value === undefined) return NaN;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "-") return NaN;
  return Number(trimmed);
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Tasa en porcentaje. La planilla la guarda como fracción (0,0604 = 6,04 %); si algún día la
 * guarda ya en porcentaje, se acepta tal cual en vez de publicar 604 %.
 */
export function toPercent(value: number): number {
  return round2(rawPercent(value));
}

/** Igual que {@link toPercent} pero sin redondear. */
function rawPercent(value: number): number {
  if (!Number.isFinite(value)) return NaN;
  return Math.abs(value) < 1 ? value * 100 : value;
}

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const LRM_HEADERS = {
  date: "Fecha",
  settlement: "Liquidación",
  series: "Serie/Venta",
  days: "Plazo",
  termRef: "Plazo ref.",
  maturity: "Vencimiento",
  auctioned: "Licitado",
  awarded: "Adjudicado",
  cutRate: "Tasa de corte",
};

/** Por qué una licitación no es publicable, o `null` si lo es. */
export function rowProblem(auction: LrmAuction): string | null {
  if (!auction.date || !auction.settlement || !auction.maturity) return "fecha ilegible";
  // Una licitación desierta figura con adjudicado y tasa en cero: no colocó nada a ninguna tasa.
  if (auction.awarded === 0) return "desierta";
  if (!Number.isFinite(auction.cutRate)) return "sin tasa de corte";
  if (auction.cutRate < RATE_MIN || auction.cutRate > RATE_MAX) return `tasa ${auction.cutRate} % fuera de banda`;
  if (!(auction.days > 0 && auction.days <= 1200)) return `plazo ${auction.days} días`;
  if (auction.maturity <= auction.date) return "vence antes de licitarse";
  // El plazo de la columna es el de la liquidación al vencimiento. Si no cierra, alguna de las tres
  // columnas se leyó de otro lado.
  if (Math.abs(daysBetween(auction.settlement, auction.maturity) - auction.days) > 1) {
    return `el plazo (${auction.days}) no cierra con las fechas`;
  }
  if (!(auction.awarded >= 0) || !(auction.auctioned > 0)) return "montos ilegibles";
  return null;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Saca, por plazo de referencia, las tasas que son un tipeo contra su propia serie. */
export function dropOutliers(auctions: readonly LrmAuction[]): { kept: LrmAuction[]; dropped: LrmAuction[] } {
  const chronological = [...auctions].sort((a, b) => (a.date === b.date ? a.days - b.days : a.date < b.date ? -1 : 1));
  const windows = new Map<number, number[]>();
  const kept: LrmAuction[] = [];
  const dropped: LrmAuction[] = [];
  for (const auction of chronological) {
    const window = windows.get(auction.termRef) ?? [];
    if (window.length >= OUTLIER_MIN_HISTORY) {
      const reference = median(window);
      const tolerance = Math.max(OUTLIER_ABS_PP, reference * OUTLIER_REL);
      if (Math.abs(auction.cutRate - reference) > tolerance) dropped.push(auction);
      else kept.push(auction);
    } else {
      kept.push(auction);
    }
    window.push(auction.cutRate);
    if (window.length > OUTLIER_WINDOW) window.shift();
    windows.set(auction.termRef, window);
  }
  return { kept, dropped };
}

export interface LrmParse {
  /** Las licitaciones publicables, de la más nueva a la más vieja. */
  auctions: LrmAuction[];
  /** Cuántas filas con fecha se descartaron y por qué (para el log del job). */
  rejected: { date: string; series: string; reason: string }[];
  /** Vacío si la hoja se leyó; si no, por qué no. */
  problem: string | null;
}

/** La hoja «LRM» completa. */
export function parseLrmSheet(rows: readonly SheetRow[]): LrmParse {
  const header = findHeader(rows, LRM_HEADERS);
  if (!header) return { auctions: [], rejected: [], problem: "no se encontraron los encabezados de la hoja LRM" };
  const c = header.columns;
  const candidates: LrmAuction[] = [];
  const rejected: LrmParse["rejected"] = [];
  for (const row of rows) {
    if (row.row <= header.headerRow) continue;
    const date = excelSerialToIso(num(row.cells[c.date]));
    if (!date) continue; // filas de notas, totales o vacías
    const termRef = num(row.cells[c.termRef]);
    const auction: LrmAuction = {
      date,
      settlement: excelSerialToIso(num(row.cells[c.settlement])) ?? "",
      maturity: excelSerialToIso(num(row.cells[c.maturity])) ?? "",
      series: String(row.cells[c.series] ?? "").trim(),
      days: num(row.cells[c.days]),
      termRef: termRef as LrmTermRef,
      auctioned: round2(num(row.cells[c.auctioned])),
      awarded: round2(num(row.cells[c.awarded])),
      cutRate: toPercent(num(row.cells[c.cutRate])),
    };
    const problem =
      rowProblem(auction) ??
      ((LRM_TERM_REFS as readonly number[]).includes(termRef) ? null : `plazo de referencia ${termRef}`);
    if (problem) rejected.push({ date, series: auction.series, reason: problem });
    else candidates.push(auction);
  }
  const { kept, dropped } = dropOutliers(candidates);
  for (const auction of dropped) {
    rejected.push({ date: auction.date, series: auction.series, reason: `tasa ${auction.cutRate} % lejos de su serie` });
  }
  kept.sort((a, b) => (a.date === b.date ? b.days - a.days : a.date < b.date ? 1 : -1));
  return { auctions: kept, rejected, problem: null };
}

/** La licitación más reciente de cada plazo de referencia que tuvo alguna desde `since`. */
export function latestByTerm(auctions: readonly LrmAuction[], since: string): LrmAuction[] {
  const out: LrmAuction[] = [];
  for (const term of LRM_TERM_REFS) {
    const newest = auctions
      .filter((a) => a.termRef === term && a.date >= since)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
    if (newest) out.push(newest);
  }
  return out;
}

const NT_HEADERS = {
  date: "Fecha",
  series: "Serie",
  sale: "Venta",
  currency: "Moneda",
  coupon: "Cupón",
  maturity: "Vencimiento",
  years: "Plazo original (años)",
  awarded: "Adjudicado",
  yield: "TIR",
};

function treasuryCurrency(label: string): TreasuryAuction["currency"] | null {
  const n = norm(label);
  if (n.startsWith("pesos")) return "UYU";
  if (n.startsWith("unidades indexadas")) return "UI";
  if (n.startsWith("unidades previsionales")) return "UP";
  return null;
}

/**
 * La hoja «NT MEF»: la ÚLTIMA licitación con TIR de cada moneda.
 *
 * Una licitación desierta trae "-" en la TIR y se salta: la última con dato es la que dice a qué
 * tasa se colocó deuda en esa moneda.
 */
export function parseTreasurySheet(rows: readonly SheetRow[]): TreasuryAuction[] {
  const header = findHeader(rows, NT_HEADERS);
  if (!header) return [];
  const c = header.columns;
  const newest = new Map<TreasuryAuction["currency"], TreasuryAuction>();
  for (const row of rows) {
    if (row.row <= header.headerRow) continue;
    const date = excelSerialToIso(num(row.cells[c.date]));
    const maturity = excelSerialToIso(num(row.cells[c.maturity]));
    const currency = treasuryCurrency(row.cells[c.currency] ?? "");
    const tir = toPercent(num(row.cells[c.yield]));
    const awarded = num(row.cells[c.awarded]);
    if (!date || !maturity || !currency || !Number.isFinite(tir) || !(awarded > 0)) continue;
    // Banda: en UI y UP la tasa es real; en pesos, nominal. Ninguna de las dos pasa de 40 %.
    if (tir < -5 || tir > RATE_MAX) continue;
    const auction: TreasuryAuction = {
      date,
      series: `${String(row.cells[c.series] ?? "").trim()}-${String(row.cells[c.sale] ?? "").trim()}`,
      currency,
      // Tres decimales: los cupones del MEF son de octavos (8,125 %) y a dos se publicaría 8,13 %.
      coupon: Math.round(rawPercent(num(row.cells[c.coupon])) * 1000) / 1000,
      maturity,
      years: Math.round(num(row.cells[c.years]) * 10) / 10,
      awarded: round2(awarded),
      yield: tir,
    };
    const prev = newest.get(currency);
    if (!prev || prev.date <= date) newest.set(currency, auction);
  }
  const order: TreasuryAuction["currency"][] = ["UYU", "UI", "UP"];
  return order.map((currency) => newest.get(currency)).filter((a): a is TreasuryAuction => Boolean(a));
}
