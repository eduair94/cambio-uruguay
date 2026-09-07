import { describe, expect, it, vi, beforeEach } from "vitest";
import { serviceCategory, serviceName, serviceSnapshotProblem } from "../../classes/propertyservices/classify";
import { SERVICE_CATEGORIES, ServiceSnapshot } from "../../classes/propertyservices/types";
const { collection } = vi.hoisted(() => ({ collection: vi.fn() }));
vi.mock("../../classes/appdb", () => ({ appConnection: () => ({ asPromise: async () => {}, collection }) }));
import { publishServiceSnapshot } from "../../classes/propertyservices/store";

const candidate = (): ServiceSnapshot => {
  const points = Array.from({ length: 600 }, (_, i) => ({ id: `node/${i + 1}`, category: SERVICE_CATEGORIES[i % 6],
    name: null, location: { type: "Point" as const, coordinates: [-56.16, -34.9] as [number, number] }, pointKind: "node" as const }));
  return { version: 1, snapshotId: "new", fetchedAt: new Date().toISOString(), dataAsOf: new Date().toISOString(), sourceUrl: "source", sourceSha256: "hash",
    points, counts: Object.fromEntries(SERVICE_CATEGORIES.map(id => [id, 100])) as ServiceSnapshot["counts"],
    diagnostics: { nodes: 600, ways: 0, missingWays: 0, ignoredRelations: 0 } };
};
describe("property service category evidence", () => {
  it.each([
    [{ shop: "supermarket" }, "supermarket"], [{ shop: "convenience" }, "grocery"],
    [{ amenity: "pharmacy" }, "pharmacy"], [{ healthcare: "clinic" }, "healthcare"],
    [{ highway: "bus_stop" }, "transit"], [{ public_transport: "platform", bus: "yes" }, "transit"],
    [{ amenity: "school" }, "education"], [{ shop: "clothes", name: "Supermarket" }, null],
    [{ public_transport: "stop_position" }, null], [{ public_transport: "platform" }, null],
    [{ amenity: "pharmacy", disused: "yes" }, null], [{ "disused:shop": "supermarket" }, null],
  ])("uses mapped category rather than a business name (%o)", (tags, expected) => expect(serviceCategory(tags as any)).toBe(expected));
  it("sanitizes names and does not use contact tags as a label", () => {
    expect(serviceName({ phone: "123", email: "a@b.com" })).toBeNull();
    expect(serviceName({ name: "  Local\u0000 <Uno>  " })).toBe("Local Uno");
  });
});
describe("snapshot publication guards", () => {
  it("accepts a complete candidate", () => expect(serviceSnapshotProblem(candidate())).toBeNull());
  it("rejects a tiny or empty extract without a special initial-seed bypass", () => {
    const value = candidate(); value.points = value.points.slice(0, 20);
    expect(serviceSnapshotProblem(value)).toBe("invalid_size");
  });
  it("does not refresh freshness from download time", () => {
    const value = candidate(); value.dataAsOf = "2020-01-01T00:00:00Z";
    expect(serviceSnapshotProblem(value)).toBe("invalid_source_date");
  });
  it("refuses partial geometry and disappearing categories", () => {
    const value = candidate(); value.diagnostics = { nodes: 500, ways: 100, missingWays: 10, ignoredRelations: 0 };
    expect(serviceSnapshotProblem(value)).toBe("missing_geometry");
    value.diagnostics.missingWays = 0;
    expect(serviceSnapshotProblem(value, { total: 900, dataAsOf: value.dataAsOf, counts: { pharmacy: 500 } })).toBe("thin_category");
  });
  it("refuses duplicate identities or impossible coordinates", () => {
    const value = candidate(); value.points[1].id = value.points[0].id;
    expect(serviceSnapshotProblem(value)).toBe("duplicate_ids");
    value.points[1].id = "node/2"; value.points[0].location.coordinates = [0, 0];
    expect(serviceSnapshotProblem(value)).toBe("invalid_points");
  });
});
describe("atomic active pointer", () => {
  let points: any, meta: any, events: string[];
  beforeEach(() => {
    events = [];
    points = { createIndex: vi.fn(), bulkWrite: vi.fn(async () => events.push("batch")), countDocuments: vi.fn(async () => 600), deleteMany: vi.fn(async () => events.push("cleanup")) };
    meta = { findOne: vi.fn(async () => null), updateOne: vi.fn(async () => { events.push("switch"); return { matchedCount: 0, upsertedCount: 1 }; }) };
    collection.mockImplementation(name => name === "propertyservicemetas" ? meta : points);
  });
  it("publishes only after indexed rows are complete and keeps prior generation", async () => {
    await publishServiceSnapshot(candidate());
    expect(events).toEqual(["cleanup", "batch", "batch", "switch", "cleanup"]);
    expect(points.createIndex).toHaveBeenCalledWith({ snapshotId: 1, location: "2dsphere" }, { name: "snapshot_location" });
  });
  it("a failed batch cannot clear or replace the active data", async () => {
    meta.findOne.mockResolvedValue({ ...candidate(), snapshotId: "old", previousSnapshotId: "older", total: 600 });
    points.bulkWrite.mockRejectedValue(new Error("connection lost"));
    await expect(publishServiceSnapshot(candidate())).rejects.toThrow("connection lost");
    expect(meta.updateOne).not.toHaveBeenCalled();
    expect(points.deleteMany).toHaveBeenCalledTimes(1);
    expect(points.deleteMany.mock.calls[0][0].snapshotId.$nin).toEqual(["new", "old", "older"]);
  });
  it("a mismatched staged count cannot become active", async () => {
    points.countDocuments.mockResolvedValue(10);
    await expect(publishServiceSnapshot(candidate())).rejects.toThrow("count mismatch");
    expect(meta.updateOne).not.toHaveBeenCalled();
  });
});
