import { describe, expect, it } from "vitest";
import { detailTargets, looseMedians, queueSummary } from "../../classes/autos/detailQueue";
import type { CarDetail, StoredCar } from "../../classes/autos/types";

const NOW = new Date("2026-09-18T12:00:00.000Z");

const car = (id: string, price: number, extra: Partial<StoredCar["listing"]> = {}, detail: CarDetail | null = null): StoredCar => ({
  key: `ml-${id}`,
  firstSeen: "2026-09-01T00:00:00.000Z",
  lastSeen: "2026-09-18T00:00:00.000Z",
  priceHistory: [],
  retiredAt: null,
  missedFullSweeps: 0,
  detail,
  listing: {
    id, source: "mercadolibre", brandId: "b1", brand: "Chevrolet", modelId: "m1", model: "Onix",
    title: `Chevrolet Onix ${id}`, year: 2019, km: 60_000, price, currency: "USD", transmission: "manual",
    fuel: "nafta", neighborhood: null, department: null, sellerType: "dealer", sellerId: "s1",
    picture: null, pictureCount: null, permalink: `https://auto.mercadolibre.com.uy/MLU-${id}-onix-_JM`,
    observedAt: "2026-09-18T00:00:00.000Z", ...extra,
  },
});

const detail = (version: string | null): CarDetail => ({
  readAt: "2026-09-17T00:00:00.000Z", price: 12_000, currency: "USD", active: true, brand: "Chevrolet",
  model: "Onix", year: 2019, km: 60_000, version, engineText: null, sellerName: null, bodyType: null,
  color: null, doors: null, flags: [], description: "",
});

const peers = (): StoredCar[] => [
  car("101", 12_000), car("102", 12_500), car("103", 11_800), car("104", 12_200), car("105", 12_100),
];

describe("looseMedians", () => {
  it("needs five adverts of the same model-year to say anything", () => {
    expect(looseMedians(peers().slice(0, 4), 40).size).toBe(0);
    const group = looseMedians(peers(), 40).get("b1|m1|2019");
    expect(group).toMatchObject({ price: 12_100, km: 60_000, n: 5 });
  });
  it("converts a peso price before comparing", () => {
    const uyu = car("106", 480_000, { currency: "UYU" });
    expect(looseMedians([...peers(), uyu], 40).get("b1|m1|2019")!.n).toBe(6);
  });
});

describe("detailTargets", () => {
  it("reads first the advert that asks much less than its model-year", () => {
    const cheap = car("200", 8_000);
    const targets = detailTargets([...peers(), cheap], { now: NOW, usdUyu: 40 });
    expect(targets[0]).toMatchObject({ key: "ml-200", reason: "cheap" });
    expect(queueSummary(targets)).toMatchObject({ cheap: 1 });
  });
  it("does not call an advert cheap when it simply has far more kilometres", () => {
    const worn = car("201", 8_000, { km: 300_000 });
    const targets = detailTargets([...peers(), worn], { now: NOW, usdUyu: 40 });
    expect(targets.find(target => target.key === "ml-201")!.reason).not.toBe("cheap");
  });
  it("puts an advert that blocks its cohort above a complete one", () => {
    const blocking = car("202", 12_000, { transmission: null });
    const complete = car("203", 12_000, {}, detail("LT 1.0"));
    // Media jornada de frescura: la ficha del 17 entra igual a la cola, y aun así va detrás.
    const targets = detailTargets([...peers(), blocking, complete], { now: NOW, usdUyu: 40, refreshDays: 0.5 });
    const order = targets.map(target => target.key);
    expect(order.indexOf("ml-202")).toBeLessThan(order.indexOf("ml-203"));
  });
  it("never re-reads a page it already has unless a refresh was asked for", () => {
    const read = car("204", 12_000, {}, detail("LT 1.0"));
    expect(detailTargets([read], { now: NOW, usdUyu: 40 })).toEqual([]);
    expect(detailTargets([read], { now: NOW, usdUyu: 40, refreshDays: 0.5 })).toHaveLength(1);
  });
  it("only queues pages the reader can actually read", () => {
    const web = car("205", 12_000, { source: "carone", permalink: "https://carone.com.uy/chevrolet-onix-717444" });
    expect(detailTargets([web], { now: NOW, usdUyu: 40 })).toEqual([]);
  });
});
