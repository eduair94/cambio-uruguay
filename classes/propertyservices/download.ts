import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { SERVICE_MAX_BYTES, SERVICE_SOURCE } from "./types";

const confined = (value: string) => {
  const path = resolve(value), root = resolve(process.cwd());
  if (!path.startsWith(root + require("node:path").sep)) throw new Error("OSM file must stay inside this worktree");
  return path;
};
export async function sourceFileHash(file: string): Promise<string> {
  confined(file);
  const size = (await stat(file)).size;
  if (size < 1_000_000 || size > SERVICE_MAX_BYTES) throw new Error("Invalid OSM source size");
  const expected = (await readFile(`${file}.md5`, "utf8")).match(/^[a-f0-9]{32}\b/i)?.[0].toLowerCase();
  if (!expected) throw new Error("The source file requires its official adjacent .md5 checksum");
  const hash = createHash("sha256"), md5 = createHash("md5");
  for await (const chunk of createReadStream(file)) { hash.update(chunk); md5.update(chunk); }
  if (md5.digest("hex") !== expected) throw new Error("OSM local source checksum mismatch");
  return hash.digest("hex");
}
/** One fixed official source. No arbitrary URL or redirects to unrelated hosts. */
export async function downloadServicePbf(): Promise<{ file: string; sourceSha256: string; fetchedAt: string }> {
  const directory = confined(join(process.cwd(), ".sdd-property-services-source"));
  await mkdir(directory, { recursive: true });
  const file = join(directory, `uruguay-${process.pid}-${Date.now()}.osm.pbf`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5 * 60_000);
  try {
    const headers = { "User-Agent": "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/acerca)" };
    async function request(url: string): Promise<Response> {
      for (let attempt = 0; ; attempt++) {
        try { return await fetch(url, { headers, signal: controller.signal, redirect: "error" }); }
        catch (error) {
          if (attempt >= 2 || controller.signal.aborted) throw error;
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
    const check = await request(`${SERVICE_SOURCE}.md5`);
    if (!check.ok) throw new Error(`Geofabrik checksum status ${check.status}`);
    const checksum = (await check.text()).match(/^[a-f0-9]{32}\b/i)?.[0].toLowerCase();
    if (!checksum) throw new Error("Geofabrik checksum missing");
    const response = await request(SERVICE_SOURCE);
    if (!response.ok || !response.body) throw new Error(`Geofabrik download status ${response.status}`);
    if (Number(response.headers.get("content-length")) > SERVICE_MAX_BYTES) throw new Error("OSM download exceeds size budget");
    let bytes = 0;
    const sha = createHash("sha256"), md5 = createHash("md5");
    const bound = new Transform({ transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > SERVICE_MAX_BYTES) return callback(new Error("OSM download exceeds size budget"));
      sha.update(chunk); md5.update(chunk); callback(null, chunk);
    } });
    await pipeline(Readable.fromWeb(response.body as any), bound, createWriteStream(file), { signal: controller.signal });
    if (bytes < 1_000_000 || md5.digest("hex") !== checksum) throw new Error("OSM checksum/size mismatch; active data retained");
    return { file, sourceSha256: sha.digest("hex"), fetchedAt: new Date().toISOString() };
  } catch (error) { await rm(file, { force: true }); throw error; }
  finally { clearTimeout(timer); }
}
