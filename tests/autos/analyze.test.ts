import { describe, expect, it } from "vitest";
import { buildTrimIndex } from "../../classes/autos/catalog/trims";
import {
  CAR_OPPORTUNITY_POLICY, analyzeCars, comparablesFor, detailVerdict, exclusionReason, sampleFor,
} from "../../classes/autos/analyze";
import type { CarDetail, CarListing } from "../../classes/autos/types";

const NOW = new Date("2026-09-16T12:00:00.000Z");
let serial = 0;

function car(overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  const id = overrides.id ?? `MLU${700000000 + serial}`;
  const price = overrides.price ?? 12_000;
  return {
    id, source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix",
    title: "Chevrolet Onix 1.4 Lt Mt 98cv", year: 2019, km: 90_000, price, currency: "USD", transmission: "manual",
    fuel: "nafta", neighborhood: null, department: "Montevideo", sellerType: "private", sellerId: `seller-${serial}`,
    picture: null, pictureCount: 10, permalink: `https://auto.mercadolibre.com.uy/MLU-${id.slice(3)}-x-_JM`,
    observedAt: NOW.toISOString(), key: `ml-${id}`, brandSlug: "chevrolet", modelSlug: "onix", marketSlug: "chevrolet-onix",
    engine: "1.4", trim: "lt", trimLabel: "Lt", kmQuality: "ok", flags: [], priceUsd: overrides.priceUsd ?? price,
    priceConverted: false, firstSeen: NOW.toISOString(), lastSeen: NOW.toISOString(), priceDrop: null, detail: null,
    sourceName: "Mercado Libre", reference: null,
    ...overrides,
  };
}

function detailFor(subject: CarListing, overrides: Partial<CarDetail> = {}): CarDetail {
  return {
    readAt: NOW.toISOString(), price: subject.price, currency: subject.currency, active: true, brand: "Chevrolet",
    model: "Onix", year: subject.year, km: subject.km, version: "1.4 Lt 98cv", engineText: "1.4", sellerName: null,
    bodyType: "Hatchback", color: "Gris", doors: 5, flags: [], description: "Impecable", ...overrides,
  };
}

const trimIndexes = new Map([["58955|123123", buildTrimIndex(["Lt", "Ltz", "Joy"], ["Lt", "Ltz", "Joy"])]]);
const market = (count = 10) => Array.from({ length: count }, (_, i) => car({ price: 12_000 + i * 100, km: 85_000 + i * 1_000 }));

describe("exclusionReason", () => {
  it("names why an advert cannot be analysed", () => {
    expect(exclusionReason(car(), NOW)).toBeNull();
    expect(exclusionReason(car({ lastSeen: "2026-09-13T00:00:00.000Z" }), NOW)).toBe("stale");
    expect(exclusionReason(car({ lastSeen: "not-a-date" }), NOW)).toBe("stale");
    expect(exclusionReason(car({ priceConverted: true }), NOW)).toBe("not_usd");
    expect(exclusionReason(car({ currencyInferred: true }), NOW)).toBe("currency_inferred");
    expect(exclusionReason(car({ kmQuality: "placeholder" }), NOW)).toBe("km_placeholder");
    expect(exclusionReason(car({ flags: ["damaged"] }), NOW)).toBe("flag_damaged");
    expect(exclusionReason(car({ trim: null }), NOW)).toBe("no_trim");
    expect(exclusionReason(car({ engine: null }), NOW)).toBe("no_engine");
    expect(exclusionReason(car({ transmission: null }), NOW)).toBe("no_transmission");
    expect(exclusionReason(car({ priceUsd: 500 }), NOW)).toBe("implausible_price");
  });
});

describe("comparablesFor", () => {
  it("keeps km-close peers, at most two per seller, nearest km first", () => {
    const subject = car({ km: 90_000 });
    // Spaced 1,000 km apart (not just 1 km) so these four are genuinely distinct stock, not
    // mutual reposts under possibleCopy's 1% km/price tolerance — the seller-cap test below covers
    // the repost-collapse behaviour on its own.
    const shared = Array.from({ length: 4 }, (_, i) => car({ sellerId: "dealer-1", km: 90_000 + i * 1_000 }));
    const far = car({ km: 200_000 });
    const picked = comparablesFor(subject, [subject, ...shared, far, ...market(3)]);
    expect(picked.filter(peer => peer.sellerId === "dealer-1")).toHaveLength(2);
    expect(picked).not.toContain(far);
    expect(picked).not.toContain(subject);
  });
  it("drops a re-post of the same car by the same seller", () => {
    const subject = car({ sellerId: "s", km: 90_000, price: 9_000 });
    const copy = car({ sellerId: "s", km: 90_100, price: 9_050 });
    expect(comparablesFor(subject, [copy])).toEqual([]);
  });
  it("collapses reposts among the candidates themselves, keeping the lowest key", () => {
    const subject = car({ km: 90_000 });
    const posts = ["a", "b", "c", "d"].flatMap(sellerId => [
      car({ sellerId, km: 90_000, price: 12_000 }),
      car({ sellerId, km: 90_000, price: 12_000 }),
    ]);
    const picked = comparablesFor(subject, posts);
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map(peer => peer.sellerId))).toEqual(new Set(["a", "b", "c", "d"]));
  });
  it("excludes peers with no seller id from the sample entirely", () => {
    const subject = car({ km: 90_000 });
    const anonymous = Array.from({ length: 3 }, () => car({ sellerId: null, km: 90_000 }));
    expect(comparablesFor(subject, anonymous)).toEqual([]);
  });
});

