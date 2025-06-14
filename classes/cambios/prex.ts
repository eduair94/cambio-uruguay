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
    const token = await this.login();
    const ar = await this.prex_ar(token);
    const { buy, sell } = await this.get_usd(token);
    const f = [
      {
        code: "USD",
        type: "",
        name: "",
        buy: buy,
        sell: sell,
      },
    ];
    let arF = null;
    if (ar) {
      const num = Math.round((ar.cotUy / ar.cotArg) * 100) / 100;
      arF = {
        code: "ARS",
        type: "",
        name: "",
        buy: num,
        sell: num,
      };
    }
    if (arF) {
      f.push(arF);
    }
    return f;
  }
}

export default CambioPrex;
