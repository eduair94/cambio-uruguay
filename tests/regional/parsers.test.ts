// One fixture per parser, taken from the real payloads (trimmed).
//
// These are the tests that catch a publisher redesigning a page or renaming a
// field: the pipeline above them is pure arithmetic, but every number enters
// through one of these seven parsers, and a silent parser is indistinguishable
// from a quiet market until somebody notices the board stopped moving.
import { describe, expect, it } from "vitest";
import { parseBcra } from "../../classes/regional/sources/ar_bcra";
import { parseDolarHoy, parseDolarHoyStamp } from "../../classes/regional/sources/ar_dolarhoy";
import { parseBoDolarApi } from "../../classes/regional/sources/bo_dolarapi";
import { parseAwesome } from "../../classes/regional/sources/br_awesomeapi";
import { parseClDolarApi } from "../../classes/regional/sources/cl_dolarapi";
import { parseMindicador } from "../../classes/regional/sources/cl_mindicador";
import { parseBcpPlanilla, parseBcpReferencial, parseSpanishDate } from "../../classes/regional/sources/py_bcp";
import { parseMaxicambios } from "../../classes/regional/sources/py_maxicambios";
import { parseErApi } from "../../classes/regional/sources/world_erapi";

describe("BCP — tipo de cambio referencial", () => {
  // The real table pads half-hour blocks with empty <tr> rows; "the last row"
  // read naively is one of those.
  const html = `
    <table>
      <thead><tr><th colspan="8"><h4>COTIZACIONES DEL 21 DE AGOSTO DE 2026</h4></th></tr></thead>
      <tbody>
        <tr><td>(*)Prom. 20/08</td><td>6.021,64</td><td>6.026,57</td><td>5.996,27</td><td>6.028,01</td></tr>
        <tr><td>08:30</td><td>6.021,64</td><td>6.026,57</td><td>5.996,27</td><td>6.028,01</td></tr>
        <tr></tr><tr></tr>
        <tr><td>13:30</td><td>6.008,10</td><td>6.011,22</td><td>6.005,00</td><td>6.010,00</td></tr>
        <tr></tr><tr></tr>
      </tbody>
    </table>`;

  it("reads the last row that actually has cells", () => {
    const [quote] = parseBcpReferencial(html);
    expect(quote.id).toBe("PY:referencial:USDPYG");
    expect(quote.buy).toBe(6008.1);
    expect(quote.sell).toBe(6011.22);
  });

  it("stamps it with the table's own day in Asunción time", () => {
    const [quote] = parseBcpReferencial(html);
    expect(quote.updatedAt).toBe("2026-08-21T16:30:00.000Z");
  });

  it("returns nothing rather than a wrong number when the table is empty", () => {
    expect(parseBcpReferencial("<table><tbody><tr></tr></tbody></table>")).toEqual([]);
  });
});

describe("BCP — planilla de cotizaciones", () => {
  const html = `
    <table id="cotizacion-interbancaria">
      <thead><tr><th colspan="5">PLANILLA DE COTIZACIONES AL VIERNES 21 DE AGOSTO DEL 2026</th></tr></thead>
      <tbody>
        <tr><td>DÓLAR ESTADOUNIDENSE</td><td>USD</td><td>1,0000</td><td>6.009,15</td></tr>
        <tr><td>REAL BRASILEÑO</td><td>BRL</td><td>5,1608</td><td>1.164,38</td></tr>
        <tr><td>PESO ARGENTINO</td><td>ARS</td><td>1.496,0325</td><td>4,02</td></tr>
        <tr><td>PESO URUGUAYO</td><td>UYU</td><td>40,1500</td><td>149,67</td></tr>
        <tr><td>EURO *</td><td>EUR</td><td>1,1671</td><td>7.013,28</td></tr>
        <tr><td>YEN JAPONÉS</td><td>JPY</td><td>158,9800</td><td>37,80</td></tr>
      </tbody>
    </table>`;

  it("reads guaraníes per unit, which is unambiguous for direct and indirect quotes alike", () => {
    // Column 2 flips meaning for the currencies the planilla marks with an
    // asterisk (EUR: dollars per euro, not euros per dollar). Column 3 never does.
    const quotes = parseBcpPlanilla(html);
    expect(quotes.find((quote) => quote.base === "ARS")!.avg).toBe(4.02);
    expect(quotes.find((quote) => quote.base === "EUR")!.avg).toBe(7013.28);
    expect(quotes.find((quote) => quote.base === "UYU")!.avg).toBe(149.67);
  });

  it("keeps only the regional currencies out of the ~26 listed", () => {
    expect(parseBcpPlanilla(html).some((quote) => quote.base === "JPY")).toBe(false);
  });
});

