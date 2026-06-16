import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioGales extends Cambio {
  name = "Cambio Gales";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2566";
  private conversions = {
    "DOLAR USA": {
      code: "USD",
      type: "",
    },
    "PESO ARGENTINO": {
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
  website = "https://www.gales.com.uy/home/";
  favicon = "https://www.gales.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("table.currency-table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim().toUpperCase(),
        compra: this.fix_money($(element).find("td:nth-of-type(2)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
      }))
      .get()
      .filter((el) => this.conversions[el.moneda]);
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

export default CambioGales;
