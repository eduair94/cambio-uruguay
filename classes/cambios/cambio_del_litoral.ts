import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioDelLitoral extends Cambio {
  name = "Baluma Cambio";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2451";
  private conversions = {
    "Dólar USA": {
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
    Euros: {
      code: "EUR",
      type: "",
    },
  };
  website = "http://balumacambio.enjoypuntadeleste.com.uy/";
  favicon = "http://balumacambio.enjoypuntadeleste.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get("http://balumacambio.enjoypuntadeleste.com.uy/cotizacion.php").then((res) => res.data);
    const $ = load(web_data);
    const result = $("body > table > tbody > tr > td:nth-child(1) > table tbody tr")
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

export default CambioDelLitoral;
