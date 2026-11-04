// La ficha técnica de una bicicleta eléctrica: las filas y descripciones son las que devolvió el
// puente de ML (`/product/<id>`) el 4/11/2026 para avisos reales del directorio, no texto inventado.
import { describe, expect, it } from "vitest";
import { mergeSpecs, specsFromRows, specsFromText, specsFromTitle } from "../../classes/movilidad/specs/parse";
import { BICICLETA_CATEGORY, specProfile } from "../../classes/movilidad/specs/profiles";

const BICI = BICICLETA_CATEGORY;

describe("perfil de categoría", () => {
  it("sin categoría es monopatín, con la de bici lee lo de bici", () => {
    expect(specProfile().bike).toBe(false);
    expect(specProfile("monopatin-electrico").bike).toBe(false);
    expect(specProfile(BICI).bike).toBe(true);
    expect(specProfile("heladera").bike).toBe(false);
  });
});

describe("filas de la ficha de ML de una bici", () => {
  it("Gyroor EB021 (MLU36319778)", () => {
    const specs = specsFromRows(
      {
        Marca: "Gyroor",
        Modelo: "EB021",
        Edad: "Adultos",
        Peso: "30 kg",
        "Capacidad de la batería": "10 Ah",
        Rodado: "20",
        Potencia: "500 W",
        "Velocidad máxima": "35 km/h",
        "Voltaje de la batería": "48V",
        "Peso máximo soportado": "120 kg",
        "Es plegable": "Sí",
        "Con batería removible": "Sí",
        "Con alarma": "No",
      },
      BICI
    );
    expect(specs).toMatchObject({
      weightKg: 30,
      batteryAh: 10,
      wheelInches: 20,
      motorW: 500,
      maxSpeedKmh: 35,
      batteryV: 48,
      batteryWh: 480,
      maxLoadKg: 120,
      foldable: true,
      removableBattery: true,
      throttle: null,
    });
    expect(specs.from.wheelInches).toBe("ficha");
  });

  it('"Rodado = 20x4.0" es rodado 20, y el acelerador independiente cuenta', () => {
    const specs = specsFromRows(
      { Rodado: "20x4.0", Potencia: "350 W", "Con acelerador independiente": "Sí", "Con batería removible": "No" },
      BICI
    );
    expect(specs.wheelInches).toBe(20);
    expect(specs.throttle).toBe(true);
    expect(specs.removableBattery).toBe(false);
  });

  it('"Rodado = 27,5" entra con la banda de bici', () => {
    expect(specsFromRows({ Rodado: "27,5" }, BICI).wheelInches).toBe(27.5);
  });

  it("la misma fila en un monopatín no da un rodado 26 imposible ni campos de bici", () => {
    const specs = specsFromRows({ Rodado: "26", "Con batería removible": "Sí", "Cantidad de velocidades": "7" });
    expect(specs.wheelInches).toBeNull();
    expect(specs.removableBattery).toBeNull();
    expect(specs.gears).toBeNull();
  });

  it("cantidad de velocidades y posición del motor", () => {
    const specs = specsFromRows(
      { "Cantidad de velocidades": "7", "Posición del motor": "Central" },
      BICI
    );
    expect(specs.gears).toBe(7);
    expect(specs.centralMotor).toBe(true);
    expect(specsFromRows({ "Ubicación del motor": "Rueda trasera" }, BICI).centralMotor).toBe(false);
  });
});

