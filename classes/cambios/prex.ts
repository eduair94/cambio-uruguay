import axios from "axios";
import dotenv from "dotenv";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
const cfg = dotenv.config();
const e = process.env;

class CambioPrex extends Cambio {
  name = "Prex";
  bcu = "https://www.bcu.gub.uy/Sistema-de-Pagos/Paginas/prex.aspx";
  website = `https://www.prexcard.com`;
  favicon = "https://www.prexcard.com";
  async prex_ar() {
    const url = "https://www.prexcard.com/api/prex_a_prex_internacional_get_cotizacion_pais";
    const headers = {
      "Accept-Charset": "UTF-8",
      Authorization: `Bearer ${e.prex_token}`,
      "Device-Serial": "2070937402d119c1",
      "Device-Manufacturer": "samsung",
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-N976N Build/N2G48H)",
      Host: "www.prexcard.com",
      "Accept-Encoding": "gzip",
    };
    const res = await axios.post(url, { usuario_id: e.prex_user_id.toString(), pais_id: 32 }, { headers }).catch((e) => {
      console.error(e);
      return {
        data: null,
      };
    });
    const d = res.data;
    return d;
  }
  async get_usd() {
    const url = "https://www.prexcard.com/api/cotizacion_usd";
    const header = {
      "Accept-Charset": "UTF-8",
      Authorization: `Bearer ${e.prex_token}`,
      "Device-Serial": "2070937402d119c1",
      "Device-Manufacturer": "samsung",
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-N976N Build/N2G48H)",
      Host: "www.prexcard.com",
      "Accept-Encoding": "gzip",
    };
    const body = {};
    const res = await axios.post(url, body, { headers: header }).then((res) => res.data);
    return { buy: res.compra, sell: res.venta };
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
    const { buy, sell } = await this.get_usd();
    const f = [
      {
        code: "USD",
        type: "",
        name: "",
        buy: buy,
        sell: sell,
      },
    ];
    if (arF) {
      f.push(arF);
    }
    return f;
  }
}

export default CambioPrex;
