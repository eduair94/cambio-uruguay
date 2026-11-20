import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The DB half of the text fields (`applyMlDetails`, the `writeMlDetail*` helpers) against a stub of
// the app database; every other test here is pure and never touches it.
const db = vi.hoisted(() => ({
  docs: [] as Array<Record<string, unknown>>,
  finds: [] as Array<{ filter: Record<string, unknown>; projection: Record<string, number> }>,
  stored: null as Record<string, unknown> | null,
  updates: [] as Array<{ filter: unknown; update: Record<string, Record<string, unknown>>; options: { arrayFilters: Array<Record<string, unknown>> } }>,
}));
vi.mock("../../classes/appdb", () => ({
  appConnection: () => ({
    collection: () => ({
      find: (filter: Record<string, unknown>, options: { projection?: Record<string, number> } = {}) => {
        const projection = options.projection ?? {};
        db.finds.push({ filter, projection });
        const hidden = Object.keys(projection).filter(field => projection[field] === 0);
        return { toArray: async () => db.docs.map(doc => Object.fromEntries(Object.entries(doc).filter(([field]) => !hidden.includes(field)))) };
      },
      findOne: async () => db.stored,
      updateOne: async (filter: unknown, update: Record<string, Record<string, unknown>>, options: { arrayFilters: Array<Record<string, unknown>> }) => {
        db.updates.push({ filter, update, options });
        return { modifiedCount: 1 };
      },
    }),
  }),
}));

import { advertiserClassification, ownerDirectDeclaration } from "../../classes/rentals/advertiser";
import { retainAdvertiserFields } from "../../classes/rentals/advertiserRetention";
import { applyGallery } from "../../classes/rentals/detailImages";
import { pinFits, pinFor, type RentalPin } from "../../classes/rentals/detailPins";
import {
  applyMlDetailRows,
  applyMlDetails,
  ML_SELLER_PLACEHOLDER,
  mlDetailExpenses,
  mlDetailIsCurrent,
  mlDetailStated,
  mlDetailTargets,
  mlRereadRefusal,
  officialStoreSeller,
  mlPhotoKey,
  mlPictureId,
  parseMlOfficialStore,
  parseMlRentalBedrooms,
  parseMlRentalDescription,
  parseMlRentalExpenses,
  parseMlRentalImages,
  parseMlRentalPin,
  parseMlRentalPublishedAgo,
  prioritizeMlDetailTargets,
  writeMlDetailDescription,
  writeMlDetailPublishedAt,
  writeMlDetailSeller,
  type MlDetailTarget,
  type MlRentalDetail,
} from "../../classes/rentals/mlDetail";
import type { RawRental, RentalProperty } from "../../classes/rentals/types";

const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", name), "utf8");

// The spec table of a Mercado Libre rental item page, as served on 2026-10-08 (MLU-695924825).
const specRow = (value: string, label = "Gastos comunes") =>
  `<tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">${label}</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_2jnslb5alcj1qpa_"><span id="_R_2jnslb5alcj1qpa_-value" class="andes-table__column--value" style="">${value}</span></td></tr>`;
const page = (rows = "") =>
  `<html><div class="ui-pdp-container__row"><table class="andes-table ui-vpp-striped-specs__table"><tbody>${rows}</tbody></table></div></html>`;

describe("common expenses on a Mercado Libre rental item page", () => {
  it("reads the advert's own spec row, with its currency", () => {
    expect(parseMlRentalExpenses(page(specRow("19.500 UYU")))).toEqual({ amount: 19_500, currency: "UYU" });
    expect(parseMlRentalExpenses(page(specRow("150 USD")))).toEqual({ amount: 150, currency: "USD" });
  });

  it("treats a zero as not stated: it is what ML's form keeps when nobody writes a number", () => {
    // Sample of 20 live adverts (2026-10-08): 16 with the row, 5 of them "0 UYU", some of them
    // apartments in buildings that do have common expenses.
    expect(parseMlRentalExpenses(page(specRow("0 UYU")))).toBeNull();
    expect(parseMlRentalExpenses(page())).toBeNull();
  });

  it("tells a page it cannot read apart from an advert that states nothing", () => {
    expect(parseMlRentalExpenses("<title>Mercado Libre</title><p>Hubo un error</p>")).toBeUndefined();
    expect(parseMlRentalExpenses(page(specRow("a consultar")))).toBeNull();
  });
});

