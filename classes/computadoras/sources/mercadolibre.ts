// Mercado Libre Uruguay por el puente propio (:9656): los usados que entran al directorio y las
// piezas nuevas que arman la tabla de precios.
//
// Medido el 23/11/2026: con `condition=used`, PC de escritorio MLU1649 = 298 avisos, notebooks
// MLU1652 = más de 1.000 (el puente corta en 1.000), mini PC MLU407379 = 50, iMac/all-in-one
// MLU443594 = 33. El puente devuelve 20 por página y la página siguiente se pide por `offset`. La
// ficha de un usado NO se puede leer (el puente sólo atiende fichas de catálogo y la página directa
// redirige al login), así que de ML va sólo lo que dice el título.
//
// Secuencial y con pausa entre pedidos, como autos: un 429 deja al puente en su proxy residencial
// para todos los jobs que lo usan.
import { sleep } from "../../facebook/browser";
import { fetchJson } from "../../retail/net";
import { ML_API_BASE, mlSellerKey } from "../../retail/sources/mercadolibre";
import type { RawComputerListing } from "../types";

export interface MlScan {
  q: string;
  category?: string;
  condition?: "used" | "new";
  pages: number;
}

/** Los usados del directorio: máquinas y piezas sueltas. */
export const ML_USED_SCANS: readonly MlScan[] = [
  { q: "pc", category: "MLU1649", condition: "used", pages: 16 },
  { q: "notebook", category: "MLU1652", condition: "used", pages: 50 },
  { q: "mini pc", category: "MLU407379", condition: "used", pages: 4 },
  { q: "imac", category: "MLU443594", condition: "used", pages: 4 },
  { q: "placa de video", category: "MLU1658", condition: "used", pages: 8 },
  { q: "procesador", category: "MLU1693", condition: "used", pages: 5 },
  { q: "memoria ram", category: "MLU1694", condition: "used", pages: 3 },
  { q: "motherboard", category: "MLU1692", condition: "used", pages: 3 },
  { q: "ssd", category: "MLU1672", condition: "used", pages: 2 },
  { q: "fuente", category: "MLU1695", condition: "used", pages: 2 },
];

/** Piezas nuevas por categoría: la tabla de precios nuevos. */
export const ML_NEW_SCANS: readonly MlScan[] = [
  { q: "procesador", category: "MLU1693", condition: "new", pages: 10 },
  { q: "placa de video", category: "MLU1658", condition: "new", pages: 14 },
  { q: "memoria ram", category: "MLU1694", condition: "new", pages: 8 },
  { q: "memoria ram notebook", category: "MLU3582", condition: "new", pages: 2 },
  { q: "ssd", category: "MLU1672", condition: "new", pages: 8 },
  { q: "disco duro", category: "MLU1672", condition: "new", pages: 3 },
  { q: "motherboard", category: "MLU1692", condition: "new", pages: 10 },
  { q: "fuente de poder", category: "MLU1695", condition: "new", pages: 6 },
  { q: "gabinete", category: "MLU1696", condition: "new", pages: 3 },
  { q: "notebook", category: "MLU1652", condition: "new", pages: 14 },
];

interface MlResult {
  id?: string;
  title?: string;
  permalink?: string;
  category_id?: string;
  condition?: string;
  price?: { amount?: number; currency?: string };
  image?: string;
  seller?: { id?: number; name?: string; official_store?: boolean; city?: string };
}

interface MlResponse {
  paging?: { total?: number; returned?: number };
  results?: MlResult[];
}

/** Una página del puente, o null si no contestó. */
export type MlPageFetcher = (params: Record<string, string>) => Promise<MlResponse | null>;

const bridgeFetcher: MlPageFetcher = (params) =>
  fetchJson<MlResponse>(`${ML_API_BASE}/search?${new URLSearchParams(params)}`, { timeoutMs: 90_000, retries: 1, unthrottled: true });

export function mlRaw(result: MlResult, day: string): RawComputerListing | null {
  const id = String(result.id ?? "").trim();
  const title = String(result.title ?? "").trim();
  const amount = Number(result.price?.amount);
  const currency = String(result.price?.currency ?? "").toUpperCase();
  if (!id || !title || !Number.isFinite(amount) || amount <= 0 || (currency !== "USD" && currency !== "UYU")) return null;
  return {
    slug: `ml-${id}`,
    source: "mercadolibre",
    sourceId: id,
    url: String(result.permalink ?? "").split("#")[0]!,
    title: title.slice(0, 300),
    price: amount,
    currency,
    image: result.image ?? null,
    location: result.seller?.city ?? null,
    category: result.category_id ?? null,
    condition: result.condition ?? null,
    officialStore: !!result.seller?.official_store,
    sellerId: mlSellerKey(result.seller),
    firstSeen: day,
    lastSeen: day,
  };
}

export interface MlScanResult {
  rows: RawComputerListing[];
  pages: number;
  failed: number;
  /** Ningún pedido contestó: el puente está caído. */
  dead: boolean;
}

export async function runMlScans(
  scans: readonly MlScan[],
  day: string,
  options: { gapMs?: number; deadlineAt?: number; fetcher?: MlPageFetcher } = {}
): Promise<MlScanResult> {
  const fetcher = options.fetcher ?? bridgeFetcher;
  const gapMs = options.gapMs ?? 1_500;
  const rows = new Map<string, RawComputerListing>();
  let pages = 0;
  let failed = 0;
  let answered = 0;
  for (const scan of scans) {
    let offset = 0;
    for (let page = 0; page < scan.pages; page++) {
      if (options.deadlineAt && Date.now() >= options.deadlineAt) return { rows: [...rows.values()], pages, failed, dead: answered === 0 && pages > 0 };
      const params: Record<string, string> = { q: scan.q, offset: String(offset) };
      if (scan.category) params.category = scan.category;
      if (scan.condition) params.condition = scan.condition;
      const response = await fetcher(params);
      pages++;
      if (gapMs) await sleep(gapMs);
      if (!response) {
        failed++;
        // Tres páginas seguidas sin respuesta en la primera búsqueda: el puente no está.
        if (answered === 0 && failed >= 3) return { rows: [], pages, failed, dead: true };
        break;
      }
      answered++;
      const results = response.results ?? [];
      for (const result of results) {
        const raw = mlRaw(result, day);
        if (raw && !rows.has(raw.slug)) rows.set(raw.slug, raw);
      }
      const returned = response.paging?.returned ?? results.length;
      offset += returned;
      if (!returned || offset >= Math.min(response.paging?.total ?? 0, 1_000)) break;
    }
  }
  return { rows: [...rows.values()], pages, failed, dead: answered === 0 && pages > 0 };
}

/** Búsquedas puntuales de un modelo (los procesadores y placas que usa el directorio y la tabla no tiene). */
export function modelScans(labels: ReadonlyArray<{ role: "cpu" | "gpu" | "notebook"; query: string }>): MlScan[] {
  const category = { cpu: "MLU1693", gpu: "MLU1658", notebook: "MLU1652" } as const;
  return labels.map(({ role, query }) => ({ q: query, category: category[role], condition: "new" as const, pages: 1 }));
}
