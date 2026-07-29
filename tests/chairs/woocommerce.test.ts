import { describe, expect, it } from "vitest";
import { parseWooProducts, wooPrice } from "../../classes/chairs/sources/woocommerce";

/** What Prontometal's Store API actually answers: its theme prints cart icons before the JSON. */
const BODY_WITH_THEME_MARKUP = `<span class="mk-button-icon"><svg class="mk-svg-icon" data-name="mk-moon-cart-2" viewBox="0 0 512 512"><path d="M423.609 288c17.6 0"/></svg></span>[{"id":52859,"name":"Silla de escritorio Di Trevi Luxury","permalink":"https://prontometal.com.uy/producto/silla-de-escritorio-di-trevi-luxury/","prices":{"price":"229","currency_code":"USD","currency_minor_unit":0}}]`;

describe("parseWooProducts", () => {
  it("recovers the catalogue from a body that is not clean JSON", () => {
    const products = parseWooProducts(BODY_WITH_THEME_MARKUP)!;
    expect(products).toHaveLength(1);
    expect(products[0]!.name).toBe("Silla de escritorio Di Trevi Luxury");
  });

  it("still reads a store that answers plain JSON", () => {
    expect(parseWooProducts('[{"id":1,"name":"Silla"}]')![0]!.name).toBe("Silla");
    expect(parseWooProducts("[]")).toEqual([]);
  });

  it("reports nothing usable rather than half a catalogue", () => {
    expect(parseWooProducts(null)).toBeNull();
    expect(parseWooProducts("<html>404</html>")).toBeNull();
    expect(parseWooProducts('[{"id":1,')).toBeNull();
    // The Store API answers an object for an error; only an array is a product list.
    expect(parseWooProducts('{"code":"woocommerce_rest_invalid_page"}')).toBeNull();
  });
});

describe("wooPrice", () => {
  it("leaves a price alone when the store publishes no minor units", () => {
    // Prontometal quotes USD with `currency_minor_unit: 0`, so 229 is 229 and not 2.29.
    expect(wooPrice({ price: "229", currency_code: "USD", currency_minor_unit: 0 })).toBe(229);
  });
});
