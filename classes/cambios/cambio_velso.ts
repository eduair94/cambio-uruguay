import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioVelso extends Cambio {
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2454";
  private conversions = {
    Dolar: {
      code: "USD",
      type: "",
    },
    Argentino: {
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
  website = "https://cambiovelso.com.uy";
  favicon = "https://cambiovelso.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("#table_1 tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim(),
        compra: this.fix_money(
          $(element).find("td:nth-of-type(2)").text().trim(),
        ),
        venta: this.fix_money(
          $(element).find("td:nth-of-type(3)").text().trim(),
        ),
      }))
      .get()
      .filter((el) => el.compra);
    console.log(result);
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

export default CambioVelso;
