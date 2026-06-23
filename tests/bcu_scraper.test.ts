import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import CambioBCU from "../classes/cambios/bcu";
import * as bcuSoap from "../classes/bcu_soap";

// One HTML row in the post-2025-redesign layout the cheerio fallback expects.
const HTML_FIXTURE = `
  <table><tbody>
    <tr>
      <td class="Moneda">DLS. USA BILLETE</td>
      <td class="Fecha">15/06/2026</td>
      <td class="Venta">41,00</td>
      <td class="Compra">40,00</td>
    </tr>
  </tbody></table>
`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CambioBCU.get_data — SOAP primary", () => {
  it("returns SOAP quotes and does not touch the HTML page when SOAP succeeds", async () => {
    const soapSpy = vi.spyOn(bcuSoap, "fetchCurrentCotizaciones").mockResolvedValue([
      { date: new Date(), code: "USD", type: "BILLETE", name: "DLS. USA BILLETE", buy: 40.1, sell: 40.1 },
      { date: new Date(), code: "UI", type: "", name: "UNIDAD INDEXADA", buy: 6.5, sell: 6.5 },
    ]);
    const axiosSpy = vi.spyOn(axios, "get");

    const cambio = new CambioBCU("bcu");
    const data = await cambio.get_data();

    expect(soapSpy).toHaveBeenCalledOnce();
    expect(axiosSpy).not.toHaveBeenCalled();
    expect(data).toEqual([
      { code: "USD", type: "BILLETE", name: "DLS. USA BILLETE", buy: 40.1, sell: 40.1 },
      { code: "UI", type: "", name: "UNIDAD INDEXADA", buy: 6.5, sell: 6.5 },
    ]);
  });
});

describe("CambioBCU.get_data — HTML fallback", () => {
  it("falls back to the HTML scrape when SOAP throws", async () => {
    vi.spyOn(bcuSoap, "fetchCurrentCotizaciones").mockRejectedValue(new Error("soap down"));
    vi.spyOn(axios, "get").mockResolvedValue({ data: HTML_FIXTURE });

    const cambio = new CambioBCU("bcu");
    const data = await cambio.get_data();

    expect(data).toEqual([
      { code: "USD", type: "BILLETE", name: "DLS. USA BILLETE", buy: 40, sell: 41 },
    ]);
  });

  it("falls back to the HTML scrape when SOAP returns no rows", async () => {
    vi.spyOn(bcuSoap, "fetchCurrentCotizaciones").mockResolvedValue([]);
    const axiosSpy = vi.spyOn(axios, "get").mockResolvedValue({ data: HTML_FIXTURE });

    const cambio = new CambioBCU("bcu");
    const data = await cambio.get_data();

    expect(axiosSpy).toHaveBeenCalledOnce();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ code: "USD", type: "BILLETE" });
  });
});
