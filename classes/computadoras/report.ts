// El informe de precios de notebooks usadas (`/precios-notebooks-usadas-uruguay`): cuánto se PIDE
// hoy, por marca, procesador, generación, RAM y placa, la escalera de los MacBook y qué se consigue
// con cada presupuesto. Se arma del catálogo ya publicado: mismas filas, mismas reglas.
//
// Tres reglas:
//  - precios pedidos en avisos, no ventas; sin fallas declaradas ni moneda deducida;
//  - ninguna celda con menos de `minSample` avisos (8), o `ladderSample` (5) en las escaleras de
//    generación y de MacBook, donde la celda es más estrecha y más homogénea;
//  - medianas y cuartiles, nunca promedios: un MacBook Pro de US$ 4.000 no mueve la mediana de «Apple».
import { median, quantile, round } from "./text";
import type { ComputerCatalogRow, NotebookBudget, NotebookReport, ReportCell } from "./types";

/** Igual que `notebookRefKey` de catalog.ts (acá para no importar el catálogo desde el informe). */
const notebookRefKey = (cpuSlug: string, line: string | null | undefined): string =>
  line && /^macbook-(air|pro)$/.test(line) ? `notebook:${line}|${cpuSlug}` : `notebook:${cpuSlug}`;

export const REPORT_POLICY = { minSample: 8, ladderSample: 5 } as const;

const PRICE_BANDS: Array<[string, string, number, number | null]> = [
  ["hasta-150", "Hasta US$ 150", 0, 150],
  ["150-300", "US$ 150 a 300", 150, 300],
  ["300-500", "US$ 300 a 500", 300, 500],
  ["500-800", "US$ 500 a 800", 500, 800],
  ["800-1200", "US$ 800 a 1.200", 800, 1200],
  ["1200-2000", "US$ 1.200 a 2.000", 1200, 2000],
  ["mas-de-2000", "Más de US$ 2.000", 2000, null],
];

const BUDGETS: Array<[string, string, number, number | null]> = [
  ["hasta-200", "Hasta US$ 200", 0, 200],
  ["200-350", "US$ 200 a 350", 200, 350],
  ["350-500", "US$ 350 a 500", 350, 500],
  ["500-800", "US$ 500 a 800", 500, 800],
  ["800-1200", "US$ 800 a 1.200", 800, 1200],
  ["mas-de-1200", "Más de US$ 1.200", 1200, null],
];

const FAMILY_LABEL: Record<string, string> = {
  "core-i3": "Intel Core i3",
  "core-i5": "Intel Core i5",
  "core-i7": "Intel Core i7",
  "core-i9": "Intel Core i9",
  "core-ultra-5": "Intel Core Ultra 5",
  "core-ultra-7": "Intel Core Ultra 7",
  "core-ultra-9": "Intel Core Ultra 9",
  "ryzen-3": "AMD Ryzen 3",
  "ryzen-5": "AMD Ryzen 5",
  "ryzen-7": "AMD Ryzen 7",
  "ryzen-9": "AMD Ryzen 9",
  "apple-m": "Apple M (todos los chips)",
  celeron: "Intel Celeron",
  pentium: "Intel Pentium",
  athlon: "AMD Athlon",
};

export const familyLabel = (family: string): string => FAMILY_LABEL[family] ?? family;

const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function cell(id: string, label: string, prices: readonly number[]): ReportCell {
  return { id, label, n: prices.length, medianUsd: round(median(prices)), p25Usd: round(quantile(prices, 0.25)), p75Usd: round(quantile(prices, 0.75)) };
}

function grouped<T>(rows: readonly ComputerCatalogRow[], keyOf: (row: ComputerCatalogRow) => string | null, min: number, build: (key: string, sample: ComputerCatalogRow[]) => T): T[] {
  const groups = new Map<string, ComputerCatalogRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, sample]) => sample.length >= min)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([key, sample]) => build(key, sample));
}