// The card's attribute strip leaves bedrooms out for some adverts: 531 ML homes had none on
// 2026-10-08 without being a monoambiente, and 10 of 12 sampled pages stated them.
describe("bedrooms on a Mercado Libre rental item page", () => {
  it("reads the spec table's count, from 0 to 10", () => {
    expect(parseMlRentalBedrooms(page(specRow("19.500 UYU") + specRow("2", "Dormitorios")))).toBe(2);
    expect(parseMlRentalBedrooms(page(specRow("0", "Dormitorios")))).toBe(0);
  });

  it("refuses what is not a count", () => {
    expect(parseMlRentalBedrooms(page(specRow("19.500 UYU")))).toBeNull();
    expect(parseMlRentalBedrooms(page(specRow("2 a 3", "Dormitorios")))).toBeNull();
    expect(parseMlRentalBedrooms(page(specRow("45", "Dormitorios")))).toBeNull();
  });
});

describe("whether a stated amount may complete the advert", () => {
  const usdUyu = 41;
  it("keeps common expenses below the rent, in either currency", () => {
    expect(mlDetailExpenses({ amount: 5_000, currency: "UYU" }, { price: 30_000, currency: "UYU" }, usdUyu)).toEqual({
      commonExpenses: 5_000,
      commonExpensesCurrency: "UYU",
    });
    expect(mlDetailExpenses({ amount: 19_500, currency: "UYU" }, { price: 2_100, currency: "USD" }, usdUyu)).toMatchObject({
      commonExpenses: 19_500,
    });
  });

  it("rejects what cannot be a month of common expenses for that rent", () => {
    // A typo with a zero too many, or the yearly figure, is larger than the rent itself.
    expect(mlDetailExpenses({ amount: 45_000, currency: "UYU" }, { price: 30_000, currency: "UYU" }, usdUyu)).toBeNull();
    expect(mlDetailExpenses({ amount: 50, currency: "UYU" }, { price: 30_000, currency: "UYU" }, usdUyu)).toBeNull();
    // A dollar amount cannot be judged without the rate.
    expect(mlDetailExpenses({ amount: 150, currency: "USD" }, { price: 30_000, currency: "UYU" }, 0)).toBeNull();
  });
});

