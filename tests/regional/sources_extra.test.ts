// Las fuentes que se agregaron para poder contrastar.
//
// Cada país que tenía una sola fuente tenía un punto ciego del tamaño de esa
// fuente: nada en el sistema podía distinguir "el precio se movió" de "el que lo
// publica se rompió". Estas son las segundas lecturas, y sus fixtures salen de
// las respuestas reales.
import { describe, expect, it } from "vitest";
import { parseCriptoYa } from "../../classes/regional/sources/ar_criptoya";
import { parseBoBcb } from "../../classes/regional/sources/bo_bcb";
import { parseBoostr } from "../../classes/regional/sources/cl_boostr";
import { parseDolarPy } from "../../classes/regional/sources/py_dolarpy";
import { parseUyExternal } from "../../classes/regional/sources/uy_external";
import {
  parseCoinbase,
  parseCurrencyApi,
  parseFloatRates,
} from "../../classes/regional/sources/world_feeds";

describe("CriptoYa (Argentina)", () => {
  const payload = {
    mayorista: { price: 1499, variation: 0.13, timestamp: 1787338805 },
    oficial: { price: 1520, ask: 1520, bid: 1470, variation: 0.33, timestamp: 1787375108 },
    tarjeta: { price: 1976, variation: 0.33, timestamp: 1787375108 },
    blue: { ask: 1550, bid: 1530, variation: 0, timestamp: 1787374838 },
    mep: { al30: { "24hs": { price: 1528.13, variation: -0.45, timestamp: 1787342398 }, ci: { price: 1400 } } },
    ccl: { al30: { "24hs": { price: 1590.34, variation: -0.85, timestamp: 1787342398 } } },
    cripto: { usdt: { ask: 1586.289, bid: 1577.585, variation: -0.01, timestamp: 1787375848 }, ccb: { ask: 1588.632 } },
  };

  it("aporta una quinta lectura de los siete mercados argentinos", () => {
    const quotes = parseCriptoYa(payload);
    expect(quotes.map((quote) => quote.market).sort()).toEqual([
      "blue",
      "bolsa",
      "contadoconliqui",
      "cripto",
      "mayorista",
      "oficial",
      "tarjeta",
    ]);
  });

  it("elige un instrumento concreto para los financieros y lo dice", () => {
    // El MEP con AL30 y el MEP con GD30 no son el mismo precio: publicar "el
    // MEP" sin decir con qué bono es por qué dos sitios muestran números
    // distintos y nadie entiende cuál mirar.
    const mep = parseCriptoYa(payload).find((quote) => quote.market === "bolsa")!;
    expect(mep.avg).toBe(1528.13);
    expect(mep.label).toMatch(/AL30/);
  });

  it("mantiene las dos puntas donde existen y la estampa de la fuente", () => {
    const blue = parseCriptoYa(payload).find((quote) => quote.market === "blue")!;
    expect(blue.buy).toBe(1530);
    expect(blue.sell).toBe(1550);
    expect(blue.updatedAt).toBe(new Date(1787374838 * 1000).toISOString());
  });

  it("no se cae con una respuesta vacía o a medias", () => {
    expect(parseCriptoYa(null)).toEqual([]);
    expect(parseCriptoYa({ mep: {} })).toEqual([]);
  });
});

describe("Boostr (Chile)", () => {
  it("da la segunda lectura del observado, que es lo que prueba que lo leímos bien", () => {
    const quotes = parseBoostr({
      status: "success",
      data: { dolar: { date: "2026-08-21", value: 923.23 }, euro: { date: "2026-08-21", value: 1077.66 } },
    });
    expect(quotes.map((quote) => quote.id).sort()).toEqual(["CL:observado:EURCLP", "CL:observado:USDCLP"]);
    expect(quotes[0].avg).toBe(923.23);
  });

  it("fecha el valor con el día para el que rige, no con el de la lectura", () => {
    const quote = parseBoostr({ data: { dolar: { date: "2026-08-21", value: 923.23 } } })[0];
    expect(quote.updatedAt).toBe("2026-08-21T04:00:00.000Z");
  });

  it("devuelve vacío si el feed no responde", () => {
    expect(parseBoostr(null)).toEqual([]);
    expect(parseBoostr({ status: "error" })).toEqual([]);
  });
});

describe("DolarPy (Paraguay)", () => {
  const payload = {
    dolarpy: {
      bcp: { compra: 5996.26, venta: 6008.82, referencial_diario: 6009.15 },
      bonanza: { compra: 5940, venta: 5990 },
      cambiosalberdi: { compra: 5940, venta: 5990 },
      cambioschaco: { compra: 5940, venta: 6010 },
      familiar: { compra: 5890, venta: 6100 },
      lamoneda: { compra: 0, venta: 0 },
      maxicambios: { compra: 5850, venta: 6000 },
      set: { compra: 7000, venta: 7000 },
    },
    updated: "2026-08-22T02:00:00Z",
  };

  it("corrobora el referencial del banco central, que antes no tenía con qué", () => {
    const referencial = parseDolarPy(payload).find((quote) => quote.market === "referencial")!;
    expect(referencial.avg).toBe(6009.15);
    expect(referencial.kind).toBe("official");
  });

  it("arma el mostrador como mercado y no como una casa suelta", () => {
    const casas = parseDolarPy(payload).find((quote) => quote.market === "casas")!;
    expect(casas.buy).toBe(5940);
    expect(casas.sell).toBe(5990);
    expect(casas.sample).toBe(5);
  });

  it("deja afuera el cartel en cero y la cotización administrativa", () => {
    // `lamoneda` publicaba 0,00 el día del fixture: un cero que llegue al
    // tablero es una división por cero tres capas más adelante. `set` es la
    // administración tributaria, no un mostrador.
    const casas = parseDolarPy(payload).find((quote) => quote.market === "casas")!;
    expect(casas.sample).toBe(5);
    expect(casas.sell).toBeLessThan(7000);
  });

  it("no inventa nada con una respuesta vacía", () => {
    expect(parseDolarPy(null)).toEqual([]);
    expect(parseDolarPy({ dolarpy: {} })).toEqual([]);
  });
});