describe("parseSpanishDate", () => {
  it("reads both wordings the BCP uses", () => {
    expect(parseSpanishDate("COTIZACIONES DEL 21 DE AGOSTO DE 2026")).toBe("2026-08-21");
    expect(parseSpanishDate("PLANILLA DE COTIZACIONES AL VIERNES 3 DE SETIEMBRE DEL 2026")).toBe("2026-09-03");
  });

  it("returns null instead of guessing", () => {
    expect(parseSpanishDate("sin fecha")).toBeNull();
    expect(parseSpanishDate("21 DE BRUMARIO DE 2026")).toBeNull();
  });
});

describe("DolarHoy", () => {
  const html = `
    <div class="tile is-child"><a class="titleText" href="/x">Dólar blue</a>
      <div class="values"><div class="compra"><div class="val">$1530</div></div><div class="venta"><div class="val">$1550</div></div></div>
    </div>
    <div class="tile is-child only-mobile"><a class="titleText" href="/x">Dólar blue</a>
      <div class="values"><div class="compra"><div class="val">$1530</div></div><div class="venta"><div class="val">$1550</div></div></div>
    </div>
    <div class="tile is-child"><a class="titleText" href="/y">Dólar MEP</a>
      <div class="values"><div class="compra"><div class="val">$1531,70</div></div><div class="venta"><div class="val">$1545,30</div></div></div>
    </div>
    <div class="tile is-child"><a class="titleText" href="/z">Dólar Tarjeta</a>
      <div class="values"><div class="venta"><div class="val">$1976</div></div></div>
    </div>
    <div class="tile update"><span>Actualizado por última vez: 21/08/26 06:39 PM</span></div>`;

  it("de-duplicates the mobile copy of a tile — it is not corroboration", () => {
    const quotes = parseDolarHoy(html);
    expect(quotes.filter((quote) => quote.id === "AR:blue:USDARS")).toHaveLength(1);
  });

  it("maps the page's names to market slugs and reads comma decimals", () => {
    const mep = parseDolarHoy(html).find((quote) => quote.market === "bolsa")!;
    expect(mep.buy).toBe(1531.7);
    expect(mep.sell).toBe(1545.3);
  });

  it("keeps the card dollar as a one-sided price", () => {
    const card = parseDolarHoy(html).find((quote) => quote.market === "tarjeta")!;
    expect(card.sell).toBe(1976);
    expect(card.buy).toBeNull();
  });

  it("reads the page's 12-hour stamp as Buenos Aires time", () => {
    expect(parseDolarHoyStamp("Actualizado por última vez: 21/08/26 06:39 PM")).toBe("2026-08-21T21:39:00.000Z");
    expect(parseDolarHoyStamp("Actualizado por última vez: 21/08/26 12:05 AM")).toBe("2026-08-21T03:05:00.000Z");
    expect(parseDolarHoyStamp("sin fecha")).toBeNull();
  });
});

describe("Maxicambios", () => {
  const html = `
    <table><tbody>
      <tr><td>DÓLAR</td><td>5850</td><td>6000</td></tr>
      <tr><td>PESO AR</td><td>3.50</td><td>4</td></tr>
      <tr><td>REAL</td><td>1100</td><td>1170</td></tr>
      <tr><td>PESO UY</td><td>130</td><td>200</td></tr>
      <tr><td>YEN</td><td>32</td><td>45</td></tr>
    </tbody></table>`;

  it("reads a dot as a decimal point, the way this counter writes it", () => {
    const ars = parseMaxicambios(html).find((quote) => quote.base === "ARS")!;
    expect(ars.buy).toBe(3.5);
    expect(ars.sell).toBe(4);
  });

  it("publishes the window sign as it stands and lets the validator judge it", () => {
    // 130/200 guaraníes per Uruguayan peso is a 54% spread: a sign, not a price.
    // The parser's job is to read it; `validate.ts` is what drops it.
    const uyu = parseMaxicambios(html).find((quote) => quote.base === "UYU")!;
    expect(uyu.spreadPct).toBeCloseTo(53.8, 1);
  });

  it("ignores currencies outside the regional board", () => {
    expect(parseMaxicambios(html).some((quote) => quote.base === "JPY")).toBe(false);
  });
});

describe("BCRA", () => {
  const payload = {
    status: 200,
    results: {
      fecha: "2026-08-21",
      detalle: [
        { codigoMoneda: "ARS", descripcion: "PESO", tipoPase: 0.000667, tipoCotizacion: 0 },
        { codigoMoneda: "USD", descripcion: "DOLAR E.E.U.U.", tipoPase: 0, tipoCotizacion: 1499 },
        { codigoMoneda: "BRL", descripcion: "REAL", tipoPase: 0.194337, tipoCotizacion: 291.311192 },
        { codigoMoneda: "JPY", descripcion: "YEN", tipoPase: 0.0068, tipoCotizacion: 10.1 },
      ],
    },
  };

  it("keeps the regional currencies and drops the peso's own zero row", () => {
    const quotes = parseBcra(payload);
    expect(quotes.map((quote) => quote.base).sort()).toEqual(["BRL", "USD"]);
    expect(quotes.find((quote) => quote.base === "BRL")!.avg).toBe(291.311192);
  });

  it("stamps the table with the bank's own day in Buenos Aires time", () => {
    expect(parseBcra(payload)[0].updatedAt).toBe("2026-08-21T03:00:00.000Z");
  });

  it("survives an empty or malformed payload", () => {
    expect(parseBcra(null)).toEqual([]);
    expect(parseBcra({ results: {} })).toEqual([]);
  });
});

