import { describe, expect, it } from "vitest";
import { mlDetailExpenses, parseMlRentalExpenses, prioritizeMlDetailTargets, type MlDetailTarget } from "../../classes/rentals/mlDetail";

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
