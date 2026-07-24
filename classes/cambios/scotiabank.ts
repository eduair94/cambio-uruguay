import axios from "axios";
import { load } from "cheerio";
import fs from "fs";
import "dotenv/config";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

const SCOTIABANK_BASE_URL =
  "https://www1.scotiabank.com.uy/scotiaenlinea";
const SCOTIABANK_LOGIN_URL = `${SCOTIABANK_BASE_URL}/login`;
const SCOTIABANK_ONE_LOGIN_URL = `${SCOTIABANK_BASE_URL}/misc/onelogin`;
const SCOTIABANK_RATES_URL =
  `${SCOTIABANK_BASE_URL}/widget/bannerAndMarketRateInfo?tzo=180`;

type ScotiabankSessionCache = {
  cookies: Record<string, string>;
};

type ScotiabankLoginResponse = {
  returnCode?: string;
  message?: string;
  critical?: boolean;
  redirectTo?: string | null;
};

const SCOTIABANK_RATE_MAPPING: Record<
  string,
  Pick<CambioObj, "code" | "type" | "name">
> = {
  dolar: { code: "USD", type: "", name: "Dólar" },
  "dolar internet": {
    code: "USD",
    type: "TRANSFERENCIA",
    name: "Dólar Internet",
  },
  "euro transferencia": {
    code: "EUR",
    type: "TRANSFERENCIA",
    name: "Euro Transferencia",
  },
  "unidad indexada": {
    code: "UI",
    type: "",
    name: "Unidad Indexada",
  },
};

function normalizeRateLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseScotiabankMoney(value: string): number {
  const compact = value.replace(/[^\d,.-]/g, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  const normalized =
    comma > dot
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "");
  return Number.parseFloat(normalized);
}

export function parseScotiabankLoginResponse(
  data: unknown
): ScotiabankLoginResponse | null {
  if (data && typeof data === "object") {
    return data as ScotiabankLoginResponse;
  }
  if (typeof data !== "string") return null;

  let serialized = data.trim().replace(/;$/, "").trim();
  if (serialized.startsWith("(") && serialized.endsWith(")")) {
    serialized = serialized.slice(1, -1).trim();
  }

  try {
    const parsed = JSON.parse(serialized);
    return parsed && typeof parsed === "object"
      ? (parsed as ScotiabankLoginResponse)
      : null;
  } catch {
    return null;
  }
}

export function parseScotiabankRates(html: string): CambioObj[] {
  if (!html) return [];

  const $ = load(html);
  const rates: CambioObj[] = [];

  $(".widget-rates table tbody tr, table.regular-table tbody tr").each(
    (_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;

      const labelCell = cells.eq(0).clone();
      labelCell.find("a, button").remove();
      const sourceLabel = labelCell.text().replace(/\s+/g, " ").trim();
      const conversion =
        SCOTIABANK_RATE_MAPPING[normalizeRateLabel(sourceLabel)];
      if (!conversion) return;

      const buy = parseScotiabankMoney(cells.eq(1).text());
      const sell = parseScotiabankMoney(cells.eq(2).text());
      const validSpread =
        conversion.code === "UI" ? buy <= sell : buy < sell;

      if (
        !Number.isFinite(buy) ||
        !Number.isFinite(sell) ||
        buy <= 0 ||
        sell <= 0 ||
        !validSpread
      ) {
        return;
      }

      rates.push({ ...conversion, buy, sell });
    }
  );

  return rates;
}

function isScotiabankSessionCookie(name: string): boolean {
  return name === "JSESSIONID" || name === "NAZCA" || name.startsWith("NAZCA-");
}

class CambioScotiabank extends Cambio {
  name = "Scotiabank";
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=1128";
  website = "https://www.scotiabank.com.uy/";
  favicon = "https://www.scotiabank.com.uy/";

  private readonly sessionCachePath =
    process.env.SCOTIABANK_SESSION_CACHE_PATH ||
    "scotiabank_session.json";
  private cookies: Record<string, string> = {};