describe("which item pages are read first", () => {
  const target = (over: Partial<MlDetailTarget>): MlDetailTarget => ({
    key: "k",
    listingId: "mercadolibre:MLU1",
    url: "https://apartamento.mercadolibre.com.uy/MLU-1-x-_JM",
    department: "Canelones",
    propertyType: "apartamento",
    lastSeen: "2026-10-08",
    ...over,
  });
  it("puts Montevideo homes first, then homes, freshest first, within the budget", () => {
    const rows = [
      target({ listingId: "mercadolibre:MLU1", propertyType: "local", department: "Montevideo" }),
      target({ listingId: "mercadolibre:MLU2" }),
      target({ listingId: "mercadolibre:MLU3", department: "Montevideo" }),
      target({ listingId: "mercadolibre:MLU4", department: "Montevideo", lastSeen: "2026-10-01" }),
    ];
    expect(prioritizeMlDetailTargets(rows, 3).map(row => row.listingId)).toEqual([
      "mercadolibre:MLU3",
      "mercadolibre:MLU4",
      "mercadolibre:MLU2",
    ]);
  });

  it("reads an advert never read before re-reading one, so a backfill cannot delay a first total", () => {
    const rows = [
      target({ listingId: "mercadolibre:MLU1", department: "Montevideo", reread: true }),
      target({ listingId: "mercadolibre:MLU2", propertyType: "local" }),
      target({ listingId: "mercadolibre:MLU3", department: "Montevideo" }),
    ];
    expect(prioritizeMlDetailTargets(rows, 3).map(row => row.listingId)).toEqual([
      "mercadolibre:MLU3",
      "mercadolibre:MLU2",
      "mercadolibre:MLU1",
    ]);
  });

  it("reads again, once, a page stored before its pin or its photos were kept", () => {
    const fresh = "2026-09-09T00:00:00.000Z";
    const row = { ok: true, readAt: "2026-10-08T12:00:00.000Z", latitude: null, images: [] as string[], description: null, publishedAt: null, officialStore: null };
    expect(mlDetailIsCurrent(row, fresh)).toBe(true);
    expect(mlDetailIsCurrent({ ...row, images: undefined }, fresh)).toBe(false);
    expect(mlDetailIsCurrent({ ...row, latitude: undefined }, fresh)).toBe(false);
    expect(mlDetailIsCurrent({ ...row, readAt: "2026-09-01T12:00:00.000Z" }, fresh)).toBe(false);
  });

  it("reads again, once, a page stored before its text was kept, and not again after", () => {
    const fresh = "2026-10-09T00:00:00.000Z";
    // A row of 2026-10-20, current in every other field: ~28.000 of these get one more read.
    const before = { ok: true, readAt: "2026-10-20T12:00:00.000Z", latitude: -34.9, images: ["x"] };
    expect(mlDetailIsCurrent(before, fresh)).toBe(false);
    // The three text fields go in together; a page that had none of them is still read.
    expect(mlDetailIsCurrent({ ...before, description: null, publishedAt: null, officialStore: null }, fresh)).toBe(true);
    expect(mlDetailIsCurrent({ ...before, description: "Texto", publishedAt: "2026-10-01", officialStore: "Remax Único" }, fresh)).toBe(true);
  });

  it("hands each reread what its stored read stated, and a first read nothing", async () => {
    db.finds = [];
    // The stub answers both collections with the same rows: the property's for the targets, the
    // stored read's for what is current. Each loop skips the shape it does not read.
    db.docs = [
      { key: "p1", department: "Montevideo", propertyType: "apartamento", offers: [
        { source: "mercadolibre", listingId: "mercadolibre:MLU1", url: "https://apartamento.mercadolibre.com.uy/MLU-1-x-_JM", lastSeen: "2026-11-07" },
        { source: "mercadolibre", listingId: "mercadolibre:MLU2", url: "https://apartamento.mercadolibre.com.uy/MLU-2-x-_JM", lastSeen: "2026-11-07" },
      ] },
      // Read on 2026-10-20, before the text fields: due once more.
      { listingId: "mercadolibre:MLU1", ok: true, readAt: "2026-10-20T12:00:00.000Z", amount: 5_000, latitude: -34.9, bedrooms: 2, images: ["x"] },
    ];
    const targets = await mlDetailTargets(new Date("2026-11-08T12:00:00.000Z"), 10);
    expect(db.finds[1]!.projection).toMatchObject({ amount: 1, latitude: 1, bedrooms: 1, images: 1, publishedAt: 1 });
    expect(targets.map(target => [target.listingId, target.reread ?? false])).toEqual([["mercadolibre:MLU2", false], ["mercadolibre:MLU1", true]]);
    expect(targets[0]!.stated).toBeUndefined();
    expect(targets[1]!.stated).toEqual({ expenses: true, pin: true, photos: true, bedrooms: true });
    db.docs = [];
  });
});

// Review of 2026-11-08: the text fields send ~28.000 stored pages to one more read in five days, and
// each read replaces its whole stored row. If the page ML serves our UA changed under them, the
// gastos comunes, pins and photos stored before would turn into nulls, and the harvest would stop
// putting them back on the adverts.
describe("a run whose rereads blank what earlier reads stated", () => {
  const after = (over: Partial<MlRentalDetail> = {}): MlRentalDetail => ({
    listingId: "mercadolibre:MLU1", readAt: "2026-11-08T04:00:00.000Z", amount: 5_000, currency: "UYU",
    latitude: -34.9, longitude: -56.16, bedrooms: 2, images: ["https://http2.mlstatic.com/D_NQ_NP_1-MLU1_1-F.webp"],
    description: null, publishedAt: null, officialStore: null, ok: true, ...over,
  });
  const had = mlDetailStated(after());

  it("knows what a stored read stated", () => {
    expect(had).toEqual({ expenses: true, pin: true, photos: true, bedrooms: true });
    // A zero is what ML's form keeps when nobody writes a number: not a figure that can be lost.
    expect(mlDetailStated({ amount: 0, latitude: null, images: [], bedrooms: null })).toEqual({ expenses: false, pin: false, photos: false, bedrooms: false });
    // Rows from before a field was kept never had it.
    expect(mlDetailStated({})).toEqual({ expenses: false, pin: false, photos: false, bedrooms: false });
  });

  it("is not saved when half its rereads lose a field they had", () => {
    const reads = Array.from({ length: 24 }, (_, i) => ({ before: had, after: after(i < 12 ? { latitude: null, longitude: null } : {}) }));
    expect(mlRereadRefusal(reads)).toBe("12 de 24 relecturas perdieron pin");
    const noTable = Array.from({ length: 20 }, () => ({ before: had, after: after({ amount: null, currency: null }) }));
    expect(mlRereadRefusal(noTable)).toBe("20 de 20 relecturas perdieron gastos comunes");
  });

  it("is saved when adverts change one by one, when there are too few to tell, and for first reads", () => {
    // Two adverts out of 24 dropping their map is two adverts, not a page that changed.
    expect(mlRereadRefusal(Array.from({ length: 24 }, (_, i) => ({ before: had, after: after(i < 2 ? { latitude: null } : {}) })))).toBeNull();
    // Nineteen rereads never decide, whatever they lost.
    expect(mlRereadRefusal(Array.from({ length: 19 }, () => ({ before: had, after: after({ images: [] }) })))).toBeNull();
    // A first read had nothing stored: it cannot lose anything.
    expect(mlRereadRefusal(Array.from({ length: 40 }, () => ({ after: after({ latitude: null, images: [], amount: null }) })))).toBeNull();
    // Gaining a field is never a loss.
    expect(mlRereadRefusal(Array.from({ length: 40 }, () => ({ before: mlDetailStated({}), after: after() })))).toBeNull();
  });
});