describe("analyzeCars", () => {
  it("publishes a verified strict opportunity", () => {
    const subject = car({ price: 9_500, km: 88_000 });
    const result = analyzeCars([...market(10), subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({ tier: "strict", subject: { key: subject.key } });
    expect(result.accepted[0]!.sample.n).toBe(10);
    expect(result.accepted[0]!.sample.gap).toBeGreaterThan(0.2);
    expect(result.stats).toMatchObject({ candidates: 1, verified: 1, strict: 1, exploratory: 0 });
  });

  it("asks for the advert page before publishing", () => {
    const subject = car({ price: 9_500, km: 88_000 });
    const result = analyzeCars([...market(10), subject], { now: NOW, details: new Map(), trimIndexes });
    expect(result.accepted).toEqual([]);
    expect(result.needsDetail).toEqual([subject.key]);
    expect(result.stats.rejectedByDetail).toEqual({ detail_missing: 1 });
  });

  it("never compares across versions, engines or years", () => {
    const peers = [
      ...market(4),
      ...Array.from({ length: 6 }, () => car({ trim: "ltz", trimLabel: "Ltz" })),
      ...Array.from({ length: 6 }, () => car({ engine: "1.0T" })),
      ...Array.from({ length: 6 }, () => car({ year: 2020 })),
    ];
    const subject = car({ price: 9_500 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toEqual([]);
  });

  it("does not call a car cheap when it simply has more km than the sample", () => {
    const peers = Array.from({ length: 10 }, (_, i) => car({ price: 12_000 + i * 100, km: 60_000 + i * 1_000 }));
    const subject = car({ price: 9_500, km: 78_000 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toEqual([]);
  });

  it("requires independent sellers", () => {
    const peers = Array.from({ length: 10 }, (_, i) => car({ sellerId: `dealer-${i % 2}`, price: 12_000 + i * 100 }));
    const subject = car({ price: 9_500 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toEqual([]);
  });

  it("holds a too-good-to-be-true gap for review", () => {
    const subject = car({ price: 5_000 });
    const result = analyzeCars([...market(10), subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toEqual([]);
    expect(result.stats.review).toBe(1);
  });

  it("does not let seller re-posts inflate a cohort into a false opportunity", () => {
    const sellers = ["a", "b", "c", "d"];
    const peers = sellers.flatMap(sellerId => [
      car({ sellerId, km: 90_000, price: 12_000 }),
      car({ sellerId, km: 90_000, price: 12_000 }),
    ]);
    const subject = car({ price: 9_500 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    // 8 posts from only 4 real sellers de-duplicate to 4 comparables — below the exploratory floor.
    expect(result.accepted).toEqual([]);
  });

  it("never lets a seller with no id into the sample", () => {
    const peers = Array.from({ length: 8 }, () => car({ sellerId: null, km: 90_000, price: 12_000 }));
    const subject = car({ price: 9_500 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toEqual([]);
  });

  it("accepts an exploratory tier when the sample is smaller but still solid", () => {
    const sellers = ["e1", "e2", "e3"];
    const peers = sellers.flatMap((sellerId, i) => [
      car({ sellerId, price: 10_000, km: 90_000 + i * 1_000 }),
      car({ sellerId, price: 10_000, km: 90_000 + i * 1_000 + 3_000 }),
    ]);
    const subject = car({ price: 8_700 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]!.tier).toBe("exploratory");
  });

  it("rejects a cohort whose prices are too spread to compare", () => {
    const prices = [8_000, 8_200, 8_400, 8_600, 13_000, 13_200, 13_400, 13_600];
    const peers = prices.map(price => car({ price }));
    const subject = car({ price: 7_000 });
    const result = analyzeCars([...peers, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toEqual([]);
  });

  it("downgrades to exploratory (not strict) when the gap depends on one seller", () => {
    const cheap = Array.from({ length: 4 }, () => car({ price: 10_000 }));
    const midHigh = Array.from({ length: 2 }, () => car({ price: 13_000 }));
    const big = [
      car({ sellerId: "big", price: 13_000, km: 90_000 }),
      car({ sellerId: "big", price: 13_000, km: 91_500 }),
    ];
    const subject = car({ price: 9_150 });
    const result = analyzeCars([...cheap, ...midHigh, ...big, subject], { now: NOW, details: new Map([[subject.key, detailFor(subject)]]), trimIndexes });
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]!.tier).toBe("exploratory");
  });

  it("only refetches recoverable detail failures, never a final verdict", () => {
    const inactiveSubject = car({ price: 9_500, km: 88_000 });
    const inactive = analyzeCars([...market(10), inactiveSubject], {
      now: NOW, details: new Map([[inactiveSubject.key, detailFor(inactiveSubject, { active: false })]]), trimIndexes,
    });
    expect(inactive.needsDetail).toEqual([]);
    expect(inactive.stats.rejectedByDetail).toEqual({ detail_inactive: 1 });

    const mismatchedSubject = car({ price: 9_500, km: 88_000 });
    const mismatched = analyzeCars([...market(10), mismatchedSubject], {
      now: NOW, details: new Map([[mismatchedSubject.key, detailFor(mismatchedSubject, { year: 2018 })]]), trimIndexes,
    });
    expect(mismatched.needsDetail).toEqual([]);
    expect(mismatched.stats.rejectedByDetail).toEqual({ detail_mismatch: 1 });
  });

  it("is deterministic regardless of input order", () => {
    const peers = market(12);
    const a = car({ price: 9_400 });
    const b = car({ price: 9_600 });
    const details = new Map([[a.key, detailFor(a)], [b.key, detailFor(b)]]);
    const one = analyzeCars([...peers, a, b], { now: NOW, details, trimIndexes });
    const two = analyzeCars([b, ...[...peers].reverse(), a], { now: NOW, details, trimIndexes });
    expect(two.accepted.map(item => item.subject.key)).toEqual(one.accepted.map(item => item.subject.key));
  });
});

describe("sampleFor", () => {
  it("reports the smallest gap left after removing any one seller", () => {
    const subject = car({ price: 9_000 });
    const cheap = Array.from({ length: 4 }, () => car({ price: 10_000 }));
    const bigDealer = Array.from({ length: 4 }, () => car({ sellerId: "big", price: 14_000 }));
    const sample = sampleFor(subject, [...cheap, ...bigDealer]);
    expect(sample.gap).toBeCloseTo(0.25, 3);
    expect(sample.sellerSensitivityGap).toBeCloseTo(0.1, 3);
  });
});

describe("detailVerdict", () => {
  const trims = buildTrimIndex(["Lt", "Ltz", "Joy"]);
  it("accepts a matching page", () => {
    const subject = car();
    expect(detailVerdict(subject, detailFor(subject), NOW, trims)).toBeNull();
  });
  it("rejects stale, changed, inactive, mismatched and flagged pages", () => {
    const subject = car();
    expect(detailVerdict(subject, detailFor(subject, { readAt: "2026-09-12T00:00:00.000Z" }), NOW, trims)).toBe("detail_stale");
    expect(detailVerdict(subject, detailFor(subject, { price: 11_000 }), NOW, trims)).toBe("detail_price_changed");
    expect(detailVerdict(subject, detailFor(subject, { active: false }), NOW, trims)).toBe("detail_inactive");
    expect(detailVerdict(subject, detailFor(subject, { year: 2018 }), NOW, trims)).toBe("detail_mismatch");
    expect(detailVerdict(subject, detailFor(subject, { km: 95_000 }), NOW, trims)).toBe("detail_mismatch");
    expect(detailVerdict(subject, detailFor(subject, { version: "1.4 Ltz 98cv" }), NOW, trims)).toBe("detail_trim_mismatch");
    expect(detailVerdict(subject, detailFor(subject, { version: "1.0 Lt" }), NOW, trims)).toBe("detail_engine_mismatch");
    expect(detailVerdict(subject, detailFor(subject, { flags: ["damaged"] }), NOW, trims)).toBe("detail_flag_damaged");
  });
  it("does not reject a version text that names no known trim", () => {
    const subject = car();
    expect(detailVerdict(subject, detailFor(subject, { version: "1.4 Mt" }), NOW, trims)).toBeNull();
  });
  it("treats an ended advert as inactive even when its price also changed", () => {
    const subject = car();
    expect(detailVerdict(subject, detailFor(subject, { active: false, price: 11_000 }), NOW, trims)).toBe("detail_inactive");
  });
  it("treats an unparseable read time as stale", () => {
    const subject = car();
    expect(detailVerdict(subject, detailFor(subject, { readAt: "not-a-date" }), NOW, trims)).toBe("detail_stale");
  });
  it("uses the documented policy numbers", () => {
    expect(CAR_OPPORTUNITY_POLICY.strict).toMatchObject({ minimumComparables: 8, minimumSellers: 4, maximumSpread: 0.3, minimumGap: 0.15 });
    expect(CAR_OPPORTUNITY_POLICY.maximumGap).toBe(0.45);
  });
});
