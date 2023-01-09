import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioMatriz extends Cambio {
  name = "Cambio Matriz";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2467";
  website = "https://www.cambiomatriz.com.uy";
  favicon = "https://www.cambiomatriz.com.uy";
  conversions = {
    Dolar: {
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
  async get_data(): Promise<CambioObj[]> {
    const sel = "#div_cuadros_hor  .cotizaciones table tbody tr";
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(sel)
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(2)").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(5)").text().trim()),
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
          buy: el.compra,
          sell: el.venta,
        };
      });
    return f;
  }
}

export default CambioMatriz;
