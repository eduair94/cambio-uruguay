import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("axios", () => ({
  default: {
    defaults: {},
    get: (...a: unknown[]) => get(...a),
  },
}));

import {
  DOLAR_AHORA_INSTITUTIONS,
  fetchDolarAhoraUsdRate,
  parseDolarAhoraUsdRate,
  resetDolarAhoraCache,
  withDolarAhoraFallback,
  withDolarAhoraOnlineRate,
} from "../classes/cambios/dolarahora";
import CambioBbva from "../classes/cambios/bbva";
import Itau from "../classes/cambios/itau";

const card = (host: string, buy: string, sell: string) => `
  <div class="card">
    <a href="https://www.${host}">${host}</a>
    <span>Compra</span><span>$</span><span>${buy}</span>
    <span>Venta</span><span>$</span><span>${sell}</span>
  </div>
`;

const CARDS_HTML = `
  <div class="grid">
    ${card("scotiabank.com.uy", "39,07", "41,27")}
    ${card("bbva.com.uy", "38", "42")}
    ${card("brou.com.uy", "39,4", "40,9")}
    ${card("santander.com.uy", "39,44", "40,91")}
    ${card("itau.com.uy", "39,15", "41,15")}
    ${card("oca.com.uy", "39,85", "40,45")}
    ${card("prexcard.com", "39,75", "40,55")}
  </div>
`;

describe("DolarAhora card parser", () => {
  it("extracts Scotiabank online USD independently from the other cards", () => {
    expect(parseDolarAhoraUsdRate(CARDS_HTML, "scotia")).toEqual({
      code: "USD",
      type: "TRANSFERENCIA",
      name: "Dólar online",
      buy: 39.07,
      sell: 41.27,
    });
  });

  it("extracts BBVA online USD independently from the other cards", () => {
    expect(parseDolarAhoraUsdRate(CARDS_HTML, "bbva")).toEqual({
      code: "USD",
      type: "TRANSFERENCIA",
      name: "Dólar online",
      buy: 38,
      sell: 42,
    });
  });

  it("labels Itaú's DólarAhora quote as its online rate", () => {
    expect(parseDolarAhoraUsdRate(CARDS_HTML, "itau")).toEqual({
      code: "USD",
      type: "TRANSFERENCIA",
      name: "Dólar online",
      buy: 39.15,
      sell: 41.15,
    });
  });

  it("reads every supported institution from a single cards response", () => {
    for (const institution of DOLAR_AHORA_INSTITUTIONS) {
      expect(parseDolarAhoraUsdRate(CARDS_HTML, institution)).toBeTruthy();
    }
  });

  it("labels BROU as eBROU because the card mirrors the online rate", () => {
    expect(parseDolarAhoraUsdRate(CARDS_HTML, "brou")).toEqual({
      code: "USD",
      type: "EBROU",
      name: "Dólar eBROU",
      buy: 39.4,
      sell: 40.9,
    });
  });

  it("labels OCA and Prex as the plain rate they quote on every channel", () => {
    expect(parseDolarAhoraUsdRate(CARDS_HTML, "oca")).toMatchObject({
      code: "USD",
      type: "",
      buy: 39.85,
      sell: 40.45,
    });
    expect(parseDolarAhoraUsdRate(CARDS_HTML, "prex")).toMatchObject({
      code: "USD",
      type: "",
      buy: 39.75,
      sell: 40.55,
    });
  });

  it("rejects missing cards and invalid spreads", () => {
    expect(parseDolarAhoraUsdRate("", "bbva")).toBeNull();
    expect(
      parseDolarAhoraUsdRate(
        `<div class="card"><a href="https://www.bbva.com.uy">BBVA</a>
         <span>Compra $42</span><span>Venta $41</span></div>`,
        "bbva"
      )
    ).toBeNull();
  });
});

describe("withDolarAhoraFallback", () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: CARDS_HTML });
    resetDolarAhoraCache();
  });

  it("keeps the casa's own rows and never calls DólarAhora", async () => {
    const own = [{ code: "USD", type: "", name: "Dólar", buy: 38.9, sell: 41.4 }];

    await expect(
      withDolarAhoraFallback("brou", "BROU", async () => own)
    ).resolves.toEqual(own);
    expect(get).not.toHaveBeenCalled();
  });

  it("fills the USD slot when the scraper returns no dollar", async () => {
    const ars = { code: "ARS", type: "", name: "", buy: 0.02, sell: 0.03 };

    await expect(
      withDolarAhoraFallback("prex", "Prex", async () => [ars])
    ).resolves.toEqual([
      ars,
      { code: "USD", type: "", name: "Dólar", buy: 39.75, sell: 40.55 },
    ]);
  });

  it("falls back when the scraper throws", async () => {
    await expect(
      withDolarAhoraFallback("santander", "Santander", async () => {
        throw new Error("login rejected");
      })
    ).resolves.toEqual([
      {
        code: "USD",
        type: "TRANSFERENCIA",
        name: "Dólar online",
        buy: 39.44,
        sell: 40.91,
      },
    ]);
  });

  it("returns whatever the scraper had when DólarAhora is down too", async () => {
    get.mockRejectedValue(new Error("ECONNRESET"));

    await expect(
      withDolarAhoraFallback("itau", "Itau", async () => [])
    ).resolves.toEqual([]);
  });

  it("serves every casa of a sync run from one cards request", async () => {
    await Promise.all(
      DOLAR_AHORA_INSTITUTIONS.map((institution) =>
        withDolarAhoraFallback(institution, institution, async () => [])
      )
    );

    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe("bank scrapers using DólarAhora", () => {
  beforeEach(() => {
    get.mockReset();
    resetDolarAhoraCache();
  });

  it("publishes BBVA from its DólarAhora card", async () => {
    get.mockResolvedValue({ data: CARDS_HTML });

    await expect(new CambioBbva("bbva").get_data()).resolves.toEqual([
      {
        code: "USD",
        type: "TRANSFERENCIA",
        name: "Dólar online",
        buy: 38,
        sell: 42,
      },
    ]);
  });

  it("keeps Itaú pizarra and appends the internet quote", async () => {
    const xml = `
      <cotizaciones>
        <cotizacion>
          <moneda>US.D</moneda>
          <compra>38,90</compra>
          <venta>41,50</venta>
        </cotizacion>
      </cotizaciones>
    `;
    get.mockImplementation(async (url: string) => {
      if (url === "https://www.itau.com.uy/inst/aci/cotiz.xml") {
        return { data: xml };
      }
      if (url === "https://dolarahora.uy/cards") {
        return { data: CARDS_HTML };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    await expect(new Itau("itau").get_data()).resolves.toEqual([
      {
        code: "USD",
        type: "",
        name: "US.D",
        buy: 38.9,
        sell: 41.5,
      },
      {
        code: "USD",
        type: "TRANSFERENCIA",
        name: "Dólar online",
        buy: 39.15,
        sell: 41.15,
      },
    ]);
  });

  it("does not duplicate an online rate already returned by a scraper", async () => {
    get.mockResolvedValue({ data: CARDS_HTML });
    const own = [
      {
        code: "USD",
        type: "TRANSFERENCIA",
        name: "Dólar Internet",
        buy: 39.1,
        sell: 41.1,
      },
    ];

    await expect(
      withDolarAhoraOnlineRate("itau", "Itau", async () => own)
    ).resolves.toEqual(own);
  });
});
