import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Cambio18 extends Cambio {
  name = "Cambio 18";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2576";
  website = "https://www.cambio18.com";
  favicon = "https://www.cambio18.com";
  conversions = {
    "Dólar USA": {
      code: "USD",
      type: "",
    },
    Euro: {
      code: "EUR",
      type: "",
    },
    Real: {
      code: "BRL",
      type: "",
    },
    "Peso Arg.": {
      code: "ARS",
      type: "",
    },
  };
  async get_data(): Promise<CambioObj[]> {
    const sel = "table table tbody";
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(sel)
      .map((i: number, element) => ({
        moneda: $(element).find("tr:nth-of-type(1)").text().trim(),
        compra: this.fix_money($(element).find("tr:nth-of-type(2) > td:nth-of-type(2)").text().trim()),
        venta: this.fix_money($(element).find("tr:nth-of-type(3) > td:nth-of-type(2)").text().trim()),
      }))
      .get();
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
      });
    return f;
  }
}

export default Cambio18;
