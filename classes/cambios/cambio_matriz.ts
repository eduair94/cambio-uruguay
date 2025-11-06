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
    dolar: {
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
    const sel = ".cont.cotizaciones table tbody tr";
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(sel)
      .map((i: number, element) => ({
        moneda: $(element).find("td.nom").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(5)").text().trim()),
      }))
      .get();
    
    // Remove duplicates by creating a Map with currency name as key
    const uniqueResults = new Map();
    result
      .filter((el) => el.moneda)
      .forEach((el) => {
        const { code, type } = this.conversions[el.moneda];
        const key = code; // Use currency code as unique key
        if (!uniqueResults.has(key)) {
          uniqueResults.set(key, {
            code,
            type,
            name: el.moneda,
            buy: el.compra,
            sell: el.venta,
          });
        }
      });
    
    return Array.from(uniqueResults.values());
  }
}

export default CambioMatriz;
