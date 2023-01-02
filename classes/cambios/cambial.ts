import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Cambial extends Cambio {
  name = "Cambial Casa de Cambio";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2482";
  private conversions = {
    DOLAR: {
      code: "USD",
      type: "",
    },
    PESO: {
      code: "ARS",
      type: "",
    },
    REAL: {
      code: "BRL",
      type: "",
    },
    EURO: {
      code: "EUR",
      type: "",
    },
  };
  website = "https://cambialcasadecambios.com.uy/";
  favicon = "https://cambialcasadecambios.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".elementor-element-e2f78c9 .elementor-widget-wrap.elementor-element-populated")
      .map((i: number, element) => ({
        moneda: $(element).find("h6").eq(0).text().trim(),
        compra: this.fix_money($(element).find("h6").eq(1).text().trim()),
        venta: this.fix_money($(element).find("h6").eq(2).text().trim()),
      }))
      .get()
      .filter((el) => el.compra && el.moneda !== "DOLAR/REAL");
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

export default Cambial;
