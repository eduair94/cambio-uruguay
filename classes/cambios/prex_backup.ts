import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import dotenv from "dotenv";
const cfg = dotenv.config();
const e = process.env;

class CambioPrex extends Cambio {
  bcu = "https://www.bcu.gub.uy/Sistema-de-Pagos/Paginas/prex.aspx";
  website = "https://www.prexcard.com/cambiomoneda/585737";
  favicon = "https://www.prexcard.com";
  async prex_ar() {
    const url =
      "https://www.prexcard.com/api/prex_a_prex_internacional_get_cotizacion_pais";
    const headers = {
      "Accept-Charset": "UTF-8",
      Authorization: `Bearer ${e.prex_token}`,
      "Device-Serial": "2070937402d119c1",
      "Device-Manufacturer": "samsung",
      "User-Agent":
        "Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-N976N Build/N2G48H)",
      Host: "www.prexcard.com",
      "Accept-Encoding": "gzip",
    };
    const res = await axios
      .post(url, { usuario_id: "578594", pais_id: 32 }, { headers })
      .catch((e) => {
        console.error(e);
        return {
          data: null,
        };
      });
    const d = res.data;
    return d;
  }
  async login() {
    const user = e.prex_user;
    const password = e.prex_pass;
    const body = `usuario=${encodeURIComponent(
      user,
    )}&password=${encodeURIComponent(password)}`;
    const url = "https://www.prexcard.com/login/_do";
    const res = await axios
      .post(url, body, {
        headers: {
          Connection: "keep-alive",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "sec-ch-ua-mobile": "?0",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
          Origin: "https://www.prexcard.com",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
          Referer: "https://www.prexcard.com/login",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "es-ES,es;q=0.9",
        },
      })
      .then((res) => {
        return res.headers["set-cookie"][0].split(";")[0];
      });
    return res;
  }
  async get_data(): Promise<CambioObj[]> {
    const ar = await this.prex_ar();
    let arF = null;
    console.log("Ar", ar);
    if (ar) {
      arF = {
        code: "ARS",
        type: "",
        name: "",
        buy: ar.cotizaciones.UY.compra / ar.cotizaciones.AR.venta,
        sell: ar.cotizaciones.UY.venta / ar.cotizaciones.AR.compra,
      };
    }
    const cookie = await this.login();
    console.log("Cookie", cookie);
    const headers = {
      Cookie: cookie,
    };
    const web_data = await axios
      .get(this.website, { headers })
      .then((res) => res.data);
    const $ = load(web_data);
    const buy = this.fix_money($("#pizarra-compra").text().trim());
    if (buy === 0) {
      console.log(buy);
      throw new Error("Prex not working");
    }
    const f = [
      {
        code: "USD",
        type: "",
        name: "",
        buy: buy,
        sell: this.fix_money($("#pizarra-venta").text().trim()),
      },
    ];
    if (arF) {
      f.push(arF);
    }
    console.log(f);
    return f;
  }
}

export default CambioPrex;
