import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { serviceCategory, serviceName, validServicePoint } from "./classify";
import { SERVICE_CATEGORIES, SERVICE_MAX_POINTS, SERVICE_SOURCE, ServicePoint, ServiceSnapshot } from "./types";

// Preserve native import: root compiles to CommonJS, while this small streaming parser is ESM.
const loadParser = new Function("return import('osm-pbf-parser-node')") as () => Promise<typeof import("osm-pbf-parser-node")>;
interface Element { type?: string; id?: number; lat?: number; lon?: number; refs?: number[]; tags?: Record<string, string>; osmosis_replication_timestamp?: number }

/** Two passes retain only tagged features and their referenced nodes, never every node in Uruguay. */
export async function parseServicePbf(file: string, sourceSha256: string, fetchedAt: string, deadline = Date.now() + 10 * 60_000, parserModule?: Pick<typeof import("osm-pbf-parser-node"), "OSMTransform">): Promise<ServiceSnapshot> {
  const { OSMTransform } = parserModule || await loadParser();
  async function* read(withTags: boolean): AsyncGenerator<Element> {
    class CheckedTransform extends OSMTransform {
      _transform(chunk: any, encoding: any, next: (error?: Error) => void) {
        try { super._transform(chunk, encoding, next); } catch (error) { next(error as Error); }
      }
      _flush(next: (error?: Error) => void) {
        // Turn upstream's synchronous final-block assertion into a catchable stream error.
        const self = this as any;
        next(self.status !== 0 || (self.buffer && self.buffer.length !== self.offset) ? new Error("Truncated OSM PBF") : undefined);
      }
    }
    const input = createReadStream(file);
    const parser = new CheckedTransform({ withTags, withInfo: false });
    const done = pipeline(input, parser);
    void done.catch(() => {});
    try {
      for await (const batch of parser) {
        if (Date.now() > deadline) throw new Error("OSM parsing deadline exceeded");
        for (const item of batch) yield item;
      }
      await done;
    } finally { input.destroy(); parser.destroy(); await done.catch(() => {}); }
  }
  const points: ServicePoint[] = [];
  const ways: Array<{ id: number; refs: number[]; category: ServicePoint["category"]; name: string | null }> = [];
  const needed = new Set<number>();
  let dataAsOf = "";
  let ignoredRelations = 0;
  for await (const item of read(true)) {
    if (item.osmosis_replication_timestamp) dataAsOf = new Date(item.osmosis_replication_timestamp * 1000).toISOString();
    const category = serviceCategory(item.tags);
    if (!category || !Number.isSafeInteger(item.id) || item.id! <= 0) continue;
    const name = serviceName(item.tags);
    if (item.type === "node" && validServicePoint(item.lat, item.lon))
      points.push({ id: `node/${item.id}`, category, name, location: { type: "Point", coordinates: [item.lon!, item.lat!] }, pointKind: "node" });
    else if (item.type === "way") {
      if (!Array.isArray(item.refs) || item.refs.length < 2 || item.refs.length > 10_000 || item.refs.some(id => !Number.isSafeInteger(id))) throw new Error("Invalid OSM way references");
      ways.push({ id: item.id!, refs: item.refs, category, name });
      for (const ref of item.refs) needed.add(ref);
    } else if (item.type === "relation") ignoredRelations++;
    if (points.length + ways.length > SERVICE_MAX_POINTS || needed.size > 2_000_000) throw new Error("OSM feature memory budget exceeded");
  }
  if (!dataAsOf) throw new Error("OSM replication timestamp missing");
  const coordinates = new Map<number, [number, number]>();
  for await (const item of read(false))
    if (item.type === "node" && needed.has(item.id!) && validServicePoint(item.lat, item.lon)) coordinates.set(item.id!, [item.lon!, item.lat!]);
  let missingWays = 0;
  const nodeCount = points.length;
  for (const way of ways) {
    const pairs = way.refs.map(id => coordinates.get(id));
    if (pairs.some(value => !value)) { missingWays++; continue; }
    const lngs = pairs.map(value => value![0]), lats = pairs.map(value => value![1]);
    const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
    points.push({ id: `way/${way.id}`, category: way.category, name: way.name,
      location: { type: "Point", coordinates: [lng, lat] }, pointKind: "area_center" });
  }
  points.sort((a, b) => a.id.localeCompare(b.id));
  return { version: 1, snapshotId: `osm-v1-${sourceSha256}`, fetchedAt, dataAsOf, sourceUrl: SERVICE_SOURCE,
    sourceSha256, points, counts: Object.fromEntries(SERVICE_CATEGORIES.map(category => [category, points.filter(point => point.category === category).length])) as ServiceSnapshot["counts"],
    diagnostics: { nodes: nodeCount, ways: ways.length, missingWays, ignoredRelations } };
}
