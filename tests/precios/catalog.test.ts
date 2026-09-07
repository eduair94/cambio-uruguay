import { describe, expect, it } from "vitest";
import { chainKey, chainOf, departmentOf, normalizeArticle, normalizeStore } from "../../classes/precios/catalog";

describe("departmentOf", () => {
  it("saca el departamento de la localidad del origen", () => {
    // Formato medido: "Montevideo, MONTEVIDEO " (con espacio final).
    expect(departmentOf("Montevideo, MONTEVIDEO ")).toBe("Montevideo");
    expect(departmentOf("Florida, FLORIDA ")).toBe("Florida");
    expect(departmentOf("Ciudad de la Costa, CANELONES")).toBe("Canelones");
    expect(departmentOf("Treinta y Tres, TREINTA Y TRES ")).toBe("Treinta y Tres");
    // El origen manda los departamentos SIN tilde; el catalogo propio las pone.
    expect(departmentOf("Paysandu, PAYSANDU ")).toBe("Paysandú");
  });

  it("no inventa un departamento", () => {
    expect(departmentOf("")).toBe("");
    expect(departmentOf("Sin datos")).toBe("");
  });
});

describe("chainOf", () => {
  it("parte cadena y sucursal", () => {
    expect(chainOf("Ta - Ta - Suc. Cerro")).toEqual({ chain: "Ta - Ta", branch: "Cerro" });
    expect(chainOf("Red Market- Suc. Nº 11 - Los Bulevares")).toEqual({
      chain: "Red Market",
      branch: "Nº 11 - Los Bulevares",
    });
    expect(chainOf("SUPERMERCADO LA RANITA- Suc.")).toEqual({ chain: "SUPERMERCADO LA RANITA", branch: "" });
  });

  it("un local sin sucursal es su propia cadena", () => {
    expect(chainOf("Supermercado El Grillito")).toEqual({ chain: "Supermercado El Grillito", branch: "" });
  });
});

describe("chainKey", () => {
  it("une la misma cadena escrita de dos maneras", () => {
    // Medido sobre los 749 locales del catalogo: "Farmashop" 123 veces y
    // "FARMASHOP" otras 29. Sin esto el ranking la publica dos veces, con dos
    // canastas distintas y ninguna completa.
    expect(chainKey("Farmashop")).toBe(chainKey("FARMASHOP"));
    expect(chainKey("Ta - Ta")).toBe(chainKey("ta - ta"));
  });

  it("no une cadenas que son formatos distintos", () => {
    expect(chainKey("Devoto")).not.toBe(chainKey("Devoto Express"));
  });
});

describe("normalizeArticle", () => {
  it("separa grupo y variante y parsea el envase", () => {
    const article = normalizeArticle({
      unidad: " 900.0 Mililitros",
      name: "Aceite de girasol - Óptimo",
      imagen: "7209.png",
      id: 1,
      cantidad: 1,
      desc: "",
    });
    expect(article).toMatchObject({ id: 1, group: "Aceite de girasol", variant: "Óptimo", qty: 900, unit: "ml" });
  });

  it("un nombre sin separador es su propio grupo", () => {
    const article = normalizeArticle({
      unidad: " 1.0 Kilogramo",
      name: "Azúcar blanco Azucarlito",
      imagen: null,
      id: 24,
    });
    expect(article.group).toBe("Azúcar blanco Azucarlito");
    expect(article.variant).toBe("");
  });
});

describe("normalizeStore", () => {
  it("mapea x a latitud e y a longitud", () => {
    // El origen usa x = latitud, y = longitud. Invertirlo pone Uruguay en el mar.
    const store = normalizeStore({
      web: "",
      name: "EXPRES 2- Suc. 2",
      direccion: "Avda. Millán 2683",
      x: -34.87664031030553,
      y: -56.18753242466486,
      localidad: "Montevideo, MONTEVIDEO ",
      tel: "22040426",
      id: 1,
    });
    expect(store.lat).toBeLessThan(-30);
    expect(store.lat).toBeGreaterThan(-36);
    expect(store.lon).toBeLessThan(-53);
    expect(store.department).toBe("Montevideo");
    expect(store.chain).toBe("EXPRES 2");
  });

  it("un local sin coordenada queda con lat/lon en null", () => {
    // Medido: 18 de 749 locales no traen coordenada. Existen, pero no pueden
    // entrar en una consulta por radio.
    const store = normalizeStore({ name: "X", direccion: "Y", x: null, y: null, localidad: "Salto, SALTO ", id: 9 });
    expect(store.lat).toBeNull();
    expect(store.lon).toBeNull();
  });
});
