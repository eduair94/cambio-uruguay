import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioSuizo extends Cambio {
  name = "Cambio Suizo";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2484";
  website = "https://www.cambiosuizo.com.uy/";
  favicon = "https://www.cambiosuizo.com.uy";
  conversions = {
    Dólar: {
      code: "USD",
      type: "",
    },
    Euro: {
      code: "EUR",
      type: "",
    },
    Real: {
      code: "BRL",
      type: "",
    },
    Argentino: {
      code: "ARS",
      type: "",
    },
    Suizo: {
      code: "CHF",
      type: "",
    },
  };
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("#cotizacion article.rel")
      .map((i: number, element) => ({
        moneda: $(element).find("p").eq(0).find("span").text(),
        compra: $(element).find("p").eq(1).find("span").eq(1).text(),
        venta: $(element).find("p").eq(2).find("span").eq(1).text(),
      }))
      .get();
    console.log("REsult", result);
    const f = result
      .filter((el) => el.moneda)
      .map((el) => {
        const { code, type } = this.conversions[el.moneda];
        return {
          code,
          type,
          name: el.moneda,
          buy: parseFloat(el.compra),
          sell: parseFloat(el.venta),
        };
      })
      .filter((el) => {
        return el.buy;
      });
    return f;
  }
}

export default CambioSuizo;
