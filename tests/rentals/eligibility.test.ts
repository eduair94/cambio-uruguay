import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { rentalEligibility, rentalPeriodEvidence, type RentalEligibilityInput } from "../../classes/rentals/eligibility";
import { isPlausibleRent, looksLikeRentalAdvert } from "../../classes/rentals/normalize";

const home = (extra: Partial<RentalEligibilityInput> = {}): RentalEligibilityInput => ({
  title: "Casa en alquiler", description: "Vivienda de un dormitorio. Sin gastos comunes.",
  currency: "UYU", price: 7000, propertyType: "casa", ...extra,
});

describe("own-advert eligibility for economical homes", () => {
  // Sanitized factual excerpts from the user's InfoCasas search, 2026-09-06. No contacts/IDs of users.
  it.each([
    ["193952249", "EN ALQUILER MONOAMBIENTE UBICADO EN EL REAL DE SAN CARLOS, COLONIA", "Monoambiente con aire acondicionado. Cocina con mobiliario bajo mesada. Unidad 10.", 7000, "apartamento"],
    ["193666397", "Casa - Carmelo", "Apto en alquiler sobre calle 18 de julio esquina rincon. Se ubica al fondo de una casa con ingreso por un lateral.", 6500, "casa"],
    ["194116585", "Casa en Carmelo", "SE ALQUILA! Monoambiente ubicado en Ruta 21 en el km260. Alejado del ruido.", 7000, "casa"],
    ["194137551", "Casa en Carmelo", "SE ALQUILA! Monoambiente con gran patio verde. Ideal tanto para vivienda permanente como para quienes buscan independencia.", 6800, "casa"],
  ])("recovers genuine cheap own rent evidence: IC%s", (_id, title, description, price, propertyType) => {
    const input = home({ title: String(title), description: String(description), price: Number(price), propertyType: String(propertyType) });
    expect(rentalEligibility(input)).toEqual({ eligible: true, reasons: [] });
    expect(isPlausibleRent(input.price, input.propertyType as "casa" | "apartamento", input)).toBe(true);
    expect(isPlausibleRent(input.price, input.propertyType as "casa" | "apartamento")).toBe(false);
  });

  it.each([
    ["190024504", "Apartamento - Manantiales", "Alquiler. Valor por fin de semana U$S 280. Ingreso viernes 15hs - Salida Domingo 15Hs.", "USD", 280, "short_term"],
    ["193564085", "Alquiler Con Muebles 3 Dormitorios", "ALQUILER MÍNIMO 10 DÍAS. Precio diario USD320. Luz, agua y gastos comunes incluidos.", "USD", 320, "short_term"],
    ["193084597", "Grecia frente a TATA (CERRO) Apartamento a $12.300", "Próximamente apartamento monoambiente disponible para alquiler. El publicado ya fue arrendado.", "UYU", 12300, "unavailable"],
    ["191162669", "Apartamento para depósito en Barrio Reus", "Apartamento en Barrio Reus, único destino permitido DEPÓSITO. Sin gastos comunes.", "UYU", 13000, "non_residential_use"],
    ["193824512", "Alquiler oficina amueblada en Ciudad Vieja", "Oficina en alquiler.", "UYU", 8000, "non_residential_use"],
    ["193596594", "OFICINA EN CIUDAD VIEJA VENTA / ALQUILER", "Opción alquiler $11000. USO EXCLUSIVO COMO OFICINA UNICAMENTE.", "UYU", 11000, "non_residential_use"],
    ["189628012", "Residencia Estudiantil O Permanente Femenina", "Residencia Estudiantil Femenina. 4 dormitorios, individual, con 2, 3 y 4 camas. Cuota mensual.", "UYU", 11300, "non_residential_use"],
    ["194147885", "Casa en Solanas", "Alquiler en Punta Ballena. ALQUILER 2026/2027: Enero completo: U$S19800. Febrero completo: U$S11000.", "UYU", 11000, "short_term"],
    ["193670541", "APARTAMENTO 1 DORMITORIO MANGA", "Se ofrecen en alquiler unidades. Actualmente hay 3 unidades disponibles: 2 de 2 dormitorios y 1 de un dormitorio. Gastos comunes 2 dormitorios $1500; 1 dormitorio $1000.", "UYU", 10900, "ambiguous_units"],
  ])("does not call a misleading category an economical monthly home: IC%s", (_id, title, description, currency, price, reason) => {
    expect(rentalEligibility(home({ title: String(title), description: String(description), currency: currency as "USD" | "UYU", price: Number(price), propertyType: "apartamento" })).reasons).toContain(reason);
  });

  it.each([
    ["Precio de alquiler: $8.000", 7000],
    ["Alquiler mensual U$S 700", 7000],
    ["Alquiler anual: USD 700", 7000],
    ["PRECIO 12000", 7000],
    ["Alquiler: $ 7.100.", 7000],
  ])("withholds contradictory own rent: %s", (description, price) => {
    expect(rentalEligibility(home({ description, price })).reasons).toContain("price_conflict");
  });

  it.each([
    "Alquiler: $ 7.000.",
    "Alquiler mensual: $7.000. Gastos comunes $1.500. Garantía 5 meses.",
    "Precio de venta USD 75000. Alquiler $7000.",
    "Garaje con alquiler $2000. Vivienda en alquiler $7000.",
    "Comisión de alquiler 1 mes. Contrato de alquiler 2 años.",
    "PLAZO DEL CONTRATO DE ALQUILER: 1 año con opción a 1 más.",
    "Casa en alquiler de 1 dormitorio con patio. Alquiler 2 dormitorios también disponible.",
    "Padrón compartido. Patio compartido. Dos dormitorios, ideal para dos personas.",
    "Edificio de 20 unidades. Se alquila únicamente el apartamento 5.",
    "No hay 3 unidades disponibles. Se alquila una sola vivienda.",
    "Transporte diario cercano. Jardín de invierno. Servicio de mucama diaria.",
    "No se alquila por día. Alquiler anual.",
    "No está alquilado. Disponible para alquiler mensual.",
    "Sin remate. Alquiler mensual.",
    "No es solo para depósito. Vivienda en alquiler.",
  ])("does not invent a conflict from other values or explicit negatives: %s", description => {
    expect(rentalEligibility(home({ description })).eligible).toBe(true);
  });

  it("does not infer residential rent from a contact footer or a sale title", () => {
    expect(rentalEligibility(home({ title: "Apartamento", description: "ALQUILERES: Oficina. VENTAS: Agencia." })).eligible).toBe(false);
    expect(rentalEligibility(home({ title: "Casa en venta", description: "Consulte por alquiler." })).eligible).toBe(false);
    expect(rentalEligibility(home({ propertyType: "oficina" })).reasons).toContain("not_residential");
  });

  it("keeps price guards source-compatible and never recovers USD90 or conflicting contexts", () => {
    expect(isPlausibleRent(3000, "casa", home({ price: 3000 }))).toBe(true);
    expect(isPlausibleRent(2999, "casa", home({ price: 2999 }))).toBe(false);
    expect(isPlausibleRent(3721, "apartamento", home({ price: 90, currency: "USD", propertyType: "apartamento", description: "Precio diario USD90" }))).toBe(false);
    expect(isPlausibleRent(6500, "casa", home({ price: 7000 }))).toBe(false);
    expect(isPlausibleRent(7000, "casa", home({ propertyType: "apartamento" }))).toBe(false);
    expect(isPlausibleRent(7000, "casa", home({ description: "Casa en remate" }))).toBe(false);
    expect(isPlausibleRent(900001, "casa", home({ price: 900001 }))).toBe(false);
    expect(isPlausibleRent(3721, "otro")).toBe(true);
  });

  it("requires monthly evidence for USD amounts rather than assuming a cheap nightly price is monthly", () => {
    expect(rentalEligibility(home({ currency: "USD", price: 250 })).eligible).toBe(false);
    expect(rentalEligibility(home({ currency: "USD", price: 250, description: "Alquiler anual USD250." })).eligible).toBe(true);
  });
  it.each(["Precio por persona $7000", "Alquiler $7000 x persona", "Habitación compartida", "Alquiler de habitación privada"])("does not turn a bed/room price into an entire home: %s", description => {
    expect(rentalEligibility(home({ title: description, description })).reasons).toContain("non_residential_use");
  });
  it("does not interpret a rental season heading as a monetary contradiction", () => {
    expect(rentalEligibility(home({ description: "ALQUILER 2026/2027: consultar fechas." })).reasons).not.toContain("price_conflict");
  });
});

