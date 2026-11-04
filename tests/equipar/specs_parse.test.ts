// La ficha técnica de equipar: las filas son las que devolvió el puente de ML (`/product/<id>`) el
// 4/11/2026 para avisos reales del directorio, no texto inventado.
import { describe, expect, it } from "vitest";
import { fichaFromRows, fichaFromSeller, fichaFromTitle, mergeFicha, uyNumber } from "../../classes/equipar/specs/parse";

describe("uyNumber: formato uruguayo", () => {
  it.each([
    ["1.400", 1400],
    ["12.000", 12000],
    ["3.754,14", 3754.14],
    ["54.5", 54.5],
    ["1.67", 1.67],
    ["12,5", 12.5],
    ["245", 245],
  ])("%s -> %s", (raw, value) => {
    expect(uyNumber(raw)).toBe(value);
  });
});

describe("heladera", () => {
  it("Enxuta RENX22275W", () => {
    const ficha = fichaFromRows("heladera", {
      Marca: "Enxuta",
      Modelo: "RENX22275W",
      "Con tecnología inverter": "Sí",
      "Con freezer": "Sí",
      "Capacidad del freezer en volumen": "51 L",
      "Tipo de deshielo": "No frost",
      "Eficiencia energética Uruguay": "A",
      "Cantidad de puertas": "2",
      "Capacidad total": "245 L",
      "Ancho x Profundidad x Altura": "54.5 cm x 56 cm x 1.67 m",
      "Con dispensador de agua": "No",
      "Con Wi-Fi": "No",
    });
    expect(ficha.values).toMatchObject({
      capacidadL: 245,
      freezerL: 51,
      noFrost: true,
      inverter: true,
      puertas: 2,
      eficiencia: "A",
      dispensador: false,
      anchoCm: 54.5,
      altoCm: 167,
      wifi: false,
    });
    expect(ficha.from.capacidadL).toBe("ficha");
  });

  it("título: litros, no frost y 'frío seco'", () => {
    expect(fichaFromTitle("heladera", "Refrigerador Enxuta No Frost Inverter 245 L").values).toMatchObject({
      capacidadL: 245,
      noFrost: true,
      inverter: true,
    });
    expect(fichaFromTitle("heladera", "Heladera Panavox Frío Seco 300 Lts").values).toMatchObject({
      capacidadL: 300,
      noFrost: true,
    });
    expect(fichaFromTitle("heladera", "Heladera Lg Vt32bppdc Inverter 340l No Frost").values.capacidadL).toBe(340);
  });
});

describe("lavarropas", () => {
  it("James LR 1214 INV", () => {
    const ficha = fichaFromRows("lavarropas", {
      "Tipo de carga": "Frontal",
      "Capacidad del lavarropas": "12 kg",
      "Es lavasecarropas": "No",
      "Velocidad de centrifugado": "1.400 rpm",
      "Con tecnología inverter": "Sí",
      "Con conexión Wi-Fi": "No",
    });
    expect(ficha.values).toMatchObject({
      capacidadKg: 12,
      carga: "frontal",
      lavaseca: false,
      rpm: 1400,
      inverter: true,
      wifi: false,
    });
  });

  it("lavasecarropas LG: lavado y secado", () => {
    const ficha = fichaFromRows("lavarropas", {
      "Capacidad del lavarropas": "20 kg",
      "Es lavasecarropas": "Sí",
      "Capacidad de secado": "10 kg",
    });
    expect(ficha.values).toMatchObject({ capacidadKg: 20, lavaseca: true, secadoKg: 10 });
  });

  it("título: el primer kilo es el de lavado", () => {
    expect(fichaFromTitle("lavarropas", "Lavasecarropas LG Wd20egntspg 20 Kg 10 Kg Wifi Vapor").values).toMatchObject({
      capacidadKg: 20,
      lavaseca: true,
      wifi: true,
    });
    expect(fichaFromTitle("lavarropas", "Lavarropas James Carga Frontal 12kg 14 Programas Inverter").values).toMatchObject({
      capacidadKg: 12,
      carga: "frontal",
      inverter: true,
    });
  });
});

