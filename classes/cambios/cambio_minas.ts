import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioMinas extends Cambio {
  name = "Cambio Minas";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2371";
  private conversions = {
    "1": {
      code: "USD",
      type: "",
    },
    "2": {
      code: "USD",
      type: "EBROU",
    },
    "3": {
      code: "ARS",
      type: "",
    },
    "4": {
      code: "BRL",
      type: "",
    },
    "5": {
      code: "EUR",
      type: "",
    },
  };
  website = "http://cambiominas.com.uy/";
  favicon = "http://cambiominas.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".vc_custom_1592014937560 .wpb_wrapper > div")
      .map((i: number, element) => ({
        moneda: (i + 1).toString(),
        compra: this.fix_money($(element).find("h4").eq(0).text().trim()),
        venta: this.fix_money($(element).find("h4").eq(1).text().trim()),
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

export default CambioMinas;