describe("descripción de una bici", () => {
  it("Gyroor EB021: cambios, rango de autonomía y motor", () => {
    const specs = specsFromText(
      "BICICLETA ELÉCTRICA GYROOR 20'' EB021 - Rodado: 20”, rueda ancha, plegable - Marco de aleación de aluminio - SHIMANO Tourney tz 7 velocidades - Niveles de conducción: 5 niveles de asistencia - Motor: 48V 500W - Rango de Autonomía: 35 -70 km",
      "descripcion",
      BICI
    );
    expect(specs).toMatchObject({ wheelInches: 20, gears: 7, rangeKm: 35, foldable: true });
  });

  it("batería removible en prosa, y su negación", () => {
    expect(
      specsFromText("La batería de ion de litio de 12,5 Ah y 36V es removible", "descripcion", BICI).removableBattery
    ).toBe(true);
    expect(specsFromText("Batería extraíble: No", "descripcion", BICI).removableBattery).toBe(false);
    expect(specsFromText("Batería integrada en el cuadro", "descripcion", BICI).removableBattery).toBe(false);
  });

  it("acelerador: con, sin, y 'no tiene'", () => {
    expect(specsFromText("Con acelerador de puño", "descripcion", BICI).throttle).toBe(true);
    expect(specsFromText("Pedaleo asistido sin acelerador", "descripcion", BICI).throttle).toBe(false);
    expect(specsFromText("No tiene acelerador, sólo asistencia", "descripcion", BICI).throttle).toBe(false);
  });

  it("motor central contra motor en la rueda", () => {
    expect(specsFromText("Motor central Bafang M420 de 250 W", "descripcion", BICI).centralMotor).toBe(true);
    expect(specsFromText("Bosch Performance Line CX", "descripcion", BICI).centralMotor).toBe(true);
    expect(specsFromText("Motor en la rueda trasera de 350W", "descripcion", BICI).centralMotor).toBe(false);
  });

  it("un monopatín con '3 velocidades' no tiene cambios", () => {
    expect(specsFromText("Monopatín con 3 velocidades y app", "descripcion").gears).toBeNull();
  });
});

describe("títulos de bici medidos", () => {
  const cases: Array<[string, Partial<Record<string, unknown>>]> = [
    ["Bicicleta Electrica Bici Modelo Taurus Rodado 20x4.0 36v350w", { wheelInches: 20, batteryV: 36 }],
    ["Bicicleta Eléctrica Gyroor Eb021 R20 En Aluminio Y Plegable Color Negro", { wheelInches: 20, foldable: true }],
    ["Bicicleta Eléctrica Plegable Gyroor R14 C3 Adultos Circuit", { wheelInches: 14 }],
    ["Bicicleta Eléctrica Trinx Niza Rod 28 Urbana", { wheelInches: 28 }],
    ["Bici Eléctrica Hiper Engine Metropolis Urbana Rod. 28 Albion", { wheelInches: 28 }],
    ["Bicicleta Eléctrica Jeep Rod.16 Se Vende Ya", { wheelInches: 16 }],
    ["Bicicleta Electrica Bici Modelo Madrid Rodado 26x1.95 250w", { wheelInches: 26, motorW: 250 }],
    ["Bicicleta Eléctrica Wheele Gravel 29”", { wheelInches: 29 }],
    ["Bicicleta Eléctrica Gyroor EB041 27.5'' 48V Dorada Freno Disco Shimano", { wheelInches: 27.5, batteryV: 48 }],
    ["Bicicleta Electrica Positivo Bl01 250w 36v 21 Vel.f/disco", { gears: 21, motorW: 250 }],
    ["Bicicleta Eléctrica Aluminio S-pro Wagon Rodado 20 7 Vel", { gears: 7, wheelInches: 20 }],
    ["Bicicleta Eléctrica Eleglide M1 Plus 27,5 100km Autonomía Negro", { rangeKm: 100 }],
    ["Bicicleta Eléctrica Rodado 26 Nakto 250w 32km/h C/ Canasto", { wheelInches: 26, maxSpeedKmh: 32 }],
  ];
  it.each(cases)("%s", (title, expected) => {
    expect(specsFromTitle(title, BICI)).toMatchObject(expected);
  });

  // El rodado pelado, sin "rodado" ni comillas: así titulan los vendedores de ML (medido en el dry-run
  // del VPS, 4/11/2026, donde "Gyroor 27.5 Cd-2614" quedaba sin rodado).
  it.each([
    ["Bicicleta Electrica Gyroor 20 Eb025 Plegable", 20],
    ["Bicicleta Electrica Gyroor 27.5 Cd-2614 Plateada", 27.5],
    ["Valentini Bikes - Bicicleta Eléctrica 26  Negra", 26],
    ["Bicicleta Eléctrica Gyroor 14 Pulgadas C3-14", 14],
  ])("rodado pelado: %s -> %s", (title, wheel) => {
    expect(specsFromTitle(title, BICI).wheelInches).toBe(wheel);
    expect(specsFromTitle(title, BICI).from.wheelInches).toBe("titulo");
  });

  it.each([
    "Bicicleta Electrica 20 km de autonomía",
    "Bicicleta Electrica 26 v 10ah",
    "Bicicleta Eléctrica Gyroor C3-14 350w Negro",
    "Bicicleta Eléctrica S-pro E-clipper 2026",
    "Bicicleta Electrica plegable 24 cuotas sin recargo",
  ])("un número con unidad, dentro de un código o un año no es rodado: %s", (title) => {
    expect(specsFromTitle(title, BICI).wheelInches).toBeNull();
  });

  it("en un monopatín el número pelado nunca es rodado", () => {
    expect(specsFromTitle("Monopatin Electrico Xiaomi 4 Pro 20 Negro").wheelInches).toBeNull();
  });

  it("'Vel 32 Km' no son cambios", () => {
    expect(specsFromTitle("Bicicleta Electrica Rod 27,5 Hasta 100km Autonomia Vel 32 Km", BICI).gears).toBeNull();
  });
});