// MLU-703761475 as served to our UA on 2026-11-08 (tests/rentals/fixtures/ml-rental-item-text.html):
// its page had the description, the age and the official store all along, and the ficha said
// "Todavía no tenemos una descripción", "Publica: Mercado Libre" and a firstSeen of that same day.
describe("the text of a Mercado Libre rental item page", () => {
  const PAGE = fixture("ml-rental-item-text.html");
  const READ_AT = "2026-11-08T04:18:00.000Z";
  const header = (subtitle: string) =>
    `<div class="ui-pdp-header__subtitle"><span class="ui-pdp-subtitle ui-pdp-subtitle_rex" aria-label="${subtitle}">${subtitle}</span></div>`;

  it("reads the advert's own description, without its phones or emails", () => {
    const description = parseMlRentalDescription(PAGE)!;
    expect(description).toContain("Gastos comunes: $U11.000.-");
    expect(description).toContain("Garantías aceptadas: Anda o Contaduría.");
    expect(description).toContain("Cochera para un auto.");
    expect(description).not.toMatch(/099|123 456|@|ejemplo/);
    expect(description.length).toBeLessThanOrEqual(2_400);
  });

  it("abstains on a page with no description, or one with nothing left after the contacts", () => {
    expect(parseMlRentalDescription(page(specRow("19.500 UYU")))).toBeNull();
    expect(parseMlRentalDescription(`<p class="ui-pdp-description__content">099 123 456</p>`)).toBeNull();
  });

  it("dates 'Publicado hace N días' back from the read, and nothing ML rounds", () => {
    expect(parseMlRentalPublishedAgo(PAGE, READ_AT)).toBe("2026-10-09");
    expect(parseMlRentalPublishedAgo(header("Casa en Alquiler | Publicado hace 1 día"), READ_AT)).toBe("2026-11-07");
    // 04:18 UTC minus five hours is the day before.
    expect(parseMlRentalPublishedAgo(header("Publicado hace 5 horas"), READ_AT)).toBe("2026-11-07");
    expect(parseMlRentalPublishedAgo(header("Apartamento en Alquiler | Publicado hace 2 meses"), READ_AT)).toBeNull();
    expect(parseMlRentalPublishedAgo(header("Publicado hace 1 año"), READ_AT)).toBeNull();
    expect(parseMlRentalPublishedAgo(header("Publicado hace 3 semanas"), READ_AT)).toBeNull();
    // Only the header says when the advert went up: a description is free text.
    expect(parseMlRentalPublishedAgo(`<p class="ui-pdp-description__content">Publicado hace 3 días</p>`, READ_AT)).toBeNull();
    expect(parseMlRentalPublishedAgo(PAGE, "not a date")).toBeNull();
  });

  it("names the official store ML shows, never the address beside it or a seller's nickname", () => {
    expect(parseMlOfficialStore(PAGE)).toBe("Remax Único");
    // The header's "seller validated" link of the same page is the advert's address.
    expect(parseMlOfficialStore(PAGE.replace(/<div class="ui-pdp-seller-good-attention">[\s\S]*<\/body>/, "</body>"))).toBeNull();
    expect(parseMlOfficialStore(`<p><span>Vendido por</span><a href="#seller_profile">JUANPEREZ1987</a></p>`)).toBeNull();
    // Two names for one store is no name.
    expect(parseMlOfficialStore(PAGE.replace("<span>Remax Único</span>", "<span>Otra Inmobiliaria</span>"))).toBeNull();
  });

  it("is the same page the spec table is read from", () => {
    expect(parseMlRentalExpenses(PAGE)).toEqual({ amount: 11_000, currency: "UYU" });
    expect(parseMlRentalBedrooms(PAGE)).toBe(2);
  });
});