const prices = (rows: readonly ComputerCatalogRow[]): number[] => rows.map((row) => row.priceUsd);
const share = (part: number, whole: number): number => (whole ? Math.round((part / whole) * 1000) / 1000 : 0);

function top(rows: readonly ComputerCatalogRow[], labelOf: (row: ComputerCatalogRow) => string | null, limit = 3): Array<{ label: string; n: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = labelOf(row);
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([label, n]) => ({ label, n }));
}

/** Las notebooks que entran al informe: sin falla declarada ni moneda deducida. */
export const reportable = (row: ComputerCatalogRow): boolean => row.kind === "notebook" && !row.faults.length && !row.currencyInferred && row.priceUsd > 0;

export function buildNotebookReport(
  catalog: readonly ComputerCatalogRow[],
  notebookRefs: ReadonlyMap<string, { label: string; medianUsd: number; n: number }>,
  generatedAt: string
): NotebookReport | null {
  const rows = catalog.filter(reportable);
  const { minSample, ladderSample } = REPORT_POLICY;
  if (rows.length < minSample) return null;
  const all = prices(rows);

  const generations = grouped(
    rows.filter((row) => row.cpu?.brand === "intel" && /^core-i[3579]$/.test(row.cpu.family) && row.cpu.generation),
    (row) => `${row.cpu!.family}|${row.cpu!.generation}`,
    ladderSample,
    (key, sample) => {
      const [family, generation] = key.split("|") as [string, string];
      return { ...cell(`${family}-${generation}`, `${familyLabel(family).replace("Intel ", "")} de ${generation}ª generación`, prices(sample)), family, generation: Number(generation), year: sample[0]!.cpu?.year ?? null };
    }
  ).sort((a, b) => a.family.localeCompare(b.family) || a.generation - b.generation);

  // La escalera de los Mac: por chip cuando el aviso lo dice, si no por el año del título.
  const chipOrder = (slug: string): number => {
    const match = /apple-m(\d)(?:-(pro|max|ultra))?/.exec(slug);
    return match ? 3000 + Number(match[1]) * 10 + (match[2] === "pro" ? 1 : match[2] === "max" ? 2 : match[2] === "ultra" ? 3 : 0) : 9999;
  };
  const macLadder = grouped(
    rows.filter((row) => row.line === "macbook-air" || row.line === "macbook-pro"),
    (row) => (row.cpu?.brand === "apple" && row.cpu.slug ? `${row.line}|chip|${row.cpu.slug}` : row.modelYear && row.cpu?.brand !== "apple" ? `${row.line}|year|${row.modelYear}` : null),
    ladderSample,
    (key, sample) => {
      const [line, kind, step] = key.split("|") as [string, "chip" | "year", string];
      const lineLabel = sample[0]!.lineLabel ?? "MacBook";
      const label = kind === "chip" ? `${lineLabel} ${sample[0]!.cpu!.label.replace("Apple ", "")}` : `${lineLabel} ${step}`;
      return { ...cell(`${line}-${kind === "chip" ? step.replace("cpu:apple-", "") : step}`, label, prices(sample)), line, step: kind === "chip" ? sample[0]!.cpu!.label.replace("Apple ", "") : step, kind, order: kind === "chip" ? chipOrder(step) : Number(step) };
    }
  ).sort((a, b) => a.line.localeCompare(b.line) || a.order - b.order);

  // La misma clave que la referencia nueva: el procesador, y en un Mac también la línea.
  const usedByCpu = new Map<string, ComputerCatalogRow[]>();
  for (const row of rows) {
    if (!row.cpu?.slug) continue;
    const key = notebookRefKey(row.cpu.slug, row.line);
    const list = usedByCpu.get(key) ?? [];
    list.push(row);
    usedByCpu.set(key, list);
  }
  const usedVsNew = [...usedByCpu.entries()]
    .map(([slug, sample]) => ({ slug, sample, fresh: notebookRefs.get(slug) }))
    .filter((entry) => entry.fresh && entry.sample.length >= 4)
    .map(({ slug, sample, fresh }) => {
      const usedUsd = round(median(prices(sample)));
      const mac = /^notebook:macbook-/.test(slug);
      return { id: slugify(slug.replace(/^notebook:/, "").replace("cpu:", "")), label: mac ? `${sample[0]!.lineLabel} con ${sample[0]!.cpu!.label}` : sample[0]!.cpu!.label, usedUsd, usedN: sample.length, newUsd: fresh!.medianUsd, newN: fresh!.n, share: share(usedUsd, fresh!.medianUsd) };
    })
    .sort((a, b) => b.usedN - a.usedN);

  const budgets: NotebookBudget[] = BUDGETS.map(([id, label, minUsd, maxUsd]) => {
    const sample = rows.filter((row) => row.priceUsd >= minUsd && (maxUsd === null || row.priceUsd < maxUsd));
    const withRam = sample.filter((row) => row.ramGb);
    const ramCounts = new Map<number, number>();
    for (const row of withRam) ramCounts.set(row.ramGb!, (ramCounts.get(row.ramGb!) ?? 0) + 1);
    const ramTop = [...ramCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const withDisk = sample.filter((row) => row.hasSsd !== null);
    return {
      id,
      label,
      minUsd,
      maxUsd,
      n: sample.length,
      ramGb: ramTop && withRam.length >= minSample ? ramTop[0] : null,
      ramShare: ramTop && withRam.length >= minSample ? share(ramTop[1], withRam.length) : null,
      ssdShare: withDisk.length >= minSample ? share(withDisk.filter((row) => row.hasSsd).length, withDisk.length) : null,
      dedicatedShare: share(sample.filter((row) => row.gpuDedicated === true).length, sample.length),
      families: top(sample, (row) => (row.cpuFamily ? familyLabel(row.cpuFamily).replace(" (todos los chips)", "") : null)),
      lines: top(sample, (row) => row.lineLabel),
    };
  }).filter((budget) => budget.n >= minSample);

  return {
    generatedAt,
    total: rows.length,
    minSample,
    ladderSample,
    headline: {
      medianUsd: round(median(all)),
      p25Usd: round(quantile(all, 0.25)),
      p75Usd: round(quantile(all, 0.75)),
      appleShare: share(rows.filter((row) => row.brand === "Apple").length, rows.length),
      dedicatedShare: share(rows.filter((row) => row.gpuDedicated === true).length, rows.length),
      under300Share: share(rows.filter((row) => row.priceUsd < 300).length, rows.length),
    },
    priceBands: PRICE_BANDS.map(([id, label, minUsd, maxUsd]) => ({ id, label, minUsd, maxUsd, n: rows.filter((row) => row.priceUsd >= minUsd && (maxUsd === null || row.priceUsd < maxUsd)).length })),
    brands: grouped(rows, (row) => row.brand, minSample, (key, sample) => cell(slugify(key), key, prices(sample))),
    families: grouped(rows, (row) => row.cpuFamily, minSample, (key, sample) => cell(key, familyLabel(key), prices(sample))),
    generations,
    macLadder,
    ram: grouped(rows, (row) => (row.ramGb ? String(row.ramGb) : null), minSample, (key, sample) => ({ ...cell(`ram-${key}`, `${key} GB de RAM`, prices(sample)), gb: Number(key) })).sort((a, b) => a.gb - b.gb),
    gpus: grouped(rows.filter((row) => row.gpuDedicated === true && row.gpu?.model), (row) => row.gpu!.model, ladderSample, (key, sample) => cell(slugify(key), `${sample[0]!.gpu!.brand === "nvidia" ? "NVIDIA" : sample[0]!.gpu!.brand === "amd" ? "AMD" : "Intel"} ${key}`, prices(sample))),
    models: grouped(rows.filter((row) => row.line && row.model), (row) => `${row.line}|${row.model}`, ladderSample, (key, sample) => ({ ...cell(slugify(key), `${sample[0]!.lineLabel} ${sample[0]!.model}`, prices(sample)), line: sample[0]!.line! })),
    usedVsNew,
    budgets,
  };
}
