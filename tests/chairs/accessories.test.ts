import { describe, expect, it } from "vitest";
import { isDeskChair, looksLikeChairAccessory } from "../../classes/chairs/normalize";

describe("chairs sold WITH a part are still chairs", () => {
  it("keeps a chair whose feature list mentions casters or a footrest", () => {
    expect(isDeskChair("Silla de escritorio ergonómica con ruedas")).toBe(true);
    expect(isDeskChair("Silla gamer reclinable con apoyapiés")).toBe(true);
    expect(isDeskChair("Silla de oficina con apoyabrazos y ruedas de silicona")).toBe(true);
    expect(looksLikeChairAccessory("Lumax Eames con ruedas")).toBe(false);
    expect(looksLikeChairAccessory("Lumax Clyde apoyapies")).toBe(false);
  });
});

describe("parts sold on their own are not chairs", () => {
  it("rejects the part when the part is the product", () => {
    expect(isDeskChair("Ruedas silla escritorio set x5 silicona")).toBe(false);
    expect(isDeskChair("Set de 5 ruedas para silla de oficina")).toBe(false);
    expect(isDeskChair("Pistón de repuesto para silla de escritorio")).toBe(false);
    expect(isDeskChair("Funda para silla de escritorio")).toBe(false);
    expect(looksLikeChairAccessory("Tcweb Rueda silla", "Rueda silla")).toBe(true);
  });

  it("still rejects seating that is not for a desk", () => {
    expect(isDeskChair("Sillas apilables auditorio para oficina")).toBe(false);
    expect(isDeskChair("Silla de comedor tapizada")).toBe(false);
    expect(isDeskChair("Banqueta alta de bar")).toBe(false);
  });

  it("does not fire on a word that merely contains a banned stem", () => {
    // "barata" contains "bar"; a boundary-anchored alternation must not match it.
    expect(isDeskChair("Silla de escritorio barata ergonómica")).toBe(true);
    expect(isDeskChair("Silla de oficina económica para estudio")).toBe(true);
  });
});

describe("WooCommerce titles", () => {
  it("decodes the HTML entities WooCommerce returns", async () => {
    const { wooPrice } = await import("../../classes/chairs/sources/woocommerce");
    // "399000" in minor units of 2 is 3 990, not 399 000: reading it raw inflates prices 100x.
    expect(wooPrice({ price: "399000", currency_code: "UYU", currency_minor_unit: 2 })).toBe(3990);
    expect(wooPrice({ price: "0", currency_code: "UYU", currency_minor_unit: 2 })).toBeNull();
    expect(wooPrice(undefined)).toBeNull();
  });
});
