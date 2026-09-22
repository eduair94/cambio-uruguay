import { describe, expect, it } from "vitest";
import { INE_DISPLAY_NAMES } from "../../classes/propertyzones/names";
import {
  KNOWN_NEIGHBORHOODS,
  NOT_ADVERTISED_INE_NAMES,
  neighborhoodFromText,
} from "../../classes/rentals/neighborhoods";

describe("neighborhoodFromText", () => {
  it("reads the barrio the advert itself names, in the dictionary's spelling", () => {
    expect(neighborhoodFromText("Alquiler de Apartamento en Buceo ( 1 Dormitorio)", "Montevideo"))
      .toEqual({ neighborhood: "Buceo", department: "Montevideo" });
    expect(neighborhoodFromText("ALQUILER APARTAMENTO 3 DORMITORIOS, 2 BAÑOS EN TRES CRUCES", "Montevideo")?.neighborhood).toBe("Tres Cruces");
    expect(neighborhoodFromText("Alquiler apartamento 2 dormitorios. Palermo", "Montevideo")?.neighborhood).toBe("Palermo");
    expect(neighborhoodFromText("Alquiler Apartamento Dos Dormitorios Aguada", "Montevideo")?.neighborhood).toBe("Aguada");
    expect(neighborhoodFromText("Alquilo Apartamento Malvin Sur 2 Dormitorios", "Montevideo")?.neighborhood).toBe("Malvín");
    expect(neighborhoodFromText("APTO EN ALQUILER CORDÓN SUR, leer descripción", "Montevideo")?.neighborhood).toBe("Cordón");
  });

  it("prefers the longest name: a sub-barrio is not its parent", () => {
    expect(neighborhoodFromText("Alquiler Apartamento 2 Dormitorios Pocitos Nuevo", "Montevideo")?.neighborhood).toBe("Pocitos Nuevo");
    expect(neighborhoodFromText("Alquiler monoambiente Puerto Buceo", "Montevideo")?.neighborhood).toBe("Puerto Buceo");
    expect(neighborhoodFromText("Traspaso de alquiler - Malvin Norte", "Montevideo")?.neighborhood).toBe("Malvín Norte");
    expect(neighborhoodFromText("Alquilo cerrito de la victoria", "Montevideo")?.neighborhood).toBe("Cerrito de la Victoria");
    expect(neighborhoodFromText("Alquiler Apartamento Villa Dolores, Montevideo", "Montevideo")?.neighborhood).toBe("Villa Dolores");
  });

  it("accepts a generic word only behind a locative cue", () => {
    expect(neighborhoodFromText("Alquiler 1 dormitorio en Centro", "Montevideo")?.neighborhood).toBe("Centro");
    expect(neighborhoodFromText("Alquiler apartamento 3 dormitorios 2 baños en el Centro", "Montevideo")?.neighborhood).toBe("Centro");
    expect(neighborhoodFromText("ALQUILER DE APARTAMENTO EN LA UNIÓN (2 dormitorios)", "Montevideo")?.neighborhood).toBe("Unión");
    expect(neighborhoodFromText("ALQUILO | Apartamento 2 Dormitorios Zona Colón con Garage.", "Montevideo")?.neighborhood).toBe("Colón");
    expect(neighborhoodFromText("Casa en alquiler barrio manga", "Montevideo")?.neighborhood).toBe("Manga");
    expect(neighborhoodFromText("Alquiler de Casita . A metros de Nuevo centro Shopping", "Montevideo")).toBeNull();
    expect(neighborhoodFromText("Se alquila habitación a 8 cuadras de plaza colon", "Montevideo")).toBeNull();
    expect(neighborhoodFromText("Apartamento, Centro", "Montevideo")).toBeNull();
  });

  it("does not read a street corner as a barrio", () => {
    expect(neighborhoodFromText("Casa en alquiler en Roosevelt y Arostegui", "Maldonado")).toBeNull();
    expect(neighborhoodFromText("Alquilo casa sobre la calle Figurita a metros de Garibaldi", "Montevideo")).toBeNull();
    expect(neighborhoodFromText("Alquiler de 2 Dormitorios sobre Propios , aires puros .!", "Montevideo")?.neighborhood).toBe("Aires Puros");
    expect(neighborhoodFromText("Alquiler Apartamento Ciudad Vieja (25 de Mayo y Guarani )", "Montevideo")?.neighborhood).toBe("Ciudad Vieja");
  });

  it("refuses a name that only exists in another department than the card's", () => {
    expect(neighborhoodFromText("Monoambiente en Paso Carrasco leer abajo", "Montevideo")).toBeNull();
    expect(neighborhoodFromText("Alquiler - Casa en Montes de Solymar", "Montevideo")).toBeNull();
    expect(neighborhoodFromText("Alquiler en el centro de Pando", "Montevideo")).toBeNull();
    // The same spelling in two departments is not a contradiction: the card's department decides.
    expect(neighborhoodFromText("Alquiler apartamento en La Paloma", "Montevideo")).toEqual({ neighborhood: "La Paloma", department: "Montevideo" });
    expect(neighborhoodFromText("Alquiler casa en La Paloma", "Rocha")).toEqual({ neighborhood: "La Paloma", department: "Rocha" });
  });

  it("without a card department, names the department only when the locality is unique to one", () => {
    expect(neighborhoodFromText("Alquiler anual casa 2 dormitorios Piriápolis", "")).toEqual({ neighborhood: "Piriápolis", department: "Maldonado" });
    expect(neighborhoodFromText("Alquiler Chuy - Uruguay", "")).toEqual({ neighborhood: "Chuy", department: "Rocha" });
    expect(neighborhoodFromText("Alquiler en Bella Vista", "")).toBeNull();
    // Every town has a centre: a generic word never picks a department.
    expect(neighborhoodFromText("Alquiler en Centro", "")).toBeNull();
    expect(neighborhoodFromText("1 habitación 1 baño Casa", "")).toBeNull();
  });

  it("never returns the department itself as the barrio", () => {
    expect(neighborhoodFromText("Alquiler casa 2 dormitorios – Paysandú zona tranquila", "Paysandú")).toBeNull();
    expect(neighborhoodFromText("Alquilo apartamento en Maldonado 1 dormitorio", "Maldonado")).toBeNull();
    expect(neighborhoodFromText("Alquilo apartamento en rocha", "")).toBeNull();
    expect(neighborhoodFromText("Montevideo, Uruguay", "Montevideo")).toBeNull();
  });

  it("covers every INE 2011 barrio name, split on its comma, unless declared not advertised", () => {
    const montevideo = new Set(KNOWN_NEIGHBORHOODS.Montevideo);
    for (const label of Object.values(INE_DISPLAY_NAMES)) {
      for (const part of label.split(", ")) {
        if (NOT_ADVERTISED_INE_NAMES.has(part)) continue;
        expect(montevideo.has(part), part).toBe(true);
      }
    }
  });

  it("keeps the dictionary free of department names and duplicates within a department", () => {
    for (const [department, names] of Object.entries(KNOWN_NEIGHBORHOODS)) {
      expect(names).not.toContain(department);
      expect(new Set(names).size, department).toBe(names.length);
    }
  });
});
