import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioVarlix extends Cambio {
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2552";
  conversions = {
    "Dólar Americano": {
      code: "USD",
      type: "",
    },
    "Peso Argentino": {
      code: "ARS",
      type: "",
    },
    Real: {
      code: "BRL",
      type: "",
    },
    Euro: {
      code: "EUR",
      type: "",
    },
  };
  website = "https://www.varlix.com.uy";
  favicon = "https://www.varlix.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const sel = ".exchange-line";
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(sel)
      .map((i: number, element) => ({
        moneda: $(element).find(".currency").text().trim(),
        compra: $(element).find(".buy").text().trim(),
        venta: $(element).find(".sell").text().trim(),
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
          buy: this.fix_money(el.compra),
          sell: this.fix_money(el.venta),
        };
      });
    return f;
  }
}

export default CambioVarlix;
