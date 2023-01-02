import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioOpenn extends Cambio {
  name = "Cambio Openn";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2571";
  private conversions = {
    DOLAR: {
      code: "USD",
      type: "",
    },
    "ARG.": {
      code: "ARS",
      type: "",
    },
    REAL: {
      code: "BRL",
      type: "",
    },
    EURO: {
      code: "EUR",
      type: "",
    },
  };
  website = "https://cambioopenn.com.uy/";
  favicon = "https://cambioopenn.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("#mod-moneda table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(2)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
      }))
      .get()
      .filter((el) => el.compra);
    const f = result.map((el) => {
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

export default CambioOpenn;
