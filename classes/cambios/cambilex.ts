import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioCambilex extends Cambio {
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2580";
  private conversions = {
    "Dolares Americanos": {
      code: "USD",
      type: "",
    },
    "Pesos Argentinos": {
      code: "ARS",
      type: "",
    },
    Reales: {
      code: "BRL",
      type: "",
    },
    Euros: {
      code: "EUR",
      type: "",
    },
  };
  website = "http://cambilex.com.uy";
  favicon = "http://cambilex.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("table tr.cotizacion")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim(),
        compra: this.fix_money(
          $(element).find("td:nth-of-type(2)").text().trim(),
        ),
        venta: this.fix_money(
          $(element).find("td:nth-of-type(3)").text().trim(),
        ),
      }))
      .get();
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

export default CambioCambilex;