describe("Banco Central de Bolivia", () => {
  const html = `
    <div class="bcb-kpi2-card is-tc-oficial">
      <div class="bcb-kpi2-sub">Bolivianos por dólar estadounidense</div>
      <div class="bcb-kpi2-asof">VIGENTE PARA EL SÁBADO 22, DOMINGO 23 Y LUNES 24 DE AGOSTO, 2026</div>
      <div class="bcb-tco-value"><div class="bcb-tco-amount"><span class="bcb-tco-num">11,50</span></div></div>
    </div>`;

  it("lee el oficial que fija el banco central, con coma decimal", () => {
    const [quote] = parseBoBcb(html);
    expect(quote.id).toBe("BO:oficial:USDBOB");
    expect(quote.avg).toBe(11.5);
    expect(quote.kind).toBe("official");
  });

  it("guarda para qué días rige, porque Bolivia también publica hacia adelante", () => {
    expect(parseBoBcb(html)[0].label).toMatch(/vigente para el sábado 22/i);
  });

  it("devuelve vacío si el widget cambia de forma, en vez de inventar un número", () => {
    expect(parseBoBcb("<html><body>sin widget</body></html>")).toEqual([]);
    expect(parseBoBcb('<span class="bcb-tco-num">s/d</span>')).toEqual([]);
  });
});

describe("Lectura externa de Uruguay", () => {
  const rows = [
    { moneda: "USD", compra: 38.95, venta: 41.45, fechaActualizacion: "2026-08-21T21:00:59.409Z" },
    { moneda: "EUR", compra: 44.59, venta: 49.62, fechaActualizacion: "2026-08-21T21:00:59.409Z" },
    { moneda: "ARS", compra: 0.02, venta: 0.2 },
  ];

  it("publica sólo el punto medio: sus puntas no son las nuestras", () => {
    // El tercero publica el RANGO del mercado (la peor compra y la peor venta);
    // nuestra fila es la mejor punta de cada lado. Compararlas una a una sería
    // comparar dos cosas distintas.
    const usd = parseUyExternal(rows).find((quote) => quote.base === "USD")!;
    expect(usd.avg).toBe(40.2);
    expect(usd.buy).toBeNull()
    expect(usd.sell).toBeNull()
    expect(usd.kind).toBe("reference");
  });

  it("se queda con las monedas que sirven de control", () => {
    expect(parseUyExternal(rows).map((quote) => quote.base).sort()).toEqual(["EUR", "USD"]);
  });

  it("no publica una fila incompleta", () => {
    expect(parseUyExternal([{ moneda: "USD", compra: 38.95 }])).toEqual([]);
    expect(parseUyExternal(null)).toEqual([]);
  });
});

describe("Los cuatro feeds globales", () => {
  it("leen el mismo mercado con la misma clave, que es lo que permite votarlos", () => {
    const currencyApi = parseCurrencyApi({ date: "2026-08-21", usd: { ars: 1497.22, brl: 5.195, clp: 922.74, pyg: 6029.13, bob: 11.54, uyu: 40.12 } });
    const floatRates = parseFloatRates({
      ars: { rate: 1497.2 },
      brl: { rate: "5.166" },
      clp: { rate: 921.79 },
      pyg: { rate: 6025.81 },
      bob: { rate: 11.51 },
      uyu: { rate: 40.19, date: "Fri, 21 Aug 2026 22:55:04 GMT" },
    });
    const coinbase = parseCoinbase({
      data: { currency: "USD", rates: { ARS: "1499.4", BRL: "5.14", CLP: "915.02", PYG: "6022.09", BOB: "11.53", UYU: "40.14" } },
    });

    for (const quotes of [currencyApi, floatRates, coinbase]) {
      expect(quotes).toHaveLength(6);
      expect(quotes.every((quote) => quote.market === "internacional")).toBe(true);
      expect(quotes.every((quote) => quote.kind === "reference")).toBe(true);
    }
    expect(currencyApi[0].id).toBe(floatRates[0].id);
    expect(floatRates[0].id).toBe(coinbase[0].id);
  });

  it("acepta el número como texto o como número, según lo publique cada uno", () => {
    expect(parseFloatRates({ brl: { rate: "5.166" } })[0].avg).toBe(5.166);
    expect(parseCoinbase({ data: { rates: { BRL: "5.14" } } })[0].avg).toBe(5.14);
  });

  it("ignora una moneda que el feed no cotiza en vez de guardar un cero", () => {
    expect(parseCurrencyApi({ usd: { ars: 0, brl: 5.1 } })).toHaveLength(1);
    expect(parseCoinbase({ data: { rates: {} } })).toEqual([]);
  });

  it("no explota con una respuesta vacía", () => {
    expect(parseCurrencyApi(null)).toEqual([]);
    expect(parseFloatRates(null)).toEqual([]);
    expect(parseCoinbase(null)).toEqual([]);
  });
});
