import { describe, expect, it } from "vitest";
import {
  mlDetailExpenses,
  mlPinFits,
  mlPinFor,
  parseMlRentalExpenses,
  parseMlRentalPin,
  prioritizeMlDetailTargets,
  type MlDetailTarget,
  type MlRentalPin,
} from "../../classes/rentals/mlDetail";
import type { RentalProperty } from "../../classes/rentals/types";

// The spec table of a Mercado Libre rental item page, as served on 2026-10-08 (MLU-695924825).
const specRow = (value: string) =>
  `<tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">Gastos comunes</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_2jnslb5alcj1qpa_"><span id="_R_2jnslb5alcj1qpa_-value" class="andes-table__column--value" style="">${value}</span></td></tr>`;
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
    expect(mlPinFits({ latitude: -34.9053785, longitude: -56.1858464 }, "Montevideo")).toBe(true);
    // Punta del Este: a fine pin for Maldonado, an impossible one for a Montevideo advert.
    expect(mlPinFits({ latitude: -34.9626271, longitude: -54.941175 }, "Montevideo")).toBe(false);
    expect(mlPinFits({ latitude: -34.9626271, longitude: -54.941175 }, "Maldonado")).toBe(true);
  });
});

describe("which pin locates a property", () => {
  const offer = (listingId: string, source = "mercadolibre") => ({ listingId, source }) as RentalProperty["offers"][number];
  const property = (offers: RentalProperty["offers"], latitude: number | null = null) =>
    ({ department: "Montevideo", latitude, offers }) as Pick<RentalProperty, "department" | "latitude" | "offers">;
  const pins = new Map<string, MlRentalPin>([
    ["MLU2", { latitude: -34.90, longitude: -56.18 }],
    ["MLU1", { latitude: -34.91, longitude: -56.16 }],
    ["MLU9", { latitude: -34.96, longitude: -54.94 }],
  ]);

  it("never moves a point another portal published", () => {
    expect(mlPinFor(property([offer("MLU1")], -34.88), pins)).toBeNull();
  });

  it("takes the lowest listing id, so the point does not hop between runs", () => {
    expect(mlPinFor(property([offer("MLU2"), offer("INF7", "infocasas"), offer("MLU1")]), pins)).toEqual(pins.get("MLU1"));
  });

  it("skips a pin that cannot be in the property's department", () => {
    expect(mlPinFor(property([offer("MLU9")]), pins)).toBeNull();
    expect(mlPinFor(property([offer("MLU9"), offer("MLU2")]), pins)).toEqual(pins.get("MLU2"));
  });
});
