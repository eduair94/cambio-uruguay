import { describe, expect, it } from "vitest";
import {
  EMPTY_SPECS,
  hasFichaSpecs,
  mergeSpecs,
  mlDescription,
  mlSpecRows,
  specsFromRows,
  specsFromText,
  specsFromTitle,
} from "../../classes/movilidad/specs/parse";
import { brandFromTitle, cleanBrand } from "../../classes/movilidad/specs/brands";

// Fixtures recortadas de las fichas reales leídas el 2026-11-03. La fila de ML replica el marcado
// exacto de `ui-vpp-striped-specs` (la primera fila va tal cual vino de la página).
const REAL_ROW =
  '<tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">Marca</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_19npam8l6bcapa_"><span id="_R_19npam8l6bcapa_-value" class="andes-table__column--value" style="line-clamp:none;-webkit-line-clamp:none">Xiaomi</span></td></tr>';

const row = (label: string, value: string) =>
  `<tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left" scope="row"><div class="andes-table__header__container">${label}</div></th><td class="andes-table__column" id="x"><span id="x-value" class="andes-table__column--value" style="line-clamp:none">${value}</span></td></tr>`;

const XIAOMI6 = [
  REAL_ROW,
  row("Modelo", "6 Gl"),
  row("Tipo de batería", "Ion de litio"),
  row("Capacidad de la batería", "10 Ah"),
  row("Tiempo de carga", "8 h"),
  row("Potencia del motor", "800 W"),
  row("Velocidad máxima", "25 km/h"),
  row("Edad mínima recomendada", "16 años"),
  row("Peso máximo soportado", "120 kg"),
  row("Autonomía", "45 km"),
  row("Tamaño de las ruedas", "12 &quot;"),
  row("Es plegable", "Sí"),
  row("Con luz LED", "Sí"),
  row("Con Bluetooth", "Sí"),
  row("Sistema de frenos", "Tambor delantero + E-ABS trasero"),
  row("Largo", "1,27 m"),
  row("Peso", "26,3 kg"),
].join("");

const RP500 = [
  row("Marca", "Monopatin"),
  row("Modelo", "RP500-HAND"),
  row("Voltaje de la batería", "24V"),
  row("Capacidad de la batería", "4 Ah"),
  row("Tiempo de carga", "5 h"),
  row("Potencia del motor", "150 W"),
  row("Velocidad máxima", "15 km/h"),
  row("Edad mínima recomendada", "6 años"),
  row("Peso máximo soportado", "65 kg"),
  row("Autonomía", "15 km"),
  row("Tamaño de las ruedas", "6,5 &quot;"),
  row("Es plegable", "Sí"),
  row("Con Bluetooth", "No"),
  row("Sistema de frenos", "Eléctrico"),
  row("Largo", "100 m"),
  row("Peso", "7,7 kg"),
].join("");

const DELCAR =
  "Monopatín Eléctrico S-PRO MOVE tiene motor de 600 W (potencia máxima) y batería de ion de litio de 36V. Autonomía de 30 km, velocidad máxima de 25 km/h y soporta hasta 100 kg. Rodado 10. Colores disponibles: Gris. Rodado 10\" Colores disponibles Gris Velocidad máxima estimada 25 km/h Autonomía 30 kms Potencia del motor 300W, potencia máxima 600 W Tipo de batería Ion de litio Voltaje de la batería 36V 8Ah Peso máximo soportado 100 kg Sistema de frenos Tambor+ E-ABS Suspensión delantera DE RESORTE Iluminación FULL LED Garantía Estructura metálica: 12 meses Productos relacionados Monopatín Eléctrico S-PRO TITAN USD 1.049";

const SUPERBIKERS =
  "Con motor de 350W, rodado 10” y suspensión delantera, ofrece una conducción cómoda en ciudad. Su autonomía de hasta 25 km y plegado rápido lo hacen ideal. Monopatín Eléctrico Go-Green Mod. Concept ⚙️ Motor Potencia: 350W Tipo: Motor Brushless Tracción: Delantera 🔋 Batería Voltaje: 36V Capacidad: 7.5–10 Ah (según versión) Tiempo de carga: 4–6 horas Autonomía: 20–25 km (dependiendo del peso, terreno y velocidad) ⚡ Rendimiento Velocidad máxima: 25 km/h Modos de conducción: 3 niveles 🛞 Ruedas y Suspensión Ruedas: 8,5” (neumáticas) Suspensión delantera: Sí Suspensión trasera: No 🚦 Sistema de Frenos Freno trasero: Disco mecánico Freno delantero: Eléctrico (E-ABS) 📏 Dimensiones y Peso Peso del monopatín: 12–14 kg Capacidad máxima de carga: 100–120 kg Sistema de plegado: Rápido y compacto Pantalla: Display LED (velocidad, batería, modo)";

