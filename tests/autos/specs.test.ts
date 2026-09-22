import { describe, expect, it } from "vitest";
import { CAR_EQUIPMENT, carSpecsOf, detailSpecs } from "../../classes/autos/specs";
import type { CarDetail } from "../../classes/autos/types";

const READ_AT = "2026-09-22T12:00:00.000Z";
const detail = (specs: Record<string, string> | undefined): CarDetail => ({
  readAt: READ_AT, price: 12_000, currency: "USD", active: true, brand: null, model: null, year: null, km: null,
  version: null, engineText: null, sellerName: null, bodyType: null, color: null, doors: null, flags: [], description: "",
  ...(specs ? { specs } : {}),
});

// Verbatim rows of the live MLU-700729213 (Honda CR-V 2019) and MLU-700729779 (BMW X1 2010) pages,
// read 2026-09-22.
const CRV: Record<string, string> = {
  "AM/FM": "Sí", "Airbag conductor": "Sí", "Airbag para conductor y pasajero": "Sí", "Aire acondicionado": "Sí",
  "Alarma": "Sí", "Apertura remota de baúl": "Sí", "Año": "2019", "Bluetooth": "Sí", "CD": "Sí",
  "Capacidad de personas": "5", "Capacidad del tanque": "58 L", "Cierre automático de vidrios": "Sí",
  "Cierre centralizado de puertas": "Sí", "Climatizador": "Sí", "Color": "Azul",
  "Comando remoto para radio en el volante": "Sí", "Computadora de abordo": "Sí", "Con cámara de retroceso": "Sí",
  "Control de estabilidad": "Sí", "Control de tracción": "4x4", "Cristales eléctricos": "Sí", "Defensa delantera": "Sí",
  "Desempañador trasero": "Sí", "Dirección": "Eléctrica", "Distancia entre ejes": "2.465 mm", "Entrada USB": "Sí",
  "Entrada auxiliar": "Sí", "Faros antinieblas traseros": "Sí", "Faros con regulación automática": "Sí",
  "Frenos ABS": "Sí", "Kilómetros": "86.000 km", "Largo x Altura x Ancho": "4530 mm x 1655 mm x 1656 mm",
  "Limpia/lava luneta": "Sí", "Llantas de aleación": "Sí", "Marca": "Honda", "Modelo": "CR-V", "Motor": "1.5",
  "Piloto automático": "Sí", "Porta equipaje en techo": "Sí", "Porta vasos": "Sí", "Potencia": "190 hp",
  "Puertas": "5", "Reproductor de MP3": "Sí", "Sensor de estacionamiento": "Sí", "Sensor de lluvia": "Sí",
  "Soporte para rueda de auxilio": "Sí", "Tapizado de cuero": "Sí", "Techo solar eléctrico retráctil": "Sí",
  "Tipo de carrocería": "SUV", "Tipo de combustible": "Nafta", "Transmisión": "Automática",
  "Versión": "1.5T Ex-L 4X4 Cvt", "Válvulas por cilindro": "4", "Único dueño": "Sí", "Marchas": "6",
};

