import moment from "moment-timezone";
import { describe, expect, it } from "vitest";
import {
  assertOk,
  BCU_CONVERSIONS,
  BCU_MONEDA_CODES,
  extractRows,
  normalizeRows,
  parseCotizaciones,
  toMontevideoDate,
} from "../classes/bcu_soap";

// Shape mirrors the live awsbcucotizaciones response (verified against the service).
const okResponse = {
  Salida: {
    respuestastatus: { status: "1", codigoerror: 0, mensaje: "" },
    datoscotizaciones: {
      "datoscotizaciones.dato": [
        { Fecha: "2026-06-15T00:00:00.000Z", Moneda: 2225, Nombre: "DLS. USA BILLETE", CodigoISO: "DLS.", TCC: 40.323, TCV: 40.5 },
        { Fecha: "2026-06-15T00:00:00.000Z", Moneda: 9800, Nombre: "UNIDAD INDEXADA", CodigoISO: "U.I.", TCC: 6.5781, TCV: 6.5781 },
        { Fecha: "2026-06-16T00:00:00.000Z", Moneda: 9999, Nombre: "MONEDA RARA", CodigoISO: "X", TCC: 1, TCV: 1 },
        { Fecha: "2026-06-16T00:00:00.000Z", Moneda: 2225, Nombre: "DLS. USA BILLETE", CodigoISO: "DLS.", TCC: 0, TCV: 0 },
      ],
    },
  },
};

describe("BCU_CONVERSIONS / codes", () => {
  it("maps every requested Moneda code's name to a (code,type)", () => {
    // Names taken from the live service; must stay in sync with the request set.
    expect(BCU_CONVERSIONS["DLS. USA BILLETE"]).toEqual({ code: "USD", type: "BILLETE" });
    expect(BCU_CONVERSIONS["DLS. USA CABLE"]).toEqual({ code: "USD", type: "CABLE" });
    expect(BCU_CONVERSIONS["DLS.PROMED.FONDO"]).toEqual({ code: "USD", type: "PROMED.FONDO" });
    expect(BCU_CONVERSIONS["PESO ARG.BILLETE"]).toEqual({ code: "ARS", type: "BILLETE" });
    expect(BCU_CONVERSIONS["REAL BILLETE"]).toEqual({ code: "BRL", type: "BILLETE" });
    expect(BCU_CONVERSIONS["UNIDAD INDEXADA"]).toEqual({ code: "UI", type: "" });
    expect(BCU_CONVERSIONS["UNIDAD PREVISIONAL"]).toEqual({ code: "UP", type: "" });
    expect(BCU_CONVERSIONS["UNIDAD REAJUSTAB"]).toEqual({ code: "UR", type: "" });
  });

  it("requests the 8 mapped Moneda codes", () => {
    expect([...BCU_MONEDA_CODES].sort((a, b) => a - b)).toEqual([501, 1001, 2224, 2225, 2230, 9700, 9800, 9900]);
  });
});

describe("toMontevideoDate", () => {
  it("maps a UTC-midnight Fecha to Montevideo start-of-day without off-by-one", () => {
    const got = toMontevideoDate("2026-06-15T00:00:00.000Z");
    const expected = moment.tz("2026-06-15", "America/Montevideo").startOf("day").toDate();
    expect(got.getTime()).toBe(expected.getTime());
    // Montevideo is UTC-3 → start of the 15th is 03:00Z, NOT the 14th.
    expect(got.toISOString()).toBe("2026-06-15T03:00:00.000Z");
  });
});

describe("assertOk", () => {
  it("passes when status is '1'", () => {
    expect(() => assertOk(okResponse)).not.toThrow();
  });

  it("throws when status is not '1'", () => {
    const bad = { Salida: { respuestastatus: { status: "0", codigoerror: 100, mensaje: "boom" } } };
    expect(() => assertOk(bad)).toThrow(/boom/);
  });
});

describe("extractRows", () => {
  it("returns the dato array", () => {
    expect(extractRows(okResponse)).toHaveLength(4);
  });

  it("wraps a single dato object into an array", () => {
    const single = {
      Salida: {
        respuestastatus: { status: "1", codigoerror: 0, mensaje: "" },
        datoscotizaciones: { "datoscotizaciones.dato": { Fecha: "2026-06-15T00:00:00.000Z", Moneda: 2225, Nombre: "DLS. USA BILLETE", TCC: 1, TCV: 1 } },
      },
    };
    expect(extractRows(single)).toHaveLength(1);
  });

  it("returns [] when there are no rows", () => {
    const empty = { Salida: { respuestastatus: { status: "1" }, datoscotizaciones: null } };
    expect(extractRows(empty)).toEqual([]);
  });
});

describe("normalizeRows", () => {
  it("maps a known row by Nombre with TCC→buy, TCV→sell", () => {
    const out = normalizeRows([okResponse.Salida.datoscotizaciones["datoscotizaciones.dato"][0]]);
    expect(out).toEqual([
      {
        date: moment.tz("2026-06-15", "America/Montevideo").startOf("day").toDate(),
        code: "USD",
        type: "BILLETE",
        name: "DLS. USA BILLETE",
        buy: 40.323,
        sell: 40.5,
      },
    ]);
  });

  it("skips rows whose Nombre is not in the conversions map", () => {
    const rows = extractRows(okResponse);
    const out = normalizeRows(rows);
    expect(out.some((r) => r.name === "MONEDA RARA")).toBe(false);
  });

  it("skips rows where both buy and sell are 0", () => {
    const rows = extractRows(okResponse);
    const out = normalizeRows(rows);
    // The 2226-06-16 USD row has TCC=TCV=0 and must be dropped.
    expect(out.some((r) => r.code === "USD" && r.buy === 0 && r.sell === 0)).toBe(false);
  });
});

describe("parseCotizaciones", () => {
  it("validates status then returns only the mapped, non-zero rows", () => {
    const out = parseCotizaciones(okResponse);
    // 4 raw rows → drop unknown + drop 0/0 → 2 valid (USD billete 15th, UI 15th)
    expect(out).toHaveLength(2);
    expect(out.map((r) => `${r.code}:${r.type}`).sort()).toEqual(["UI:", "USD:BILLETE"]);
  });

  it("throws on an error response before mapping", () => {
    const bad = { Salida: { respuestastatus: { status: "0", codigoerror: 1, mensaje: "fail" }, datoscotizaciones: null } };
    expect(() => parseCotizaciones(bad)).toThrow(/fail/);
  });
});
