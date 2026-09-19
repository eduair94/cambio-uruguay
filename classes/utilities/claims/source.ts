import { createWriteStream, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { aggregateClaims, type ClaimsAggregate } from "./aggregate";
import { openFirstZipEntry } from "./zip";
import { BOT_USER_AGENT } from "../power/run";

export const SUR_DATASET = "reclamos-registrados-en-el-sistema-unico-de-reclamos-de-la-intendencia-de-montevideo";
export const SUR_DATASET_URL = `https://catalogodatos.gub.uy/dataset/${SUR_DATASET}`;
const CKAN_SHOW = `https://catalogodatos.gub.uy/api/3/action/package_show?id=${SUR_DATASET}`;
const MAX_ZIP_BYTES = 200 * 1024 * 1024;

export interface ClaimsSnapshot extends ClaimsAggregate {
  source: { url: string; resourceUrl: string; resourceModified: string; fetchedAt: string };
}

async function resource(): Promise<{ url: string; modified: string }> {
  const response = await fetch(CKAN_SHOW, { headers: { "user-agent": BOT_USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`CKAN HTTP ${response.status}`);
  const body = await response.json() as { result?: { resources?: Array<Record<string, unknown>> } };
  const found = body.result?.resources?.find(item => /reclamos\.zip$/i.test(String(item.url || "")));
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
  const { url, modified } = await resource();
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
