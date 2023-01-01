import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioIngles extends Cambio {
  name = "Cambio Inglés";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2695";
  website = "https://www.cambioingles.com.uy/";
  favicon = "https://www.cambioingles.com.uy";
  conversions = {
    dolar: {
      code: "USD",
      type: "",
    },
    euro: {
      code: "EUR",
      type: "",
    },
    argentino: {
      code: "ARS",
      type: "",
    },
    real: {
      code: "BRL",
      type: "",
    },
  };
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $('[data-id="1fbb804"] .elementor-col-25')
      .map((i: number, element) => ({
        moneda: $(element)
          .find(".attachment-full")
          .attr("src")
          .match(/(?<=\/).*(?=\-f)/g)[0]
          .split(/\//g)
          .at(-1),
        compra: $(element).find(".elementor-heading-title").eq(1).text().trim().replace("$", ""),

        venta: $(element).find(".elementor-heading-title").eq(3).text().trim().replace("$", ""),
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
    console.log("F", f);
    return f;
  }
}

export default CambioIngles;
