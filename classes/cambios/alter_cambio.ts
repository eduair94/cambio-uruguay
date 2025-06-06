import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class AlterCambio extends Cambio {
  name = "Alter Cambio";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2589";
  private conversions = {
    "Dolar USA": {
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
  website = "https://altercambio.com.uy/";
  favicon = "https://altercambio.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".pizarra tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find(".izq").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(4)").text().trim()),
      }))
      .get()
      .filter((el) => el.compra && el.moneda);
    console.log("RESULT", result);
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

export default AlterCambio;