describe("AwesomeAPI", () => {
  const payload = {
    USDBRL: { code: "USD", codein: "BRL", high: "5.1951", low: "5.1319", pctChange: "-1.057216", bid: "5.138", ask: "5.1395", timestamp: "1787347191" },
    USDBRLT: { code: "USD", codein: "BRLT", high: "5.15569", low: "5.09297", pctChange: "-1.057145", bid: "5.09903", ask: "5.49918", timestamp: "1787347191" },
    ARSBRL: { code: "ARS", codein: "BRL", high: "0.003472", low: "0.00342031", pctChange: "-1.206472", bid: "0.00342775", ask: "0.00342777", timestamp: "1787346254" },
  };

  it("reads machine decimals as decimals", () => {
    // "5.138" is five point one three eight reais, not five thousand.
    const usd = parseAwesome(payload).find((quote) => quote.market === "comercial" && quote.base === "USD")!;
    expect(usd.buy).toBe(5.138);
    expect(usd.sell).toBe(5.1395);
  });

  it("keeps the tourism rate as its own market, several percent above commercial", () => {
    const turismo = parseAwesome(payload).find((quote) => quote.market === "turismo")!;
    expect(turismo.sell).toBe(5.49918);
    expect(turismo.spreadPct).toBeGreaterThan(7);
  });

  it("carries the session high, low and change the fixing cannot give", () => {
    const usd = parseAwesome(payload).find((quote) => quote.base === "USD" && quote.market === "comercial")!;
    expect(usd.high).toBe(5.1951);
    expect(usd.low).toBe(5.1319);
    expect(usd.variationPct).toBeCloseTo(-1.0572, 3);
    expect(usd.updatedAt).toBe(new Date(1787347191 * 1000).toISOString());
  });
});

describe("third-party country feeds", () => {
  it("splits Bolivia's official rate from its parallel one", () => {
    const quotes = parseBoDolarApi([
      { moneda: "USD", casa: "oficial", compra: 11.52, venta: 11.52, fechaActualizacion: "2026-08-21T00:00:00.000Z" },
      { moneda: "USD", casa: "binance", compra: 11.6, venta: 11.63, fechaActualizacion: "2026-08-21T20:02:12.205Z" },
    ]);
    expect(quotes.map((quote) => quote.kind).sort()).toEqual(["official", "parallel"]);
  });

  it("reads Chile's counter prices, including the peso argentino cross", () => {
    const quotes = parseClDolarApi([
      { moneda: "USD", compra: 914.7, venta: 916.14, fechaActualizacion: "2026-08-21T20:01:55.040Z" },
      { moneda: "ARS", compra: 0.6, venta: 0.63, fechaActualizacion: "2026-08-21T20:01:45.215Z" },
      { moneda: "XYZ", compra: 1, venta: 2 },
    ]);
    expect(quotes.map((quote) => quote.id).sort()).toEqual(["CL:casas:ARSCLP", "CL:casas:USDCLP"]);
  });

  it("stamps Chile's observed rate with the day it is valid for, not with now", () => {
    const quotes = parseMindicador({
      fecha: "2026-08-21T21:00:00.000Z",
      dolar: { codigo: "dolar", valor: 923.23, fecha: "2026-08-21T04:00:00.000Z" },
      euro: { codigo: "euro", valor: 1077.66, fecha: "2026-08-21T04:00:00.000Z" },
    });
    expect(quotes.find((quote) => quote.base === "USD")!.updatedAt).toBe("2026-08-21T04:00:00.000Z");
    expect(quotes).toHaveLength(2);
  });

  it("maps the international fallback onto the country each currency belongs to", () => {
    const quotes = parseErApi({
      time_last_update_utc: "Fri, 21 Aug 2026 00:02:31 +0000",
      rates: { ARS: 1497.29, BRL: 5.19, CLP: 922.3, PYG: 5999.7, BOB: 11.52, UYU: 40.05, JPY: 150 },
    });
    expect(quotes.map((quote) => quote.country).sort()).toEqual(["AR", "BO", "BR", "CL", "PY", "UY"]);
    expect(quotes.every((quote) => quote.kind === "reference")).toBe(true);
  });

  it("returns nothing for a dead feed instead of throwing", () => {
    expect(parseErApi(null)).toEqual([]);
    expect(parseBoDolarApi(null)).toEqual([]);
    expect(parseClDolarApi(null)).toEqual([]);
    expect(parseMindicador(null)).toEqual([]);
    expect(parseAwesome(null)).toEqual([]);
  });
});
