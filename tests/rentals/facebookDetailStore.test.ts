import { describe, expect, it } from "vitest";
import type { RentalFacebookDetailDocument } from "../../classes/models/RentalFacebookDetail";
import {
  facebookDetailUpdate,
  pointContradictsBarrio,
  prioritizeDetailTargets,
  type DetailTarget,
  type StoredFacebookRow,
} from "../../classes/rentals/facebookDetailStore";

const target = (listingId: string, over: Partial<DetailTarget> = {}): DetailTarget => ({
  listingId, id: listingId.replace("facebook:", ""), key: `k-${listingId}`, title: "Alquiler", department: "Montevideo", neighborhood: "", hasCoordinate: false, lastSeen: "2026-09-20", ...over,
});

describe("prioritizeDetailTargets", () => {
  it("reads Montevideo without a barrio first, freshest first, never what was already read", () => {
    const rows = [
      target("facebook:1", { department: "Maldonado" }),
      target("facebook:2", { neighborhood: "Pocitos" }),
      target("facebook:3", { lastSeen: "2026-09-21" }),
      target("facebook:4"),
      target("facebook:5", { department: "Salto", neighborhood: "Centro", hasCoordinate: true }),
    ];
    expect(prioritizeDetailTargets(rows, new Set(["facebook:3"]), 3).map(row => row.listingId)).toEqual(["facebook:4", "facebook:2", "facebook:1"]);
    expect(prioritizeDetailTargets(rows, new Set(), 10).map(row => row.listingId)).toEqual(["facebook:3", "facebook:4", "facebook:2", "facebook:1", "facebook:5"]);
    expect(prioritizeDetailTargets(rows, new Set(), 0)).toEqual([]);
  });
});

const detail = (over: Partial<RentalFacebookDetailDocument> = {}): RentalFacebookDetailDocument => ({
  listingId: "facebook:1", id: "1", readAt: "2026-09-22T06:00:00.000Z", found: true, title: "t", description: "Zona Piedras Blancas, a media cuadra de José Belloni",
  pinCity: "Montevideo", pinPostal: "11800", pinLat: -34.88, pinLng: -56.17, isLive: true, neighborhood: "Piedras Blancas", department: "Montevideo",
  latitude: -34.8412, longitude: -56.1421, candidates: [], geocodeQuery: null, geocodeAddress: null, geocodeTried: 0, note: null, ...over,
});
const row = (over: Partial<StoredFacebookRow> = {}, offer: Partial<NonNullable<StoredFacebookRow["offers"]>[number]> = {}): StoredFacebookRow => ({
  key: "k", department: "Montevideo", neighborhood: "", latitude: null, longitude: null,
  offers: [{ source: "facebook", listingId: "facebook:1", image: "https://scontent.example/x.jpg", identity: { version: 1, description: "", neighborhood: "", department: "Montevideo", latitude: null, longitude: null }, ...offer }],
  ...over,
});

describe("facebookDetailUpdate", () => {
  it("fills only what the property lacked: description, barrio, coordinate", () => {
    const set = facebookDetailUpdate(row(), detail())!;
    expect(set.neighborhood).toBe("Piedras Blancas");
    expect(set["offers.0.identity.neighborhood"]).toBe("Piedras Blancas");
    expect(set.latitude).toBe(-34.8412);
    expect(set["offers.0.identity.longitude"]).toBe(-56.1421);
    expect(set["offers.0.identity.description"]).toContain("Piedras Blancas");
    expect((set["offers.0.details"] as { description: string; images: string[] })).toMatchObject({ description: expect.stringContaining("Belloni"), images: ["https://scontent.example/x.jpg"] });
    expect(set).not.toHaveProperty("department");
    expect(set).not.toHaveProperty("lastSeen");
  });

  it("never overwrites a value the harvest already established", () => {
    const set = facebookDetailUpdate(row({ neighborhood: "Cerrito", latitude: -34.86, longitude: -56.17 }, { details: { description: "ya" }, identity: { version: 1, description: "ya", neighborhood: "Cerrito", department: "Montevideo", latitude: -34.86, longitude: -56.17 } }), detail());
    expect(set).toBeNull();
  });

  it("fills a missing department from the detail, and nothing from a page that was not found", () => {
    const set = facebookDetailUpdate(row({ department: "" }, { identity: { version: 1, department: "", neighborhood: "" } }), detail({ department: "Montevideo", description: "", neighborhood: "", latitude: null, longitude: null }))!;
    expect(set).toEqual({ department: "Montevideo", "offers.0.identity.department": "Montevideo" });
    expect(facebookDetailUpdate(row(), detail({ found: false, description: "", neighborhood: "", latitude: null, longitude: null }))).toBeNull();
  });

  it("touches neither a merged property, another portal, another advert nor a legacy offer", () => {
    const merged = row({ offers: [row().offers![0]!, { source: "infocasas", listingId: "infocasas:9", identity: { version: 1 } }] });
    expect(facebookDetailUpdate(merged, detail())).toBeNull();
    expect(facebookDetailUpdate(row({}, { source: "infocasas" }), detail())).toBeNull();
    expect(facebookDetailUpdate(row({}, { listingId: "facebook:2" }), detail())).toBeNull();
    expect(facebookDetailUpdate(row({}, { identity: undefined }), detail())).toBeNull();
  });
});

describe("pointContradictsBarrio", () => {
  it("only an INE barrio can contradict, and any part of a composite label agrees", () => {
    expect(pointContradictsBarrio("Cerrito", "Cerrito")).toBe(false);
    expect(pointContradictsBarrio("Villa Dolores", "Parque Batlle, Villa Dolores")).toBe(false);
    expect(pointContradictsBarrio("Piedras Blancas", "La Comercial")).toBe(true);
    expect(pointContradictsBarrio("Goes", "La Figurita")).toBe(false);
    expect(pointContradictsBarrio("Pocitos", null)).toBe(false);
    expect(pointContradictsBarrio("", "Centro")).toBe(false);
  });
});
