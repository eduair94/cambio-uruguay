import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inferPropertyType, isPlausibleRent } from "../../classes/rentals/normalize";
import { toRawRental as mercadolibre } from "../../classes/rentals/sources/mercadolibre";
import { toRawRental as infocasas } from "../../classes/rentals/sources/infocasas";
import { parseCasaswebPage } from "../../classes/rentals/sources/casasweb";
import { elpaisToRawRental } from "../../classes/rentals/sources/elpais";

describe("a rented garage is distinct from a home's parking amenity", () => {
  it.each([
    ["Alquiler de garaje en edificio de apartamentos", undefined, "garaje"],
    ["Cochera en alquiler en Pocitos", undefined, "garaje"],
    ["Se alquila garage techado", undefined, "garaje"],
    ["Apartamento con garaje", undefined, "apartamento"],
    ["Casa con cochera para dos autos", undefined, "casa"],
    ["Local comercial con estacionamiento", undefined, "local"],
    ["Oficina con garaje", undefined, "oficina"],
    ["Oportunidad en alquiler", "Garajes", "garaje"],
    ["Garage en alquiler", "Apartamento", "apartamento"],
    ["Garaje de apartamento", "Casa", "casa"],
    ["En Pocitos con garaje opcional", undefined, "otro"],
    ["Garaje y casa en alquiler", undefined, "otro"],
    ["Garaje con vivienda en alquiler", undefined, "otro"],
  ])("classifies %s with taxonomy %s as %s", (title, hint, expected) => {
    expect(inferPropertyType(title, hint)).toBe(expected);
  });

  it("keeps the existing low-price admission policy when a garage leaves other", () => {
    expect(isPlausibleRent(2_500, "garaje")).toBe(true);
    expect(isPlausibleRent(2_500, "apartamento")).toBe(false);
    expect(isPlausibleRent(1, "garaje")).toBe(false);
  });

  it("takes native InfoCasas garage categories, independently of a home's garage count", () => {
    const row = { id: 123, title: "Oportunidad en alquiler", link: "/cochera/123", price: { amount: 3500, currency: { name: "UYU" } } };
    expect(infocasas({ ...row, property_type: { name: "Garajes o Cocheras" } })?.propertyType).toBe("garaje");
    expect(infocasas({ ...row, title: "Casa en alquiler con cochera", property_type: { name: "Casa" }, garage: 1 }))
      .toMatchObject({ propertyType: "casa", parkingSpaces: 1 });
  });

  it("retains the declared Casasweb type rather than classifying every parking amenity as a garage", () => {
    const html = readFileSync(join(__dirname, "fixtures", "casasweb.html"), "utf8");
    expect(parseCasaswebPage(html)!.listings[0]).toMatchObject({ propertyType: "casa", parkingSpaces: 1 });
    const garage = html.replace(/<b>Casa/, "<b>Garaje")
      .replace("Alquiler Casa Carrasco 2 Dormitorios 3 Baños Garaje Osaka", "Alquiler garaje en edificio de apartamentos");
    expect(parseCasaswebPage(garage)!.listings[0]!.propertyType).toBe("garaje");
  });

  it("reads El País's declared garage object without treating an apartment's features as its type", () => {
    const row = { _id: "6a42b0f33b79e8db94e28523", title: "Garaje en alquiler", transactionType: "rental", status: "active", province: "Montevideo", price: { amount: 3500, currency: "UYU" } };
    expect(elpaisToRawRental({ ...row, propertyType: "garage" })?.propertyType).toBe("garaje");
    expect(elpaisToRawRental({ ...row, title: "Apartamento con garaje", propertyType: "apartment", featureIds: ["GARAGE"] })?.propertyType).toBe("apartamento");
  });

  it("refines only ML's other-property cards using an explicit standalone garage title", () => {
    const card = (title: string, category_id = "MLU6395", domain_id = "MLU-OTHER_PROPERTIES_FOR_RENT") => ({
      metadata: { id: "MLU123456789", category_id, domain_id, url_params: new URLSearchParams({ permalink: "https://inmueble.mercadolibre.com.uy/MLU-123456789-garaje", title }).toString() },
      components: [{ type: "price", price: { current_price: { value: 3500, currency: "UYU" } } }],
    });
    expect(mercadolibre(card("Alquiler de garaje en edificio de apartamentos"))?.propertyType).toBe("garaje");
    expect(mercadolibre(card("Casa con garage", "MLU1467", "MLU-HOUSES_FOR_RENT"))?.propertyType).toBe("casa");
    expect(mercadolibre(card("Casa con garage"))?.propertyType).toBe("otro");
    expect(mercadolibre(card("Garage en alquiler", "MLU1473", "MLU-APARTMENTS_FOR_RENT"))?.propertyType).toBe("apartamento");
  });
});
