import { describe, expect, it } from "vitest";
import { listPriceOf } from "../../classes/retail/price";
import { mlSellerKey, mlToListing } from "../../classes/retail/sources/mercadolibre";

describe("precio tachado", () => {
  it("sólo existe cuando es mayor que el precio", () => {
    expect(listPriceOf(12993, 14990)).toBe(14990);
    expect(listPriceOf(12993, 12993)).toBeNull();
    expect(listPriceOf(12993, 9000)).toBeNull();
    expect(listPriceOf(12993, null)).toBeNull();
    expect(listPriceOf(12993, Number.NaN)).toBeNull();
  });

  it("MercadoLibre guarda original_amount como listPrice", () => {
    const listing = mlToListing(
      {
        id: "MLU1479683002",
        catalog_product_id: "MLU58584611",
        title: "Aire Acondicionado Futura 12000 Btu Fut-12aa-c Split",
        permalink: "https://www.mercadolibre.com.uy/x/p/MLU58584611",
        condition: "Nuevo",
        price: { amount: 12993, currency: "UYU", original_amount: 14990 },
        seller: { name: "NATIONAL PLUS +", official_store: true },
      },
      "2026-09-16T00:00:00.000Z"
    );
    expect(listing?.listPrice).toBe(14990);
    expect(listing?.officialStore).toBe(true);
  });
});

describe("clave de vendedor de MercadoLibre", () => {
  it("usa el id cuando viene", () => {
    expect(mlSellerKey({ id: 250646458, name: "DIMM" })).toBe("ml:250646458");
  });
  it("sin id, usa el nombre: dos vendedores distintos no colapsan en ml:unknown", () => {
    expect(mlSellerKey({ name: "NATIONAL PLUS +" })).toBe("ml:n:national-plus");
    expect(mlSellerKey({ name: "Estación hogar" })).toBe("ml:n:estacion-hogar");
    expect(mlSellerKey({ name: "NATIONAL PLUS +" })).not.toBe(mlSellerKey({ name: "Estación hogar" }));
  });
  it("sin id ni nombre queda ml:unknown", () => {
    expect(mlSellerKey(undefined)).toBe("ml:unknown");
    expect(mlSellerKey({})).toBe("ml:unknown");
  });
});
