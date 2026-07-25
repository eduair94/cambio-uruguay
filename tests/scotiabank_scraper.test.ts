import axios from "axios";
import fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDolarAhoraCache } from "../classes/cambios/dolarahora";
import CambioScotiabank, {
  parseScotiabankLoginResponse,
  parseScotiabankRates,
} from "../classes/cambios/scotiabank";

const DOLAR_AHORA_HTML = `
  <div class="card">
    <a href="https://www.scotiabank.com.uy">ScotiaBank</a>
    <span>Compra</span><span>$</span><span>39,07</span>
    <span>Venta</span><span>$</span><span>41,27</span>
  </div>
`;

const QUOTATION_HTML = `
  <div class="widget-rates">
    <table class="regular-table">
      <thead>
        <tr><th>Moneda</th><th>Compra</th><th>Venta</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><span>Dolar</span></td>
          <td class="aligned-right">38,91</td>
          <td class="aligned-right">41,51</td>
        </tr>
        <tr>
          <td>
            <span>
              Dolar Internet
              <a href="/transfer"><button>Compra Venta</button></a>
            </span>
          </td>
          <td class="aligned-right">39,11</td>
          <td class="aligned-right">41,31</td>
        </tr>
        <tr>
          <td><span>Euro Transferencia</span></td>
          <td class="aligned-right">43,94</td>
          <td class="aligned-right">47,58</td>
        </tr>
        <tr>
          <td><span>Unidad Indexada</span></td>
          <td class="aligned-right">6,62</td>
          <td class="aligned-right">6,62</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

const originalUser = process.env.SCOTIABANK_LOGIN_USER;
const originalPassword = process.env.SCOTIABANK_LOGIN_PASSWORD;

beforeEach(() => {
  resetDolarAhoraCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalUser === undefined) {
    delete process.env.SCOTIABANK_LOGIN_USER;
  } else {
    process.env.SCOTIABANK_LOGIN_USER = originalUser;
  }
  if (originalPassword === undefined) {
    delete process.env.SCOTIABANK_LOGIN_PASSWORD;
  } else {
    process.env.SCOTIABANK_LOGIN_PASSWORD = originalPassword;
  }
});

describe("Scotiabank quotation parser", () => {
  it("parses the parenthesized JSON returned by the login JSP", () => {
    expect(
      parseScotiabankLoginResponse(`
        ({
          "returnCode": "NAZ0000",
          "critical": false,
          "redirectTo": null
        })
      `)
    ).toEqual({
      returnCode: "NAZ0000",
      critical: false,
      redirectTo: null,
    });
  });

  it("maps the authenticated widget to the supported currencies", () => {
    expect(parseScotiabankRates(QUOTATION_HTML)).toEqual([
      {
        code: "USD",
        type: "",
        name: "Dólar",
        buy: 38.91,
        sell: 41.51,
      },
      {
        code: "USD",
        type: "TRANSFERENCIA",
        name: "Dólar Internet",
        buy: 39.11,
        sell: 41.31,
      },
      {
        code: "EUR",
        type: "TRANSFERENCIA",
        name: "Euro Transferencia",
        buy: 43.94,
        sell: 47.58,
      },
      {
        code: "UI",
        type: "",
        name: "Unidad Indexada",
        buy: 6.62,
        sell: 6.62,
      },
    ]);
  });

  it.each([
    "",
    "<html><form id='formOneStep'></form></html>",
    QUOTATION_HTML.replace("38,91", "42,00").replace(
      "41,51",
      "41,00"
    ),
    QUOTATION_HTML.replace("38,91", "sin dato"),
  ])("does not expose an invalid retail USD quotation", (html) => {
    const retailUsd = parseScotiabankRates(html).find(
      (rate) => rate.code === "USD" && rate.type === ""
    );
    expect(retailUsd).toBeUndefined();
  });
});

describe("CambioScotiabank.get_data", () => {
  it("logs in, caches only session cookies, and returns official rates", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const writeSpy = vi
      .spyOn(fs, "writeFileSync")
      .mockImplementation(() => undefined);
    const getSpy = vi.spyOn(axios, "get");
    getSpy
      .mockResolvedValueOnce({
        status: 200,
        data: "<html>login</html>",
        headers: {
          "set-cookie": [
            "NAZCA=initial; Path=/",
            "tracking=must-not-be-cached; Path=/",
          ],
        },
      } as any)
      .mockResolvedValueOnce({
        status: 200,
        data: QUOTATION_HTML,
        headers: {},
      } as any);
    const postSpy = vi.spyOn(axios, "post").mockResolvedValue({
      status: 200,
      data: `({
        "returnCode": "NAZ0000",
        "critical": false,
        "redirectTo": null
      })`,
      headers: {
        "set-cookie": [
          "JSESSIONID=fresh-session; Path=/; HttpOnly",
          "NAZCA-BCSID=browser-session; Path=/; Secure",
          "NAZCA-dynamic=session-protection; Path=/; Secure",
        ],
      },
    } as any);
    process.env.SCOTIABANK_LOGIN_USER = "12345678";
    process.env.SCOTIABANK_LOGIN_PASSWORD = "test-password";

    const data = await new CambioScotiabank(
      "scotiabank"
    ).get_data();

    expect(data).toHaveLength(4);
    expect(data[0]).toMatchObject({
      code: "USD",
      type: "",
      buy: 38.91,
      sell: 41.51,
    });
    expect(postSpy).toHaveBeenCalledWith(
      "https://www1.scotiabank.com.uy/scotiaenlinea/misc/onelogin",
      expect.stringContaining("idUser=12345678"),
      expect.objectContaining({ maxRedirects: 0 })
    );

    const cached = JSON.parse(String(writeSpy.mock.calls[0][1]));
    expect(cached.cookies).toEqual({
      NAZCA: "initial",
      JSESSIONID: "fresh-session",
      "NAZCA-BCSID": "browser-session",
      "NAZCA-dynamic": "session-protection",
    });
    expect(cached.cookies).not.toHaveProperty("tracking");
  });

  it("reuses a valid cached session without submitting credentials", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        cookies: {
          JSESSIONID: "cached-session",
          NAZCA: "cached-protection",
          tracking: "must-not-be-loaded",
        },
      })
    );
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(axios, "get").mockResolvedValue({
      status: 200,
      data: QUOTATION_HTML,
      headers: {},
    } as any);
    const postSpy = vi.spyOn(axios, "post");

    const data = await new CambioScotiabank(
      "scotiabank"
    ).get_data();

    expect(data).toHaveLength(4);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("records the rejection so the next syncs do not lock the account", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const writeSpy = vi
      .spyOn(fs, "writeFileSync")
      .mockImplementation(() => undefined);
    vi.spyOn(axios, "get").mockResolvedValue({
      status: 200,
      data: DOLAR_AHORA_HTML,
      headers: {},
    } as any);
    vi.spyOn(axios, "post").mockResolvedValue({
      status: 400,
      data: `({"returnCode": "RUB0220", "critical": true})`,
      headers: {},
    } as any);
    process.env.SCOTIABANK_LOGIN_USER = "12345678";
    process.env.SCOTIABANK_LOGIN_PASSWORD = "wrong-password";

    const data = await new CambioScotiabank("scotiabank").get_data();

    expect(data).toEqual([
      {
        code: "USD",
        type: "TRANSFERENCIA",
        name: "Dólar online",
        buy: 39.07,
        sell: 41.27,
      },
    ]);
    const cached = JSON.parse(String(writeSpy.mock.calls[0][1]));
    expect(cached.loginRejectionCode).toBe("RUB0220");
    expect(Date.parse(cached.loginRejectedAt)).toBeLessThanOrEqual(Date.now());
  });

  it("skips the login while the rejection cooldown is running", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        cookies: {},
        loginRejectedAt: new Date(Date.now() - 60_000).toISOString(),
        loginRejectionCode: "RUB0221",
      })
    );
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(axios, "get").mockResolvedValue({
      status: 200,
      data: DOLAR_AHORA_HTML,
      headers: {},
    } as any);
    const postSpy = vi.spyOn(axios, "post");
    process.env.SCOTIABANK_LOGIN_USER = "12345678";
    process.env.SCOTIABANK_LOGIN_PASSWORD = "wrong-password";

    const data = await new CambioScotiabank("scotiabank").get_data();

    expect(postSpy).not.toHaveBeenCalled();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ type: "TRANSFERENCIA", buy: 39.07 });
  });

  it("retries the login once the cooldown window has elapsed", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        cookies: {},
        loginRejectedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        loginRejectionCode: "RUB0220",
      })
    );
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(axios, "get").mockResolvedValue({
      status: 200,
      data: QUOTATION_HTML,
      headers: {},
    } as any);
    const postSpy = vi.spyOn(axios, "post").mockResolvedValue({
      status: 200,
      data: `({"returnCode": "NAZ0000", "critical": false})`,
      headers: { "set-cookie": ["JSESSIONID=fresh; Path=/"] },
    } as any);
    process.env.SCOTIABANK_LOGIN_USER = "12345678";
    process.env.SCOTIABANK_LOGIN_PASSWORD = "test-password";

    const data = await new CambioScotiabank("scotiabank").get_data();

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(data).toHaveLength(4);
  });
});
