import { SERVICE_CATEGORIES, ServiceCategory, ServiceSnapshot } from "./types";

export function serviceCategory(tags: Record<string, string> = {}): ServiceCategory | null {
  if (["disused", "abandoned", "demolished", "razed", "construction", "proposed"].some(key =>
    tags[key] && tags[key] !== "no")) return null;
  if (tags.shop === "supermarket") return "supermarket";
  if (["convenience", "grocery", "general", "food"].includes(tags.shop)) return "grocery";
  if (tags.amenity === "pharmacy" || tags.healthcare === "pharmacy") return "pharmacy";
  if (["hospital", "clinic", "doctors"].includes(tags.amenity) ||
      ["hospital", "clinic", "doctor"].includes(tags.healthcare)) return "healthcare";
  if (tags.highway === "bus_stop" || tags.amenity === "bus_station" ||
      tags.railway === "station" || tags.railway === "tram_stop" ||
      (tags.public_transport === "platform" && [tags.bus, tags.tram, tags.train, tags.trolleybus].includes("yes")))
    return "transit";
  if (["school", "kindergarten", "college", "university"].includes(tags.amenity)) return "education";
  return null;
}
export function serviceName(tags: Record<string, string> = {}): string | null {
  const value = tags.name || tags["name:es"] || tags.brand;
  return typeof value === "string" ? value.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || null : null;
}
export function validServicePoint(lat: unknown, lng: unknown): boolean {
  return typeof lat === "number" && Number.isFinite(lat) && lat >= -35.5 && lat <= -30 &&
    typeof lng === "number" && Number.isFinite(lng) && lng >= -58.6 && lng <= -53;
}
export function serviceSnapshotProblem(snapshot: ServiceSnapshot, previous?: {total: number; counts: Partial<Record<ServiceCategory, number>>; dataAsOf: string} | null, now = Date.now()): string | null {
  const at = Date.parse(snapshot.dataAsOf);
  if (!Number.isFinite(at) || at > now + 86_400_000 || at < now - 30 * 86_400_000) return "invalid_source_date";
  if (snapshot.points.length < 500 || snapshot.points.length > 100_000) return "invalid_size";
  if (new Set(snapshot.points.map(point => point.id)).size !== snapshot.points.length) return "duplicate_ids";
  if (snapshot.points.some(point => !validServicePoint(point.location?.coordinates?.[1], point.location?.coordinates?.[0]) || !SERVICE_CATEGORIES.includes(point.category))) return "invalid_points";
  for (const category of SERVICE_CATEGORIES) {
    const count = snapshot.points.filter(point => point.category === category).length;
    if (count !== snapshot.counts[category] || count < 3) return "invalid_category";
    if (previous?.counts[category] && count < previous.counts[category]! * 0.5) return "thin_category";
  }
  if (previous && snapshot.points.length < previous.total * 0.7) return "thin_snapshot";
  if (previous && at < Date.parse(previous.dataAsOf)) return "older_source";
  if (snapshot.diagnostics.missingWays > Math.max(5, snapshot.diagnostics.ways * 0.02)) return "missing_geometry";
  return null;
}
