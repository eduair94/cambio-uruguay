import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioSicurezza extends Cambio {
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2640";
  private conversions = {
    "image/dolar.jpg": {
      code: "USD",
      type: "",
    },
    "image/arg.jpg": {
      code: "ARS",
      type: "",
    },
    "image/real.jpg": {
      code: "BRL",
      type: "",
    },
    "image/euro.jpg": {
      code: "EUR",
      type: "",
    },
  };
  website = "http://www.sicurezza.uy/";
  favicon = "http://www.sicurezza.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios
      .get("http://www.sicurezza.uy/xml/xml.php")
      .then((res) => res.data);
    const $ = load(web_data);
    const result = $("table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1) img").attr("src"),
        compra: this.fix_money(
          $(element).find("td:nth-of-type(2)").text().trim(),
        ),
        venta: this.fix_money(
          $(element).find("td:nth-of-type(3)").text().trim(),
        ),
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

export default CambioSicurezza;
