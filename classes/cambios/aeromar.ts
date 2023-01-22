import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Aeromar extends Cambio {
  name = "Aeromar";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2465";
  private conversions = {
    "img/dolar.png": {
      code: "USD",
      type: "",
    },
    "img/arg.png": {
      code: "ARS",
      type: "",
    },
    "img/real.png": {
      code: "BRL",
      type: "",
    },
    'img/euro.png': {
      code: "EUR",
      type: "",
    },
  };
  website = "http://www.aeromar.com.uy";
  favicon = "http://www.aeromar.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".mod-cotizacion .row > .col-xs-4:nth-child(1) .img-responsive")
      .map((i: number, element) => ({
        moneda: $(element).attr("src").trim(),
        compra: this.fix_money($('.mod-cotizacion .row > .col-xs-4:nth-child(2) .cot-value').eq(i).text().trim()),
        venta: this.fix_money($('.mod-cotizacion .row > .col-xs-4:nth-child(3) .cot-value').eq(i).text().trim()),
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

export default Aeromar;
