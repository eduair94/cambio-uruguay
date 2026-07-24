import axios from "axios";
import { load } from "cheerio";
import fs from "fs";
import "dotenv/config";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import {
  locationSlug,
  reconcileLocationIds,
} from "../location_sync";

const OCA_BASE_URL = "https://micuentanuevo.oca.com.uy/trx";
const OCA_BRANCHES_URL =
  "https://www.oca.com.uy/institucional/sucursales.aspx?contacto=oca";
const OCA_SESSION_COOKIE_NAMES = new Set(["AWSALB", "AWSALBCORS", "JSESSIONID"]);
const OCA_BRANCH_SOURCE = "oca-official";
const PANDO_FALLBACK_COORDINATES = {
  latitude: -34.7183676,
  longitude: -55.9604993,
};

const OCA_INTERIOR_GEOGRAPHY: Record<
  string,
  { department: string; locality: string }
> = {
  "nueva sucursal pando": {
    department: "CANELONES",
    locality: "PANDO",
  },
  canelones: { department: "CANELONES", locality: "CANELONES" },
  colonia: {
    department: "COLONIA",
    locality: "COLONIA DEL SACRAMENTO",
  },
  durazno: { department: "DURAZNO", locality: "DURAZNO" },
  "nueva sucursal florida": {
    department: "FLORIDA",
    locality: "FLORIDA",
  },
  "las piedras": { department: "CANELONES", locality: "LAS PIEDRAS" },
  maldonado: { department: "MALDONADO", locality: "MALDONADO" },
  melo: { department: "CERRO LARGO", locality: "MELO" },
  mercedes: { department: "SORIANO", locality: "MERCEDES" },
  minas: { department: "LAVALLEJA", locality: "MINAS" },
  paysandu: { department: "PAYSANDÚ", locality: "PAYSANDÚ" },
  rivera: { department: "RIVERA", locality: "RIVERA" },
  rocha: { department: "ROCHA", locality: "ROCHA" },
  salto: { department: "SALTO", locality: "SALTO" },
  "san carlos": { department: "MALDONADO", locality: "SAN CARLOS" },
  "nueva sucursal san jose": {
    department: "SAN JOSÉ",
    locality: "SAN JOSÉ DE MAYO",
  },
  "shopping costa urbana": {
    department: "CANELONES",
    locality: "CIUDAD DE LA COSTA",
  },
  tacuarembo: { department: "TACUAREMBÓ", locality: "TACUAREMBÓ" },
  "nueva sucursal treinta y tres": {
    department: "TREINTA Y TRES",
    locality: "TREINTA Y TRES",
  },
  trinidad: { department: "FLORES", locality: "TRINIDAD" },
};

type OcaUsdRate = {
  buy: number;
  sell: number;
};

export type OcaBranch = {
  id: string;
  name: string;
  address: string;
  department: string;
  locality: string;
  hours: string;
  latitude: number;
  longitude: number;
};

type OcaSessionCache = {
  cookies: Record<string, string>;
};

function parseOcaMoney(value: string): number {
  const compact = value.replace(/[^\d,.-]/g, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  const normalized =
    comma > dot
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "");
  return Number.parseFloat(normalized);
}

export function parseOcaUsdRate(html: string): OcaUsdRate | null {
  if (!html) return null;

  const $ = load(html);
  let rate: OcaUsdRate | null = null;

  $(".tabla-cotizacion tbody tr").each((_, row) => {
    if (rate) return;

    const cells = $(row)
      .find("td")
      .map((__, cell) => $(cell).text().trim())
      .get();

    if (cells.length < 3 || !/d[oó]lar/i.test(cells[0])) return;

    const buy = parseOcaMoney(cells[1]);
    const sell = parseOcaMoney(cells[2]);
    if (
      Number.isFinite(buy) &&
      Number.isFinite(sell) &&
      buy > 0 &&
      sell > 0 &&
      buy < sell
    ) {
      rate = { buy, sell };
    }
  });

  return rate;
}

function normalizedBranchName(name: string): string {
  return locationSlug(name).replace(/-/g, " ");
}