describe("mezcla de capas en bici", () => {
  it("la ficha gana al título también en los campos de bici", () => {
    const merged = mergeSpecs(
      specsFromRows({ "Con batería removible": "No", Rodado: "26" }, BICI),
      specsFromTitle("Bicicleta Eléctrica con batería extraíble rodado 28", BICI)
    );
    expect(merged.removableBattery).toBe(false);
    expect(merged.wheelInches).toBe(26);
    expect(merged.from.removableBattery).toBe("ficha");
  });
});

describe("lo que encontró la revisión de rama (4/11/2026)", () => {
  it("monopatín: '48v 800w Potencia Maxima' sigue siendo el pico, no el nominal", () => {
    const specs = specsFromTitle("Monopatin Electrico 48v 800w Potencia Maxima");
    expect(specs.motorW).toBeNull();
    expect(specs.motorPeakW).toBe(800);
    // Pegado sí: "36v350w" son voltaje y potencia.
    expect(specsFromTitle("Monopatin Electrico 36v350w")).toMatchObject({ batteryV: 36, motorW: 350 });
  });

  it("'25 Vel Max' es la velocidad, no los cambios", () => {
    expect(specsFromTitle("Bicicleta Electrica Rodado 20 36v 10ah 25 Vel Max", BICI).gears).toBeNull();
    expect(specsFromTitle("Bicicleta Eléctrica Aluminio S-pro Wagon Rodado 20 7 Vel", BICI).gears).toBe(7);
  });

  it("'no requiere acelerador' y 'sin necesidad de acelerador' son que no", () => {
    expect(specsFromText("No requiere acelerador, asiste al pedalear", "descripcion", BICI).throttle).toBe(false);
    expect(specsFromText("Pedaleo sin necesidad de acelerador", "descripcion", BICI).throttle).toBe(false);
  });

  it("cuotas y horarios con 'x' no son rodado; la cubierta pegada sí", () => {
    expect(specsFromText("Pagá en 12 x 1.500 sin recargo", "descripcion", BICI).wheelInches).toBeNull();
    expect(specsFromText("Envíos 24 x 7 a todo el país", "descripcion", BICI).wheelInches).toBeNull();
    expect(specsFromText("Cubiertas 26x1.95 antipinchazo", "descripcion", BICI).wheelInches).toBe(26);
  });

  it("el talle del cuadro y un rango de edades no son el rodado; 'aro 29' sí", () => {
    expect(specsFromTitle("Bicicleta Electrica Cuadro 16 Aro 29", BICI).wheelInches).toBe(29);
    expect(specsFromTitle("Bici Electrica Para Niños 12 A 16 Años", BICI).wheelInches).toBeNull();
  });

  it("la coma corta la batería: 'asiento desmontable' no es la batería", () => {
    expect(
      specsFromText("Bateria de litio 36v 10ah, asiento desmontable", "descripcion", BICI).removableBattery
    ).toBeNull();
  });
});
