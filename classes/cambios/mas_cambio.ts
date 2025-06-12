import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class MasCambio extends Cambio {
  name = "Más Cambio";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2489";
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
  website = "http://www.mascambio.com/";
  favicon = "http://www.mascambio.com/";
  async get_data(): Promise<CambioObj[]> {
    const url = "http://www.mascambio.com";
    const web_d = await axios.get(url).then((res) => res.data);
    const $a = load(web_d);
    const iframeUrl = $a("iframe#blockrandom").attr("src");
    console.log("iframe url", iframeUrl);

    const web_data = await axios.get(iframeUrl).then((res) => res.data);
    const $ = load(web_data);
    const result = $("table tbody tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(2)").text().trim(),
        compra: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
        venta: this.fix_money($(element).find("td:nth-of-type(4)").text().trim()),
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

export default MasCambio;
