// Las zonas de la matriz: los 62 barrios INE de Montevideo más las localidades del área metro.
//
// La decisión que este archivo cuida es de VOCABULARIO, no de geometría: los barrios salen del mismo
// `ine2011.json` que ya usa `/alquileres-uruguay`. Si alguna vez alguien arma acá su propia lista,
// el sitio queda con dos vocabularios de barrio y el visitante que filtra alquileres por "La
// Blanqueada" no encuentra "La Blanqueada" en el comparador.
import { describe, expect, it } from "vitest";
import { loadOfficialPropertyZoneGeometry } from "../../classes/propertyzones/sources/geometry";
import { ringCentroid, transportZones, zoneSlug } from "../../classes/transporte/zones";

const zones = transportZones();

describe("transportZones", () => {
  it("son los 62 barrios del INE más las 6 localidades del área metropolitana", () => {
    expect(zones).toHaveLength(68);
    expect(zones.filter(zone => zone.kind === "ine")).toHaveLength(62);
    expect(zones.filter(zone => zone.kind === "localidad")).toHaveLength(6);
  });

  it("los barrios son EXACTAMENTE los del archivo INE que usa el resto del sitio", () => {
    // La prueba de que no hay una segunda lista: mismos nombres, mismo conteo.
    const oficiales = loadOfficialPropertyZoneGeometry().zones.map(zone => zone.name).sort();
    const propios = zones.filter(zone => zone.kind === "ine").map(zone => zone.name).sort();
    expect(propios).toEqual(oficiales);
  });

  it("toda zona tiene coordenada finita y cae dentro de Uruguay", () => {
    // Un centroide NaN no rompe nada visible: mete una zona que nunca rutea y cuyas distancias son
    // todas NaN, y la página publica guiones donde debería haber minutos.
    for (const zone of zones) {
      expect(Number.isFinite(zone.lat)).toBe(true);
      expect(Number.isFinite(zone.lon)).toBe(true);
      expect(zone.lat).toBeLessThan(-30);
      expect(zone.lat).toBeGreaterThan(-35.5);
      expect(zone.lon).toBeLessThan(-53);
      expect(zone.lon).toBeGreaterThan(-58.6);
      expect(zone.slug).toMatch(/^[a-z0-9-]+$/);
      expect(zone.name.length).toBeGreaterThan(1);
      expect(zone.department.length).toBeGreaterThan(1);
    }
  });

  it("ningún slug repetido: el slug es la clave del índice de acceso a paradas", () => {
    const slugs = zones.map(zone => zone.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("el orden es estable: Montevideo alfabético primero, el área metro después", () => {
    // El índice de zona viaja APLANADO en la matriz (`[origen, destino, modo, …]`), así que el orden
    // es parte del contrato: si cambia entre corridas, el app rehidrata pares de otras zonas.
    const montevideo = zones.filter(zone => zone.department === "Montevideo");
    expect(zones.slice(0, montevideo.length)).toEqual(montevideo);
    const nombres = montevideo.map(zone => zone.name);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, "es")));
    expect(zones[zones.length - 1]!.department).toBe("Canelones");
  });

  it("el centroide de Ciudad Vieja cae en la península, no en la bahía ni en el Centro", () => {
    // Medido el 22/9/2026: -34,904175 / -56,205344. El rectángulo es el de la península de Ciudad
    // Vieja con margen; un error de anillo (tomar un agujero del polígono en vez del borde exterior)
    // se caería de él de inmediato.
    const ciudadVieja = zones.find(zone => zone.slug === "ciudad-vieja")!;
    expect(ciudadVieja).toBeDefined();
    expect(ciudadVieja.name).toBe("Ciudad Vieja");
    expect(ciudadVieja.lat).toBeGreaterThan(-34.915);
    expect(ciudadVieja.lat).toBeLessThan(-34.895);
    expect(ciudadVieja.lon).toBeGreaterThan(-56.22);
    expect(ciudadVieja.lon).toBeLessThan(-56.195);
  });

  it("las localidades del área metro son de Canelones y traen su coordenada de ciudad", () => {
    const metro = zones.filter(zone => zone.kind === "localidad");
    expect(metro.map(zone => zone.slug)).toEqual([
      "ciudad-de-la-costa",
      "las-piedras",
      "pando",
      "la-paz",
      "barros-blancos",
      "canelones-ciudad",
    ]);
    expect(metro.every(zone => zone.department === "Canelones")).toBe(true);
  });
});

describe("ringCentroid", () => {
  it("el centro de un cuadrado es su centro", () => {
    expect(ringCentroid([[0, 0], [2, 0], [2, 2], [0, 2]])).toEqual({ lon: 1, lat: 1 });
  });

  it("no depende de que el anillo venga cerrado ni del sentido de giro", () => {
    // Los archivos GeoJSON repiten el primer punto al final y no garantizan el sentido; el área
    // firmada cambia de signo pero el centroide no puede moverse.
    const horario = ringCentroid([[0, 0], [0, 2], [2, 2], [2, 0]])!;
    const antihorario = ringCentroid([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]])!;
    expect(horario.lon).toBeCloseTo(1, 9);
    expect(horario.lat).toBeCloseTo(1, 9);
    expect(antihorario.lon).toBeCloseTo(1, 9);
    expect(antihorario.lat).toBeCloseTo(1, 9);
  });

  it("un anillo degenerado cae al promedio de los vértices en vez de dividir por cero", () => {
    // Área cero: la fórmula del centroide divide por el área y devolvería Infinity, que después
    // viaja como una zona a mitad del universo.
    const degenerado = ringCentroid([[1, 1], [1, 1], [1, 1]])!;
    expect(degenerado).toEqual({ lon: 1, lat: 1 });
    const colineal = ringCentroid([[0, 0], [1, 1], [2, 2]])!;
    expect(Number.isFinite(colineal.lat)).toBe(true);
    expect(Number.isFinite(colineal.lon)).toBe(true);
  });

  it("devuelve null cuando no hay anillo que valga", () => {
    expect(ringCentroid([])).toBeNull();
    expect(ringCentroid([[0, 0], [1, 1]])).toBeNull();
  });
});

describe("zoneSlug", () => {
  it("saca los acentos y la puntuación, y no deja guiones sueltos en las puntas", () => {
    expect(zoneSlug("La Blanqueada")).toBe("la-blanqueada");
    expect(zoneSlug("Villa Española")).toBe("villa-espanola");
    expect(zoneSlug("Bañados de Carrasco")).toBe("banados-de-carrasco");
    expect(zoneSlug("  Punta Gorda  ")).toBe("punta-gorda");
    expect(zoneSlug("Villa García - Manga Rural")).toBe("villa-garcia-manga-rural");
  });
});
