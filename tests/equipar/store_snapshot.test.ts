import { describe, expect, it } from "vitest";
import {
  EQUIPAR_STORE_SNAPSHOT_KEY,
  STORE_SNAPSHOT_MAX_AGE_MS,
  STORE_SNAPSHOT_MAX_BYTES,
  mergeStoreSnapshot,
  storeSnapshotBytes,
  storeSnapshotRows,
} from "../../classes/equipar/storeSnapshot";
import { EquiparStoreSnapshotModel } from "../../classes/models/EquiparStoreSnapshot";
import type { RetailListing } from "../../classes/retail/types";

const NOW = Date.parse("2026-09-17T12:00:00.000Z");
const hoursAgo = (hours: number): string => new Date(NOW - hours * 3_600_000).toISOString();

const row = (listingId: string, over: Partial<RetailListing> = {}): RetailListing => ({
  listingId,
  source: "store",
  sellerKey: "bertoni",
  sellerName: "Bertoni",
  channel: "local-store",
  title: `Heladera ${listingId}`,
  url: `https://x/${listingId}`,
  price: 20000,
  currency: "UYU",
  condition: "new",
  available: true,
  image: null,
  brand: "",
  model: "",
  catalogId: null,
  attributes: { CATEGORY_SPEC: "heladera" },
  rating: null,
  ratingCount: 0,
  location: null,
  freeShipping: null,
  officialStore: true,
  observedAt: hoursAgo(1),
  ...over,
});

// The hourly run skips every Fenicio store and searches 24 terms instead of 80, and
// `saveEquiparCatalog` replaces each item whole — so without this every hourly run published a
// thinner catalogue than the daily one had just built, and the bands swung 23 times a day.
describe("foto de avisos de tienda para la corrida horaria", () => {
  it("lo fresco gana: un aviso que la horaria volvió a leer reemplaza al de la foto", () => {
    const fresh = [row("store:tyt:1", { price: 199, sellerKey: "tyt", observedAt: hoursAgo(0) })];
    const snapshot = [row("store:tyt:1", { price: 250, sellerKey: "tyt", observedAt: hoursAgo(20) }), row("store:bertoni:9")];
    const merged = mergeStoreSnapshot(fresh, snapshot, NOW);
    expect(merged.listings.find((l) => l.listingId === "store:tyt:1")!.price).toBe(199);
    expect(merged.listings.map((l) => l.listingId).sort()).toEqual(["store:bertoni:9", "store:tyt:1"]);
    expect(merged.fromSnapshot).toBe(1);
  });

  it("un aviso de la foto con más de 36 horas no entra", () => {
    const snapshot = [row("viejo", { observedAt: hoursAgo(37) }), row("justo", { observedAt: hoursAgo(35) })];
    const merged = mergeStoreSnapshot([], snapshot, NOW);
    expect(merged.listings.map((l) => l.listingId)).toEqual(["justo"]);
    expect(merged.stale).toBe(1);
    expect(STORE_SNAPSHOT_MAX_AGE_MS).toBe(36 * 3_600_000);
  });

  it("MercadoLibre y Marketplace nunca salen de la foto", () => {
    const snapshot = [row("ml:1", { source: "mercadolibre" }), row("fb:1", { source: "facebook" }), row("store:x:1")];
    const merged = mergeStoreSnapshot([], snapshot, NOW);
    expect(merged.listings.map((l) => l.listingId)).toEqual(["store:x:1"]);
    expect(merged.ignored).toBe(2);
  });

  it("sin foto, la horaria queda como estaba", () => {
    const fresh = [row("ml:1", { source: "mercadolibre" }), row("store:tyt:1")];
    expect(mergeStoreSnapshot(fresh, null, NOW).listings).toEqual(fresh);
  });

  it("mide el tamaño y el tope queda lejos de los 16 MB de un documento", () => {
    const listings = [row("a"), row("b")];
    expect(storeSnapshotBytes(listings)).toBe(Buffer.byteLength(JSON.stringify(listings)));
    expect(STORE_SNAPSHOT_MAX_BYTES).toBeLessThanOrEqual(12 * 1024 * 1024);
  });

  // Fenicio guarda la descripción entera de cada producto en attributes.DESCRIPTION. Equipar nunca la
  // lee (sólo CATEGORY_SPEC), y era el grueso del documento que tiene que quedar bajo 12 MB.
  it("guarda los avisos sin attributes.DESCRIPTION y sin tocar el resto ni el aviso original", () => {
    const original = row("store:fenicio:1", {
      attributes: { CATEGORY_SPEC: "heladera", PRODUCT_TYPE: "Heladeras", DESCRIPTION: "x".repeat(5000) },
    });
    const [stored] = storeSnapshotRows([original]);
    expect(stored!.attributes).toEqual({ CATEGORY_SPEC: "heladera", PRODUCT_TYPE: "Heladeras" });
    expect({ ...stored, attributes: undefined }).toEqual({ ...original, attributes: undefined });
    expect(original.attributes.DESCRIPTION).toHaveLength(5000);
    expect(storeSnapshotBytes([stored!])).toBeLessThan(storeSnapshotBytes([original]) - 4000);
  });

  it("vive en un único documento de la base de la app, colección equiparstoresnapshots", () => {
    expect(EQUIPAR_STORE_SNAPSHOT_KEY).toBe("equipar-store-listings");
    expect(EquiparStoreSnapshotModel.collection.name).toBe("equiparstoresnapshots");
    expect(Object.keys(EquiparStoreSnapshotModel.schema.obj).sort()).toEqual(["generatedAt", "key", "listings"]);
  });
});
