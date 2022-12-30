import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioPernas extends Cambio {
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2486";
  private conversions = {
    dolar: {
      code: "USD",
      type: "",
    },
    "peso arg": {
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
  website = "http://www.cambiopernas.com.uy";
  favicon = "http://www.cambiopernas.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("#divisas > table > tbody > tr > td > table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element)
          .find("td:nth-of-type(2) strong span")
          .text()
          .trim()
          .toLowerCase(),
        compra: this.fix_money(
          $(element).find("td:nth-of-type(4) span").text().trim(),
        ),
        venta: this.fix_money(
          $(element).find("td:nth-of-type(7) span").text().trim(),
        ),
      }))
      .get()
      .filter((el) => el.compra && !el.moneda.includes("dolarpeso"));
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

export default CambioPernas;
