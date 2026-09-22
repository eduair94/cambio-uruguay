import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  acceptGeocode,
  addressCandidates,
  fbRentalDetailFromTexts,
  geocodeQuery,
  locateFacebookRental,
} from "../../classes/rentals/facebookDetail";

const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "fb-rental-item.json"), "utf8");
const ID = "1062684566574053";
const READ_AT = "2026-09-22T06:00:00.000Z";

describe("fbRentalDetailFromTexts", () => {
  it("reads the description and the pin's city, sanitized, without the seller", () => {
    const detail = fbRentalDetailFromTexts(ID, [fixture], READ_AT);
    expect(detail).toMatchObject({ id: ID, readAt: READ_AT, found: true, title: "SE ALQUILA APARTAMENTO EN CERRITO DE LA VICTORIA", pinCity: "Montevideo", pinPostal: "11800", isLive: true });
    expect(detail.pinLat).toBeCloseTo(-34.8843, 3);
    expect(detail.description).toContain("Guillermo Rodriguez esquina San Martin");
    expect(detail.description).not.toContain("099 123 456");
    expect(detail.description).not.toContain("example.com");
    expect(JSON.stringify(detail)).not.toContain("SELLER NAME");
    expect(JSON.stringify(detail)).not.toContain("OTHER LISTING");
  });

  it("says found: false for a page without that listing, and survives garbage", () => {
    expect(fbRentalDetailFromTexts("1", [fixture], READ_AT)).toMatchObject({ found: false, description: "" });
    expect(fbRentalDetailFromTexts(ID, ["<html>", "for (;;);{not json", ""], READ_AT).found).toBe(false);
  });
});

describe("addressCandidates", () => {
  it("keeps corners and numbered addresses behind a locative anchor", () => {
    expect(addressCandidates("Se alquila apartamento interior, en Cerrito de la Victoria, sobre calle Guillermo Rodriguez esquina San Martin.\nCuenta con 1 dormitorio."))
      .toEqual(["Guillermo Rodriguez esquina San Martin"]);
    expect(addressCandidates("🏡 NUEVO INGRESO | CASA EN ALQUILER 📍 Roger Balet entre Solano García y Bruno Goyeneche – 2 dormitorios"))
      // The block's street plus one cross street: enough for an intersection, never a sentence.
      .toEqual(["Roger Balet entre Solano García"]);
    expect(addressCandidates("Alquiler de apto dirección Felipe Argentó 467")).toEqual(["Felipe Argentó 467"]);
    expect(addressCandidates("Apartamento en alquiler en Instrucciones y Millán. Paso de las Duranas.")).toEqual(["Instrucciones y Millán"]);
    // The dot of "Av." is not a sentence end.
    expect(addressCandidates("📍 Ubicado sobre Tacuarembó y Av. 18 de Julio, a metros de todo")).toEqual(["Tacuarembó y Av 18 de Julio"]);
  });

  it("refuses a 'y' between words of the dwelling, distances and prices", () => {
    expect(addressCandidates("Privacidad y tranquilidad para Estudiar. Habitación individual en casa de familia")).toEqual([]);
    expect(addressCandidates("2 dormitorios amplios y bien ventilados, en un entorno tranquilo")).toEqual([]);
    expect(addressCandidates("Alquilo casa en pleno centro. A 100 mts de Gral Flores y 200 mts del puerto.")).toEqual([]);
    expect(addressCandidates("Superficie de 58 m2 y 2 baños en el piso 3")).toEqual([]);
    expect(addressCandidates("Precio 25000 pesos, en la calle desde el 2026")).toEqual([]);
  });
});