  private readonly browserHeaders = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-UY,es;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  };

  private mergeSetCookies(setCookieHeaders?: string[]) {
    if (!Array.isArray(setCookieHeaders)) return;

    for (const rawCookie of setCookieHeaders) {
      const firstPart = rawCookie.split(";", 1)[0];
      const equalsAt = firstPart.indexOf("=");
      if (equalsAt <= 0) continue;

      const name = firstPart.slice(0, equalsAt).trim();
      if (!isScotiabankSessionCookie(name)) continue;
      this.cookies[name] = firstPart.slice(equalsAt + 1).trim();
    }
  }

  private cookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private loadCachedSession(): boolean {
    try {
      if (!fs.existsSync(this.sessionCachePath)) return false;

      const parsed = JSON.parse(
        fs.readFileSync(this.sessionCachePath, "utf8")
      ) as ScotiabankSessionCache;
      if (!parsed?.cookies || typeof parsed.cookies !== "object") {
        return false;
      }

      this.cookies = {};
      for (const [name, value] of Object.entries(parsed.cookies)) {
        if (isScotiabankSessionCookie(name) && typeof value === "string") {
          this.cookies[name] = value;
        }
      }

      return Boolean(this.cookies.JSESSIONID);
    } catch (error) {
      console.warn(
        "Scotiabank: could not read session cache",
        (error as Error).message
      );
      return false;
    }
  }

  private storeSession() {
    try {
      const cache: ScotiabankSessionCache = { cookies: this.cookies };
      fs.writeFileSync(this.sessionCachePath, JSON.stringify(cache), {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (error) {
      console.warn(
        "Scotiabank: could not cache session",
        (error as Error).message
      );
    }
  }

  private async fetchRates(): Promise<CambioObj[] | null> {
    try {
      const cookie = this.cookieHeader();
      const response = await axios.get(SCOTIABANK_RATES_URL, {
        headers: {
          ...this.browserHeaders,
          Accept: "text/html, */*; q=0.01",
          Referer: `${SCOTIABANK_BASE_URL}/desktop/`,
          "X-Requested-With": "XMLHttpRequest",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        maxRedirects: 0,
        timeout: 20000,
        validateStatus: () => true,
      });
      this.mergeSetCookies(response.headers?.["set-cookie"]);

      if (response.status !== 200 || typeof response.data !== "string") {
        return null;
      }

      const rates = parseScotiabankRates(response.data);
      const hasRetailUsd = rates.some(
        (rate) => rate.code === "USD" && rate.type === ""
      );
      return hasRetailUsd ? rates : null;
    } catch (error) {
      console.warn(
        "Scotiabank: could not fetch the quotation widget",
        (error as Error).message
      );
      return null;
    }
  }

  private async loginAndFetchRates(): Promise<CambioObj[] | null> {
    const user = process.env.SCOTIABANK_LOGIN_USER;
    const password = process.env.SCOTIABANK_LOGIN_PASSWORD;
    if (!user || !password) {
      console.warn(
        "Scotiabank: credentials not configured " +
          "(SCOTIABANK_LOGIN_USER, SCOTIABANK_LOGIN_PASSWORD)"
      );
      return null;
    }

    this.cookies = {};

    try {
      const loginPage = await axios.get(SCOTIABANK_LOGIN_URL, {
        headers: this.browserHeaders,
        maxRedirects: 0,
        timeout: 20000,
        validateStatus: () => true,
      });
      this.mergeSetCookies(loginPage.headers?.["set-cookie"]);
      if (loginPage.status !== 200) {
        console.warn(
          `Scotiabank: login page returned HTTP ${loginPage.status}`
        );
        return null;
      }

      const form = new URLSearchParams({
        idUser: user,
        password,
        environment: "",
      }).toString();
      const cookie = this.cookieHeader();
      const login = await axios.post(SCOTIABANK_ONE_LOGIN_URL, form, {
        headers: {
          ...this.browserHeaders,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type":
            "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: "https://www1.scotiabank.com.uy",
          Referer: SCOTIABANK_LOGIN_URL,
          "X-Requested-With": "XMLHttpRequest",
          csrfToken: "",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        maxRedirects: 0,
        timeout: 20000,
        validateStatus: () => true,
      });
      this.mergeSetCookies(login.headers?.["set-cookie"]);

      const loginData = parseScotiabankLoginResponse(login.data);
      if (
        login.status !== 200 ||
        !loginData ||
        loginData.returnCode !== "NAZ0000" ||
        loginData.critical === true
      ) {
        const returnCode = loginData?.returnCode || "unknown";
        console.warn(
          `Scotiabank: login failed with HTTP ${login.status} (${returnCode})`
        );
        return null;
      }

      const rates = await this.fetchRates();
      if (rates) this.storeSession();
      return rates;
    } catch (error) {
      console.warn(
        "Scotiabank: login failed",
        (error as Error).message
      );
      return null;
    }
  }

  async get_data(): Promise<CambioObj[]> {
    let rates: CambioObj[] | null = null;

    if (this.loadCachedSession()) {
      rates = await this.fetchRates();
      if (rates) this.storeSession();
    }

    if (!rates) {
      console.log(
        "Scotiabank: session missing or expired; authenticating with " +
          "SCOTIABANK_LOGIN_*"
      );
      rates = await this.loginAndFetchRates();
    }

    if (!rates) {
      console.warn(
        "Scotiabank: skipping rates because no valid quotation was found"
      );
      return [];
    }

    const retailUsd = rates.find(
      (rate) => rate.code === "USD" && rate.type === ""
    );
    console.log(
      `Scotiabank USD rates: buy=${retailUsd?.buy}, sell=${retailUsd?.sell}`
    );
    return rates;
  }
}

export default CambioScotiabank;