describe("rental period parsing", () => {
  it.each([
    ["Alquiler x día", ""],
    ["Alquiler diario de apartamento", ""],
    ["Apartamento por noche", ""],
    ["Apartamento", "Precio diario USD320"],
    ["Apartamento", "Valor por fin de semana U$S280"],
    ["Apartamento", "Enero USD170 por día; febrero 150 x día."],
    ["Apartamento", "Alquiler USD170 diarios."],
    ["Apartamento", "Alquiler mínimo 10 días"],
    ["Apartamento", "Alquiler temporario en la playa"],
    ["Casa", "Alquiler por semana"],
    ["Casa en alquiler", "TEMPORADA 2025 - 2026\nConsulte tarifas."],
    ["Alquiler anual", "Precio diario USD320 y alquiler anual también disponible"],
  ])("rejects an explicit non-monthly price/period: %s %s", (title, description) => {
    expect(rentalPeriodEvidence(title, description).shortTerm).toBe(true);
    expect(looksLikeRentalAdvert(title, description)).toBe(false);
  });
  it.each([
    ["Casa con transporte diario", "Alquiler mensual"],
    ["Alquiler anual con jardín de invierno", "Servicio de mucama diaria"],
    ["Apartamento en alquiler anual, no temporal", ""],
    ["Alquiler anual", "No se alquila por día ni noche"],
    ["Apartamento en alquiler", "Alquiler invernal no disponible; contrato permanente"],
    ["Apartamento en alquiler", "Alquiler anual USD1000. Alquiler invernal USD750."],
  ])("preserves annual rentals and direct negatives: %s %s", (title, description) => {
    expect(looksLikeRentalAdvert(title, description)).toBe(true);
  });
});

it("keeps the frontend pure mirror semantically identical without importing outside app at runtime", () => {
  const compile = (path: string) => ts.transpileModule(readFileSync(resolve(path), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, removeComments: true },
  }).outputText;
  expect(compile("app/utils/rentalEligibility.ts")).toBe(compile("classes/rentals/eligibility.ts"));
});
