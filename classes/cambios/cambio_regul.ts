import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioRegul extends Cambio {
  name = "Cambio Regul";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2577";
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
  website = "https://cambioregulsa.com/";
  favicon = "https://cambioregulsa.com/";
  async get_data(): Promise<CambioObj[]> {
    // Tengo que arreglarlo, url actualizada
    const web_data = await axios.get("http://cambios.instyledm.com/9/cotizaciones.html").then((res) => res.data);
    const $ = load(web_data);
    const result = $("table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(2)").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(4)").text().trim()),
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

export default CambioRegul;