describe("carSpecsOf", () => {
  it("normalises the CR-V sheet: figures, drivetrain, steering, equipment and the deal flags", () => {
    expect(carSpecsOf(detail(CRV))).toEqual({
      readAt: READ_AT,
      powerHp: 190,
      valvesPerCylinder: 4,
      gears: 6,
      drivetrain: "4x4",
      steering: "electrica",
      fuelTankL: 58,
      lengthMm: 4530,
      heightMm: 1655,
      widthMm: 1656,
      wheelbaseMm: 2465,
      seats: 5,
      equipment: [
        "abs", "control_estabilidad", "airbag_conductor", "airbag_pasajero", "alarma", "camara_retroceso",
        "sensor_estacionamiento", "sensor_lluvia", "faros_antiniebla", "faros_automaticos", "aire_acondicionado",
        "climatizador", "piloto_automatico", "computadora_abordo", "cristales_electricos", "cierre_centralizado",
        "cierre_automatico_vidrios", "apertura_remota_baul", "tapizado_cuero", "techo_solar", "porta_vasos",
        "bluetooth", "usb", "entrada_auxiliar", "am_fm", "cd", "mp3", "comando_volante", "llantas_aleacion",
        "porta_equipaje", "defensa_delantera", "desempanador_trasero", "limpia_luneta", "rueda_auxilio",
      ],
      missing: [],
      singleOwner: true,
      acceptsTrade: null,
      negotiable: null,
      mechanicalWarranty: null,
      factoryWarranty: null,
      trunkL: null,
    });
  });

  it("reads the warranty rows, the boot and a tank with a decimal", () => {
    expect(carSpecsOf(detail({ "Con garantía mecánica": "Sí", "Con garantía de fábrica": "No", "Baúl": "985 L", "Capacidad del tanque": "77,6 L" })))
      .toMatchObject({ mechanicalWarranty: true, factoryWarranty: false, trunkL: 985, fuelTankL: 77.6 });
  });

  it("keeps what the seller marks as absent apart, and reads the BMW's 'No's", () => {
    const specs = carSpecsOf(detail({
      "Bluetooth": "No", "Piloto automático": "No", "Sensor de estacionamiento": "No", "Único dueño": "No",
      "Acepta permuta": "Sí", "Con precio negociable": "Sí", "Tracción ASR": "Sí", "Control de tracción": "4x4",
      "Dirección": "Hidráulica", "Potencia": "265 hp", "Capacidad del tanque": "63 L",
      "Largo x Altura x Ancho": "4454 mm x 1545 mm x 1998 mm", "Distancia entre ejes": "2.615 mm",
    }))!;
    expect(specs.equipment).toEqual(["control_traccion"]);
    expect(specs.missing).toEqual(["sensor_estacionamiento", "piloto_automatico", "bluetooth"]);
    expect(specs).toMatchObject({
      singleOwner: false, acceptsTrade: true, negotiable: true, drivetrain: "4x4", steering: "hidraulica",
      powerHp: 265, fuelTankL: 63, lengthMm: 4454, heightMm: 1545, widthMm: 1998, wheelbaseMm: 2615,
    });
  });

  it("reads the drivetrain words Mercado Libre files under 'Control de tracción', and horsepower in cv", () => {
    expect(carSpecsOf(detail({ "Control de tracción": "Delantera", "Potencia": "101 cv" }))).toMatchObject({ drivetrain: "delantera", powerHp: 101 });
    expect(carSpecsOf(detail({ "Control de tracción": "Trasera" }))!.drivetrain).toBe("trasera");
    expect(carSpecsOf(detail({ "Control de tracción": "4x2" }))!.drivetrain).toBe("4x2");
    expect(carSpecsOf(detail({ "Control de tracción": "Integral" }))!.drivetrain).toBe("integral");
    expect(carSpecsOf(detail({ "Control de tracción": "AWD" }))!.drivetrain).toBe("integral");
    expect(carSpecsOf(detail({ "Control de tracción": "Sí" }))).toBeNull();
  });

  it("refuses a figure that cannot be that of a car", () => {
    expect(carSpecsOf(detail({ "Potencia": "9 hp" }))).toBeNull();
    expect(carSpecsOf(detail({ "Potencia": "3000 hp" }))).toBeNull();
    expect(carSpecsOf(detail({ "Capacidad del tanque": "5 L" }))).toBeNull();
    expect(carSpecsOf(detail({ "Capacidad de personas": "40" }))).toBeNull();
    expect(carSpecsOf(detail({ "Largo x Altura x Ancho": "45 mm x 16 mm x 16 mm" }))).toBeNull();
    expect(carSpecsOf(detail({ "Distancia entre ejes": "26 mm" }))).toBeNull();
    expect(carSpecsOf(detail({ "Válvulas por cilindro": "12" }))).toBeNull();
    expect(carSpecsOf(detail({ "Marchas": "0" }))).toBeNull();
  });

  it("drops a label it does not know and says nothing when nothing is recognised", () => {
    expect(carSpecsOf(detail({ "Marca": "Honda", "Modelo": "CR-V", "Cosa rara": "Sí" }))).toBeNull();
    expect(carSpecsOf(detail(undefined))).toBeNull();
    expect(carSpecsOf(detail({}))).toBeNull();
    expect(carSpecsOf(null)).toBeNull();
  });

  it("lists equipment in one fixed order whatever the sheet's order", () => {
    const a = carSpecsOf(detail({ "Bluetooth": "Sí", "Frenos ABS": "Sí" }))!.equipment;
    const b = carSpecsOf(detail({ "Frenos ABS": "Sí", "Bluetooth": "Sí" }))!.equipment;
    expect(a).toEqual(b);
    expect(a).toEqual(["abs", "bluetooth"]);
  });

  it("emits only keys from the published list, each label mapped once", () => {
    for (const key of carSpecsOf(detail(CRV))!.equipment) expect(CAR_EQUIPMENT).toContain(key);
    expect(new Set(CAR_EQUIPMENT).size).toBe(CAR_EQUIPMENT.length);
  });
});

describe("detailSpecs", () => {
  const row = (label: string, value: string): string =>
    `<tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left" scope="row"><div class="andes-table__header__container">${label}</div></th><td class="andes-table__column" id="_R_1_"><span id="_R_1_-value" class="andes-table__column--value" style="line-clamp:none">${value}</span></td></tr>`;

  it("reads every spec row of the server-rendered table", () => {
    const html = `<table>${row("Potencia", "101 hp")}${row("Frenos ABS", "Sí")}${row("Bluetooth", "No")}</table>`;
    expect(detailSpecs(html)).toEqual({ "Potencia": "101 hp", "Frenos ABS": "Sí", "Bluetooth": "No" });
  });

  it("reads the JSON render too, decoding escaped labels, and ignores machine ids", () => {
    const html = `{"id":"technical_specifications","attributes":[{"id":"A\\u00f1o","text":"2017"},{"id":"Potencia","text":"101 hp"}]},{"id":"description","text":"x"}`;
    expect(detailSpecs(html)).toEqual({ "Año": "2017", "Potencia": "101 hp" });
  });

  it("caps the table and drops empty values", () => {
    const rows = Array.from({ length: 100 }, (_, i) => row(`Item ${i}`, "Sí")).join("");
    expect(Object.keys(detailSpecs(rows + row("Vacío", "   ")))).toHaveLength(80);
  });
});