describe("putting the page's text back on the advert", () => {
  const detail: MlRentalDetail = {
    listingId: "mercadolibre:MLU703761475", readAt: "2026-11-08T04:18:00.000Z", amount: null, currency: null,
    latitude: null, longitude: null, bedrooms: null, images: [],
    description: parseMlRentalDescription(fixture("ml-rental-item-text.html")), publishedAt: "2026-10-09", officialStore: "Remax Único", ok: true,
  };
  const card = (over: Partial<RawRental> = {}): RawRental => ({
    source: "mercadolibre", listingId: detail.listingId, url: "https://apartamento.mercadolibre.com.uy/MLU-703761475-x-_JM",
    title: "Alquiler 2 Dormitorios Y Servicio, Cochera, Balcón", price: 45_000, currency: "UYU", commonExpenses: null,
    commonExpensesCurrency: null, sellerName: ML_SELLER_PLACEHOLDER, sellerType: "desconocido", image: null, publishedAt: null,
    propertyType: "apartamento", department: "Montevideo", neighborhood: "Pocitos", address: "", street: "", streetNumber: "",
    latitude: null, longitude: null, bedrooms: 2, bathrooms: null, area: null, parkingSpaces: null, furnished: null,
    petsAllowed: null, guarantees: [], ...over,
  });
  const stated = new Map([[detail.listingId, detail]]);

  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => { db.docs = []; db.finds = []; });

  it("with RENTALS_ML_DETAIL_TEXT off, puts back the publication day and the store, never the description", () => {
    const row = card();
    expect(applyMlDetailRows([row], stated, 40, { text: false })).toMatchObject({ publishedAt: 1, sellers: 1, descriptions: 0 });
    expect(row).toMatchObject({ publishedAt: "2026-10-09", sellerName: "Remax Único", guarantees: [] });
    expect(row.details).toBeUndefined();
  });

  it("with it on, the description too, and the guarantees it names", () => {
    const row = card();
    expect(applyMlDetailRows([row], stated, 40, { text: true }).descriptions).toBe(1);
    expect(row.details!.description).toContain("Garantías aceptadas: Anda o Contaduría.");
    expect(row.guarantees).toEqual(expect.arrayContaining(["anda", "contaduria"]));
  });

  it("only fills what the advert does not already say", () => {
    const row = card({ publishedAt: "2026-11-01", sellerName: "Particular" });
    applyMlDetailRows([row], stated, 40, { text: true });
    expect(row).toMatchObject({ publishedAt: "2026-11-01", sellerName: "Particular" });
    const described = card({ details: { description: "Otro texto", images: [], builtArea: null, totalArea: null, landArea: null, terraceArea: null, amenities: [], guaranteeText: "" } });
    applyMlDetailRows([described], stated, 40, { text: true });
    expect(described.details!.description).toBe("Otro texto");
  });

  // Review of 2026-11-08: "Publica: Remax Único" beside "Dueño directo" read from the title. ML's
  // badge says a business publishes it, and a contradiction cancels the claim.
  it("drops an owner-direct claim the official store contradicts, without making the store an agency", () => {
    const url = "https://apartamento.mercadolibre.com.uy/MLU-703761475-x-_JM";
    const title = "Dueño directo alquila 2 dormitorios en Pocitos";
    const claim = ownerDirectDeclaration({ title }, url, "2026-11-08T04:00:00.000Z")!;
    expect(claim).toMatchObject({ declared: true, evidence: "advert_text" });
    const claimed = card({ title, url, sellerType: advertiserClassification({ title }).sellerType, ownerDirect: claim });
    expect(claimed.sellerType).toBe("particular");
    applyMlDetailRows([claimed], stated, 40);
    expect(claimed).toMatchObject({ sellerName: "Remax Único", sellerType: "desconocido", ownerDirect: null });
    // No claim to drop: the type stays what the title made it, never "inmobiliaria" from a name.
    const silent = card();
    applyMlDetailRows([silent], stated, 40);
    expect(silent).toMatchObject({ sellerName: "Remax Único", sellerType: "desconocido", ownerDirect: null });
    const agency = card({ sellerType: "inmobiliaria" });
    applyMlDetailRows([agency], stated, 40);
    expect(agency.sellerType).toBe("inmobiliaria");
    // ML's own private-seller filter is not overwritten by the store, nor is its claim.
    const particular = card({ title, url, sellerName: "Particular", sellerType: "particular", ownerDirect: claim });
    applyMlDetailRows([particular], stated, 40);
    expect(particular).toMatchObject({ sellerName: "Particular", sellerType: "particular", ownerDirect: claim });
  });

  it("drops it with null, so a claim stored by an earlier read does not come back", () => {
    const url = "https://apartamento.mercadolibre.com.uy/MLU-703761475-x-_JM";
    const claim = ownerDirectDeclaration({ title: "Dueño directo alquila" }, url, "2026-11-08T04:00:00.000Z")!;
    type Advert = Pick<RawRental, "source" | "listingId" | "url" | "sellerName" | "sellerType" | "ownerDirect">;
    const base = { source: "mercadolibre" as const, listingId: detail.listingId, url, sellerName: "Remax Único" };
    const previous: Advert = { ...base, sellerType: "particular", ownerDirect: claim };
    expect(retainAdvertiserFields(previous, { ...base, sellerType: "desconocido", ...officialStoreSeller({ sellerType: "particular" }) }, true).ownerDirect).toBeNull();
    // `undefined` reads as "not inspected", and retention would put the old claim back.
    expect(retainAdvertiserFields(previous, { ...base, sellerType: "desconocido" }, true).ownerDirect).toMatchObject({ declared: true });
  });

  it("asks the database for the descriptions only when it will publish them", async () => {
    db.docs = [detail as unknown as Record<string, unknown>];
    const off = card();
    await applyMlDetails([off], 40);
    expect(db.finds[0]!.projection).toEqual({ _id: 0, description: 0 });
    expect(off).toMatchObject({ publishedAt: "2026-10-09", sellerName: "Remax Único" });
    expect(off.details).toBeUndefined();
    vi.stubEnv("RENTALS_ML_DETAIL_TEXT", "1");
    const on = card();
    await applyMlDetails([on], 40);
    expect(db.finds[1]!.projection).toEqual({ _id: 0 });
    expect(on.details!.description).toContain("Gastos comunes: $U11.000.-");
  });
});