describe("televisor", () => {
  it("Xion: la resolución es la del tipo, no la 'máxima' que contradice", () => {
    const ficha = fichaFromRows("tv", {
      "Tamaño de la pantalla": '50 "',
      "Tipo de resolución": "Full HD",
      "Tipo de pantalla": "LED",
      "Con HDR": "No",
      "Resolución máxima": "3840 px x 2160 px",
      "Sistema operativo": "Android TV",
      "Es smart": "Sí",
    });
    expect(ficha.values).toMatchObject({
      pulgadas: 50,
      resolucion: "fhd",
      panel: "led",
      hdr: false,
      so: "android-tv",
      smart: true,
    });
  });

  it("Aiwa: 4K, Google TV y 60 Hz", () => {
    expect(
      fichaFromRows("tv", {
        "Tamaño de la pantalla": '58 "',
        "Tipo de resolución": "4K",
        "Frecuencia de actualización de la pantalla": "60 Hz",
        "Sistema operativo": "Google TV",
      }).values
    ).toMatchObject({ pulgadas: 58, resolucion: "4k", hz: 60, so: "google-tv" });
  });

  it("título: pulgadas con comillas o pegadas a tv/smart", () => {
    expect(fichaFromTitle("tv", "Tv Led Smart 50 Televisor Xion Full Hd Xi-led50fhd").values).toMatchObject({
      pulgadas: 50,
      resolucion: "fhd",
      smart: true,
    });
    expect(fichaFromTitle("tv", 'Smart Tv Samsung 55" Crystal UHD 4K').values).toMatchObject({ pulgadas: 55, resolucion: "4k" });
    expect(fichaFromTitle("tv", "Samsung Smart Tv 40 Hd").values).toMatchObject({ pulgadas: 40, resolucion: "hd" });
  });
});

describe("aire acondicionado", () => {
  it("Xion split inverter frío/calor: BTU y frigorías", () => {
    const ficha = fichaFromRows("aire-acondicionado", {
      "Tipo de aire acondicionado": "Inverter",
      "Tipo de climatización": "Frío/Calor",
      "Lugares de colocación": "De pared",
      "Capacidad de refrigeración": "12.000 BTU",
      "Con tecnología inverter": "Sí",
      "Eficiencia energética Uruguay": "A",
    });
    expect(ficha.values).toMatchObject({
      btu: 12000,
      frigorias: 3024,
      inverter: true,
      frioCalor: true,
      tipo: "split",
      eficiencia: "A",
    });
  });

  it("el portátil titulado '12000 Btu' declara 4.095 en la ficha: gana la ficha", () => {
    const ficha = mergeFicha(
      "aire-acondicionado",
      fichaFromRows("aire-acondicionado", {
        "Tipo de aire acondicionado": "Portátil",
        "Capacidad de refrigeración": "4.095,42 BTU",
        "Con tecnología inverter": "No",
      }),
      fichaFromTitle("aire-acondicionado", "Aire Acondicionado Enxuta Portatil Smart 12000 Btu")
    );
    expect(ficha.values).toMatchObject({ btu: 4095.4, tipo: "portatil", inverter: false });
    expect(ficha.from.btu).toBe("ficha");
    expect(fichaFromSeller(ficha)).toBe(true);
  });

  it("On/Off no es inverter; frigorías desde el título dan los BTU", () => {
    expect(
      fichaFromRows("aire-acondicionado", { "Tipo de aire acondicionado": "On/Off", "Con tecnología inverter": "No" }).values
        .inverter
    ).toBe(false);
    expect(fichaFromTitle("aire-acondicionado", "Aire Split 3000 frigorias frio calor").values).toMatchObject({
      frigorias: 3000,
      btu: 11904,
      frioCalor: true,
      tipo: "split",
    });
    expect(fichaFromTitle("aire-acondicionado", "Aire Acondicionado Xion 12.000btu Inverter").values.btu).toBe(12000);
  });
});
