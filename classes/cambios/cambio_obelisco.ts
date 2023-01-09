import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioObelisco extends Cambio {
  name = "Cambio Obelisco";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2458";
  private conversions = {
    Dolar: {
      code: "USD",
      type: "",
    },
    Peso: {
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
  website = "http://www.cambioobelisco.com.uy";
  favicon = "http://www.cambioobelisco.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("#left_col > table:nth-child(2) > tbody > tr:nth-child(2) > td > table > tbody > tr > td > table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(2)").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(4)").text().trim()),
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

export default CambioObelisco;
