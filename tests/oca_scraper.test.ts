import axios from "axios";
import fs from "fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import CambioOca, { parseOcaUsdRate } from "../classes/cambios/oca";

const QUOTATION_HTML = `
  <section>
    <table class="tabla-cotizacion">
      <thead>
        <tr><th>Moneda</th><th>Compra</th><th>Venta</th></tr>
      </thead>
      <tbody>
        <tr><td>Dólar</td><td>$ 39,90</td><td>$ 40,50</td></tr>
      </tbody>
    </table>
  </section>
`;

const originalOcaUser = process.env.OCA_LOGIN_USER;
const originalOcaPassword = process.env.OCA_LOGIN_PASSWORD;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalOcaUser === undefined) delete process.env.OCA_LOGIN_USER;
  else process.env.OCA_LOGIN_USER = originalOcaUser;
  if (originalOcaPassword === undefined) delete process.env.OCA_LOGIN_PASSWORD;
  else process.env.OCA_LOGIN_PASSWORD = originalOcaPassword;
});

describe("OCA quotation parser", () => {
  it("maps the authenticated Mi Cuenta table to a USD quotation", () => {
    expect(parseOcaUsdRate(QUOTATION_HTML)).toEqual({
      buy: 39.9,
      sell: 40.5,
    });
  });

  it.each([
    "",
    "<html><form id='form_login'></form></html>",
    QUOTATION_HTML.replace("$ 39,90", "$ 41,00").replace(
      "$ 40,50",
      "$ 40,00"
    ),
    QUOTATION_HTML.replace("$ 39,90", "sin dato"),
  ])("rejects pages without a valid retail spread", (html) => {
    expect(parseOcaUsdRate(html)).toBeNull();
  });
});

describe("CambioOca.get_data", () => {
  it("logs in, caches only session cookies, and returns the official rate", async () => {
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
            "AWSALB=load-balancer; Path=/",
            "tracking=must-not-be-cached; Path=/",
          ],
        },
      } as any)
      .mockResolvedValueOnce({
        status: 200,
        data: QUOTATION_HTML,
        headers: {
          "set-cookie": ["JSESSIONID=fresh-session; Path=/; HttpOnly"],
        },
      } as any);
    const postSpy = vi.spyOn(axios, "post").mockResolvedValue({
      status: 302,
      data: "",
      headers: {
        location:
          "https://micuentanuevo.oca.com.uy/trx/;jsessionid=fresh-session",
        "set-cookie": [
          "AWSALBCORS=cors-cookie; Path=/; Secure",
          "JSESSIONID=fresh-session; Path=/; HttpOnly",
        ],
      },
    } as any);
    process.env.OCA_LOGIN_USER = "12345678";
    process.env.OCA_LOGIN_PASSWORD = "test-password";

    const data = await new CambioOca("oca").get_data();

    expect(data).toEqual([
      {
        code: "USD",
        type: "",
        name: "Dólar",
        buy: 39.9,
        sell: 40.5,
      },
    ]);
    expect(postSpy).toHaveBeenCalledWith(
      "https://micuentanuevo.oca.com.uy/trx/doLogin",
      expect.stringContaining("nro_documento=12345678"),
      expect.objectContaining({ maxRedirects: 0 })
    );

    const cached = JSON.parse(String(writeSpy.mock.calls[0][1]));
    expect(cached.cookies).toEqual({
      AWSALB: "load-balancer",
      AWSALBCORS: "cors-cookie",
      JSESSIONID: "fresh-session",
    });
    expect(cached.cookies).not.toHaveProperty("tracking");
  });

  it("reuses a valid cached session without submitting credentials", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        cookies: {
          AWSALB: "load-balancer",
          AWSALBCORS: "cors-cookie",
          JSESSIONID: "cached-session",
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

    const data = await new CambioOca("oca").get_data();

    expect(data).toHaveLength(1);
    expect(postSpy).not.toHaveBeenCalled();
  });
});
