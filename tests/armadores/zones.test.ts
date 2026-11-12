// Las zonas de Montevideo del directorio de armadores: cada barrio INE cae en UNA zona, los alias
// que anuncian los portales caen donde corresponde y lo que no es Montevideo ni el área
// metropolitana no recibe zona (precisión antes que cobertura).
import { describe, expect, it } from "vitest";
import { INE_DISPLAY_NAMES } from "../../classes/propertyzones/names";
import { MONTEVIDEO_ZONES, ZONE_BARRIOS, zoneOfBarrio } from "../../classes/armadores/zones";

describe("zonas de armadores", () => {
  it("pone cada barrio INE en exactamente una zona de Montevideo", () => {
    for (const label of Object.values(INE_DISPLAY_NAMES)) {
      for (const part of label.split(", ")) {
        const zones = MONTEVIDEO_ZONES.filter(zone => ZONE_BARRIOS[zone].includes(part));
        expect(zones, part).toHaveLength(1);
        expect(zoneOfBarrio(part), part).toBe(zones[0]);
      }
    }
  });

  it("ubica los alias anunciados y no distingue mayúsculas ni tildes", () => {
    expect(zoneOfBarrio("pocitos nuevo")).toBe("costa-este");
    expect(zoneOfBarrio("CORDON")).toBe("centro");
    expect(zoneOfBarrio("Paso Molino")).toBe("oeste");
    expect(zoneOfBarrio("Cruz de Carrasco")).toBe("este");
    expect(zoneOfBarrio("Colón")).toBe("norte");
  });

  it("manda el área metropolitana aparte y deja sin zona lo demás", () => {
    expect(zoneOfBarrio("Ciudad de la Costa")).toBe("metropolitana");
    expect(zoneOfBarrio("Las Piedras")).toBe("metropolitana");
    expect(zoneOfBarrio("Maldonado")).toBeNull();
    expect(zoneOfBarrio("Punta del Este")).toBeNull();
    expect(zoneOfBarrio("")).toBeNull();
  });
});
