import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";
import { parseServicePbf } from "../../classes/propertyservices/parse";
import { OSMTransform } from "osm-pbf-parser-node";
const nativeImport = (url: string) => import(url);
async function fixture(): Promise<Buffer> {
  const { default: Pbf } = await nativeImport(pathToFileURL(require.resolve("pbf")).href);
  const { Blob, BlobHeader } = await nativeImport(pathToFileURL(resolve("node_modules/osm-pbf-parser-node/proto/fileformat.js")).href);
  const { HeaderBlock, PrimitiveBlock } = await nativeImport(pathToFileURL(resolve("node_modules/osm-pbf-parser-node/proto/osmformat.js")).href);
  const encode = (type: any, value: any) => { const p = new Pbf(); type.write(value, p); return Buffer.from(p.finish()); };
  const block = (type: string, raw: Buffer) => {
    const data = encode(Blob, { zlib_data: deflateSync(raw), raw_size: raw.length });
    const header = encode(BlobHeader, { type, datasize: data.length });
    const size = Buffer.alloc(4); size.writeUInt32BE(header.length);
    return Buffer.concat([size, header, data]);
  };
  return Buffer.concat([
    block("OSMHeader", encode(HeaderBlock, { required_features: ["OsmSchema-V0.6"], osmosis_replication_timestamp: 1_788_768_000 })),
    block("OSMData", encode(PrimitiveBlock, { stringtable: { s: ["", "shop", "supermarket", "name", "Mercado", "amenity", "school"].map(value => Buffer.from(value)) },
      primitivegroup: [{ nodes: [
        { id: 1, lat: -349000000, lon: -561600000, keys: [1, 3], vals: [2, 4] },
        { id: 2, lat: -349001000, lon: -561601000 }, { id: 3, lat: -349002000, lon: -561602000 },
      ], ways: [{ id: 10, keys: [5, 3], vals: [6, 4], refs: [2, 1, -1] }] }] })),
  ]);
}
describe("real binary streaming PBF boundary", () => {
  it("resolves tagged nodes and untagged way references through two passes", async () => {
    const dir = await mkdtemp(resolve(".sdd-services-test-"));
    try {
      const file = join(dir, "test.osm.pbf"); await writeFile(file, await fixture());
      const result = await parseServicePbf(file, "hash", "2026-09-07T00:00:00Z", Date.now() + 5000, { OSMTransform });
      expect(result.points).toHaveLength(2);
      expect(result.points[0]).toMatchObject({ id: "node/1", category: "supermarket", pointKind: "node" });
      expect(result.points[1]).toMatchObject({ id: "way/10", category: "education", pointKind: "area_center" });
      expect(result.points[1].location.coordinates[0]).toBeCloseTo(-56.16015, 5);
      expect(result.diagnostics.missingWays).toBe(0);
      expect(result.dataAsOf).not.toBe(result.fetchedAt);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it("rejects truncated binary data without publishing a seemingly valid partial set", async () => {
    const dir = await mkdtemp(resolve(".sdd-services-test-"));
    try {
      const file = join(dir, "truncated.osm.pbf"), bytes = await fixture();
      await writeFile(file, bytes.subarray(0, bytes.length - 5));
      await expect(parseServicePbf(file, "hash", new Date().toISOString(), Date.now() + 5000, { OSMTransform })).rejects.toThrow("Truncated");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
