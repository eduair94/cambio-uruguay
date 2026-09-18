import { describe, expect, it } from "vitest";
import {
  PHONE_STORE_SNAPSHOT_KEY,
  PHONE_STORE_SNAPSHOT_MAX_AGE_MS,
  PHONE_STORE_SNAPSHOT_MAX_BYTES,
  mergePhoneStoreSnapshot,
  phoneStoreSnapshotBytes,
  phoneStoreSnapshotRows,
} from "../../classes/phones/storeSnapshot";
import { PhoneStoreSnapshotModel } from "../../classes/models/PhoneStoreSnapshot";
import type { RetailListing } from "../../classes/retail/types";

const NOW = Date.parse("2026-09-17T12:00:00.000Z");
const hoursAgo = (hours: number): string => new Date(NOW - hours * 3_600_000).toISOString();

const row = (listingId: string, over: Partial<RetailListing> = {}): RetailListing => ({
  listingId,
  source: "store",
  sellerKey: "claro",
  sellerName: "Tienda Claro",
  channel: "local-store",
  title: `iPhone 17 ${listingId}`,
  url: `https://x/${listingId}`,
  price: 900,
  currency: "USD",
  condition: "new",
  available: true,
  image: null,
  brand: "",
  model: "",
  catalogId: null,
  attributes: { CATEGORY_SPEC: "celulares" },
  rating: null,
  ratingCount: 0,
  location: null,
  freeShipping: null,
  officialStore: true,
  observedAt: hoursAgo(1),
  ...over,
});

// The hourly run skips every Fenicio store (7 of 9 phone stores) and searches 8 ML terms instead of
// 40, and `savePhoneCatalog` replaces each model whole — so without this every hourly run published
// a thinner catalogue than the daily one had just built, and the bands swung 23 times a day.
describe("foto de avisos de tienda para la corrida horaria de celulares", () => {
  it("lo fresco gana: un aviso que la horaria volvió a leer reemplaza al de la foto", () => {
    const fresh = [row("store:covercompany:1", { price: 850, sellerKey: "covercompany", observedAt: hoursAgo(0) })];
    const snapshot = [
      row("store:covercompany:1", { price: 900, sellerKey: "covercompany", observedAt: hoursAgo(20) }),
      row("store:claro:9"),
    ];
    const merged = mergePhoneStoreSnapshot(fresh, snapshot, NOW);
    expect(merged.listings.find((l) => l.listingId === "store:covercompany:1")!.price).toBe(850);
    expect(merged.listings.map((l) => l.listingId).sort()).toEqual(["store:claro:9", "store:covercompany:1"]);
    expect(merged.fromSnapshot).toBe(1);
  });

  it("un aviso de la foto con más de 36 horas no entra", () => {
    const snapshot = [row("viejo", { observedAt: hoursAgo(37) }), row("justo", { observedAt: hoursAgo(35) })];
    const merged = mergePhoneStoreSnapshot([], snapshot, NOW);
    expect(merged.listings.map((l) => l.listingId)).toEqual(["justo"]);
    expect(merged.stale).toBe(1);
    expect(PHONE_STORE_SNAPSHOT_MAX_AGE_MS).toBe(36 * 3_600_000);
  });

  it("MercadoLibre y Marketplace nunca salen de la foto", () => {
    const snapshot = [row("ml:1", { source: "mercadolibre" }), row("fb:1", { source: "facebook" }), row("store:x:1")];
    const merged = mergePhoneStoreSnapshot([], snapshot, NOW);
    expect(merged.listings.map((l) => l.listingId)).toEqual(["store:x:1"]);
    expect(merged.ignored).toBe(2);
  });

  it("sin foto, la horaria queda como estaba", () => {
    const fresh = [row("ml:1", { source: "mercadolibre" }), row("store:claro:1")];
    expect(mergePhoneStoreSnapshot(fresh, null, NOW).listings).toEqual(fresh);
  });

  it("mide el tamaño y el tope queda lejos de los 16 MB de un documento", () => {
    const listings = [row("a"), row("b")];
    expect(phoneStoreSnapshotBytes(listings)).toBe(Buffer.byteLength(JSON.stringify(listings)));
    expect(PHONE_STORE_SNAPSHOT_MAX_BYTES).toBeLessThanOrEqual(12 * 1024 * 1024);
  });

  // Fenicio guarda la descripción entera de cada producto en attributes.DESCRIPTION. Celulares nunca
  // la lee (sólo CATEGORY_SPEC), y era el grueso del documento que tiene que quedar bajo 12 MB.
  it("guarda los avisos sin attributes.DESCRIPTION y sin tocar el resto ni el aviso original", () => {
    const original = row("store:claro:1", {
      attributes: { CATEGORY_SPEC: "celulares", PRODUCT_TYPE: "Celulares", DESCRIPTION: "x".repeat(5000) },
    });
    const [stored] = phoneStoreSnapshotRows([original]);
    expect(stored!.attributes).toEqual({ CATEGORY_SPEC: "celulares", PRODUCT_TYPE: "Celulares" });
    expect({ ...stored, attributes: undefined }).toEqual({ ...original, attributes: undefined });
    expect(original.attributes.DESCRIPTION).toHaveLength(5000);
    expect(phoneStoreSnapshotBytes([stored!])).toBeLessThan(phoneStoreSnapshotBytes([original]) - 4000);
  });

  it("vive en un único documento de la base de la app, colección phonestoresnapshots", () => {
    expect(PHONE_STORE_SNAPSHOT_KEY).toBe("celulares-uruguay");
    expect(PhoneStoreSnapshotModel.collection.name).toBe("phonestoresnapshots");
    expect(Object.keys(PhoneStoreSnapshotModel.schema.obj).sort()).toEqual(["generatedAt", "key", "listings"]);
  });
});
