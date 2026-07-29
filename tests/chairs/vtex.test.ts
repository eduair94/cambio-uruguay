import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  readVtexCurrency,
  vtexBrand,
  vtexOffer,
  vtexPrice,
} from "../../classes/chairs/sources/vtex";

/** Trimmed copy of a real catalog_system product (El Dorado), keeping only the fields we read. */
const COUGAR = {
  productId: "32015",
  productName: "Silla Cougar Armor Elite",
  brand: "COUGAR",
  linkText: "silla-cougar-armor-elite",
  categories: ["/Electro Audio Y Tv/Electrónica e Informática/Periféricos/"],
  allSpecifications: ["Marca", "Modelo"],
  Marca: ["COUGAR"],
  Modelo: ["ARMOR ELITE"],
  items: [
    {
      itemId: "31916",
      images: [{ imageUrl: "https://eldoradouy.vteximg.com.br/arquivos/ids/1171475/1642880.jpg" }],
      sellers: [
        {
          sellerDefault: true,
          // The same price in cents rides along in `addToCartLink`; reading it publishes 100x.
          addToCartLink: "https://www.eldorado.com.uy/checkout/cart/add?sku=31916&price=1160335",
          commertialOffer: {
            Price: 11603.35,
            ListPrice: 11603.35,
            AvailableQuantity: 10,
            IsAvailable: true,
          },
        },
      ],
    },
  ],
};

describe("vtexPrice", () => {
  it("reads the decimal price VTEX publishes, never the cents copy", () => {
    expect(vtexPrice(COUGAR.items[0]!.sellers[0]!.commertialOffer)).toBe(11603.35);
  });

  it("falls back to the list price when the offer price is missing", () => {
    expect(vtexPrice({ Price: 0, ListPrice: 1890 })).toBe(1890);
  });

  it("refuses an offer with no usable price", () => {
    expect(vtexPrice(undefined)).toBeNull();
    expect(vtexPrice({})).toBeNull();
    expect(vtexPrice({ Price: -1, ListPrice: 0 })).toBeNull();
  });
});

describe("vtexOffer", () => {
  it("takes the default seller's price, stock and photo", () => {
    expect(vtexOffer(COUGAR)).toEqual({
      price: 11603.35,
      available: true,
      image: "https://eldoradouy.vteximg.com.br/arquivos/ids/1171475/1642880.jpg",
    });
  });

  it("skips SKUs nobody prices and reports an out-of-stock SKU as unavailable", () => {
    const product = {
      items: [
        { sellers: [{ sellerDefault: true, commertialOffer: { Price: 0, ListPrice: 0 } }] },
        { sellers: [{ commertialOffer: { Price: 5982.35, AvailableQuantity: 0, IsAvailable: false } }] },
      ],
    };
    expect(vtexOffer(product)).toEqual({ price: 5982.35, available: false, image: null });
  });

  it("returns nothing when no SKU has a price", () => {
    expect(vtexOffer({ items: [{ sellers: [] }] })).toBeNull();
    expect(vtexOffer({})).toBeNull();
  });
});

describe("vtexBrand", () => {
  it("keeps a real brand", () => {
    expect(vtexBrand("COUGAR")).toBe("COUGAR");
    expect(vtexBrand(" Garden  Life ")).toBe("Garden Life");
  });

  it("drops the placeholder a VTEX catalogue uses for unbranded goods", () => {
    // Kept as a brand, "OTRAS MARCAS" merges every unbranded chair in the country into one product.
    expect(vtexBrand("OTRAS MARCAS")).toBe("");
    expect(vtexBrand("Sin Marca")).toBe("");
    expect(vtexBrand(undefined)).toBe("");
  });
});

describe("decodeEntities", () => {
  it("decodes what the retailer's ERP typed into the product name", () => {
    expect(decodeEntities("Silla de oficina &#8211; Manila 984A")).toBe("Silla de oficina – Manila 984A");
    expect(decodeEntities("Silla Gamer &quot;Pro&quot; &amp; Racing")).toBe('Silla Gamer "Pro" & Racing');
    expect(decodeEntities("Silla  ergonómica \n negra ")).toBe("Silla ergonómica negra");
  });
});

describe("readVtexCurrency", () => {
  it("reads the storefront's runtime culture, then its meta tag", () => {
    expect(readVtexCurrency('{"culture":{"country":"URY","currency":"UYU","language":"es"}}')).toBe("UYU");
    expect(readVtexCurrency('<meta data-react-helmet="true" name="currency" content="USD"/>')).toBe("USD");
  });

  it("refuses to guess", () => {
    // A currency we cannot convert must skip the store, never fall back to UYU.
    expect(readVtexCurrency('{"culture":{"currency":"ARS"}}')).toBeNull();
    expect(readVtexCurrency("<html><body>Silla</body></html>")).toBeNull();
  });
});
