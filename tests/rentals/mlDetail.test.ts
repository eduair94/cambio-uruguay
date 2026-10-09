import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyGallery } from "../../classes/rentals/detailImages";
import { pinFits, pinFor, type RentalPin } from "../../classes/rentals/detailPins";
import {
  mlDetailExpenses,
  mlDetailIsCurrent,
  mlPhotoKey,
  mlPictureId,
  parseMlRentalBedrooms,
  parseMlRentalExpenses,
  parseMlRentalImages,
  parseMlRentalPin,
  prioritizeMlDetailTargets,
  type MlDetailTarget,
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
    const row = { ok: true, readAt: "2026-10-08T12:00:00.000Z", latitude: null, images: [] as string[] };
    expect(mlDetailIsCurrent(row, fresh)).toBe(true);
    expect(mlDetailIsCurrent({ ...row, images: undefined }, fresh)).toBe(false);
    expect(mlDetailIsCurrent({ ...row, latitude: undefined }, fresh)).toBe(false);
    expect(mlDetailIsCurrent({ ...row, readAt: "2026-09-01T12:00:00.000Z" }, fresh)).toBe(false);
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