describe("writing the page's text on the stored advert", () => {
  const target = { key: "propiedad", listingId: "mercadolibre:MLU703761475" };
  beforeEach(() => { db.stored = null; db.updates = []; });

  it("sets the publication day and the store only where the advert has none", async () => {
    expect(await writeMlDetailPublishedAt(target, "2026-10-09")).toBe(true);
    expect(db.updates[0]!.update.$set).toEqual({ "offers.$[o].publishedAt": "2026-10-09" });
    expect(db.updates[0]!.options.arrayFilters).toEqual([{ "o.listingId": target.listingId, "o.publishedAt": null }]);
    expect(await writeMlDetailSeller(target, "Remax Único")).toBe(true);
    // A "particular" only the title's claim made goes first, while the placeholder still marks the advert…
    expect(db.updates[1]!.update.$set).toEqual({ "offers.$[o].sellerType": "desconocido" });
    expect(db.updates[1]!.options.arrayFilters).toEqual([{ "o.listingId": target.listingId, "o.sellerName": "Mercado Libre", "o.sellerType": "particular" }]);
    // …then the store over the placeholder, without the owner-direct claim it contradicts.
    expect(db.updates[2]!.update.$set).toEqual({ "offers.$[o].sellerName": "Remax Único", "offers.$[o].ownerDirect": null });
    expect(db.updates[2]!.options.arrayFilters).toEqual([{ "o.listingId": target.listingId, "o.sellerName": "Mercado Libre" }]);
    expect(await writeMlDetailPublishedAt(target, "hace un mes")).toBe(false);
    expect(await writeMlDetailSeller(target, "")).toBe(false);
    expect(db.updates).toHaveLength(3);
  });

  it("puts the description on an advert that shows none, and leaves one that does", async () => {
    db.stored = { offers: [{ listingId: target.listingId }] };
    expect(await writeMlDetailDescription(target, "Luminoso, gastos comunes $5.000")).toBe(true);
    expect(db.updates[0]!.update.$set!["offers.$[o].details"]).toMatchObject({ description: "Luminoso, gastos comunes $5.000", images: [] });
    db.stored = { offers: [{ listingId: target.listingId, details: { description: "" } }] };
    expect(await writeMlDetailDescription(target, "Luminoso")).toBe(true);
    expect(db.updates[1]!.update.$set).toEqual({ "offers.$[o].details.description": "Luminoso" });
    db.stored = { offers: [{ listingId: target.listingId, details: { description: "Ya tiene" } }] };
    expect(await writeMlDetailDescription(target, "Luminoso")).toBe(false);
    expect(db.updates).toHaveLength(2);
  });
});

