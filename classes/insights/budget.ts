// Los dos documentos tienen tope de tamaño y se recortan solos antes de pasarlo. Puro.
//
// El snapshot lo lee una página entera (≤ 1 MB); el día es la única memoria de dos fuentes que olvidan
// (Clarity a los 3 días, Cloudflare RUM cuando muestrea), así que se recorta lo menos útil primero y
// cada recorte queda escrito (`run.trimmed` y la línea de log).
import { DAY_MAX_BYTES, SNAPSHOT_MAX_BYTES } from "./types";
import type { UsageInsightDay, UsageInsightSnapshot } from "./types";

export const bytesOf = (v: unknown) => Buffer.byteLength(JSON.stringify(v));

interface Candidate {
  label: string;
  holder: any;
  key: string;
}

function arraysOf(obj: any, prefix: string, out: Candidate[]): void {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      if (v.length > 1 && v.some((x) => x && typeof x === "object")) out.push({ label: `${prefix}.${k}`, holder: obj, key: k });
    } else if (v && typeof v === "object") arraysOf(v, `${prefix}.${k}`, out);
  }
}

/** Corta a la mitad el arreglo más pesado de la lista, en orden de preferencia, hasta entrar. */
function trimUntil(doc: any, max: number, groups: Candidate[][], trimmed: string[]): number {
  let size = bytesOf(doc);
  let guard = 0;
  while (size > max && guard++ < 200) {
    let chosen: Candidate | null = null;
    for (const group of groups) {
      const live = group.filter((c) => Array.isArray(c.holder[c.key]) && c.holder[c.key].length > 1);
      if (!live.length) continue;
      chosen = live.sort((a, b) => bytesOf(b.holder[b.key]) - bytesOf(a.holder[a.key]))[0];
      // Un arreglo chico de un grupo preferido no alcanza: se busca el más pesado de todos los grupos
      // cuando el elegido pesa menos del 2 % del documento.
      if (bytesOf(chosen.holder[chosen.key]) >= size * 0.02) break;
      chosen = null;
    }
    if (!chosen) {
      const all = groups.flat().filter((c) => Array.isArray(c.holder[c.key]) && c.holder[c.key].length > 1);
      if (!all.length) break;
      chosen = all.sort((a, b) => bytesOf(b.holder[b.key]) - bytesOf(a.holder[a.key]))[0];
    }
    const before = chosen.holder[chosen.key].length;
    const after = Math.floor(before / 2);
    chosen.holder[chosen.key] = chosen.holder[chosen.key].slice(0, after);
    trimmed.push(`${chosen.label} ${before}→${after}`);
    size = bytesOf(doc);
  }
  return size;
}

/** El snapshot entra en `SNAPSHOT_MAX_BYTES`; deja `run.trimmed` y `run.bytes`. Muta y devuelve. */
export function enforceBudget(snapshot: UsageInsightSnapshot, max = SNAPSHOT_MAX_BYTES): UsageInsightSnapshot {
  const trimmed: string[] = [...(snapshot.run?.trimmed || [])];
  const pages: Candidate[] = [{ label: "pages", holder: snapshot, key: "pages" }];
  const sourceArrays: Candidate[] = [];
  for (const [id, block] of Object.entries(snapshot.sources || {})) {
    if ((block as any)?.data) arraysOf((block as any).data, id, sourceArrays);
  }
  const signalRows: Candidate[] = (snapshot.signals || []).map((s) => ({ label: `signals.${s.id}.rows`, holder: s, key: "rows" }));
  const size = trimUntil(snapshot, max, [pages, sourceArrays, signalRows], trimmed);
  snapshot.run = { ...snapshot.run, trimmed, bytes: size };
  // `bytes` cambió de largo: se vuelve a medir para que el número sea el del documento guardado.
  snapshot.run.bytes = bytesOf(snapshot);
  return snapshot;
}

/** El día entra en `DAY_MAX_BYTES`, empezando por los elementos de CLS/INP/LCP, los referentes y Clarity URL × dispositivo. */
export function enforceDayBudget(
  day: Partial<UsageInsightDay>,
  log: (line: string) => void = () => undefined,
  max = DAY_MAX_BYTES
): Partial<UsageInsightDay> {
  const src: any = day.sources || {};
  const preferred: Candidate[] = [];
  if (src.cloudflareRum?.data) {
    preferred.push({ label: "cloudflareRum.elements", holder: src.cloudflareRum.data, key: "elements" });
    preferred.push({ label: "cloudflareRum.referrers", holder: src.cloudflareRum.data, key: "referrers" });
  }
  if (src.clarity?.data) preferred.push({ label: "clarity.urlDevice", holder: src.clarity.data, key: "urlDevice" });
  const rest: Candidate[] = [];
  for (const [id, slice] of Object.entries(src)) if ((slice as any)?.data) arraysOf((slice as any).data, id, rest);
  const trimmed: string[] = [];
  trimUntil(day, max, [preferred, rest], trimmed);
  for (const t of trimmed) log(`[usage-insights] día ${day.day}: recorte ${t}`);
  return day;
}
