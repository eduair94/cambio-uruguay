import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildCarDictionary } from "../../classes/autos/catalog/dictionary";
import { mergeFbCards } from "../../classes/autos/facebookRun";
import {
  fbCardToCar, fbCardsFromText, fbDepartment, fbDetailQueue, fbItemFromTexts, resolveFbCurrency,
} from "../../classes/autos/sources/facebook";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const ml = (brandId: string, brand: string, modelId: string, model: string) => ({ source: "mercadolibre" as const, brandId, brand, modelId, model });
const DICT = buildCarDictionary([ml("67781", "Chevrolet", "67800", "Aveo"), ml("60310", "Fiat", "60311", "Uno")], []);
const NOW = new Date("2026-09-17T12:00:00Z");
const CONTEXT = { observedAt: NOW.toISOString(), maxYear: 2027, dictionary: DICT, usdUyu: 40, referenceUsd: () => 5_000 };
const AVEO = "1111111111111111";

describe("GraphQL parsing", () => {
  it("reads feed cards without ever copying the seller name", () => {
    const cards = fbCardsFromText(fixture("fb-feed.jsonl"));
    expect(cards.map(card => card.id)).toEqual([AVEO, "3333333333333333", "9990000000000001"]);
    expect(cards[0]).toMatchObject({
      title: "Chevrolet Aveo 1.6", amount: 4_000, city: "Montevideo, Uruguay", sellerId: "222222222222222",
      categoryId: "807311116002614", isSold: false, isPending: false, isLive: true,
    });
    expect(cards[0]!.createdAt).toBe(new Date(1789656553 * 1000).toISOString());
    expect(cards[0]!.picture).toMatch(/^https:\/\/scontent-yyz1-1\.xx\.fbcdn\.net\//);
    expect(JSON.stringify(cards)).not.toMatch(/SELLER NAME|OTHER NAME/);
  });
  it("reads the item page", () => {
    const item = fbItemFromTexts(AVEO, [fixture("fb-item.json")], NOW.toISOString())!;
    expect(item).toMatchObject({ id: AVEO, amount: 4_000, isLive: true, isSold: false, title: "Chevrolet Aveo 1.6", readAt: NOW.toISOString() });
    expect(item.description).toContain("Debe 52 mil pesos");
    expect(fbItemFromTexts("1", [fixture("fb-item.json")], NOW.toISOString())).toBeNull();
    expect(JSON.stringify(item)).not.toContain("SELLER NAME");
  });
  it("survives garbage", () => {
    expect(fbCardsFromText("for (;;);{not json")).toEqual([]);
    expect(fbItemFromTexts(AVEO, ["<html>", ""], NOW.toISOString())).toBeNull();
  });
});

describe("resolveFbCurrency", () => {
  it("trusts a declared currency", () => {
    expect(resolveFbCurrency(4_000, "USD", null, 40)).toEqual({ currency: "USD", inferred: false });
  });
  it("infers only when exactly one reading fits the reference", () => {
    expect(resolveFbCurrency(4_000, null, 5_000, 40)).toEqual({ currency: "USD", inferred: true });
    expect(resolveFbCurrency(200_000, null, 5_000, 40)).toEqual({ currency: "UYU", inferred: true });
    expect(resolveFbCurrency(60, null, 5_000, 40)).toBeNull();
    expect(resolveFbCurrency(4_000, null, null, 40)).toBeNull();
    expect(resolveFbCurrency(10_000, null, 10_000, 1.5)).toBeNull();
  });
});

describe("fbCardToCar", () => {
  const [aveo, permuto] = fbCardsFromText(fixture("fb-feed.jsonl"));
  const item = fbItemFromTexts(AVEO, [fixture("fb-item.json")], NOW.toISOString());
  it("needs a year: the Aveo title has none and neither does its description", () => {
    expect(fbCardToCar(aveo!, item, CONTEXT)).toBeNull();
  });
  it("builds a private listing with an inferred currency and the description's flags", () => {
    const withYear = { ...aveo!, title: "Chevrolet Aveo 1.6 2012" };
    const result = fbCardToCar(withYear, item, CONTEXT)!;
    expect(result.listing).toMatchObject({
      id: AVEO, source: "facebook", brandId: "67781", modelId: "67800", year: 2012, price: 4_000, currency: "USD",
      currencyInferred: true, sellerType: "private", sellerId: "222222222222222", department: "Montevideo",
      permalink: `https://www.facebook.com/marketplace/item/${AVEO}/`, dealerName: null,
    });
    expect(result.detail!.flags).toContain("paperwork");
    expect(result.detail).toMatchObject({ active: true, readAt: NOW.toISOString(), sellerName: null, price: 4_000, currency: "USD" });
    expect(result.listing.observedAt).toBe(NOW.toISOString());
  });
  it("lists a card without an item page, with no detail", () => {
    const result = fbCardToCar({ ...aveo!, title: "Chevrolet Aveo 2012 U$S 4.000" }, null, CONTEXT)!;
    expect(result.listing).toMatchObject({ currency: "USD", currencyInferred: false });
    expect(result.detail).toBeNull();
  });
  it("skips cards that name no car or are sold", () => {
    expect(fbCardToCar(permuto!, null, CONTEXT)).toBeNull();
    expect(fbCardToCar({ ...aveo!, title: "Moto Chevrolet Aveo 2012" }, null, CONTEXT)).toBeNull();
    expect(fbCardToCar({ ...aveo!, title: "Chevrolet Aveo 2012", isSold: true }, null, CONTEXT)).toBeNull();
    expect(fbCardToCar({ ...aveo!, title: "Chevrolet Aveo 2012" }, { ...item!, isLive: false }, CONTEXT)).toBeNull();
  });
  // 286 stored item pages said "0 km" somewhere; about two in three were used cars, and every one of
  // them was left out of the directory as a new car.
  it("reads 0 km in a description as history, unless it is a current-year car with no km", () => {
    const car = { ...aveo!, title: "Chevrolet Aveo 2012" };
    const said = (description: string) => ({ ...item!, description });
    expect(fbCardToCar(car, said("Un dueño, ficha oficial desde 0km hasta la fecha comprobable."), CONTEXT)).not.toBeNull();
    expect(fbCardToCar(car, said("Excelente estado, igual a 0km. Al día."), CONTEXT)).not.toBeNull();
    expect(fbCardToCar(car, said("Llantas 19 + 4 Kumho 0km, interior de cuero."), CONTEXT)).not.toBeNull();
    const kwid = { ...aveo!, title: "Chevrolet Aveo 2026" };
    expect(fbCardToCar(kwid, said("Comprado 0KM. Actualmente con 15400 KM, igual a nuevo."), CONTEXT)!.listing.km).toBe(15_400);
    // A car of this or last model year, sold as 0 km, with no km of its own: a new car.
    expect(fbCardToCar(kwid, said("0km listo para retirar en concesionario"), CONTEXT)).toBeNull();
    expect(fbCardToCar({ ...aveo!, title: "Chevrolet Aveo 0km 2026" }, null, CONTEXT)).toBeNull();
  });
  it("maps cities to departments", () => {
    expect(fbDepartment("Pando, Canelones, Uruguay")).toBe("Canelones");
    expect(fbDepartment("Montevideo, Uruguay")).toBe("Montevideo");
    expect(fbDepartment("Paysandú")).toBe("Paysandú");
    expect(fbDepartment("Mercedes, Soriano")).toBe("Soriano");
    expect(fbDepartment("Nueva Palmira")).toBeNull();
    expect(fbDepartment(null)).toBeNull();
  });
});

describe("fbDetailQueue", () => {
  it("reads wanted and incomplete identifiable cards first, never sold or unknown ones", () => {
    const base = fbCardsFromText(fixture("fb-feed.jsonl"))[0]!;
    const cards = [
      { ...base, id: "1", title: "Chevrolet Aveo 2012 90000 km", createdAt: "2026-09-17T10:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "2", title: "Chevrolet Aveo", createdAt: "2026-09-17T09:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "3", title: "Vendo o permuto", createdAt: "2026-09-17T11:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "4", title: "Fiat Uno 2010", isSold: true, createdAt: "2026-09-17T11:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "5", title: "Fiat Uno 2010 50000 km", createdAt: "2026-09-16T11:00:00Z", lastSeen: NOW.toISOString(), item: null },
      { ...base, id: "6", title: "Fiat Uno", createdAt: "2026-09-01T11:00:00Z", lastSeen: "2026-09-01T11:00:00Z", item: null },
      {
        ...base, id: "7", title: "Chevrolet Aveo", createdAt: "2026-09-17T11:30:00Z", lastSeen: NOW.toISOString(),
        item: { id: "7", title: null, description: "", amount: 1, isLive: true, isSold: false, readAt: "2026-09-17T06:00:00Z" },
      },
    ];
    expect(fbDetailQueue(cards, DICT, { now: NOW, max: 3, wanted: new Set(["5"]), maxYear: 2027 })).toEqual(["5", "2", "1"]);
    // Newest and oldest unread take turns: "5" (a day older) goes second.
    expect(fbDetailQueue(cards, DICT, { now: NOW, max: 10, wanted: new Set(), maxYear: 2027 })).toEqual(["2", "5", "1"]);
  });

  // Reported 2026-11-25: fb-963318253481029, seen every day since 2026-09-30, had never had its page
  // opened — its km and its "Airbag rotos" were in the description. ~400 pages a day against 150–880
  // new cars a day, newest first, plus a re-read of every page every 3 days: in the 3 days measured,
  // 1.257 pages read and none of a card older than 10 days; 0 of 3.634 live cards older than August.
  it("never lets new cards and re-reads starve an old card that was never read", () => {
    const base = fbCardsFromText(fixture("fb-feed.jsonl"))[0]!;
    const hour = 3_600_000;
    const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * hour).toISOString();
    const read = (id: string, hoursAgo: number) => ({ id, title: null, description: "", amount: 1, isLive: true, isSold: false, readAt: at(hoursAgo) });
    const fresh = Array.from({ length: 20 }, (_, i) => ({
      ...base, id: `n${i}`, title: "Chevrolet Aveo", createdAt: at(i + 1), lastSeen: NOW.toISOString(), item: null,
    }));
    const reread = Array.from({ length: 20 }, (_, i) => ({
      ...base, id: `r${i}`, title: "Chevrolet Aveo", createdAt: at(i + 0.5), lastSeen: NOW.toISOString(), item: read(`r${i}`, 24 * 5 + i),
    }));
    const old = { ...base, id: "old", title: "Chevrolet Aveo 2025", createdAt: at(24 * 58), lastSeen: NOW.toISOString(), item: null };
    const queue = fbDetailQueue([...reread, ...fresh, old], DICT, { now: NOW, max: 15, wanted: new Set(), maxYear: 2027 });
    expect(queue).toHaveLength(15);
    expect(queue.slice(0, 2)).toEqual(["n0", "old"]);
    expect(queue.filter(id => id.startsWith("r"))).toEqual([]);
    // Only once every unread card is in, the oldest reads come back.
    const roomy = fbDetailQueue([...reread, ...fresh, old], DICT, { now: NOW, max: 24, wanted: new Set(), maxYear: 2027 });
    expect(roomy.slice(21)).toEqual(["r19", "r18", "r17"]);
  });

  // A page that did not parse leaves a trace, or the same card heads the oldest-first turn every hour.
  it("waits 3 days after a page that could not be read", () => {
    const base = fbCardsFromText(fixture("fb-feed.jsonl"))[0]!;
    const card = (id: string, itemMissedAt: string | null) => ({
      ...base, id, title: "Chevrolet Aveo", createdAt: "2026-09-01T00:00:00Z", lastSeen: NOW.toISOString(), item: null, itemMissedAt,
    });
    const cards = [card("missed-yesterday", "2026-09-16T12:00:00Z"), card("missed-last-week", "2026-09-10T12:00:00Z"), card("never", null)];
    expect(fbDetailQueue(cards, DICT, { now: NOW, max: 10, wanted: new Set(), maxYear: 2027 }).sort()).toEqual(["missed-last-week", "never"]);
  });
});

describe("mergeFbCards", () => {
  it("keeps the trace of a page that could not be read, and a read page clears it", () => {
    const base = fbCardsFromText(fixture("fb-feed.jsonl"))[0]!;
    const stored = [{ ...base, lastSeen: "2026-09-16T00:00:00Z", item: null, itemMissedAt: "2026-09-16T00:00:00Z" }];
    expect(mergeFbCards(stored, [base], [], NOW.toISOString())[0]).toMatchObject({ lastSeen: NOW.toISOString(), itemMissedAt: "2026-09-16T00:00:00Z" });
    const item = { id: base.id, title: null, description: "x", amount: 1, isLive: true, isSold: false, readAt: NOW.toISOString() };
    expect(mergeFbCards(stored, [base], [item], NOW.toISOString())[0]).toMatchObject({ item, itemMissedAt: null });
  });
});