export function parseOcaBranches(html: string): OcaBranch[] {
  const $ = load(html);
  const branches: OcaBranch[] = [];

  $("dl.accordion > dt").each((_, heading) => {
    const group = $(heading).text().trim().toLowerCase();
    const isMontevideo = group === "montevideo";

    $(heading)
      .next("dd")
      .find("ul.place-list > li")
      .each((__, item) => {
        const element = $(item);
        const name = element.find("h4").first().text().trim();
        const address = element.find(".ic-place").first().text().trim();
        const hours = element
          .find(".ic-time, .ic-alert")
          .map((___, detail) => $(detail).text().trim())
          .get()
          .filter(Boolean)
          .join(" ");
        if (!name || !address) return;

        const geography = isMontevideo
          ? { department: "MONTEVIDEO", locality: "MONTEVIDEO" }
          : OCA_INTERIOR_GEOGRAPHY[normalizedBranchName(name)];
        if (!geography) {
          throw new Error(`OCA branch has unknown geography: ${name}`);
        }

        let latitude = Number(element.attr("data-latitud"));
        let longitude = Number(element.attr("data-longitud"));
        if (
          normalizedBranchName(name) === "nueva sucursal pando" &&
          (!Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude === 0 ||
            longitude === 0)
        ) {
          ({ latitude, longitude } = PANDO_FALLBACK_COORDINATES);
        }
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude === 0 ||
          longitude === 0
        ) {
          throw new Error(`OCA branch has no coordinates: ${name}`);
        }

        branches.push({
          id: `oca-${locationSlug(name)}`,
          name,
          address,
          department: geography.department,
          locality: geography.locality,
          hours,
          latitude,
          longitude,
        });
      });
  });

  return branches;
}

class CambioOca extends Cambio {
  name = "OCA";
  bcu = "https://www.bcu.gub.uy/Sistema-de-Pagos/Paginas/ocade.aspx";
  website = "https://oca.com.uy";
  favicon = "https://oca.com.uy";

