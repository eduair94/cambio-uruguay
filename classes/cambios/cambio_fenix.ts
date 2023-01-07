import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioFenix extends Cambio {
  name = "Cambio Fenix";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2593";
  private conversions = {
    Dólar: {
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
  website = "https://cambiofenix.com/";
  favicon = "https://cambiofenix.com/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".elementor-element-76660e0c .elementor-container.elementor-column-gap-default")
      .map((i: number, element) => ({
        moneda: $(element).find("h2").eq(0).text().trim(),
        compra: this.fix_money($(element).find("h2").eq(1).text().trim()),
        venta: this.fix_money($(element).find("h2").eq(2).text().trim()),
      }))
      .get()
      .filter((el) => el.compra && el.moneda !== "Dol/Real");
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

export default CambioFenix;
