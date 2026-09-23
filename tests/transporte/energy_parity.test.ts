// Paridad del precio del kWh entre el backend y el app.
//
// `classes/transporte/energy.ts` COPIA una cifra que el app ya tiene en `app/utils/householdBills.ts`
// (`UTE_TARIFFS`, escalón 101-600 kWh de la Tarifa Residencial Simple, más IVA). No es duplicación
// por descuido: son dos paquetes, dos builds y dos tsconfig, y el backend no puede importar de
// `app/`. Lo que sí sería un descuido es que UTE actualice el pliego, alguien lo corrija en el app y
// el comparador siga cargando el monopatín al precio del año pasado — sin que falle nada y sin que
// se note en ninguna pantalla.
//
// Este test lee el archivo del app CON `fs` a propósito: importarlo desde el backend es exactamente
// lo que no se puede hacer (es ESM, TS 5.7 y otro tsconfig), así que se lee como texto y se
// extraen los dos números que tienen que coincidir.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KWH_RESIDENTIAL_UYU,
  UTE_IVA_RATE,
  UTE_SIMPLE_101_600_NO_VAT,
} from "../../classes/transporte/energy";

const APP_FILE = resolve(__dirname, "../../app/utils/householdBills.ts");
const source = readFileSync(APP_FILE, "utf8");

describe("paridad con app/utils/householdBills.ts", () => {
  it("el archivo del app existe y trae la Tarifa Residencial Simple (guarda de vacuidad)", () => {
    // Sin esto, un archivo renombrado haría que las expresiones regulares no encontraran nada y el
    // test pasaría por vacío, que es la forma más silenciosa de perder un guardarraíl.
    expect(source).toContain("UTE_TARIFFS");
    expect(source).toContain("Tarifa Residencial Simple");
    expect(source.length).toBeGreaterThan(1000);
  });

  it("el escalón 101-600 kWh sigue siendo el mismo de los dos lados", () => {
    const match = source.match(/upTo:\s*600,\s*pricePerKwh:\s*([\d.]+)/);
    expect(match).not.toBeNull();
    const appValue = Number(match![1]);
    expect(appValue).toBe(8.452);
    expect(UTE_SIMPLE_101_600_NO_VAT).toBe(appValue);
  });

  it("el IVA de la energía sigue siendo el mismo de los dos lados", () => {
    const match = source.match(/UTE_IVA_RATE\s*=\s*([\d.]+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(0.22);
    expect(UTE_IVA_RATE).toBe(Number(match![1]));
  });

  it("toma el SEGUNDO escalón y no el primero, que es el que casi nadie paga al margen", () => {
    // Lo que importa es el ÚLTIMO kWh de la factura, no el promedio: un hogar que ya consume más de
    // 100 kWh —o sea, prácticamente cualquiera— paga cada kWh que agregue el monopatín al precio del
    // segundo escalón. Usar el primero abarataría la carga a la mitad para un caso que casi no
    // existe.
    const first = Number(source.match(/upTo:\s*100,\s*pricePerKwh:\s*([\d.]+)/)![1]);
    expect(first).toBe(6.744);
    expect(UTE_SIMPLE_101_600_NO_VAT).not.toBe(first);
    expect(UTE_SIMPLE_101_600_NO_VAT).toBeGreaterThan(first);
  });
});

describe("KWH_RESIDENTIAL_UYU", () => {
  it("es el escalón con IVA, redondeado a dos decimales", () => {
    expect(KWH_RESIDENTIAL_UYU.value).toBe(10.31);
    expect(KWH_RESIDENTIAL_UYU.value).toBeCloseTo(UTE_SIMPLE_101_600_NO_VAT * (1 + UTE_IVA_RATE), 2);
  });

  it("viaja con su fecha, su fuente y su URL, como toda cifra curada del repo", () => {
    expect(KWH_RESIDENTIAL_UYU.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isFinite(Date.parse(KWH_RESIDENTIAL_UYU.asOf))).toBe(true);
    expect(KWH_RESIDENTIAL_UYU.source).toMatch(/UTE/);
    expect(KWH_RESIDENTIAL_UYU.source).toMatch(/101-600/);
    expect(KWH_RESIDENTIAL_UYU.sourceUrl).toMatch(/^https:\/\/www\.ute\.com\.uy\//);
  });
});