const VOLTBIKE =
  "Autonomía 15 Kms Batería Litio Cambios No Canasto No Capacidad Batería 36 V 7 Ah Color Negro Consumo de Energía $3 por carga Frenos De disco mecánico Garantía Cuadro 1 Años Motor 250 W Niveles de Asistencia 3 Parrilla Si Patente No Rodado 8.5 x 2.0 Tiempo de Carga Hasta 6hs.";

const COVERCOMPANY =
  "Incorpora neumáticos sin cámara de 12” con absorción de impactos, junto a un sistema de suspensión delantera de doble muelle (30 mm) y trasera de un solo muelle. Su motor sin escobillas de hasta 800 W de potencia máxima permite afrontar pendientes de hasta 18% con fluidez, mientras que su batería de 45 km de autonomía amplía el rango diario de uso. El sistema de freno doble y la resistencia al agua IPX5 completan una configuración orientada a seguridad.";

describe("mlSpecRows", () => {
  it("lee todas las filas de la tabla de la ficha", () => {
    const rows = mlSpecRows(XIAOMI6);
    expect(rows["Marca"]).toBe("Xiaomi");
    expect(rows["Autonomía"]).toBe("45 km");
    expect(rows["Tamaño de las ruedas"]).toBe('12 "');
  });

  it("lee también la forma JSON con escapes unicode", () => {
    const html = '{"id":"Autonom\\u00eda","text":"30 km"},{"id":"Velocidad m\\u00e1xima","text":"25 km/h"}';
    const rows = mlSpecRows(html);
    expect(rows["Autonomía"]).toBe("30 km");
    expect(rows["Velocidad máxima"]).toBe("25 km/h");
  });

  it("devuelve vacío para una página sin tabla", () => {
    expect(mlSpecRows("<html><body>Resultados de búsqueda</body></html>")).toEqual({});
  });
});

describe("mlDescription", () => {
  it("toma la descripción del vendedor y la de og:description", () => {
    const html =
      '<meta property="og:description" content="Batería de 10 Ah que ofrece una autonomía de 45 km"/><p class="ui-pdp-description__content">Motor de 350 W<br>Velocidad 25 km/h</p>';
    const text = mlDescription(html);
    expect(text).toContain("autonomía de 45 km");
    expect(text).toContain("Motor de 350 W");
    expect(text).toContain("Velocidad 25 km/h");
  });
});

describe("specsFromRows", () => {
  it("convierte la tabla de un Xiaomi 6 en ficha", () => {
    const specs = specsFromRows(mlSpecRows(XIAOMI6));
    expect(specs).toMatchObject({
      rangeKm: 45,
      maxSpeedKmh: 25,
      motorW: 800,
      batteryAh: 10,
      chargeHours: 8,
      maxLoadKg: 120,
      weightKg: 26.3,
      wheelInches: 12,
      foldable: true,
      bluetooth: true,
      minAge: 16,
      discBrake: false,
      brakes: "Tambor delantero + E-ABS trasero",
    });
    expect(specs.from.rangeKm).toBe("ficha");
  });

  it("calcula los Wh con voltaje y capacidad", () => {
    const specs = specsFromRows(mlSpecRows(RP500));
    expect(specs).toMatchObject({
      batteryV: 24,
      batteryAh: 4,
      batteryWh: 96,
      rangeKm: 15,
      maxSpeedKmh: 15,
      motorW: 150,
      maxLoadKg: 65,
      wheelInches: 6.5,
      weightKg: 7.7,
      bluetooth: false,
    });
  });

  it("descarta un valor fuera de banda y conserva el resto", () => {
    const specs = specsFromRows({ Peso: "260 kg", Autonomía: "30 km", "Velocidad máxima": "900 km/h" });
    expect(specs.weightKg).toBeNull();
    expect(specs.maxSpeedKmh).toBeNull();
    expect(specs.rangeKm).toBe(30);
    expect(specs.from.weightKg).toBeUndefined();
  });
});

describe("specsFromText", () => {
  it("lee la tabla rotulada de delcar sin dejar que la prosa pise la potencia nominal", () => {
    expect(specsFromText(DELCAR, "descripcion")).toMatchObject({
      motorW: 300,
      motorPeakW: 600,
      batteryV: 36,
      batteryAh: 8,
      batteryWh: 288,
      rangeKm: 30,
      maxSpeedKmh: 25,
      maxLoadKg: 100,
      wheelInches: 10,
      suspension: true,
    });
  });

  it("prefiere el par con dos puntos a la prosa y toma el extremo conservador de un rango", () => {
    expect(specsFromText(SUPERBIKERS, "descripcion")).toMatchObject({
      motorW: 350,
      batteryV: 36,
      batteryAh: 7.5,
      chargeHours: 6,
      rangeKm: 20,
      maxSpeedKmh: 25,
      wheelInches: 8.5,
      suspension: true,
      discBrake: true,
      weightKg: 14,
      maxLoadKg: 100,
      foldable: true,
    });
  });

  it("lee la ficha de voltbike", () => {
    expect(specsFromText(VOLTBIKE, "descripcion")).toMatchObject({
      rangeKm: 15,
      batteryV: 36,
      batteryAh: 7,
      chargeHours: 6,
      motorW: 250,
      wheelInches: 8.5,
      discBrake: true,
    });
  });

  it("lee la prosa de covercompany", () => {
    const specs = specsFromText(COVERCOMPANY, "descripcion");
    expect(specs).toMatchObject({ motorPeakW: 800, rangeKm: 45, wheelInches: 12, ipRating: "IPX5", suspension: true });
    expect(specs.motorW).toBeNull();
  });

  it("convierte millas y mph sólo cuando la unidad está escrita", () => {
    const specs = specsFromText("Velocidad máxima de 15,5 mph y autonomía de hasta 7,5 millas", "descripcion");
    expect(specs.maxSpeedKmh).toBe(25);
    expect(specs.rangeKm).toBe(12);
  });

  it("no inventa una suspensión que el texto niega", () => {
    expect(specsFromText("Modelo sin suspensión, plegable", "descripcion").suspension).toBe(false);
  });
});

