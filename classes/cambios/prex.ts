import axios from "axios";
import { load } from "cheerio";
import dotenv from "dotenv";
import fs from "fs";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
dotenv.config();
const e = process.env;

class CambioPrex extends Cambio {
  name = "Prex";
  bcu = "https://www.bcu.gub.uy/Sistema-de-Pagos/Paginas/prex.aspx";
  website = `https://www.prexcard.com`;
  favicon = "https://www.prexcard.com";
  private getProxyConfig() {
    try {
      const proxyPath = "proxy.txt";
      if (fs.existsSync(proxyPath)) {
        const proxyUrl = fs.readFileSync(proxyPath, "utf8").trim();
        if (proxyUrl) {
          const httpAgent = new HttpProxyAgent(`http://${proxyUrl}`);
          const httpsAgent = new HttpsProxyAgent(`http://${proxyUrl}`);
          return {
            httpAgent: httpAgent,
            httpsAgent: httpsAgent,
          };
        }
      }
    } catch (error) {
      console.log("No proxy configuration found or error reading proxy.txt");
    }
    return {};
  }

  async login() {
    const url = "https://www.prexcard.com/api/login";
    const headers = {
      authorization: "Bearer TokenAPP011001010",
      "accept-charset": "UTF-8",
      "accept-encoding": "gzip",
      connection: "Keep-Alive",
      "content-type": "application/json",
      "device-app-version": "10.49.45",
      "device-manufacturer": "Xiaomi",
      "device-model": "M2102J20SG",
      "device-platform": "Android",
      "device-serial": "unknown",
      "device-uuid": "dd600187f3582fa7",
      "device-version": "11",
      host: "www.prexcard.com",
      "user-agent": "Dalvik/2.1.0 (Linux; U; Android 11; M2102J20SG Build/RKQ1.200826.002)",
    };
    const json = {
      Documento: process.env.prexEmail,
      Password: process.env.prexPassword,
      TipoDocumento: "CI",
      TipoPersona: "1",
      UuidDevice: "dd600187f3582fa7",
      ModelDevice: "M2102J20SG",
      VersionDevice: "11",
      SerialDevice: "unknown",
      PlatformDevice: "Android",
      ManufacturerDevice: "Xiaomi",
      TokenFCM: "",
      AppVersion: "10.49.45",
    };
    const res = await axios
      .post(url, json, { headers, ...this.getProxyConfig() })
      .then((res) => res.data)
      .catch((e) => {
        console.log("Error", url);
      });
    return e.token;
  }

  /**
   * Get USD exchange rate from the cambiomoneda page using web session
   * Requires PHPSESSID cookie and user ID from environment variables
   */
  async get_usd_from_web(): Promise<{ buy: number; sell: number } | null> {
    try {
      const phpSessionId = process.env.prex_session_id;
      const userId = process.env.prex_user_id;

      if (!phpSessionId || !userId) {
        console.log("Prex web session credentials not configured (prex_session_id, prex_user_id)");
        return null;
      }

      const url = `https://www.prexcard.com/cambiomoneda/${userId}`;
      const headers = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "es-ES,es;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        cookie: `PHPSESSID=${phpSessionId}; promo=1`,
        Referer: `https://www.prexcard.com/usuarios/cuentav2/${userId}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      };

      const res = await axios.get(url, { headers, ...this.getProxyConfig() });
      const html = res.data;

      if (typeof html === "string") {
        const $ = load(html);

        // Check if we're on the login page (session expired)
        const title = $("title").text();
        if (title.includes("Ingresar") || title.includes("Login")) {
          console.log("Prex session expired, please update prexPHPSESSID");
          return null;
        }

        // Extract buy and sell rates from the cambiomoneda page
        // <p id="pizarra-compra" class="px-azul px-pizarra">39,00</p>
        // <p id="pizarra-venta" class="px-azul px-pizarra">39,40</p>
        const buyText = $("#pizarra-compra").text().trim();
        const sellText = $("#pizarra-venta").text().trim();

        if (buyText && sellText) {
          // Parse the values (format: "39,00" - uses comma as decimal separator)
          const buy = parseFloat(buyText.replace(",", "."));
          const sell = parseFloat(sellText.replace(",", "."));

          if (!isNaN(buy) && !isNaN(sell)) {
            console.log(`Prex USD rates from web: buy=${buy}, sell=${sell}`);
            return { buy, sell };
          }
        }

        console.log("Prex: Could not find exchange rates in cambiomoneda page");
        return null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching Prex USD from web:", error);
      return null;
    }
  }
  async prex_ar(token: string) {
    const url = "https://www.prexcard.com/hacelabien";
    const headers = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-N976N Build/N2G48H)",
    };
    const res = await axios.get(url, { headers, ...this.getProxyConfig() }).catch((e) => {
      console.error(e);
      return {
        data: null,
      };
    });
    const d = res.data;
    if (d && typeof d === "string") {
      const $ = load(d);
      const cotArg = parseFloat($("#cotizacionArg").attr("value"));
      const cotUy = parseFloat($("#cotizacionUy").attr("value"));
      return {
        cotArg,
        cotUy,
      };
    } else {
      console.log("Error fetching Prex AR data", d);
      return null;
    }
  }
  async get_usd(token: string) {
    const url = "https://www.prexcard.com/api/cotizacion_usd";
    const header = {
      "Accept-Charset": "UTF-8",
      Authorization: `Bearer ${token}`,
      "Device-Serial": "2070937402d119c1",
      "Device-Manufacturer": "samsung",
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-N976N Build/N2G48H)",
      Host: "www.prexcard.com",
      "Accept-Encoding": "gzip",
    };
    const body = {};
    const res = await axios.post(url, body, { headers: header, ...this.getProxyConfig() }).then((res) => res.data);
    return { buy: res.compra, sell: res.venta };
  }
  async get_data(): Promise<CambioObj[]> {
    const ar = await this.prex_ar("");

    // Try to get USD rates from web first (cambiomoneda page)
    let usdRates = await this.get_usd_from_web();

    // Fallback to API if web scraping fails
    if (!usdRates) {
      try {
        const token = await this.login();
        usdRates = await this.get_usd(token);
      } catch (error) {
        console.error("Error fetching Prex USD from API:", error);
        usdRates = null;
      }
    }

    const f: CambioObj[] = [];

    if (usdRates) {
      f.push({
        code: "USD",
        type: "",
        name: "",
        buy: usdRates.buy,
        sell: usdRates.sell,
      });
    }

    if (ar) {
      const num = Math.round((ar.cotUy / ar.cotArg) * 100) / 100;
      f.push({
        code: "ARS",
        type: "",
        name: "",
        buy: num,
        sell: num,
      });
    }

    return f;
  }
}

export default CambioPrex;
