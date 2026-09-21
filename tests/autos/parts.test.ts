import { describe, expect, it } from "vitest";
import { IS_A_PART } from "../../classes/autos/sources/common";
import { fold } from "../../classes/autos/normalize";

const isPart = (title: string): boolean => IS_A_PART.test(fold(title).trim());

describe("IS_A_PART", () => {
  it("reconoce el repuesto cuando es el SUJETO del titulo", () => {
    // Los dos que estaban publicados como autos (medido 2026-09-21).
    expect(isPart("Techo De Chevrolet S10 Doble Cabina Nuevo Original, Unico")).toBe(true);
    expect(isPart("Butacas Fiat 147")).toBe(true);
    expect(isPart("Paragolpes delantero Gol trend")).toBe(true);
    expect(isPart("Opticas Peugeot 208 originales")).toBe(true);
  });

  it("no toca un auto que MENCIONA la pieza como equipamiento", () => {
    // Medido: 556 de 19.026 titulos contienen una palabra de repuesto, y los mas caros son autos.
    expect(isPart("Jeep Wrangler Rubicon 3.0 Turbo Diesel - Unico En El Pais")).toBe(false);
    expect(isPart("Kia Carnival 3.3 V6 Ex Cuero Techo Ay.estac. 8 Pax. At")).toBe(false);
    expect(isPart("Bmw Serie 4 3.0 435i Gran Coupe Techo Rigido 306cv")).toBe(false);
    expect(isPart("Hyundai Tucson 1.6t Gdi Limited Techo At")).toBe(false);
    expect(isPart("Al Dia, Cubiertas, Frenos Y Amortiguadores Nuevos, Alarma")).toBe(false);
    expect(isPart("Peugeot 206 Xr Break Rural 5 Puertas")).toBe(false);
  });

  it("no confunde un auto con el motor rehecho con un motor suelto", () => {
    // "Motor" quedo AFUERA de la lista a proposito: este aviso es un Toyota Echo con libreta y deuda.
    expect(isPart("Motor Echo Ase 2 Años Libreta Títulos Tiene Deuda")).toBe(false);
    expect(isPart("Motor 1.0, Motor Hecho A Nuevo, Chapa Impecable, Lib. Y Tit")).toBe(false);
  });
});