// A rental item page as Mercado Libre serves it to our declared UA (MLU-1517303434, Puertito del
// Buceo, 2026-10-09), trimmed to its JSON-LD, its photo mosaic, two spec rows and the static map,
// whose Google key and signature are replaced. The mosaic says "Imagen 1 de 11" and shows five.
describe("the photos of a Mercado Libre rental item page", () => {
  const PAGE_IDS = [
    "846035-MLU117438763806_102026",
    "744830-MLU119039505193_102026",
    "787185-MLU119040329225_102026",
    "774626-MLU119039801661_102026",
    "766665-MLU117438823376_102026",
  ];
  const full = (id: string) => `https://http2.mlstatic.com/D_NQ_NP_${id}-F.webp`;

  it("reads the five photos the page lists, full size and in its order", () => {
    expect(parseMlRentalImages(fixture("ml-rental-item.html"))).toEqual(PAGE_IDS.map(full));
  });

  it("is the same page the other facts are read from", () => {
    const html = fixture("ml-rental-item.html");
    expect(parseMlRentalExpenses(html)).toEqual({ amount: 24_600, currency: "UYU" });
    expect(parseMlRentalBedrooms(html)).toBe(4);
    expect(parseMlRentalPin(html)).toEqual({ latitude: -34.9095071, longitude: -56.1367351 });
  });

  it("reads every photo of the carousel the mobile layout lists, never its video", () => {
    // MLU-1517295544 in the mobile layout: 29 photos and a video; slides 4 to 28 left out.
    expect(parseMlRentalImages(fixture("ml-rental-item-mobile.html"))).toEqual([
      full("937770-MLU117443505164_102026"),
      full("887272-MLU119044064785_102026"),
      full("794337-MLU117100029890_102026"),
      full("932866-MLU117443256574_102026"),
    ]);
  });

  it("takes only photos labelled as this gallery's", () => {
    const banner = `<link rel="preload" as="image" href="https://http2.mlstatic.com/D_NQ_941966-MLA115518237559_082026-OO.jpg"/>` +
      `<img src="https://http2.mlstatic.com/D_NQ_NP_123456-MLU100000000001_102026-F.webp" alt="otra publicación"/>`;
    expect(parseMlRentalImages(page(specRow("19.500 UYU")) + banner)).toBeNull();
    const elsewhere = `<figure aria-label="Imagen 1 de 3 de x"><img src="https://example.com/D_NQ_NP_123456-MLU100000000001_102026-F.webp"/></figure>`;
    expect(parseMlRentalImages(elsewhere)).toBeNull();
  });

  it("knows the card's cover and the page's photo are one picture", () => {
    const cover = "https://http2.mlstatic.com/D_NQ_NP_2X_846035-MLU117438763806_102026-C.webp";
    expect(mlPictureId(cover)).toBe(PAGE_IDS[0]);
    expect(mlPictureId(full(PAGE_IDS[0]!))).toBe(PAGE_IDS[0]);
    expect(mlPictureId("https://http2.mlstatic.com/D_NQ_NP_846035-MLU117438763806_102026-O.jpg")).toBe(PAGE_IDS[0]);
    expect(mlPictureId("https://example.com/846035-MLU117438763806_102026-F.webp")).toBeNull();
    expect(mlPhotoKey("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
  });

  it("puts the page's other photos on the card's advert, keeping its cover", () => {
    const row = { image: "https://http2.mlstatic.com/D_NQ_NP_2X_846035-MLU117438763806_102026-C.webp" } as Pick<RawRental, "image" | "details">;
    expect(applyGallery(row, PAGE_IDS.map(full), mlPhotoKey)).toBe(true);
    expect(row.image).toBe("https://http2.mlstatic.com/D_NQ_NP_2X_846035-MLU117438763806_102026-C.webp");
    expect(row.details).toEqual({
      description: "", images: PAGE_IDS.slice(1).map(full), builtArea: null, totalArea: null, landArea: null,
      terraceArea: null, amenities: [], guaranteeText: "",
    });
    // Never a shorter gallery than the advert already has.
    expect(applyGallery(row, PAGE_IDS.slice(0, 3).map(full), mlPhotoKey)).toBe(false);
    expect(row.details!.images).toHaveLength(4);
  });
});

// The item page's map, as served on 2026-10-08 (MLU-701446219, La Comercial). The same page also
// carries `geo_information`, the centroid of Uruguay marked "APPROXIMATE", on every advert.
const COUNTRY = `"geo_information":{"location":{"latitude":-32.522778,"longitude":-55.765835,"type":"APPROXIMATE"}}`;
const mapInfo = (lat: string, lng: string) =>
  `"map_info":{"icon":{"id":"PIN_REAL_ESTATE"},"location":{"latitude":"${lat}","longitude":"${lng}"},"action":{"timeout":0}}`;

// What our own UA is served instead (same advert, same day): no interactive map, only its image.
const staticMap = (lat: string, lng: string) =>
  `<span class="ui-pdp-media"><img class="ui-pdp-image" data-testid="static-map" src="https://maps.googleapis.com/maps/api/staticmap?key=K&amp;maptype=roadmap&amp;scale=1&amp;format=jpg&amp;center=${lat}%2C${lng}&amp;zoom=16&amp;size=732x300&amp;signature=S" srcSet="x"/></span>`;

describe("the map pin of a Mercado Libre rental item page", () => {
  it("reads the static map the page serves our UA", () => {
    expect(parseMlRentalPin(`${COUNTRY} … ${staticMap("-34.889821", "-56.178567")}`)).toEqual({
      latitude: -34.889821,
      longitude: -56.178567,
    });
  });

  it("reads the advert's own map, never the country centroid next to it", () => {
    expect(parseMlRentalPin(`${COUNTRY} … ${mapInfo("-34.889821", "-56.178567")}`)).toEqual({
      latitude: -34.889821,
      longitude: -56.178567,
    });
    expect(parseMlRentalPin(COUNTRY)).toBeNull();
    expect(parseMlRentalPin(mapInfo("-32.522778", "-55.765835"))).toBeNull();
  });

  it("refuses a point outside Uruguay", () => {
    // Buenos Aires sits inside the rectangle around Uruguay, across the river.
    expect(parseMlRentalPin(mapInfo("-34.6037", "-58.3816"))).toBeNull();
    expect(parseMlRentalPin(mapInfo("-34.4626", "-57.8400"))).not.toBeNull();
    expect(parseMlRentalPin(mapInfo("0", "0"))).toBeNull();
  });

  it("keeps a Montevideo advert inside Montevideo", () => {
    expect(pinFits({ latitude: -34.9053785, longitude: -56.1858464 }, "Montevideo")).toBe(true);
    // Punta del Este: a fine pin for Maldonado, an impossible one for a Montevideo advert.
    expect(pinFits({ latitude: -34.9626271, longitude: -54.941175 }, "Montevideo")).toBe(false);
    expect(pinFits({ latitude: -34.9626271, longitude: -54.941175 }, "Maldonado")).toBe(true);
  });
});

describe("which pin locates a property", () => {
  const offer = (listingId: string, source = "mercadolibre") => ({ listingId, source }) as RentalProperty["offers"][number];
  const property = (offers: RentalProperty["offers"], latitude: number | null = null) =>
    ({ department: "Montevideo", latitude, offers }) as Pick<RentalProperty, "department" | "latitude" | "offers">;
  const pins = new Map<string, RentalPin>([
    ["MLU2", { latitude: -34.90, longitude: -56.18 }],
    ["MLU1", { latitude: -34.91, longitude: -56.16 }],
    ["MLU9", { latitude: -34.96, longitude: -54.94 }],
  ]);

  it("never moves a point another portal published", () => {
    expect(pinFor(property([offer("MLU1")], -34.88), pins, "mercadolibre")).toBeNull();
  });

  it("takes the lowest listing id, so the point does not hop between runs", () => {
    expect(pinFor(property([offer("MLU2"), offer("INF7", "infocasas"), offer("MLU1")]), pins, "mercadolibre")).toEqual(pins.get("MLU1"));
  });

  it("skips a pin that cannot be in the property's department", () => {
    expect(pinFor(property([offer("MLU9")]), pins, "mercadolibre")).toBeNull();
    expect(pinFor(property([offer("MLU9"), offer("MLU2")]), pins, "mercadolibre")).toEqual(pins.get("MLU2"));
  });
});
