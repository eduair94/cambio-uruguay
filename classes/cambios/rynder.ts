import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Rynder extends Cambio {
  name = "Rynder Cambio";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2504";
  maps = "https://www.google.com/maps/d/edit?mid=15pghhcAbnJn62lCM3-C2fpJL_AWI_hg&usp=sharing";
  private conversions = {
    usa: {
      code: "USD",
      type: "",
    },
    arg: {
      code: "ARS",
      type: "",
    },
    bra: {
      code: "BRL",
      type: "",
    },
    euro: {
      code: "EUR",
      type: "",
    },
  };
  website = "http://rynder.com.uy/";
  favicon = "http://rynder.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $("#pizarra .moneda table")
      .map((i: number, element) => ({
        moneda: $(element).find("img").attr("src").trim(),
        compra: this.fix_money($(element).find(".valor").eq(0).text().trim()),
        venta: this.fix_money($(element).find(".valor").eq(1).text().trim()),
      }))
      .get()
      .filter((el) => el.compra);
    const f = result.map((el) => {
      const currencyCode = el.moneda.split("/").pop().replace(".jpg", "");
      const { code, type } = this.conversions[currencyCode];
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

export default Rynder;
