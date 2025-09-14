import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioVexel extends Cambio {
  name = "Cambio Vexel";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2562";
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
  website = "http://www.cambiovexel.com";
  favicon = "http://www.cambiovexel.com";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios
      .get("http://cambios.instyledm.com/11/cotizaciones.html", {
        timeout: 5000,
      })
      .then((res) => res.data)
      .catch((err) => {
        // if timeout return null, if not throw error again
        if (err.code === "ECONNABORTED") {
          return null;
        }
        throw err;
      });
    if (web_data) {
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
    return [];
  }
}

export default CambioVexel;
