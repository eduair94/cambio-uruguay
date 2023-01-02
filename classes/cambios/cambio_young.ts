import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioYoung extends Cambio {
  name = "Cambio Young";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2369";
  private conversions = {
    "DOLAR USA": {
      code: "USD",
      type: "",
    },
    "PESO ARG": {
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
  website = "https://youngencambio.com/";
  favicon = "https://youngencambio.com/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".elementor-element-e4219b9 .elementor-column.elementor-col-25")
      .map((i: number, element) => ({
        moneda: $(element).find("h2").eq(0).text().trim(),
        compra: this.fix_money($(element).find("p").eq(0).text().trim()),
        venta: this.fix_money($(element).find("p").eq(1).text().trim()),
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

export default CambioYoung;