  private readonly sessionCachePath =
    process.env.OCA_SESSION_CACHE_PATH || "oca_session.json";
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
      if (!OCA_SESSION_COOKIE_NAMES.has(name)) continue;
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
      ) as OcaSessionCache;
      const cachedCookies = parsed?.cookies;
      if (!cachedCookies || typeof cachedCookies !== "object") return false;

      this.cookies = {};
      for (const [name, value] of Object.entries(cachedCookies)) {
        if (OCA_SESSION_COOKIE_NAMES.has(name) && typeof value === "string") {
          this.cookies[name] = value;
        }
      }

      return Boolean(this.cookies.JSESSIONID);
    } catch (error) {
      console.warn(
        "OCA: could not read session cache",
        (error as Error).message
      );
      return false;
    }
  }

  private storeSession() {
    try {
      const cache: OcaSessionCache = { cookies: this.cookies };
      fs.writeFileSync(this.sessionCachePath, JSON.stringify(cache), {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (error) {
      console.warn(
        "OCA: could not cache session",
        (error as Error).message
      );
    }
  }

  private async fetchRates(
    url = `${OCA_BASE_URL}/`
  ): Promise<OcaUsdRate | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          ...this.browserHeaders,
          ...(this.cookieHeader() ? { Cookie: this.cookieHeader() } : {}),
        },
        maxRedirects: 0,
        timeout: 20000,
        validateStatus: () => true,
      });
      this.mergeSetCookies(response.headers?.["set-cookie"]);

      if (response.status !== 200 || typeof response.data !== "string") {
        return null;
      }

      return parseOcaUsdRate(response.data);
    } catch (error) {
      console.warn(
        "OCA: could not fetch the quotation page",
        (error as Error).message
      );
      return null;
    }
  }

  private async loginAndFetchRates(): Promise<OcaUsdRate | null> {
    const user = process.env.OCA_LOGIN_USER;
    const password = process.env.OCA_LOGIN_PASSWORD;
    if (!user || !password) {
      console.warn(
        "OCA: credentials not configured (OCA_LOGIN_USER, OCA_LOGIN_PASSWORD)"
      );
      return null;
    }

    this.cookies = {};
    const form = new URLSearchParams({
      tipo_documento: "1",
      nro_documento: user,
      tipo_usuario: "R",
      pass: password,
      fingerprint: "",
    }).toString();

    try {
      const loginPage = await axios.get(`${OCA_BASE_URL}/login`, {
        headers: this.browserHeaders,
        maxRedirects: 0,
        timeout: 20000,
        validateStatus: () => true,
      });
      this.mergeSetCookies(loginPage.headers?.["set-cookie"]);
      if (loginPage.status !== 200) {
        console.warn(`OCA: login page returned HTTP ${loginPage.status}`);
        return null;
      }

      const login = await axios.post(`${OCA_BASE_URL}/doLogin`, form, {
        headers: {
          ...this.browserHeaders,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: this.cookieHeader(),
          Origin: "https://micuentanuevo.oca.com.uy",
          Referer: `${OCA_BASE_URL}/login`,
        },
        maxRedirects: 0,
        timeout: 20000,
        validateStatus: () => true,
      });
      this.mergeSetCookies(login.headers?.["set-cookie"]);

      const location = login.headers?.location;
      if (login.status !== 302 || !location) {
        console.warn(`OCA: login failed with HTTP ${login.status}`);
        return null;
      }

      const homeUrl = new URL(location, `${OCA_BASE_URL}/`).toString();
      const rate = await this.fetchRates(homeUrl);
      if (rate) this.storeSession();
      return rate;
    } catch (error) {
      console.warn("OCA: login failed", (error as Error).message);
      return null;
    }
  }

  async getLocations(): Promise<string[]> {
    const response = await axios.get(OCA_BRANCHES_URL, {
      headers: this.browserHeaders,
      timeout: 20000,
    });
    const branches = parseOcaBranches(String(response.data || ""));
    if (branches.length < 20) {
      throw new Error(
        `OCA returned only ${branches.length} branches; refusing to reconcile`
      );
    }

    const existing = await this.db_suc.allEntries({ origin: this.origin });
    const reconciliation = reconcileLocationIds(
      existing,
      branches.map((branch) => branch.id),
      OCA_BRANCH_SOURCE,
      (id) => id.startsWith("oca-")
    );
    const verifiedAt = new Date();

    for (const branch of branches) {
      const status =
        reconciliation.currentStatusById.get(branch.id) ?? 1;
      await this.db_suc.getAnUpdateEntryAlt(
        { id: branch.id },
        {
          origin: this.origin,
          NroSucursal: branch.id.slice(4),
          Nombre: branch.name,
          Direccion: branch.address,
          Departamento: branch.department,
          Localidad: branch.locality,
          Horarios: branch.hours,
          latitude: branch.latitude,
          longitude: branch.longitude,
          map: `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`,
          status,
          source: OCA_BRANCH_SOURCE,
          sourceUrl: OCA_BRANCHES_URL,
          sourceLastSeenAt: verifiedAt,
          ...(status === 1 ? { closedAt: null, closedSource: null } : {}),
        }
      );
    }

    for (const id of reconciliation.idsToClose) {
      await this.db_suc.updateOneAlt(
        { id },
        {
          status: 0,
          closedAt: verifiedAt,
          closedSource: OCA_BRANCH_SOURCE,
          sourceUrl: OCA_BRANCHES_URL,
        }
      );
    }

    console.log(
      this.origin,
      `Sucursales OCA: ${branches.length}; cerradas: ${reconciliation.idsToClose.length}`
    );
    return Array.from(
      new Set(branches.map((branch) => branch.department))
    );
  }

  async get_data(): Promise<CambioObj[]> {
    let rate: OcaUsdRate | null = null;

    if (this.loadCachedSession()) {
      rate = await this.fetchRates();
      if (rate) this.storeSession();
    }

    if (!rate) {
      console.log(
        "OCA: session missing or expired; authenticating with OCA_LOGIN_*"
      );
      rate = await this.loginAndFetchRates();
    }

    if (!rate) {
      console.warn("OCA: skipping USD because no valid quotation was found");
      return [];
    }

    console.log(`OCA USD rates: buy=${rate.buy}, sell=${rate.sell}`);
    return [
      {
        code: "USD",
        type: "",
        name: "Dólar",
        buy: rate.buy,
        sell: rate.sell,
      },
    ];
  }
}

export default CambioOca;