describe("specsFromTitle", () => {
  it("lee velocidad, potencia y plegable", () => {
    expect(specsFromTitle("Monopatín Eléctrico Luxor E9pro 25 Km/h Plegable 350w Dimm")).toMatchObject({
      maxSpeedKmh: 25,
      motorW: 350,
      foldable: true,
    });
  });

  it("lee la autonomía y la suspensión", () => {
    const specs = specsFromTitle(
      "Scooter Eléctrico Xiaomi 6 Color Negro 800w Max Autonomía 45km Suspensión Doble"
    );
    expect(specs).toMatchObject({ motorW: 800, rangeKm: 45, suspension: true });
    expect(specs.from.rangeKm).toBe("titulo");
  });

  it("no confunde la velocidad con la autonomía", () => {
    const specs = specsFromTitle("Monopatín Eléctrico Rp500 Hard 6.5 Potencia 150 W 15 Km/h");
    expect(specs.maxSpeedKmh).toBe(15);
    expect(specs.rangeKm).toBeNull();
    expect(specs.motorW).toBe(150);
  });

  it("lee potencias de cuatro cifras", () => {
    expect(specsFromTitle("Monopatin Eléctrico Plegable K'nex 1600w").motorW).toBe(1600);
  });
});

describe("mergeSpecs y hasFichaSpecs", () => {
  it("la primera capa con dato gana campo por campo", () => {
    const ficha = specsFromRows({ Autonomía: "30 km" });
    const title = specsFromTitle("Monopatín Eléctrico 40km 25 km/h");
    const merged = mergeSpecs(ficha, title);
    expect(merged.rangeKm).toBe(30);
    expect(merged.from.rangeKm).toBe("ficha");
    expect(merged.maxSpeedKmh).toBe(25);
    expect(merged.from.maxSpeedKmh).toBe("titulo");
    expect(hasFichaSpecs(merged)).toBe(true);
    expect(hasFichaSpecs(title)).toBe(false);
    expect(hasFichaSpecs(EMPTY_SPECS)).toBe(false);
  });
});

describe("marcas", () => {
  it("encuentra la marca en el título, la primera que aparece", () => {
    expect(brandFromTitle("Monopatín Eléctrico Xiaomi Electric Scooter 6")).toBe("Xiaomi");
    expect(brandFromTitle("Segway Ninebot F25 Patinete Eléctrico")).toBe("Segway");
    expect(brandFromTitle("Monopatín Eléctrico Ninebot Max G2")).toBe("Segway");
    expect(brandFromTitle("Monopatín Eléctrico Go Green Mod. Zero")).toBe("Gogreen");
    expect(brandFromTitle("Monopatin Eléctrico Plegable K'nex 1600w")).toBe("K'nex");
    expect(brandFromTitle("Monopatín Eléctrico S-PRO MOVE")).toBe("S-Pro");
    expect(brandFromTitle("Monopatín eléctrico para adultos 350w")).toBeNull();
  });

  it("descarta las marcas genéricas y normaliza las conocidas", () => {
    expect(cleanBrand("Monopatin")).toBeNull();
    expect(cleanBrand("Genérica")).toBeNull();
    expect(cleanBrand("  ")).toBeNull();
    expect(cleanBrand("XIAOMI")).toBe("Xiaomi");
    expect(cleanBrand("Ninebot")).toBe("Segway");
    expect(cleanBrand("Atom")).toBe("Atom");
    expect(cleanBrand("Marca Rara")).toBe("Marca Rara");
  });
});

describe("potencia máxima sola", () => {
  it("una potencia rotulada como máxima nunca pasa por nominal", () => {
    const specs = specsFromText("Potencia máxima: 600 W", "descripcion");
    expect(specs.motorPeakW).toBe(600);
    expect(specs.motorW).toBeNull();
    expect(specsFromText("Potencia pico 1200W, motor brushless", "descripcion").motorW).toBeNull();
  });
});