describe("acceptGeocode", () => {
  const result = (formatted: string, type: string, lat = -34.87, lng = -56.13) => ({ formatted_address: formatted, geometry: { location: { lat, lng }, location_type: type } });

  it("accepts a real intersection that shares a word with the query", () => {
    expect(acceptGeocode("Etchegaray y Morelli, Montevideo, Uruguay", result("Doctor Juan B. Morelli & Jose de Echegaray, 11400 Montevideo, Uruguay", "GEOMETRIC_CENTER")))
      .toEqual({ latitude: -34.87, longitude: -56.13, address: "Doctor Juan B. Morelli & Jose de Echegaray, 11400 Montevideo, Uruguay" });
  });

  it("refuses the centroid of a single street, which is Google's fallback for a corner it cannot find", () => {
    expect(acceptGeocode("Guillermo Rodríguez esquina San Martín, Montevideo, Uruguay", result("Gral. Jose de San Martin, 15000 Montevideo, Uruguay", "GEOMETRIC_CENTER", -34.8592, -56.0516))).toBeNull();
    expect(acceptGeocode("Zelmar Michelini y Cecilia Barrios, Durazno, Uruguay", result("Cecilia Barrios, 97000 Durazno, Uruguay", "GEOMETRIC_CENTER"))).toBeNull();
  });

  it("accepts a rooftop only when its number was in the text", () => {
    expect(acceptGeocode("Las Piedras 393, Salto, Uruguay", result("Las Piedras 393, 50000 Salto, Uruguay", "ROOFTOP", -31.39, -57.96))).not.toBeNull();
    expect(acceptGeocode("Basilio Araujo y Celedonio Rojas, Treinta y Tres, Uruguay", result("Cap. Basilio Araújo 2026, 33000 Treinta y Tres, Uruguay", "RANGE_INTERPOLATED", -33.23, -54.38))).toBeNull();
    expect(acceptGeocode("Lecocq entre Aparicio Saravia y Alveniz, Montevideo, Uruguay", result("Carlos Maria Herrera 974, 11900 Montevideo, Uruguay", "ROOFTOP"))).toBeNull();
  });

  it("refuses anything outside Uruguay or without a coordinate", () => {
    expect(acceptGeocode("Etchegaray y Morelli, Montevideo, Uruguay", result("Morelli & Echegaray", "GEOMETRIC_CENTER", -34.6, -60.0))).toBeNull();
    expect(acceptGeocode("x", null)).toBeNull();
    expect(acceptGeocode("x", { formatted_address: "Morelli & Echegaray" })).toBeNull();
  });

  it("builds the query with the card's city", () => {
    expect(geocodeQuery("Etchegaray y Morelli", "Montevideo")).toBe("Etchegaray y Morelli, Montevideo, Uruguay");
    expect(geocodeQuery("Roger Balet y Solano García", "Paysandú")).toBe("Roger Balet y Solano García, Paysandú, Uruguay");
    expect(geocodeQuery("Etchegaray y Morelli", "")).toBe("Etchegaray y Morelli, Montevideo, Uruguay");
  });
});

describe("locateFacebookRental", () => {
  it("prefers the title, then the description, then the card's own town", () => {
    expect(locateFacebookRental({ title: "Alquiler en Buceo", description: "en Pocitos", department: "Montevideo" })).toEqual({ neighborhood: "Buceo", department: "Montevideo" });
    expect(locateFacebookRental({ title: "Alquiler apartamento 2 dormitorios", description: "Casa en alquiler \nZona Piedras Blancas \nA media cuadra de José Belloni", department: "Montevideo" }))
      .toEqual({ neighborhood: "Piedras Blancas", department: "Montevideo" });
    expect(locateFacebookRental({ title: "Alquiler apartamento", description: "", department: "Canelones", cardNeighborhood: "Ciudad De La Costa" }))
      .toEqual({ neighborhood: "Ciudad De La Costa", department: "Canelones" });
    // The area of a geocoded corner outranks the card's town, never the text.
    expect(locateFacebookRental({ title: "Alquiler apartamento", description: "esquina Juan Arteaga y José Revuelta", department: "Montevideo", detailNeighborhood: "Cerrito" }))
      .toEqual({ neighborhood: "Cerrito", department: "Montevideo" });
    expect(locateFacebookRental({ title: "Alquiler en Buceo", description: "", department: "Montevideo", detailNeighborhood: "Cerrito" }).neighborhood).toBe("Buceo");
  });

  it("fills a missing department from the pin's city, and from a unique locality, never from a generic word", () => {
    expect(locateFacebookRental({ title: "Alquiler 1 dormitorio en Centro", description: "", department: "", pinCity: "Montevideo" })).toEqual({ neighborhood: "Centro", department: "Montevideo" });
    expect(locateFacebookRental({ title: "Alquiler anual casa Piriápolis", description: "", department: "", pinCity: null })).toEqual({ neighborhood: "Piriápolis", department: "Maldonado" });
    expect(locateFacebookRental({ title: "Alquiler en Centro", description: "", department: "", pinCity: null })).toEqual({ neighborhood: "", department: "" });
  });
});
