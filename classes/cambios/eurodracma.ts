import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Eurodracma extends Cambio {
  name = "Eurodracma";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2443";
  website = "https://eurodracma.com/";
  favicon = "https://eurodracma.com";
  conversions = {
    "DÓLAR AMERICANO": { code: "USD", type: "" },
    "PESO ARGENTINO": { code: "ARS", type: "" },
    REAL: { code: "BRL", type: "" },
    EURO: { code: "EUR", type: "" },
  };

  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    // Rates live in a top-bar strip: "COTIZACIONES - COMPRA/VENTA - DÓLAR: 39.00 - 41.40 - ..."
    const text = $("#top-bar-content").text().replace(/\s+/g, " ").trim();
    const result: { moneda: string; compra: string; venta: string }[] = [];
    const re = /(DÓLAR|\$?\s*ARGENTINO|REAL|EURO)\s*:\s*([\d.,]+)\s*-\s*([\d.,]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const label = m[1].toUpperCase().trim();
      const key = label === "DÓLAR" ? "DÓLAR AMERICANO" : label.endsWith("ARGENTINO") ? "PESO ARGENTINO" : label;
      result.push({ moneda: key, compra: m[2], venta: m[3] });
    }
    return result
      .filter((el) => this.conversions[el.moneda])
      .map((el) => {
        const { code, type } = this.conversions[el.moneda];
        return {
          code,
          type,
          name: el.moneda,
          buy: this.fix_money(el.compra),
          sell: this.fix_money(el.venta),
        };
      })
      .filter((el) => el.buy > 0 && el.sell > 0);
  }
}

export default Eurodracma;
