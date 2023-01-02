import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioOriental extends Cambio {
  name = "Cambio Oriental";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2428";
  private conversions = {
    "DÓLAR USA": {
      code: "USD",
      type: "",
    },
    "PESO ARGENTINO": {
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
  website = "http://www.cambiooriental.com/";
  favicon = "http://www.cambiooriental.com/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".col-md-6.col-lg-3.mb40.text-center")
      .map((i: number, element) => ({
        moneda: $(element).find("h4").text().trim(),
        compra: this.fix_money($(element).find("span").eq(0).text().trim().split(" - ")[1]),
        venta: this.fix_money($(element).find("span").eq(1).text().trim().split(" - ")[1]),
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
    console.log(f);
    return f;
  }
}

export default CambioOriental;
