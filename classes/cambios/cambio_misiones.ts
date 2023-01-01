import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioMisiones extends Cambio {
  name = "Cambio Misiones";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2498";
  private conversions = {
    "images/bg_dolares.gif": {
      code: "USD",
      type: "",
    },
    "images/bg_argentinos.gif": {
      code: "ARS",
      type: "",
    },
    "images/bg_reales.gif": {
      code: "BRL",
      type: "",
    },
    "images/bg_euros.gif": {
      code: "EUR",
      type: "",
    },
  };
  website = "http://www.cambiomisiones.com.uy/";
  favicon = "http://www.cambiomisiones.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("table.hovertable tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1) img").attr("src"),
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

export default CambioMisiones;
