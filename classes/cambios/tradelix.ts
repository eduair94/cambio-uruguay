import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Tradelix extends Cambio {
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2496";
  private conversions = {
    dolar: {
      code: "USD",
      type: "",
    },
    "peso arg.": {
      code: "ARS",
      type: "",
    },
    real: {
      code: "BRL",
      type: "",
    },
    euro: {
      code: "EUR",
      type: "",
    },
  };
  website = "https://www.tradelix.com.uy/";
  favicon = "https://www.tradelix.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("table")
      .eq(0)
      .find("tbody tr")
      .map((i: number, element) => ({
        moneda: $(element)
          .find("td:nth-of-type(2) b")
          .text()
          .trim()
          .toLowerCase(),
        compra: this.fix_money(
          $(element).find("td:nth-of-type(3)").text().trim(),
        ),
        venta: this.fix_money(
          $(element).find("td:nth-of-type(4)").text().trim(),
        ),
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

export default Tradelix;
