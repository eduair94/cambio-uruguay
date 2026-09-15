// Arctic Shift (archivo público de Reddit): trae todo lo publicado en r/CharruaDevs en un rango,
// incluso lo que después se borró. El job pide cada corrida los dos últimos meses completos: así
// recalcula las filas mensuales y recoge lo que el archivo ingirió tarde.
import { SUB } from "./types";

const BASE = "https://arctic-shift.photon-reddit.com/api";
const UA = "cambio-uruguay/1.0 (+https://cambio-uruguay.com/mercado-it-uruguay)";
// Los posts NO llevan `fields`: la lista blanca de Arctic Shift rechaza permalink/upvote_ratio con
// un 400, y un 400 acá significa "la consulta está mal", nunca "el mes vino vacío".
const COMMENT_FIELDS = "id,link_id,parent_id,created_utc,body,author,score";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getPage(url: string): Promise<Array<{ id: string; created_utc: number }>> {
  let last = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch (e) {
      last = String(e);
    }
    if (!res) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      last = `HTTP ${res.status}`;
      await sleep((Number(res.headers.get("retry-after")) || 5 * (attempt + 1)) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`arctic-shift HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const json = (await res.json()) as { data?: Array<{ id: string; created_utc: number }> | null };
    return json.data ?? [];
  }
  throw new Error(`arctic-shift sin respuesta: ${last}`);
}

export async function fetchRange<T extends { id: string; created_utc: number }>(
  kind: "posts" | "comments",
  fromUtc: number,
  toUtc: number
): Promise<T[]> {
  const seen = new Set<string>();
  const out: T[] = [];
  let after = fromUtc - 1;
  for (let guard = 0; guard < 20000; guard++) {
    const fields = kind === "comments" ? `&fields=${COMMENT_FIELDS}` : "";
    const url = `${BASE}/${kind}/search?subreddit=${SUB}&after=${after}&before=${toUtc}&sort=asc&limit=auto${fields}`;
    const data = await getPage(url);
    if (!data.length) break;
    let fresh = 0;
    for (const o of data) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      out.push(o as T);
      fresh++;
    }
    const last = data[data.length - 1].created_utc;
    // Si la página entera ya estaba vista, avanzar un segundo: `after` crece siempre, así termina.
    after = fresh === 0 ? last + 1 : last;
    if (after >= toUtc) break;
  }
  return out;
}
