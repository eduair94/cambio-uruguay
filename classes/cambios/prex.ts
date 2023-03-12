import axios from "axios";
import dotenv from "dotenv";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
dotenv.config();
const e = process.env;

class CambioPrex extends Cambio {
  name = "Prex";
  bcu = "https://www.bcu.gub.uy/Sistema-de-Pagos/Paginas/prex.aspx";
  website = `https://www.prexcard.com`;
  favicon = "https://www.prexcard.com";
  async login() {
    const url = 'https://www.prexcard.com/api/login';
    const headers = {
      authorization: 'Bearer TokenAPP011001010',
    }
    const json = {
      "Documento": e.prex_doc,
      "Password": e.prex_pass,
      "TipoDocumento": "CI",
      "TipoPersona": "1",
      "UuidDevice": "dd600127f3582fa7",
      "ModelDevice": "M2102220SG",
      "VersionDevice": "11",
      "SerialDevice": "unknown",
      "PlatformDevice": "Android",
      "ManufacturerDevice": "Xaaomi",
      "TokenFCM": "",
      "AppVersion": "10.49.44"
    };
    const res = await axios.post(url, json, { headers }).then(res=>res.data);
    return res.token;
  }
  async prex_ar(token:string) {
    const url = "https://www.prexcard.com/api/prex_a_prex_internacional_get_cotizacion_pais";
    const headers = {
      Authorization: `Bearer ${token}`,
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
    };
    const body = null;
    const res = await axios.post(url, body, { headers: header }).then((res) => res.data);
    console.log("Response", res);
    return { buy: res.compra, sell: res.venta };
  }
  async get_data(): Promise<CambioObj[]> {
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
    const token = await this.login();
    const ar = await this.prex_ar(token);
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
    if (arF) {
      f.push(arF);
    }
    return f;
  }
}

export default CambioPrex;
