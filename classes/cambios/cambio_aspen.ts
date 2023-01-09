import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioAspen extends Cambio {
  name = "Cambio Aspen";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2466";
  website = "https://www.aspen.com.uy/sitio";
  favicon = "https://www.aspen.com.uy";
  conversions = {
    "USD Dólar Usa": {
      code: "USD",
      type: "",
    },
    "EUR Euro": {
      code: "EUR",
      type: "",
    },
    "ARS Peso Argentino": {
      code: "ARS",
      type: "",
    },
    "BRL Real Brasileño": {
      code: "BRL",
      type: "",
    },
    "GBP Libra Esterlina": {
      code: "GBP",
      type: "",
    },
    "CLP Peso Chileno": {
      code: "CLP",
      type: "",
    },
    "CHF Franco Suizo": {
      code: "CHF",
      type: "",
    },
  };
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".md-divisas table tr.bd")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(2)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
      }))
      .get();
    console.log(result);
    const f = result
      .filter((el) => el.moneda)
      .map((el) => {
        const { code, type } = this.conversions[el.moneda];
        return {
          code,
          type,
          name: el.moneda,
          buy: el.compra,
          sell: el.venta,
        };
      })
      .filter((el) => {
        return el.buy;
      });
    return f;
  }
}

export default CambioAspen;
