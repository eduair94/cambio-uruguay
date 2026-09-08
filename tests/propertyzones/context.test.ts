import { describe, expect, it } from "vitest";
import {
  buildZoneServiceContext,
  zoneContainsPoint,
} from "../../classes/propertyzones/context";
import type {
  PropertyZoneGeometry,
  PropertyZoneSources,
} from "../../classes/propertyzones/sources/types";
import {
  SERVICE_CATEGORIES,
  type ServiceMeta,
  type ServicePoint,
} from "../../classes/propertyservices/types";

const stamp = "2026-09-08T12:00:00Z";
const ring = (x = -56.2, y = -34.9, size = 0.04) => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
  [x, y],
];
const polygon: PropertyZoneGeometry = {
  type: "Polygon",
  coordinates: [ring()],
};
const geometry = (
  ...polygons: PropertyZoneGeometry[]
): PropertyZoneSources["geometry"] => ({
  source: {
    name: "Official fixture",
    url: "https://example.gub.uy/zones",
    licenseUrl: "https://example.gub.uy/license",
    dataAsOf: "2011-01-01",
    fetchedAt: stamp,
    version: "2011",
  },
  zones: (polygons.length ? polygons : [polygon]).map((shape, i) => ({
    id: `zone-${i}`,
    officialCode: String(i + 1),
    name: `Zona ${i}`,
    department: "Montevideo",
    geometry: shape,
  })),
});
const point = (
  id = "node/1",
  coordinates: [number, number] = [-56.19, -34.89],
  patch: Partial<ServicePoint> = {},
): ServicePoint => ({
  id,
  category: "supermarket",
  name: "Public service",
  location: { type: "Point", coordinates },
  pointKind: "node",
  ...patch,
});
const meta = (
  points: ServicePoint[],
  patch: Partial<ServiceMeta> = {},
): ServiceMeta => ({
  version: 1,
  snapshotId: "qa-snapshot",
  fetchedAt: stamp,
  dataAsOf: "2026-09-07",
  sourceUrl:
    "https://download.geofabrik.de/south-america/uruguay-latest.osm.pbf",
  sourceSha256: "a".repeat(64),
  total: points.length,
  counts: Object.fromEntries(
    SERVICE_CATEGORIES.map((category) => [
      category,
      points.filter((point) => point.category === category).length,
    ]),
  ) as ServiceMeta["counts"],
  diagnostics: {
    nodes: points.length,
    ways: 0,
    missingWays: 0,
    ignoredRelations: 0,
  },
  ...patch,
});
const context = (points: ServicePoint[], shapes = geometry()) =>
  buildZoneServiceContext(shapes, meta(points), points);

describe("official polygon membership", () => {
  it("uses longitude-latitude geometry rather than a radius from the neighborhood center", () => {
    expect(zoneContainsPoint(polygon, [-56.19, -34.89])).toBe(true);
    expect(zoneContainsPoint(polygon, [-56.21, -34.89])).toBe(false);
    expect(zoneContainsPoint(polygon, [-34.89, -56.19])).toBe(false);
    expect(zoneContainsPoint(polygon, [NaN, -34.89])).toBe(false);
    expect(zoneContainsPoint(polygon, [-56.19])).toBe(false);
    const long: PropertyZoneGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [-56.3, -34.91],
          [-56.0, -34.91],
          [-56.0, -34.9],
          [-56.3, -34.9],
          [-56.3, -34.91],
        ],
      ],
    };
    expect(zoneContainsPoint(long, [-56.29, -34.905])).toBe(true);
    expect(zoneContainsPoint(long, [-56.15, -34.89])).toBe(false);
  });

  it("excludes holes and preserves separate components of a multipolygon", () => {
    const holed: PropertyZoneGeometry = {
      type: "Polygon",
      coordinates: [ring(), ring(-56.185, -34.885, 0.01)],
    };
    expect(zoneContainsPoint(holed, [-56.18, -34.88])).toBe(false);
    expect(zoneContainsPoint(holed, [-56.195, -34.895])).toBe(true);
    const multi: PropertyZoneGeometry = {
      type: "MultiPolygon",
      coordinates: [holed.coordinates, [ring(-56.1, -34.8)]],
    };
    expect(zoneContainsPoint(multi, [-56.09, -34.79])).toBe(true);
    expect(zoneContainsPoint(multi, [-56.18, -34.88])).toBe(false);
    expect(zoneContainsPoint(multi, [-56.13, -34.83])).toBe(false);
  });
});

describe("public OSM context snapshot", () => {
  it("counts each native record once and retains distinct services sharing a coordinate", () => {
    const rows = [
      point(),
      point(),
      point("node/2", undefined, { category: "pharmacy" }),
      point("way/3", undefined, {
        pointKind: "area_center",
        category: "education",
      }),
    ];
    const result = context(rows);
    expect(result.countsByOfficialCode["1"]).toEqual({
      supermarket: 1,
      pharmacy: 1,
      education: 1,
      grocery: 0,
      healthcare: 0,
      transit: 0,
    });
    expect(result).toMatchObject({
      dataAsOf: "2026-09-07",
      fetchedAt: stamp,
      snapshotId: "qa-snapshot",
    });
    expect(result).not.toHaveProperty("distanceKm");
    expect(JSON.stringify(result)).not.toContain("Public service");
    expect(JSON.stringify(result)).not.toContain("coordinates");
  });

  it("does not duplicate counts in overlapping zones or put hole/outside records into a center-based approximation", () => {
    expect(
      context([point()], geometry(polygon, polygon)).countsByOfficialCode,
    ).toEqual({
      "1": Object.fromEntries(
        SERVICE_CATEGORIES.map((category) => [category, 0]),
      ),
      "2": Object.fromEntries(
        SERVICE_CATEGORIES.map((category) => [category, 0]),
      ),
    });
    const holed: PropertyZoneGeometry = {
      type: "Polygon",
      coordinates: [ring(), ring(-56.195, -34.895, 0.01)],
    };
    const result = context(
      [point(), point("node/2", [-56.22, -34.9])],
      geometry(holed),
    );
    expect(result.countsByOfficialCode["1"].supermarket).toBe(0);
  });

  it.each([
    { total: 2 },
    { version: 0 },
    { dataAsOf: "invalid" },
    { fetchedAt: "invalid" },
    { snapshotId: "" },
  ])("refuses missing or inconsistent snapshot metadata: %j", (patch) => {
    const rows = [point()];
    expect(() =>
      buildZoneServiceContext(geometry(), meta(rows, patch as any), rows),
    ).toThrow("Incomplete services snapshot for zones");
  });

  it("does not mistake malformed records or unsafe IDs for services", () => {
    const rows = [
      point(""),
      point("constructor"),
      point("__proto__"),
      point("node/3", [NaN, -34.89]),
      point("node/4", undefined, {
        location: { type: "Point", coordinates: null } as any,
      }),
      point("node/5", undefined, { category: "constructor" as any }),
      point("node/6", [-50, -10]),
    ];
    const result = context(rows);
    expect(result.countsByOfficialCode["1"].supermarket).toBe(0);
  });

  it("does not modify input arrays or metadata while calculating counts", () => {
    const rows = [point(), point("node/2", undefined, { category: "transit" })],
      data = meta(rows),
      shapes = geometry();
    const before = JSON.stringify({ rows, data, shapes });
    buildZoneServiceContext(shapes, data, rows);
    expect(JSON.stringify({ rows, data, shapes })).toBe(before);
  });
});
