// harvestRetail must not run — or even report — the Facebook Marketplace source when nothing it was
// handed could ever search it (celulares: fbQueries: [], because Marketplace titles almost never
// carry the brand+family+storage classes/phones/identify.ts needs). Before this fix that produced a
// permanent `FAIL facebook 0 avisos :: no disponible` line every single run, for a source that was
// never actually called. equipar and chairs, whose specs DO declare fbQueries, must be unaffected.
import { describe, expect, it, vi } from "vitest";

const mlCalls = vi.hoisted(() => [] as unknown[]);
const fbCalls = vi.hoisted(() => [] as unknown[]);

vi.mock("../../classes/retail/sources/mercadolibre", () => ({
  harvestMercadoLibre: async (...args: unknown[]) => {
    mlCalls.push(args);
    return { listings: [], ok: true, note: "" };
  },
}));
vi.mock("../../classes/retail/sources/facebook", () => ({
  harvestFacebookMarketplace: async (...args: unknown[]) => {
    fbCalls.push(args);
    return { listings: [], ok: true, note: "" };
  },
}));
vi.mock("../../classes/retail/sources/fenicio", () => ({ harvestFenicioStore: async () => ({ listings: [], ok: true, note: "" }) }));
vi.mock("../../classes/retail/sources/shopify", () => ({ harvestShopifyStore: async () => ({ listings: [], ok: true, note: "" }) }));
vi.mock("../../classes/retail/sources/woocommerce", () => ({ harvestWooStore: async () => ({ listings: [], ok: true, note: "" }) }));
vi.mock("../../classes/retail/sources/vtex", () => ({ harvestVtexStore: async () => ({ listings: [], ok: true, note: "" }) }));

import { harvestRetail } from "../../classes/retail/harvest";
import type { CategorySpec } from "../../classes/retail/types";

const specNoFb = (key: string): CategorySpec => ({ key, accept: () => true, fbQueries: [] });
const specWithFb = (key: string): CategorySpec => ({ key, accept: () => true, fbQueries: ["algo"] });
const specUndeclaredFb = (key: string): CategorySpec => ({ key, accept: () => true });

describe("harvestRetail y Facebook Marketplace", () => {
  it("no corre ni reporta Facebook cuando ninguna spec trae fbQueries (celulares)", async () => {
    fbCalls.length = 0;
    const result = await harvestRetail({ stores: [], specs: [specNoFb("celulares")] });
    expect(fbCalls).toHaveLength(0);
    expect(result.runs.find((run) => run.key === "facebook")).toBeUndefined();
  });

  it("lo mismo cuando una spec ni siquiera declara fbQueries (undefined, no [])", async () => {
    fbCalls.length = 0;
    const result = await harvestRetail({ stores: [], specs: [specUndeclaredFb("bcu")] });
    expect(fbCalls).toHaveLength(0);
    expect(result.runs.find((run) => run.key === "facebook")).toBeUndefined();
  });

  it("sigue corriendo y reportando Facebook cuando AL MENOS una spec trae fbQueries (equipar/sillas no cambian)", async () => {
    fbCalls.length = 0;
    const result = await harvestRetail({ stores: [], specs: [specNoFb("bcu"), specWithFb("sillas")] });
    expect(fbCalls).toHaveLength(1);
    expect(result.runs.find((run) => run.key === "facebook")).toMatchObject({ key: "facebook", ok: true });
  });

  it("Mercado Libre corre siempre, tenga o no fbQueries alguna spec", async () => {
    mlCalls.length = 0;
    await harvestRetail({ stores: [], specs: [specNoFb("celulares")] });
    expect(mlCalls).toHaveLength(1);
  });
});
