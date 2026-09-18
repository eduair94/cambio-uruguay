import { describe, expect, it } from "vitest";
import { PHONE_SPEC, PHONE_STORE_KEYS } from "../../classes/phones/spec";
import { RETAIL_STORES } from "../../classes/retail/stores";
import { IDENTIFY_FIXTURES, NOT_PHONE_TITLES, NULL_IDENTITY_TITLES } from "./fixtures/titles";

describe("PHONE_SPEC.accept", () => {
  it("acepta todos los títulos positivos de la Task 1", () => {
    for (const fixture of IDENTIFY_FIXTURES) {
      expect(PHONE_SPEC.accept(fixture.title), fixture.title).toBe(true);
    }
  });

  it("rechaza accesorios, clones y marcas no soportadas (isPhoneTitle false)", () => {
    for (const title of NOT_PHONE_TITLES) {
      expect(PHONE_SPEC.accept(title), title).toBe(false);
    }
  });

  it("rechaza títulos con marca reconocida pero sin identidad completa (identifyPhone null)", () => {
    for (const title of NULL_IDENTITY_TITLES) {
      expect(PHONE_SPEC.accept(title), title).toBe(false);
    }
  });

  it("acceptFromCategory es el mismo accept: una categoría de ML ya angosta no necesita una regla más laxa", () => {
    expect(PHONE_SPEC.acceptFromCategory).toBe(PHONE_SPEC.accept);
  });
});

describe("PHONE_SPEC.urlHint", () => {
  const hint = PHONE_SPEC.urlHint!;

  it("acepta URLs de celular reales", () => {
    const urls = [
      "https://tienda.example.com.uy/catalogo/celular-apple-iphone-17-pro-256gb-azul_1_1",
      "https://tienda.example.com.uy/catalogo/samsung-galaxy-s26-fe-5g-128gb-pistachio_2_2",
      "https://tienda.example.com.uy/catalogo/celular-motorola-razr-70-512gb-negro_3_3",
      "https://tienda.example.com.uy/catalogo/celular-xiaomi-redmi-a5-64gb-azul_4_4",
    ];
    for (const url of urls) expect(hint.test(url), url).toBe(true);
  });

  it("rechaza URLs que el hint promete rechazar (accesorios, otras categorías)", () => {
    const urls = [
      "https://tienda.example.com.uy/catalogo/monopatin-electrico-xiaomi-scooter-5_5_5",
      "https://tienda.example.com.uy/catalogo/auriculares-bluetooth-honor-choice_6_6",
    ];
    for (const url of urls) expect(hint.test(url), url).toBe(false);
  });

  it("acepta las siete marcas sin convención de URL propia (oppo/realme/tcl/zte/nokia/infinix/tecno)", () => {
    const urls = [
      "https://tienda.example.com.uy/catalogo/celular-oppo-a80-256gb_1_1",
      "https://tienda.example.com.uy/catalogo/tcl-smart-tv-55-pulgadas-4k_7_7",
    ];
    for (const url of urls) expect(hint.test(url), url).toBe(true);
    // El hint es un control de costo, no un filtro: acepta la URL de un TV TCL a propósito (ninguna
    // convención de URL distingue "tcl-celular" de "tcl-tv"), pero PHONE_SPEC.accept() sigue
    // rechazando el TÍTULO real, porque "tv" está en la lista de accesorios/no-celulares.
    expect(PHONE_SPEC.accept("TCL Smart TV 55 Pulgadas 4K")).toBe(false);
  });
});

describe("PHONE_STORE_KEYS", () => {
  const byKey = new Map(RETAIL_STORES.map((store) => [store.key, store]));

  it("toda clave existe en RETAIL_STORES", () => {
    for (const key of PHONE_STORE_KEYS) {
      expect(byKey.has(key), `PHONE_STORE_KEYS tiene "${key}", que no está en RETAIL_STORES`).toBe(true);
    }
  });

  it("no repite claves", () => {
    expect(new Set(PHONE_STORE_KEYS).size).toBe(PHONE_STORE_KEYS.length);
  });

  it("toda tienda listada está habilitada", () => {
    for (const key of PHONE_STORE_KEYS) {
      expect(byKey.get(key)?.enabled, key).toBe(true);
    }
  });

  it("incluye las tiendas nuevas y las ya registradas que venden celulares, y deja afuera las medidas sin celulares", () => {
    for (const key of [
      "claro",
      "zonatecno",
      "nstore",
      "zonalaptop",
      "market",
      "magiccenter",
      "digitalworld",
      "dimm",
      "covercompany",
    ]) {
      expect(PHONE_STORE_KEYS, key).toContain(key);
    }
    // Medidas y descartadas: la API respondió bien pero ninguna vendía un celular real (ver el
    // comentario fechado en classes/phones/spec.ts).
    expect(PHONE_STORE_KEYS).not.toContain("thotcomputacion");
    expect(PHONE_STORE_KEYS).not.toContain("tyt");
  });
});
