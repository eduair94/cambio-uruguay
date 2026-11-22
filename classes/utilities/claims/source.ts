import { createWriteStream, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { aggregateClaims, type ClaimsAggregate } from "./aggregate";
import { openFirstZipEntry } from "./zip";
import { BOT_USER_AGENT } from "../power/run";

/**
 * The catalog's slug for the SUR dataset. Around 2026-11 catalogodatos.gub.uy prefixed the
 * Intendencia's datasets with its organization and truncated the long ones, and the old slug answers
 * 404: the claims layer froze while the job failed silently every day (Sentry CAMBIO-URUGUAY-BACKEND-1R).
 * So the slug is tried, then the previous one, then the dataset is looked up by its exact title.
 */
export const SUR_DATASET = "intendencia-montevideo-reclamos-registrados-en-el-sistema-unico-de-reclamos-de-la-intendencia-d";
const SUR_DATASET_PREVIOUS = "reclamos-registrados-en-el-sistema-unico-de-reclamos-de-la-intendencia-de-montevideo";
const SUR_TITLE = "Reclamos registrados en el Sistema Unico de Reclamos de la Intendencia de Montevideo";
export const SUR_DATASET_URL = `https://catalogodatos.gub.uy/dataset/${SUR_DATASET}`;
const CKAN = "https://catalogodatos.gub.uy/api/3/action";

type CkanPackage = { name?: string; title?: string; resources?: Array<Record<string, unknown>> };

async function ckan(path: string): Promise<{ ok: boolean; status: number; result?: unknown }> {
  const response = await fetch(`${CKAN}/${path}`, { headers: { "user-agent": BOT_USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return { ok: false, status: response.status };
  const body = await response.json() as { success?: boolean; result?: unknown };
  return { ok: body.success === true, status: response.status, result: body.result };
}

/** The SUR package: by slug, by the previous slug, else the one search hit with the exact title. */
async function surPackage(): Promise<CkanPackage> {
  for (const slug of [SUR_DATASET, SUR_DATASET_PREVIOUS]) {
    const shown = await ckan(`package_show?id=${slug}`);
    if (shown.ok && shown.result) return shown.result as CkanPackage;
    if (shown.status !== 404) throw new Error(`CKAN HTTP ${shown.status}`);
  }
  const searched = await ckan(`package_search?rows=20&q=${encodeURIComponent(`title:"${SUR_TITLE}"`)}`);
  const hits = ((searched.result as { results?: CkanPackage[] } | undefined)?.results || [])
    .filter(item => (item.title || "").trim() === SUR_TITLE);
  if (hits.length !== 1) throw new Error("SUR dataset not found in CKAN");
  return hits[0]!;
}
const MAX_ZIP_BYTES = 200 * 1024 * 1024;

export interface ClaimsSnapshot extends ClaimsAggregate {
  source: { url: string; resourceUrl: string; resourceModified: string; fetchedAt: string };
}

/** The SUR archive in CKAN: its download URL and the catalog's modification date. */
export async function surResource(): Promise<{ url: string; modified: string }> {
  const found = (await surPackage()).resources?.find(item => /reclamos\.zip$/i.test(String(item.url || "")));
  const url = String(found?.url || ""), modified = String(found?.last_modified || found?.metadata_modified || "");
  if (!/^https:\/\/[a-z0-9.-]+\.gub\.uy\//.test(url) || !Number.isFinite(Date.parse(modified))) throw new Error("SUR resource not found in CKAN");
  return { url, modified };
}

/**
 * Reuses the previous aggregate while CKAN reports the same modification of the SUR archive; when it
 * changed, downloads the ZIP to a temporary file, streams its CSV once and deletes the file.
 */
export async function loadClaims({ previous, locate, force = false, now = new Date() }: {
  previous: ClaimsSnapshot | null;
  locate: (lng: number, lat: number) => string | null;
  force?: boolean;
  now?: Date;
}): Promise<ClaimsSnapshot> {
  const { url, modified } = await surResource();
  if (!force && previous?.source?.resourceModified === modified) return previous;
  const path = join(tmpdir(), `sur-reclamos-${process.pid}-${Date.now()}.zip`);
  try {
    const response = await fetch(url, { headers: { "user-agent": BOT_USER_AGENT }, signal: AbortSignal.timeout(240_000) });
    if (!response.ok || !response.body) throw new Error(`SUR download HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_ZIP_BYTES) throw new Error("SUR archive larger than allowed");
    let bytes = 0;
    const body = Readable.fromWeb(response.body as any);
    body.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > MAX_ZIP_BYTES) body.destroy(new Error("SUR archive larger than allowed")); });
    await pipeline(body, createWriteStream(path));
    const entry = await openFirstZipEntry(path);
    if (!/\.csv$/i.test(entry.name)) throw new Error("SUR archive does not contain a CSV");
    const lines = createInterface({ input: entry.stream, crlfDelay: Infinity });
    const aggregate = await aggregateClaims(lines, locate, now);
    return { ...aggregate, source: { url: SUR_DATASET_URL, resourceUrl: url, resourceModified: modified, fetchedAt: now.toISOString() } };
  } finally {
    await fs.rm(path, { force: true });
  }
}
